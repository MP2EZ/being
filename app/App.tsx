/**
 * Being. MBCT App - Production App with New Architecture Verification
 * React 19.1.0 + React Native 0.81.4 + Expo SDK 54
 * Phase 4: New Architecture Verification in Production App
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import NewArchitectureTest from './src/components/test/NewArchitectureTest';
import RuntimeArchitectureTest from './src/components/test/RuntimeArchitectureTest';
import EnhancedArchitectureTest from './src/components/test/EnhancedArchitectureTest';
import RootNavigator from './src/navigation/RootNavigator';
import {
  detectFabricRenderer,
  detectTurboModules,
  detectHermesEngine
} from './src/utils/architecture-detection';

type AppMode = 'production' | 'architecture-test' | 'runtime-test' | 'enhanced-test';

export default function App() {
  console.log('🚀 App.tsx: Starting Being. app with New Architecture');
  const [appMode, setAppMode] = useState<AppMode>('production');
  const [architectureStatus, setArchitectureStatus] = useState({
    fabric: false,
    turboModules: false,
    hermes: false,
    newArchDetected: false
  });

  useEffect(() => {
    // Detect architecture on app start
    const fabric = detectFabricRenderer();
    const turboModules = detectTurboModules();
    const hermes = detectHermesEngine();
    const newArchDetected = fabric || turboModules;

    setArchitectureStatus({
      fabric,
      turboModules,
      hermes,
      newArchDetected
    });

    console.log('🏗️ Being. MBCT App - Architecture Detection:');
    console.log(`  Fabric Renderer: ${fabric ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`  TurboModules: ${turboModules ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`  Hermes Engine: ${hermes ? '✅ Active' : '❌ Inactive'}`);
    console.log(`  New Architecture: ${newArchDetected ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
  }, []);

  if (appMode === 'runtime-test') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Being. MBCT App</Text>
          <Text style={styles.subtitle}>Phase 4: Runtime Architecture Verification</Text>

          <View style={[
            styles.statusBadge,
            architectureStatus.newArchDetected ? styles.successBadge : styles.errorBadge
          ]}>
            <Text style={styles.statusText}>
              {architectureStatus.newArchDetected ? '✅ New Architecture Detected' : '❌ Legacy Architecture'}
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.switchButton, styles.smallButton]}
              onPress={() => setAppMode('enhanced-test')}
            >
              <Text style={styles.switchButtonText}>Enhanced</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.switchButton, styles.smallButton]}
              onPress={() => setAppMode('architecture-test')}
            >
              <Text style={styles.switchButtonText}>Full Test</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.switchButton, styles.smallButton]}
              onPress={() => setAppMode('production')}
            >
              <Text style={styles.switchButtonText}>Being. App</Text>
            </TouchableOpacity>
          </View>
        </View>

        <RuntimeArchitectureTest />
      </View>
    );
  }

  if (appMode === 'enhanced-test') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Being. MBCT App</Text>
          <Text style={styles.subtitle}>Enhanced Clinical Performance Validation</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.switchButton, styles.smallButton]}
              onPress={() => setAppMode('runtime-test')}
            >
              <Text style={styles.switchButtonText}>Runtime</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.switchButton, styles.smallButton]}
              onPress={() => setAppMode('architecture-test')}
            >
              <Text style={styles.switchButtonText}>Full Test</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.switchButton, styles.smallButton]}
              onPress={() => setAppMode('production')}
            >
              <Text style={styles.switchButtonText}>Being. App</Text>
            </TouchableOpacity>
          </View>
        </View>

        <EnhancedArchitectureTest />
      </View>
    );
  }

  if (appMode === 'architecture-test') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Being. MBCT App</Text>
          <Text style={styles.subtitle}>Complete Architecture Analysis</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.switchButton, styles.smallButton]}
              onPress={() => setAppMode('enhanced-test')}
            >
              <Text style={styles.switchButtonText}>Enhanced</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.switchButton, styles.smallButton]}
              onPress={() => setAppMode('runtime-test')}
            >
              <Text style={styles.switchButtonText}>Runtime Test</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.switchButton, styles.smallButton]}
              onPress={() => setAppMode('production')}
            >
              <Text style={styles.switchButtonText}>Being. App</Text>
            </TouchableOpacity>
          </View>
        </View>

        <NewArchitectureTest />
      </View>
    );
  }

  console.log('🏁 App.tsx: Rendering production mode with RootNavigator');
  return (
    <View style={styles.container}>
      <View style={styles.productionHeader}>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => setAppMode('enhanced-test')}
        >
          <Text style={styles.testButtonText}>
            {architectureStatus.newArchDetected ? '🔬 Enhanced ✅' : '🔬 Enhanced ❌'}
          </Text>
        </TouchableOpacity>
      </View>

      <RootNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 15,
  },
  statusBadge: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  successBadge: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  errorBadge: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  switchButton: {
    backgroundColor: '#4A7C59',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  smallButton: {
    padding: 12,
  },
  switchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  productionHeader: {
    position: 'absolute',
    top: 60,
    right: 15,
    zIndex: 1000,
  },
  testButton: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 8,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});