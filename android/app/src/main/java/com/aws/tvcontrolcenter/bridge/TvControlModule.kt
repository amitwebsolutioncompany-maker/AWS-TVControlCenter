package com.aws.tvcontrolcenter.bridge

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.aws.tvcontrolcenter.adb.AdbManager
import com.aws.tvcontrolcenter.adb.AdbDevice
import com.aws.tvcontrolcenter.usb.UsbDeviceManager
import com.aws.tvcontrolcenter.usb.UsbPermissionManager
import kotlinx.coroutines.CoroutineScope
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
    
    private val adbManager = AdbManager(reactContext)
    private val usbDeviceManager = UsbDeviceManager(reactContext)
    private val usbPermissionManager = UsbPermissionManager(reactContext)
    // Native connection failures must never terminate React Native's module
    // thread. Each operation reports its own error back to JavaScript instead.
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    
    override fun getName(): String = "TvControlModule"
    
    override fun initialize() {
        super.initialize()
        usbDeviceManager.startListening()
        usbPermissionManager.startListening()
    }
    
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        usbDeviceManager.stopListening()
        usbPermissionManager.stopListening()
    }
    
    @ReactMethod
    fun scanWifiDevices(promise: Promise) {
        scope.launch(Dispatchers.IO) {
            try {
                val localAddress = NetworkInterface.getNetworkInterfaces().toList()
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

                val devices = Arguments.createArray()
                candidates.forEach { ip ->
                    val map = Arguments.createMap()
                    map.putString("ipAddress", ip)
                    map.putInt("port", 5555)
                    devices.pushMap(map)
                }
                promise.resolve(devices)
            } catch (error: Exception) {
                promise.reject("SCAN_ERROR", error.message, error)
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

                val result = adbManager.connectWifiDevice(host, port)
                if (result.isSuccess) {
                    val device = result.getOrNull() ?: error("Connection returned no device")
                    // WritableMap ownership is transferred when it is emitted
                    // or resolved. Never send the same instance twice.
                    emitEvent("deviceConnected", deviceToMap(device))
                    promise.resolve(deviceToMap(device))
                } else {
                    val message = result.exceptionOrNull()?.message ?: "Unable to connect to ADB on $host:$port"
                    promise.reject("CONNECTION_ERROR", message, result.exceptionOrNull())
                }
            } catch (error: Throwable) {
                // Kadb and socket failures can surface as Errors on some
                // Android builds; keep them within this request, not the app.
                promise.reject("CONNECTION_ERROR", error.message ?: "Unable to connect to the TV", error)
            }
        }
    }
    
    @ReactMethod
    fun disconnectDevice(deviceId: String, promise: Promise) {
        scope.launch {
            val result = adbManager.disconnectDevice(deviceId)
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
                val result = adbManager.connectUsbDevice(device)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
            val transport = adbManager.getTransport(deviceId)
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
        val devices = adbManager.getAllDevices()
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
