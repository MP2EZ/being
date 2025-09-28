// Simple Jest config for OnboardingScreen tests
// Following ExercisesScreen test patterns

module.exports = {
  preset: 'react-native',
  testMatch: [
    '<rootDir>/src/screens/__tests__/OnboardingScreen.simple.test.tsx'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  collectCoverageFrom: [
    'src/screens/OnboardingScreen.simple.tsx'
  ],
  testEnvironment: 'jsdom',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation|react-navigation|expo-.*)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  testTimeout: 30000,
  verbose: true
};