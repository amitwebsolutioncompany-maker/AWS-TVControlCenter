package com.aws.tvcontrolcenter.usb

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class UsbDeviceManager(private val context: Context) {
    
    private val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
    private val _usbDevices = MutableStateFlow<List<UsbDevice>>(emptyList())
    val usbDevices: StateFlow<List<UsbDevice>> = _usbDevices
    private var isListening = false
    
    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    val device: UsbDevice? = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    device?.let { 
                        val current = _usbDevices.value.toMutableList()
                        if (!current.any { existing -> existing.deviceId == it.deviceId }) {
                            current.add(it)
                            _usbDevices.value = current
                        }
                    }
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    val device: UsbDevice? = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    device?.let {
                        val current = _usbDevices.value.toMutableList()
                        current.removeAll { existing -> existing.deviceId == it.deviceId }
                        _usbDevices.value = current
                    }
                }
            }
        }
    }
    
    fun startListening() {
        if (isListening) return
        val filter = IntentFilter().apply {
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(usbReceiver, filter)
        }
        isListening = true
        
        // List existing devices
        val deviceList = usbManager.deviceList.values.toList()
        _usbDevices.value = deviceList
    }
    
    fun stopListening() {
        if (!isListening) return
        context.unregisterReceiver(usbReceiver)
        isListening = false
    }
    
    fun getUsbDevice(deviceId: String): UsbDevice? {
        return usbManager.deviceList.values.find { it.deviceId.toString() == deviceId }
    }
    
    fun hasPermission(device: UsbDevice): Boolean {
        return usbManager.hasPermission(device)
    }
    
    fun requestPermission(device: UsbDevice, intent: android.app.PendingIntent) {
        usbManager.requestPermission(device, intent)
    }
}
