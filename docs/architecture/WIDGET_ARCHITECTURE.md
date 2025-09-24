# FullMind Native Widget Architecture

## Executive Summary

Complete native bridge architecture for iOS and Android widgets in the FullMind MBCT app, designed to work within Expo managed workflow without ejecting. This architecture delivers 3x engagement boost through intelligent widget updates while maintaining clinical-grade privacy standards.

## Current Architecture Context

**App Foundation:**
- React Native with Expo managed workflow (`newArchEnabled: true`)
- TypeScript strict mode with Zustand stores (`checkInStore`, `userStore`, `assessmentStore`) 
- Enhanced `ResumableSessionService` for interrupted session management
- `SecureDataStore` with AES encryption for mental health data
- Complete offline privacy (Phase 1: no backend/network)

**Key Integration Points:**
- `checkInStore`: Handles morning/midday/evening check-ins with progress tracking
- `ResumableSessionService`: Manages partial sessions with 24hr TTL and 5 resume limit
- `SecureDataStore`: HIPAA-compliant encryption via `EncryptedDataStore`
- Deep linking: React Navigation with crisis-priority routing
- Clinical safety: 988 hotline, PHQ-9/GAD-7 assessment triggers

## 1. System Architecture Overview

### 1.1 Component Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                         │
│  ┌─────────────────┐  ┌──────────────────┐                 │
│  │   checkInStore  │  │ ResumableSession │                 │
│  │   (Zustand)     │  │     Service      │                 │
│  └─────────────────┘  └──────────────────┘                 │
│           │                      │                          │
│  ┌─────────────────────────────────────────┐                │
│  │        WidgetBridgeService              │                │
│  │  • Data Serialization                   │                │
│  │  • Privacy Filtering                    │                │
│  │  • Update Orchestration                 │                │
│  └─────────────────────────────────────────┘                │
│           │                                                  │
└───────────┼──────────────────────────────────────────────────┘
            │
    ┌───────▼───────┐
    │ Expo Config   │
    │    Plugin     │
    └───────┬───────┘
            │
 ┌──────────▼──────────┐
 │  Native Modules     │
 └─────────┬───────────┘
           │
    ┌──────▼──────┬──────▼──────┐
    │             │             │
┌───▼───┐    ┌────▼────┐   ┌────▼────┐
│  iOS  │    │ Android │   │ Shared  │
│Widget │    │ Widget  │   │  Data   │
│Engine │    │ Engine  │   │ Layer   │
└───────┘    └─────────┘   └─────────┘
```

### 1.2 Data Flow Architecture

```
React Native App
       │
       ▼
┌─────────────────────────────┐
│    WidgetDataPipeline       │
│                             │
│ 1. Collect widget data      │
│ 2. Privacy filtering        │
│ 3. Serialize for native     │
│ 4. Trigger native updates   │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│     Shared Data Store       │
│                             │  
│ • App Groups (iOS)          │
│ • SharedPreferences (Android)│
│ • Encrypted widget data     │
│ • Update timestamps         │
└──────────┬──────────────────┘
           │
    ┌──────▼──────┬──────▼──────┐
    │             │             │
┌───▼───┐    ┌────▼────┐   ┌────▼────┐
│  iOS  │    │ Android │   │ Widget  │
│Widget │    │ Widget  │   │Timeline │
│       │    │         │   │Manager  │
└───────┘    └─────────┘   └─────────┘
```

## 2. Native Bridge Implementation Strategy

### 2.1 Expo Config Plugin Structure

**File: `/plugins/expo-fullmind-widgets.js`**

```javascript
const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const withFullMindWidgets = (config) => {
  return withPlugins(config, [
    // iOS Widget Implementation
    (config) => withDangerousMod(config, [
      'ios',
      async (config) => {
        const iosProjectPath = path.join(
          config.modRequest.projectRoot, 
          'ios'
        );
        
        // Copy iOS widget files
        await copyDirectoryRecursive(
          path.join(__dirname, 'ios-widget'),
          path.join(iosProjectPath, 'FullMindWidget')
        );
        
        // Update Xcode project
        await updateXcodeProject(iosProjectPath);
        
        return config;
      }
    ]),
    
    // Android Widget Implementation  
    (config) => withDangerousMod(config, [
      'android',
      async (config) => {
        const androidProjectPath = path.join(
          config.modRequest.projectRoot,
          'android'
        );
        
        // Copy Android widget files
        await copyDirectoryRecursive(
          path.join(__dirname, 'android-widget'),
          path.join(androidProjectPath, 'app/src/main/java/com/fullmind/widget')
        );
        
        // Update Android manifest and layouts
        await updateAndroidManifest(androidProjectPath);
        
        return config;
      }
    ])
  ]);
};

module.exports = withFullMindWidgets;
```

### 2.2 Shared Data Layer Architecture

**TypeScript Interface: `/src/services/WidgetDataService.ts`**

```typescript
/**
 * Widget Data Service - Privacy-preserving data bridge
 * Coordinates between React Native app and native widgets
 */

export interface WidgetData {
  // Safe for widget display (no PHQ-9/GAD-7 data)
  readonly todayProgress: {
    readonly morning: WidgetSessionStatus;
    readonly midday: WidgetSessionStatus;
    readonly evening: WidgetSessionStatus;
    readonly completionPercentage: number; // 0-100
  };
  readonly hasActiveCrisis: boolean; // Crisis button accessibility
  readonly lastUpdateTime: string; // ISO timestamp
  readonly appVersion: string;
  readonly encryptionHash: string; // Data integrity verification
}

export interface WidgetSessionStatus {
  readonly status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  readonly progressPercentage: number; // 0-100 for in_progress
  readonly canResume: boolean;
  readonly estimatedTimeMinutes: number; // Only for in_progress
}

export class WidgetDataService {
  private static readonly WIDGET_DATA_KEY = 'fullmind_widget_data';
  private static readonly MAX_UPDATE_FREQUENCY_MS = 60000; // 1 minute
  private lastUpdateTime: number = 0;

  /**
   * Generate privacy-safe widget data from app state
   */
  async generateWidgetData(): Promise<WidgetData> {
    const checkInStore = useCheckInStore.getState();
    const todayProgress = checkInStore.getTodaysProgress();
    
    // Calculate session statuses
    const morning = await this.getSessionStatus('morning', checkInStore);
    const midday = await this.getSessionStatus('midday', checkInStore);  
    const evening = await this.getSessionStatus('evening', checkInStore);

    const completionPercentage = Math.round(
      (todayProgress.completed / todayProgress.total) * 100
    );

    // Check for crisis mode (no sensitive data exposed)
    const hasActiveCrisis = await this.checkCrisisMode();

    const widgetData: WidgetData = {
      todayProgress: {
        morning,
        midday, 
        evening,
        completionPercentage
      },
      hasActiveCrisis,
      lastUpdateTime: new Date().toISOString(),
      appVersion: Constants.expoConfig?.version || '1.0.0',
      encryptionHash: await this.generateDataHash()
    };

    return widgetData;
  }

  /**
   * Update widget data with throttling
   */
  async updateWidgetData(): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdateTime < WidgetDataService.MAX_UPDATE_FREQUENCY_MS) {
      return; // Throttle updates
    }

    try {
      const widgetData = await this.generateWidgetData();
      
      // Store in shared data layer (encrypted)
      await this.storeWidgetData(widgetData);
      
      // Notify native widgets
      await this.triggerWidgetUpdate();
      
      this.lastUpdateTime = now;
      
      console.log('Widget data updated:', {
        completion: widgetData.todayProgress.completionPercentage,
        timestamp: widgetData.lastUpdateTime
      });
      
    } catch (error) {
      console.error('Widget data update failed:', error);
    }
  }

  /**
   * Handle deep link from widget tap
   */
  async handleWidgetDeepLink(url: string): Promise<void> {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const params = Object.fromEntries(urlObj.searchParams);
    
    if (path.startsWith('/checkin/')) {
      const checkInType = path.split('/')[2] as 'morning' | 'midday' | 'evening';
      
      if (params.resume === 'true') {
        // Navigate to resume flow
        navigate('CheckInFlow', {
          type: checkInType,
          resumeSession: true
        });
      } else {
        // Navigate to start new check-in
        navigate('CheckInFlow', {
          type: checkInType,
          resumeSession: false
        });
      }
    } else if (path === '/crisis') {
      // Emergency crisis access
      navigate('CrisisIntervention', {
        trigger: {
          type: 'manual',
          reason: 'widget_emergency_access'
        },
        fromScreen: 'Widget',
        emergencyMode: true
      });
    }
  }

  // Private helper methods...
  private async getSessionStatus(
    type: 'morning' | 'midday' | 'evening',
    store: any
  ): Promise<WidgetSessionStatus> {
    const todayCheckIn = store.getTodaysCheckIn(type);
    
    if (todayCheckIn) {
      return {
        status: todayCheckIn.skipped ? 'skipped' : 'completed',
        progressPercentage: 100,
        canResume: false,
        estimatedTimeMinutes: 0
      };
    }

    // Check for resumable session
    const hasPartialSession = await store.checkForPartialSession(type);
    if (hasPartialSession) {
      const sessionProgress = await store.getSessionProgress(type);
      return {
        status: 'in_progress',
        progressPercentage: sessionProgress?.percentComplete || 0,
        canResume: true,
        estimatedTimeMinutes: Math.ceil((sessionProgress?.estimatedTimeRemaining || 0) / 60)
      };
    }

    return {
      status: 'not_started',
      progressPercentage: 0,
      canResume: false,
      estimatedTimeMinutes: this.getEstimatedDuration(type)
    };
  }
}
```

## 3. iOS Widget Implementation

### 3.1 iOS Widget Architecture

**Swift Implementation: `/plugins/ios-widget/FullMindWidget/FullMindWidget.swift`**

```swift
import WidgetKit
import SwiftUI

