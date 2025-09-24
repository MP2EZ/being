/**
 * New Architecture Test App
 * React 19.1.0 + React Native 0.81.4 + Expo SDK 54
 * Testing: Fabric & TurboModules (New Architecture)
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SimpleThemeProvider } from './src/contexts/SimpleThemeContext';
import MinimalRootNavigator from './src/navigation/MinimalRootNavigator';

export default function App() {
  useEffect(() => {
    console.log('🏗️ New Architecture Test App: Starting runtime detection...');

    // Quick runtime test in useEffect
    const testArchitecture = () => {
      try {
        // Test Fabric Renderer
        const hasFabric = !!(global as any)?.nativeFabricUIManager;
        console.log(`🔍 Fabric Renderer: ${hasFabric ? '✅ DETECTED' : '❌ NOT FOUND'}`);

        // Test TurboModules
        const hasTurboModules = !!(global as any)?.__turboModuleProxy;
        console.log(`🔍 TurboModules: ${hasTurboModules ? '✅ DETECTED' : '❌ NOT FOUND'}`);

        // Test Hermes
        const hasHermes = typeof (global as any).HermesInternal === 'object' && (global as any).HermesInternal !== null;
        console.log(`🔍 Hermes Engine: ${hasHermes ? '✅ ACTIVE' : '❌ INACTIVE'}`);

        // Overall status
        const newArchEnabled = hasFabric || hasTurboModules;
        console.log(`\n🎯 NEW ARCHITECTURE STATUS: ${newArchEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);

        if (newArchEnabled) {
          console.log('🎉 SUCCESS: Being. MBCT app is running on New Architecture!');
          console.log('📋 Phase 4 Task 1: New Architecture verification PASSED');
        } else {
          console.log('⚠️ WARNING: New Architecture not detected - still using Legacy Architecture');
          console.log('❌ Phase 4 Task 1: New Architecture verification FAILED');
        }

        return { hasFabric, hasTurboModules, hasHermes, newArchEnabled };
      } catch (error) {
        console.log('❌ Architecture detection error:', error);
        return { hasFabric: false, hasTurboModules: false, hasHermes: false, newArchEnabled: false };
      }
    };

    // Run test after a small delay to ensure runtime is initialized
    const timeoutId = setTimeout(() => {
      testArchitecture();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <SafeAreaProvider>
      <SimpleThemeProvider>
        <StatusBar style="auto" />
        <MinimalRootNavigator />
      </SimpleThemeProvider>
    </SafeAreaProvider>
  );
}
