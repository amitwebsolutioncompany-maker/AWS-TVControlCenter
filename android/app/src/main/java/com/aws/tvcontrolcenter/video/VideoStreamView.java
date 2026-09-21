package com.aws.tvcontrolcenter.video;

import android.content.Context;
import android.graphics.SurfaceTexture;
import android.view.Surface;
import android.view.TextureView;

public class VideoStreamView extends TextureView implements TextureView.SurfaceTextureListener {
    private static final String TAG = "VideoStreamView";
    
    private VideoStreamDecoder decoder;
    private VideoStreamClient client;
    private Surface surface;
    
    public interface StreamViewCallback {
        void onReady();
        void onError(String error);
    }
    
    private StreamViewCallback callback;
    
    public VideoStreamView(Context context) {
        super(context);
        setSurfaceTextureListener(this);
    }
    
    @Override
    public void setBackgroundColor(int color) {
        // TextureView doesn't support background color/drawables
        // React Native often tries to set this, which causes UnsupportedOperationException
        // We override and ignore it to prevent the app from crashing
    }
    
    public void setCallback(StreamViewCallback callback) {
        this.callback = callback;
    }
    
    private String pendingUrl;
    
    public void startStream(String url) {
        this.pendingUrl = url;
        if (surface == null) {
            if (callback != null) {
                callback.onError("Surface not ready, saving URL");
            }
            return;
        }
        
        // Stop existing stream if any
        stopStream();
        
        // Create decoder with surface
        decoder = new VideoStreamDecoder(surface, new VideoStreamDecoder.DecoderCallback() {
            @Override
            public void onFrameDecoded() {
                // Frame decoded successfully
            }
            
            @Override
            public void onError(String error) {
                if (callback != null) {
                    callback.onError("Decoder error: " + error);
                }
            }
        });
        
        // Create client
        client = new VideoStreamClient(new VideoStreamClient.StreamCallback() {
            @Override
            public void onConnected() {
                // Start decoder when connected
                if (decoder != null) {
                    decoder.start();
                }
            }
            
            @Override
            public void onDisconnected() {
                if (decoder != null) {
                    decoder.stop();
                }
            }
            
            @Override
            public void onError(String error) {
                if (callback != null) {
                    callback.onError("Stream error: " + error);
                }
            }
        });
        
        // Set decoder in client
        client.setDecoder(decoder);
        
        // Connect to stream
        client.connect(url);
    }
    
    public void stopStream() {
        if (client != null) {
            client.disconnect();
            client = null;
        }
        if (decoder != null) {
            decoder.stop();
            decoder = null;
        }
    }
    
    public boolean isStreaming() {
        return client != null && client.isConnected();
    }
    
    @Override
    public void onSurfaceTextureAvailable(SurfaceTexture surfaceTexture, int width, int height) {
        surface = new Surface(surfaceTexture);
        if (pendingUrl != null && !pendingUrl.isEmpty()) {
            startStream(pendingUrl);
        }
        if (callback != null) {
            callback.onReady();
        }
    }
    
    @Override
    public void onSurfaceTextureSizeChanged(SurfaceTexture surfaceTexture, int width, int height) {
    }
    
    @Override
    public boolean onSurfaceTextureDestroyed(SurfaceTexture surfaceTexture) {
        stopStream();
        if (surface != null) {
            surface.release();
            surface = null;
        }
        return true;
    }

    @Override
    public void onSurfaceTextureUpdated(SurfaceTexture surfaceTexture) {
    }
}
