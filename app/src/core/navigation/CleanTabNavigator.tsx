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
import { colorSystem, spacing, typography } from '@/core/theme';
import CleanHomeScreen from '@/features/home/screens/CleanHomeScreen';
import ProfileScreen from '@/features/profile/screens/ProfileScreen';
import InsightsScreen from '@/features/insights/screens/InsightsScreen';
import LearnScreen from '@/features/learn/screens/LearnScreen';
import BrainIcon from '@/core/components/shared/BrainIcon';

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
    padding: spacing[24]
  }}>
    <Text style={{
      fontSize: typography.headline4.size,
      fontWeight: typography.fontWeight.semibold,
      color: colorSystem.base.black,
      marginBottom: spacing[8],
      textAlign: 'center'
    }}>
      {name}
    </Text>
    <Text style={{
      fontSize: typography.bodyRegular.size,
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

// ProfileScreen now imported from separate file

const CleanTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colorSystem.base.white,
          borderTopColor: colorSystem.gray[200],
          borderTopWidth: 1,
          paddingBottom: spacing[8],
          paddingTop: spacing[8],
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
          fontSize: typography.micro.size,
          fontWeight: typography.fontWeight.medium,
          marginTop: spacing[4],
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
          fontSize: typography.title.size,
          fontWeight: typography.fontWeight.semibold,
          color: colorSystem.base.black,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={CleanHomeScreen}
        options={{
          headerTitle: 'Being',
          headerShown: false, // CleanHomeScreen has its own SafeAreaView
          // INFRA-183: tabBarButtonTestID is the only mechanically reliable
          // way for Maestro to target bottom tabs — tab labels render as
          // `text: ""` with `accessibilityText: "Home, tab, 1 of 4"` and
          // Maestro's `text:` selector doesn't match against accessibilityText.
          tabBarButtonTestID: 'tab-home',
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
          tabBarButtonTestID: 'tab-learn',
          tabBarIcon: ({ focused }) => (
            <BookIcon
              color={focused ? colorSystem.navigation.learn : colorSystem.gray[500]}
            />
          ),
        }}
      />

      {/* DEBUG-189: Insights renders directly (no FeatureGate wrap) so the
          in-screen `CollapsibleCrisisButton` (testID="crisis-insights") stays
          accessible. CLAUDE.md Safety Fact: "Crisis features ALWAYS accessible,
          regardless of subscription." The earlier paywall was incidental
          FEAT-16-deferral debris (FEAT-16 rescoped 2026-05-25 to V2). When
          FEAT-16 lands the real subscription UX, the gating decision (which
          screens, when in trial vs after trial, crisis-overlay placement on
          paywalls) gets designed end-to-end — don't reintroduce the wrapper
          without an explicit product call there. */}
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          headerTitle: 'Insights',
          headerShown: false, // InsightsScreen has its own SafeAreaView
          tabBarButtonTestID: 'tab-insights',
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
          headerShown: false, // ProfileScreen has its own SafeAreaView
          tabBarButtonTestID: 'tab-profile',
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