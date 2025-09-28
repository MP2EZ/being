/**
 * COMPREHENSIVE TESTING CONFIGURATION
 * Week 2 Orchestration Plan - Complete Test Automation
 * 
 * CRITICAL TESTING REQUIREMENTS:
 * - All 48 PHQ-9/GAD-7 scoring combinations
 * - Crisis detection and safety protocols
 * - Performance benchmarks and timing validation
 * - HIPAA compliance and regulatory requirements
 * - Integration testing across all system components
 * 
 * AUTOMATION FEATURES:
 * - Parallel test execution for performance
 * - Comprehensive coverage reporting
 * - Performance regression detection
 * - Safety violation monitoring
 * - Compliance audit trail validation
 * 
 * CI/CD INTEGRATION:
 * - Pre-commit safety validation
 * - Deployment readiness verification
 * - Production environment simulation
 * - Automated compliance reporting
 */

const { defaults } = require('jest-config');

module.exports = {
  preset: 'react-native',
  
  // Test Environment Configuration
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/comprehensive-test-setup.js'
  ],
  
  // Test Discovery and Execution
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/?(*.)(spec|test).{js,jsx,ts,tsx}'
  ],
  
  // Test Categories and Suites
  projects: [
    {
      displayName: 'Clinical Accuracy',
      testMatch: ['<rootDir>/__tests__/clinical/**/*.test.{js,ts,tsx}'],
      setupFilesAfterEnv: [
        '<rootDir>/__tests__/setup/clinical-test-setup.js'
      ],
      collectCoverageFrom: [
        'src/flows/assessment/**/*.{js,ts,tsx}',
        'src/services/TypeSafeClinicalCalculationService.ts',
        '!**/*.d.ts'
      ],
      coverageThreshold: {
        global: {
          branches: 100, // 100% for clinical code
          functions: 100,
          lines: 100,
          statements: 100
        }
      }
    },
    
    {
      displayName: 'Performance Validation',
      testMatch: ['<rootDir>/__tests__/performance/**/*.test.{js,ts,tsx}'],
      setupFilesAfterEnv: [
        '<rootDir>/__tests__/setup/performance-test-setup.js'
      ],
      testTimeout: 30000, // Extended timeout for performance tests
      collectCoverageFrom: [
        'src/flows/assessment/stores/**/*.{js,ts,tsx}',
        'src/hooks/use*Assessment*.ts',
        '!**/*.d.ts'
      ]
    },
    
    {
      displayName: 'Integration Testing',
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.{js,ts,tsx}'],
      setupFilesAfterEnv: [
        '<rootDir>/__tests__/setup/integration-test-setup.js'
      ],
      testTimeout: 60000, // Extended timeout for integration tests
      collectCoverageFrom: [
        'src/**/*.{js,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/__tests__/**',
        '!src/**/node_modules/**'
      ]
    },
    
    {
      displayName: 'Safety & Crisis',
      testMatch: ['<rootDir>/__tests__/safety/**/*.test.{js,ts,tsx}'],
      setupFilesAfterEnv: [
        '<rootDir>/__tests__/setup/safety-test-setup.js'
      ],
      testTimeout: 10000, // Strict timing for safety tests
      collectCoverageFrom: [
        'src/components/crisis/**/*.{js,ts,tsx}',
        'src/services/security/crisis/**/*.{js,ts,tsx}',
        '!**/*.d.ts'
      ],
      coverageThreshold: {
        global: {
          branches: 100, // 100% for safety-critical code
          functions: 100,
          lines: 100,
          statements: 100
        }
      }
    },
    
    {
      displayName: 'Compliance & Regulatory',
      testMatch: ['<rootDir>/__tests__/compliance/**/*.test.{js,ts,tsx}'],
      setupFilesAfterEnv: [
        '<rootDir>/__tests__/setup/compliance-test-setup.js'
      ],
      collectCoverageFrom: [
        'src/flows/assessment/stores/**/*.{js,ts,tsx}',
        'src/services/**/*.{js,ts,tsx}',
        '!**/*.d.ts'
      ],
      coverageThreshold: {
        global: {
          branches: 95, // High threshold for compliance
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    }
  ],
  
  // Module Resolution
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-vector-icons|@react-navigation|react-navigation|expo|@expo|zustand)/)'
  ],
  
  // Module Mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@flows/(.*)$': '<rootDir>/src/flows/$1',
    '^@stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1'
  },
  
  // Coverage Configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**',
    '!src/**/*.stories.{js,ts,tsx}',
    '!src/**/*.config.{js,ts}',
    '!src/**/index.{js,ts,tsx}'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json',
    'cobertura'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Performance and Execution
  maxWorkers: '50%', // Use half of available CPU cores
  maxConcurrency: 5, // Limit concurrent test suites
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Reporting and Output
  verbose: true,
  bail: false, // Continue running tests even if some fail
  errorOnDeprecated: true,
  notify: false,
  notifyMode: 'failure-change',
  
  // Custom Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'comprehensive-test-results.xml',
        suiteName: 'Comprehensive Assessment Testing',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        includeConsoleOutput: true
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results',
        filename: 'comprehensive-test-report.html',
        pageTitle: 'Week 2 Comprehensive Testing Report',
        logoImgPath: undefined,
        hideIcon: false,
        expand: true,
        openReport: false,
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ]
  ],
  
  // Global Test Configuration
  globals: {
    'ts-jest': {
      babelConfig: true,
      tsconfig: 'tsconfig.json'
    },
    __DEV__: true,
    __TEST__: true,
    COMPREHENSIVE_TESTING: true,
    WEEK_2_ORCHESTRATION: true
  },
  
  // Custom Test Environment Variables
  testEnvironmentOptions: {
    url: 'http://localhost',
    userAgent: 'comprehensive-test-agent'
  },
  
  // Advanced Configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Custom Matchers and Extensions
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/comprehensive-test-setup.js',
    '<rootDir>/__tests__/setup/custom-matchers.js',
    '<rootDir>/__tests__/setup/performance-matchers.js',
    '<rootDir>/__tests__/setup/safety-matchers.js',
    '<rootDir>/__tests__/setup/compliance-matchers.js'
  ],
  
  // Timeout Configuration
  testTimeout: 15000, // Default timeout
  slowTestThreshold: 10, // Log slow tests over 10 seconds
  
  // Snapshot Configuration
  snapshotSerializers: [
    'enzyme-to-json/serializer'
  ],
  
  // Mock Configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  unmockedModulePathPatterns: [
    'react',
    'react-native',
    'zustand'
  ],
  
  // Test Results and Artifacts
  outputFile: '<rootDir>/test-results/comprehensive-test-output.json',
  
  // CI/CD Integration Settings
  ci: process.env.CI === 'true',
  detectOpenHandles: true,
  detectLeaks: false,
  forceExit: true,
  
  // Custom Test Categories
  runner: 'jest-runner',
  testSequencer: '<rootDir>/__tests__/setup/comprehensive-test-sequencer.js'
};