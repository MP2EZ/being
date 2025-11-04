/**
 * Clean Root Navigator - Fresh start navigation
 * No crypto dependencies, minimal implementation
 * Includes MBCT flow modal presentations
 */

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
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
import OnboardingScreen from '../screens/OnboardingScreen';
import { useStoicPracticeStore } from '../stores/stoicPracticeStore';
import { useSettingsStore } from '../stores/settingsStore';

export type RootStackParamList = {
  Onboarding: undefined;
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

// Loading screen component
const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#FF9F43" />
  </View>
);

const CleanRootNavigator: React.FC = () => {
  const { markCheckInComplete } = useStoicPracticeStore();
  const { loadSettings, markOnboardingComplete } = useSettingsStore();
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Main' | null>(null);

  useEffect(() => {
    async function checkOnboarding() {
      const settings = await loadSettings();
      setInitialRoute(settings?.onboardingCompleted ? 'Main' : 'Onboarding');
    }
    checkOnboarding();
  }, [loadSettings]);

  const handleMorningFlowComplete = async (sessionData: any) => {
    logPerformance('🌅 Morning flow completed:', sessionData);
    await markCheckInComplete('morning');
    // TODO: Store session data to analytics/state
  };

  const handleMiddayFlowComplete = async (sessionData: any) => {
    logPerformance('🧘 Midday flow completed:', sessionData);
    await markCheckInComplete('midday');
    // TODO: Store session data to analytics/state
  };

  const handleEveningFlowComplete = async (sessionData: any) => {
    logPerformance('🌙 Evening flow completed:', sessionData);
    await markCheckInComplete('evening');
    // TODO: Store session data to analytics/state
  };

  const handleOnboardingComplete = async () => {
    await markOnboardingComplete();
    setInitialRoute('Main');
  };

  if (!initialRoute) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: '#FFFFFF',
            borderBottomColor: '#E5E7EB',
            borderBottomWidth: 1,
          },
          headerTintColor: '#000000',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
          },
        }}
      >
        {/* Onboarding Flow */}
        <Stack.Screen
          name="Onboarding"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        >
          {({ navigation }) => (
            <OnboardingScreen
              onComplete={handleOnboardingComplete}
            />
          )}
        </Stack.Screen>

        {/* Main App */}
        <Stack.Screen name="Main" component={CleanTabNavigator} />

        {/* MBCT Flow Modals */}
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen
            name="MorningFlow"
            options={{
              headerShown: false, // MorningFlowNavigator has its own header with progress
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
              headerShown: false, // MiddayFlowNavigator has its own header with progress
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
              headerShown: false, // EveningFlowNavigator has its own header with progress
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
              headerShown: true,
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
              headerShown: true,
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
              headerShown: true,
              presentation: 'modal',
              gestureEnabled: true
            }}
          />

          <Stack.Screen
            name="SubscriptionStatus"
            component={SubscriptionStatusCard}
            options={{
              title: 'Subscription Status',
              headerShown: true,
              presentation: 'modal',
              gestureEnabled: true
            }}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default CleanRootNavigator;