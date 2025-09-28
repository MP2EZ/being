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
jest.mock('react-native-reanimated', () => ({
  default: {},
  Easing: {},
  Transition: {},
  Transitioning: {},
}));

// Global test timeout for crisis detection
global.TEST_TIMEOUT = 5000;