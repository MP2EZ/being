/**
 * Cross-Device Sync Test Runner Configuration
 *
 * Specialized test configuration for comprehensive sync testing with:
 * - Performance monitoring and reporting
 * - Security validation requirements
 * - Crisis safety testing protocols
 * - Memory and resource tracking
 * - Parallel execution optimization
 */

module.exports = {
  displayName: 'Cross-Device Sync Tests',

  // Test environment setup
  testEnvironment: 'react-native',
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/cross-device-sync/setup/sync-test-setup.js'
  ],

  // Test discovery and organization
  testMatch: [
    '<rootDir>/__tests__/cross-device-sync/**/*.test.{ts,tsx}'
  ],

  // Test categories with different timeouts
  projects: [
    {
      displayName: 'Unit Tests - Fast',
      testMatch: [
        '<rootDir>/__tests__/cross-device-sync/unit/**/*.test.{ts,tsx}'
      ],
      testTimeout: 10000, // 10 seconds for unit tests
      maxConcurrency: 4,  // Allow parallel execution
    },
    {
      displayName: 'Integration Tests - Standard',
      testMatch: [
        '<rootDir>/__tests__/cross-device-sync/integration/**/*.test.{ts,tsx}'
      ],
      testTimeout: 30000, // 30 seconds for integration tests
      maxConcurrency: 2,  // Reduced concurrency for complex tests
    },
    {
      displayName: 'E2E Tests - Extended',
      testMatch: [
        '<rootDir>/__tests__/cross-device-sync/e2e/**/*.test.{ts,tsx}'
      ],
      testTimeout: 60000, // 60 seconds for E2E tests
      maxConcurrency: 1,  // Sequential execution for E2E stability
    },
    {
      displayName: 'Performance Tests - Monitored',
      testMatch: [
        '<rootDir>/__tests__/cross-device-sync/performance/**/*.test.{ts,tsx}'
      ],
      testTimeout: 120000, // 2 minutes for performance tests
      maxConcurrency: 1,   // Sequential for accurate performance measurement
      logHeapUsage: true,  // Monitor memory usage
      detectLeaks: true,   // Detect memory leaks
    },
    {
      displayName: 'Security Tests - Comprehensive',
      testMatch: [
        '<rootDir>/__tests__/cross-device-sync/security/**/*.test.{ts,tsx}'
      ],
      testTimeout: 90000,  // 90 seconds for thorough security testing
      maxConcurrency: 2,   // Limited concurrency for security tests
    }
  ],

  // Coverage requirements specific to sync functionality
  collectCoverageFrom: [
    'src/services/cloud/CrossDeviceSyncAPI.ts',
    'src/services/cloud/DeviceManagementAPI.ts',
    'src/components/sync/**/*.{ts,tsx}',
    'src/store/*Store.ts', // Store integration
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],

  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Critical sync components require higher coverage
    'src/services/cloud/CrossDeviceSyncAPI.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/components/sync/SyncStatusIndicator.tsx': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
  },

  // Performance and resource monitoring
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results/cross-device-sync',
      outputName: 'sync-test-results.xml',
      suiteName: 'Cross-Device Sync Tests',
      includeConsoleOutput: true,
    }],
    // Custom performance reporter
    ['<rootDir>/__tests__/cross-device-sync/reporters/performance-reporter.js', {
      outputPath: './test-results/cross-device-sync/performance-report.json',
      thresholds: {
        crisisResponseTime: 200,     // ms
        therapeuticSyncTime: 500,    // ms
        generalSyncTime: 2000,       // ms
        memoryUsage: 50 * 1024 * 1024, // 50MB
        successRate: 0.95,           // 95%
      }
    }],
    // Security validation reporter
    ['<rootDir>/__tests__/cross-device-sync/reporters/security-reporter.js', {
      outputPath: './test-results/cross-device-sync/security-report.json',
      validateEncryption: true,
      validateAuditTrail: true,
      validateDeviceTrust: true,
    }]
  ],

  // Transform and module resolution
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        '@babel/preset-react'
      ]
    }]
  },

  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|react-navigation|@react-navigation)/)'
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
  },

  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    },
    // Performance monitoring configuration
    SYNC_TEST_CONFIG: {
      enablePerformanceMonitoring: true,
      enableSecurityValidation: true,
      enableMemoryTracking: true,
      crisisResponseTimeLimit: 200,
      therapeuticSyncTimeLimit: 500,
      memoryUsageLimit: 50 * 1024 * 1024,
    }
  },

  // Test execution optimization
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache/cross-device-sync',
  clearMocks: true,
  restoreMocks: true,

  // Error handling and debugging
  errorOnDeprecated: true,
  verbose: true,

  // Custom test sequencer for crisis safety tests
  testSequencer: '<rootDir>/__tests__/cross-device-sync/sequencer/crisis-first-sequencer.js',

  // Teardown for resource cleanup
  globalTeardown: '<rootDir>/__tests__/cross-device-sync/setup/global-teardown.js',

  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
    '<rootDir>/__tests__/cross-device-sync/watch-plugins/performance-watch.js'
  ],

  // Snapshot configuration
  snapshotSerializers: [
    '<rootDir>/__tests__/cross-device-sync/serializers/sync-state-serializer.js'
  ],

  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src',
    '<rootDir>/__tests__'
  ],

  // File extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],

  // Test environment variables
  testEnvironmentOptions: {
    url: 'http://localhost',
  },

  // Notify configuration for CI/CD
  notify: false,
  notifyMode: 'failure-change',
};