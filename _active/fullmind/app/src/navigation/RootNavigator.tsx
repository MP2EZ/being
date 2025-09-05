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
import CrisisPlanScreen from '../screens/crisis/CrisisPlanScreen';
import OnboardingPlaceholder from '../screens/onboarding/OnboardingPlaceholder';

const Stack = createStackNavigator();

const RootNavigator: React.FC = () => {
  const { user, isLoading, loadUser, isOnboardingComplete } = useUserStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (isLoading) {
    return <LoadingScreen />;
  }

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
          name="CrisisPlan" 
          component={CrisisPlanScreen}
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