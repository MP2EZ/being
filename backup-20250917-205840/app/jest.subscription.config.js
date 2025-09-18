/**
 * Jest Configuration for Subscription System Testing
 * Day 17 Phase 5: Specialized configuration for subscription testing
 */

module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/__tests__/subscription/setup.ts'
  ],
  testMatch: [
    '<rootDir>/__tests__/subscription/**/*.test.{ts,tsx}'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/store/subscriptionStore.ts',
    'src/hooks/useSubscription.ts',
    'src/hooks/useFeatureGate.ts',
    'src/components/FeatureGate/**/*.{ts,tsx}',
    'src/components/Subscription/**/*.{ts,tsx}',
    'src/services/PaymentService.ts',
    'src/types/subscription.ts',
    '!**/node_modules/**',
    '!**/*.test.{ts,tsx}',
    '!**/__mocks__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // Crisis safety features require 100% coverage
    'src/hooks/useCrisisMode.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'src/services/CrisisProtectionService.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  testEnvironment: 'jsdom',
  testTimeout: 30000, // 30 seconds for performance tests
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,

  // Performance testing configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '__tests__/subscription/reports',
        outputName: 'subscription-test-results.xml'
      }
    ]
  ],

  // Mock configuration for subscription testing
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1'
  },

  // Global test setup
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx'
      }
    },
    // Performance testing globals
    SUBSCRIPTION_PERFORMANCE_MODE: true,
    CRISIS_SAFETY_VALIDATION: true,
    THERAPEUTIC_MESSAGING_CHECK: true
  },

  // Test environment variables
  testEnvironmentOptions: {
    url: 'http://localhost'
  },

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Subscription-specific test patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/(?!subscription).*' // Only run subscription tests
  ],

  // Performance monitoring
  maxWorkers: '50%', // Optimize for CI/CD environments

  // Error handling for subscription tests
  errorOnDeprecated: true,
  bail: false, // Continue testing even if some tests fail

  // Subscription testing extensions
  setupFiles: [
    '<rootDir>/__tests__/subscription/polyfills.ts'
  ]
};