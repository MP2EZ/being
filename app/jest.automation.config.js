/**
 * AUTOMATED TESTING CONFIGURATION - Week 3 Orchestration
 * Advanced Jest Configuration for CI/CD Test Automation
 * 
 * FEATURES:
 * - Parallel test execution with intelligent worker allocation
 * - Performance regression detection and monitoring
 * - Safety-critical test isolation and prioritization
 * - Comprehensive coverage analysis with domain-specific thresholds
 * - Real-time performance metrics and alerting
 * - Cross-platform compatibility validation
 * 
 * SAFETY REQUIREMENTS:
 * - Crisis system tests: 100% coverage, <200ms execution
 * - Clinical accuracy tests: 100% precision, zero tolerance for errors
 * - Security tests: Comprehensive vulnerability scanning
 * - Performance tests: Regression detection with baseline comparison
 */

const { defaults } = require('jest-config');
const os = require('os');

// Dynamic worker allocation based on system resources and test priority
const calculateOptimalWorkers = () => {
  const cpuCount = os.cpus().length;
  const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
  
  // Conservative allocation for CI environments
  if (process.env.CI) {
    return Math.min(cpuCount, 4); // Limit to 4 workers in CI
  }
  
  // Local development - more aggressive parallelization
  if (totalMemoryGB >= 16) {
    return Math.min(cpuCount, 8);
  } else if (totalMemoryGB >= 8) {
    return Math.min(cpuCount, 4);
  } else {
    return 2; // Minimum for systems with limited resources
  }
};

// Test category-specific configurations
const testConfigurations = {
  clinical: {
    maxWorkers: 2, // Limited parallelization for clinical accuracy
    testTimeout: 15000,
    coverageThreshold: 100, // 100% coverage required
    priority: 1 // Highest priority
  },
  crisis: {
    maxWorkers: 1, // Sequential execution for crisis tests
    testTimeout: 10000,
    coverageThreshold: 100,
    priority: 1 // Highest priority
  },
  performance: {
    maxWorkers: calculateOptimalWorkers(),
    testTimeout: 30000,
    coverageThreshold: 85,
    priority: 2
  },
  integration: {
    maxWorkers: Math.max(2, Math.floor(calculateOptimalWorkers() / 2)),
    testTimeout: 60000,
    coverageThreshold: 90,
    priority: 3
  },
  unit: {
    maxWorkers: calculateOptimalWorkers(),
    testTimeout: 5000,
    coverageThreshold: 90,
    priority: 4
  }
};

