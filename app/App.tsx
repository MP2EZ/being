/**
 * Being. App Entry Point
 * Evidence-based mindfulness and cognitive therapy for mental wellness
 */

import React, { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CleanRootNavigator from './src/core/navigation/CleanRootNavigator';
import { IAPService } from './src/core/services/subscription/IAPService';
import { useSubscriptionStore } from './src/core/stores/subscriptionStore';
import EncryptionService from './src/core/services/security/EncryptionService';
import { useSettingsStore } from './src/core/stores/settingsStore';
import { initializeExternalReporting, logSystem, logError, LogCategory } from './src/core/services/logging';
import { DataRetentionService } from './src/core/services/data-retention';
import { PostHogProvider } from './src/core/analytics';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    async function initializeApp() {
      try {
        logSystem('App initialization started');

        logSystem('Initializing encryption service');
        await EncryptionService.initialize();
        logSystem('Encryption service initialized');

        // Initialize external error reporting (Sentry) - INFRA-61
        // Only active in production when EXPO_PUBLIC_SENTRY_DSN is set
        await initializeExternalReporting();

        logSystem('Initializing subscription system');
        await useSubscriptionStore.getState().loadSubscription();

        if (IAPService.isAvailable()) {
          await IAPService.initialize();
          logSystem('IAP service initialized');
        } else {
          logSystem('IAP not available on this platform');
        }

        // MAINT-123: data retention is safe to call on every launch (max once/day internally)
        logSystem('Running data retention cleanup');
        const cleanupResult = await DataRetentionService.runRetentionCleanup();
        logSystem(
          `Data retention cleanup complete: ${cleanupResult.totalRecordsDeleted} records deleted`
        );

        setIsInitialized(true);
        logSystem('App initialization complete');
      } catch (error) {
        logError(LogCategory.SYSTEM, 'App initialization error', error as Error);
        setIsInitialized(true); // allow app to continue even if init fails
      }
    }

    initializeApp();
  }, []);

  // Track app state changes to update lastActiveTimestamp for intro animation
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app goes to background or becomes inactive, record timestamp
      if (
        appState.current === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        logSystem('App backgrounded, recording lastActive timestamp');
        useSettingsStore.getState().setLastActiveTimestamp(Date.now());
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  // Render app immediately - migration runs in background
  return (
    <PostHogProvider>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <CleanRootNavigator />
      </SafeAreaProvider>
    </PostHogProvider>
  );
}
