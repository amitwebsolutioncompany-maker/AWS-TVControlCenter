package com.aws.tvcontrolcenter.adb

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import java.util.concurrent.ConcurrentHashMap

class AdbManager(private val context: Context) {
    
    private val devices = ConcurrentHashMap<String, AdbDevice>()
    private val _devicesState = MutableStateFlow<List<AdbDevice>>(emptyList())
    val devicesState: StateFlow<List<AdbDevice>> = _devicesState
    
    private val transports = ConcurrentHashMap<String, AdbTransport>()
    
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
                val updatedDevice = device.copy(state = AdbConnectionState.Connected)
                devices[deviceId] = updatedDevice
                _devicesState.value = devices.values.toList()
                
                // Get device info
                val infoResult = transport.getDeviceInfo()
                var finalDevice = updatedDevice
                if (infoResult.isSuccess) {
                    val info = infoResult.getOrNull() ?: emptyMap()
                    val deviceInfo = parseDeviceInfo(info)
                    finalDevice = updatedDevice.copy(deviceInfo = deviceInfo)
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
