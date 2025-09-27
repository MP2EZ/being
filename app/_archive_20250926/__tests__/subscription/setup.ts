/**
 * Subscription Testing Setup
 * Day 17 Phase 5: Global test configuration for subscription system
 */

import '@testing-library/jest-native/extend-expect';

// Performance testing polyfills
global.performance = global.performance || {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {},
  getEntriesByName: () => [],
  getEntriesByType: () => [],
  clearMarks: () => {},
  clearMeasures: () => {}
} as any;

// Memory monitoring polyfill
Object.defineProperty(global.performance, 'memory', {
  value: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
  },
  writable: true
});

// Crisis safety testing constants
global.CRISIS_SAFETY_CONSTANTS = {
  MAX_CRISIS_RESPONSE_TIME: 200, // ms
  CRISIS_FEATURES: [
    'crisis_button',
    'breathing_exercises',
    'emergency_contacts',
    'hotline_988'
  ],
  EMERGENCY_NUMBERS: {
    CRISIS_HOTLINE: '988',
    EMERGENCY: '911'
  }
};

// Subscription performance constants
global.SUBSCRIPTION_PERFORMANCE_CONSTANTS = {
  MAX_SUBSCRIPTION_VALIDATION_TIME: 500, // ms
  MAX_FEATURE_VALIDATION_TIME: 100, // ms
  MIN_CACHE_HIT_RATE: 0.95, // 95%
  MAX_MEMORY_GROWTH: 1024 * 1024 // 1MB
};

// Therapeutic messaging validation
global.THERAPEUTIC_MESSAGING_RULES = {
  FORBIDDEN_PHRASES: [
    'buy now',
    'limited time',
    'act fast',
    'hurry up',
    'sale ends',
    'don\'t miss out'
  ],
  REQUIRED_TONE: [
    'mindful',
    'journey',
    'practice',
    'wellness',
    'choice',
    'support'
  ]
};

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  // Filter out React Native warnings and other noise
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Warning: ReactDOM.render') ||
     message.includes('Warning: findDOMNode') ||
     message.includes('validateDOMNesting'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args: any[]) => {
  // Filter out performance warnings during testing
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Performance warning') ||
     message.includes('Slow operation detected'))
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

// Test utilities for subscription testing
global.testUtils = {
  // Crisis safety validation helper
  validateCrisisSafety: (featureKey: string, accessResult: any) => {
    if (global.CRISIS_SAFETY_CONSTANTS.CRISIS_FEATURES.includes(featureKey)) {
      expect(accessResult.hasAccess).toBe(true);
      expect(accessResult.validationTime).toBeLessThan(
        global.CRISIS_SAFETY_CONSTANTS.MAX_CRISIS_RESPONSE_TIME
      );
    }
  },

  // Performance validation helper
  validatePerformance: (operation: string, duration: number) => {
    const limits = global.SUBSCRIPTION_PERFORMANCE_CONSTANTS;

    switch (operation) {
      case 'subscription_validation':
        expect(duration).toBeLessThan(limits.MAX_SUBSCRIPTION_VALIDATION_TIME);
        break;
      case 'feature_validation':
        expect(duration).toBeLessThan(limits.MAX_FEATURE_VALIDATION_TIME);
        break;
      default:
        // Generic performance check
        expect(duration).toBeLessThan(1000); // 1 second max
    }
  },

  // Therapeutic messaging validation helper
  validateTherapeuticMessaging: (message: string) => {
    const rules = global.THERAPEUTIC_MESSAGING_RULES;

    // Check for forbidden phrases
    rules.FORBIDDEN_PHRASES.forEach(phrase => {
      expect(message.toLowerCase()).not.toContain(phrase.toLowerCase());
    });

    // Should contain at least one therapeutic tone indicator
    const hasTherapeuticTone = rules.REQUIRED_TONE.some(tone =>
      message.toLowerCase().includes(tone.toLowerCase())
    );

    if (message.length > 50) { // Only check longer messages
      expect(hasTherapeuticTone).toBe(true);
    }
  },

  // Mock subscription states
  createMockSubscriptionState: (overrides = {}) => ({
    tier: 'free',
    status: 'active',
    crisisAccessGuaranteed: true,
    crisisFeatureOverrides: [],
    lastValidated: new Date().toISOString(),
    validationLatency: 75,
    ...overrides
  }),

  createMockTrialState: (overrides = {}) => ({
    isActive: true,
    daysRemaining: 7,
    originalDuration: 7,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    extendedForCrisis: false,
    crisisExtensionDays: 0,
    gracePeriodActive: false,
    ...overrides
  }),

  createMockFeatureAccessResult: (overrides = {}) => ({
    hasAccess: true,
    reason: 'granted',
    userMessage: 'Feature available',
    validationTime: 65,
    cacheHit: false,
    crisisMode: false,
    crisisOverrideActive: false,
    ...overrides
  }),

  // Performance measurement helper
  measureAsync: async (fn: () => Promise<any>) => {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    return {
      result,
      duration: endTime - startTime
    };
  },

  // Wait for async operations
  waitForAsync: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))
};

// Enhanced expect matchers for subscription testing
expect.extend({
  toBeWithinPerformanceLimit(received: number, limit: number) {
    const pass = received <= limit;
    return {
      message: () =>
        pass
          ? `Expected ${received}ms to exceed ${limit}ms`
          : `Expected ${received}ms to be within ${limit}ms limit`,
      pass
    };
  },

  toHaveCrisisSafetyAccess(received: any) {
    const hasAccess = received.hasAccess === true;
    const fastResponse = received.validationTime < global.CRISIS_SAFETY_CONSTANTS.MAX_CRISIS_RESPONSE_TIME;
    const pass = hasAccess && fastResponse;

    return {
      message: () =>
        pass
          ? `Expected crisis feature to be restricted`
          : `Expected crisis feature to have safe access (hasAccess: ${hasAccess}, responseTime: ${received.validationTime}ms)`,
      pass
    };
  },

  toHaveTherapeuticTone(received: string) {
    const rules = global.THERAPEUTIC_MESSAGING_RULES;
    const hasForbiddenPhrase = rules.FORBIDDEN_PHRASES.some(phrase =>
      received.toLowerCase().includes(phrase.toLowerCase())
    );
    const hasTherapeuticTone = rules.REQUIRED_TONE.some(tone =>
      received.toLowerCase().includes(tone.toLowerCase())
    );

    const pass = !hasForbiddenPhrase && (received.length <= 50 || hasTherapeuticTone);

    return {
      message: () =>
        pass
          ? `Expected message to have non-therapeutic tone`
          : `Expected therapeutic tone in message: "${received}"`,
      pass
    };
  }
});

// Global test cleanup
afterEach(() => {
  // Clean up any timers or intervals
  jest.clearAllTimers();

  // Reset performance markers
  if (global.performance.clearMarks) {
    global.performance.clearMarks();
  }
  if (global.performance.clearMeasures) {
    global.performance.clearMeasures();
  }
});

// Global error handling for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection in subscription tests:', reason);
});

// Export for use in tests
export {};