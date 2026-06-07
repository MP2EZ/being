/**
 * EncryptionService REAL-CRYPTO round-trip tests (MAINT-234 — compliance gate)
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The sibling suite `EncryptionService.test.ts` mocks `react-native-aes-crypto`
 * with a byte-PRESERVING fake (encrypt returns `"ENC:" + plaintext + 16 zero
 * bytes`; pbkdf2 is a trivial XOR). That fake exercises the service's glue layer
 * but performs ZERO real cryptography — so a silent crypto downgrade (algorithm
 * swap, key-size reduction, PBKDF2 iteration drop, truncated auth tag) passes
 * every assertion. `test:encryption` is the "compliance authority" gate
 * (`validate:compliance-authority`), so that blind spot means the gate currently
 * proves nothing about the actual encryption of wellness data at rest.
 *
 * WHAT THIS FILE DOES
 * -------------------
 * `react-native-aes-crypto` is a native-only TurboModule (`export default
 * NativeModules.Aes`) — it is `undefined` in the Node/Jest runtime and therefore
 * CANNOT be exercised unmocked here (that is why `__tests__/setup/jest.setup.js`
 * globally fakes it). So "no mock" is interpreted as its only faithful meaning in
 * Node: back the binding's interface with REAL cryptography from Node's built-in
 * `crypto` module — genuine AES-256-GCM (`createCipheriv` + `getAuthTag`) and
 * genuine PBKDF2 (`pbkdf2Sync`) — instead of a byte-preserving fake. The adapter
 * is a real cryptographic implementation that mirrors the native binding's wire
 * contract; only the delivery mechanism is substituted, never the cryptography.
 *
 * Result: encrypt→decrypt fidelity is proven by REAL AES-256-GCM, the auth tag is
 * a genuine 16-byte GCM tag, a wrong key genuinely fails GCM authentication, and
 * the parameters the service hands the binding (`aes-256-gcm`, 100,000 PBKDF2
 * iterations, 256-bit key, SHA-256) are spy-asserted. A downgrade in
 * EncryptionService now breaks this suite.
 *
 * LANE: pre-push slow lane. The filename matches the `EncryptionService`
 * testPathPattern so `test:encryption` includes it; it contains none of
 * `unit`/`safety`/`clinical`, so the ~16s precommit fast lane skips it (real
 * PBKDF2 at 100k iterations is intentionally slower than the fake).
 *
 * Terminology: this protects wellness data with AES-256-GCM. Not PHI; not
 * "HIPAA-compliant encryption" — Being is a consumer wellness app, not a HIPAA
 * entity.
 */

// Buffer is a Node global in the Jest env — no import (an import creates a local
// binding the mock-factory hoister can't see).

