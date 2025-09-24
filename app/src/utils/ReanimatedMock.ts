/**
 * React Native Reanimated Mock for New Architecture Compatibility
 *
 * This mock provides safe fallbacks for reanimated features to prevent
 * property descriptor conflicts while maintaining component functionality.
 */

import React from 'react';
import { View, Animated as RNAnimated } from 'react-native';

// Debug log to verify mock is being loaded
console.log('🔧 ReanimatedMock loaded - property descriptor conflicts should be resolved');

// Mock Animated component that behaves like regular View
export const Animated = {
  View: View,
  Text: RNAnimated.Text,
  ScrollView: RNAnimated.ScrollView,
  FlatList: RNAnimated.FlatList,
};

// Mock hooks that return safe fallbacks
export const useSharedValue = (initialValue: any) => {
  const ref = React.useRef({ value: initialValue });
  return ref.current;
};

export const useAnimatedStyle = (styleFunction: () => any) => {
  // Return the static style without animation
  return React.useMemo(() => {
    try {
      return styleFunction();
    } catch {
      return {};
    }
  }, []);
};

// Mock animation functions that return the end value immediately
export const withSpring = (toValue: any) => toValue;
export const withTiming = (toValue: any) => toValue;
export const withRepeat = (animation: any) => animation;
export const withSequence = (...animations: any[]) => animations[animations.length - 1];

// Mock interpolateColor that returns the first color
export const interpolateColor = (value: any, inputRange: number[], outputRange: string[]) => {
  return outputRange[0];
};

// Default export
export default {
  View,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolateColor,
};