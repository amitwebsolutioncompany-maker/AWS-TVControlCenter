package com.aws.tvcontrolcenter.usb

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class UsbPermissionManager(private val context: Context) {
    
    companion object {
        const val ACTION_USB_PERMISSION = "com.aws.tvcontrolcenter.USB_PERMISSION"
    }
    
    private val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
    private val _permissionResults = MutableStateFlow<Map<String, Boolean>>(emptyMap())
    val permissionResults: StateFlow<Map<String, Boolean>> = _permissionResults
    private var isListening = false
    
    private val permissionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == ACTION_USB_PERMISSION) {
                val device: UsbDevice? = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                
                device?.let {
                    val current = _permissionResults.value.toMutableMap()
                    current[it.deviceId.toString()] = granted
                    _permissionResults.value = current
                }
            }
        }
    }
    
    fun startListening() {
        if (isListening) return
        val filter = IntentFilter(ACTION_USB_PERMISSION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(permissionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(permissionReceiver, filter)
        }
        isListening = true
    }
    
    fun stopListening() {
        if (!isListening) return
        context.unregisterReceiver(permissionReceiver)
        isListening = false
    }
    
    fun requestPermission(device: UsbDevice): PendingIntent {
        val intent = Intent(ACTION_USB_PERMISSION)
        intent.putExtra(UsbManager.EXTRA_DEVICE, device)
        
        val flags = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        
        return PendingIntent.getBroadcast(context, device.deviceId.hashCode(), intent, flags)
    }
}
