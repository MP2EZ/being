/**
 * Being. MBCT App Entry Point
 * Evidence-based mindfulness and cognitive therapy for mental wellness
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SimpleThemeProvider } from './src/contexts/SimpleThemeContext';
import CleanRootNavigator from './src/navigation/CleanRootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <SimpleThemeProvider>
        <StatusBar style="auto" />
        <CleanRootNavigator />
      </SimpleThemeProvider>
    </SafeAreaProvider>
  );
}
