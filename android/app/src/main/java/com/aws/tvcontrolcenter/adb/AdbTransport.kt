package com.aws.tvcontrolcenter.adb

import kotlinx.coroutines.flow.Flow

interface AdbTransport {
    suspend fun connect(): Result<Unit>
    suspend fun disconnect(): Result<Unit>
    fun isConnected(): Boolean
    suspend fun shell(command: String): Result<AdbCommandResult>
    suspend fun push(localPath: String, remotePath: String, progress: Flow<Float>? = null): Result<Unit>
    suspend fun pull(remotePath: String, localPath: String, progress: Flow<Float>? = null): Result<Unit>
    suspend fun installApk(localPath: String, progress: Flow<Float>? = null): Result<Unit>
    suspend fun sendKeyEvent(keyCode: Int): Result<Unit>
    suspend fun getDeviceInfo(): Result<Map<String, String>>
    suspend fun listFiles(remotePath: String): Result<List<Map<String, String>>>
    suspend fun deleteFile(remotePath: String): Result<Unit>
    suspend fun disablePackage(packageName: String): Result<AdbCommandResult>
    suspend fun enablePackage(packageName: String): Result<AdbCommandResult>
    suspend fun uninstallPackage(packageName: String): Result<AdbCommandResult>
    suspend fun forceStopPackage(packageName: String): Result<AdbCommandResult>
    suspend fun launchPackage(packageName: String): Result<AdbCommandResult>
    suspend fun reboot(): Result<Unit>
    suspend fun screenOn(): Result<Unit>
    suspend fun screenOff(): Result<Unit>
}