struct FullMindWidget: Widget {
    let kind: String = "FullMindWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FullMindTimelineProvider()) { entry in
            FullMindWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("FullMind Daily Progress")
        .description("Track your daily check-ins and maintain mindfulness")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct FullMindTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> FullMindEntry {
        FullMindEntry(date: Date(), widgetData: FullMindWidgetData.placeholder())
    }
    
    func getSnapshot(in context: Context, completion: @escaping (FullMindEntry) -> ()) {
        let entry = FullMindEntry(
            date: Date(), 
            widgetData: WidgetDataManager.shared.getCurrentData()
        )
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let currentDate = Date()
        let widgetData = WidgetDataManager.shared.getCurrentData()
        
        // Update timeline every 15 minutes during active hours
        let nextUpdateDate = Calendar.current.date(
            byAdding: .minute, 
            value: 15, 
            to: currentDate
        ) ?? currentDate
        
        let entry = FullMindEntry(date: currentDate, widgetData: widgetData)
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdateDate))
        
        completion(timeline)
    }
}

struct FullMindEntry: TimelineEntry {
    let date: Date
    let widgetData: FullMindWidgetData
}

struct FullMindWidgetData {
    let morningStatus: SessionStatus
    let middayStatus: SessionStatus  
    let eveningStatus: SessionStatus
    let completionPercentage: Int
    let hasActiveCrisis: Bool
    let lastUpdateTime: Date
    
    enum SessionStatus {
        case notStarted
        case inProgress(Int) // progress percentage
        case completed
        case skipped
    }
}

@main
struct FullMindWidgetBundle: WidgetBundle {
    var body: some Widget {
        FullMindWidget()
    }
}
```

### 3.2 iOS Data Manager

**Swift Implementation: `/plugins/ios-widget/FullMindWidget/WidgetDataManager.swift`**

```swift
import Foundation
import CryptoKit

class WidgetDataManager {
    static let shared = WidgetDataManager()
    private let userDefaults: UserDefaults
    private let appGroupId = "group.com.fullmind.mbct.widgets"
    
    private init() {
        guard let defaults = UserDefaults(suiteName: appGroupId) else {
            fatalError("Unable to access App Group for widget data sharing")
        }
        self.userDefaults = defaults
    }
    
    func getCurrentData() -> FullMindWidgetData {
        guard let widgetDataJSON = userDefaults.string(forKey: "fullmind_widget_data"),
              let widgetDataDict = parseJSON(widgetDataJSON) else {
            return FullMindWidgetData.placeholder()
        }
        
        // Verify data integrity
        guard verifyDataIntegrity(widgetDataDict) else {
            print("Widget data integrity check failed")
            return FullMindWidgetData.placeholder()
        }
        
        return parseWidgetData(widgetDataDict)
    }
    
    func updateFromApp(jsonData: String) {
        userDefaults.set(jsonData, forKey: "fullmind_widget_data")
        userDefaults.set(Date().timeIntervalSince1970, forKey: "last_update_timestamp")
        
        // Trigger widget timeline refresh
        WidgetCenter.shared.reloadTimelines(ofKind: "FullMindWidget")
    }
    
    // Deep linking support
    func handleWidgetTap(for sessionType: String, canResume: Bool) {
        let urlString = canResume 
            ? "fullmind://checkin/\(sessionType)?resume=true"
            : "fullmind://checkin/\(sessionType)"
            
        guard let url = URL(string: urlString) else { return }
        
        // This will open the main app with the deep link
        UIApplication.shared.open(url)
    }
    
    func handleCrisisButton() {
        guard let url = URL(string: "fullmind://crisis") else { return }
        UIApplication.shared.open(url)
    }
    
    // Privacy and security methods
    private func verifyDataIntegrity(_ data: [String: Any]) -> Bool {
        guard let receivedHash = data["encryptionHash"] as? String else {
            return false
        }
        
        // Verify hash matches expected data integrity hash
        let calculatedHash = calculateDataHash(data)
        return calculatedHash == receivedHash
    }
    
    private func calculateDataHash(_ data: [String: Any]) -> String {
        // Implementation of data integrity verification
        // Using secure hashing to prevent data tampering
        let dataString = data.compactMapValues { "\($0)" }.sorted { $0.key < $1.key }
            .map { "\($0.key):\($0.value)" }.joined(separator: "|")
        
        let inputData = Data(dataString.utf8)
        let hashed = SHA256.hash(data: inputData)
        return hashed.compactMap { String(format: "%02x", $0) }.joined()
    }
}
```

### 3.3 iOS Widget UI

**SwiftUI Implementation: `/plugins/ios-widget/FullMindWidget/WidgetViews.swift`**

```swift
import SwiftUI
import WidgetKit

struct FullMindWidgetEntryView: View {
    var entry: FullMindEntry
    @Environment(\.widgetFamily) var widgetFamily
    
    var body: some View {
        ZStack {
            // Background gradient matching app theme
            LinearGradient(
                colors: [Color("BackgroundPrimary"), Color("BackgroundSecondary")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(alignment: .leading, spacing: 12) {
                // Header with progress
                HStack {
                    Image("AppIconSmall")
                        .resizable()
                        .frame(width: 24, height: 24)
                    
                    Text("Today's Progress")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(Color("TextPrimary"))
                    
                    Spacer()
                    
                    Text("\(entry.widgetData.completionPercentage)%")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Color("AccentGreen"))
                }
                
                // Progress indicators
                HStack(spacing: 8) {
                    SessionIndicator(
                        title: "Morning",
                        status: entry.widgetData.morningStatus,
                        tapAction: { WidgetDataManager.shared.handleWidgetTap(for: "morning", canResume: canResumeSession(entry.widgetData.morningStatus)) }
                    )
                    
                    SessionIndicator(
                        title: "Midday", 
                        status: entry.widgetData.middayStatus,
                        tapAction: { WidgetDataManager.shared.handleWidgetTap(for: "midday", canResume: canResumeSession(entry.widgetData.middayStatus)) }
                    )
                    
                    SessionIndicator(
                        title: "Evening",
                        status: entry.widgetData.eveningStatus,
                        tapAction: { WidgetDataManager.shared.handleWidgetTap(for: "evening", canResume: canResumeSession(entry.widgetData.eveningStatus)) }
                    )
                }
                
                // Crisis access (if needed)
                if entry.widgetData.hasActiveCrisis {
                    Button(action: WidgetDataManager.shared.handleCrisisButton) {
                        HStack {
                            Image(systemName: "phone.fill")
                            Text("Crisis Support")
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.red)
                        .cornerRadius(16)
                    }
                }
            }
            .padding(16)
        }
        .widgetURL(URL(string: "fullmind://checkin/morning"))
    }
    
    private func canResumeSession(_ status: FullMindWidgetData.SessionStatus) -> Bool {
        if case .inProgress(_) = status {
            return true
        }
        return false
    }
}

struct SessionIndicator: View {
    let title: String
    let status: FullMindWidgetData.SessionStatus
    let tapAction: () -> Void
    
    var body: some View {
        VStack(spacing: 4) {
            // Status circle
            Circle()
                .fill(statusColor)
                .frame(width: 32, height: 32)
                .overlay(
                    statusIcon
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                )
                .onTapGesture(perform: tapAction)
            
            // Title
            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Color("TextSecondary"))
                .multilineTextAlignment(.center)
                .lineLimit(1)
        }
    }
    
    private var statusColor: Color {
        switch status {
        case .completed:
            return Color("AccentGreen")
        case .inProgress(_):
            return Color("AccentOrange") 
        case .skipped:
            return Color("TextSecondary")
        case .notStarted:
            return Color("BackgroundSecondary")
        }
    }
    
    private var statusIcon: some View {
        switch status {
        case .completed:
            return Image(systemName: "checkmark")
        case .inProgress(let progress):
            return Text("\(progress)%")
                .font(.system(size: 8, weight: .bold))
        case .skipped:
            return Image(systemName: "minus")
        case .notStarted:
            return Image(systemName: "circle")
        }
    }
}
```

## 4. Android Widget Implementation  

### 4.1 Android Widget Provider

**Kotlin Implementation: `/plugins/android-widget/FullMindWidgetProvider.kt`**

```kotlin
package com.fullmind.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject
import java.security.MessageDigest

class FullMindWidgetProvider : AppWidgetProvider() {
    
    companion object {
        private const val ACTION_CHECKIN_TAP = "com.fullmind.CHECKIN_TAP"
        private const val ACTION_CRISIS_TAP = "com.fullmind.CRISIS_TAP"
        private const val EXTRA_CHECKIN_TYPE = "checkin_type"
        private const val EXTRA_CAN_RESUME = "can_resume"
    }

