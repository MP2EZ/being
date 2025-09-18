/**
 * Jest Configuration for FullMind MBCT App
 * Critical: Prioritizes clinical accuracy testing
 */

module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.js'],
  testEnvironment: 'node',
  
  // Test organization
  testMatch: [
    '**/__tests__/**/*.{js,jsx,ts,tsx}',
    '**/*.(test|spec).{js,jsx,ts,tsx}',
    '**/src/**/__tests__/**/*.{js,jsx,ts,tsx}'
  ],
  
  // Critical test path prioritization  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/__tests__/setup/',
    '/__tests__/mocks/',
    '/__tests__/fixtures/'
  ],
  
  // Coverage requirements (100% for clinical functions)
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/constants/**',
    // Critical files requiring 100% coverage
    'src/utils/validation.ts',
    'src/store/assessmentStore.ts',
    'src/services/storage/DataStore.ts',
    'src/services/storage/SecureDataStore.ts',
    'src/services/security/EncryptionService.ts',
    // Enhanced security files requiring high coverage
    'src/services/security/ComprehensiveSecurityValidator.ts',
    'src/services/security/AdvancedThreatDetectionSystem.ts',
    'src/services/security/SecurityAuditReportingSystem.ts',
    'src/services/security/PaymentSecurityService.ts',
    // Payment sync resilience files requiring high coverage
    'src/services/cloud/PaymentSyncResilienceAPI.ts',
    'src/services/cloud/PaymentSyncConflictResolution.ts',
    'src/services/cloud/PaymentSyncPerformanceOptimizer.ts',
    'src/services/cloud/PaymentSyncResilienceOrchestrator.ts',
    // Cross-device sync files requiring high coverage
    'src/services/cloud/CrossDeviceSyncAPI.ts',
    'src/services/cloud/DeviceManagementAPI.ts',
    'src/components/sync/SyncStatusIndicator.tsx',
    'src/components/sync/CrisisSyncBadge.tsx'
  ],
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // 100% coverage required for clinical accuracy
    'src/utils/validation.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'src/store/assessmentStore.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // Enhanced security coverage requirements
    'src/services/security/ComprehensiveSecurityValidator.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/services/security/AdvancedThreatDetectionSystem.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'src/services/security/SecurityAuditReportingSystem.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Payment sync resilience coverage requirements
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
    },
    // Cross-device sync coverage requirements
    'src/services/cloud/CrossDeviceSyncAPI.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/services/cloud/DeviceManagementAPI.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/components/sync/SyncStatusIndicator.tsx': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/components/sync/CrisisSyncBadge.tsx': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Mock configuration
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Clinical testing timeout (assessments can take time)
  // Security tests may need extended timeout for comprehensive validation
  testTimeout: 30000,
  
  // Performance and reliability
  maxWorkers: '50%',
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Setup files
  setupFiles: ['<rootDir>/__tests__/setup/react-native-mock.js'],
  
  // Transform ignore patterns for React Native and Expo modules
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|react-navigation|@react-navigation|expo-crypto|expo-secure-store)/)'
  ],
  
  // Custom test environments for different test types
  projects: [
    {
      displayName: 'Clinical Accuracy Tests',
      testMatch: ['<rootDir>/__tests__/clinical/**/*.test.{ts,tsx}'],
      testEnvironment: 'react-native',
      testTimeout: 30000, // Clinical validation can take time
    },
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.{ts,tsx}'],
      testTimeout: 20000
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.{ts,tsx}'],
      testTimeout: 45000, // Extended for comprehensive security integration
    },
    {
      displayName: 'Security Tests',
      testMatch: [
        '<rootDir>/__tests__/security/**/*.test.{ts,tsx}',
        '<rootDir>/src/services/**/__tests__/**/*.test.{ts,tsx}'
      ],
      testTimeout: 60000, // Extended for comprehensive security validation
    },
    {
      displayName: 'Compliance Tests',
      testMatch: ['<rootDir>/__tests__/compliance/**/*.test.{ts,tsx}'],
      testTimeout: 60000, // Extended for compliance auditing
    },
    {
      displayName: 'Regression Tests',
      testMatch: ['<rootDir>/__tests__/regression/**/*.test.{ts,tsx}'],
      testTimeout: 45000, // Extended for regression validation
    },
    {
      displayName: 'Payment Sync Resilience Tests',
      testMatch: ['<rootDir>/__tests__/payment-sync-resilience/**/*.test.{ts,tsx}'],
      testTimeout: 120000, // Extended for resilience stress testing
      setupFilesAfterEnv: [
        '<rootDir>/__tests__/setup/jest.setup.js',
        '<rootDir>/__tests__/payment-sync-resilience/setup/resilience-test-setup.js'
      ],
      logHeapUsage: true,
      detectLeaks: true
    },
    {
      displayName: 'Cross-Device Sync Tests',
      testMatch: ['<rootDir>/__tests__/cross-device-sync/**/*.test.{ts,tsx}'],
      testTimeout: 120000, // Extended for comprehensive sync testing
      setupFilesAfterEnv: [
        '<rootDir>/__tests__/setup/jest.setup.js',
        '<rootDir>/__tests__/cross-device-sync/setup/sync-test-setup.js'
      ],
      logHeapUsage: true,
      detectLeaks: true,
      maxConcurrency: 2, // Limited concurrency for accurate performance measurement
    }
  ]
};