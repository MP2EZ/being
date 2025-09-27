/**
 * Payment Sync Resilience Test Configuration
 *
 * Specialized Jest configuration for comprehensive payment sync resilience testing
 * Includes extended timeouts, memory monitoring, and security validation
 */

module.exports = {
  displayName: 'Payment Sync Resilience Tests',
  testMatch: [
    '<rootDir>/__tests__/payment-sync-resilience/**/*.test.{ts,tsx}'
  ],
  testEnvironment: 'react-native',
  testTimeout: 120000, // 2 minutes for resilience stress tests

  // Memory and performance monitoring
  logHeapUsage: true,
  detectLeaks: true,

  // Coverage thresholds for resilience testing
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Payment sync resilience components require high coverage
    'src/services/cloud/PaymentSyncResilienceAPI.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/services/cloud/PaymentSyncConflictResolution.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/services/cloud/PaymentSyncPerformanceOptimizer.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },

  // Setup files for resilience testing
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/jest.setup.js',
    '<rootDir>/__tests__/payment-sync-resilience/setup/resilience-test-setup.js'
  ],

  // Custom reporters for resilience metrics
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/payment-sync-resilience',
      outputName: 'resilience-test-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },

  // Module mapping for resilience testing
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@resilience/(.*)$': '<rootDir>/src/services/cloud/$1',
    '^@security/(.*)$': '<rootDir>/src/services/security/$1'
  },

  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    },
    // Resilience test configuration
    RESILIENCE_TEST_CONFIG: {
      ENABLE_PERFORMANCE_MONITORING: true,
      ENABLE_MEMORY_TRACKING: true,
      ENABLE_SECURITY_VALIDATION: true,
      MAX_TEST_DURATION_MS: 120000,
      CRISIS_RESPONSE_THRESHOLD_MS: 200,
      MEMORY_LIMIT_MB: 100
    }
  },

  // Test sequencing for resilience
  testSequencer: '<rootDir>/__tests__/payment-sync-resilience/setup/resilience-test-sequencer.js'
};