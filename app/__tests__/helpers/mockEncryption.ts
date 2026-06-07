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
 *   For the hybrid wellness-data blob path (ciphertext in AsyncStorage,
 *   master key in Keychain) add the AsyncStorage factory too:
 *
 *   jest.mock('@react-native-async-storage/async-storage', () => {
 *     const { createAsyncStorageMock } = require('../helpers/mockEncryption');
 *     return createAsyncStorageMock();
 *   });
 *
 *   import { resetEncryptionMocks } from '../helpers/mockEncryption';
 *
 *   beforeEach(() => {
 *     // Clears the cipher registry + wellness-blob store per test, but
 *     // PRESERVES the master key (the mock Keychain survives "restarts",
 *     // mirroring real hardware). No destroy()/reset of the singleton needed.
 *     resetEncryptionMocks();
 *   });
 */

import { jest } from '@jest/globals';

const TAG_LENGTH = 16;

const mockCipherRegistry = new Map<string, string>();
const mockSecureStoreMap = new Map<string, string>();
const mockAsyncStorageMap = new Map<string, string>();
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

/**
 * Functional in-memory mock for @react-native-async-storage/async-storage.
 *
 * The repo's global jest.setup.js mock (and the prior inline mock in some
 * integration files) is a NO-OP — `getItem` always resolves null, so writes
 * never round-trip. The hybrid wellness-data path stores the AES-256-GCM
 * ciphertext blob in AsyncStorage (master key stays in the Keychain mock
 * above), so a no-op AsyncStorage breaks any save→recover round-trip. This
 * factory backs reads/writes with `mockAsyncStorageMap`, cleared per-test by
 * resetEncryptionMocks() in lockstep with the cipher + secure-store maps.
 *
 * Returns a plain object (no __esModule/default) to match how the library is
 * consumed via the default import under Jest's CJS interop.
 */
export function createAsyncStorageMock(): Record<string, unknown> {
  return {
    setItem: jest.fn(async (key: string, value: string) => {
      mockAsyncStorageMap.set(key, value);
    }),
    getItem: jest.fn(async (key: string) => mockAsyncStorageMap.get(key) ?? null),
    removeItem: jest.fn(async (key: string) => {
      mockAsyncStorageMap.delete(key);
    }),
    multiGet: jest.fn(async (keys: string[]) =>
      keys.map((k) => [k, mockAsyncStorageMap.get(k) ?? null] as [string, string | null])
    ),
    multiSet: jest.fn(async (pairs: [string, string][]) => {
      for (const [k, v] of pairs) mockAsyncStorageMap.set(k, v);
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      for (const k of keys) mockAsyncStorageMap.delete(k);
    }),
    getAllKeys: jest.fn(async () => [...mockAsyncStorageMap.keys()]),
    clear: jest.fn(async () => {
      mockAsyncStorageMap.clear();
    }),
  };
}

/**
 * Mirrors EncryptionService `ENCRYPTION_CONFIG.MASTER_KEY_ID`. Kept as a local
 * literal so the helper doesn't import the production module (which would
 * instantiate the EncryptionService singleton at helper load). If the
 * production constant ever changes, update this to match.
 */
const MOCK_MASTER_KEY_ID = 'mental_health_master_key';

export function resetEncryptionMocks(): void {
  mockCipherRegistry.clear();
  // Preserve the master key across resets. The real platform Keychain is
  // hardware-backed and survives app "restarts" (i.e. test cases) — exactly as
  // EncryptionService.__resetForTesting__ deliberately leaves it in place.
  // Wiping it here while the EncryptionService singleton's
  // `masterKeyInitialized` flag stays true (destroy() is intentionally not
  // called — it hangs under --coverage --ci, INFRA-180 family) desyncs the two:
  // the next encrypt short-circuits init, the key is never regenerated, and
  // deriveEncryptionKey throws "Master key not found" (EncryptionService.ts:655).
  const masterKey = mockSecureStoreMap.get(MOCK_MASTER_KEY_ID);
  mockSecureStoreMap.clear();
  if (masterKey !== undefined) mockSecureStoreMap.set(MOCK_MASTER_KEY_ID, masterKey);
  // The wellness-blob store resets per test (each test writes its own blob);
  // a leaked prior-test blob would fail loudly at decrypt anyway, since its
  // ciphertext is absent from the freshly-cleared cipher registry above.
  mockAsyncStorageMap.clear();
  mockRandomCounter = 0;
}
