/**
 * FullMind MBCT App - Main Entry Point
 * Clinical-grade mindfulness-based cognitive therapy application
 * PERFORMANCE OPTIMIZED for <3 second cold start
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { LoadingScreen } from './src/components/core';

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    // PERFORMANCE: Minimal initialization for fastest launch
    const initializeApp = async () => {
      try {
        // Pre-load critical data only
        // Other data loads happen in background after UI is ready
        
        // Mark app as ready for immediate UI render
        setIsAppReady(true);
        
        // Background initialization - don't block launch
        Promise.resolve().then(() => {
          // Any heavy initialization goes here after UI is shown
          console.log('Background initialization started');
        });
        
      } catch (error) {
        console.error('App initialization failed:', error);
        // Still show UI - graceful degradation
        setIsAppReady(true);
      }
    };

    initializeApp();

    // Handle app state changes for performance monitoring
    const handleAppStateChange = (nextAppState: any) => {
      if (nextAppState === 'active') {
        // App became active - could trigger performance checks
        console.log('App became active');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // PERFORMANCE: Show loading screen only briefly during critical initialization
  if (!isAppReady) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <RootNavigator />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
