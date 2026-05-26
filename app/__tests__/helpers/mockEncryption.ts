/**
 * Shared in-memory mocks for the EncryptionService dependency stack
 * (react-native-aes-crypto, expo-crypto, expo-secure-store).
 *
 * Lets integration tests that touch any service hanging off
 * EncryptionService (SyncCoordinator, AnalyticsService, etc.) initialize
 * the master key without hitting the real Keychain. Pattern is extracted
 * from `src/core/services/security/__tests__/EncryptionService.test.ts`.
 *
 * Usage (factories are required *inside* the jest.mock call so Jest's
 * hoister doesn't complain about out-of-scope variable references):
 *
 *   jest.mock('react-native-aes-crypto', () => {
 *     const { createAesCryptoMock } = require('../helpers/mockEncryption');
 *     return createAesCryptoMock();
 *   });
 *   jest.mock('expo-crypto', () => {
 *     const { createExpoCryptoMock } = require('../helpers/mockEncryption');
 *     return createExpoCryptoMock();
 *   });
 *   jest.mock('expo-secure-store', () => {
 *     const { createExpoSecureStoreMock } = require('../helpers/mockEncryption');
 *     return createExpoSecureStoreMock();
 *   });
 *
 *   import { resetEncryptionMocks } from '../helpers/mockEncryption';
 *   import { EncryptionService } from '@/core/services/security/EncryptionService';
 *
 *   beforeEach(async () => {
 *     resetEncryptionMocks();
 *     await EncryptionService.getInstance().destroy();
 *   });
 */

import { jest } from '@jest/globals';

const TAG_LENGTH = 16;

const mockCipherRegistry = new Map<string, string>();
const mockSecureStoreMap = new Map<string, string>();
let mockRandomCounter = 0;

function mockMakeFakeCiphertext(plaintextB64: string): string {
  const plainBytes = Buffer.from(plaintextB64, 'base64');
  const prefix = Buffer.from('ENC:', 'utf-8');
  const tag = Buffer.alloc(TAG_LENGTH, 0);
  const combined = Buffer.concat([prefix, plainBytes, tag]);
  const combinedB64 = combined.toString('base64');
  mockCipherRegistry.set(combinedB64, plaintextB64);
  return combinedB64;
}

function mockUnwrapFakeCiphertext(combinedB64: string): string {
  const stored = mockCipherRegistry.get(combinedB64);
  if (stored !== undefined) return stored;
  throw new Error('Authentication failed (mock: unknown ciphertext)');
}

export function createAesCryptoMock(): Record<string, unknown> {
  return {
    __esModule: true,
    default: {
      encrypt: jest.fn(async (dataB64: string) => mockMakeFakeCiphertext(dataB64)),
      decrypt: jest.fn(async (combinedB64: string) => mockUnwrapFakeCiphertext(combinedB64)),
      pbkdf2: jest.fn(async (passwordB64: string, saltB64: string, _iter: number, keyBitLength: number) => {
        const keyByteLength = keyBitLength / 8;
        const seed = Buffer.from(passwordB64 + ':' + saltB64, 'utf-8');
        const out = Buffer.alloc(keyByteLength);
        for (let i = 0; i < keyByteLength; i++) out[i] = seed[i % seed.length] ^ (i & 0xff);
        return out.toString('base64');
      }),
      randomKey: jest.fn(async (length: number) => Buffer.alloc(length, 0x42).toString('base64')),
      hmac256: jest.fn(async () => 'mock-hmac'),
      sha256: jest.fn(async (data: string) => Buffer.from(data, 'utf-8').toString('base64')),
    },
  };
}

export function createExpoCryptoMock(): Record<string, unknown> {
  return {
    getRandomBytes: jest.fn((length: number) => {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) bytes[i] = (i * 7 + 13) & 0xff;
      return bytes;
    }),
    getRandomBytesAsync: jest.fn(async (length: number) => {
      mockRandomCounter += 1;
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) bytes[i] = (i * 7 + mockRandomCounter * 31) & 0xff;
      return bytes;
    }),
    digestStringAsync: jest.fn(async (_algo: string, data: string) => {
      return Buffer.from(data, 'utf-8').toString('base64').slice(0, 32);
    }),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256', SHA512: 'SHA-512' },
    CryptoEncoding: { HEX: 'hex', BASE64: 'base64' },
  };
}

export function createExpoSecureStoreMock(): Record<string, unknown> {
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => {
      mockSecureStoreMap.set(key, value);
    }),
    getItemAsync: jest.fn(async (key: string) => mockSecureStoreMap.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key: string) => {
      mockSecureStoreMap.delete(key);
    }),
  };
}

export function resetEncryptionMocks(): void {
  mockCipherRegistry.clear();
  mockSecureStoreMap.clear();
  mockRandomCounter = 0;
}
