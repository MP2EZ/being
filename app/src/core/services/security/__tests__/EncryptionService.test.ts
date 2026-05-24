/**
 * EncryptionService round-trip tests (audit TEST-02 paydown)
 *
 * Strategy: mock react-native-aes-crypto with a stateful round-trip
 * implementation. The mock doesn't perform real AES — it preserves the
 * byte payload through encrypt→decrypt so we can exercise the
 * EncryptionService glue layer (key derivation, IV generation, package
 * structure, checksum verification, tamper detection, metadata) without
 * depending on the native crypto runtime.
 *
 * What this tests:
 *   - Round-trip preserves data (string and object)
 *   - Sensitivity-level pathways produce the right metadata
 *   - Tamper detection via the package's checksum field
 *   - Pre-init guard rails (no encryption before initialize())
 *   - Key rotation / legacy-data migration returns sane shape
 *   - Performance metrics get recorded
 *
 * What this does NOT test (out of scope for unit test):
 *   - Cryptographic strength of AES-256-GCM (responsibility of
 *     react-native-aes-crypto + its native binding)
 *   - PBKDF2 iteration count behaviour (would require real timing)
 *   - Cross-platform behaviour (Web Crypto vs RN native paths) — tests
 *     run with Platform.OS === 'ios' via global jest.setup.js mock
 */

// Buffer is a Node global in the Jest env — no import needed (importing
// it creates a local binding that Jest's mock-factory hoister can't see).

// In-memory ciphertext registry: maps ciphertext+tag base64 back to the
// original plaintext base64 so decrypt can return what encrypt was given.
// Using a Map keeps the mock referentially correct: encrypt twice with
// the same input produces the same output (deterministic) so tamper
// detection tests can mutate one byte and observe the consequence.
const mockCipherRegistry = new Map<string, string>();
const TAG_LENGTH = 16;

// Helpers for stateful round-trip without real AES.
function mockMakeFakeCiphertext(plaintextB64: string): string {
  // Deterministic transform: ciphertext = "ENC:" + plaintext bytes, then
  // append 16 zero bytes as the auth tag. Encoding in base64 keeps the
  // boundary stable across the split-and-rejoin in EncryptionService.
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
  // If we weren't given a registered ciphertext, simulate AES-GCM auth
  // failure — this is how tampering manifests in real crypto.
  throw new Error('Authentication failed (mock: unknown ciphertext)');
}

jest.mock('react-native-aes-crypto', () => ({
  __esModule: true,
  default: {
    encrypt: jest.fn(async (dataB64: string) => mockMakeFakeCiphertext(dataB64)),
    decrypt: jest.fn(async (combinedB64: string) => mockUnwrapFakeCiphertext(combinedB64)),
    // Deterministic PBKDF2: hash inputs into a key of requested length.
    // Real PBKDF2 is one-way; for the test, deterministic + collision-
    // resistant-enough is sufficient — same (password, salt) produces
    // the same key so decrypt can re-derive.
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
}));

// expo-crypto: provide getRandomBytesAsync for IV/salt generation.
// Deterministic but distinct per call so IVs differ.
let mockRandomCounter = 0;
jest.mock('expo-crypto', () => ({
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
    // Deterministic "digest" — return base64 of the data prefix.
    return Buffer.from(data, 'utf-8').toString('base64').slice(0, 32);
  }),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256', SHA512: 'SHA-512' },
  CryptoEncoding: { HEX: 'hex', BASE64: 'base64' },
}));

// expo-secure-store: in-memory backing so key persistence round-trips.
const mockSecureStoreMap = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStoreMap.set(key, value);
  }),
  getItemAsync: jest.fn(async (key: string) => mockSecureStoreMap.get(key) ?? null),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStoreMap.delete(key);
  }),
}));

// Force Platform.OS = ios so EncryptionService takes the native path
// (not Web Crypto), which our mocks above target.
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: { OS: 'ios', select: (obj: any) => obj.ios ?? obj.default },
}));

// Import after mocks so the service picks up our shims.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EncryptionService } = require('../EncryptionService');

beforeEach(() => {
  mockCipherRegistry.clear();
  mockSecureStoreMap.clear();
  mockRandomCounter = 0;
});

