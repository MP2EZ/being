/**
 * Jest Quick Test Configuration
 * Ultra-fast configuration for rapid development iteration
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Speed optimizations
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache-quick',
  maxWorkers: 1, // Single worker for quick tests
  testTimeout: 5000, // 5s timeout for quick feedback
  
  // Minimal test patterns for quick validation
  testMatch: [
    '<rootDir>/src/**/*.quick.test.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/quick/**/*.{js,jsx,ts,tsx}'
  ],
  
  // Skip slow tests
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns || [],
    '**/*.e2e.test.*',
    '**/*.integration.test.*',
    '**/*.performance.test.*',
    '**/integration/**',
    '**/e2e/**',
    '**/performance/**'
  ],
  
  // Minimal coverage for speed
  collectCoverage: false,
  
  // Quick setup
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/quick-setup.js'
  ],
  
  // Reporters optimized for quick feedback
  reporters: [
    ['default', { verbose: false }],
    ['<rootDir>/__tests__/reporters/quick-reporter.js']
  ],
  
  // Fast transform
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
      cacheDirectory: true,
      compact: true
    }]
  },
  
  // Global variables for quick tests
  globals: {
    __DEV__: true,
    __TEST__: true,
    __QUICK_TEST__: true
  }
};