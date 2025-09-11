/**
 * React Native Mock Setup
 * Provides mock implementations for React Native modules in tests
 */

// Mock React Native core modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  return Object.setPrototypeOf(
    {
      Alert: {
        alert: jest.fn(),
      },
      Platform: {
        OS: 'ios',
        Version: '14.0',
        select: jest.fn((options) => options.ios || options.default),
      },
      Dimensions: {
        get: jest.fn(() => ({ width: 375, height: 812 })),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
      Animated: {
        ...RN.Animated,
        timing: () => ({
          start: jest.fn(),
        }),
        spring: () => ({
          start: jest.fn(),
        }),
        Value: jest.fn(() => ({
          setValue: jest.fn(),
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
        createAnimatedComponent: jest.fn(),
      },
      Easing: {
        linear: jest.fn(),
        ease: jest.fn(),
        bezier: jest.fn(),
      },
      // Mock performance-critical components
      InteractionManager: {
        runAfterInteractions: jest.fn((callback) => {
          callback();
          return { cancel: jest.fn() };
        }),
        createInteractionHandle: jest.fn(() => 'handle'),
        clearInteractionHandle: jest.fn(),
      },
      // Mock for breathing circle animation tests
      requestAnimationFrame: jest.fn((callback) => {
        callback();
        return 1;
      }),
      cancelAnimationFrame: jest.fn(),
    },
    RN
  );
});

// Mock safe area context for consistent layout testing
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock Reanimated for animation testing
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  
  // Add custom mock for breathing circle animation
  Reanimated.default.createAnimatedComponent = jest.fn();
  Reanimated.default.useSharedValue = jest.fn(() => ({
    value: 0,
  }));
  Reanimated.default.useAnimatedStyle = jest.fn(() => ({}));
  Reanimated.default.withTiming = jest.fn((value) => value);
  Reanimated.default.withRepeat = jest.fn((value) => value);
  Reanimated.default.withSequence = jest.fn((...values) => values[0]);
  
  return Reanimated;
});

// Mock gesture handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    PanGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    State: {},
    Directions: {},
  };
});

// Mock slider component for assessment tests
jest.mock('@react-native-community/slider', () => 'Slider');

// Mock SVG for icon tests
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Path: 'Path',
  G: 'G',
}));

console.log('React Native mocks initialized for testing environment');