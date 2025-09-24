/**
 * Minimal Root Navigator - Testing navigation property descriptor issues
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useUserStore } from '../store/userStoreFixed';
import { useSimpleThemeColors } from '../contexts/SimpleThemeContext';
import HomeScreen from '../screens/HomeScreen';
import BreathingScreen from '../screens/BreathingScreen';
import CheckInScreen from '../screens/CheckInScreen';

const Stack = createStackNavigator();

const TestScreen = ({ navigation }: any) => {
  const { user, isLoading, isAuthenticated, initializeStore } = useUserStore();
  const colors = useSimpleThemeColors();

  useEffect(() => {
    console.log('🧪 Testing FIXED userStore...');
    initializeStore();
  }, [initializeStore]);

  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: 20
    }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>
        🔧 Testing FIXED UserStore + Simple Theme
      </Text>
      <Text style={{ fontSize: 14, marginTop: 5, color: colors.textSecondary }}>
        No native services - New Architecture compatible
      </Text>
      <Text style={{ marginTop: 10, color: colors.text }}>
        Status: {isLoading ? '⏳ Loading...' : user ? `✅ User: ${user.name}` : '❌ No user'}
      </Text>
      <Text style={{ marginTop: 5, color: colors.text }}>
        Authenticated: {isAuthenticated ? '✅ Yes' : '❌ No'}
      </Text>
      <Text style={{ marginTop: 10, color: user ? colors.success : colors.error }}>
        {user ? '🎉 FIXED userStore + SimpleTheme works!' : '🔍 Testing fixed store...'}
      </Text>
      <Text style={{
        fontSize: 12,
        marginTop: 15,
        color: colors.textSecondary,
        textAlign: 'center'
      }}>
        Theme: {colors.primary} (Therapeutic Blue-Green)
      </Text>

      <Pressable
        style={{
          backgroundColor: colors.primary,
          borderRadius: 12,
          padding: 16,
          marginTop: 30,
          minWidth: 200,
          alignItems: 'center'
        }}
        onPress={() => navigation.navigate('HomeScreen')}
      >
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: 'white'
        }}>
          🏠 Go to Home Screen
        </Text>
      </Pressable>
    </View>
  );
};

const MinimalRootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="TestScreen" component={TestScreen} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="BreathingScreen" component={BreathingScreen} />
        <Stack.Screen name="CheckInScreen" component={CheckInScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default MinimalRootNavigator;