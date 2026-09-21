package com.aws.tvcontrolcenter.mirror

import android.app.Activity
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.MotionEvent
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageButton
import com.aws.tvcontrolcenter.bridge.TvControlModule

class MirrorActivity : Activity() {

    private lateinit var deviceId: String
    private lateinit var surfaceView: SurfaceView
    private var isMirroring = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        deviceId = intent.getStringExtra("deviceId") ?: run {
            finish()
            return
        }

        // Full screen layout
        val root = FrameLayout(this)
        root.setBackgroundColor(Color.BLACK)
        root.layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)

        surfaceView = SurfaceView(this)
        val surfaceParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        surfaceParams.gravity = Gravity.CENTER
        surfaceView.layoutParams = surfaceParams
        
        // Progress Overlay
        val progressContainer = android.widget.LinearLayout(this)
        progressContainer.orientation = android.widget.LinearLayout.VERTICAL
        val progressParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        progressParams.gravity = Gravity.CENTER
        progressContainer.layoutParams = progressParams
        progressContainer.gravity = Gravity.CENTER
        
        val progressBar = android.widget.ProgressBar(this)
        progressBar.layoutParams = android.widget.LinearLayout.LayoutParams(100, 100)
        progressContainer.addView(progressBar)
        
        val statusText = android.widget.TextView(this)
        statusText.setTextColor(Color.WHITE)
        statusText.textSize = 16f
        statusText.gravity = Gravity.CENTER
        statusText.setPadding(0, 20, 0, 0)
        statusText.text = "Initializing connection..."
        progressContainer.addView(statusText)

        surfaceView.holder.addCallback(object : SurfaceHolder.Callback {
            override fun surfaceCreated(holder: SurfaceHolder) {
                if (!isMirroring) {
                    isMirroring = true
                    TvControlModule.adbManager?.startMirror(deviceId, holder.surface, "%08x".format(System.currentTimeMillis() and 0x7fffffff)) { status ->
                        runOnUiThread {
                            if (status == "Ready!") {
                                progressContainer.visibility = View.GONE
                            } else {
                                progressContainer.visibility = View.VISIBLE
                                statusText.text = status
                                if (status.startsWith("Error")) {
                                    statusText.setTextColor(Color.RED)
                                    progressBar.visibility = View.GONE
                                } else {
                                    statusText.setTextColor(Color.WHITE)
                                    progressBar.visibility = View.VISIBLE
                                }
                            }
                        }
                    }
                }
            }
            override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {}
            override fun surfaceDestroyed(holder: SurfaceHolder) {
                if (isMirroring) {
                    isMirroring = false
                    TvControlModule.adbManager?.stopMirror(deviceId)
                }
            }
        })

        surfaceView.setOnTouchListener { _, event ->
            val width = surfaceView.width
            val height = surfaceView.height
            if (width > 0 && height > 0) {
                when (event.actionMasked) {
                    MotionEvent.ACTION_DOWN -> {
                        TvControlModule.adbManager?.mirrorTouch(deviceId, 0, event.x, event.y, width, height)
                    }
                    MotionEvent.ACTION_UP -> {
                        TvControlModule.adbManager?.mirrorTouch(deviceId, 1, event.x, event.y, width, height)
                    }
                    MotionEvent.ACTION_MOVE -> {
                        TvControlModule.adbManager?.mirrorTouch(deviceId, 2, event.x, event.y, width, height)
                    }
                }
            }
            true // Important: return true to receive subsequent ACTION_MOVE and ACTION_UP events!
        }

        root.addView(surfaceView)
        root.addView(progressContainer)

        // Close Button
        val closeBtn = ImageButton(this).apply {
            setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
            imageTintList = ColorStateList.valueOf(Color.WHITE)
            setBackgroundColor(Color.parseColor("#80000000"))
            setPadding(30, 30, 30, 30)
        }
        val closeParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        closeParams.gravity = Gravity.TOP or Gravity.START
        closeParams.setMargins(50, 50, 0, 0)
        closeBtn.layoutParams = closeParams
        closeBtn.setOnClickListener { finish() }

        root.addView(closeBtn)
        setContentView(root)
    }
    
    override fun onDestroy() {
        super.onDestroy()
        if (isMirroring) {
            TvControlModule.adbManager?.stopMirror(deviceId)
            isMirroring = false
        }
    }
}
