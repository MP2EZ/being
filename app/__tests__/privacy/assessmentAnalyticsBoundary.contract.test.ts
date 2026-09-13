/**
 * DEBUG-536 — the ACCESS-not-CONTENT boundary on the assessment analytics pair.
 *
 * `assessment_started` / `assessment_completed` say that the wellness-screening flow
 * was entered and finished, and how long it took. They must never say WHICH instrument
 * was taken, what it scored, or how severe the result was.
 *
 * This is the same defence-in-depth shape `guidanceAnalyticsBoundary.contract.test.ts`
 * gives FEAT-457's `guidance_opened` domain tokens, and it exists because the review
 * that permitted these two events rested on exactly this boundary holding. Compliance's
 * ruling: they sit inside the published "we never collect any mental health data"
 * promise for the same reason `crisis_resources_viewed` / `crisis_hotline_tapped` do —
 * bare access signals for a strictly more sensitive affordance, shipping to PostHog
 * today. Access is not the finding.
 *
 * WHY THIS FILE AND NOT A CODE COMMENT: the FILTER IS NOT THE CONTROL for this class.
 * `phq`, `gad`, `score` and `severity` are PHI_KEYWORDS, so those particular values
 * block — but a key like `instrument: 'depression'` would validate untouched. The
 * trackers take no instrument parameter at all, and that absence is what actually
 * holds. This suite pins the half the filter DOES cover, so that a future author who
 * adds a parameter finds a red rather than a silent success.
 */

import { PHIFilter } from '@/core/analytics/PHIFilter';

const ASSESSMENT_EVENTS = ['assessment_started', 'assessment_completed'] as const;

describe('assessment analytics boundary (DEBUG-536)', () => {
  describe('the real payloads transmit', () => {
    it.each(ASSESSMENT_EVENTS)('%s with no properties is valid', (event) => {
      expect(PHIFilter.validate(event, {})).toMatchObject({ valid: true });
    });

    it('assessment_completed with only a duration is valid', () => {
      // `duration_ms` is in SAFE_NUMERIC_KEYS; this is the entire real payload.
      expect(PHIFilter.validate('assessment_completed', { duration_ms: 180000 })).toMatchObject({
        valid: true,
      });
    });
  });

  describe('instrument identity and findings are rejected', () => {
    // Each of these is a property someone could plausibly reach for, and each would
    // re-disclose what DEBUG-239's screen-name coarsening exists to suppress.
    const FORBIDDEN: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
      ['instrument name', { instrument: 'phq9' }],
      ['instrument as a bare key', { phq: 1 }],
      ['the other instrument', { gad: 1 }],
      ['a score', { score: 18 }],
      ['a severity bucket', { severity: 'severe' }],
      ['a result', { result: 'moderate' }],
    ];

    it.each(FORBIDDEN)('%s is blocked on assessment_completed', (_label, payload) => {
      expect(PHIFilter.validate('assessment_completed', payload)).toMatchObject({
        valid: false,
      });
    });

    it('the enumeration is non-empty and the matcher still fires (DEBUG-390)', () => {
      // Without this, an empty FORBIDDEN list — or a validate() that started returning
      // valid:false for everything — would look identical to a working boundary.
      expect(FORBIDDEN.length).toBeGreaterThanOrEqual(6);
      expect(PHIFilter.validate('assessment_completed', { duration_ms: 1000 }).valid).toBe(true);
      expect(PHIFilter.validate('not_a_real_event', {}).valid).toBe(false);
    });
  });

  describe('the neutral-token laundering route stays closed', () => {
    it('documents why a sanitized instrument token is not an escape hatch', () => {
      // `wellness_9` / `wellness_7` were REJECTED on review as laundering rather than
      // sanitization: they defeat the keyword filter while preserving the inference.
      // The filter therefore PASSES them — which is precisely the point, and why the
      // control is the trackers' missing parameter plus this recorded ruling, not
      // validate(). Asserting the filter blocks them would be asserting a falsehood.
      expect(PHIFilter.validate('assessment_started', { instrument: 'wellness_9' })).toMatchObject({
        valid: true,
      });
    });
  });
});
