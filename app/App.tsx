/**
 * Being. App Entry Point
 * Evidence-based mindfulness and cognitive therapy for mental wellness
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SimpleThemeProvider } from './src/core/providers/ThemeProvider';
import CleanRootNavigator from './src/core/navigation/CleanRootNavigator';
import { postCrisisSupportService } from './src/services/crisis/PostCrisisSupportService';
import { migrateCrisisDataToSecureStore } from './src/services/crisis/CrisisDataMigration';
import { IAPService } from './src/services/subscription/IAPService';
import { useSubscriptionStore } from './src/stores/subscriptionStore';
import EncryptionService from './src/services/security/EncryptionService';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

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