// ---------------------------------------------------------------------------
// REAL-crypto adapter standing in for the native react-native-aes-crypto module.
// Defined inside the jest.mock factory (which is hoisted above imports), so it
// may only `require()` — it closes over nothing from module scope. Every jest.fn
// wraps the real implementation (`jest.fn(realImpl)`) so the SAME call that
// performs real crypto is the one whose params we assert.
// ---------------------------------------------------------------------------
jest.mock('react-native-aes-crypto', () => {
  const nodeCrypto = require('crypto');
  const GCM_TAG_BYTES = 16; // 128-bit GCM auth tag — the only length we accept.

  // Allowlist branch: refuse anything that is not aes-256-gcm. A silent
  // downgrade to aes-256-cbc / aes-128-gcm / aes-256-ctr must THROW here, not
  // route to a real-but-weaker cipher that round-trips cleanly (false green).
  const assertGcm = (algorithm: string) => {
    if (algorithm !== 'aes-256-gcm') {
      throw new Error(
        `real-crypto adapter: refusing non-AES-256-GCM algorithm "${algorithm}"`,
      );
    }
  };

  const realEncrypt = async (
    dataB64: string,
    keyB64: string,
    ivB64: string,
    algorithm: string,
  ): Promise<string> => {
    assertGcm(algorithm);
    const key = Buffer.from(keyB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const cipher = nodeCrypto.createCipheriv('aes-256-gcm', key, iv, {
      authTagLength: GCM_TAG_BYTES,
    });
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag(); // genuine 16-byte GCM tag
    // Wire contract the service expects: base64(ciphertext || tag).
    return Buffer.concat([ciphertext, tag]).toString('base64');
  };

  const realDecrypt = async (
    combinedB64: string,
    keyB64: string,
    ivB64: string,
    algorithm: string,
  ): Promise<string> => {
    assertGcm(algorithm);
    const key = Buffer.from(keyB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const combined = Buffer.from(combinedB64, 'base64');
    if (combined.length < GCM_TAG_BYTES) {
      throw new Error('real-crypto adapter: ciphertext shorter than the auth tag');
    }
    const ciphertext = combined.subarray(0, combined.length - GCM_TAG_BYTES);
    const tag = combined.subarray(combined.length - GCM_TAG_BYTES);
    // `{ authTagLength: 16 }` pins the integrity guarantee to a full 128-bit tag:
    // Node would otherwise accept a truncated (4–15 byte) tag via setAuthTag,
    // silently weakening it. With the option set, a wrong-length tag is rejected.
    const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', key, iv, {
      authTagLength: GCM_TAG_BYTES,
    });
    decipher.setAuthTag(tag);
    // final() throws "Unsupported state or unable to authenticate data" on a tag
    // mismatch (wrong key / tampered ciphertext). NEVER wrap this in try/catch —
    // swallowing it would make the wrong-key test pass for the wrong reason.
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      'base64',
    );
  };

  // PBKDF2 must forward exactly what the service sends. The service passes the
  // key length in BITS (EncryptionService deriveKeyPBKDF2: `keyLength * 8`), so
  // divide by 8 for Node's byte-length param. Do NOT hardcode iterations/digest:
  // hardcoding would make an iteration-count downgrade invisible here.
  const realPbkdf2 = async (
    passwordB64: string,
    saltB64: string,
    iterations: number,
    keyBitLength: number,
    digest: string,
  ): Promise<string> => {
    const password = Buffer.from(passwordB64, 'base64');
    const salt = Buffer.from(saltB64, 'base64');
    const derived = nodeCrypto.pbkdf2Sync(
      password,
      salt,
      iterations,
      keyBitLength / 8,
      digest,
    );
    return derived.toString('base64');
  };

  return {
    __esModule: true,
    default: {
      encrypt: jest.fn(realEncrypt),
      decrypt: jest.fn(realDecrypt),
      pbkdf2: jest.fn(realPbkdf2),
      // Round out the interface in case anything touches these paths.
      randomKey: jest.fn(async (length: number) =>
        nodeCrypto.randomBytes(length).toString('base64'),
      ),
      hmac256: jest.fn(async (data: string, key: string) =>
        nodeCrypto.createHmac('sha256', Buffer.from(key, 'base64'))
          .update(Buffer.from(data, 'base64'))
          .digest('base64'),
      ),
      sha256: jest.fn(async (data: string) =>
        nodeCrypto.createHash('sha256').update(data, 'utf-8').digest('base64'),
      ),
    },
  };
});

// expo-crypto: REAL randomness for IV/salt (distinct per call — GCM IV reuse
// under one key is catastrophic, so deterministic IVs would actively hide a bug)
// and a REAL SHA-256 digest so the service's integrity checksum is genuine.
jest.mock('expo-crypto', () => {
  const nodeCrypto = require('crypto');
  return {
    getRandomBytes: jest.fn((length: number) =>
      new Uint8Array(nodeCrypto.randomBytes(length)),
    ),
    getRandomBytesAsync: jest.fn(async (length: number) =>
      new Uint8Array(nodeCrypto.randomBytes(length)),
    ),
    digestStringAsync: jest.fn(async (_algo: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data, 'utf-8').digest('hex'),
    ),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256', SHA512: 'SHA-512' },
    CryptoEncoding: { HEX: 'hex', BASE64: 'base64' },
  };
});

// expo-secure-store: in-memory backing so master-key persistence round-trips.
// Exposed at module scope so the wrong-key test can swap the stored master key.
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

// Force Platform.OS = 'ios' so EncryptionService takes the native binding path
// (our real-crypto adapter) rather than the Web Crypto branch.
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: { OS: 'ios', select: (obj: any) => obj.ios ?? obj.default },
}));

// Import after mocks so the service binds to our shims.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EncryptionService, ENCRYPTION_CONFIG } = require('../EncryptionService');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AesCrypto = require('react-native-aes-crypto').default as {
  encrypt: jest.Mock;
  decrypt: jest.Mock;
  pbkdf2: jest.Mock;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodeCrypto = require('crypto');

const b64Len = (b64: string): number => Buffer.from(b64, 'base64').length;

