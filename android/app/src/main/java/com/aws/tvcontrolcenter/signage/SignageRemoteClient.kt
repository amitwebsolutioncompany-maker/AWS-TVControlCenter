package com.aws.tvcontrolcenter.signage

import android.util.Log
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import org.json.JSONObject
import java.net.URI
import java.nio.ByteBuffer

class SignageRemoteClient(private val host: String, private val port: Int) {
    private val TAG = "SignageRemoteClient"
    private var webSocketClient: WebSocketClient? = null
    private var isAuthenticated = false
    
    interface ConnectionCallback {
        fun onConnected()
        fun onDisconnected()
        fun onError(error: String)
        fun onVideoFrame(data: ByteArray, offset: Int, length: Int)
        fun onAuthResult(success: Boolean)
    }
    
    private var callback: ConnectionCallback? = null
    
    fun connect(callback: ConnectionCallback) {
        this.callback = callback
        
        try {
            val uri = URI.create("ws://$host:$port")
            webSocketClient = object : WebSocketClient(uri) {
                override fun onOpen(handshake: ServerHandshake) {
                    Log.i(TAG, "WebSocket connected to $host:$port")
                    callback.onConnected()
                }
                
                override fun onMessage(message: String) {
                    try {
                        val json = JSONObject(message)
                        val type = json.optString("type", "")
                        
                        if (type == "auth_result") {
                            val success = json.optBoolean("success", false)
                            isAuthenticated = success
                            callback.onAuthResult(success)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing message", e)
                    }
                }
                
                override fun onMessage(bytes: ByteBuffer) {
                    val data = ByteArray(bytes.remaining())
                    bytes.get(data)
                    callback.onVideoFrame(data, 0, data.size)
                }
                
                override fun onClose(code: Int, reason: String, remote: Boolean) {
                    Log.i(TAG, "WebSocket closed: $code - $reason")
                    isAuthenticated = false
                    callback.onDisconnected()
                }
                
                override fun onError(ex: Exception) {
                    Log.e(TAG, "WebSocket error", ex)
                    callback.onError(ex.message ?: "Unknown error")
                }
            }
            
            webSocketClient?.connect()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to connect", e)
            callback.onError("Failed to connect: ${e.message}")
        }
    }
    
    fun authenticate(pin: String) {
        if (!isConnected()) return
        
        try {
            val json = JSONObject()
            json.put("type", "auth")
            json.put("pin", pin)
            webSocketClient?.send(json.toString())
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send auth", e)
        }
    }
    
    fun sendTap(x: Float, y: Float) {
        if (!isAuthenticated || !isConnected()) return
        
        try {
            val json = JSONObject()
            json.put("type", "tap")
            json.put("x", x)
            json.put("y", y)
            webSocketClient?.send(json.toString())
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send tap", e)
        }
    }
    
    fun sendLongPress(x: Float, y: Float) {
        if (!isAuthenticated || !isConnected()) return
        
        try {
            val json = JSONObject()
            json.put("type", "long_press")
            json.put("x", x)
            json.put("y", y)
            webSocketClient?.send(json.toString())
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send long press", e)
        }
    }
    
    fun sendSwipe(startX: Float, startY: Float, endX: Float, endY: Float, duration: Long = 300) {
        if (!isAuthenticated || !isConnected()) return
        
        try {
            val json = JSONObject()
            json.put("type", "swipe")
            json.put("startX", startX)
            json.put("startY", startY)
            json.put("endX", endX)
            json.put("endY", endY)
            json.put("duration", duration)
            webSocketClient?.send(json.toString())
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send swipe", e)
        }
    }
    
    fun sendText(text: String) {
        if (!isAuthenticated || !isConnected()) return
        
        try {
            val json = JSONObject()
            json.put("type", "text")
            json.put("text", text)
            webSocketClient?.send(json.toString())
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send text", e)
        }
    }
    
    fun sendGlobalAction(action: Int) {
        if (!isAuthenticated || !isConnected()) return
        
        try {
            val json = JSONObject()
            json.put("type", "global_action")
            json.put("action", action)
            webSocketClient?.send(json.toString())
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send global action", e)
        }
    }
    
    fun disconnect() {
        try {
            webSocketClient?.close()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to disconnect", e)
        }
        webSocketClient = null
        isAuthenticated = false
    }
    
    fun isConnected(): Boolean {
        return webSocketClient?.isOpen == true
    }
    
    fun isAuth(): Boolean {
        return isAuthenticated
    }
}
