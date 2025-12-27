/**
 * Being. App Entry Point
 * Evidence-based mindfulness and cognitive therapy for mental wellness
 */

import React, { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SimpleThemeProvider } from './src/core/providers/ThemeProvider';
import CleanRootNavigator from './src/core/navigation/CleanRootNavigator';
import { IAPService } from './src/core/services/subscription/IAPService';
import { useSubscriptionStore } from './src/core/stores/subscriptionStore';
import EncryptionService from './src/core/services/security/EncryptionService';
import { useSettingsStore } from './src/core/stores/settingsStore';
import { initializeExternalReporting } from './src/core/services/logging';
import { DataRetentionService } from './src/core/services/data-retention';
import { PostHogProvider } from './src/core/analytics';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    async function initializeApp() {
      try {
        console.log('[App] Initialization started');

        // Initialize EncryptionService first (required by SessionStorageService and other services)
        console.log('[App] Initializing encryption service...');
        await EncryptionService.initialize();
        console.log('[App] Encryption service initialized');

        // Initialize external error reporting (Sentry) - INFRA-61
        // Only active in production when EXPO_PUBLIC_SENTRY_DSN is set
        await initializeExternalReporting();

        // Initialize subscription system
        console.log('[App] Initializing subscription system...');

        // Load subscription from storage
        await useSubscriptionStore.getState().loadSubscription();

        // Initialize IAP service (if available)
        if (IAPService.isAvailable()) {
          await IAPService.initialize();
          console.log('[App] IAP service initialized');
        } else {
          console.log('[App] IAP not available on this platform');
        }

        // Run data retention cleanup (MAINT-123)
        // Safe to call on every launch - runs max once per day
        console.log('[App] Running data retention cleanup...');
        const cleanupResult = await DataRetentionService.runRetentionCleanup();
        if (cleanupResult.totalRecordsDeleted > 0) {
          console.log(`[App] Data retention: ${cleanupResult.totalRecordsDeleted} records cleaned up`);
        } else {
          console.log('[App] Data retention: No cleanup needed');
        }

        setIsInitialized(true);
        console.log('[App] Initialization complete');
      } catch (error) {
        // Log error but don't block app initialization
        console.error('[App] Initialization error:', error);
        setIsInitialized(true); // Allow app to continue even if migration fails
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
        console.log('[App] Going to background, recording timestamp');
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
        <SimpleThemeProvider>
          <StatusBar style="auto" />
          <CleanRootNavigator />
        </SimpleThemeProvider>
      </SafeAreaProvider>
    </PostHogProvider>
  );
}
