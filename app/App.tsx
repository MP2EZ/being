/**
 * Being. MBCT App - Main Entry Point
 * Clinical-grade mindfulness-based cognitive therapy application
 * PERFORMANCE OPTIMIZED for <3 second cold start
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSimpleUserStore } from './src/store/simpleUserStore';
import { useCrisisStore } from './src/store/simpleCrisisStore';
import { CrisisButton } from './src/components/simple/CrisisButton';
import { HomeScreen } from './src/screens/simple/HomeScreen';
import { CheckInScreen } from './src/screens/simple/CheckInScreen';
import { ExercisesScreen } from './src/screens/simple/ExercisesScreen';
import { ProfileScreen } from './src/screens/simple/ProfileScreen';
import { safeOfflineCrisisManager } from './src/services/simple/SafeOfflineCrisisManager';

// Phase 5 component with tab navigation
function Phase5Component() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Being.</Text>
      <Text style={styles.subtitle}>Phase 5: Core App Screens Added ✅</Text>
      <Text style={styles.description}>
        Tab navigation ready with Home, Check-in, Exercises, and Profile screens
      </Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8E8E8',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#4A7C59',
        tabBarInactiveTintColor: '#999999',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{
          tabBarLabel: 'Check-in',
        }}
      />
      <Tab.Screen
        name="Exercises"
        component={ExercisesScreen}
        options={{
          tabBarLabel: 'Exercises',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

function SimpleNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const { initializeUser } = useSimpleUserStore();
  const { initializeCrisisData } = useCrisisStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize stores
        await initializeUser();
        initializeCrisisData();

        // Initialize enhanced crisis manager
        await safeOfflineCrisisManager.initializeCrisisResources();

        // Short loading delay
        setTimeout(() => {
          setIsAppReady(true);
        }, 1000);
      } catch (error) {
        console.error('App initialization error:', error);
        // Still show app even if initialization partially fails
        setTimeout(() => {
          setIsAppReady(true);
        }, 1500);
      }
    };

    initializeApp();
  }, [initializeUser, initializeCrisisData]);

  // Show loading screen while app initializes
  if (!isAppReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingTitle}>Being.</Text>
          <Text style={styles.loadingSubtitle}>Phase 8: Enhanced services loading...</Text>
        </View>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  // Show main app once ready
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <SimpleNavigator />
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4A7C59',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1B2951',
    marginBottom: 10,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#666',
  },
});
