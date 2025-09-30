/**
 * Being. MBCT App Entry Point
 * Evidence-based mindfulness and cognitive therapy for mental wellness
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SimpleThemeProvider } from './src/contexts/SimpleThemeContext';
import CleanRootNavigator from './src/navigation/CleanRootNavigator';
import { postCrisisSupportService } from './src/services/crisis/PostCrisisSupportService';
import { migrateCrisisDataToSecureStore } from './src/services/crisis/CrisisDataMigration';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initializeApp() {
      try {
        console.log('[App] Initialization started - migrating crisis data to SecureStore');

        // Initialize PostCrisisSupport service (includes automatic migration)
        await postCrisisSupportService.initialize();

        // Migrate crisis detection/intervention logs from AsyncStorage to SecureStore
        const migrationResult = await migrateCrisisDataToSecureStore();

        if (migrationResult.migratedKeys > 0) {
          console.log(`[App] Crisis data migration completed: ${migrationResult.migratedKeys}/${migrationResult.totalKeys} keys migrated`);
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