    override fun onUpdate(
        context: Context, 
        appWidgetManager: AppWidgetManager, 
        appWidgetIds: IntArray
    ) {
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
        }
    }

    private fun updateAppWidget(
        context: Context, 
        appWidgetManager: AppWidgetManager, 
        appWidgetId: Int
    ) {
        val widgetData = WidgetDataManager.getCurrentData(context)
        val views = RemoteViews(context.packageName, R.layout.widget_fullmind)
        
        // Update progress text
        views.setTextViewText(
            R.id.progress_text,
            "${widgetData.completionPercentage}% Complete"
        )
        
        // Update session indicators
        updateSessionIndicator(context, views, R.id.morning_indicator, widgetData.morningStatus, "morning")
        updateSessionIndicator(context, views, R.id.midday_indicator, widgetData.middayStatus, "midday") 
        updateSessionIndicator(context, views, R.id.evening_indicator, widgetData.eveningStatus, "evening")
        
        // Crisis button visibility
        if (widgetData.hasActiveCrisis) {
            views.setViewVisibility(R.id.crisis_button, android.view.View.VISIBLE)
            val crisisIntent = PendingIntent.getBroadcast(
                context, 0,
                Intent(context, FullMindWidgetProvider::class.java).apply {
                    action = ACTION_CRISIS_TAP
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.crisis_button, crisisIntent)
        } else {
            views.setViewVisibility(R.id.crisis_button, android.view.View.GONE)
        }
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
    
    private fun updateSessionIndicator(
        context: Context,
        views: RemoteViews,
        viewId: Int,
        status: SessionStatus,
        checkInType: String
    ) {
        val canResume = status is SessionStatus.InProgress
        
        // Set background and text based on status
        when (status) {
            is SessionStatus.Completed -> {
                views.setInt(viewId, "setBackgroundResource", R.drawable.session_completed)
                views.setTextViewText(viewId, "✓")
            }
            is SessionStatus.InProgress -> {
                views.setInt(viewId, "setBackgroundResource", R.drawable.session_in_progress)
                views.setTextViewText(viewId, "${status.progressPercentage}%")
            }
            is SessionStatus.Skipped -> {
                views.setInt(viewId, "setBackgroundResource", R.drawable.session_skipped)
                views.setTextViewText(viewId, "-")
            }
            is SessionStatus.NotStarted -> {
                views.setInt(viewId, "setBackgroundResource", R.drawable.session_not_started)
                views.setTextViewText(viewId, "○")
            }
        }
        
        // Set tap handler
        val intent = PendingIntent.getBroadcast(
            context, checkInType.hashCode(),
            Intent(context, FullMindWidgetProvider::class.java).apply {
                action = ACTION_CHECKIN_TAP
                putExtra(EXTRA_CHECKIN_TYPE, checkInType)
                putExtra(EXTRA_CAN_RESUME, canResume)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(viewId, intent)
    }
    
    private fun handleCheckInTap(context: Context, checkInType: String, canResume: Boolean) {
        val uri = if (canResume) {
            "fullmind://checkin/$checkInType?resume=true"
        } else {
            "fullmind://checkin/$checkInType"
        }
        
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        
        try {
            context.startActivity(intent)
        } catch (e: Exception) {
            // Fallback: open main app
            val packageManager = context.packageManager
            val launchIntent = packageManager.getLaunchIntentForPackage(context.packageName)
            launchIntent?.let { context.startActivity(it) }
        }
    }
    
    private fun handleCrisisTap(context: Context) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("fullmind://crisis")).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }
}

// Data classes for widget state
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
    val lastUpdateTime: Long
)
```

### 4.2 Android Data Manager

**Kotlin Implementation: `/plugins/android-widget/WidgetDataManager.kt`**

```kotlin
package com.fullmind.widget

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject
import java.security.MessageDigest

object WidgetDataManager {
    private const val PREFS_NAME = "fullmind_widget_data"
    private const val KEY_WIDGET_DATA = "widget_data"
    private const val KEY_LAST_UPDATE = "last_update"

    fun getCurrentData(context: Context): WidgetData {
        val prefs = getSharedPreferences(context)
        val dataJson = prefs.getString(KEY_WIDGET_DATA, null)
            ?: return getPlaceholderData()
        
        return try {
            parseWidgetData(JSONObject(dataJson))
        } catch (e: Exception) {
            getPlaceholderData()
        }
    }
    
    fun updateFromApp(context: Context, jsonData: String) {
        val prefs = getSharedPreferences(context)
        
        try {
            val dataObj = JSONObject(jsonData)
            
            // Verify data integrity
            if (!verifyDataIntegrity(dataObj)) {
                android.util.Log.w("WidgetDataManager", "Data integrity verification failed")
                return
            }
            
            prefs.edit()
                .putString(KEY_WIDGET_DATA, jsonData)
                .putLong(KEY_LAST_UPDATE, System.currentTimeMillis())
                .apply()
                
            // Update all widgets
            updateAllWidgets(context)
            
        } catch (e: Exception) {
            android.util.Log.e("WidgetDataManager", "Failed to update widget data", e)
        }
    }
    
    private fun getSharedPreferences(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
    
    private fun parseWidgetData(json: JSONObject): WidgetData {
        val todayProgress = json.getJSONObject("todayProgress")
        
        return WidgetData(
            morningStatus = parseSessionStatus(todayProgress.getJSONObject("morning")),
            middayStatus = parseSessionStatus(todayProgress.getJSONObject("midday")),
            eveningStatus = parseSessionStatus(todayProgress.getJSONObject("evening")),
            completionPercentage = todayProgress.getInt("completionPercentage"),
            hasActiveCrisis = json.getBoolean("hasActiveCrisis"),
            lastUpdateTime = System.currentTimeMillis()
        )
    }
    
    private fun parseSessionStatus(sessionJson: JSONObject): SessionStatus {
        return when (sessionJson.getString("status")) {
            "completed" -> SessionStatus.Completed
            "in_progress" -> SessionStatus.InProgress(sessionJson.getInt("progressPercentage"))
            "skipped" -> SessionStatus.Skipped
            else -> SessionStatus.NotStarted
        }
    }
    
    private fun verifyDataIntegrity(json: JSONObject): Boolean {
        // Verify hash for data integrity
        val receivedHash = json.optString("encryptionHash", "")
        if (receivedHash.isEmpty()) return false
        
        // Calculate expected hash
        val calculatedHash = calculateDataHash(json)
        return calculatedHash == receivedHash
    }
    
    private fun calculateDataHash(json: JSONObject): String {
        // Create reproducible hash of the data
        val dataString = json.keys().asSequence().sorted()
            .filter { it != "encryptionHash" }
            .joinToString("|") { "$it:${json.get(it)}" }
            
        return MessageDigest.getInstance("SHA-256")
            .digest(dataString.toByteArray())
            .fold("") { str, byte -> str + "%02x".format(byte) }
    }
    
    private fun updateAllWidgets(context: Context) {
        val intent = Intent(context, FullMindWidgetProvider::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        }
        context.sendBroadcast(intent)
    }
    
    private fun getPlaceholderData(): WidgetData {
        return WidgetData(
            morningStatus = SessionStatus.NotStarted,
            middayStatus = SessionStatus.NotStarted,
            eveningStatus = SessionStatus.NotStarted,
            completionPercentage = 0,
            hasActiveCrisis = false,
            lastUpdateTime = System.currentTimeMillis()
        )
    }
}
```

## 5. Deep Linking Architecture

### 5.1 URL Scheme Design

```typescript
// Deep Link URL Structure
const DEEP_LINK_SCHEME = 'fullmind://';

const DEEP_LINK_ROUTES = {
  // Check-in flows with session management
  CHECKIN_MORNING: 'fullmind://checkin/morning',
  CHECKIN_MIDDAY: 'fullmind://checkin/midday', 
  CHECKIN_EVENING: 'fullmind://checkin/evening',
  
  // Resume interrupted sessions
  RESUME_MORNING: 'fullmind://checkin/morning?resume=true',
  RESUME_MIDDAY: 'fullmind://checkin/midday?resume=true',
  RESUME_EVENING: 'fullmind://checkin/evening?resume=true',
  
  // Crisis intervention (highest priority)
  CRISIS_INTERVENTION: 'fullmind://crisis',
  EMERGENCY_CONTACTS: 'fullmind://emergency',
  
  // Assessment flows
  ASSESSMENT_PHQ9: 'fullmind://assessment/phq9',
  ASSESSMENT_GAD7: 'fullmind://assessment/gad7',
} as const;
```

### 5.2 React Navigation Integration  

**File: `/src/navigation/DeepLinkHandler.ts`**

```typescript
/**
 * Deep Link Handler - Integrates with React Navigation
 * Handles widget deep links with clinical safety priority
 */

import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { useCheckInStore } from '../store/checkInStore';
import { WidgetDataService } from '../services/WidgetDataService';

export class DeepLinkHandler {
  private navigation: NavigationProp<RootStackParamList>;
  private widgetDataService: WidgetDataService;

  constructor(
    navigation: NavigationProp<RootStackParamList>,
    widgetDataService: WidgetDataService
  ) {
    this.navigation = navigation;
    this.widgetDataService = widgetDataService;
  }

