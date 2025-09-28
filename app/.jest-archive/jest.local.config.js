/**
 * Jest Local Development Configuration
 * Optimized for fast local testing and development workflows
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Local development optimizations
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Fast feedback for development
  bail: false, // Continue on failures for comprehensive feedback
  verbose: true,
  detectOpenHandles: true,
  forceExit: false,
  
  // Performance optimizations
  maxWorkers: '50%', // Use half CPU cores for development
  testTimeout: 10000, // 10s default timeout
  
  // Enhanced error reporting
  errorOnDeprecated: true,
  testFailureExitCode: 1,
  
  // Development-specific test patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/?(*.)(test|spec).{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}'
  ],
  
  // Ignore patterns for faster runs
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.expo/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
    '<rootDir>/_archive_*/',
    '<rootDir>/.to_delete_removed/'
  ],
  
  // Coverage configuration for local development
  collectCoverage: false, // Disabled by default for speed
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/coverage/',
    '.d.ts$'
  ],
  
  // Coverage thresholds for local validation
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
  
  // Setup files for different test types
  setupFiles: [
    '<rootDir>/__tests__/setup/polyfills.js'
  ],
  
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/jest.setup.js',
    '<rootDir>/__tests__/setup/performance-monitoring.js'
  ],
  
  // Module mapping for local development
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
    '^@setup/(.*)$': '<rootDir>/__tests__/setup/$1',
    '^@utils/(.*)$': '<rootDir>/__tests__/utils/$1'
  },
  
  // Reporters for local development
  reporters: [
    'default',
    ['<rootDir>/__tests__/reporters/local-performance-reporter.js', {
      outputFile: 'test-results/local-performance.json',
      includeTimings: true
    }],
    ['<rootDir>/__tests__/reporters/coverage-reporter.js', {
      outputFile: 'test-results/coverage-summary.json'
    }]
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['babel-preset-expo', { jsxRuntime: 'automatic' }]
      ],
      cacheDirectory: true
    }]
  },
  
  // Watch mode configuration for development
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.expo/',
    '<rootDir>/coverage/',
    '<rootDir>/test-results/'
  ],
  
  // Global test environment variables
  globals: {
    __DEV__: true,
    __TEST__: true,
    __LOCAL_TESTING__: true
  },
  
  // Test environment configuration
  testEnvironmentOptions: {
    url: 'http://localhost',
    userAgent: 'jest-local-test-environment'
  }
};