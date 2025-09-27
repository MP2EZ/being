/**
 * Minimal Test App to isolate runtime errors
 */

import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

const TestApp: React.FC = () => {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View>
        <Text style={{ fontSize: 24 }}>Being. Test App</Text>
        <Text style={{ fontSize: 16, marginTop: 20 }}>
          If you can see this, basic imports are working
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default TestApp;