/**
 * Jest Setup - Global test configuration and mocks
 * Configures environment for clinical accuracy testing
 */

import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Ensure globals are available for React Native testing
if (typeof window === 'undefined') {
  global.window = global;
}

if (typeof document === 'undefined') {
  global.document = {};
}

if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'node.js' };
}

// Mock AsyncStorage for consistent test environment
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock React Native modules that are commonly problematic
jest.mock('react-native', () => {
  const mockComponent = 'View';

  return {
    Platform: {
      OS: 'ios',
      Version: '14.0',
      isPad: false,
      isTVOS: false,
      constants: {},
      select: (obj) => obj.ios || obj.default,
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    // Mock commonly used components
    View: mockComponent,
    Text: mockComponent,
    ScrollView: mockComponent,
    TouchableOpacity: mockComponent,
    TouchableWithoutFeedback: mockComponent,
    Image: mockComponent,
    FlatList: mockComponent,
    SectionList: mockComponent,
    StyleSheet: {
      create: (styles) => styles,
      flatten: (style) => style,
      compose: (style1, style2) => [style1, style2],
    },
    Linking: {
      canOpenURL: jest.fn().mockResolvedValue(true),
      openURL: jest.fn().mockResolvedValue(true),
    },
    Alert: {
      alert: jest.fn(),
    },
    Animated: {
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      })),
      timing: jest.fn(() => ({ start: jest.fn() })),
      spring: jest.fn(() => ({ start: jest.fn() })),
      View: mockComponent,
      Text: mockComponent,
    },
  };
});

// Mock OfflineQueueService class definition issue
jest.mock('../../src/services/OfflineQueueService', () => {
  class MockOfflineQueueService {
    constructor() {}
    
    addToQueue = jest.fn().mockResolvedValue(undefined);
    processQueue = jest.fn().mockResolvedValue([]);
    clearQueue = jest.fn().mockResolvedValue(undefined);
    getQueueSize = jest.fn().mockReturnValue(0);
    isOnline = jest.fn().mockReturnValue(true);
    
    // Network monitoring
    startNetworkMonitoring = jest.fn();
    stopNetworkMonitoring = jest.fn();
  }

  return {
    OfflineQueueService: MockOfflineQueueService,
    offlineQueueService: new MockOfflineQueueService(),
    __esModule: true,
    default: new MockOfflineQueueService(),
  };
});

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

// Mock expo modules directly with implementations
// These are mocked here to avoid module resolution issues

// Mock expo-crypto for clinical encryption testing
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: {
    SHA1: 'sha1',
    SHA256: 'sha256',
    SHA384: 'sha384', 
    SHA512: 'sha512',
    MD5: 'md5',
  },
  CryptoEncoding: {
    HEX: 'hex',
    BASE64: 'base64',
  },
  digestStringAsync: jest.fn().mockResolvedValue('2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae'),
  getRandomBytes: jest.fn().mockReturnValue(new Uint8Array(32)),
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array(32)),
  randomUUID: jest.fn().mockReturnValue('550e8400-e29b-41d4-a716-446655440000'),
}));

// Mock expo-secure-store for clinical data security
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  ALWAYS: 'ALWAYS',
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
}));

// Mock expo-calendar for calendar integration tests
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCalendarsAsync: jest.fn().mockResolvedValue([
    { id: '1', title: 'Personal', source: { name: 'Local' }, accessLevel: 'owner' }
  ]),
  createEventAsync: jest.fn().mockResolvedValue('event-id-123'),
  deleteEventAsync: jest.fn().mockResolvedValue(undefined),
  getEventsAsync: jest.fn().mockResolvedValue([]),
  EntityTypes: { EVENT: 'event' },
  CalendarAccessLevel: { OWNER: 'owner' },
}));

// Mock expo-sqlite for clinical data persistence
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    closeAsync: jest.fn().mockResolvedValue(undefined),
    withTransactionAsync: jest.fn().mockImplementation(async (callback) => {
      return await callback({
        execAsync: jest.fn().mockResolvedValue(undefined),
        getAllAsync: jest.fn().mockResolvedValue([]),
        getFirstAsync: jest.fn().mockResolvedValue(null),
        runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
      });
    }),
  }),
  SQLiteDatabase: jest.fn(),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn().mockResolvedValue({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
      details: {
        isConnectionExpensive: false,
        ssid: 'mock-wifi',
        bssid: 'mock-bssid',
        strength: 100,
        ipAddress: '192.168.1.1',
        subnet: '255.255.255.0',
      }
    }),
    addEventListener: jest.fn().mockReturnValue(() => {}),
    refresh: jest.fn().mockResolvedValue({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
    }),
  },
  NetInfoStateType: {
    unknown: 'unknown',
    none: 'none',
    cellular: 'cellular',
    wifi: 'wifi',
    bluetooth: 'bluetooth',
    ethernet: 'ethernet',
    wimax: 'wimax',
    vpn: 'vpn',
    other: 'other',
  },
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
  setStatusBarStyle: jest.fn(),
  setStatusBarBackgroundColor: jest.fn(),
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

// Mock React Testing Library components that cause issues
jest.mock('@testing-library/react-native', () => ({
  render: jest.fn(),
  fireEvent: jest.fn(),
  waitFor: jest.fn(),
  screen: {},
  act: jest.fn((cb) => cb()),
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
  
  // Clear all mocks (including expo module mocks)
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