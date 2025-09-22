/**
 * Root Navigator - Main navigation container
 * Handles onboarding flow and main app navigation
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useUserStore } from '../store';
import MainTabNavigator from './MainTabNavigator';
import { colorSystem } from '../constants/colors';
import { LoadingScreen } from '../components/core';

// Screen imports
import CheckInFlowScreen from '../screens/home/CheckInFlowScreen';
import AssessmentFlowScreen from '../screens/assessment/AssessmentFlowScreen';
import AssessmentResultsScreen from '../screens/assessment/AssessmentResultsScreen';
import CrisisPlanScreen from '../screens/crisis/CrisisPlanScreen';
import OnboardingPlaceholder from '../screens/onboarding/OnboardingPlaceholder';

// Standalone screen imports (Stage 4)
import { BreathingScreen, CheckInScreen, ProgressScreen } from '../screens/standalone';

// Payment screen imports
import SubscriptionScreen from '../screens/payment/SubscriptionScreen';
import PaymentMethodScreen from '../screens/payment/PaymentMethodScreen';
import BillingHistoryScreen from '../screens/payment/BillingHistoryScreen';
import PaymentSettingsScreen from '../screens/payment/PaymentSettingsScreen';

const Stack = createStackNavigator();

const RootNavigator: React.FC = () => {
  const { user, isLoading, initializeStore, isOnboardingComplete } = useUserStore();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  // Temporarily bypass loading for New Architecture validation
  // if (isLoading) {
  //   return <LoadingScreen />;
  // }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user || !isOnboardingComplete() ? (
          // Onboarding Flow (first launch only)
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingPlaceholder}
          />
        ) : (
          // Main App
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
        
        {/* Modal Screens */}
        <Stack.Screen 
          name="CheckInFlow" 
          component={CheckInFlowScreen}
          options={{ 
            presentation: 'modal',
            headerShown: false,
          }}
        />
        
        <Stack.Screen 
          name="AssessmentFlow" 
          component={AssessmentFlowScreen}
          options={{ 
            presentation: 'modal',
            headerShown: false,
          }}
        />

        <Stack.Screen 
          name="AssessmentResults" 
          component={AssessmentResultsScreen}
          options={{ 
            presentation: 'modal',
            headerShown: false,
          }}
        />
        
        <Stack.Screen
          name="CrisisPlan"
          component={CrisisPlanScreen}
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />

        {/* Standalone Core Journey Screens (Stage 4) */}
        <Stack.Screen
          name="BreathingScreen"
          component={BreathingScreen}
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="CheckInScreen"
          component={CheckInScreen}
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="ProgressScreen"
          component={ProgressScreen}
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />

        {/* Payment Screens */}
        <Stack.Screen
          name="SubscriptionScreen"
          component={SubscriptionScreen}
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="PaymentMethodScreen"
          component={PaymentMethodScreen}
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="BillingHistoryScreen"
          component={BillingHistoryScreen}
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="PaymentSettingsScreen"
          component={PaymentSettingsScreen}
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;