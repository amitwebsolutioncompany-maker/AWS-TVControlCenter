package com.aws.tvcontrolcenter.adb

import com.flyfishxu.kadb.Kadb
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File
import android.content.Context
import android.view.Surface
import com.aws.tvcontrolcenter.mirror.ScrcpyMirrorSession

/** Real TCP ADB transport, including the binary protocol and RSA authorization. */
class WifiAdbTransport(
    private val ipAddress: String,
    private val port: Int = 5555
) : AdbTransport {
    private var client: Kadb? = null
    private var mirror: ScrcpyMirrorSession? = null
    private val commandMutex = Mutex()

    override suspend fun connect(): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            disconnect().getOrThrow()
            val adb = Kadb.create(ipAddress, port)

            // Kadb opens its socket lazily. connectionCheck() only reports whether
            // that socket was already created, so using it here rejects every new
            // connection before the ADB handshake and authorization can run.
            // A harmless shell request creates the transport, performs the RSA ADB
            // authentication, and fails with the daemon's real response if access
            // is denied (for example, when the TV's authorization dialog is not
            // accepted).
            try {
                val probe = adb.shell("getprop ro.product.model")
                check(probe.exitCode == 0) {
                    probe.errorOutput.ifBlank { probe.output.ifBlank { "ADB shell probe failed" } }
                }
            } catch (error: Throwable) {
                adb.close()
                throw error
            }
            client = adb
        }
    }

    override suspend fun disconnect(): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching { mirror?.stop(); mirror = null; client?.close(); client = null }
    }

    override fun isConnected(): Boolean = client != null
    private fun adb(): Kadb = client ?: error("Device is not connected")

    fun startMirror(context: Context, surface: Surface, sessionId: String, onStatus: (String) -> Unit) {
        check(isConnected()) { "Device is not connected" }
        mirror?.stop()
        val server = File(context.cacheDir, "scrcpy-server-v2.1.1")
        context.assets.open("scrcpy-server-v2.1.1").use { input -> server.outputStream().use { input.copyTo(it) } }
        mirror = ScrcpyMirrorSession(adb(), server).also { it.start(surface, sessionId, onStatus) }
    }

    fun stopMirror() { mirror?.stop(); mirror = null }
    fun mirrorTouch(action: Int, x: Float, y: Float, width: Int, height: Int) { mirror?.sendTouch(action, x, y, width, height) }

    override suspend fun shell(command: String): Result<AdbCommandResult> = withContext(Dispatchers.IO) {
        runCatching {
            val reply = withConnectedClient { adb().shell(command) }
            AdbCommandResult(reply.exitCode, reply.output, reply.errorOutput, reply.exitCode == 0)
        }
    }

    override suspend fun push(localPath: String, remotePath: String, progress: Flow<Float>?): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val source = File(localPath)
            require(source.isFile) { "Source file does not exist: $localPath" }
            withConnectedClient { adb().push(source, remotePath) }
        }
    }

    override suspend fun pull(remotePath: String, localPath: String, progress: Flow<Float>?): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val target = File(localPath)
            target.parentFile?.mkdirs()
            withConnectedClient { adb().pull(target, remotePath) }
        }
    }

    override suspend fun installApk(localPath: String, progress: Flow<Float>?): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val apk = File(localPath)
            require(apk.isFile) { "APK does not exist: $localPath" }
            withConnectedClient { adb().install(apk, "-r") }
        }
    }

    override suspend fun sendKeyEvent(keyCode: Int): Result<Unit> = runUnit("input keyevent $keyCode")

    override suspend fun getDeviceInfo(): Result<Map<String, String>> = withContext(Dispatchers.IO) {
        runCatching {
            val info = mutableMapOf<String, String>()
            withConnectedClient {
                listOf("ro.product.model", "ro.product.manufacturer", "ro.build.version.release", "ro.build.version.sdk", "ro.serialno")
                    .forEach { prop -> info[prop] = runShell("getprop $prop").trim() }
                info["screen_size"] = runShell("wm size").trim()
                info["density"] = runShell("wm density").trim()
                info["storage"] = runShell("df -h /sdcard").trim()
            }
            info
        }
    }

    override suspend fun listFiles(remotePath: String): Result<List<Map<String, String>>> = withContext(Dispatchers.IO) {
        runCatching {
            withConnectedClient { runShell("ls -lan ${quote(remotePath)}") }.lineSequence()
                .filter { it.isNotBlank() && !it.startsWith("total ") }
                .mapNotNull { line ->
                    // Android's ls -lan emits: permissions, links, owner,
                    // group, size, date, time, name. Keep the final field
                    // intact so directory names may themselves contain spaces.
                    val parts = line.trim().split(Regex("\\s+"), limit = 8)
                    if (parts.size < 8) null else mapOf("permissions" to parts[0], "size" to parts[4], "name" to parts[7])
                }.toList()
        }
    }

    // The Files screen can delete either a file or a directory. -r handles
    // folders; quote() ensures a TV-side shell cannot interpret the name.
    override suspend fun deleteFile(remotePath: String): Result<Unit> = runUnit("rm -rf ${quote(remotePath)}")
    override suspend fun disablePackage(packageName: String) = shell("pm disable-user --user 0 ${quote(packageName)}")
    override suspend fun enablePackage(packageName: String) = shell("pm enable --user 0 ${quote(packageName)}")
    override suspend fun uninstallPackage(packageName: String) = shell("pm uninstall ${quote(packageName)}")
    override suspend fun forceStopPackage(packageName: String) = shell("am force-stop ${quote(packageName)}")
    override suspend fun launchPackage(packageName: String) = shell("monkey -p ${quote(packageName)} 1")
    override suspend fun reboot(): Result<Unit> = runUnit("reboot")
    override suspend fun screenOn(): Result<Unit> = runUnit("input keyevent KEYCODE_WAKEUP")
    override suspend fun screenOff(): Result<Unit> = runUnit("input keyevent KEYCODE_SLEEP")

    private suspend fun runUnit(command: String): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val result = shell(command).getOrThrow()
            check(result.success) { result.stderr.ifBlank { result.stdout } }
        }
    }

    private fun runShell(command: String): String {
        val reply = adb().shell(command)
        check(reply.exitCode == 0) { reply.errorOutput.ifBlank { reply.output } }
        return reply.output
    }

    private suspend fun <T> withConnectedClient(action: suspend () -> T): T = commandMutex.withLock {
        try {
            action()
        } catch (error: Throwable) {
            if (!isRecoverableConnectionError(error)) throw error
            disconnect().getOrThrow()
            connect().getOrThrow()
            action()
        }
    }

    private fun isRecoverableConnectionError(error: Throwable): Boolean {
        val messages = mutableListOf<String>()
        var current: Throwable? = error
        while (current != null) {
            current.message?.let(messages::add)
            current = current.cause
        }
        val message = messages.joinToString(" ").lowercase()
        return listOf("broken pipe", "connection reset", "socket closed", "eof", "closed channel", "connection aborted")
            .any { message.contains(it) }
    }

    private fun quote(value: String) = "'${value.replace("'", "'\\\"'\\\"'")}'"
}