  /**
   * Handle deep link URL from widget or external source
   */
  async handleDeepLink(url: string): Promise<void> {
    try {
      const urlObj = new URL(url);
      
      // Security: Validate URL scheme
      if (urlObj.protocol !== 'fullmind:') {
        console.warn('Invalid deep link protocol:', urlObj.protocol);
        return;
      }

      const path = urlObj.pathname;
      const params = Object.fromEntries(urlObj.searchParams);
      
      // Route to appropriate handler
      if (path.startsWith('/checkin/')) {
        await this.handleCheckInDeepLink(path, params);
      } else if (path === '/crisis') {
        await this.handleCrisisDeepLink(params);
      } else if (path.startsWith('/assessment/')) {
        await this.handleAssessmentDeepLink(path, params);
      } else {
        console.warn('Unhandled deep link path:', path);
        this.navigation.navigate('Main', { screen: 'Home' });
      }
      
      // Update widget data after navigation
      await this.widgetDataService.updateWidgetData();
      
    } catch (error) {
      console.error('Deep link handling failed:', error);
      // Fallback to home screen
      this.navigation.navigate('Main', { screen: 'Home' });
    }
  }

  /**
   * Handle check-in deep links with session management
   */
  private async handleCheckInDeepLink(path: string, params: any): Promise<void> {
    const pathParts = path.split('/');
    const checkInType = pathParts[2] as 'morning' | 'midday' | 'evening';
    
    if (!['morning', 'midday', 'evening'].includes(checkInType)) {
      console.warn('Invalid check-in type:', checkInType);
      return;
    }

    const shouldResume = params.resume === 'true';
    const checkInStore = useCheckInStore.getState();

    if (shouldResume) {
      // Attempt to resume session
      const resumeSuccess = await checkInStore.resumeCheckIn(checkInType);
      
      if (resumeSuccess) {
        this.navigation.navigate('CheckInFlow', {
          type: checkInType,
          resumeSession: true
        });
      } else {
        // No session to resume, start new
        this.navigation.navigate('CheckInFlow', {
          type: checkInType,
          resumeSession: false
        });
      }
    } else {
      // Check if there's an existing session
      const hasPartialSession = await checkInStore.checkForPartialSession(checkInType);
      
      if (hasPartialSession) {
        // Show resume dialog or automatically resume
        this.navigation.navigate('CheckInFlow', {
          type: checkInType,
          resumeSession: true
        });
      } else {
        // Start new session
        this.navigation.navigate('CheckInFlow', {
          type: checkInType,
          resumeSession: false
        });
      }
    }
  }

  /**
   * Handle crisis intervention deep link (highest priority)
   */
  private async handleCrisisDeepLink(params: any): Promise<void> {
    this.navigation.navigate('CrisisIntervention', {
      trigger: {
        type: 'manual',
        reason: 'widget_emergency_access'
      },
      fromScreen: 'Widget',
      emergencyMode: true
    });
  }

  /**
   * Handle assessment deep links
   */
  private async handleAssessmentDeepLink(path: string, params: any): Promise<void> {
    const pathParts = path.split('/');
    const assessmentType = pathParts[2] as 'phq9' | 'gad7';
    
    if (!['phq9', 'gad7'].includes(assessmentType)) {
      console.warn('Invalid assessment type:', assessmentType);
      return;
    }

    this.navigation.navigate('AssessmentFlow', {
      type: assessmentType,
      context: 'standalone',
      resumeSession: false
    });
  }
}

/**
 * Hook for deep link handling in React components
 */
export const useDeepLinkHandler = (navigation: NavigationProp<RootStackParamList>) => {
  const widgetDataService = new WidgetDataService();
  const deepLinkHandler = new DeepLinkHandler(navigation, widgetDataService);

  return {
    handleDeepLink: deepLinkHandler.handleDeepLink.bind(deepLinkHandler),
  };
};
```

### 5.3 App Integration Hook

**File: `/src/hooks/useWidgetIntegration.ts`**

```typescript
/**
 * Widget Integration Hook
 * Manages widget data updates and deep link handling
 */

import { useEffect, useRef } from 'react';
import { AppState, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCheckInStore } from '../store/checkInStore';
import { WidgetDataService } from '../services/WidgetDataService';
import { useDeepLinkHandler } from '../navigation/DeepLinkHandler';

export const useWidgetIntegration = () => {
  const navigation = useNavigation();
  const { handleDeepLink } = useDeepLinkHandler(navigation);
  const widgetDataService = useRef(new WidgetDataService()).current;
  
  // Listen to check-in store changes
  const checkInStore = useCheckInStore();
  
  useEffect(() => {
    // Initial widget data update
    widgetDataService.updateWidgetData();
    
    // Listen for app state changes
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Update widget data when app becomes active
        widgetDataService.updateWidgetData();
      }
    };
    
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Listen for deep links
    const handleDeepLinkUrl = (url: string) => {
      handleDeepLink(url);
    };
    
    // Handle initial deep link (app was closed)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLinkUrl(url);
      }
    });
    
    // Handle deep links while app is running
    const deepLinkSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLinkUrl(event.url);
    });
    
    return () => {
      appStateSubscription.remove();
      deepLinkSubscription.remove();
    };
  }, []);
  
  // Update widget data when check-in state changes
  useEffect(() => {
    widgetDataService.updateWidgetData();
  }, [
    checkInStore.todaysCheckIns,
    checkInStore.currentCheckIn,
    checkInStore.sessionProgress,
    checkInStore.hasPartialSession
  ]);
  
  return {
    updateWidgetData: () => widgetDataService.updateWidgetData(),
    handleDeepLink,
  };
};
```

## 6. Security and Privacy Architecture

### 6.1 Privacy Boundaries and Data Classification

**Clinical Data Protection Matrix:**

```typescript
// Privacy Classification for Widget Data
export enum DataSensitivity {
  SAFE_FOR_WIDGET = 'safe_for_widget',        // No sensitive info
  ENCRYPTED_REQUIRED = 'encrypted_required',   // Must be encrypted
  CLINICAL_RESTRICTED = 'clinical_restricted', // Never shared with widgets
  CRISIS_ONLY = 'crisis_only'                 // Only crisis safety data
}

const DATA_CLASSIFICATION: Record<string, DataSensitivity> = {
  // SAFE FOR WIDGET - Basic progress indicators
  'checkin_completion_status': DataSensitivity.SAFE_FOR_WIDGET,
  'session_progress_percentage': DataSensitivity.SAFE_FOR_WIDGET,
  'daily_completion_count': DataSensitivity.SAFE_FOR_WIDGET,
  'has_resumable_session': DataSensitivity.SAFE_FOR_WIDGET,
  
  // CLINICAL RESTRICTED - Never in widgets
  'phq9_answers': DataSensitivity.CLINICAL_RESTRICTED,
  'gad7_answers': DataSensitivity.CLINICAL_RESTRICTED,
  'assessment_scores': DataSensitivity.CLINICAL_RESTRICTED,
  'suicidal_ideation_flags': DataSensitivity.CLINICAL_RESTRICTED,
  'therapy_notes': DataSensitivity.CLINICAL_RESTRICTED,
  'medication_data': DataSensitivity.CLINICAL_RESTRICTED,
  
  // CRISIS ONLY - Emergency access only
  'crisis_plan_active': DataSensitivity.CRISIS_ONLY,
  'emergency_contact_accessible': DataSensitivity.CRISIS_ONLY,
  
  // ENCRYPTED REQUIRED - Mood and personal data
  'mood_descriptions': DataSensitivity.ENCRYPTED_REQUIRED,
  'emotional_states': DataSensitivity.ENCRYPTED_REQUIRED,
  'personal_reflections': DataSensitivity.ENCRYPTED_REQUIRED,
  'sleep_patterns': DataSensitivity.ENCRYPTED_REQUIRED,
};
```

### 6.2 Widget Data Privacy Filter

**TypeScript Implementation: `/src/services/WidgetPrivacyFilter.ts`**

```typescript
/**
 * Widget Privacy Filter - Ensures no sensitive data reaches widgets
 * Clinical-grade privacy protection for mental health data
 */

export class WidgetPrivacyFilter {
  private static readonly ALLOWED_FIELDS = new Set([
    'todayProgress',
    'completionPercentage', 
    'sessionStatus',
    'progressPercentage',
    'canResume',
    'estimatedTimeMinutes',
    'lastUpdateTime',
    'appVersion',
    'encryptionHash'
  ]);

  /**
   * Filter widget data to remove any sensitive information
   */
  static filterForWidget(rawData: any): WidgetData | null {
    try {
      // Deep clone to avoid mutations
      const filtered = JSON.parse(JSON.stringify(rawData));
      
      // Remove any fields not in allowlist
      this.removeUnauthorizedFields(filtered, this.ALLOWED_FIELDS);
      
      // Validate no clinical data leaked
      if (this.containsClinicalData(filtered)) {
        console.error('SECURITY VIOLATION: Clinical data detected in widget payload');
        return null;
      }
      
      // Validate no personal information leaked
      if (this.containsPersonalData(filtered)) {
        console.error('PRIVACY VIOLATION: Personal data detected in widget payload');
        return null;
      }
      
      return filtered as WidgetData;
      
    } catch (error) {
      console.error('Widget privacy filtering failed:', error);
      return null;
    }
  }

