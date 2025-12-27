/**
 * Enhanced Jest Configuration - Consolidated Development Setup
 * Combines: jest.local.config.js + jest.quick.config.js → jest.config.js
 *
 * Features:
 * - Development optimizations for local testing
 * - Quick test patterns for rapid iteration
 * - Performance monitoring and clinical safety validation
 * - Flexible execution modes (normal, quick, coverage)
 */

const isQuickMode = process.env.JEST_QUICK === 'true';
const isDevMode = process.env.NODE_ENV === 'development' || !process.env.CI;

module.exports = {
  preset: 'react-native',

  // Setup files for different test types
  setupFiles: [
    '<rootDir>/__tests__/setup/polyfills.js'
  ],

  setupFilesAfterEnv: isQuickMode ? [
    '<rootDir>/__tests__/setup/quick-setup.js'
  ] : [
    '<rootDir>/__tests__/setup/jest.setup.js',
    '<rootDir>/__tests__/setup/performance-monitoring.js'
  ],

  // Test discovery patterns - Quick mode vs full mode
  testMatch: isQuickMode ? [
    '<rootDir>/src/**/*.quick.test.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/quick/**/*.{js,jsx,ts,tsx}'
  ] : [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/?(*.)(test|spec).{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}'
  ],

  // Ignore patterns for faster runs in quick mode
  testPathIgnorePatterns: isQuickMode ? [
    '/node_modules/',
    '/.expo/',
    '/android/',
    '/ios/',
    '/_archive_[^/]*/',
    '/.to_delete_removed/',
    '.*\\.e2e\\.test\\.',
    '.*\\.integration\\.test\\.',
    '.*\\.performance\\.test\\.',
    '/integration/',
    '/e2e/',
    '/performance/'
  ] : [
    '/node_modules/',
    '/.expo/',
    '/android/',
    '/ios/',
    '/_archive_[^/]*/',
    '/.to_delete_removed/'
  ],

  // Module extensions and transformations
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },

  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-vector-icons|@react-navigation|react-navigation|expo|@expo|expo-in-app-purchases|expo-modules-core|zustand|react-native-gesture-handler|react-native-reanimated|uuid)/)'
  ],

  // Enhanced module mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
    '^@setup/(.*)$': '<rootDir>/__tests__/setup/$1',
    '^@utils/(.*)$': '<rootDir>/__tests__/utils/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@flows/(.*)$': '<rootDir>/src/flows/$1',
    '^@stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1'
  },

  // Coverage configuration
  collectCoverage: process.env.JEST_COVERAGE === 'true' && !isQuickMode,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,ts,tsx}',
    '!src/**/*.config.{js,ts}',
    '!src/**/index.{js,ts,tsx}'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/coverage/',
    '.d.ts$'
  ],

  // Coverage thresholds for development validation
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    // Critical components require higher coverage
    './src/components/crisis/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/services/clinical/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Performance and execution optimization
  // MEMORY FIX (DEBUG-48): Added workerIdleMemoryLimit to help with garbage collection
  cache: true,
  cacheDirectory: isQuickMode ? '<rootDir>/.jest-cache-quick' : '<rootDir>/.jest-cache',
  maxWorkers: isQuickMode ? 1 : '50%',
  testTimeout: isQuickMode ? 5000 : 10000,
  workerIdleMemoryLimit: '512MB', // Restart workers that exceed memory limit

  // Feedback and monitoring
  bail: false, // Continue on failures for comprehensive feedback
  verbose: !isQuickMode,
  detectOpenHandles: isDevMode,
  forceExit: false,
  errorOnDeprecated: true,
  testFailureExitCode: 1,

  // Reporters - Quick vs Full
  reporters: isQuickMode ? [
    ['default', { verbose: false }],
    '<rootDir>/__tests__/reporters/quick-reporter.js'
  ] : [
    'default',
    ['<rootDir>/__tests__/reporters/performance-regression-reporter.js', {
      outputFile: 'test-results/performance-regression.json',
      includeTimings: true
    }],
    ['<rootDir>/__tests__/reporters/coverage-reporter.js', {
      outputFile: 'test-results/coverage-summary.json'
    }]
  ],

  // Global test environment variables
  globals: {
    __DEV__: true,
    __TEST__: true,
    __LOCAL_TESTING__: !isQuickMode,
    __QUICK_TEST__: isQuickMode
  },

  // Test environment configuration
  testEnvironment: 'node',
  testEnvironmentOptions: {
    url: 'http://localhost',
    userAgent: isQuickMode ? 'jest-quick-test-environment' : 'jest-local-test-environment'
  },

  // Watch mode configuration for development
  watchman: isDevMode,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.expo/',
    '<rootDir>/coverage/',
    '<rootDir>/test-results/'
  ]
};