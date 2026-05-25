/**
 * Jest Setup for Local Development Testing
 * Enhanced setup with performance monitoring and clinical safety validation
 *
 * AUDIT TRAIL (INFRA-143 PR 4, post-audit):
 * All jest.mock() calls below are load-bearing — each one was added because
 * its target module either (a) imports an Expo/RN TurboModule whose binding
 * is undefined in the Jest env, or (b) calls native crypto / native storage
 * that has no JS-side implementation. Removing any of these mocks will
 * cause cascading "is not a function" or "Cannot find module" failures
 * across hundreds of tests. If a mock looks "dead" because nothing in
 * production calls it directly, verify the transitive import chain
 * (e.g., react-native-safe-area-context is pulled in by
 * @react-navigation/elements → MaskedView → NativeSafeAreaContext).
 *
 * Post-INFRA-158 specifics:
 *   - Touchable is re-exposed from the RN mock (commit 431fc0c) because
 *     react-native-svg@15.15.4 still uses Touchable.Mixin.
 *   - @expo/vector-icons is fully removed (migrated to
 *     @react-native-vector-icons/* — see lines 426 + 433).
 *   - expo-crypto exposes BOTH getRandomBytes and getRandomBytesAsync
 *     (EncryptionService.ts:948 uses the async variant).
 *
 * Any new mock added should follow these patterns:
 *   1. Comment explaining WHY (which TurboModule, which transitive chain)
 *   2. Cover all members the production code uses (no whack-a-mole)
 *   3. Add to quick-setup.js too if the mock is needed for *.quick.test.* files
 */

import '@testing-library/jest-native/extend-expect';

// react-native-reanimated: inline minimal mock. The library's shipped
// mock (require('react-native-reanimated/mock')) pulls in src/index.ts
// which transitively loads react-native-worklets and hits native binding
// gaps in the Jest env. This shim covers the imports the codebase uses
// without loading the runtime: Animated.View → RN View, worklets → no-op,
// useAnimatedStyle returns the style object directly.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  const Animated = {
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    createAnimatedComponent: (C) => C,
  };
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    useSharedValue: (init) => ({ value: init }),
    useAnimatedStyle: (fn) => {
      try { return fn() || {}; } catch { return {}; }
    },
    useAnimatedProps: (fn) => {
      try { return fn() || {}; } catch { return {}; }
    },
    withTiming: (val) => val,
    withRepeat: (val) => val,
    withDelay: (_d, val) => val,
    withSequence: (val) => val,
    withSpring: (val) => val,
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    cancelAnimation: jest.fn(),
    Easing: {
      ease: () => 0,
      linear: () => 0,
      bezier: () => () => 0,
      inOut: () => () => 0,
      in: () => () => 0,
      out: () => () => 0,
    },
    interpolate: (val) => val,
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  };
});

// react-native-gesture-handler: inline stub. Gesture/GestureDetector
// become passthrough containers.
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  const passthrough = ({ children }) => children;
  return {
    __esModule: true,
    GestureDetector: passthrough,
    GestureHandlerRootView: ({ children }) => React.createElement(RN.View, null, children),
    PanGestureHandler: passthrough,
    TapGestureHandler: passthrough,
    LongPressGestureHandler: passthrough,
    // Fluent gesture API: every method returns the same object so chains
    // like Gesture.Pan().onUpdate(fn).onEnd(fn).onFinalize(fn) compose
    // without errors. Each handler is a no-op in the test env.
    Gesture: (() => {
      const chain = new Proxy({}, {
        get: (_, prop) => {
          if (prop === 'then') return undefined; // not a thenable
          return (..._args) => chain;
        },
      });
      const factory = () => chain;
      return {
        Pan: factory,
        Tap: factory,
        LongPress: factory,
        Fling: factory,
        Pinch: factory,
        Rotation: factory,
        Native: factory,
        Manual: factory,
        Race: factory,
        Simultaneous: factory,
        Exclusive: factory,
      };
    })(),
    State: { UNDETERMINED: 0, FAILED: 1, BEGAN: 2, CANCELLED: 3, ACTIVE: 4, END: 5 },
    Directions: { RIGHT: 1, LEFT: 2, UP: 4, DOWN: 8 },
  };
});

