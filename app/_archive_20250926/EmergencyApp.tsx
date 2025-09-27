/**
 * EMERGENCY DEBUGGING APP - Absolute Minimal Implementation
 * This bypasses ALL store dependencies and complex logic
 * to test if React Native basic functionality works.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function EmergencyApp() {
  console.log('EmergencyApp: Starting absolutely minimal app...');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EMERGENCY DEBUG MODE</Text>
      <Text style={styles.subtitle}>If you see this, React Native core is working</Text>
      <Text style={styles.details}>
        - No stores loaded{'\n'}
        - No navigation{'\n'}
        - No external dependencies{'\n'}
        - Pure React Native only
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#CC0000',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#1B2951',
    marginBottom: 20,
    textAlign: 'center',
  },
  details: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
});