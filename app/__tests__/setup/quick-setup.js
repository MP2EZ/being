/**
 * Quick Test Setup
 * Minimal setup for ultra-fast development iteration
 */

import '@testing-library/jest-native/extend-expect';

// Minimal performance tracking
global.performance = global.performance || {
  now: () => Date.now()
};

// Essential clinical constants only
global.CLINICAL_SAFETY = {
  PHQ9_CRISIS_THRESHOLD: 20,
  GAD7_CRISIS_THRESHOLD: 15
};

// Quick test utilities (minimal set)
global.quickUtils = {
  generateCrisisScore: () => ({
    phq9: 22,
    gad7: 18
  }),
  
  generateNormalScore: () => ({
    phq9: 8,
    gad7: 6
  })
};

// Minimal mocks for speed
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve())
}));