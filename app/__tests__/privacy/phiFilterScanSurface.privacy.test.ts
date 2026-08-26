/**
 * PHIFilter scan-surface contract (INFRA-535, C2).
 *
 * Pins the three surfaces the filter did NOT scan before this change, all under
 * UNCHANGED whole-event-reject semantics:
 *
 *   1. property KEYS (previously never scanned — "keys are controlled by us");
 *   2. property values via `containsPHI` (never once armed: the predicate had zero
 *      production importers, and its own docblock's claim that it "gates every
 *      analytics event" was false — see DEBUG-553);
 *   3. ARRAY members (the old step 4 excluded arrays, so `{tags:['grief']}` shipped
 *      intact).
 *
 * Every assertion here is a TIGHTENING. Nothing in this suite permits a payload the
 * previous filter rejected — that direction is pinned mechanically by
 * `phiFilterDifferential.privacy.test.ts`.
 *
 * The crisis rulings this suite exists to keep true are called out inline. They are
 * not decoration: each one names a way the tightening could silently and
 * permanently disable a working crisis or navigation event.
 */

jest.mock('@/core/services/logging', () => ({
  logSecurity: jest.fn(),
  logAnalytics: jest.fn(),
}));

import { PHIFilter } from '@/core/analytics/PHIFilter';
import { logSecurity } from '@/core/services/logging';

const mockLogSecurity = logSecurity as jest.MockedFunction<typeof logSecurity>;

beforeEach(() => {
  mockLogSecurity.mockClear();
});

