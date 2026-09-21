package com.aws.tvcontrolcenter.video;

import android.view.View;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

public class VideoStreamViewManager extends SimpleViewManager<VideoStreamView> {
    public static final String REACT_CLASS = "VideoStreamView";
    
    @Override
    public String getName() {
        return REACT_CLASS;
    }
    
    @Override
    protected VideoStreamView createViewInstance(ThemedReactContext reactContext) {
        return new VideoStreamView(reactContext);
    }
    
    @ReactProp(name = "streamUrl")
    public void setStreamUrl(VideoStreamView view, String url) {
        if (url != null && !url.isEmpty()) {
            view.startStream(url);
        } else {
            view.stopStream();
        }
    }
    
    @Override
    public void receiveCommand(VideoStreamView view, String commandId, ReadableArray args) {
        super.receiveCommand(view, commandId, args);
        
        switch (commandId) {
            case "stop":
                view.stopStream();
                break;
        }
    }
}
