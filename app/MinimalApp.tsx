/**
 * MINIMAL TEST APP - Emergency Runtime Debugging
 * This is the simplest possible React Native app to test if the issue is in our code
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MinimalApp() {
  console.log('MinimalApp: Component rendering...');

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Being. - Minimal Test</Text>
      <Text style={styles.subtext}>If you can see this, the runtime is working!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B2951',
    marginBottom: 16,
  },
  subtext: {
    fontSize: 16,
    color: '#666666',
  },
});