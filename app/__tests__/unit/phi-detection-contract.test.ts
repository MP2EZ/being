/**
 * PHI detection contract (MAINT-202).
 *
 * Pins the PATTERN COVERAGE of the `containsPHI(data)` predicate. It does not pin
 * the wiring, and the predicate does not gate every analytics event — this
 * docblock used to say it did (DEBUG-553). What actually happens: `PHIFilter`
 * calls `containsPHI` from `scanValue`, on string property VALUES only, and skips
 * it entirely when the key is in `SAFE_PROPERTY_KEYS`. Numeric values and property
 * keys are checked by other branches. That wiring is pinned by
 * `__tests__/privacy/phiFilterScanSurface.privacy.test.ts`; the one assertion here
 * that touches it is the wiring guard at the bottom of this file.
 *
 * Two obligations:
 *   1. The fix: PHI scanning is scoped to the user-supplied `data` payload, so a
 *      service-injected 13-digit timestamp in the ENVELOPE no longer false-flags
 *      (the bug that silently dropped every consent-passing event).
 *   2. No weakening: every PHI pattern category is still blocked when it appears
 *      INSIDE the `data` payload — including a raw 10+-digit identifier.
 *
 * Tests the real production `PHI_DETECTION_PATTERNS` set (not a test-local
 * auditor), against the standalone module, so it carries no singleton /
 * native-module setup.
 */

jest.mock('@/core/services/logging', () => ({
  logSecurity: jest.fn(),
  logAnalytics: jest.fn(),
}));

import { containsPHI } from '@/core/analytics/phiDetection';
import { PHIFilter } from '@/core/analytics/PHIFilter';

describe('containsPHI — analytics PHI detection (MAINT-202)', () => {
  describe('blocks PHI inside the data payload (no weakening)', () => {
    it.each([
      ['email address', { email: 'user@example.com' }],
      ['SSN', { id: '123-45-6789' }],
      ['raw 10+-digit identifier', { mrn: '1234567890' }],
      ['raw precise timestamp value in data', { recorded_at: 1727596800000 }],
      ['US phone number', { contact: '(555) 123-4567' }],
      ['IPv4 address', { ip: '192.168.1.100' }],
      ['UUID device identifier', { device: '550e8400-e29b-41d4-a716-446655440000' }],
      ['crisis keyword', { note: 'having thoughts of suicide' }],
      ['PHQ-9 score in free text', { summary: 'PHQ-9: 18' }],
      ['score in context', { detail: 'total: 12' }],
    ])('blocks %s', (_label, payload) => {
      expect(containsPHI(payload)).toBe(true);
    });
  });

  describe('allows PHI-free bucketed payloads (the real analytics shape)', () => {
    it('allows a bucket-only sync_operation_performed payload', () => {
      expect(
        containsPHI({
          sync_type: 'manual',
          duration_bucket: 'fast',
          success: true,
          network_quality: 'excellent',
          data_size_bucket: 'medium',
        })
      ).toBe(false);
    });

    it('allows a severity-bucketed assessment payload', () => {
      expect(containsPHI({ assessment_type: 'gad7', severity_bucket: 'mild' })).toBe(false);
    });

    it('allows empty, null, and undefined payloads without throwing', () => {
      expect(containsPHI({})).toBe(false);
      expect(containsPHI(null)).toBe(false);
      expect(containsPHI(undefined)).toBe(false);
    });
  });

  describe('the MAINT-202 fix: the service envelope is never the scan surface', () => {
    // The bug was scanning the whole event, whose injected `timestamp: Date.now()`
    // (13 digits) matched /\b\d{10,}\b/. containsPHI receives `data` only, so a
    // bucket-only payload passes even though a 13-digit envelope timestamp exists.
    it('passes a clean data payload even though Date.now() envelopes are 13 digits', () => {
      // Sanity-check the premise: a 13-digit number really does trip the pattern
      // when present in the scanned surface...
      expect(containsPHI({ leaked_envelope_ts: Date.now() })).toBe(true);
      // ...but a clean data payload (envelope kept out by the caller) does not.
      expect(containsPHI({ sync_type: 'auto', duration_bucket: 'normal', success: true })).toBe(false);
    });
  });

  describe('stateful-regex safety (lastIndex reset across calls)', () => {
    // The patterns use the /g flag and are module-level singletons; without a
    // lastIndex reset, a match on one call corrupts the next call's result.
    it('returns correct results across repeated alternating calls', () => {
      for (let i = 0; i < 3; i++) {
        expect(containsPHI({ email: 'a@b.com' })).toBe(true);
        expect(containsPHI({ status: 'clean' })).toBe(false);
      }
    });
  });

  describe('wiring guard: PHIFilter actually calls containsPHI (DEBUG-553)', () => {
    // Everything above this block tests the predicate in isolation, and would stay
    // green if nothing called it — which was true of this whole suite until
    // INFRA-535. This block is the part that reds if the wire is cut.
    //
    // The payload is chosen so ONLY containsPHI can reject it: `field` is not a
    // PHI_KEYWORDS segment, and the value 'a@b.com' contains no keyword substring
    // either, so neither the key scan nor the value keyword scan fires. The email
    // regex in PHI_DETECTION_PATTERNS is the only thing that can catch it.
    const WIRED_PAYLOAD = { field: 'a@b.com' };

    it('rejects a payload only the pattern set can catch', () => {
      const result = PHIFilter.validate('settings_opened', WIRED_PAYLOAD);
      expect(result.valid).toBe(false);
      // Assert the containsPHI BRANCH specifically. `scanValue` reports keyword
      // hits as "PHI keyword detected" and containsPHI hits as "PHI pattern
      // detected", so matching the reason is what distinguishes a live wire from
      // an unrelated rejection. Deleting the containsPHI call at the value branch
      // flips this to valid:true.
      expect(result.reason).toMatch(/PHI pattern detected/);
    });

    it('admits the same shape when the value is clean', () => {
      // The negative half. Without it the assertion above would still pass if
      // validate() rejected everything, which is the vacuous-green shape this
      // item exists to correct.
      expect(PHIFilter.validate('settings_opened', { field: 'clean' }).valid).toBe(true);
    });
  });
});