module.exports = {
  // Base configuration
  preset: 'react-native',
  testEnvironment: 'node',
  
  // Worker configuration for optimal performance
  maxWorkers: process.env.TEST_CATEGORY 
    ? testConfigurations[process.env.TEST_CATEGORY]?.maxWorkers || calculateOptimalWorkers()
    : calculateOptimalWorkers(),
  maxConcurrency: 10, // Limit concurrent test suites
  
  // Test discovery and execution patterns
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/?(*.)(spec|test).{js,jsx,ts,tsx}'
  ],
  
  // Performance optimization
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Module resolution and transformation
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: ['babel-preset-expo'],
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-proposal-class-properties'
      ]
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|expo|@expo|zustand|react-native-vector-icons)/)'
  ],
  
  // Module mapping for aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@flows/(.*)$': '<rootDir>/src/flows/$1',
    '^@stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1'
  },
  
  // Setup and teardown
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/test-automation-setup.js',
    '<rootDir>/__tests__/setup/performance-monitoring.js',
    '<rootDir>/__tests__/setup/safety-validation.js'
  ],
  
  // Coverage configuration with domain-specific thresholds
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.stories.{js,ts,tsx}',
    '!src/**/*.config.{js,ts}',
    '!src/**/index.{js,ts,tsx}',
    '!src/**/node_modules/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'cobertura',
    'clover'
  ],
  
  // Dynamic coverage thresholds based on test category
  coverageThreshold: process.env.TEST_CATEGORY ? {
    global: (() => {
      const config = testConfigurations[process.env.TEST_CATEGORY];
      const threshold = config?.coverageThreshold || 90;
      return {
        branches: threshold,
        functions: threshold,
        lines: threshold,
        statements: threshold
      };
    })()
  } : {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Safety-critical code requires 100% coverage
    './src/components/crisis/**/*.{js,ts,tsx}': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './src/services/TypeSafeClinicalCalculationService.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './src/flows/assessment/**/*.{js,ts,tsx}': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Timeout configuration
  testTimeout: process.env.TEST_TIMEOUT 
    ? parseInt(process.env.TEST_TIMEOUT) 
    : (process.env.TEST_CATEGORY 
       ? testConfigurations[process.env.TEST_CATEGORY]?.testTimeout || 15000
       : 15000),
  
  // Advanced reporting and monitoring
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: `automation-test-results-${process.env.TEST_CATEGORY || 'all'}.xml`,
        suiteName: `Test Automation - ${process.env.TEST_CATEGORY || 'Comprehensive'}`,
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        includeConsoleOutput: true,
        includeShortConsoleOutput: false
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results',
        filename: `automation-report-${process.env.TEST_CATEGORY || 'all'}.html`,
        pageTitle: `Test Automation Report - ${process.env.TEST_CATEGORY || 'Comprehensive'}`,
        expand: true,
        openReport: false,
        includeFailureMsg: true,
        includeSuiteFailure: true,
        inlineSource: false
      }
    ],
    // Custom performance reporter
    '<rootDir>/__tests__/reporters/performance-regression-reporter.js',
    // Safety validation reporter
    '<rootDir>/__tests__/reporters/safety-compliance-reporter.js'
  ],
  
  // Environment variables for test execution
  testEnvironmentOptions: {
    url: 'http://localhost',
    userAgent: 'automation-test-runner'
  },
  
  // Global test configuration
  globals: {
    'ts-jest': {
      babelConfig: true,
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    },
    __DEV__: false,
    __TEST__: true,
    __AUTOMATION__: true,
    PERFORMANCE_MONITORING: true,
    SAFETY_VALIDATION: true,
    TEST_CATEGORY: process.env.TEST_CATEGORY || 'comprehensive',
    PERFORMANCE_BASELINE_PATH: '<rootDir>/performance-baselines.json',
    CRISIS_RESPONSE_THRESHOLD_MS: parseInt(process.env.CRISIS_RESPONSE_THRESHOLD_MS || '200'),
    MEMORY_LIMIT_MB: parseInt(process.env.MEMORY_LIMIT_MB || '50')
  },
  
  // Advanced Jest options
  bail: process.env.CI ? 0 : false, // Don't bail in CI, allow all tests to run
  detectOpenHandles: true,
  detectLeaks: false,
  forceExit: process.env.CI ? true : false,
  verbose: process.env.VERBOSE === 'true',
  silent: process.env.SILENT === 'true',
  
  // Watch mode configuration (for local development)
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
    '<rootDir>/__tests__/plugins/performance-watch-plugin.js'
  ],
  
  // Custom test sequencer for prioritized execution
  testSequencer: '<rootDir>/__tests__/sequencers/priority-test-sequencer.js',
  
  // Project-specific configurations for parallel execution
  projects: [
    // Crisis and safety tests - highest priority, sequential execution
    {
      displayName: {
        name: 'CRISIS-SAFETY',
        color: 'red'
      },
      testMatch: [
        '<rootDir>/__tests__/**/*crisis*.test.{js,ts,tsx}',
        '<rootDir>/__tests__/**/*safety*.test.{js,ts,tsx}',
        '<rootDir>/src/**/*crisis*.test.{js,ts,tsx}'
      ],
      maxWorkers: 1, // Sequential execution for safety
      testTimeout: 10000,
      setupFilesAfterEnv: [
        '<rootDir>/__tests__/setup/crisis-safety-setup.js'
      ],
      coverageThreshold: {
        global: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        }
      }
    },
    
    // Clinical accuracy tests - high priority, limited parallelization
    {
      displayName: {
        name: 'CLINICAL',
        color: 'blue'
      },
      testMatch: [
        '<rootDir>/__tests__/clinical/**/*.test.{js,ts,tsx}',
        '<rootDir>/src/**/*clinical*.test.{js,ts,tsx}'
      ],
      maxWorkers: 2,
      testTimeout: 15000,
      setupFilesAfterEnv: [
        '<rootDir>/__tests__/setup/clinical-accuracy-setup.js'
      ],
      coverageThreshold: {
        global: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        }
      }
    },
    
    // Performance tests - optimized for performance measurement
    {
      displayName: {
        name: 'PERFORMANCE',
        color: 'yellow'
      },
      testMatch: [
        '<rootDir>/__tests__/**/*performance*.test.{js,ts,tsx}',
        '<rootDir>/__tests__/**/*perf*.test.{js,ts,tsx}'
      ],
      maxWorkers: calculateOptimalWorkers(),
      testTimeout: 30000,
      setupFilesAfterEnv: [
        '<rootDir>/__tests__/setup/performance-testing-setup.js'
      ],
      detectOpenHandles: true
    },
    
    // Integration tests - moderate parallelization
    {
      displayName: {
        name: 'INTEGRATION',
        color: 'magenta'
      },
      testMatch: [
        '<rootDir>/__tests__/integration/**/*.test.{js,ts,tsx}',
        '<rootDir>/__tests__/**/*integration*.test.{js,ts,tsx}'
      ],
      maxWorkers: Math.max(2, Math.floor(calculateOptimalWorkers() / 2)),
      testTimeout: 60000,
      setupFilesAfterEnv: [
        '<rootDir>/__tests__/setup/integration-testing-setup.js'
      ]
    },
    
    // Unit tests - full parallelization
    {
      displayName: {
        name: 'UNIT',
        color: 'green'
      },
      testMatch: [
        '<rootDir>/src/**/*.test.{js,ts,tsx}',
        '<rootDir>/__tests__/**/*unit*.test.{js,ts,tsx}'
      ],
      testPathIgnorePatterns: [
        'crisis',
        'clinical',
        'performance',
        'integration'
      ],
      maxWorkers: calculateOptimalWorkers(),
      testTimeout: 5000
    }
  ],
  
  // Performance monitoring and regression detection
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/test-automation-setup.js'
  ],
  
  // CI/CD specific optimizations
  ...(process.env.CI && {
    // CI-specific overrides
    maxWorkers: Math.min(4, calculateOptimalWorkers()), // Conservative in CI
    bail: 0, // Run all tests in CI
    cache: false, // Disable cache in CI for fresh runs
    verbose: false, // Reduce output in CI
    collectCoverage: true,
    coverageReporters: ['text', 'lcov', 'cobertura'], // CI-friendly formats
    reporters: [
      'default',
      'jest-junit'
    ]
  }),
  
  // Development-specific optimizations
  ...(!process.env.CI && {
    // Development overrides
    watchman: true,
    notify: true,
    notifyMode: 'failure-change',
    collectCoverage: false, // Faster local runs
    verbose: true
  })
};