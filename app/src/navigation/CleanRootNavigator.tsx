/**
 * Clean Root Navigator - Fresh start navigation
 * No crypto dependencies, minimal implementation
 * Includes MBCT flow modal presentations
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import CleanTabNavigator from './CleanTabNavigator';
import MorningFlowNavigator from '../flows/morning/MorningFlowNavigator';
import MiddayFlowNavigator from '../flows/midday/MiddayFlowNavigator';
import EveningFlowNavigator from '../flows/evening/EveningFlowNavigator';

export type RootStackParamList = {
  Main: undefined;
  MorningFlow: undefined;
  MiddayFlow: undefined;
  EveningFlow: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const CleanRootNavigator: React.FC = () => {
  const handleMorningFlowComplete = (sessionData: any) => {
    console.log('🌅 Morning flow completed:', sessionData);
    // TODO: Store session data to analytics/state
  };

  const handleMiddayFlowComplete = (sessionData: any) => {
    console.log('🧘 Midday flow completed:', sessionData);
    // TODO: Store session data to analytics/state
  };

  const handleEveningFlowComplete = (sessionData: any) => {
    console.log('🌙 Evening flow completed:', sessionData);
    // TODO: Store session data to analytics/state
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Main App */}
        <Stack.Screen name="Main" component={CleanTabNavigator} />

        {/* MBCT Flow Modals */}
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen
            name="MorningFlow"
            options={{
              gestureEnabled: false, // Prevent swipe to dismiss during session
              animationTypeForReplace: 'push'
            }}
          >
            {({ navigation }) => (
              <MorningFlowNavigator
                onComplete={(sessionData) => {
                  handleMorningFlowComplete(sessionData);
                  navigation.goBack();
                }}
                onExit={() => {
                  navigation.goBack();
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen
            name="MiddayFlow"
            options={{
              gestureEnabled: false, // Prevent swipe to dismiss during session
              animationTypeForReplace: 'push'
            }}
          >
            {({ navigation }) => (
              <MiddayFlowNavigator
                onComplete={(sessionData) => {
                  handleMiddayFlowComplete(sessionData);
                  navigation.goBack();
                }}
                onExit={() => {
                  navigation.goBack();
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen
            name="EveningFlow"
            options={{
              gestureEnabled: false, // Prevent swipe to dismiss during session
              animationTypeForReplace: 'push'
            }}
          >
            {({ navigation }) => (
              <EveningFlowNavigator
                onComplete={(sessionData) => {
                  handleEveningFlowComplete(sessionData);
                  navigation.goBack();
                }}
                onExit={() => {
                  navigation.goBack();
                }}
              />
            )}
          </Stack.Screen>
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default CleanRootNavigator;