beforeEach(() => {
  mockSecureStoreMap.clear();
  // clearAllMocks resets mock.calls/results but KEEPS the jest.fn(realImpl)
  // implementation (mockClear, not mockReset) — so real crypto still runs while
  // call-arg assertions start from a clean slate each test.
  jest.clearAllMocks();
});

afterEach(() => {
  // Null the singleton + in-flight init promise so the next test cold-inits a
  // fresh master key. destroy() alone leaves the instance populated.
  EncryptionService.__resetForTesting__();
});

describe('EncryptionService — real AES-256-GCM round-trip (MAINT-234 compliance gate)', () => {
  it('round-trips wellness data through genuine AES-256-GCM encrypt → decrypt', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    const plaintext = 'the user logged a low-mood check-in';
    const pkg = await service.encryptData(plaintext, 'level_2_assessment_data');

    // Ciphertext must NOT be the plaintext (guards against an identity cipher).
    const ciphertextBytes = Buffer.from(pkg.encryptedData, 'base64');
    expect(ciphertextBytes.equals(Buffer.from(plaintext, 'utf-8'))).toBe(false);
    expect(pkg.encryptedData).not.toContain(Buffer.from(plaintext, 'utf-8').toString('base64'));

    // Genuine GCM wire format: 16-byte auth tag, 12-byte (96-bit) IV nonce.
    expect(b64Len(pkg.tag)).toBe(ENCRYPTION_CONFIG.TAG_LENGTH);
    expect(b64Len(pkg.tag)).toBe(16);
    expect(b64Len(pkg.iv)).toBe(ENCRYPTION_CONFIG.IV_LENGTH);
    expect(b64Len(pkg.iv)).toBe(12);

    // Real decryption recovers the exact plaintext.
    const recovered = await service.decryptData(pkg);
    expect(recovered).toBe(plaintext);
  });

  it('round-trips a structured assessment object (PHQ-9 shape) losslessly', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    const assessment = {
      type: 'PHQ-9',
      responses: [1, 2, 3, 0, 2, 1, 3, 2, 0],
      totalScore: 14,
      timestamp: 1716000000000,
    };
    const pkg = await service.encryptData(assessment, 'level_2_assessment_data');
    const recovered = await service.decryptData(pkg);

    expect(recovered).toEqual(assessment);
  });

  it('passes aes-256-gcm + 100,000-iteration SHA-256 PBKDF2 (256-bit key) to the binding', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();
    // Clear init-time crypto calls (verifyEncryptionCapabilities encrypts a
    // probe) so mock.calls[0] is unambiguously our operation below.
    jest.clearAllMocks();

    const pkg = await service.encryptData('spy-target', 'level_2_assessment_data');

    // --- Algorithm: encrypt path. A swap to aes-256-cbc / aes-128-gcm fails here.
    expect(AesCrypto.encrypt).toHaveBeenCalled();
    const encryptArgs = AesCrypto.encrypt.mock.calls[0];
    expect(encryptArgs[3]).toBe('aes-256-gcm');

    // --- PBKDF2 params: iterations / key-bits / digest. This is THE assertion
    // the ticket exists for — the byte-fake ignored the iteration count entirely.
    const pbkdf2Args = AesCrypto.pbkdf2.mock.calls[0];
    expect(pbkdf2Args[2]).toBe(ENCRYPTION_CONFIG.PBKDF2_ITERATIONS); // 100000
    expect(pbkdf2Args[2]).toBe(100000);
    expect(pbkdf2Args[3]).toBe(ENCRYPTION_CONFIG.KEY_LENGTH * 8); // 256-bit key → AES-256
    expect(pbkdf2Args[3]).toBe(256);
    expect(pbkdf2Args[4]).toBe('sha256');

    // --- Algorithm: decrypt path must ALSO be aes-256-gcm (partial downgrades).
    await service.decryptData(pkg);
    const decryptArgs = AesCrypto.decrypt.mock.calls[0];
    expect(decryptArgs[3]).toBe('aes-256-gcm');
  });

  it('uses a fresh IV per encryption (no GCM nonce reuse) while both decrypt', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    const data = { note: 'same payload twice' };
    const pkg1 = await service.encryptData(data, 'level_2_assessment_data');
    const pkg2 = await service.encryptData(data, 'level_2_assessment_data');

    expect(pkg1.iv).not.toBe(pkg2.iv); // distinct nonces
    expect(pkg1.encryptedData).not.toBe(pkg2.encryptedData); // distinct ciphertext
    expect(await service.decryptData(pkg1)).toEqual(data);
    expect(await service.decryptData(pkg2)).toEqual(data);
  });

  it('fails to decrypt under a wrong master key (real GCM auth rejection, service level)', async () => {
    const service = EncryptionService.getInstance();
    await service.initialize();

    const pkg = await service.encryptData('protected wellness note', 'level_1_crisis_responses');

    // Swap the stored master key for a different valid 32-byte key. The service
    // re-derives the per-op key from (newMaster, storedSalt) → wrong key →
    // GCM authentication fails inside performAESGCMDecryption BEFORE the
    // checksum check, so the rejection is genuinely auth-driven.
    const wrongMaster = nodeCrypto.randomBytes(ENCRYPTION_CONFIG.KEY_LENGTH).toString('base64');
    mockSecureStoreMap.set(ENCRYPTION_CONFIG.MASTER_KEY_ID, wrongMaster);

    await expect(service.decryptData(pkg)).rejects.toThrow(/decryption failed/i);
  });
});

