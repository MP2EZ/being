/**
 * Clean Tab Navigator - Fresh start approach
 * Minimal bottom tabs without crypto dependencies
 * Therapeutic design with DRD-compliant navigation
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colorSystem, spacing } from '../constants/colors';

// Clean screen imports (no crypto dependencies)
import CleanHomeScreen from '../screens/home/CleanHomeScreen';

const Tab = createBottomTabNavigator();

// Simple therapeutic icons
const HomeIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path 
      d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" 
      fill={color} 
    />
  </Svg>
);

const HeartIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path 
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
      fill={color} 
    />
  </Svg>
);

const ChartIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path 
      d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" 
      fill={color} 
    />
  </Svg>
);

const PersonIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="6" r="4" fill={color} />
    <Path 
      d="M12 14c-6 0-8 2-8 4v2h16v-2c0-2-2-4-8-4z" 
      fill={color} 
    />
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
        tabBarActiveTintColor: colorSystem.themes.morning.primary,
        tabBarInactiveTintColor: colorSystem.gray[500],
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
            <HomeIcon color={focused ? colorSystem.themes.morning.primary : color} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="Exercises" 
        component={() => (
          <PlaceholderScreen 
            name="Mindful Exercises"
            description="Breathing exercises, meditation, and MBCT practices to support your wellbeing journey."
          />
        )}
        options={{
          headerTitle: 'Exercises',
          tabBarIcon: ({ focused, color }) => (
            <HeartIcon color={focused ? colorSystem.themes.midday.primary : color} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="Insights" 
        component={() => (
          <PlaceholderScreen 
            name="Your Insights"
            description="Track your progress, view patterns, and understand your mindfulness journey over time."
          />
        )}
        options={{
          headerTitle: 'Insights',
          tabBarIcon: ({ focused, color }) => (
            <ChartIcon color={focused ? colorSystem.themes.evening.primary : color} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="Profile" 
        component={() => (
          <PlaceholderScreen 
            name="Your Profile"
            description="Manage your account, preferences, and personalize your Being. experience."
          />
        )}
        options={{
          headerTitle: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <PersonIcon color={focused ? colorSystem.base.midnightBlue : color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default CleanTabNavigator;