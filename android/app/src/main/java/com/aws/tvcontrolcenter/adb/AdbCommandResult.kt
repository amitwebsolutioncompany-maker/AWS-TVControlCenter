package com.aws.tvcontrolcenter.adb

data class AdbCommandResult(
    val exitCode: Int,
    val stdout: String,
    val stderr: String,
    val success: Boolean
) {
    companion object {
        fun success(stdout: String = "", stderr: String = ""): AdbCommandResult {
            return AdbCommandResult(0, stdout, stderr, true)
        }

        fun failure(exitCode: Int, stdout: String = "", stderr: String = ""): AdbCommandResult {
            return AdbCommandResult(exitCode, stdout, stderr, false)
        }
    }
}
