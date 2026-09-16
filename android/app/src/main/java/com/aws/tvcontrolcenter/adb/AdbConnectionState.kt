package com.aws.tvcontrolcenter.adb

sealed class AdbConnectionState {
    object Disconnected : AdbConnectionState()
    object Connecting : AdbConnectionState()
    object Connected : AdbConnectionState()
    object Authenticating : AdbConnectionState()
    data class Error(val message: String) : AdbConnectionState()
    object Unauthorized : AdbConnectionState()
}
