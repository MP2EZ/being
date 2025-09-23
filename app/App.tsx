/**
 * Being. MBCT App - MINIMAL TEST VERSION (Template T2)
 * Testing for property descriptor conflicts
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseError } from './src/types/core';
import { getTimeOfDayTheme } from './src/utils/timeHelpers';
import { sanitizeTextInput } from './src/utils/validation';
import { Typography } from './src/components/core/Typography';
import { Button } from './src/components/core/Button';

export default function App() {
  console.log('🧪 MINIMAL APP: Testing for property descriptor conflicts');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Being. MBCT App</Text>
      <Text style={styles.subtitle}>Minimal Test - Template T2</Text>
      <Text style={styles.statusText}>
        Testing basic React Native components only.
        No navigation, no stores, no complex dependencies.
      </Text>
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