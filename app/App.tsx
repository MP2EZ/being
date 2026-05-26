/**
 * Being. App Entry Point
 * Evidence-based mindfulness and cognitive therapy for mental wellness
 */

import React, { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import CleanRootNavigator from './src/core/navigation/CleanRootNavigator';
import { IAPService } from './src/core/services/subscription/IAPService';
import { useSubscriptionStore } from './src/core/stores/subscriptionStore';
import EncryptionService from './src/core/services/security/EncryptionService';
import { useSettingsStore } from './src/core/stores/settingsStore';
import { initializeExternalReporting, logSystem, logError, LogCategory } from './src/core/services/logging';
import { initializeCrisisMonitoring } from './src/core/services/monitoring';
import { DataRetentionService } from './src/core/services/data-retention';
import { PostHogProvider } from './src/core/analytics';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    async function initializeApp() {
      try {
        logSystem('App initialization started');

        // Sentry first so subsequent spans (encryption health, crisis button
        // latency) reach the dashboard. Wrapped in try/catch: a Sentry init
        // failure must not block encryption init.
        try {
          await initializeExternalReporting();
        } catch (err) {
          logError(LogCategory.SYSTEM, 'Sentry init failed (non-blocking)', err as Error);
        }

        // EncryptionService must initialize before downstream secure-storage
        // services (wellness data) depend on its keys. Sentry span captures
        // launch-time duration against the <2s app-launch budget.
        await Sentry.startSpan(
          { name: 'encryption.init', op: 'app.launch.encryption' },
          async () => {
            await EncryptionService.initialize();
          }
        );
        logSystem('Encryption service initialized');

        // Remaining init tasks are independent. allSettled (not all) so one
        // best-effort failure doesn't abort the others. IAP init only runs
        // when the platform supports it.
        const results = await Promise.allSettled([
          initializeCrisisMonitoring(),
          useSubscriptionStore.getState().loadSubscription(),
          IAPService.isAvailable()
            ? IAPService.initialize()
            : Promise.resolve(),
          DataRetentionService.runRetentionCleanup(),
        ]);

        results.forEach((result, idx) => {
          if (result.status === 'rejected') {
            const task = ['crisisMonitoring', 'loadSubscription', 'IAPService', 'dataRetention'][idx];
            logError(
              LogCategory.SYSTEM,
              `Init task '${task}' failed (non-blocking)`,
              result.reason as Error
            );
          }
        });

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
