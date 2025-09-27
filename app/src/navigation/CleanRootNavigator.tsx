/**
 * Clean Root Navigator - Fresh start navigation
 * No crypto dependencies, minimal implementation
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import CleanTabNavigator from './CleanTabNavigator';

const Stack = createStackNavigator();

const CleanRootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Main App */}
        <Stack.Screen name="Main" component={CleanTabNavigator} />

        {/* Future modal screens will go here */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default CleanRootNavigator;