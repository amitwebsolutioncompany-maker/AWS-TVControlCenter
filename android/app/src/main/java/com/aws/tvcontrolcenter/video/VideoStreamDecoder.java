package com.aws.tvcontrolcenter.video;

import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.os.Build;
import android.util.Log;
import android.view.Surface;

import java.nio.ByteBuffer;

public class VideoStreamDecoder {
    private static final String TAG = "VideoStreamDecoder";
    private static final String MIME_TYPE = "video/avc"; // H.264
    private static final int FRAME_RATE = 30;
    private static final int I_FRAME_INTERVAL = 1;

    private MediaCodec mediaCodec;
    private Surface surface;
    private boolean isRunning = false;
    private int width = 1280;
    private int height = 720;

    public interface DecoderCallback {
        void onFrameDecoded();
        void onError(String error);
    }

    private DecoderCallback callback;

    public VideoStreamDecoder(Surface surface, DecoderCallback callback) {
        this.surface = surface;
        this.callback = callback;
    }

    public void setResolution(int width, int height) {
        this.width = width;
        this.height = height;
    }

    public void start() {
        if (isRunning) return;

        try {
            mediaCodec = MediaCodec.createDecoderByType(MIME_TYPE);
            MediaFormat format = MediaFormat.createVideoFormat(MIME_TYPE, width, height);
            format.setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface);
            format.setInteger(MediaFormat.KEY_FRAME_RATE, FRAME_RATE);
            format.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, I_FRAME_INTERVAL);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Low latency mode for Android 6.0+
                format.setInteger(MediaFormat.KEY_PRIORITY, 0);
            }

            mediaCodec.configure(format, surface, null, 0);
            mediaCodec.start();
            isRunning = true;
            Log.i(TAG, "Video decoder started");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start decoder", e);
            if (callback != null) {
                callback.onError("Failed to start decoder: " + e.getMessage());
            }
        }
    }

    public void feedFrame(byte[] data, int offset, int length) {
        if (!isRunning || mediaCodec == null) {
            Log.w(TAG, "Decoder not running or null");
            return;
        }

        try {
            int inputBufferId = mediaCodec.dequeueInputBuffer(10000);
            if (inputBufferId >= 0) {
                ByteBuffer inputBuffer = mediaCodec.getInputBuffer(inputBufferId);
                if (inputBuffer != null) {
                    inputBuffer.clear();
                    inputBuffer.put(data, offset, length);
                    mediaCodec.queueInputBuffer(inputBufferId, 0, length, System.nanoTime(), 0);
                    Log.d(TAG, "Fed frame to decoder, size: " + length);
                }
            } else {
                Log.w(TAG, "No input buffer available");
            }

            MediaCodec.BufferInfo bufferInfo = new MediaCodec.BufferInfo();
            int outputBufferId = mediaCodec.dequeueOutputBuffer(bufferInfo, 10000);
            if (outputBufferId >= 0) {
                mediaCodec.releaseOutputBuffer(outputBufferId, true);
                if (callback != null) {
                    callback.onFrameDecoded();
                }
                Log.d(TAG, "Frame decoded and rendered");
            } else if (outputBufferId == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                Log.i(TAG, "Output format changed");
            } else if (outputBufferId == MediaCodec.INFO_TRY_AGAIN_LATER) {
                Log.d(TAG, "No output buffer available yet");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error feeding frame", e);
        }
    }

    public void stop() {
        isRunning = false;
        if (mediaCodec != null) {
            try {
                mediaCodec.stop();
                mediaCodec.release();
            } catch (Exception e) {
                Log.e(TAG, "Error stopping decoder", e);
            }
            mediaCodec = null;
        }
        Log.i(TAG, "Video decoder stopped");
    }

    public boolean isRunning() {
        return isRunning;
    }
}
