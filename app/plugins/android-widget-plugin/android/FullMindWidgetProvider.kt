package com.fullmind.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.RemoteViews
import org.json.JSONObject
import java.security.MessageDigest

class FullMindWidgetProvider : AppWidgetProvider() {
    
    companion object {
        private const val ACTION_CHECKIN_TAP = "com.fullmind.CHECKIN_TAP"
        private const val ACTION_CRISIS_TAP = "com.fullmind.CRISIS_TAP"
        private const val ACTION_WIDGET_UPDATE = "com.fullmind.WIDGET_UPDATE"
        
        private const val EXTRA_CHECKIN_TYPE = "checkin_type"
        private const val EXTRA_CAN_RESUME = "can_resume"
        
        // Widget update methods for React Native
        fun updateWidgets(context: Context, jsonData: String) {
            WidgetDataManager.updateFromApp(context, jsonData)
        }
    }

    override fun onUpdate(
        context: Context, 
        appWidgetManager: AppWidgetManager, 
        appWidgetIds: IntArray
    ) {
        // Update all widget instances
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        when (intent.action) {
            ACTION_CHECKIN_TAP -> {
                val checkInType = intent.getStringExtra(EXTRA_CHECKIN_TYPE) ?: return
                val canResume = intent.getBooleanExtra(EXTRA_CAN_RESUME, false)
                handleCheckInTap(context, checkInType, canResume)
            }
            ACTION_CRISIS_TAP -> {
                handleCrisisTap(context)
            }
            ACTION_WIDGET_UPDATE -> {
                // Manual update trigger from React Native
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val widgetIds = appWidgetManager.getAppWidgetIds(
                    ComponentName(context, FullMindWidgetProvider::class.java)
                )
                onUpdate(context, appWidgetManager, widgetIds)
            }
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        // Handle widget resize
        updateAppWidget(context, appWidgetManager, appWidgetId)
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
    }

    private fun updateAppWidget(
        context: Context, 
        appWidgetManager: AppWidgetManager, 
        appWidgetId: Int
    ) {
        try {
            val widgetData = WidgetDataManager.getCurrentData(context)
            val views = RemoteViews(context.packageName, R.layout.widget_fullmind)
            
            // Update header with completion percentage
            views.setTextViewText(
                R.id.progress_text,
                "${widgetData.completionPercentage}% Complete"
            )
            
            views.setTextViewText(
                R.id.widget_title,
                "Today's Progress"
            )
            
            // Update session indicators
            updateSessionIndicator(
                context, views, R.id.morning_container, R.id.morning_indicator, 
                R.id.morning_label, widgetData.morningStatus, "morning"
            )
            
            updateSessionIndicator(
                context, views, R.id.midday_container, R.id.midday_indicator, 
                R.id.midday_label, widgetData.middayStatus, "midday"
            )
            
            updateSessionIndicator(
                context, views, R.id.evening_container, R.id.evening_indicator, 
                R.id.evening_label, widgetData.eveningStatus, "evening"
            )
            
            // Crisis button - ALWAYS VISIBLE for safety (CR-001, CR-002)
            // Crisis button visibility SHALL NOT depend on any data conditions
            views.setViewVisibility(R.id.crisis_button, android.view.View.VISIBLE)
            val crisisIntent = createCrisisPendingIntent(context)
            views.setOnClickPendingIntent(R.id.crisis_button, crisisIntent)
            
            // Optional prominence enhancement during active crisis (CR-003)
            if (widgetData.hasActiveCrisis) {
                // Enhance visual prominence without hiding the button
                views.setTextViewText(R.id.crisis_button, "CRISIS SUPPORT NEEDED")
                views.setViewVisibility(R.id.crisis_button, android.view.View.VISIBLE) // Redundant but explicit
            } else {
                views.setTextViewText(R.id.crisis_button, "Crisis Support")
            }
            
            // Set main widget click to open app
            val mainIntent = createMainAppPendingIntent(context)
            views.setOnClickPendingIntent(R.id.widget_container, mainIntent)
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
            
            android.util.Log.d("FullMindWidget", "Widget updated successfully: $appWidgetId")
            
        } catch (e: Exception) {
            android.util.Log.e("FullMindWidget", "Failed to update widget", e)
            
            // CRITICAL FAIL-SAFE: Ensure crisis button is ALWAYS accessible (CR-010, CR-011)
            val errorViews = RemoteViews(context.packageName, R.layout.widget_fullmind)
            errorViews.setTextViewText(R.id.progress_text, "Update failed")
            
            // Crisis button MUST survive error conditions
            errorViews.setViewVisibility(R.id.crisis_button, android.view.View.VISIBLE)
            val crisisIntent = createCrisisPendingIntent(context)
            errorViews.setOnClickPendingIntent(R.id.crisis_button, crisisIntent)
            errorViews.setTextViewText(R.id.crisis_button, "Crisis Support")
            
            appWidgetManager.updateAppWidget(appWidgetId, errorViews)
        }
    }
    
    private fun updateSessionIndicator(
        context: Context,
        views: RemoteViews,
        containerId: Int,
        indicatorId: Int,
        labelId: Int,
        status: SessionStatus,
        checkInType: String
    ) {
        val canResume = status is SessionStatus.InProgress
        
        // Update label
        val labelText = when (checkInType) {
            "morning" -> "Morning"
            "midday" -> "Midday"  
            "evening" -> "Evening"
            else -> checkInType.capitalize()
        }
        views.setTextViewText(labelId, labelText)
        
        // Update indicator based on status
        when (status) {
            is SessionStatus.Completed -> {
                views.setImageViewResource(indicatorId, R.drawable.session_completed)
                views.setContentDescription(indicatorId, "$labelText completed")
            }
            is SessionStatus.InProgress -> {
                views.setImageViewResource(indicatorId, R.drawable.session_in_progress)
                views.setContentDescription(indicatorId, "$labelText in progress ${status.progressPercentage}%")
            }
            is SessionStatus.Skipped -> {
                views.setImageViewResource(indicatorId, R.drawable.session_skipped)
                views.setContentDescription(indicatorId, "$labelText skipped")
            }
            is SessionStatus.NotStarted -> {
                views.setImageViewResource(indicatorId, R.drawable.session_not_started)
                views.setContentDescription(indicatorId, "$labelText not started")
            }
        }
        
        // Set tap handler
        val intent = createCheckInPendingIntent(context, checkInType, canResume)
        views.setOnClickPendingIntent(containerId, intent)
    }
    
    private fun createCheckInPendingIntent(
        context: Context, 
        checkInType: String, 
        canResume: Boolean
    ): PendingIntent {
        val intent = Intent(context, FullMindWidgetProvider::class.java).apply {
            action = ACTION_CHECKIN_TAP
            putExtra(EXTRA_CHECKIN_TYPE, checkInType)
            putExtra(EXTRA_CAN_RESUME, canResume)
        }
        
        return PendingIntent.getBroadcast(
            context, 
            checkInType.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
    
    private fun createCrisisPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, FullMindWidgetProvider::class.java).apply {
            action = ACTION_CRISIS_TAP
        }
        
        return PendingIntent.getBroadcast(
            context, 
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
    
    private fun createMainAppPendingIntent(context: Context): PendingIntent {
        val packageManager = context.packageManager
        val intent = packageManager.getLaunchIntentForPackage(context.packageName) ?: run {
            // Fallback intent
            Intent().apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse("fullmind://home")
            }
        }
        
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
    
    private fun handleCheckInTap(context: Context, checkInType: String, canResume: Boolean) {
        val uri = if (canResume) {
            "fullmind://checkin/$checkInType?resume=true"
        } else {
            "fullmind://checkin/$checkInType"
        }
        
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        
        try {
            context.startActivity(intent)
            
            // Log interaction for analytics (privacy-safe)
            android.util.Log.d("FullMindWidget", "Check-in tap: $checkInType, resume: $canResume")
            
        } catch (e: Exception) {
            android.util.Log.e("FullMindWidget", "Failed to open check-in", e)
            
            // Fallback: open main app
            openMainApp(context)
        }
    }
    
    private fun handleCrisisTap(context: Context) {
        // CRITICAL: Crisis button tap MUST provide immediate intervention <200ms (CR-007)
        val startTime = System.currentTimeMillis()
        
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("fullmind://crisis")).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        
        try {
            context.startActivity(intent)
            
            val responseTime = System.currentTimeMillis() - startTime
            android.util.Log.w("FullMindWidget", "CRISIS BUTTON ACTIVATED - Response time: ${responseTime}ms")
            
            // Alert if response time exceeds 200ms threshold
            if (responseTime > 200) {
                android.util.Log.w("FullMindWidget", "WARNING: Crisis response time exceeded 200ms threshold")
            }
            
        } catch (e: Exception) {
            android.util.Log.e("FullMindWidget", "CRITICAL: Failed to open crisis intervention", e)
            
            // Fallback 1: Try main app
            try {
                openMainApp(context)
            } catch (fallbackE: Exception) {
                android.util.Log.e("FullMindWidget", "CRITICAL: All crisis fallbacks failed", fallbackE)
                
                // Fallback 2: Direct dial 988 if possible
                try {
                    val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:988")).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(dialIntent)
                    android.util.Log.w("FullMindWidget", "Emergency fallback: Direct 988 dial activated")
                } catch (dialE: Exception) {
                    android.util.Log.e("FullMindWidget", "CRITICAL: Emergency dial failed", dialE)
                }
            }
        }
    }
    
    private fun openMainApp(context: Context) {
        try {
            val packageManager = context.packageManager
            val launchIntent = packageManager.getLaunchIntentForPackage(context.packageName)
            
            if (launchIntent != null) {
                launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                context.startActivity(launchIntent)
            } else {
                // Last resort: try URL scheme
                val fallbackIntent = Intent(Intent.ACTION_VIEW, Uri.parse("fullmind://")).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(fallbackIntent)
            }
        } catch (e: Exception) {
            android.util.Log.e("FullMindWidget", "Failed to open main app", e)
        }
    }
}

// MARK: - Data Classes

sealed class SessionStatus {
    object NotStarted : SessionStatus()
    data class InProgress(val progressPercentage: Int) : SessionStatus()
    object Completed : SessionStatus()
    object Skipped : SessionStatus()
}

data class WidgetData(
    val morningStatus: SessionStatus,
    val middayStatus: SessionStatus,
    val eveningStatus: SessionStatus,
    val completionPercentage: Int,
    val hasActiveCrisis: Boolean,
    val lastUpdateTime: Long,
    val appVersion: String
) {
    companion object {
        fun placeholder(): WidgetData {
            return WidgetData(
                morningStatus = SessionStatus.NotStarted,
                middayStatus = SessionStatus.NotStarted,
                eveningStatus = SessionStatus.NotStarted,
                completionPercentage = 0,
                hasActiveCrisis = false,
                lastUpdateTime = System.currentTimeMillis(),
                appVersion = "1.0.0"
            )
        }
    }
}