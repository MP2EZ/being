/**
 * Jest Polyfills for React Native Testing
 * Provides necessary polyfills for test environment
 */

// Performance API polyfill for Node.js environment
if (typeof global.performance === 'undefined') {
  const { performance } = require('perf_hooks');
  global.performance = performance;
}

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
  },
}));

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    manifest: {},
  },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock performance-critical modules
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  return {
    default: {
      View: View,
      Text: Text,
      ScrollView: require('react-native').ScrollView,
    },
    Easing: {},
    Transition: {},
    Transitioning: {},
    useSharedValue: jest.fn((initialValue) => ({ value: initialValue })),
    useAnimatedStyle: jest.fn((fn) => fn()),
    useAnimatedProps: jest.fn(() => ({})),
    useAnimatedRef: jest.fn(),
    useDerivedValue: jest.fn((fn) => ({ value: fn() })),
    withSpring: jest.fn((value) => value),
    withTiming: jest.fn((value) => value),
    withDelay: jest.fn((delay, value) => value),
    withSequence: jest.fn((...values) => values[values.length - 1]),
    withRepeat: jest.fn((value) => value),
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    interpolate: jest.fn((value, inputRange, outputRange) => outputRange[0]),
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  };
});

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: jest.fn(() => ({
      onUpdate: jest.fn().mockReturnThis(),
      onEnd: jest.fn().mockReturnThis(),
    })),
  },
  GestureDetector: ({ children }) => children,
  State: {},
  Directions: {},
}));

// Global test timeout for crisis detection
global.TEST_TIMEOUT = 5000;