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

// expo-crypto is pulled transitively by core/utils/id, which any constant
// imported from crisis/types/safety.ts will trigger. Without this, every
// .quick.test.* that touches a constant chain fails at module-load.
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn((n) => new Uint8Array(n).fill(7)),
  getRandomBytesAsync: jest.fn(async (n) => new Uint8Array(n).fill(7)),
  digestStringAsync: jest.fn(async (_alg, v) => `mock_digest_${v}`),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256', SHA512: 'SHA-512' },
  CryptoEncoding: { HEX: 'hex', BASE64: 'base64' },
}));

// expo-secure-store is pulled transitively by SecureStorageService (which
// is imported by assessmentStore → ClinicalScoringService). Same one-line
// stub as the regular setup.
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// react-native-aes-crypto is pulled by EncryptionService.
jest.mock('react-native-aes-crypto', () => ({
  randomKey: jest.fn(async (n) => 'mock_key_' + n),
  encrypt: jest.fn(async (text) => 'mock_ct_' + text),
  decrypt: jest.fn(async (ct) => ct.replace(/^mock_ct_/, '')),
  hmac256: jest.fn(async () => 'mock_hmac'),
  sha256: jest.fn(async () => 'mock_sha256'),
  pbkdf2: jest.fn(async () => 'mock_pbkdf2'),
}));