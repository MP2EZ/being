/**
 * encryption.quick.test.ts — JEST_QUICK fast-path for ENCRYPTION_CONFIG.
 *
 * Pure constant assertions — no native deps, no key derivation, runs in
 * <50ms. The full EncryptionService behavioral suite lives in
 * `EncryptionService.test.ts` (heavier, uses mocks). This quick variant
 * pins the AES-256-GCM contract so anyone changing KEY_LENGTH or
 * PBKDF2_ITERATIONS gets <1s feedback.
 *
 * Why these specific constants matter:
 * - KEY_LENGTH=32 (256-bit) is the AES-256 requirement; a regression to
 *   16 silently degrades to AES-128 with no visible failure.
 * - IV_LENGTH=12 is the GCM-mandated nonce size; anything else
 *   technically works at runtime but breaks interop with FIPS-compliant
 *   AES-GCM implementations.
 * - PBKDF2_ITERATIONS=100000 meets the OWASP-recommended floor.
 * - PERFORMANCE_THRESHOLD_MS=200 matches the CLAUDE.md crisis-response
 *   budget — encryption must fit under it.
 */
import { ENCRYPTION_CONFIG } from '@/core/services/security/EncryptionService';

describe('ENCRYPTION_CONFIG — quick contract pin', () => {
  it('uses AES-256-GCM (256-bit key, 96-bit IV, 128-bit tag)', () => {
    expect(ENCRYPTION_CONFIG.ALGORITHM).toBe('AES-GCM');
    expect(ENCRYPTION_CONFIG.KEY_LENGTH).toBe(32); // bytes = 256 bits
    expect(ENCRYPTION_CONFIG.IV_LENGTH).toBe(12); // bytes = 96 bits (GCM)
    expect(ENCRYPTION_CONFIG.TAG_LENGTH).toBe(16); // bytes = 128 bits
  });

  it('uses ≥100,000 PBKDF2 iterations (OWASP floor)', () => {
    expect(ENCRYPTION_CONFIG.PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(100000);
  });

  it('uses ≥32-byte salt (256-bit)', () => {
    expect(ENCRYPTION_CONFIG.SALT_LENGTH).toBeGreaterThanOrEqual(32);
  });

  it('performance threshold matches the <200ms crisis-response budget', () => {
    expect(ENCRYPTION_CONFIG.PERFORMANCE_THRESHOLD_MS).toBe(200);
  });

  it('key rotation interval is exactly 30 days', () => {
    expect(ENCRYPTION_CONFIG.KEY_ROTATION_INTERVAL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('crisis + assessment key prefixes exist and differ', () => {
    expect(typeof ENCRYPTION_CONFIG.CRISIS_KEY_PREFIX).toBe('string');
    expect(typeof ENCRYPTION_CONFIG.ASSESSMENT_KEY_PREFIX).toBe('string');
    expect(ENCRYPTION_CONFIG.CRISIS_KEY_PREFIX).not.toBe(
      ENCRYPTION_CONFIG.ASSESSMENT_KEY_PREFIX,
    );
  });
});
