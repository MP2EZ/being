/**
 * Jest Configuration for Being. MBCT App
 * Phase 7C: Consolidated configuration merging subscription testing
 * Critical: Prioritizes clinical accuracy testing with subscription system integration
 */

module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/__tests__/setup/jest.setup.js',
    '<rootDir>/__tests__/subscription/setup.ts'
  ],
  testEnvironment: 'node',
  
  // Comprehensive test organization - simplified to match existing structure
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
    '/__tests__/fixtures/',
    '/__tests__/subscription/polyfills.ts'
  ],
  
  // Comprehensive coverage requirements (100% for clinical functions)
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/constants/**',
    '!**/node_modules/**',
    '!**/*.test.{ts,tsx}',
    '!**/__mocks__/**',
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
    'src/components/sync/CrisisSyncBadge.tsx',
    // Subscription system files requiring high coverage
    'src/store/subscriptionStore.ts',
    'src/hooks/useSubscription.ts',
    'src/hooks/useFeatureGate.ts',
    'src/hooks/useCrisisMode.ts',
    'src/components/FeatureGate/**/*.{ts,tsx}',
    'src/components/Subscription/**/*.{ts,tsx}',
    'src/services/PaymentService.ts',
    'src/services/CrisisProtectionService.ts',
    'src/types/subscription.ts'
  ],
  
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
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
    },
    // Subscription system critical coverage requirements
    'src/store/subscriptionStore.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/hooks/useSubscription.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/hooks/useFeatureGate.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/services/PaymentService.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Consolidated mock configuration
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1'
  },
  
  // Clinical and subscription testing timeout (assessments and performance tests)
  testTimeout: 30000,
  
  // Optimized performance and reliability
  maxWorkers: '50%',
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // React Native compatible transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Setup files
  setupFiles: [
    '<rootDir>/__tests__/setup/react-native-mock.js',
    '<rootDir>/__tests__/subscription/polyfills.ts'
  ],
  
  // Transform ignore patterns for React Native and Expo modules
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|expo-local-authentication|expo-modules-core|react-navigation|@react-navigation|expo-crypto|expo-secure-store)/)'
  ],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  
  // Mock management
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  bail: false,
  
  // Performance testing and reporting
  reporters: ['default'],
  
  // Global test configuration for subscription and clinical testing
  globals: {
    // Performance testing globals
    SUBSCRIPTION_PERFORMANCE_MODE: true,
    CRISIS_SAFETY_VALIDATION: true,
    THERAPEUTIC_MESSAGING_CHECK: true
  }
};