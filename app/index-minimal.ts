import { registerRootComponent } from 'expo';
import React from 'react';
import { View, Text } from 'react-native';

// Minimal test component to isolate property descriptor issue
function MinimalApp() {
  return React.createElement(View, { style: { flex: 1, justifyContent: 'center', alignItems: 'center' } },
    React.createElement(Text, null, 'Welcome to Being - Minimal Test')
  );
}

registerRootComponent(MinimalApp);