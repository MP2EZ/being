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

// Screen imports (will be created next)
// import OnboardingNavigator from './OnboardingNavigator';
// import CrisisPlanScreen from '../screens/CrisisPlanScreen';

const Stack = createStackNavigator();

const RootNavigator: React.FC = () => {
  const { user, isLoading, loadUser, isOnboardingComplete } = useUserStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (isLoading) {
    // TODO: Add proper loading screen
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user || !isOnboardingComplete() ? (
          // Onboarding Flow (first launch only)
          <Stack.Screen 
            name="Onboarding" 
            component={() => null} // TODO: OnboardingNavigator 
          />
        ) : (
          // Main App
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
        
        {/* Modal Screens */}
        <Stack.Screen 
          name="CrisisPlan" 
          component={() => null} // TODO: CrisisPlanScreen
          options={{ 
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Crisis Support',
            headerStyle: {
              backgroundColor: colorSystem.status.error,
            },
            headerTintColor: 'white',
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;