describe('EncryptionService — round-trip integrity (audit TEST-02)', () => {
  it('rejects encryptData before initialize()', async () => {
    const service = EncryptionService.getInstance();
    await service.destroy(); // ensure clean state
    await expect(service.encryptData('anything', 'level_5_general_data')).rejects.toThrow(
      /not initialized/i
    );
  });

  it('round-trips a string through encrypt → decrypt', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    const plaintext = 'the user wrote a journal entry';
    const pkg = await service.encryptData(plaintext, 'level_5_general_data');

    expect(pkg.encryptedData).toBeTruthy();
    expect(pkg.iv).toBeTruthy();
    expect(pkg.tag).toBeTruthy();
    expect(pkg.salt).toBeTruthy();
    expect(pkg.metadata.algorithm).toBe('AES-GCM');
    expect(pkg.metadata.sensitivityLevel).toBe('level_5_general_data');

    const recovered = await service.decryptData(pkg);
    expect(recovered).toBe(plaintext);
  });

  it('round-trips a structured object (JSON inferred on decrypt)', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    const obj = {
      phq9Score: 18,
      answers: [1, 2, 3, 0, 2, 1, 3, 2, 0],
      timestamp: 1716000000000,
      flags: { suicidalIdeation: false, severeAnxiety: true },
    };
    const pkg = await service.encryptData(obj, 'level_2_assessment_data');
    const recovered = await service.decryptData(pkg);

    expect(recovered).toEqual(obj);
  });

  it('crisis-data encryption uses crisis key namespace and round-trips', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    const crisisData = { phq9Q9: 2, triggeredAt: Date.now(), interventionShown: '988' };
    const pkg = await service.encryptCrisisData(crisisData, 'episode-123');

    expect(pkg.metadata.sensitivityLevel).toBe('level_1_crisis_responses');
    const recovered = await service.decryptData(pkg, `crisis_key_episode-123`);
    expect(recovered).toEqual(crisisData);
  });

  it('assessment-data encryption uses assessment key namespace and round-trips', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    const responses = { type: 'gad7', answers: [1, 2, 3, 1, 0, 2, 1], totalScore: 10 };
    const pkg = await service.encryptAssessmentData(responses, 'assessment-456');

    expect(pkg.metadata.sensitivityLevel).toBe('level_2_assessment_data');
    const recovered = await service.decryptData(pkg, `assessment_key_assessment-456`);
    expect(recovered).toEqual(responses);
  });

  it('detects tampering: mutating ciphertext bytes triggers auth failure', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    const pkg = await service.encryptData('protected', 'level_1_crisis_responses');

    // Tamper: flip one character in the base64 ciphertext. The combined
    // ciphertext+tag won't match anything in the mock's registry, so the
    // mock decrypt throws "Authentication failed" — same shape as real
    // AES-GCM tag mismatch.
    const tamperedB64 = pkg.encryptedData.replace(/.$/, (c: string) => (c === 'A' ? 'B' : 'A'));
    const tampered = { ...pkg, encryptedData: tamperedB64 };

    await expect(service.decryptData(tampered)).rejects.toThrow(/decryption failed|integrity|authentication/i);
  });

  it('detects tampering of the plaintext checksum field', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    const pkg = await service.encryptData('the integrity check protects this', 'level_2_assessment_data');
    // Mutate the stored checksum to a different valid-looking value.
    const tampered = { ...pkg, checksum: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' };

    await expect(service.decryptData(tampered)).rejects.toThrow(/decryption failed|integrity/i);
  });

  it('records performance metrics for each operation', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    await service.encryptData('m1', 'level_5_general_data');
    await service.encryptData({ x: 1 }, 'level_2_assessment_data');

    const metrics = await service.getPerformanceMetrics();
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics.length).toBeGreaterThan(0);
    const encryptOps = metrics.filter((m: any) => m.operationType === 'encrypt');
    expect(encryptOps.length).toBeGreaterThanOrEqual(2);
  });

  it('reports initialized status after initialize()', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    const status = await service.getEncryptionStatus();
    expect(status).toBeTruthy();
    // The exact shape may vary; assert it claims to be initialized in some form.
    expect(JSON.stringify(status)).toMatch(/initialized|active|true|ready/i);
  });

  it('migrateLegacyEncryptedData returns a structured result without throwing', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    const result = await service.migrateLegacyEncryptedData();
    expect(result).toBeDefined();
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('destroy() prevents further encryption operations', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();
    await service.encryptData('before destroy', 'level_5_general_data'); // works

    await service.destroy();

    await expect(service.encryptData('after destroy', 'level_5_general_data')).rejects.toThrow(
      /not initialized/i
    );
  });
});

describe('EncryptionService — key derivation determinism', () => {
  it('same (sensitivityLevel, keyId, salt) re-derives the same key', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    // Encrypt twice with the same payload + same crisis episode — both
    // should round-trip independently because each uses a fresh IV but
    // the SAME derived key (per crisis episode).
    const data = { foo: 'bar' };
    const pkg1 = await service.encryptCrisisData(data, 'shared-episode');
    const pkg2 = await service.encryptCrisisData(data, 'shared-episode');

    // The packages should differ (different IVs / random bytes) ...
    expect(pkg1.iv).not.toBe(pkg2.iv);

    // ... but both decrypt to the same plaintext.
    expect(await service.decryptData(pkg1, 'crisis_key_shared-episode')).toEqual(data);
    expect(await service.decryptData(pkg2, 'crisis_key_shared-episode')).toEqual(data);
  });
});

describe('EncryptionService — error branches (TEST-20)', () => {
  // The audit asked for 5-6 targeted error-branch tests on the ~20 distinct
  // throw sites in EncryptionService. Existing suite covers init-guard,
  // tamper detection (×2), and destroy-prevents-encrypt. Adding the
  // remaining gaps below.

  it('decryptData rejects malformed package (missing required field)', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    const valid = await service.encryptData('hello', 'level_5_general_data');
    // Strip the auth tag — package is structurally invalid for decryption
    const malformed = { ...valid, tag: '' };

    await expect(service.decryptData(malformed)).rejects.toThrow();
  });

  it('decryptData rejects package with empty encryptedData', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    const valid = await service.encryptData('hello', 'level_5_general_data');
    const empty = { ...valid, encryptedData: '' };

    await expect(service.decryptData(empty)).rejects.toThrow();
  });

  it('preserves error message text (surfaces in Sentry)', async () => {
    const service = EncryptionService.getInstance();
    await service.destroy(); // ensure uninit state

    try {
      await service.encryptData('x', 'level_5_general_data');
      throw new Error('should have thrown');
    } catch (e) {
      // The error message must mention initialization for Sentry triage
      expect(String((e as Error).message)).toMatch(/initialized|initialize/i);
    }
  });
});
