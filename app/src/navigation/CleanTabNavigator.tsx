/**
 * Clean Tab Navigator - Fresh start approach
 * Minimal bottom tabs without crypto dependencies
 * DRD-compliant therapeutic design
 *
 * Design Library Compliance:
 * - Navigation colors from colorSystem.navigation
 * - NavShape components: triangle (home), book (learn), circle (insights)
 * - BrainIcon with 60% fill for profile
 * - Inactive state: colorSystem.gray[500]
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, Rect, ClipPath, Defs, G } from 'react-native-svg';
import { colorSystem, spacing } from '../constants/colors';
import CleanHomeScreen from '../screens/home/CleanHomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import InsightsScreen from '../screens/InsightsScreen';
import LearnScreen from '../screens/learn/LearnScreen';
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

const CircleIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" fill={color} />
  </Svg>
);

const BookIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 19.5C4 20.881 5.119 22 6.5 22H20V2H6.5C5.119 2 4 3.119 4 4.5V19.5ZM18 4V20H6.5C6.224 20 6 19.776 6 19.5V5.207C6.313 5.348 6.644 5.45 7 5.5V18H18V4Z" fill={color} />
    <Path d="M9 8H15V10H9V8ZM9 11H15V13H9V11Z" fill={color} />
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

// Wrap InsightsScreen with FeatureGate
const InsightsScreenWrapper = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <FeatureGate
      feature="progressInsights"
      onUpgrade={() => navigation.navigate('Subscription')}
    >
      <InsightsScreen />
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
        name="Learn"
        component={LearnScreen}
        options={{
          headerTitle: 'Learn',
          headerShown: false, // LearnScreen has its own SafeAreaView
          tabBarIcon: ({ focused }) => (
            <BookIcon
              color={focused ? colorSystem.navigation.learn : colorSystem.gray[500]}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Insights"
        component={InsightsScreenWrapper}
        options={{
          headerTitle: 'Insights',
          headerShown: false, // InsightsScreen has its own SafeAreaView
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