package com.fullmind.widget

import android.content.Context
import android.content.SharedPreferences
import android.content.ComponentName
import android.appwidget.AppWidgetManager
import android.content.Intent
import org.json.JSONObject
import java.security.MessageDigest
import com.fullmind.widget.security.SecureWidgetStorage

object WidgetDataManager {
    private const val PREFS_NAME = "being_widget_data"
    private const val KEY_WIDGET_DATA = "widget_data"
    private const val KEY_LAST_UPDATE = "last_update"
    private const val KEY_UPDATE_COUNT = "update_count"
    
    private var secureStorage: SecureWidgetStorage? = null

    fun getCurrentData(context: Context): WidgetData {
        try {
            // Try secure storage first
            getSecureStorage(context)?.let { storage ->
                storage.retrieveWidgetData()?.let { encryptedData ->
                    val jsonString = String(encryptedData, Charsets.UTF_8)
                    val jsonObject = JSONObject(jsonString)
                    return parseWidgetData(jsonObject)
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("WidgetDataManager", "Failed to retrieve secure data: ${e.message}")
        }
        
        // Fallback to plain SharedPreferences
        val prefs = getSharedPreferences(context)
        val dataJson = prefs.getString(KEY_WIDGET_DATA, null)
            ?: return WidgetData.placeholder()
        
        return try {
            val jsonObject = JSONObject(dataJson)
            
            // Verify data integrity if hash is present
            if (verifyDataIntegrity(jsonObject)) {
                parseWidgetData(jsonObject)
            } else {
                android.util.Log.w("WidgetDataManager", "Data integrity check failed")
                WidgetData.placeholder()
            }
        } catch (e: Exception) {
            android.util.Log.e("WidgetDataManager", "Failed to parse widget data", e)
            WidgetData.placeholder()
        }
    }
    
    fun updateFromApp(context: Context, jsonData: String) {
        try {
            val dataObj = JSONObject(jsonData)
            
            // Store in secure storage
            getSecureStorage(context)?.let { storage ->
                try {
                    storage.storeWidgetData(jsonData.toByteArray(Charsets.UTF_8))
                    android.util.Log.d("WidgetDataManager", "Secure storage updated")
                } catch (e: Exception) {
                    android.util.Log.w("WidgetDataManager", "Secure storage failed: ${e.message}")
                }
            }
            
            // Also store in SharedPreferences as fallback
            val prefs = getSharedPreferences(context)
            prefs.edit()
                .putString(KEY_WIDGET_DATA, jsonData)
                .putLong(KEY_LAST_UPDATE, System.currentTimeMillis())
                .putInt(KEY_UPDATE_COUNT, prefs.getInt(KEY_UPDATE_COUNT, 0) + 1)
                .apply()
                
            // Update all widgets
            updateAllWidgets(context)
            
            android.util.Log.d("WidgetDataManager", "Widget data updated successfully")
            
        } catch (e: Exception) {
            android.util.Log.e("WidgetDataManager", "Failed to update widget data", e)
        }
    }
    
    private fun getSecureStorage(context: Context): SecureWidgetStorage? {
        return try {
            if (secureStorage == null) {
                secureStorage = SecureWidgetStorage(context)
            }
            secureStorage
        } catch (e: Exception) {
            android.util.Log.w("WidgetDataManager", "Secure storage not available: ${e.message}")
            null
        }
    }
    
    private fun getSharedPreferences(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
    
    private fun parseWidgetData(json: JSONObject): WidgetData {
        val todayProgress = json.optJSONObject("todayProgress") ?: JSONObject()
        
        return WidgetData(
            morningStatus = parseSessionStatus(todayProgress.optJSONObject("morning")),
            middayStatus = parseSessionStatus(todayProgress.optJSONObject("midday")),
            eveningStatus = parseSessionStatus(todayProgress.optJSONObject("evening")),
            completionPercentage = todayProgress.optInt("completionPercentage", 0),
            hasActiveCrisis = json.optBoolean("hasActiveCrisis", false),
            lastUpdateTime = System.currentTimeMillis(),
            appVersion = json.optString("appVersion", "1.0.0")
        )
    }
    
    private fun parseSessionStatus(sessionJson: JSONObject?): SessionStatus {
        if (sessionJson == null) return SessionStatus.NotStarted
        
        return when (sessionJson.optString("status", "not_started")) {
            "completed" -> SessionStatus.Completed
            "in_progress" -> SessionStatus.InProgress(sessionJson.optInt("progressPercentage", 0))
            "skipped" -> SessionStatus.Skipped
            else -> SessionStatus.NotStarted
        }
    }
    
    private fun verifyDataIntegrity(json: JSONObject): Boolean {
        val receivedHash = json.optString("encryptionHash", "")
        if (receivedHash.isEmpty()) {
            // No hash provided - allow for development
            return true
        }
        
        // Calculate expected hash (excluding the hash field itself)
        val dataForHash = JSONObject(json.toString())
        dataForHash.remove("encryptionHash")
        
        val calculatedHash = calculateDataHash(dataForHash)
        val isValid = calculatedHash == receivedHash
        
        if (!isValid) {
            android.util.Log.w("WidgetDataManager", "Data integrity verification failed")
            android.util.Log.d("WidgetDataManager", "Expected: $calculatedHash")
            android.util.Log.d("WidgetDataManager", "Received: $receivedHash")
        }
        
        return isValid
    }
    
    private fun calculateDataHash(json: JSONObject): String {
        // Create a reproducible string representation
        val keys = mutableListOf<String>()
        val iterator = json.keys()
        while (iterator.hasNext()) {
            keys.add(iterator.next())
        }
        keys.sort()
        
        val dataString = keys.joinToString("|") { key ->
            "$key:${json.get(key)}"
        }
        
        return MessageDigest.getInstance("SHA-256")
            .digest(dataString.toByteArray())
            .fold("") { str, byte -> str + "%02x".format(byte) }
    }
    
    private fun updateAllWidgets(context: Context) {
        try {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetComponent = ComponentName(context, FullMindWidgetProvider::class.java)
            val widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)
            
            if (widgetIds.isNotEmpty()) {
                val updateIntent = Intent(context, FullMindWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
                }
                context.sendBroadcast(updateIntent)
                
                android.util.Log.d("WidgetDataManager", "Update sent to ${widgetIds.size} widgets")
            } else {
                android.util.Log.d("WidgetDataManager", "No widgets installed")
            }
            
        } catch (e: Exception) {
            android.util.Log.e("WidgetDataManager", "Failed to update widgets", e)
        }
    }
    
    // Analytics and debugging methods (privacy-safe)
    fun getWidgetStats(context: Context): Map<String, Any> {
        val prefs = getSharedPreferences(context)
        return mapOf(
            "lastUpdate" to prefs.getLong(KEY_LAST_UPDATE, 0),
            "updateCount" to prefs.getInt(KEY_UPDATE_COUNT, 0),
            "hasData" to prefs.contains(KEY_WIDGET_DATA),
            "dataSize" to (prefs.getString(KEY_WIDGET_DATA, "")?.length ?: 0),
            "secureStorageAvailable" to (getSecureStorage(context) != null)
        )
    }
    
    fun clearAllData(context: Context) {
        // Clear SharedPreferences
        getSharedPreferences(context).edit().clear().apply()
        
        // Clear secure storage
        getSecureStorage(context)?.let { storage ->
            try {
                // Clear by storing empty data
                storage.storeWidgetData(ByteArray(0))
            } catch (e: Exception) {
                android.util.Log.w("WidgetDataManager", "Failed to clear secure storage: ${e.message}")
            }
        }
        
        android.util.Log.d("WidgetDataManager", "All widget data cleared")
    }
}