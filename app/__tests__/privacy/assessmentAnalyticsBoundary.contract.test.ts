/**
 * DEBUG-536, then DEBUG-821 — the assessment analytics pair is RETIRED.
 *
 * `assessment_started` / `assessment_completed` used to say that the wellness-screening
 * flow was entered and finished. DEBUG-536 pinned the ACCESS-not-CONTENT boundary on
 * them: never which instrument, score or severity. DEBUG-821 (ruling B "minimise",
 * founder decision 2026-10-23) went further and stopped sending them at all: tied to the
 * persistent distinct_id, even access to a screening is consumer health data under WA
 * MHMDA (regulatory-applicability.md §2a).
 *
 * So the pins are now: neither name transmits, with any payload, and the screening-content
 * keywords still block on the feature-usage events that remain, so a future author cannot
 * re-route the inference through one of them. `retiredHealthEvents.contract.test.ts` pins
 * the tracker half (no capture at all).
 */

import { PHIFilter } from '@/core/analytics/PHIFilter';

const ASSESSMENT_EVENTS = ['assessment_started', 'assessment_completed'] as const;

describe('assessment analytics boundary (DEBUG-536, retired by DEBUG-821)', () => {
  describe('neither event transmits, whatever it carries', () => {
    it.each(ASSESSMENT_EVENTS)('%s with no properties is rejected', (event) => {
      expect(PHIFilter.validate(event, {})).toMatchObject({ valid: false });
      expect(PHIFilter.isWhitelisted(event)).toBe(false);
    });

    it('assessment_completed with only a duration, the old real payload, is rejected', () => {
      expect(PHIFilter.validate('assessment_completed', { duration_ms: 180000 })).toMatchObject({
        valid: false,
      });
    });

    it('a laundered instrument token does not reopen it', () => {
      // `wellness_9` / `wellness_7` were rejected on review as laundering: they defeat the
      // keyword filter while preserving the inference. The whitelist now rejects the event
      // before any value is read.
      expect(PHIFilter.validate('assessment_started', { instrument: 'wellness_9' })).toMatchObject({
        valid: false,
      });
    });
  });

  describe('screening content is rejected on the feature-usage events that remain', () => {
    // Each is a property someone could plausibly reach for to rebuild the retired signal
    // on a live event.
    const FORBIDDEN: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
      ['instrument name', { instrument: 'phq9' }],
      ['instrument as a bare key', { phq: 1 }],
      ['the other instrument', { gad: 1 }],
      ['a score', { score: 18 }],
      ['a severity bucket', { severity: 'severe' }],
      ['a result', { result: 'moderate' }],
    ];

    it.each(FORBIDDEN)('%s is blocked on check_in_completed', (_label, payload) => {
      expect(PHIFilter.validate('check_in_completed', payload)).toMatchObject({ valid: false });
    });

    it('the enumeration is non-empty and the matcher still fires (DEBUG-390)', () => {
      // Without this, an empty FORBIDDEN list — or a validate() that started returning
      // valid:false for everything — would look identical to a working boundary.
      expect(FORBIDDEN.length).toBeGreaterThanOrEqual(6);
      expect(PHIFilter.validate('check_in_completed', { duration_ms: 1000 }).valid).toBe(true);
      expect(PHIFilter.validate('not_a_real_event', {}).valid).toBe(false);
    });
  });
});
