package com.aws.tvcontrolcenter.video;

import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

public class VideoStreamModule extends ReactContextBaseJavaModule {
    private static final String TAG = "VideoStreamModule";
    private static final String E_NOT_READY = "E_NOT_READY";
    
    public VideoStreamModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }
    
    @Override
    public String getName() {
        return "VideoStreamModule";
    }
    
    @ReactMethod
    public void startStream(String url, Promise promise) {
        try {
            // This will be handled by the view manager
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start stream", e);
            promise.reject(E_NOT_READY, e.getMessage());
        }
    }
    
    @ReactMethod
    public void stopStream(Promise promise) {
        try {
            // This will be handled by the view manager
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop stream", e);
            promise.reject(E_NOT_READY, e.getMessage());
        }
    }
}