// Performance monitoring for local development
global.performance = global.performance || {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {}
};

// Clinical safety test utilities
global.CLINICAL_SAFETY = {
  PHQ9_CRISIS_THRESHOLD: 20,
  GAD7_CRISIS_THRESHOLD: 15,
  CRISIS_RESPONSE_TIME_MS: 3000,
  EMERGENCY_NUMBER: '988'
};

// Test performance tracking
// MEMORY FIX (DEBUG-48): Limited results array to prevent unbounded growth
const MAX_PERFORMANCE_RESULTS = 100;

const testPerformance = {
  startTimes: new Map(),
  results: [],
  // Add result with size limit
  addResult(result) {
    if (this.results.length >= MAX_PERFORMANCE_RESULTS) {
      this.results.shift();
    }
    this.results.push(result);
  }
};

global.testPerformance = testPerformance;

// Enhanced beforeEach for performance tracking
beforeEach(() => {
  const testName = expect.getState().currentTestName;
  testPerformance.startTimes.set(testName, performance.now());
  
  // Clinical safety validation setup
  if (testName?.includes('crisis') || testName?.includes('Crisis')) {
    console.log(`🔒 CRISIS TEST: ${testName} - Safety protocols active`);
  }
});

// Enhanced afterEach for performance reporting
afterEach(() => {
  const testName = expect.getState().currentTestName;
  const startTime = testPerformance.startTimes.get(testName);

  if (startTime) {
    const duration = performance.now() - startTime;
    // MEMORY FIX (DEBUG-48): Use addResult with size limit
    testPerformance.addResult({
      testName,
      duration,
      timestamp: new Date().toISOString(),
      category: categorizeTest(testName)
    });

    // Clean up startTime entry (DEBUG-48 memory fix)
    testPerformance.startTimes.delete(testName);

    // Performance warnings for local development (only in verbose mode)
    if (process.env.JEST_VERBOSE && duration > 5000) {
      console.warn(`⚠️  SLOW TEST: ${testName} took ${duration.toFixed(2)}ms`);
    }

    // Crisis test performance validation
    if (testName?.includes('crisis') && duration > 3000) {
      console.error(`🚨 CRISIS PERFORMANCE VIOLATION: ${testName} took ${duration.toFixed(2)}ms (max: 3000ms)`);
    }
  }
});

// Test categorization for reporting
function categorizeTest(testName) {
  if (testName?.includes('crisis') || testName?.includes('Crisis')) return 'crisis';
  if (testName?.includes('clinical') || testName?.includes('Clinical')) return 'clinical';
  if (testName?.includes('performance') || testName?.includes('Performance')) return 'performance';
  if (testName?.includes('accessibility') || testName?.includes('Accessibility')) return 'accessibility';
  if (testName?.includes('security') || testName?.includes('Security')) return 'security';
  return 'unit';
}

// Global test utilities
global.testUtils = {
  // Clinical test data generators
  generatePHQ9Score: (severity = 'moderate') => {
    const scores = {
      minimal: Math.floor(Math.random() * 5), // 0-4
      mild: Math.floor(Math.random() * 5) + 5, // 5-9
      moderate: Math.floor(Math.random() * 5) + 10, // 10-14
      moderatelySevere: Math.floor(Math.random() * 5) + 15, // 15-19
      severe: Math.floor(Math.random() * 8) + 20 // 20-27
    };
    return scores[severity] || scores.moderate;
  },
  
  generateGAD7Score: (severity = 'moderate') => {
    const scores = {
      minimal: Math.floor(Math.random() * 5), // 0-4
      mild: Math.floor(Math.random() * 5) + 5, // 5-9
      moderate: Math.floor(Math.random() * 6) + 10, // 10-15
      severe: Math.floor(Math.random() * 6) + 15 // 15-21
    };
    return scores[severity] || scores.moderate;
  },
  
  // Crisis simulation utilities
  simulateCrisisDetection: () => ({
    phq9Score: Math.floor(Math.random() * 8) + 20, // 20-27
    gad7Score: Math.floor(Math.random() * 7) + 15, // 15-21
    timestamp: new Date().toISOString(),
    triggerType: 'assessment'
  }),
  
  // Performance testing utilities
  measurePerformance: (fn, name) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`⏱️  ${name}: ${(end - start).toFixed(2)}ms`);
    return { result, duration: end - start };
  },
  
  // Accessibility testing utilities
  mockScreenReader: () => ({
    announcements: [],
    announce: function(text) {
      this.announcements.push({
        text,
        timestamp: Date.now()
      });
    },
    getLastAnnouncement: function() {
      return this.announcements[this.announcements.length - 1];
    }
  })
};

