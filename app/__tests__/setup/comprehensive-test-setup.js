/**
 * COMPREHENSIVE TEST SETUP
 * Week 2 Orchestration Plan - Global Test Configuration
 * 
 * GLOBAL TEST ENVIRONMENT:
 * - Mock React Native components and APIs
 * - Configure performance monitoring
 * - Set up safety and compliance validation
 * - Initialize test utilities and helpers
 * - Configure reporting and metrics collection
 */

import { jest } from '@jest/globals';
import 'react-native-get-random-values'; // For crypto operations

// Global test configuration
global.__TEST__ = true;
global.__COMPREHENSIVE_TESTING__ = true;
global.__WEEK_2_ORCHESTRATION__ = true;

// Performance monitoring globals
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn()
};

// Test metrics collection
global.testMetrics = {
  clinicalAccuracy: [],
  performanceBenchmarks: [],
  safetyViolations: [],
  complianceChecks: [],
  emergencyResponses: []
};

// Mock React Native core modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn(options => options.ios)
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  Alert: {
    alert: jest.fn((title, message, buttons, options) => {
      // Track emergency alerts for safety testing
      if (title && title.includes('Crisis')) {
        global.testMetrics.emergencyResponses.push({
          title,
          message,
          buttons: buttons?.map(b => ({ text: b.text, style: b.style })),
          timestamp: Date.now()
        });
      }
      
      // Auto-trigger first button for automated testing
      if (buttons && buttons.length > 0 && buttons[0].onPress) {
        setTimeout(() => buttons[0].onPress(), 10);
      }
    })
  },
  Linking: {
    openURL: jest.fn().mockResolvedValue(true),
    canOpenURL: jest.fn().mockResolvedValue(true)
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  BackHandler: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    exitApp: jest.fn()
  },
  Keyboard: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    dismiss: jest.fn()
  },
  StatusBar: {
    setBarStyle: jest.fn(),
    setBackgroundColor: jest.fn(),
    setHidden: jest.fn()
  },
  DeviceEventEmitter: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    emit: jest.fn()
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn()
  })),
  NativeModules: {},
  PixelRatio: {
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1)
  },
  StyleSheet: {
    create: jest.fn(styles => styles),
    flatten: jest.fn(style => style),
    hairlineWidth: 1
  }
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    setOptions: jest.fn(),
    isFocused: jest.fn(() => true),
    addListener: jest.fn()
  })),
  useRoute: jest.fn(() => ({
    params: {},
    name: 'TestScreen',
    key: 'test-key'
  })),
  useFocusEffect: jest.fn(callback => {
    callback();
  }),
  NavigationContainer: ({ children }) => children,
  createNavigationContainerRef: jest.fn()
}));

// Mock Expo modules
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true)
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
  multiSet: jest.fn().mockResolvedValue(undefined),
  multiGet: jest.fn().mockResolvedValue([]),
  multiRemove: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([])
}));

// Mock Zustand for state management testing
jest.mock('zustand', () => ({
  create: jest.fn().mockImplementation((stateCreator) => {
    let state = {};
    const listeners = new Set();
    
    const setState = (partial, replace) => {
      const nextState = typeof partial === 'function' 
        ? partial(state) 
        : partial;
      
      state = replace ? nextState : { ...state, ...nextState };
      listeners.forEach(listener => listener(state));
    };
    
    const getState = () => state;
    
    const subscribe = (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };
    
    const destroy = () => {
      listeners.clear();
    };
    
    const api = { setState, getState, subscribe, destroy };
    state = stateCreator(setState, getState, api);
    
    return Object.assign(getState, api);
  })
}));

// Mock crypto for encryption testing
const mockCrypto = {
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  randomUUID: jest.fn(() => 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    })
  )
};

global.crypto = mockCrypto;
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

