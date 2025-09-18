/**
 * Main Tab Navigator - Bottom tabs with theme-aware icons
 * Home, Exercises, Insights, Profile with SOS button always visible
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Polygon } from 'react-native-svg';
import { colorSystem } from '../constants/colors';
import { BrainIcon } from '../components/core';

// Screen imports
import HomeScreen from '../screens/home/HomeScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
// import ExercisesNavigator from '../screens/exercises/ExercisesNavigator';
// import InsightsScreen from '../screens/insights/InsightsScreen';

const Tab = createBottomTabNavigator();

// SOS Button Component - Always visible in header
const SOSButton: React.FC = () => {
  const navigation = useNavigation();
  
  const handleSOSPress = () => {
    Alert.alert(
      'Crisis Support',
      'If you are having thoughts of suicide or self-harm, please reach out for help immediately.',
      [
        {
          text: 'Crisis Plan',
          onPress: () => {
            (navigation as any).navigate('CrisisPlan');
          },
          style: 'default'
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  return (
    <TouchableOpacity
      onPress={handleSOSPress}
      style={{
        backgroundColor: colorSystem.status.error,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 16,
      }}
    >
      <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>SOS</Text>
    </TouchableOpacity>
  );
};

// Navigation Icons
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
    <Polygon points="12,2 22,20 2,20" fill={color} />
  </Svg>
);

// Placeholder screen components (will be replaced with real screens)
const PlaceholderScreen: React.FC<{ name: string }> = ({ name }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorSystem.base.white }}>
    <Text style={{ fontSize: 18, color: colorSystem.gray[600] }}>{name} Screen</Text>
    <Text style={{ fontSize: 14, color: colorSystem.gray[500], marginTop: 8 }}>Coming soon...</Text>
  </View>
);

const MainTabNavigator: React.FC = () => {
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
        },
        tabBarActiveTintColor: colorSystem.base.black,
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
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: colorSystem.base.black,
        },
        headerRight: () => <SOSButton />,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          headerTitle: 'FullMind',
          headerShown: false, // HomeScreen has its own SafeAreaView
          tabBarIcon: ({ focused, color }) => (
            <DiamondIcon color={focused ? colorSystem.themes.morning.primary : color} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="Exercises" 
        component={() => <PlaceholderScreen name="Exercises" />}
        options={{
          headerTitle: 'Exercises',
          tabBarIcon: ({ focused, color }) => (
            <StarIcon color={focused ? colorSystem.themes.midday.primary : color} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="Insights" 
        component={() => <PlaceholderScreen name="Insights" />}
        options={{
          headerTitle: 'Insights',
          tabBarIcon: ({ focused, color }) => (
            <TriangleIcon color={focused ? colorSystem.themes.evening.primary : color} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          headerTitle: 'Profile',
          headerShown: false, // ProfileScreen has its own SafeAreaView
          tabBarIcon: ({ focused, color }) => (
            <BrainIcon 
              size={28}
              color={focused ? colorSystem.base.midnightBlue : color} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;