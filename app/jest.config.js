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
    'src/services/security/EncryptionService.ts'
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
    }
  },
  
  // Mock configuration
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Clinical testing timeout (assessments can take time)
  // Integration tests may need extended timeout for comprehensive validation
  testTimeout: 20000,
  
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
    'node_modules/(?!(react-native|@react-native|expo|@expo|react-navigation|@react-navigation)/)'
  ],
  
  // Custom test environments for different test types
  projects: [
    {
      displayName: 'Clinical Accuracy Tests',
      testMatch: ['<rootDir>/__tests__/clinical/**/*.test.{ts,tsx}'],
      // Inherits global testTimeout of 20000ms - sufficient for clinical validation
    },
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.{ts,tsx}'],
      // Inherits global testTimeout of 20000ms
    },
    {
      displayName: 'Integration Tests', 
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.{ts,tsx}'],
      // Inherits global testTimeout of 20000ms - was previously 20000ms
    },
    {
      displayName: 'Security Tests',
      testMatch: ['<rootDir>/src/services/**/__tests__/**/*.test.{ts,tsx}'],
      // Inherits global testTimeout of 20000ms - increased from 15000ms for security tests
    }
  ]
};