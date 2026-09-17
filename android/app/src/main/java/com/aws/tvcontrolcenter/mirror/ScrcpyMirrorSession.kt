package com.aws.tvcontrolcenter.mirror

import android.media.MediaCodec
import android.media.MediaFormat
import android.view.Surface
import com.flyfishxu.kadb.Kadb
import com.flyfishxu.kadb.stream.AdbStream
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

/** A small native scrcpy 4.1 video client. The server and this parser are kept
 * version-locked. Video uses the real ADB localabstract socket, never a mock. */
class ScrcpyMirrorSession(private val adb: Kadb, private val serverFile: File) {
    private val running = AtomicBoolean(false)
    private var video: AdbStream? = null
    private var control: AdbStream? = null
    private var codec: MediaCodec? = null
    @Volatile private var videoWidth = 1280
    @Volatile private var videoHeight = 720
    fun start(surface: Surface, scid: String, onStatus: (String) -> Unit) {
        check(running.compareAndSet(false, true)) { "Screen mirror is already running" }
        Thread {
            try {
                onStatus("Pushing server to TV...")
                adb.push(serverFile, SERVER_PATH)
                
                onStatus("Starting server process...")
                val command = "CLASSPATH=$SERVER_PATH app_process / com.genymobile.scrcpy.Server 2.1.1 " +
                    "tunnel_forward=true audio=false control=true cleanup=true max_size=1280 max_fps=30 " +
                    "video_bit_rate=4000000 send_device_meta=false send_dummy_byte=false send_codec_meta=true send_frame_meta=true"
                
                Thread { 
                    runCatching { 
                        val result = adb.shell(command)
                        if (result.exitCode != 0) {
                            android.util.Log.e("Scrcpy", "Server failed: ${result.errorOutput} ${result.output}")
                        }
                    }.onFailure { android.util.Log.e("Scrcpy", "Failed to start server shell", it) }
                }.apply { name = "scrcpy-server"; start() }
                
                var videoStream: AdbStream? = null
                var controlStream: AdbStream? = null
                
                // Retry opening the sockets for up to 5 seconds, as the TV might be slow to start app_process
                for (i in 1..20) {
                    if (!running.get()) return@Thread
                    Thread.sleep(250)
                    try {
                        onStatus("Connecting to TV streams (attempt $i)...")
                        videoStream = adb.open("localabstract:scrcpy")
                        controlStream = adb.open("localabstract:scrcpy")
                        break
                    } catch (e: Exception) {
                        videoStream?.close()
                        controlStream?.close()
                        videoStream = null
                        controlStream = null
                        android.util.Log.w("Scrcpy", "Waiting for scrcpy server (attempt $i)...")
                    }
                }
                
                if (videoStream == null || controlStream == null) {
                    onStatus("Error: Failed to connect to TV streams after 5 seconds")
                    android.util.Log.e("Scrcpy", "Failed to connect to scrcpy server after 5 seconds")
                    stop()
                    return@Thread
                }
                
                this.video = videoStream
                this.control = controlStream
                
                onStatus("Streams connected, decoding video...")
                Thread { decode(surface, onStatus) }.apply { name = "scrcpy-video"; start() }
            } catch (error: Throwable) {
                onStatus("Error during startup: ${error.message}")
                android.util.Log.e("Scrcpy", "Error in start up", error)
                stop()
            }
        }.apply { name = "scrcpy-init"; start() }
    }