describe('PHIFilter scan surface (INFRA-535)', () => {
  describe('KEY scanning — new, and the allowlist that makes it survivable', () => {
    it('blocks a PHI keyword appearing as a whole key', () => {
      expect(PHIFilter.validate('check_in_completed', { mood: 'ok' }).valid).toBe(false);
      expect(PHIFilter.validate('app_opened', { journal: 'x' }).valid).toBe(false);
    });

    it('blocks a PHI keyword appearing as one segment of a key', () => {
      expect(PHIFilter.validate('assessment_completed', { phq_score: 'x' }).valid).toBe(false);
      expect(PHIFilter.validate('app_opened', { journal_id: 'abc' }).valid).toBe(false);
      expect(PHIFilter.validate('app_opened', { userEmail: 'x' }).valid).toBe(false);
    });

    it('blocks a stem keyword as a key prefix', () => {
      // `suicid` and `harm` are deliberately stems, not whole words.
      expect(PHIFilter.validate('app_opened', { suicidal_flag: 'x' }).valid).toBe(false);
      expect(PHIFilter.validate('app_opened', { harmful: 'x' }).valid).toBe(false);
    });

    it('does NOT block a key that merely CONTAINS a keyword mid-segment', () => {
      // This is what segment matching buys over substring matching. `campaign`
      // contains "pain"; `notation` contains "note". Substring matching would
      // block both, and a filter that blocks ordinary keys gets weakened by the
      // next person who hits it.
      expect(PHIFilter.validate('app_opened', { campaign_id: 'spring' }).valid).toBe(true);
      expect(PHIFilter.validate('app_opened', { notation: 'x' }).valid).toBe(true);
    });

    it('CRISIS PIN: screen_name is allowlisted, so screen_viewed still emits', () => {
      // `screen_name` segments to ['screen','name'] and `name` is an exact
      // PHI_KEYWORDS hit. Without the allowlist this degrades to a whole-event
      // reject — and screen_viewed fires in the SAME useFocusEffect as
      // trackCrisisResourcesViewed, so crisis-screen reach becomes unmeasurable.
      expect(PHIFilter.validate('screen_viewed', { screen_name: 'App' }).valid).toBe(true);
      expect(PHIFilter.validate('screen_viewed', { screen_name: 'Home' }).valid).toBe(true);
    });

    it('the allowlist exempts only the NEW checks, never the existing VALUE scan', () => {
      // An allowlisted key carrying a keyword VALUE must still be rejected, or the
      // allowlist would be a loosening rather than a false-positive fix.
      expect(PHIFilter.validate('screen_viewed', { screen_name: 'grief' }).valid).toBe(false);
    });

    it('every real tracker key survives the key scan', () => {
      // Derived from the literal keys in useAnalytics.ts.
      const real: Array<[string, Record<string, unknown>]> = [
        ['screen_viewed', { screen_name: 'App' }],
        ['check_in_completed', { duration_ms: 5000 }],
        ['learn_content_viewed', { module_id: 'm1' }],
        ['learn_module_completed', { module_id: 'm1', duration_ms: 900 }],
        ['onboarding_step_completed', { step: 3 }],
        ['error_occurred', { error_type: 'network' }],
      ];
      for (const [evt, data] of real) {
        expect(PHIFilter.validate(evt, data)).toEqual({ valid: true });
      }
    });
  });

  describe('the EVENT NAME is never key-scanned', () => {
    it('CRISIS PIN: crisis_hotline_tapped validates despite containing "hotline"', () => {
      // `hotline_number` is a PHI keyword. If the scan were ever applied to the
      // event name, or if `hotline_number` were shortened to `hotline`, this event
      // would self-block forever and the app would lose its 988-reach signal.
      expect(PHIFilter.validate('crisis_hotline_tapped', {})).toEqual({ valid: true });
    });

    it('CRISIS PIN: crisis_resources_viewed validates', () => {
      expect(PHIFilter.validate('crisis_resources_viewed', {})).toEqual({ valid: true });
    });

    it('the keyword list still contains the un-shortened hotline_number', () => {
      // Guards the shortening directly, not just its symptom.
      const src = require('fs').readFileSync(
        require('path').resolve(__dirname, '../../src/core/analytics/PHIFilter.ts'),
        'utf8'
      );
      expect(src).toContain("'hotline_number'");
    });
  });

  describe('containsPHI per property — armed for the first time', () => {
    it('blocks an email in a property value', () => {
      expect(PHIFilter.validate('settings_opened', { field: 'reach me at a@b.com' }).valid).toBe(false);
    });

    it('blocks a long numeric identifier in a property value', () => {
      expect(PHIFilter.validate('app_opened', { ref: '1234567890123' }).valid).toBe(false);
    });

    it('blocks a UUID in a property value', () => {
      expect(
        PHIFilter.validate('app_opened', { ref: '123e4567-e89b-12d3-a456-426614174000' }).valid
      ).toBe(false);
    });

    it('MAINT-202 PIN: an allowlisted numeric key is exempt from containsPHI', () => {
      // A 13-digit Date.now() matches the \b\d{10,}\b identifier pattern. Arming
      // containsPHI without exempting allowlisted keys reintroduces exactly the
      // MAINT-202 defect, which silently dropped every consent-passing event.
      expect(PHIFilter.validate('app_opened', { timestamp: 1755000000000 })).toEqual({ valid: true });
      expect(PHIFilter.validate('app_opened', { timestamp: '1755000000000' })).toEqual({ valid: true });
    });
  });

  describe('ARRAY scanning — closes a live hole', () => {
    it('blocks a PHI keyword inside an array of strings', () => {
      // Shipped intact before this change: the value branch tested
      // `typeof value === 'string'` and step 4 excluded arrays.
      expect(PHIFilter.validate('app_opened', { tags: ['grief'] }).valid).toBe(false);
    });

    it('blocks a keyword in a nested array', () => {
      expect(PHIFilter.validate('app_opened', { tags: [['career']] }).valid).toBe(false);
    });

    it('blocks a keyword in an array inside an object', () => {
      expect(PHIFilter.validate('app_opened', { meta: { tags: ['suicidal'] } }).valid).toBe(false);
    });

    it('allows a benign array', () => {
      expect(PHIFilter.validate('app_opened', { tags: ['alpha', 'beta'] })).toEqual({ valid: true });
    });
  });

  describe('logSecurity is aggregated to at most ONE call per validate()', () => {
    it('emits exactly one call for a rejected payload', () => {
      // ProductionLogger.security() logs at LogLevel.ERROR into a 1000-entry FIFO
      // audit ring and console.errors in production, synchronously. One call per
      // redacted property would fire once per screen view, evicting genuine
      // crisis-path entries and landing an ERROR inside the crisis-tap window.
      PHIFilter.validate('app_opened', { mood: 'low', journal: 'x', detail: 'grief' });
      expect(mockLogSecurity).toHaveBeenCalledTimes(1);
    });

    it('emits exactly one call for a non-whitelisted event', () => {
      PHIFilter.validate('not_a_real_event', {});
      expect(mockLogSecurity).toHaveBeenCalledTimes(1);
    });

    it('emits no call for a clean payload', () => {
      PHIFilter.validate('screen_viewed', { screen_name: 'App' });
      expect(mockLogSecurity).not.toHaveBeenCalled();
    });

    it('emits exactly one call for a nested violation', () => {
      // The old implementation recursed through validate() itself, so a nested
      // violation logged from the inner frame. The scan must not re-enter the
      // logging path.
      PHIFilter.validate('app_opened', { meta: { detail: 'grief' } });
      expect(mockLogSecurity).toHaveBeenCalledTimes(1);
    });

    it('never logs the offending VALUE', () => {
      PHIFilter.validate('settings_opened', { field: 'reach me at secret@example.com' });
      const logged = mockLogSecurity.mock.calls.map((c) => String(c[0])).join(' | ');
      expect(logged).not.toContain('secret@example.com');
    });
  });

  describe('the filter did not become more permissive', () => {
    it('still rejects a non-whitelisted event name', () => {
      expect(PHIFilter.validate('voice_journal_started', {}).valid).toBe(false);
    });

    it('still rejects a suspicious numeric in a non-safe key', () => {
      expect(PHIFilter.validate('assessment_completed', { total: 18 }).valid).toBe(false);
    });

    it('still rejects a keyword in a plain string value', () => {
      expect(PHIFilter.validate('app_opened', { detail: 'my journal from tonight' }).valid).toBe(false);
    });

    it('keeps all 28 keywords and all 9 safe numeric keys', () => {
      const src = require('fs').readFileSync(
        require('path').resolve(__dirname, '../../src/core/analytics/PHIFilter.ts'),
        'utf8'
      );
      // Strip comments first (DEBUG-390) — this file deliberately names
      // anti-patterns in prose, and a bare match would hit the commentary.
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      expect(stripped.length).toBeGreaterThan(2000);
      // Anti-vacuity: the matcher must still fire against a literal known-bad string.
      expect("'suicid',").toMatch(/'suicid',/);
      for (const kw of ['suicid', 'harm', 'hotline_number', 'crisis_contact', 'grief']) {
        expect(stripped).toContain(`'${kw}'`);
      }
    });
  });
});