// Mock React Native modules for testing
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  // Explicitly include only safe, non-deprecated React Native modules
  return {
    // Core UI Components (SAFE)
    View: RN.View,
    Text: RN.Text,
    ScrollView: RN.ScrollView,
    FlatList: RN.FlatList,
    SectionList: RN.SectionList,
    TouchableOpacity: RN.TouchableOpacity,
    TouchableHighlight: RN.TouchableHighlight,
    TouchableWithoutFeedback: RN.TouchableWithoutFeedback,
    // Touchable (with Mixin) — required by react-native-svg 15.x's SvgTouchableMixin
    // until upstream drops the legacy mixin pattern.
    Touchable: RN.Touchable,
    Pressable: RN.Pressable,
    Image: RN.Image,
    ImageBackground: RN.ImageBackground,
    TextInput: RN.TextInput,
    Switch: RN.Switch,
    ActivityIndicator: RN.ActivityIndicator,
    Modal: RN.Modal,
    StatusBar: RN.StatusBar,

    // Layout & Styling (SAFE)
    StyleSheet: RN.StyleSheet,

    // Platform & Utilities (SAFE)
    Platform: {
      OS: 'ios',
      select: jest.fn(obj => obj.ios || obj.default),
      Version: 15
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      set: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    },

    // Interaction APIs (SAFE)
    Alert: {
      alert: jest.fn(),
      prompt: jest.fn()
    },
    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
      canOpenURL: jest.fn(() => Promise.resolve(true)),
      getInitialURL: jest.fn(() => Promise.resolve(null))
    },

    // Accessibility APIs (SAFE)
    AccessibilityInfo: {
      announceForAccessibility: jest.fn(),
      isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
      isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
      isReduceTransparencyEnabled: jest.fn(() => Promise.resolve(false)),
      isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
      isGrayscaleEnabled: jest.fn(() => Promise.resolve(false)),
      isInvertColorsEnabled: jest.fn(() => Promise.resolve(false)),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      setAccessibilityFocus: jest.fn(),
    },

    // UIManager — minimal mock so getViewManagerConfig() returns an object
    // instead of undefined (needed by @react-navigation/elements MaskedView).
    UIManager: {
      getViewManagerConfig: jest.fn(() => ({ Commands: {}, Constants: {} })),
      hasViewManagerConfig: jest.fn(() => true),
      measure: jest.fn(),
      measureInWindow: jest.fn(),
      dispatchViewManagerCommand: jest.fn(),
    },

    // Animation (SAFE)
    Animated: RN.Animated,
    Easing: RN.Easing,

    // Keyboard (SAFE)
    Keyboard: {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      dismiss: jest.fn()
    },

    // App State (SAFE)
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn()
    },

    // BackHandler (SAFE - Android)
    BackHandler: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      exitApp: jest.fn()
    },

    // Vibration (SAFE)
    Vibration: {
      vibrate: jest.fn(),
      cancel: jest.fn()
    },

    // PanResponder (SAFE)
    PanResponder: RN.PanResponder,

    // Note: Explicitly EXCLUDING deprecated modules:
    // ❌ DevMenu (causes TurboModule error)
    // ❌ ProgressBarAndroid (deprecated)
    // ❌ SafeAreaView (use react-native-safe-area-context)
    // ❌ Clipboard (moved to @react-native-clipboard/clipboard)
    // ❌ DatePickerIOS (deprecated)
    // ❌ ImagePickerIOS (deprecated)
    // ❌ ImageStore (deprecated)
    // ❌ NetInfo (moved to @react-native-netinfo/netinfo)
    // ❌ TimePickerAndroid (deprecated)
    // ❌ ToastAndroid (use proper toast library)
    // ❌ ToolbarAndroid (deprecated)
    // ❌ ViewPagerAndroid (deprecated)
  };
});