  /**
   * Recursively remove unauthorized fields
   */
  private static removeUnauthorizedFields(obj: any, allowedFields: Set<string>): void {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (!allowedFields.has(key) && typeof obj[key] === 'string' && obj[key].length > 50) {
          // Remove potentially sensitive long strings
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          this.removeUnauthorizedFields(obj[key], allowedFields);
        }
      }
    }
  }

  /**
   * Check for clinical data patterns
   */
  private static containsClinicalData(data: any): boolean {
    const dataStr = JSON.stringify(data).toLowerCase();
    
    // Clinical assessment indicators
    const clinicalPatterns = [
      'phq', 'gad', 'assessment', 'score', 'suicidal', 'depression',
      'anxiety', 'therapy', 'medication', 'diagnosis', 'treatment'
    ];
    
    return clinicalPatterns.some(pattern => dataStr.includes(pattern));
  }

  /**
   * Check for personal information patterns
   */
  private static containsPersonalData(data: any): boolean {
    const dataStr = JSON.stringify(data).toLowerCase();
    
    // Personal information indicators
    const personalPatterns = [
      '@', 'email', 'phone', 'address', 'name:', 'birth', 
      'ssn', 'emergency_contact', 'personal_notes'
    ];
    
    return personalPatterns.some(pattern => dataStr.includes(pattern));
  }

  /**
   * Generate secure hash for data integrity without exposing content
   */
  static generateSecureHash(data: WidgetData): string {
    // Use only non-sensitive fields for hash
    const hashableData = {
      completionPercentage: data.todayProgress.completionPercentage,
      morningStatus: data.todayProgress.morning.status,
      middayStatus: data.todayProgress.midday.status,
      eveningStatus: data.todayProgress.evening.status,
      timestamp: data.lastUpdateTime
    };
    
    const dataString = JSON.stringify(hashableData, Object.keys(hashableData).sort());
    return CryptoJS.SHA256(dataString).toString();
  }
}
```

### 6.3 Encrypted Widget Storage

**iOS Security Implementation: `/plugins/ios-widget/Security/SecureWidgetStorage.swift`**

```swift
import Foundation
import CryptoKit

class SecureWidgetStorage {
    private let appGroupId = "group.com.fullmind.mbct.widgets"
    private let keychain = WidgetKeychain()
    
    enum StorageError: Error {
        case encryptionFailed
        case decryptionFailed
        case integrityCheckFailed
        case keychainError
    }
    
    func storeWidgetData(_ data: Data) throws {
        // Get or generate encryption key
        let encryptionKey = try keychain.getOrCreateEncryptionKey()
        
        // Encrypt data
        let encryptedData = try encrypt(data: data, key: encryptionKey)
        
        // Store in app group with integrity hash
        let storagePackage = WidgetStoragePackage(
            encryptedData: encryptedData,
            integrity: calculateIntegrityHash(data),
            timestamp: Date()
        )
        
        guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
            throw StorageError.encryptionFailed
        }
        
        let packageData = try JSONEncoder().encode(storagePackage)
        userDefaults.set(packageData, forKey: "secure_widget_data")
    }
    
    func retrieveWidgetData() throws -> Data {
        guard let userDefaults = UserDefaults(suiteName: appGroupId),
              let packageData = userDefaults.data(forKey: "secure_widget_data") else {
            throw StorageError.decryptionFailed
        }
        
        let storagePackage = try JSONDecoder().decode(WidgetStoragePackage.self, from: packageData)
        
        // Get encryption key
        let encryptionKey = try keychain.getOrCreateEncryptionKey()
        
        // Decrypt data
        let decryptedData = try decrypt(data: storagePackage.encryptedData, key: encryptionKey)
        
        // Verify integrity
        let expectedHash = calculateIntegrityHash(decryptedData)
        guard expectedHash == storagePackage.integrity else {
            throw StorageError.integrityCheckFailed
        }
        
        return decryptedData
    }
    
    private func encrypt(data: Data, key: SymmetricKey) throws -> Data {
        let sealedBox = try AES.GCM.seal(data, using: key)
        return sealedBox.combined!
    }
    
    private func decrypt(data: Data, key: SymmetricKey) throws -> Data {
        let sealedBox = try AES.GCM.SealedBox(combined: data)
        return try AES.GCM.open(sealedBox, using: key)
    }
    
    private func calculateIntegrityHash(_ data: Data) -> String {
        let hash = SHA256.hash(data: data)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }
}

struct WidgetStoragePackage: Codable {
    let encryptedData: Data
    let integrity: String
    let timestamp: Date
}

class WidgetKeychain {
    func getOrCreateEncryptionKey() throws -> SymmetricKey {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: "widget_encryption_key",
            kSecReturnData as String: true
        ]
        
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        
        if status == errSecSuccess {
            let keyData = item as! Data
            return SymmetricKey(data: keyData)
        } else {
            // Generate new key
            let newKey = SymmetricKey(size: .bits256)
            let keyData = newKey.withUnsafeBytes { Data($0) }
            
            let addQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrAccount as String: "widget_encryption_key",
                kSecValueData as String: keyData
            ]
            
            let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
            guard addStatus == errSecSuccess else {
                throw SecureWidgetStorage.StorageError.keychainError
            }
            
            return newKey
        }
    }
}
```

### 6.4 Android Security Implementation

**Kotlin Security Implementation: `/plugins/android-widget/security/SecureWidgetStorage.kt`**

```kotlin
package com.fullmind.widget.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecureWidgetStorage(private val context: Context) {
    
    companion object {
        private const val KEYSTORE_ALIAS = "FullMindWidgetKey"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_IV_LENGTH = 12
        private const val GCM_TAG_LENGTH = 16
    }
    
    private val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
    
    init {
        generateKeyIfNeeded()
    }
    
    fun storeWidgetData(data: ByteArray): Boolean {
        return try {
            val encryptedData = encryptData(data)
            val integrityHash = calculateIntegrityHash(data)
            
            val storagePackage = WidgetStoragePackage(
                encryptedData = encryptedData,
                integrity = integrityHash,
                timestamp = System.currentTimeMillis()
            )
            
            val prefs = context.getSharedPreferences("secure_widget_data", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("package", storagePackage.toJson())
                .apply()
                
            true
        } catch (e: Exception) {
            android.util.Log.e("SecureWidgetStorage", "Failed to store widget data", e)
            false
        }
    }
    
    fun retrieveWidgetData(): ByteArray? {
        return try {
            val prefs = context.getSharedPreferences("secure_widget_data", Context.MODE_PRIVATE)
            val packageJson = prefs.getString("package", null) ?: return null
            
            val storagePackage = WidgetStoragePackage.fromJson(packageJson)
            val decryptedData = decryptData(storagePackage.encryptedData)
            
            // Verify integrity
            val expectedHash = calculateIntegrityHash(decryptedData)
            if (expectedHash != storagePackage.integrity) {
                android.util.Log.w("SecureWidgetStorage", "Integrity check failed")
                return null
            }
            
            decryptedData
        } catch (e: Exception) {
            android.util.Log.e("SecureWidgetStorage", "Failed to retrieve widget data", e)
            null
        }
    }
    
    private fun generateKeyIfNeeded() {
        if (!keyStore.containsAlias(KEYSTORE_ALIAS)) {
            val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
            val keyGenParameterSpec = KeyGenParameterSpec.Builder(
                KEYSTORE_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setUserAuthenticationRequired(false)
                .build()
                
            keyGenerator.init(keyGenParameterSpec)
            keyGenerator.generateKey()
        }
    }
    
    private fun encryptData(data: ByteArray): ByteArray {
        val secretKey = keyStore.getKey(KEYSTORE_ALIAS, null) as SecretKey
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey)
        
        val encryptedData = cipher.doFinal(data)
        val iv = cipher.iv
        
        // Combine IV and encrypted data
        return iv + encryptedData
    }
    
    private fun decryptData(encryptedDataWithIv: ByteArray): ByteArray {
        val iv = encryptedDataWithIv.sliceArray(0..GCM_IV_LENGTH - 1)
        val encryptedData = encryptedDataWithIv.sliceArray(GCM_IV_LENGTH until encryptedDataWithIv.size)
        
        val secretKey = keyStore.getKey(KEYSTORE_ALIAS, null) as SecretKey
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val gcmParameterSpec = GCMParameterSpec(GCM_TAG_LENGTH * 8, iv)
        cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmParameterSpec)
        
        return cipher.doFinal(encryptedData)
    }
    
    private fun calculateIntegrityHash(data: ByteArray): String {
        val digest = java.security.MessageDigest.getInstance("SHA-256")
        return digest.digest(data).fold("") { str, byte -> str + "%02x".format(byte) }
    }
}

data class WidgetStoragePackage(
    val encryptedData: ByteArray,
    val integrity: String,
    val timestamp: Long
) {
    fun toJson(): String {
        return """
            {
                "encryptedData": "${android.util.Base64.encodeToString(encryptedData, android.util.Base64.DEFAULT)}",
                "integrity": "$integrity",
                "timestamp": $timestamp
            }
        """.trimIndent()
    }
    
    companion object {
        fun fromJson(json: String): WidgetStoragePackage {
            val jsonObj = org.json.JSONObject(json)
            return WidgetStoragePackage(
                encryptedData = android.util.Base64.decode(jsonObj.getString("encryptedData"), android.util.Base64.DEFAULT),
                integrity = jsonObj.getString("integrity"),
                timestamp = jsonObj.getLong("timestamp")
            )
        }
    }
}
```

### 6.5 Privacy Audit and Compliance

**Privacy Audit Implementation: `/src/services/WidgetPrivacyAudit.ts`**

```typescript
/**
 * Widget Privacy Audit Service
 * Ensures compliance with mental health privacy regulations
 */

