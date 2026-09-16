package com.aws.tvcontrolcenter.adb

data class AdbDevice(
    val deviceId: String,
    val name: String,
    val ipAddress: String,
    val port: Int,
    val connectionType: ConnectionType,
    val state: AdbConnectionState = AdbConnectionState.Disconnected,
    val deviceInfo: DeviceInfo? = null
) {
    enum class ConnectionType {
        WIFI,
        USB
    }

    data class DeviceInfo(
        val serial: String,
        val manufacturer: String,
        val model: String,
        val androidVersion: String,
        val sdkVersion: Int,
        val screenResolution: String,
        val density: String,
        val storage: String,
        val currentApp: String?
    )
}