// Console configuration for testing
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn((...args) => {
    // Track performance logs
    const message = args.join(' ');
    if (message.includes('ms') && (message.includes('Crisis') || message.includes('Performance'))) {
      global.testMetrics.performanceBenchmarks.push({
        message,
        timestamp: Date.now()
      });
    }
    
    // Call original console.log in development
    if (process.env.NODE_ENV !== 'test' || process.env.VERBOSE_TESTING) {
      originalConsole.log(...args);
    }
  }),
  warn: jest.fn((...args) => {
    // Track safety violations
    const message = args.join(' ');
    if (message.includes('exceeded') || message.includes('violation') || message.includes('failed')) {
      global.testMetrics.safetyViolations.push({
        level: 'WARNING',
        message,
        timestamp: Date.now()
      });
    }
    
    if (process.env.NODE_ENV !== 'test' || process.env.VERBOSE_TESTING) {
      originalConsole.warn(...args);
    }
  }),
  error: jest.fn((...args) => {
    // Track critical errors
    const message = args.join(' ');
    global.testMetrics.safetyViolations.push({
      level: 'ERROR',
      message,
      timestamp: Date.now()
    });
    
    if (process.env.NODE_ENV !== 'test' || process.env.VERBOSE_TESTING) {
      originalConsole.error(...args);
    }
  }),
  info: originalConsole.info,
  debug: originalConsole.debug
};

// Test utilities
global.testUtils = {
  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate test data
  generatePHQ9Answers: (targetScore) => {
    const answers = new Array(9).fill(0);
    let remainingScore = targetScore;
    
    for (let i = 0; i < 9 && remainingScore > 0; i++) {
      const maxForQuestion = Math.min(remainingScore, 3);
      answers[i] = maxForQuestion;
      remainingScore -= maxForQuestion;
    }
    
    return answers;
  },
  
  generateGAD7Answers: (targetScore) => {
    const answers = new Array(7).fill(0);
    let remainingScore = targetScore;
    
    for (let i = 0; i < 7 && remainingScore > 0; i++) {
      const maxForQuestion = Math.min(remainingScore, 3);
      answers[i] = maxForQuestion;
      remainingScore -= maxForQuestion;
    }
    
    return answers;
  },
  
  // Performance measurement
  measurePerformance: (label, fn) => {
    const start = Date.now();
    const result = fn();
    const duration = Date.now() - start;
    
    global.testMetrics.performanceBenchmarks.push({
      label,
      duration,
      timestamp: Date.now()
    });
    
    return { result, duration };
  },
  
  // Safety validation
  validateSafetyRequirement: (requirement, actualValue, expectedValue) => {
    const passed = actualValue <= expectedValue;
    
    if (!passed) {
      global.testMetrics.safetyViolations.push({
        level: 'SAFETY_VIOLATION',
        requirement,
        actual: actualValue,
        expected: expectedValue,
        timestamp: Date.now()
      });
    }
    
    return passed;
  },
  
  // Compliance tracking
  recordComplianceCheck: (domain, check, passed) => {
    global.testMetrics.complianceChecks.push({
      domain,
      check,
      passed,
      timestamp: Date.now()
    });
  }
};

// Test environment cleanup
afterEach(() => {
  // Clear all timers
  jest.clearAllTimers();
  
  // Reset all mocks
  jest.clearAllMocks();
  
  // Clear DOM if needed
  if (global.document) {
    global.document.body.innerHTML = '';
  }
});

afterAll(() => {
  // Generate final test metrics report
  if (process.env.GENERATE_TEST_METRICS) {
    const report = {
      summary: {
        clinicalAccuracyTests: global.testMetrics.clinicalAccuracy.length,
        performanceBenchmarks: global.testMetrics.performanceBenchmarks.length,
        safetyViolations: global.testMetrics.safetyViolations.length,
        complianceChecks: global.testMetrics.complianceChecks.length,
        emergencyResponses: global.testMetrics.emergencyResponses.length
      },
      details: global.testMetrics
    };
    
    console.log('\n=== COMPREHENSIVE TEST METRICS REPORT ===');
    console.log(JSON.stringify(report, null, 2));
    console.log('=== END TEST METRICS REPORT ===\n');
  }
});

// Error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  global.testMetrics.safetyViolations.push({
    level: 'UNHANDLED_REJECTION',
    reason: reason?.toString(),
    timestamp: Date.now()
  });
});

// Suppress specific warnings for testing
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args.join(' ');
  
  // Suppress known testing warnings
  if (
    message.includes('Warning: ReactDOM.render is deprecated') ||
    message.includes('Warning: componentWillReceiveProps') ||
    message.includes('Mock function')
  ) {
    return;
  }
  
  originalWarn(...args);
};