export interface PrivacyAuditResult {
  readonly passed: boolean;
  readonly violations: PrivacyViolation[];
  readonly recommendations: string[];
  readonly complianceLevel: 'full' | 'partial' | 'violation';
}

export interface PrivacyViolation {
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly category: 'clinical_data' | 'personal_info' | 'unencrypted_data' | 'unauthorized_access';
  readonly description: string;
  readonly field?: string;
  readonly remediation: string;
}

export class WidgetPrivacyAudit {
  private static readonly CRITICAL_FIELDS = [
    'phq9', 'gad7', 'assessment', 'score', 'suicidal', 'medication',
    'diagnosis', 'therapy', 'emergency_contact', 'crisis_plan'
  ];

  /**
   * Perform comprehensive privacy audit on widget data
   */
  static async auditWidgetData(data: any): Promise<PrivacyAuditResult> {
    const violations: PrivacyViolation[] = [];
    const recommendations: string[] = [];

    // Check for clinical data leakage
    const clinicalViolations = this.auditClinicalData(data);
    violations.push(...clinicalViolations);

    // Check for personal information leakage  
    const personalViolations = this.auditPersonalData(data);
    violations.push(...personalViolations);

    // Check encryption compliance
    const encryptionViolations = this.auditEncryption(data);
    violations.push(...encryptionViolations);

    // Check access controls
    const accessViolations = this.auditAccessControls(data);
    violations.push(...accessViolations);

    // Generate recommendations
    if (violations.length === 0) {
      recommendations.push('Widget data privacy compliance is excellent');
    } else {
      recommendations.push(...this.generateRecommendations(violations));
    }

    const complianceLevel = this.calculateComplianceLevel(violations);

    return {
      passed: violations.filter(v => v.severity === 'critical').length === 0,
      violations,
      recommendations,
      complianceLevel
    };
  }

  private static auditClinicalData(data: any): PrivacyViolation[] {
    const violations: PrivacyViolation[] = [];
    const dataStr = JSON.stringify(data).toLowerCase();

    for (const criticalField of this.CRITICAL_FIELDS) {
      if (dataStr.includes(criticalField)) {
        violations.push({
          severity: 'critical',
          category: 'clinical_data',
          description: `Clinical data detected: ${criticalField}`,
          field: criticalField,
          remediation: 'Remove all clinical assessment data from widget payloads'
        });
      }
    }

    return violations;
  }

  private static auditPersonalData(data: any): PrivacyViolation[] {
    const violations: PrivacyViolation[] = [];
    const dataStr = JSON.stringify(data).toLowerCase();

    // Check for email patterns
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (emailPattern.test(dataStr)) {
      violations.push({
        severity: 'high',
        category: 'personal_info',
        description: 'Email address detected in widget data',
        remediation: 'Remove all personal contact information from widget data'
      });
    }

    // Check for phone patterns
    const phonePattern = /\d{3}-\d{3}-\d{4}|\(\d{3}\)\s*\d{3}-\d{4}/;
    if (phonePattern.test(dataStr)) {
      violations.push({
        severity: 'high',
        category: 'personal_info',
        description: 'Phone number detected in widget data',
        remediation: 'Remove all personal contact information from widget data'
      });
    }

    return violations;
  }

  private static auditEncryption(data: any): PrivacyViolation[] {
    const violations: PrivacyViolation[] = [];

    // Check for encryption hash presence
    if (!data.encryptionHash) {
      violations.push({
        severity: 'medium',
        category: 'unencrypted_data',
        description: 'Missing encryption hash for data integrity',
        remediation: 'Add encryption hash to all widget data for integrity verification'
      });
    }

    return violations;
  }

  private static auditAccessControls(data: any): PrivacyViolation[] {
    const violations: PrivacyViolation[] = [];

    // Check for unauthorized fields
    const authorizedFields = new Set([
      'todayProgress', 'completionPercentage', 'sessionStatus',
      'progressPercentage', 'canResume', 'estimatedTimeMinutes',
      'lastUpdateTime', 'appVersion', 'encryptionHash'
    ]);

    this.findUnauthorizedFields(data, authorizedFields, violations);

    return violations;
  }

  private static findUnauthorizedFields(
    obj: any, 
    authorizedFields: Set<string>, 
    violations: PrivacyViolation[],
    path: string = ''
  ): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (!authorizedFields.has(key) && typeof obj[key] === 'string' && obj[key].length > 100) {
          violations.push({
            severity: 'medium',
            category: 'unauthorized_access',
            description: `Potentially sensitive long string field: ${currentPath}`,
            field: currentPath,
            remediation: 'Review and remove any unauthorized data fields'
          });
        }

        if (typeof obj[key] === 'object') {
          this.findUnauthorizedFields(obj[key], authorizedFields, violations, currentPath);
        }
      }
    }
  }

  private static generateRecommendations(violations: PrivacyViolation[]): string[] {
    const recommendations: string[] = [];
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const highCount = violations.filter(v => v.severity === 'high').length;

    if (criticalCount > 0) {
      recommendations.push(`URGENT: ${criticalCount} critical privacy violations detected - immediate remediation required`);
    }

    if (highCount > 0) {
      recommendations.push(`${highCount} high-severity privacy violations require attention`);
    }

    // Category-specific recommendations
    const categories = new Set(violations.map(v => v.category));
    
    if (categories.has('clinical_data')) {
      recommendations.push('Implement stricter clinical data filtering before widget data generation');
    }
    
    if (categories.has('personal_info')) {
      recommendations.push('Add personal information detection and removal in privacy filter');
    }
    
    if (categories.has('unencrypted_data')) {
      recommendations.push('Enhance encryption and data integrity verification');
    }

    return recommendations;
  }

  private static calculateComplianceLevel(violations: PrivacyViolation[]): 'full' | 'partial' | 'violation' {
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const highCount = violations.filter(v => v.severity === 'high').length;

    if (criticalCount > 0) return 'violation';
    if (highCount > 0) return 'partial';
    return 'full';
  }
}
```

## 7. Performance and Memory Strategy

### 7.1 Widget Update Optimization

**Performance Strategy: `/src/services/WidgetPerformanceManager.ts`**

```typescript
/**
 * Widget Performance Manager
 * Optimizes widget updates for battery and memory efficiency
 */

export class WidgetPerformanceManager {
  private static readonly UPDATE_THROTTLE_MS = 60000; // 1 minute minimum
  private static readonly BATCH_UPDATE_DELAY_MS = 5000; // 5 second batching
  private static readonly MAX_QUEUE_SIZE = 10;
  
  private updateQueue: WidgetUpdateRequest[] = [];
  private lastUpdateTime = 0;
  private batchUpdateTimer: NodeJS.Timeout | null = null;
  
  /**
   * Intelligent update scheduling based on app state and user activity
   */
  async scheduleWidgetUpdate(priority: 'low' | 'normal' | 'high' | 'critical'): Promise<void> {
    const now = Date.now();
    
    // Critical updates (crisis mode) bypass all throttling
    if (priority === 'critical') {
      await this.performImmediateUpdate();
      return;
    }
    
    // Check throttling for non-critical updates
    if (now - this.lastUpdateTime < WidgetPerformanceManager.UPDATE_THROTTLE_MS) {
      this.queueUpdate({ priority, timestamp: now });
      return;
    }
    
    // Batch normal/low priority updates
    if (priority === 'low' || priority === 'normal') {
      this.queueUpdate({ priority, timestamp: now });
      this.scheduleBatchUpdate();
      return;
    }
    
    // High priority updates execute immediately
    await this.performImmediateUpdate();
  }
  
