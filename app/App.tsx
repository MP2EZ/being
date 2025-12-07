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
import { postCrisisSupportService } from './src/features/crisis/services/PostCrisisSupportService';
import { migrateCrisisDataToSecureStore } from './src/features/crisis/services/CrisisDataMigration';
import { IAPService } from './src/core/services/subscription/IAPService';
import { useSubscriptionStore } from './src/core/stores/subscriptionStore';
import EncryptionService from './src/core/services/security/EncryptionService';
import { useSettingsStore } from './src/core/stores/settingsStore';

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

        // Initialize PostCrisisSupport service (includes automatic migration)
        console.log('[App] Migrating crisis data to SecureStore...');
        await postCrisisSupportService.initialize();

        // Migrate crisis detection/intervention logs from AsyncStorage to SecureStore
        const migrationResult = await migrateCrisisDataToSecureStore();

        if (migrationResult.migratedKeys > 0) {
          console.log(`[App] Crisis data migration completed: ${migrationResult.migratedKeys}/${migrationResult.totalKeys} keys migrated`);
        }

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
    <SafeAreaProvider>
      <SimpleThemeProvider>
        <StatusBar style="auto" />
        <CleanRootNavigator />
      </SimpleThemeProvider>
    </SafeAreaProvider>
  );
}
