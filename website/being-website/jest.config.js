/**
 * Being. Clinical Testing Configuration
 * 
 * Comprehensive Jest configuration for clinical-grade testing including:
 * - Clinical accuracy validation (99.9% requirement)
 * - Assessment score testing (PHQ-9/GAD-7)
 * - Crisis safety protocol testing
 * - Export functionality validation
 * - Integration testing with therapeutic context
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  
  // Module paths and aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/test/(.*)$': '<rootDir>/src/test/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  
  // Test path ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/reports/',
  ],
  
  // Transform patterns (handled by Next.js)
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(.*\\.mjs$|zustand))',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
    '!src/test/**/*',
    '!src/pages/_*.{js,jsx,ts,tsx}',
    '!src/pages/api/**/*',
  ],
  
  // Coverage thresholds for clinical safety
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Critical clinical components require higher coverage
    'src/lib/api/clinical-export-service.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    'src/types/clinical-export.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/types/healthcare.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary',
    'clover',
  ],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  
  // Global setup and teardown (optional)
  // globalSetup: '<rootDir>/src/test/global-setup.ts',
  // globalTeardown: '<rootDir>/src/test/global-teardown.ts',
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  
  // Error handling
  errorOnDeprecated: true,
  
  // Verbose output for clinical testing
  verbose: true,
  
  // Test results processor for clinical compliance (optional)
  // testResultsProcessor: '<rootDir>/src/test/clinical-test-processor.ts',
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Max workers for clinical accuracy (single-threaded for deterministic results)
  maxWorkers: process.env.CI ? 2 : 1,
  
  // Timeout for clinical tests (longer for comprehensive validation)
  testTimeout: 30000,
  
  // Clinical testing specific reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/reports',
      outputName: 'clinical-test-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true,
    }],
  ],
  
  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
    __CLINICAL_TEST_MODE__: true,
    __PHQ9_CRISIS_THRESHOLD__: 20,
    __GAD7_CRISIS_THRESHOLD__: 15,
    __CLINICAL_ACCURACY_REQUIREMENT__: 0.999,
  },
  
  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  restoreMocks: true,
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  
  // Snapshot serializers (optional)
  // snapshotSerializers: [],
  
  // Custom test suites for clinical components
  projects: [
    {
      displayName: 'Clinical Accuracy Tests',
      testMatch: ['<rootDir>/src/test/clinical/**/*.test.{js,jsx,ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/src/test/clinical-setup.ts'],
    },
    {
      displayName: 'Assessment Validation Tests',
      testMatch: ['<rootDir>/src/test/assessment/**/*.test.{js,jsx,ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/src/test/assessment-setup.ts'],
    },
    {
      displayName: 'Crisis Safety Tests',
      testMatch: ['<rootDir>/src/test/crisis/**/*.test.{js,jsx,ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/src/test/crisis-setup.ts'],
    },
    {
      displayName: 'Export Integration Tests',
      testMatch: ['<rootDir>/src/test/export/**/*.test.{js,jsx,ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/src/test/export-setup.ts'],
    },
    {
      displayName: 'Accessibility Tests',
      testMatch: ['<rootDir>/src/test/accessibility/**/*.test.{js,jsx,ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/src/test/accessibility-setup.ts'],
    },
  ],
};

// Export Jest configuration with Next.js integration
module.exports = createJestConfig(customJestConfig);