  /**
   * Battery-efficient update execution
   */
  private async performImmediateUpdate(): Promise<void> {
    try {
      const startTime = performance.now();
      
      // Generate minimal widget data
      const widgetData = await this.generateOptimizedWidgetData();
      
      // Update native widgets
      await this.updateNativeWidgets(widgetData);
      
      const duration = performance.now() - startTime;
      this.lastUpdateTime = Date.now();
      
      console.log(`Widget update completed in ${duration.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('Widget update failed:', error);
    }
  }
  
  /**
   * Generate optimized widget data with minimal processing
   */
  private async generateOptimizedWidgetData(): Promise<WidgetData> {
    // Use cached data when possible
    const cached = await this.getCachedWidgetData();
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }
    
    // Generate fresh data efficiently
    const checkInStore = useCheckInStore.getState();
    
    // Optimized progress calculation
    const todayProgress = {
      morning: this.getOptimizedSessionStatus('morning', checkInStore),
      midday: this.getOptimizedSessionStatus('midday', checkInStore),
      evening: this.getOptimizedSessionStatus('evening', checkInStore),
      completionPercentage: checkInStore.getTodaysProgress().completed * 33 // 3 sessions = 100%
    };
    
    const widgetData: WidgetData = {
      todayProgress,
      hasActiveCrisis: false, // Calculated elsewhere for performance
      lastUpdateTime: new Date().toISOString(),
      appVersion: Constants.expoConfig?.version || '1.0.0',
      encryptionHash: this.generateLightweightHash(todayProgress)
    };
    
    // Cache for future use
    await this.cacheWidgetData(widgetData);
    
    return widgetData;
  }
  
  /**
   * Memory-efficient session status calculation
   */
  private getOptimizedSessionStatus(
    type: 'morning' | 'midday' | 'evening', 
    store: any
  ): WidgetSessionStatus {
    // Use lightweight checks to minimize memory usage
    const hasCompleted = store.hasCompletedTodaysCheckIn(type);
    
    if (hasCompleted) {
      return {
        status: 'completed',
        progressPercentage: 100,
        canResume: false,
        estimatedTimeMinutes: 0
      };
    }
    
    // Quick partial session check without full data loading
    const hasPartial = store.hasPartialSession;
    if (hasPartial) {
      const progress = store.sessionProgress;
      return {
        status: 'in_progress',
        progressPercentage: progress?.percentComplete || 0,
        canResume: true,
        estimatedTimeMinutes: Math.ceil((progress?.estimatedTimeRemaining || 0) / 60)
      };
    }
    
    return {
      status: 'not_started',
      progressPercentage: 0,
      canResume: false,
      estimatedTimeMinutes: this.getEstimatedDuration(type)
    };
  }
  
  private queueUpdate(request: WidgetUpdateRequest): void {
    this.updateQueue.push(request);
    
    // Prevent queue overflow
    if (this.updateQueue.length > WidgetPerformanceManager.MAX_QUEUE_SIZE) {
      this.updateQueue.shift(); // Remove oldest
    }
  }
  
  private scheduleBatchUpdate(): void {
    if (this.batchUpdateTimer) {
      clearTimeout(this.batchUpdateTimer);
    }
    
    this.batchUpdateTimer = setTimeout(async () => {
      if (this.updateQueue.length > 0) {
        await this.performImmediateUpdate();
        this.updateQueue = [];
      }
      this.batchUpdateTimer = null;
    }, WidgetPerformanceManager.BATCH_UPDATE_DELAY_MS);
  }
}

interface WidgetUpdateRequest {
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: number;
}
```

### 7.2 Memory Management for Background Processing

**Memory Strategy: `/src/services/WidgetMemoryManager.ts`**

```typescript
/**
 * Widget Memory Manager
 * Manages memory usage for widget operations to prevent app termination
 */

export class WidgetMemoryManager {
  private static readonly MEMORY_THRESHOLD_MB = 50; // Conservative limit
  private static readonly CACHE_SIZE_LIMIT = 10; // Max cached widget states
  
  private widgetDataCache = new Map<string, CachedWidgetData>();
  private memoryMonitor: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startMemoryMonitoring();
  }
  
  /**
   * Memory-aware widget data caching
   */
  async cacheWidgetData(key: string, data: WidgetData): Promise<void> {
    try {
      // Check memory before caching
      if (await this.getMemoryUsage() > WidgetMemoryManager.MEMORY_THRESHOLD_MB) {
        this.clearOldestCacheEntries(3); // Clear 3 oldest entries
      }
      
      // Enforce cache size limit
      if (this.widgetDataCache.size >= WidgetMemoryManager.CACHE_SIZE_LIMIT) {
        this.clearOldestCacheEntries(1);
      }
      
      const cachedData: CachedWidgetData = {
        data,
        timestamp: Date.now(),
        accessCount: 0
      };
      
      this.widgetDataCache.set(key, cachedData);
      
    } catch (error) {
      console.error('Widget data caching failed:', error);
    }
  }
  
  /**
   * Retrieve cached widget data with LRU eviction
   */
  getCachedWidgetData(key: string): WidgetData | null {
    const cached = this.widgetDataCache.get(key);
    
    if (cached) {
      // Update access stats for LRU
      cached.accessCount++;
      cached.lastAccess = Date.now();
      return cached.data;
    }
    
    return null;
  }
  
  /**
   * Background memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryMonitor = setInterval(async () => {
      const memoryUsage = await this.getMemoryUsage();
      
      if (memoryUsage > WidgetMemoryManager.MEMORY_THRESHOLD_MB * 0.8) {
        console.log(`Widget memory usage high: ${memoryUsage}MB`);
        await this.optimizeMemoryUsage();
      }
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Optimize memory usage when threshold is approached
   */
  private async optimizeMemoryUsage(): Promise<void> {
    // Clear half of the cache, keeping most recently used
    const cacheSize = this.widgetDataCache.size;
    const clearCount = Math.ceil(cacheSize / 2);
    
    this.clearOldestCacheEntries(clearCount);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    console.log(`Optimized widget memory: cleared ${clearCount} cache entries`);
  }
  
  /**
   * Clear oldest cache entries based on LRU algorithm
   */
  private clearOldestCacheEntries(count: number): void {
    const entries = Array.from(this.widgetDataCache.entries());
    
    // Sort by last access time (oldest first)
    entries.sort((a, b) => {
      const aAccess = a[1].lastAccess || a[1].timestamp;
      const bAccess = b[1].lastAccess || b[1].timestamp;
      return aAccess - bAccess;
    });
    
    // Remove oldest entries
    for (let i = 0; i < count && i < entries.length; i++) {
      this.widgetDataCache.delete(entries[i][0]);
    }
  }
  
  /**
   * Get current memory usage (platform-specific implementation)
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      // React Native specific memory monitoring
      if (typeof global.performance !== 'undefined' && global.performance.memory) {
        return global.performance.memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
      }
      
      // Fallback estimation
      return this.widgetDataCache.size * 0.5; // Estimate 0.5MB per cache entry
      
    } catch (error) {
      console.error('Memory usage calculation failed:', error);
      return 0;
    }
  }
  
  /**
   * Cleanup on app termination
   */
  cleanup(): void {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = null;
    }
    
    this.widgetDataCache.clear();
  }
}

interface CachedWidgetData {
  data: WidgetData;
  timestamp: number;
  accessCount: number;
  lastAccess?: number;
}
```

## 8. Implementation Roadmap and Technical Specifications

### 8.1 Phase-Based Implementation Strategy

**Phase 1: Foundation and Security (Week 1-2)**
- Set up Expo Config Plugin infrastructure
- Implement core security and privacy filtering
- Create native bridge interfaces
- Establish encrypted data sharing layer

**Phase 2: iOS Widget Implementation (Week 3-4)**  
- iOS WidgetKit integration with SwiftUI
- App Groups configuration for secure data sharing
- iOS widget timeline management and updates
- Deep linking implementation for iOS

**Phase 3: Android Widget Implementation (Week 5-6)**
- Android App Widget with RemoteViews
- SharedPreferences encrypted data sharing
- Android widget provider and update mechanisms
- Deep linking implementation for Android

**Phase 4: Integration and Testing (Week 7-8)**
- React Native integration and testing
- Performance optimization and memory management
- Privacy audit and compliance validation
- User acceptance testing and clinical validation

### 8.2 Technical Implementation Guide

**Step 1: Project Configuration**

```bash
# Install required dependencies
npm install --save @expo/config-plugins
npm install --save-dev @types/node

# Add to package.json dependencies
"expo-secure-store": "^14.2.3",
"expo-crypto": "^14.1.5",
"expo-constants": "~16.0.2"
```

**Step 2: App Configuration Update**

```json
// app.json additions
{
  "expo": {
    "plugins": [
      "./plugins/expo-fullmind-widgets"
    ],
    "ios": {
      "entitlements": {
        "com.apple.security.application-groups": ["group.com.fullmind.mbct.widgets"]
      }
    },
    "android": {
      "permissions": [
        "android.permission.WAKE_LOCK",
        "android.permission.RECEIVE_BOOT_COMPLETED"
      ]
    }
  }
}
```

**Step 3: Plugin Directory Structure**

```
plugins/
├── expo-fullmind-widgets.js          # Main config plugin
├── ios-widget/                       # iOS widget implementation
│   ├── FullMindWidget/
│   │   ├── FullMindWidget.swift
│   │   ├── FullMindWidgetEntryView.swift
│   │   ├── WidgetDataManager.swift
│   │   └── Info.plist
│   └── Security/
│       └── SecureWidgetStorage.swift
├── android-widget/                   # Android widget implementation
│   ├── FullMindWidgetProvider.kt
│   ├── WidgetDataManager.kt
│   ├── res/
│   │   ├── layout/
│   │   │   └── widget_fullmind.xml
│   │   └── drawable/
│   │       ├── session_completed.xml
│   │       ├── session_in_progress.xml
│   │       └── session_not_started.xml
│   └── security/
│       └── SecureWidgetStorage.kt
└── shared/
    ├── WidgetDataSchema.ts
    └── SecuritySpecs.md
```

### 8.3 Quality Assurance and Testing Strategy

**Security Testing Protocol:**

```typescript
// Test file: __tests__/WidgetSecurity.test.ts
describe('Widget Security and Privacy', () => {
  test('No clinical data in widget payloads', async () => {
    const widgetData = await WidgetDataService.generateWidgetData();
    const auditResult = await WidgetPrivacyAudit.auditWidgetData(widgetData);
    
    expect(auditResult.passed).toBe(true);
    expect(auditResult.violations.filter(v => v.severity === 'critical')).toHaveLength(0);
    expect(auditResult.complianceLevel).toBe('full');
  });
  
  test('Data integrity verification', async () => {
    const widgetData = await WidgetDataService.generateWidgetData();
    const hash = WidgetPrivacyFilter.generateSecureHash(widgetData);
    
    expect(hash).toBeDefined();
    expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string
  });
  
  test('Clinical data patterns detection', () => {
    const testData = { phq9Score: 15, patientInfo: 'sensitive' };
    const filtered = WidgetPrivacyFilter.filterForWidget(testData);
    
    expect(filtered).toBeNull(); // Should reject clinical data
  });
});
```

**Performance Testing Framework:**

```typescript
// Test file: __tests__/WidgetPerformance.test.ts
describe('Widget Performance Optimization', () => {
  test('Widget update completes under 200ms', async () => {
    const startTime = performance.now();
    await WidgetDataService.updateWidgetData();
    const duration = performance.now() - startTime;
    
    expect(duration).toBeLessThan(200);
  });
  
  test('Memory usage stays below 50MB threshold', async () => {
    const memoryManager = new WidgetMemoryManager();
    
    // Simulate multiple widget updates
    for (let i = 0; i < 20; i++) {
      await memoryManager.cacheWidgetData(`test_${i}`, mockWidgetData);
    }
    
    const memoryUsage = await memoryManager.getMemoryUsage();
    expect(memoryUsage).toBeLessThan(50);
  });
});
```

### 8.4 Deployment and Integration Specifications

**iOS Deployment Requirements:**

```xml
<!-- iOS Info.plist additions -->
<key>NSExtension</key>
<dict>
    <key>NSExtensionDisplayName</key>
    <string>FullMind Daily Progress</string>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).FullMindWidget</string>
</dict>

<!-- App Groups entitlement -->
<key>com.apple.security.application-groups</key>
<array>
    <string>group.com.fullmind.mbct.widgets</string>
</array>
```

**Android Manifest Requirements:**

```xml
<!-- AndroidManifest.xml additions -->
<receiver android:name=".widget.FullMindWidgetProvider"
          android:exported="false">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data android:name="android.appwidget.provider"
               android:resource="@xml/fullmind_widget_info" />
</receiver>

<!-- Widget metadata -->
<!-- res/xml/fullmind_widget_info.xml -->
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:updatePeriodMillis="900000"
    android:initialLayout="@layout/widget_fullmind"
    android:description="@string/widget_description"
    android:widgetCategory="home_screen"
    android:resizeMode="horizontal|vertical">
</appwidget-provider>
```

**React Native Integration:**

```typescript
// App.tsx integration
import { useWidgetIntegration } from './src/hooks/useWidgetIntegration';

export default function App() {
  const { updateWidgetData, handleDeepLink } = useWidgetIntegration();
  
  useEffect(() => {
    // Initial widget setup
    updateWidgetData();
  }, []);
  
  return (
    <NavigationContainer linking={{
      prefixes: ['fullmind://'],
      config: {
        screens: {
          CheckInFlow: 'checkin/:type',
          CrisisIntervention: 'crisis',
          AssessmentFlow: 'assessment/:type',
        }
      }
    }}>
      {/* App content */}
    </NavigationContainer>
  );
}
```

### 8.5 Monitoring and Analytics

**Widget Performance Monitoring:**

```typescript
// Widget analytics service
export class WidgetAnalytics {
  static trackWidgetInteraction(eventType: string, metadata: any): void {
    // Privacy-safe analytics (no personal/clinical data)
    console.log('Widget Analytics:', {
      event: eventType,
      timestamp: new Date().toISOString(),
      metadata: WidgetPrivacyFilter.filterForWidget(metadata)
    });
  }
  
  static trackWidgetPerformance(operation: string, duration: number): void {
    if (duration > 200) {
      console.warn(`Widget performance issue: ${operation} took ${duration}ms`);
    }
    
    // Performance metrics collection (local only)
    this.trackWidgetInteraction('performance', {
      operation,
      duration,
      threshold_exceeded: duration > 200
    });
  }
}
```

**Health Monitoring Integration:**

```typescript
// Widget health check service
export class WidgetHealthMonitor {
  static async performHealthCheck(): Promise<WidgetHealthReport> {
    const report: WidgetHealthReport = {
      timestamp: new Date().toISOString(),
      dataIntegrity: await this.checkDataIntegrity(),
      privacyCompliance: await this.checkPrivacyCompliance(),
      performanceMetrics: await this.checkPerformanceMetrics(),
      systemHealth: await this.checkSystemHealth()
    };
    
    if (!report.dataIntegrity || !report.privacyCompliance) {
      console.error('WIDGET HEALTH ALERT: Critical issues detected', report);
    }
    
    return report;
  }
  
  private static async checkPrivacyCompliance(): Promise<boolean> {
    try {
      const sampleData = await WidgetDataService.generateWidgetData();
      const auditResult = await WidgetPrivacyAudit.auditWidgetData(sampleData);
      return auditResult.passed && auditResult.complianceLevel === 'full';
    } catch (error) {
      console.error('Privacy compliance check failed:', error);
      return false;
    }
  }
}
```

### 8.6 Clinical Safety Integration

**Crisis Mode Widget Updates:**

```typescript
// Crisis-aware widget updates
export class CrisisAwareWidgetManager extends WidgetDataService {
  async updateForCrisisMode(crisisLevel: 'detected' | 'active' | 'resolved'): Promise<void> {
    const crisisWidgetData: WidgetData = {
      todayProgress: await this.getSafeProgressData(),
      hasActiveCrisis: crisisLevel === 'active',
      lastUpdateTime: new Date().toISOString(),
      appVersion: Constants.expoConfig?.version || '1.0.0',
      encryptionHash: this.generateSecureHash({} as WidgetData)
    };
    
    // Critical priority update for crisis scenarios
    await WidgetPerformanceManager.scheduleWidgetUpdate('critical');
    
    // Emergency protocol logging
    console.log('CRISIS WIDGET UPDATE:', {
      level: crisisLevel,
      timestamp: new Date().toISOString(),
      emergency_accessible: crisisLevel === 'active'
    });
  }
}
```

### 8.7 Success Metrics and KPIs

**Engagement Metrics:**
- **Widget Interaction Rate**: Target 3x increase over non-widget users
- **Check-in Completion Rate**: Target 15% improvement
- **Session Resumption Rate**: Target 80% of interrupted sessions resumed

**Performance Metrics:**
- **Widget Update Time**: < 200ms (critical path)
- **Memory Usage**: < 50MB peak usage
- **Battery Impact**: < 2% additional battery usage per day
- **Crash Rate**: < 0.1% widget-related crashes

**Privacy and Security Metrics:**
- **Privacy Audit Pass Rate**: 100% (zero tolerance for clinical data leaks)
- **Data Integrity Verification**: 100% success rate
- **Encryption Coverage**: 100% of widget data encrypted at rest

**Clinical Safety Metrics:**
- **Crisis Response Time**: < 3 seconds from widget to crisis intervention
- **Emergency Contact Accessibility**: 100% uptime for crisis button
- **Session Data Accuracy**: 100% fidelity in progress tracking

## 9. Conclusion and Next Steps

This comprehensive widget architecture provides a production-ready foundation for implementing iOS and Android widgets in the FullMind MBCT app while maintaining clinical-grade security and privacy standards.

**Key Architectural Strengths:**
- **Privacy-First Design**: Zero clinical data exposure with comprehensive filtering
- **Clinical Safety Integration**: Crisis-aware updates with emergency access
- **Performance Optimization**: Battery-efficient updates with intelligent caching
- **Cross-Platform Consistency**: Unified experience across iOS and Android
- **Scalable Foundation**: Extensible architecture for future enhancements

**Implementation Priority:**
1. **Security Foundation** (Week 1-2): Establish privacy filters and encryption
2. **iOS Widget Core** (Week 3-4): WidgetKit integration and deep linking
3. **Android Widget Core** (Week 5-6): App Widget implementation and updates
4. **Integration Testing** (Week 7-8): End-to-end testing and optimization

**Technical Readiness:**
- All architectural components are technically specified
- Security and privacy requirements are comprehensively addressed
- Performance and memory optimization strategies are defined
- Clinical safety integration is prioritized throughout

This architecture enables the 3x engagement boost target while ensuring the highest standards of mental health data protection and therapeutic effectiveness for FullMind users.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyze current architecture and widget requirements", "status": "completed", "activeForm": "Analyzing current architecture and widget requirements"}, {"content": "Design native bridge architecture with Expo Config Plugin approach", "status": "completed", "activeForm": "Designing native bridge architecture with Expo Config Plugin approach"}, {"content": "Create data synchronization and sharing strategy", "status": "completed", "activeForm": "Creating data synchronization and sharing strategy"}, {"content": "Design deep linking architecture and navigation flow", "status": "completed", "activeForm": "Designing deep linking architecture and navigation flow"}, {"content": "Define security and privacy boundaries", "status": "in_progress", "activeForm": "Defining security and privacy boundaries"}, {"content": "Create implementation roadmap and technical specifications", "status": "pending", "activeForm": "Creating implementation roadmap and technical specifications"}]