package com.aws.tvcontrolcenter.adb

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import java.util.concurrent.ConcurrentHashMap
import android.view.Surface

class AdbManager(private val context: Context) {
    
    private val devices = ConcurrentHashMap<String, AdbDevice>()
    private val _devicesState = MutableStateFlow<List<AdbDevice>>(emptyList())
    val devicesState: StateFlow<List<AdbDevice>> = _devicesState
    
    private val transports = ConcurrentHashMap<String, AdbTransport>()
    private val savedWifiDevices = context.getSharedPreferences("saved_wifi_adb_devices", Context.MODE_PRIVATE)
    
    suspend fun connectWifiDevice(ip: String, port: Int = 5555): Result<AdbDevice> = withContext(Dispatchers.IO) {
        try {
            val deviceId = "wifi_${ip}_$port"
            
            if (devices.containsKey(deviceId) && transports[deviceId]?.isConnected() == true) {
                return@withContext Result.success(devices[deviceId]!!)
            }
            // A stale cached entry must never prevent an explicit reconnect.
            transports.remove(deviceId)?.disconnect()
            devices.remove(deviceId)
            
            val device = AdbDevice(
                deviceId = deviceId,
                name = "TV $ip",
                ipAddress = ip,
                port = port,
                connectionType = AdbDevice.ConnectionType.WIFI,
                state = AdbConnectionState.Connecting
            )
            
            devices[deviceId] = device
            _devicesState.value = devices.values.toList()
            
            val transport = WifiAdbTransport(ip, port)
            val connectResult = transport.connect()
            
            if (connectResult.isSuccess) {
                transports[deviceId] = transport
                saveWifiDevice(ip, port)
                val updatedDevice = device.copy(state = AdbConnectionState.Connected)
                devices[deviceId] = updatedDevice
                _devicesState.value = devices.values.toList()
                
                // Get device info
                val infoResult = transport.getDeviceInfo()
                var finalDevice = updatedDevice
                if (infoResult.isSuccess) {
                    val info = infoResult.getOrNull() ?: emptyMap()
                    val deviceInfo = parseDeviceInfo(info)
                    // Display the real device name and Android version as soon
                    // as the connection is authenticated. This prevents the UI
                    // from being stuck at "Android Unknown" after auto-connect.
                    finalDevice = updatedDevice.copy(
                        name = deviceInfo.model.ifBlank { updatedDevice.name },
                        deviceInfo = deviceInfo,
                    )
                    devices[deviceId] = finalDevice
                    _devicesState.value = devices.values.toList()
                }
                
                Result.success(finalDevice)
            } else {
                val updatedDevice = device.copy(state = AdbConnectionState.Error(connectResult.exceptionOrNull()?.message ?: "Connection failed"))
                devices[deviceId] = updatedDevice
                _devicesState.value = devices.values.toList()
                Result.failure(connectResult.exceptionOrNull() ?: Exception("Connection failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun connectUsbDevice(usbDevice: android.hardware.usb.UsbDevice): Result<AdbDevice> = withContext(Dispatchers.IO) {
        try {
            val deviceId = "usb_${usbDevice.deviceId}"
            
            if (devices.containsKey(deviceId)) {
                return@withContext Result.success(devices[deviceId]!!)
            }
            
            val device = AdbDevice(
                deviceId = deviceId,
                name = "USB Device ${usbDevice.deviceName}",
                ipAddress = "",
                port = 0,
                connectionType = AdbDevice.ConnectionType.USB,
                state = AdbConnectionState.Connecting
            )
            
            devices[deviceId] = device
            _devicesState.value = devices.values.toList()
            
            val transport = UsbAdbTransport(context, usbDevice)
            val connectResult = transport.connect()
            
            if (connectResult.isSuccess) {
                transports[deviceId] = transport
                val updatedDevice = device.copy(state = AdbConnectionState.Connected)
                devices[deviceId] = updatedDevice
                _devicesState.value = devices.values.toList()
                Result.success(updatedDevice)
            } else {
                val updatedDevice = device.copy(state = AdbConnectionState.Error(connectResult.exceptionOrNull()?.message ?: "Connection failed"))
                devices[deviceId] = updatedDevice
                _devicesState.value = devices.values.toList()
                Result.failure(connectResult.exceptionOrNull() ?: Exception("Connection failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun disconnectDevice(deviceId: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val transport = transports[deviceId]
            if (transport != null) {
                transport.disconnect()
                transports.remove(deviceId)
            }
            
            devices.remove(deviceId)
            _devicesState.value = devices.values.toList()
            
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun getTransport(deviceId: String): AdbTransport? {
        return transports[deviceId]
    }
    
    fun getDevice(deviceId: String): AdbDevice? {
        return devices[deviceId]
    }
    
    fun getAllDevices(): List<AdbDevice> {
        return devices.values.toList()
    }

    fun startMirror(deviceId: String, surface: Surface, sessionId: String, onStatus: (String) -> Unit) {
        val transport = transports[deviceId] as? WifiAdbTransport ?: error("Screen mirror requires a Wi-Fi ADB TV connection")
        transport.startMirror(context, surface, sessionId, onStatus)
    }

    fun stopMirror(deviceId: String) { (transports[deviceId] as? WifiAdbTransport)?.stopMirror() }
    fun mirrorTouch(deviceId: String, action: Int, x: Float, y: Float, width: Int, height: Int) { (transports[deviceId] as? WifiAdbTransport)?.mirrorTouch(action, x, y, width, height) }

    /** Retain known endpoints across launches for immediate reconnection. */
    fun getSavedWifiDevices(): List<Pair<String, Int>> = savedWifiDevices
        .getStringSet("endpoints", emptySet())
        .orEmpty()
        .mapNotNull { value ->
            val separator = value.lastIndexOf(':')
            if (separator <= 0) null else {
                val host = value.substring(0, separator)
                val port = value.substring(separator + 1).toIntOrNull()
                if (port == null || port !in 1..65535) null else host to port
            }
        }

    private fun saveWifiDevice(ip: String, port: Int) {
        val endpoints = savedWifiDevices.getStringSet("endpoints", emptySet()).orEmpty().toMutableSet()
        endpoints.add("$ip:$port")
        savedWifiDevices.edit().putStringSet("endpoints", endpoints).apply()
    }
    
    private fun parseDeviceInfo(info: Map<String, String>): AdbDevice.DeviceInfo {
        return AdbDevice.DeviceInfo(
            serial = info["ro.serialno"] ?: "",
            manufacturer = info["ro.product.manufacturer"] ?: "",
            model = info["ro.product.model"] ?: "",
            androidVersion = info["ro.build.version.release"] ?: "",
            sdkVersion = info["ro.build.version.sdk"]?.toIntOrNull() ?: 0,
            screenResolution = info["screen_size"] ?: "",
            density = info["density"] ?: "",
            storage = info["storage"] ?: "",
            currentApp = null
        )
    }
}
