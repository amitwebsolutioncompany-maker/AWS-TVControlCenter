package com.aws.tvcontrolcenter.bridge

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.aws.tvcontrolcenter.adb.AdbManager
import com.aws.tvcontrolcenter.adb.AdbDevice
import com.flyfishxu.kadb.Kadb
import com.aws.tvcontrolcenter.usb.UsbDeviceManager
import com.aws.tvcontrolcenter.usb.UsbPermissionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.Socket
import java.util.concurrent.Callable
import java.util.concurrent.Executors

class TvControlModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        var adbManager: AdbManager? = null
    }

    private val localAdbManager = AdbManager(reactContext)
    private val usbDeviceManager = UsbDeviceManager(reactContext)
    private val usbPermissionManager = UsbPermissionManager(reactContext)
    // Native connection failures must never terminate React Native's module
    // thread. Each operation reports its own error back to JavaScript instead.
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    
    override fun getName(): String = "TvControlModule"
    
    override fun initialize() {
        super.initialize()
        adbManager = localAdbManager
        usbDeviceManager.startListening()
        usbPermissionManager.startListening()
    }
    
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        usbDeviceManager.stopListening()
        usbPermissionManager.stopListening()
        adbManager = null
    }
    
    private suspend fun scanNetworkForDevices(): List<Pair<String, Int>> = kotlinx.coroutines.withContext(Dispatchers.IO) {
        // Scan the Wi-Fi transport specifically. `activeNetwork` may
        // be cellular/VPN when a Wi-Fi LAN has no internet, which made
        // same-network TVs disappear after the auto-connect change.
        val connectivity = reactApplicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val wifiNetwork = connectivity.allNetworks.firstOrNull { network ->
            connectivity.getNetworkCapabilities(network)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
        }
        val localAddress = connectivity.getLinkProperties(wifiNetwork)
            ?.linkAddresses
            ?.map { it.address }
            ?.filterIsInstance<Inet4Address>()
            ?.firstOrNull { !it.isLoopbackAddress && it.isSiteLocalAddress }
            ?: NetworkInterface.getNetworkInterfaces().toList()
                .flatMap { it.inetAddresses.toList() }
                .filterIsInstance<Inet4Address>()
                .firstOrNull { !it.isLoopbackAddress && it.isSiteLocalAddress }
            ?: throw IllegalStateException("No active Wi-Fi/LAN IPv4 address found")

        // ADB TCP devices conventionally listen on 5555.  This probes
        // only the current /24, never a public or arbitrary network.
        val bytes = localAddress.address
        val prefix = "${bytes[0].toInt() and 0xff}.${bytes[1].toInt() and 0xff}.${bytes[2].toInt() and 0xff}."
        val executor = Executors.newFixedThreadPool(24)
        val candidates = try {
            (1..254).map { host -> executor.submit(Callable {
                val ip = "$prefix$host"
                Socket().use { socket ->
                    if (runCatching { socket.connect(InetSocketAddress(ip, 5555), 350) }.isSuccess) ip else null
                }
            }) }.mapNotNull { it.get() }
        } finally {
            executor.shutdownNow()
        }

        candidates.map { it to 5555 }
    }

    @ReactMethod
    fun scanWifiDevices(promise: Promise) {
        scope.launch(Dispatchers.IO) {
            try {
                val devices = scanNetworkForDevices()
                val array = Arguments.createArray()
                devices.forEach { (ip, port) ->
                    val map = Arguments.createMap()
                    map.putString("ipAddress", ip)
                    map.putInt("port", port)
                    array.pushMap(map)
                }
                promise.resolve(array)
            } catch (error: Throwable) {
                promise.reject("SCAN_ERROR", error.message ?: "Wi-Fi scan failed", error)
            }
        }
    }

    @ReactMethod
    fun connectWifiDevice(ip: String, port: Int, promise: Promise) {
        scope.launch {
            try {
                val host = ip.trim()
                require(host.isNotEmpty()) { "TV IP address is required" }
                require(port in 1..65535) { "Port must be between 1 and 65535" }

                val result = localAdbManager.connectWifiDevice(host, port)
                if (result.isSuccess) {
                    val device = result.getOrNull() ?: error("Connection returned no device")
                    // WritableMap ownership is transferred when it is emitted
                    // or resolved. Never send the same instance twice.
                    emitEvent("deviceConnected", deviceToMap(device))
                    promise.resolve(deviceToMap(device))
                } else {
                    val message = result.exceptionOrNull()?.message ?: "Unable to connect to ADB on $host:$port"
                    // Don't add failed devices to the list - only show successfully connected TVs
                    promise.reject("CONNECTION_ERROR", message, result.exceptionOrNull())
                }
            } catch (error: Throwable) {
                // Kadb and socket failures can surface as Errors on some
                // Android builds; keep them within this request, not the app.
                promise.reject("CONNECTION_ERROR", error.message ?: "Unable to connect to the TV", error)
            }
        }
    }

    /** Android 11+ Wireless debugging: this explicitly performs the TV-side
     * pairing-code authorization. It never attempts to bypass that consent. */
    @ReactMethod
    fun pairWifiDevice(ip: String, port: Int, pairingCode: String, promise: Promise) {
        scope.launch(Dispatchers.IO) {
            try {
                val host = ip.trim()
                require(host.isNotEmpty()) { "Google TV IP address is required" }
                require(port in 1..65535) { "Pairing port must be between 1 and 65535" }
                require(pairingCode.trim().matches(Regex("\\d{6}"))) { "Enter the 6-digit code shown on the TV" }
                Kadb.pair(host, port, pairingCode.trim(), "TV Control Center")
                
                // Pairing successful - return success without auto-scanning
                // User should check TV screen for the actual ADB port and connect manually
                val result = Arguments.createMap()
                result.putString("ipAddress", host)
                result.putInt("port", port)
                result.putBoolean("success", true)
                promise.resolve(result)
            } catch (error: Throwable) {
                promise.reject("PAIRING_ERROR", error.message ?: "Google TV pairing failed", error)
            }
        }
    }
    
    @ReactMethod
    fun disconnectDevice(deviceId: String, promise: Promise) {
        scope.launch {
            val result = localAdbManager.disconnectDevice(deviceId)
            if (result.isSuccess) {
                emitEvent("deviceDisconnected", deviceId)
                promise.resolve(null)
            } else {
                promise.reject("DISCONNECT_ERROR", result.exceptionOrNull()?.message)
            }
        }
    }
    
    @ReactMethod
    fun scanUsbDevices(promise: Promise) {
        val devices = usbDeviceManager.usbDevices.value
        val array = Arguments.createArray()
        devices.forEach { device ->
            val map = Arguments.createMap()
            map.putString("deviceId", device.deviceId.toString())
            map.putString("deviceName", device.deviceName)
            map.putInt("vendorId", device.vendorId)
            map.putInt("productId", device.productId)
            array.pushMap(map)
        }
        promise.resolve(array)
    }
    
    @ReactMethod
    fun requestUsbPermission(deviceId: String, promise: Promise) {
        val device = usbDeviceManager.getUsbDevice(deviceId)
        if (device != null) {
            val pendingIntent = usbPermissionManager.requestPermission(device)
            usbDeviceManager.requestPermission(device, pendingIntent)
            promise.resolve(usbDeviceManager.hasPermission(device))
        } else {
            promise.reject("DEVICE_NOT_FOUND", "USB device not found")
        }
    }
    
    @ReactMethod
    fun connectUsbDevice(deviceId: String, promise: Promise) {
        val device = usbDeviceManager.getUsbDevice(deviceId)
        if (device != null) {
            scope.launch {
                val result = localAdbManager.connectUsbDevice(device)
                if (result.isSuccess) {
                    val connectedDevice = result.getOrNull() ?: error("Connection returned no device")
                    emitEvent("deviceConnected", deviceToMap(connectedDevice))
                    promise.resolve(deviceToMap(connectedDevice))
                } else {
                    promise.reject("CONNECTION_ERROR", result.exceptionOrNull()?.message)
                }
            }
        } else {
            promise.reject("DEVICE_NOT_FOUND", "USB device not found")
        }
    }
    
    @ReactMethod
    fun shell(deviceId: String, command: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.shell(command)
                if (result.isSuccess) {
                    val cmdResult = result.getOrNull()
                    val map = Arguments.createMap()
                    map.putInt("exitCode", cmdResult?.exitCode ?: -1)
                    map.putString("stdout", cmdResult?.stdout ?: "")
                    map.putString("stderr", cmdResult?.stderr ?: "")
                    map.putBoolean("success", cmdResult?.success ?: false)
                    promise.resolve(map)
                } else {
                    promise.reject("SHELL_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun installApk(deviceId: String, localPath: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.installApk(localPath)
                if (result.isSuccess) {
                    promise.resolve(null)
                } else {
                    promise.reject("INSTALL_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun pushFile(deviceId: String, localPath: String, remotePath: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.push(localPath, remotePath)
                if (result.isSuccess) {
                    promise.resolve(null)
                } else {
                    promise.reject("PUSH_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun pullFile(deviceId: String, remotePath: String, localPath: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.pull(remotePath, localPath)
                if (result.isSuccess) {
                    promise.resolve(null)
                } else {
                    promise.reject("PULL_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun listFiles(deviceId: String, remotePath: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.listFiles(remotePath)
                if (result.isSuccess) {
                    val files = result.getOrNull() ?: emptyList()
                    val array = Arguments.createArray()
                    files.forEach { file ->
                        val map = Arguments.createMap()
                        file.forEach { (key, value) ->
                            map.putString(key, value)
                        }
                        array.pushMap(map)
                    }
                    promise.resolve(array)
                } else {
                    promise.reject("LIST_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun deleteFile(deviceId: String, remotePath: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.deleteFile(remotePath)
                if (result.isSuccess) {
                    promise.resolve(null)
                } else {
                    promise.reject("DELETE_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun getDeviceInfo(deviceId: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.getDeviceInfo()
                if (result.isSuccess) {
                    val info = result.getOrNull() ?: emptyMap()
                    val map = Arguments.createMap()
                    info.forEach { (key, value) ->
                        map.putString(key, value)
                    }
                    promise.resolve(map)
                } else {
                    promise.reject("INFO_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun disablePackage(deviceId: String, packageName: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.disablePackage(packageName)
                if (result.isSuccess) {
                    val cmdResult = result.getOrNull()
                    val map = Arguments.createMap()
                    map.putInt("exitCode", cmdResult?.exitCode ?: -1)
                    map.putString("stdout", cmdResult?.stdout ?: "")
                    map.putString("stderr", cmdResult?.stderr ?: "")
                    map.putBoolean("success", cmdResult?.success ?: false)
                    promise.resolve(map)
                } else {
                    promise.reject("DISABLE_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun enablePackage(deviceId: String, packageName: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.enablePackage(packageName)
                if (result.isSuccess) {
                    val cmdResult = result.getOrNull()
                    val map = Arguments.createMap()
                    map.putInt("exitCode", cmdResult?.exitCode ?: -1)
                    map.putString("stdout", cmdResult?.stdout ?: "")
                    map.putString("stderr", cmdResult?.stderr ?: "")
                    map.putBoolean("success", cmdResult?.success ?: false)
                    promise.resolve(map)
                } else {
                    promise.reject("ENABLE_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun uninstallPackage(deviceId: String, packageName: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.uninstallPackage(packageName)
                if (result.isSuccess) {
                    val cmdResult = result.getOrNull()
                    val map = Arguments.createMap()
                    map.putInt("exitCode", cmdResult?.exitCode ?: -1)
                    map.putString("stdout", cmdResult?.stdout ?: "")
                    map.putString("stderr", cmdResult?.stderr ?: "")
                    map.putBoolean("success", cmdResult?.success ?: false)
                    promise.resolve(map)
                } else {
                    promise.reject("UNINSTALL_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun forceStopPackage(deviceId: String, packageName: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.forceStopPackage(packageName)
                if (result.isSuccess) {
                    val cmdResult = result.getOrNull()
                    val map = Arguments.createMap()
                    map.putInt("exitCode", cmdResult?.exitCode ?: -1)
                    map.putString("stdout", cmdResult?.stdout ?: "")
                    map.putString("stderr", cmdResult?.stderr ?: "")
                    map.putBoolean("success", cmdResult?.success ?: false)
                    promise.resolve(map)
                } else {
                    promise.reject("FORCE_STOP_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun launchPackage(deviceId: String, packageName: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.launchPackage(packageName)
                if (result.isSuccess) {
                    val cmdResult = result.getOrNull()
                    val map = Arguments.createMap()
                    map.putInt("exitCode", cmdResult?.exitCode ?: -1)
                    map.putString("stdout", cmdResult?.stdout ?: "")
                    map.putString("stderr", cmdResult?.stderr ?: "")
                    map.putBoolean("success", cmdResult?.success ?: false)
                    promise.resolve(map)
                } else {
                    promise.reject("LAUNCH_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun sendKeyEvent(deviceId: String, keyCode: Int, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.sendKeyEvent(keyCode)
                if (result.isSuccess) {
                    promise.resolve(null)
                } else {
                    promise.reject("KEY_EVENT_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun rebootDevice(deviceId: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.reboot()
                if (result.isSuccess) {
                    promise.resolve(null)
                } else {
                    promise.reject("REBOOT_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun screenOn(deviceId: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.screenOn()
                if (result.isSuccess) {
                    promise.resolve(null)
                } else {
                    promise.reject("SCREEN_ON_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun screenOff(deviceId: String, promise: Promise) {
        scope.launch {
            val transport = localAdbManager.getTransport(deviceId)
            if (transport != null) {
                val result = transport.screenOff()
                if (result.isSuccess) {
                    promise.resolve(null)
                } else {
                    promise.reject("SCREEN_OFF_ERROR", result.exceptionOrNull()?.message)
                }
            } else {
                promise.reject("DEVICE_NOT_CONNECTED", "Device not connected")
            }
        }
    }
    
    @ReactMethod
    fun getConnectedDevices(promise: Promise) {
        val devices = localAdbManager.getAllDevices()
        val array = Arguments.createArray()
        devices.forEach { device ->
            val map = Arguments.createMap()
            map.putString("deviceId", device.deviceId)
            map.putString("name", device.name)
            map.putString("ipAddress", device.ipAddress)
            map.putInt("port", device.port)
            map.putString("connectionType", device.connectionType.name)
            map.putString("state", device.state.toString())
            
            device.deviceInfo?.let { info ->
                val infoMap = Arguments.createMap()
                infoMap.putString("serial", info.serial)
                infoMap.putString("manufacturer", info.manufacturer)
                infoMap.putString("model", info.model)
                infoMap.putString("androidVersion", info.androidVersion)
                infoMap.putInt("sdkVersion", info.sdkVersion)
                infoMap.putString("screenResolution", info.screenResolution)
                infoMap.putString("density", info.density)
                infoMap.putString("storage", info.storage)
                infoMap.putString("currentApp", info.currentApp ?: "")
                map.putMap("deviceInfo", infoMap)
            }
            
            array.pushMap(map)
        }
        promise.resolve(array)
    }
    
    @ReactMethod
    fun addListener(eventName: String) {
        // Required for event emitter
    }
    
    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for event emitter
    }
    
    private fun emitEvent(eventName: String, data: Any?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, data)
    }

    @ReactMethod
    fun startMirrorActivity(deviceId: String, promise: Promise) {
        try {
            val intent = android.content.Intent(reactApplicationContext, com.aws.tvcontrolcenter.mirror.MirrorActivity::class.java).apply {
                putExtra("deviceId", deviceId)
                addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("MIRROR_ERROR", e.message, e)
        }
    }

    private fun deviceToMap(device: AdbDevice): WritableMap = Arguments.createMap().apply {
        putString("deviceId", device.deviceId)
        putString("name", device.name)
        putString("ipAddress", device.ipAddress)
        putInt("port", device.port)
        putString("connectionType", device.connectionType.name)
        putString("state", device.state.toString())
        device.deviceInfo?.let { info ->
            putMap("deviceInfo", Arguments.createMap().apply {
                putString("serial", info.serial)
                putString("manufacturer", info.manufacturer)
                putString("model", info.model)
                putString("androidVersion", info.androidVersion)
                putInt("sdkVersion", info.sdkVersion)
                putString("screenResolution", info.screenResolution)
                putString("density", info.density)
                putString("storage", info.storage)
                putString("currentApp", info.currentApp ?: "")
            })
        }
    }
}
