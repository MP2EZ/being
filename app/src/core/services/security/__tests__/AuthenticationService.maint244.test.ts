/**
 * AuthenticationService — JWT signature hygiene (MAINT-244)
 *
 * Pins the honest-minimal token contract: `generateAuthenticationToken` emits an
 * UNSECURED JWT (RFC 7519 §6, `alg:"none"`) with an EMPTY signature segment, and no
 * keyless truncated-SHA-256 is computed or labeled `HS256`.
 *
 * Context: the produced accessToken is never verified anywhere in the app (SEC-W4).
 * Implementing a real HMAC would protect nothing without a verifier, so the fix is to
 * stop the forgeable-signature theater and the false `HS256` claim. Genuine per-user
 * session signing/verification is deferred to INFRA-260.
 */

// Break the SecureStorageService → EncryptionService key-rotation setInterval chain
// (hangs Jest otherwise). Same pattern as AuthenticationService.test.ts / .sec03.
jest.mock('../SecureStorageService', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1]),
}));

// If generateTokenSignature were still present it would call digestStringAsync; this
// mock would let it return a deterministic 32-char-truncatable hex, which the
// assertions below explicitly reject. getRandomBytesAsync backs generateSecureId
// (the refresh token), which is unaffected by this change.
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async () => 'a'.repeat(64)),
  getRandomBytesAsync: jest.fn(async (n: number) => new Uint8Array(n).fill(7)),
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  CryptoEncoding: { HEX: 'hex', BASE64: 'base64' },
}));

// Default export is the singleton INSTANCE (AuthenticationService.getInstance());
// generateAuthenticationToken is an instance method, so use the default import.
import AuthenticationService from '../AuthenticationService';

type TokenMaker = {
  generateAuthenticationToken: (user: unknown) => Promise<{ accessToken: string }>;
};

const mockUser = {
  userId: 'user-123',
  authenticationLevel: 'standard',
  authenticationMethod: 'device',
  deviceId: 'device-abc',
  sessionId: 'session-xyz',
  authenticatedAt: 0,
  expiresAt: 0,
  lastActivityAt: 0,
  permissions: ['read'],
  isCrisisAccess: false,
  isProfessionalAccess: false,
  biometricEnabled: false,
};

const decodeSegment = (seg: string): Record<string, unknown> =>
  JSON.parse(Buffer.from(seg, 'base64').toString('utf-8'));

describe('AuthenticationService — JWT signature hygiene (MAINT-244)', () => {
  const makeToken = () =>
    (AuthenticationService as unknown as TokenMaker).generateAuthenticationToken(mockUser);

  it('emits an unsecured JWT header (alg:"none", RFC 7519 §6) — never HS256', async () => {
    const { accessToken } = await makeToken();
    const header = decodeSegment(accessToken.split('.')[0]);
    expect(header.alg).toBe('none');
    expect(header.typ).toBe('JWT');
  });

  it('produces an EMPTY signature segment (no value to forge)', async () => {
    const { accessToken } = await makeToken();
    const parts = accessToken.split('.');
    expect(parts).toHaveLength(3);
    expect(parts[2]).toBe('');
  });

  it('computes no keyless truncated-SHA-256 signature (no 32-char hex sig)', async () => {
    const { accessToken } = await makeToken();
    const signatureSegment = accessToken.split('.')[2];
    expect(signatureSegment).not.toMatch(/^[a-f0-9]{32}$/);
  });

  it('still carries the user claims in the payload (subject = userId)', async () => {
    const { accessToken } = await makeToken();
    const payload = decodeSegment(accessToken.split('.')[1]);
    expect(payload.sub).toBe('user-123');
  });
});