// Mock Expo modules
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Heavy: 'heavy'
  }
}));

// Mock expo-crypto for cryptographic ID generation
jest.mock('expo-crypto', () => {
  const generateBytes = (length) => {
    // Pseudo-random bytes for testing (NOT cryptographically secure)
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  };
  return {
    getRandomBytes: jest.fn(generateBytes),
    // EncryptionService uses the async variant for master-key generation
    // (EncryptionService.ts:948). Previously missing — caused
    // `Crypto.getRandomBytesAsync is not a function` failures in
    // sync-coordinator-integration.test.ts (one of the INFRA-143
    // quarantined tests).
    getRandomBytesAsync: jest.fn(async (length) => generateBytes(length)),
    digestStringAsync: jest.fn(() => Promise.resolve('mockedhash123')),
    CryptoDigestAlgorithm: {
      SHA256: 'SHA-256',
      SHA512: 'SHA-512',
    },
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve())
}));

// NetInfo: factory mock — bare jest.mock(...) still loads the real native
// binding (RNCNetInfo TurboModule) before applying surface replacement.
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true, type: 'wifi' })),
    addEventListener: jest.fn(() => jest.fn()),
    configure: jest.fn(),
  },
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true, type: 'wifi' })),
  addEventListener: jest.fn(() => jest.fn()),
  useNetInfo: jest.fn(() => ({ isConnected: true, isInternetReachable: true, type: 'wifi' })),
  NetInfoStateType: { wifi: 'wifi', cellular: 'cellular', none: 'none', unknown: 'unknown' },
}));

// @react-native-vector-icons/*: factory mock — same expo-modules-core pitfall
// as @expo/vector-icons in pre-SDK-56 setup (migrated in INFRA-158).
jest.mock('@react-native-vector-icons/material-design-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, testID, ...rest }) =>
    React.createElement(Text, { testID: testID || `icon-${name}`, ...rest }, name);
  return new Proxy({}, { get: () => Icon });
});
jest.mock('@react-native-vector-icons/ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, testID, ...rest }) =>
    React.createElement(Text, { testID: testID || `icon-${name}`, ...rest }, name);
  return new Proxy({}, { get: () => Icon });
});

// expo-local-authentication: same expo-modules-core EventEmitter pitfall.
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(false)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(false)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: false })),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([])),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
}));

// react-native-aes-crypto: native TurboModule, undefined in Jest env.
jest.mock('react-native-aes-crypto', () => ({
  __esModule: true,
  default: {
    randomKey: jest.fn(() => Promise.resolve('mock-random-key-32-bytes-hex')),
    encrypt: jest.fn(() => Promise.resolve('mock-ciphertext')),
    decrypt: jest.fn(() => Promise.resolve('mock-plaintext')),
    hmac256: jest.fn(() => Promise.resolve('mock-hmac')),
    sha256: jest.fn(() => Promise.resolve('mock-sha256')),
    pbkdf2: jest.fn(() => Promise.resolve('mock-derived-key')),
  },
}));

// react-native-safe-area-context: hits NativeSafeAreaContext TurboModule when
// imported transitively via @react-navigation/elements.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const passthrough = ({ children }) => children;
  return {
    SafeAreaProvider: passthrough,
    SafeAreaConsumer: ({ children }) => children(inset),
    SafeAreaView: passthrough,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
    SafeAreaInsetsContext: { Consumer: ({ children }) => children(inset), Provider: passthrough },
    SafeAreaFrameContext: { Consumer: ({ children }) => children(frame), Provider: passthrough },
    initialWindowMetrics: { insets: inset, frame },
  };
});

// Global teardown for performance reporting
afterAll(() => {
  if (global.testPerformance?.results?.length > 0) {
    const results = global.testPerformance.results;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const slowTests = results.filter(r => r.duration > 1000);
    
    console.log('\n📊 Local Test Performance Summary:');
    console.log(`   Total tests: ${results.length}`);
    console.log(`   Average duration: ${avgDuration.toFixed(2)}ms`);
    
    if (slowTests.length > 0) {
      console.log(`   Slow tests (>1s): ${slowTests.length}`);
      slowTests.forEach(test => {
        console.log(`     - ${test.testName}: ${test.duration.toFixed(2)}ms`);
      });
    }
  }
});