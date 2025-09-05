/**
 * FullMind MBCT App - Main Entry Point
 * Clinical-grade mindfulness-based cognitive therapy application
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <RootNavigator />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
