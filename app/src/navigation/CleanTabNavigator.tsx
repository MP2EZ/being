/**
 * Clean Tab Navigator - Fresh start approach
 * Minimal bottom tabs without crypto dependencies
 * DRD-compliant therapeutic design
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colorSystem, spacing } from '../constants/colors';
import CleanHomeScreen from '../screens/home/CleanHomeScreen';

const Tab = createBottomTabNavigator();

// DRD-compliant therapeutic icons with exact colors per spec
const DiamondIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2 L22 12 L12 22 L2 12 Z" fill={color} />
  </Svg>
);

const StarIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z" fill={color} />
  </Svg>
);

const TriangleIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2 L22 20 L2 20 Z" fill={color} />
  </Svg>
);

const BrainIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="6" r="4" fill={color} />
    <Path d="M12 14c-6 0-8 2-8 4v2h16v-2c0-2-2-4-8-4z" fill={color} />
  </Svg>
);

// Placeholder components for other tabs
const PlaceholderScreen: React.FC<{ name: string; description: string }> = ({ name, description }) => (
  <View style={{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorSystem.base.white,
    padding: spacing.lg
  }}>
    <Text style={{
      fontSize: 24,
      fontWeight: '600',
      color: colorSystem.base.black,
      marginBottom: spacing.sm,
      textAlign: 'center'
    }}>
      {name}
    </Text>
    <Text style={{
      fontSize: 16,
      color: colorSystem.gray[600],
      textAlign: 'center',
      lineHeight: 22
    }}>
      {description}
    </Text>
  </View>
);

// Create proper component references to avoid inline functions
const ExercisesScreen = () => (
  <PlaceholderScreen
    name="Mindful Exercises"
    description="Breathing exercises, meditation, and MBCT practices to support your wellbeing journey."
  />
);

const InsightsScreen = () => (
  <PlaceholderScreen
    name="Your Insights"
    description="Track your progress, view patterns, and understand your mindfulness journey over time."
  />
);

const ProfileScreen = () => (
  <PlaceholderScreen
    name="Your Profile"
    description="Manage your account, preferences, and personalize your Being. experience."
  />
);

const CleanTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colorSystem.base.white,
          borderTopColor: colorSystem.gray[200],
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 84,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 8,
        },
        tabBarActiveTintColor: colorSystem.base.black,
        tabBarInactiveTintColor: '#1C1C1C', // DRD soft-black
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: colorSystem.base.white,
          borderBottomColor: colorSystem.gray[200],
          borderBottomWidth: 1,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 4,
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '600',
          color: colorSystem.base.black,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={CleanHomeScreen}
        options={{
          headerTitle: 'Being.',
          headerShown: false, // CleanHomeScreen has its own SafeAreaView
          tabBarIcon: ({ focused, color }) => (
            <DiamondIcon
              color={focused ? '#FF9F43' : '#1C1C1C'} // DRD morning-primary : soft-black
            />
          ),
        }}
      />

      <Tab.Screen
        name="Exercises"
        component={ExercisesScreen}
        options={{
          headerTitle: 'Exercises',
          tabBarIcon: ({ focused, color }) => (
            <StarIcon
              color={focused ? '#FF9F43' : '#1C1C1C'} // DRD morning-primary : soft-black
            />
          ),
        }}
      />

      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          headerTitle: 'Insights',
          tabBarIcon: ({ focused, color }) => (
            <TriangleIcon
              color={focused ? '#4A7C59' : '#1C1C1C'} // DRD evening-primary : soft-black
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerTitle: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <BrainIcon
              color={focused ? '#1B2951' : '#1C1C1C'} // DRD midnight-blue : soft-black
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default CleanTabNavigator;