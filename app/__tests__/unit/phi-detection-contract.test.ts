/**
 * PHI detection contract (MAINT-202).
 *
 * Guards the `containsPHI(data)` predicate that gates every analytics event.
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

import { containsPHI } from '@/core/analytics/phiDetection';

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
});