    private fun decode(surface: Surface, onStatus: (String) -> Unit) {
        try {
            val source = requireNotNull(video).source
            onStatus("Reading stream header...")
            
            val codecOrRes = source.readInt()
            if (codecOrRes == H264) {
                // Scrcpy 1.18+ protocol: 4-byte codecId, 4-byte width, 4-byte height
                videoWidth = source.readInt()
                videoHeight = source.readInt()
            } else {
                // Scrcpy 1.17 and older protocol: 2-byte width, 2-byte height
                videoWidth = (codecOrRes ushr 16) and 0xFFFF
                videoHeight = codecOrRes and 0xFFFF
            }
            
            onStatus("Ready!") // Hide progress when ready
            var decoder: MediaCodec? = null
            while (running.get()) {
                val header = ByteArray(12)
                source.readFully(header)
                
                val size = ((header[8].toInt() and 0xff) shl 24) or ((header[9].toInt() and 0xff) shl 16) or ((header[10].toInt() and 0xff) shl 8) or (header[11].toInt() and 0xff)
                require(size in 1..(4 * 1024 * 1024)) { "Invalid scrcpy packet size: $size" }
                val packet = source.readByteArray(size.toLong())
                
                if (decoder == null) {
                    decoder = MediaCodec.createDecoderByType("video/avc").also {
                        it.configure(MediaFormat.createVideoFormat("video/avc", videoWidth, videoHeight), surface, null, 0)
                        it.start(); codec = it
                    }
                }
                
                val input = decoder.dequeueInputBuffer(10_000)
                if (input >= 0) {
                    decoder.getInputBuffer(input)?.apply { clear(); put(packet) }
                    // If PTS is NO_PTS (-1), the MSB is 1, so header[0] is FF. FF & 0x40 is 0x40. 
                    val config = (header[0].toInt() and 0x40) != 0
                    val pts = longAt(header, 0) and 0x1fff_ffff_ffff_ffffL
                    decoder.queueInputBuffer(input, 0, packet.size, pts, if (config) MediaCodec.BUFFER_FLAG_CODEC_CONFIG else 0)
                }
                
                val info = MediaCodec.BufferInfo()
                var output = decoder.dequeueOutputBuffer(info, 0)
                while (output >= 0) { decoder.releaseOutputBuffer(output, true); output = decoder.dequeueOutputBuffer(info, 0) }
            }
        } catch (e: Throwable) {
            onStatus("Error: Video stream failed (${e.javaClass.simpleName}: ${e.message})")
            android.util.Log.e("Scrcpy", "Decode failed", e)
        } finally { stop() }
    }

    fun stop() {
        if (!running.getAndSet(false)) return
        runCatching { video?.close() }; runCatching { control?.close() }
        video = null; control = null
        runCatching { codec?.stop() }; runCatching { codec?.release() }; codec = null
    }

    /** scrcpy 4.1 INJECT_TOUCH_EVENT binary protocol. Coordinates are mapped
     * from the displayed SurfaceView to the current stream resolution. */
    fun sendTouch(action: Int, x: Float, y: Float, viewWidth: Int, viewHeight: Int) {
        val stream = control ?: return
        if (viewWidth <= 0 || viewHeight <= 0) return
        val px = (x * videoWidth / viewWidth).toInt().coerceIn(0, videoWidth - 1)
        val py = (y * videoHeight / viewHeight).toInt().coerceIn(0, videoHeight - 1)
        synchronized(stream) {
            runCatching {
                stream.sink.writeByte(2) // TYPE_INJECT_TOUCH_EVENT
                stream.sink.writeByte(action)
                stream.sink.writeLong(-3L) // POINTER_ID_VIRTUAL_MOUSE (TVs ignore SOURCE_TOUCHSCREEN)
                stream.sink.writeInt(px); stream.sink.writeInt(py)
                stream.sink.writeShort(videoWidth); stream.sink.writeShort(videoHeight)
                stream.sink.writeShort(if (action == 1) 0 else 0xffff) // pressure
                stream.sink.writeInt(1) // ACTION_BUTTON_PRIMARY (always 1 for both DOWN and UP)
                stream.sink.writeInt(if (action == 1) 0 else 1) // buttons
                stream.sink.flush()
            }
        }
    }

    private fun intAt(bytes: ByteArray, index: Int) = ((bytes[index].toInt() and 0xff) shl 24) or ((bytes[index + 1].toInt() and 0xff) shl 16) or ((bytes[index + 2].toInt() and 0xff) shl 8) or (bytes[index + 3].toInt() and 0xff)
    private fun longAt(bytes: ByteArray, index: Int): Long {
        var value = 0L
        repeat(8) { value = (value shl 8) or (bytes[index + it].toLong() and 0xff) }
        return value
    }

    companion object { private const val SERVER_PATH = "/data/local/tmp/scrcpy-server-v2.1.1.jar"; private const val H264 = 0x68323634 }
}
