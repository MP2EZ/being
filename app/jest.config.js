/**
 * Jest Configuration for FullMind MBCT App
 * Critical: Prioritizes clinical accuracy testing
 */

module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.js'],
  
  // Use node environment for most tests, jsdom only where needed
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
    // Fix module imports for expo modules
    '^expo-crypto$': '<rootDir>/__tests__/mocks/expo-crypto.js',
    '^expo-secure-store$': '<rootDir>/__tests__/mocks/expo-secure-store.js',
    '^expo-calendar$': '<rootDir>/__tests__/mocks/expo-calendar.js',
    '^expo-sqlite$': '<rootDir>/__tests__/mocks/expo-sqlite.js',
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
    'node_modules/(?!(react-native|@react-native|expo|@expo|expo-.*|react-navigation|@react-navigation|react-native-.*)/)'
  ],
  
  // Custom test environments for different test types
  projects: [
    {
      displayName: 'Clinical Accuracy Tests',
      testMatch: ['<rootDir>/__tests__/clinical/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      preset: 'react-native',
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.js'],
      transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|expo|@expo|expo-.*|react-navigation|@react-navigation|react-native-.*)/)'
      ],
    },
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      preset: 'react-native',
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.js'],
      transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|expo|@expo|expo-.*|react-navigation|@react-navigation|react-native-.*)/)'
      ],
    },
    {
      displayName: 'Integration Tests', 
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      preset: 'react-native',
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.js'],
      transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|expo|@expo|expo-.*|react-navigation|@react-navigation|react-native-.*)/)'
      ],
    },
    {
      displayName: 'Performance Tests',
      testMatch: ['<rootDir>/__tests__/performance/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      preset: 'react-native',
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.js'],
      transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|expo|@expo|expo-.*|react-navigation|@react-navigation|react-native-.*)/)'
      ],
    },
    {
      displayName: 'Security Tests',
      testMatch: ['<rootDir>/src/services/**/__tests__/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      preset: 'react-native',
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.js'],
      transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|expo|@expo|expo-.*|react-navigation|@react-navigation|react-native-.*)/)'
      ],
    }
  ]
};