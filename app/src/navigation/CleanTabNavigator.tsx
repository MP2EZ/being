/**
 * Clean Tab Navigator - Fresh start approach
 * Minimal bottom tabs without crypto dependencies
 * DRD-compliant therapeutic design
 *
 * Design Library Compliance:
 * - Navigation colors from colorSystem.navigation
 * - NavShape components: triangle (home), square (checkins), star (exercises), circle (insights)
 * - BrainIcon with 60% fill for profile
 * - Inactive state: colorSystem.gray[500]
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, Rect, ClipPath, Defs, G } from 'react-native-svg';
import { colorSystem, spacing } from '../constants/colors';
import CleanHomeScreen from '../screens/home/CleanHomeScreen';
import ExercisesScreen from '../screens/ExercisesScreen.simple';
import ProfileScreen from '../screens/ProfileScreen.simple';
import BrainIcon from '../components/shared/BrainIcon';
import FeatureGate from '../components/subscription/FeatureGate';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from './CleanRootNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const Tab = createBottomTabNavigator();

// Design library navigation shapes - optimized for React Native
const TriangleIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2 L22 20 L2 20 Z" fill={color} />
  </Svg>
);

const SquareIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3" y="3" width="18" height="18" rx="3" fill={color} />
  </Svg>
);

const StarIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z" fill={color} />
  </Svg>
);

const CircleIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" fill={color} />
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
// ExercisesScreen now imported from separate file

const InsightsScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <FeatureGate
      feature="progressInsights"
      onUpgrade={() => navigation.navigate('Subscription')}
    >
      <PlaceholderScreen
        name="Your Insights"
        description="Track your progress, view patterns, and understand your mindfulness journey over time."
      />
    </FeatureGate>
  );
};

// ProfileScreen now imported from separate file

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
          tabBarIcon: ({ focused }) => (
            <TriangleIcon
              color={focused ? colorSystem.navigation.home : colorSystem.gray[500]}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Exercises"
        component={ExercisesScreen}
        options={{
          headerTitle: 'Exercises',
          headerShown: false, // ExercisesScreen has its own SafeAreaView
          tabBarIcon: ({ focused }) => (
            <StarIcon
              color={focused ? colorSystem.navigation.exercises : colorSystem.gray[500]}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          headerTitle: 'Insights',
          tabBarIcon: ({ focused }) => (
            <CircleIcon
              color={focused ? colorSystem.navigation.insights : colorSystem.gray[500]}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerTitle: 'Profile',
          tabBarIcon: ({ focused }) => (
            <BrainIcon
              color={focused ? colorSystem.base.midnightBlue : colorSystem.gray[500]}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default CleanTabNavigator;