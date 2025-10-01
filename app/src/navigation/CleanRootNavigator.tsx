/**
 * Clean Root Navigator - Fresh start navigation
 * No crypto dependencies, minimal implementation
 * Includes MBCT flow modal presentations
 */

import React from 'react';
import { logPerformance } from '../services/logging';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import CleanTabNavigator from './CleanTabNavigator';
import MorningFlowNavigator from '../flows/morning/MorningFlowNavigator';
import MiddayFlowNavigator from '../flows/midday/MiddayFlowNavigator';
import EveningFlowNavigator from '../flows/evening/EveningFlowNavigator';
import CrisisResourcesScreen from '../screens/crisis/CrisisResourcesScreen';
import CrisisPlanScreen from '../screens/crisis/CrisisPlanScreen';
import PurchaseOptionsScreen from '../components/subscription/PurchaseOptionsScreen';
import SubscriptionStatusCard from '../components/subscription/SubscriptionStatusCard';

export type RootStackParamList = {
  Main: undefined;
  MorningFlow: undefined;
  MiddayFlow: undefined;
  EveningFlow: undefined;
  CrisisResources: {
    severityLevel?: 'moderate' | 'high' | 'emergency';
    source?: 'assessment' | 'direct' | 'crisis_button';
  } | undefined;
  CrisisPlan: undefined;
  Subscription: undefined;
  SubscriptionStatus: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const CleanRootNavigator: React.FC = () => {
  const handleMorningFlowComplete = (sessionData: any) => {
    logPerformance('🌅 Morning flow completed:', sessionData);
    // TODO: Store session data to analytics/state
  };

  const handleMiddayFlowComplete = (sessionData: any) => {
    logPerformance('🧘 Midday flow completed:', sessionData);
    // TODO: Store session data to analytics/state
  };

  const handleEveningFlowComplete = (sessionData: any) => {
    logPerformance('🌙 Evening flow completed:', sessionData);
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

          {/* Crisis Resources Screen */}
          <Stack.Screen
            name="CrisisResources"
            component={CrisisResourcesScreen}
            options={{
              title: 'Crisis Support',
              presentation: 'modal',
              gestureEnabled: true
            }}
          />

          {/* Crisis Plan Screen */}
          <Stack.Screen
            name="CrisisPlan"
            component={CrisisPlanScreen}
            options={{
              title: 'Safety Plan',
              presentation: 'modal',
              gestureEnabled: true
            }}
          />

          {/* Subscription Screens */}
          <Stack.Screen
            name="Subscription"
            component={PurchaseOptionsScreen}
            options={{
              title: 'Subscription',
              presentation: 'modal',
              gestureEnabled: true
            }}
          />

          <Stack.Screen
            name="SubscriptionStatus"
            component={SubscriptionStatusCard}
            options={{
              title: 'Subscription Status',
              presentation: 'modal',
              gestureEnabled: true
            }}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default CleanRootNavigator;