package com.aws.tvcontrolcenter.signage

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.util.Log
import java.util.concurrent.CopyOnWriteArrayList

class SignageDiscoveryClient(private val context: Context) {
    private val TAG = "SignageDiscovery"
    private val SERVICE_TYPE = "_awstvcontrol._tcp."
    
    private val nsdManager: NsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    private val discoveredServices = CopyOnWriteArrayList<DiscoveredService>()
    private var resolveListener: NsdManager.ResolveListener? = null
    private var discoveryListener: NsdManager.DiscoveryListener? = null
    
    data class DiscoveredService(
        val name: String,
        val host: String,
        val port: Int,
        val ipAddress: String
    )
    
    interface DiscoveryCallback {
        fun onServiceDiscovered(service: DiscoveredService)
        fun onServiceLost(serviceName: String)
        fun onDiscoveryFailed(error: String)
    }
    
    private var callback: DiscoveryCallback? = null
    
    fun startDiscovery(callback: DiscoveryCallback) {
        this.callback = callback
        
        discoveryListener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String) {
                Log.i(TAG, "Discovery started for $serviceType")
            }
            
            override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                Log.i(TAG, "Service found: ${serviceInfo.serviceName}")
                resolveService(serviceInfo)
            }
            
            override fun onServiceLost(serviceInfo: NsdServiceInfo) {
                Log.i(TAG, "Service lost: ${serviceInfo.serviceName}")
                val lost = discoveredServices.find { it.name == serviceInfo.serviceName }
                if (lost != null) {
                    discoveredServices.remove(lost)
                    callback.onServiceLost(serviceInfo.serviceName)
                }
            }
            
            override fun onDiscoveryStopped(serviceType: String) {
                Log.i(TAG, "Discovery stopped for $serviceType")
            }
            
            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                Log.e(TAG, "Discovery failed to start: $errorCode")
                callback.onDiscoveryFailed("Failed to start discovery: $errorCode")
            }
            
            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {
                Log.e(TAG, "Discovery failed to stop: $errorCode")
            }
        }
        
        try {
            nsdManager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start discovery", e)
            callback.onDiscoveryFailed("Failed to start discovery: ${e.message}")
        }
    }
    
    private fun resolveService(serviceInfo: NsdServiceInfo) {
        resolveListener = object : NsdManager.ResolveListener {
            override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                Log.e(TAG, "Resolve failed for ${serviceInfo.serviceName}: $errorCode")
            }
            
            override fun onServiceResolved(resolvedServiceInfo: NsdServiceInfo) {
                Log.i(TAG, "Service resolved: ${resolvedServiceInfo.serviceName}")
                val host = resolvedServiceInfo.host?.hostAddress ?: return
                val port = resolvedServiceInfo.port
                
                val service = DiscoveredService(
                    name = resolvedServiceInfo.serviceName,
                    host = resolvedServiceInfo.host?.hostName ?: host,
                    port = port,
                    ipAddress = host
                )
                
                if (!discoveredServices.any { it.name == service.name }) {
                    discoveredServices.add(service)
                    callback?.onServiceDiscovered(service)
                }
            }
        }
        
        try {
            nsdManager.resolveService(serviceInfo, resolveListener)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to resolve service", e)
        }
    }
    
    fun stopDiscovery() {
        discoveryListener?.let {
            try {
                nsdManager.stopServiceDiscovery(it)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop discovery", e)
            }
        }
        discoveredServices.clear()
    }
    
    fun getDiscoveredServices(): List<DiscoveredService> {
        return discoveredServices.toList()
    }
}
