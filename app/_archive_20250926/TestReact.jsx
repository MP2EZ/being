/**
 * ULTRA MINIMAL REACT 18.2.0 TEST
 * Pure JSX to bypass TypeScript issues
 */

import React from 'react';
import { View, Text } from 'react-native';

export default function TestReact() {
  console.log('React Version:', React.version);
  console.log('TestReact: Rendering...');

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <Text style={{ fontSize: 24, color: '#000000' }}>React {React.version} Test</Text>
      <Text style={{ fontSize: 16, marginTop: 10 }}>If you see this, React is working!</Text>
    </View>
  );
}