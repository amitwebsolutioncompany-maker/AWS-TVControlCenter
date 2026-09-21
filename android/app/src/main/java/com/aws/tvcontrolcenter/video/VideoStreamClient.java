package com.aws.tvcontrolcenter.video;

import android.util.Log;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.nio.ByteBuffer;

public class VideoStreamClient {
    private static final String TAG = "VideoStreamClient";
    
    private WebSocketClient webSocketClient;
    private VideoStreamDecoder decoder;
    private boolean isConnected = false;
    
    public interface StreamCallback {
        void onConnected();
        void onDisconnected();
        void onError(String error);
    }
    
    private StreamCallback callback;
    
    public VideoStreamClient(StreamCallback callback) {
        this.callback = callback;
    }
    
    public void setDecoder(VideoStreamDecoder decoder) {
        this.decoder = decoder;
    }
    
    public void connect(String url) {
        try {
            URI uri = URI.create(url);
            webSocketClient = new WebSocketClient(uri) {
                @Override
                public void onOpen(ServerHandshake handshakedata) {
                    Log.i(TAG, "WebSocket connected");
                    isConnected = true;
                    if (callback != null) {
                        callback.onConnected();
                    }
                }
                
                @Override
                public void onMessage(String message) {
                    // Text messages not expected for video stream
                }
                
                @Override
                public void onMessage(ByteBuffer bytes) {
                    if (decoder != null && isConnected) {
                        byte[] data = new byte[bytes.remaining()];
                        bytes.get(data);
                        decoder.feedFrame(data, 0, data.length);
                    }
                }
                
                @Override
                public void onClose(int code, String reason, boolean remote) {
                    Log.i(TAG, "WebSocket closed: " + reason);
                    isConnected = false;
                    if (callback != null) {
                        callback.onDisconnected();
                    }
                }
                
                @Override
                public void onError(Exception ex) {
                    Log.e(TAG, "WebSocket error", ex);
                    isConnected = false;
                    if (callback != null) {
                        callback.onError(ex.getMessage());
                    }
                }
            };
            
            webSocketClient.connect();
        } catch (Exception e) {
            Log.e(TAG, "Failed to connect", e);
            if (callback != null) {
                callback.onError("Connection failed: " + e.getMessage());
            }
        }
    }
    
    public void disconnect() {
        if (webSocketClient != null) {
            try {
                webSocketClient.close();
            } catch (Exception e) {
                Log.e(TAG, "Error disconnecting", e);
            }
            webSocketClient = null;
        }
        isConnected = false;
    }
    
    public boolean isConnected() {
        return isConnected;
    }
}