describe('EncryptionService real-crypto adapter — direct GCM guarantees (MAINT-234)', () => {
  // These exercise the Node-crypto adapter directly (bypassing the service) so
  // the wrong-key / tamper failures are provably from GCM tag verification and
  // not from a structural error earlier in the service pipeline. Each negative
  // test is paired with a positive control: a wrong-key throw only proves
  // something if the right key still succeeds.
  const key = (): string => nodeCrypto.randomBytes(32).toString('base64');
  const iv = (): string => nodeCrypto.randomBytes(12).toString('base64');
  const plain = (): string => Buffer.from('wellness payload', 'utf-8').toString('base64');

  it('decrypts with the correct key (positive control) and rejects a wrong key', async () => {
    const keyA = key();
    const nonce = iv();
    const combined = await AesCrypto.encrypt(plain(), keyA, nonce, 'aes-256-gcm');

    // Positive control: correct key recovers plaintext.
    await expect(AesCrypto.decrypt(combined, keyA, nonce, 'aes-256-gcm')).resolves.toBe(plain());

    // Negative: a genuinely different key fails GCM authentication.
    const keyB = key();
    await expect(AesCrypto.decrypt(combined, keyB, nonce, 'aes-256-gcm')).rejects.toThrow();
  });

  it('rejects a tampered (flipped) auth tag', async () => {
    const k = key();
    const nonce = iv();
    const combined = await AesCrypto.encrypt(plain(), k, nonce, 'aes-256-gcm');

    // Flip the final byte (inside the 16-byte tag) → GCM integrity fails.
    const bytes = Buffer.from(combined, 'base64');
    bytes[bytes.length - 1] ^= 0xff;
    const tampered = bytes.toString('base64');

    await expect(AesCrypto.decrypt(tampered, k, nonce, 'aes-256-gcm')).rejects.toThrow();
  });

  it('refuses any algorithm other than aes-256-gcm (downgrade guard)', async () => {
    const k = key();
    const nonce = iv();
    await expect(AesCrypto.encrypt(plain(), k, nonce, 'aes-256-cbc')).rejects.toThrow(
      /non-AES-256-GCM/i,
    );
    await expect(AesCrypto.encrypt(plain(), k, nonce, 'aes-128-gcm')).rejects.toThrow(
      /non-AES-256-GCM/i,
    );
  });

  it('rejects a truncated ciphertext (integrity preserved, no silent decrypt)', async () => {
    const k = key();
    const nonce = iv();
    const combined = await AesCrypto.encrypt(plain(), k, nonce, 'aes-256-gcm');

    // Drop trailing bytes → the tag window no longer matches the ciphertext, so
    // GCM authentication must fail rather than silently return partial plaintext.
    const bytes = Buffer.from(combined, 'base64');
    const truncated = bytes.subarray(0, bytes.length - 4).toString('base64');
    await expect(AesCrypto.decrypt(truncated, k, nonce, 'aes-256-gcm')).rejects.toThrow();

    // And a payload shorter than the 16-byte tag is rejected structurally.
    const tooShort = nodeCrypto.randomBytes(8).toString('base64');
    await expect(AesCrypto.decrypt(tooShort, k, nonce, 'aes-256-gcm')).rejects.toThrow(
      /shorter than the auth tag/i,
    );
  });
});
