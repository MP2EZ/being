/**
 * Jest Setup - Global test configuration and mocks
 * Configures environment for clinical accuracy testing
 */

import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock AsyncStorage for consistent test environment
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock React Native modules - using virtual mocks to avoid path issues
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => ({}), { virtual: true });
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });

// Mock Expo modules
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
}));

// Mock expo-crypto for encryption services
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
    SHA1: 'SHA1',
    MD5: 'MD5',
  },
  digestStringAsync: jest.fn().mockImplementation(async (algorithm, data) => {
    // Return a consistent mock hash for testing
    return `mock-hash-${algorithm}-${data.length}`;
  }),
  getRandomBytesAsync: jest.fn().mockImplementation(async (byteCount) => {
    // Return mock random bytes
    return new Uint8Array(byteCount).fill(42);
  }),
}));

// Mock expo-secure-store for secure storage
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

// Mock expo-local-authentication for biometric tests
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1, 2]), // fingerprint and face
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
  SecurityLevel: {
    NONE: 0,
    SECRET: 1,
    BIOMETRIC_WEAK: 2,
    BIOMETRIC_STRONG: 3,
  },
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
    name: 'MockScreen',
  }),
  useFocusEffect: (callback) => {
    callback();
  },
}));

// Mock Linking for crisis hotline tests
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  canOpenURL: jest.fn().mockResolvedValue(true),
  openURL: jest.fn().mockResolvedValue(true),
}));

// Mock NetInfo for network status tests
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  }),
  addEventListener: jest.fn(() => jest.fn()),
  useNetInfo: () => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  }),
}));

// Global test utilities
global.__DEV__ = true;

// Console error handler for tests - fail tests on console.error
const originalError = console.error;
global.console.error = (...args) => {
  // Allow specific React warnings that are safe to ignore
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Warning: React.createElement') ||
     message.includes('Warning: validateDOMNesting'))
  ) {
    return;
  }
  
  originalError.call(console, ...args);
  // Uncomment to fail tests on console.error (useful for strict testing)
  // throw new Error(`Console error: ${args.join(' ')}`);
};

// Custom matchers for clinical testing
expect.extend({
  // Validate PHQ-9 score calculation
  toMatchPHQ9Score(received, answers) {
    const expectedScore = answers.reduce((sum, answer) => sum + answer, 0);
    const pass = received === expectedScore && expectedScore >= 0 && expectedScore <= 27;
    
    return {
      message: () => 
        `Expected PHQ-9 score ${received} to equal calculated score ${expectedScore} for answers [${answers.join(', ')}]`,
      pass,
    };
  },
  
  // Validate GAD-7 score calculation
  toMatchGAD7Score(received, answers) {
    const expectedScore = answers.reduce((sum, answer) => sum + answer, 0);
    const pass = received === expectedScore && expectedScore >= 0 && expectedScore <= 21;
    
    return {
      message: () => 
        `Expected GAD-7 score ${received} to equal calculated score ${expectedScore} for answers [${answers.join(', ')}]`,
      pass,
    };
  },
  
  // Validate crisis intervention detection
  toRequireCrisisIntervention(assessment) {
    const { type, score, answers } = assessment;
    let shouldTriggerCrisis = false;
    
    if (type === 'phq9') {
      const hasHighScore = score >= 20;
      const hasSuicidalThoughts = answers[8] >= 1; // Question 9 (0-indexed)
      shouldTriggerCrisis = hasHighScore || hasSuicidalThoughts;
    } else if (type === 'gad7') {
      shouldTriggerCrisis = score >= 15;
    }
    
    return {
      message: () => 
        `Expected assessment (${type}, score: ${score}, answers: [${answers.join(', ')}]) to ${shouldTriggerCrisis ? '' : 'not '}require crisis intervention`,
      pass: shouldTriggerCrisis,
    };
  }
});

// Test data cleanup
afterEach(async () => {
  // Clear AsyncStorage after each test
  await mockAsyncStorage.clear();
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Performance testing utilities
global.performance = global.performance || {
  now: () => Date.now(),
  measure: jest.fn(),
  mark: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
};

// Mock date for consistent testing
const mockDate = '2024-09-08T10:00:00.000Z';
global.Date.now = jest.fn(() => new Date(mockDate).getTime());

console.log('Jest setup complete - Ready for clinical accuracy testing');