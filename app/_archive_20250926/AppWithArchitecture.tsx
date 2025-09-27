/**
 * Being. MBCT App - Enhanced with Architectural Foundation
 *
 * This demonstrates how to integrate the new architectural foundation
 * with the existing app structure. This serves as a migration example.
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// New architectural foundation
import { AppProviders } from './src/providers/AppProviders';
import { ErrorBoundary, CrisisErrorBoundary } from './src/components/error/ErrorBoundary';
import { useTheme, usePerformance, useAppState } from './src/contexts';

// Existing screens (wrapped with error boundaries)
import { HomeScreen } from './src/screens/simple/HomeScreen';
import { CheckInScreen } from './src/screens/simple/CheckInScreen';
import { ExercisesScreen } from './src/screens/simple/ExercisesScreen';
import { ProfileScreen } from './src/screens/simple/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/**
 * Enhanced Main Tab Navigator with Error Boundaries
 */
function EnhancedMainTabNavigator() {
  const { currentTheme } = useTheme();
  const { measureNavigation } = usePerformance();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: currentTheme.colors.surface,
          borderTopColor: currentTheme.colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: currentTheme.colors.primary,
        tabBarInactiveTintColor: currentTheme.colors.textSecondary,
      }}
      screenListeners={{
        tabPress: (e) => {
          const startTime = performance.now();
          setTimeout(() => {
            const duration = performance.now() - startTime;
            measureNavigation('tab', e.target?.split('-')[0] || 'unknown', duration);
          }, 0);
        },
      }}
    >
      <Tab.Screen
        name="Home"
        options={{ tabBarLabel: 'Home' }}
      >
        {(props) => (
          <ErrorBoundary context="therapeutic">
            <HomeScreen {...props} />
          </ErrorBoundary>
        )}
      </Tab.Screen>

      <Tab.Screen
        name="CheckIn"
        options={{ tabBarLabel: 'Check-in' }}
      >
        {(props) => (
          <ErrorBoundary context="assessment">
            <CheckInScreen {...props} />
          </ErrorBoundary>
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Exercises"
        options={{ tabBarLabel: 'Exercises' }}
      >
        {(props) => (
          <ErrorBoundary context="therapeutic">
            <ExercisesScreen {...props} />
          </ErrorBoundary>
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Profile"
        options={{ tabBarLabel: 'Profile' }}
      >
        {(props) => (
          <ErrorBoundary context="data">
            <ProfileScreen {...props} />
          </ErrorBoundary>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

/**
 * Enhanced Navigator with Crisis Protection
 */
function EnhancedNavigator() {
  const { isCrisisMode } = useAppState();

  return (
    <CrisisErrorBoundary>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="Main"
          component={EnhancedMainTabNavigator}
        />
        {/* Add crisis-specific screens here if needed */}
      </Stack.Navigator>
    </CrisisErrorBoundary>
  );
}

/**
 * Enhanced App Component with Full Architecture
 */
function EnhancedApp() {
  return (
    <AppProviders
      config={{
        enableFeatureFlags: true,
        enableThemeSystem: true,
        enablePerformanceMonitoring: true,
        enableErrorBoundaries: true,
        enableOfflineMode: true,
        enableCrisisProtection: true,
        safeMode: false,
      }}
      onInitializationComplete={() => {
        console.log('Being. app initialized with architectural foundation');
      }}
      onInitializationError={(error) => {
        console.error('App initialization failed:', error);
      }}
    >
      <EnhancedNavigator />
    </AppProviders>
  );
}

/**
 * Migration Component - Demonstrates Gradual Integration
 */
function MigrationApp() {
  // For gradual migration, you can start with minimal providers
  const { createMinimalProviders } = require('./src/providers/AppProviders');
  const MinimalProviders = createMinimalProviders({
    enableFeatureFlags: true,
    enableThemeSystem: true,
    enableCrisisProtection: true,
  });

  return (
    <MinimalProviders>
      {/* Your existing app structure can go here */}
      <EnhancedNavigator />
    </MinimalProviders>
  );
}

/**
 * Development App with Enhanced Debugging
 */
function DevelopmentApp() {
  const { DevelopmentProviders } = require('./src/providers/AppProviders');

  return (
    <DevelopmentProviders>
      <EnhancedNavigator />
    </DevelopmentProviders>
  );
}

/**
 * Export the appropriate app based on environment
 */
export default __DEV__ ? DevelopmentApp : EnhancedApp;

/**
 * Export other variants for testing and migration
 */
export {
  EnhancedApp,
  MigrationApp,
  DevelopmentApp,
};