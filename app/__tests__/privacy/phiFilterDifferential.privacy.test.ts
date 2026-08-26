/**
 * PHIFilter differential contract (INFRA-535).
 *
 * Pins ONE relation between the live filter and the frozen `d14d6178` baseline:
 *
 *     validateV1(p) rejects  ⟹  PHIFilter.validate(p) rejects
 *
 * It is deliberately ONE-SIDED. The converse is NOT asserted, because INFRA-535
 * legitimately makes the filter reject payloads the baseline accepted — property
 * KEYS are now scanned, `containsPHI` now runs per property, and arrays are now
 * traversed (the baseline's step 4 excludes them, so `{tags:['grief']}` passed
 * intact). Asserting equivalence would forbid exactly the tightening this item
 * exists to deliver.
 *
 * Compliance framing: the filter may become NARROWER, never LOOSER. This suite is
 * the mechanical form of that ruling. A future change that lets any
 * baseline-rejected payload through fails here.
 *
 * DEBUG-390 discipline: a differential harness whose corpus contains no rejections
 * is vacuously green and stays green forever. Three guards below — corpus size,
 * a pinned minimum rejection count, and a live matcher check — exist so this suite
 * can still go red.
 */

import { PHIFilter } from '@/core/analytics/PHIFilter';
import { containsPHI } from '@/core/analytics/phiDetection';
import {
  validateV1,
  BASELINE_PHI_KEYWORDS,
  BASELINE_SAFE_EVENT_TYPES,
} from '../helpers/phiFilterBaselineV1';

import * as fs from 'fs';
import * as path from 'path';

interface Case {
  readonly label: string;
  readonly eventType: string;
  readonly data: Record<string, unknown>;
}

/**
 * The differential corpus.
 *
 * Grouped by what each group proves. `expectV1Reject` is not asserted directly —
 * it documents intent and feeds the pinned-count guard, so that a future edit that
 * accidentally neuters the corpus (e.g. renaming a keyword out of existence) is
 * caught by the count rather than passing silently.
 */
const CORPUS: ReadonlyArray<Case> = [
  // ---- Benign: must pass BOTH filters. These are the payloads real trackers send.
  { label: 'app_opened bare', eventType: 'app_opened', data: {} },
  { label: 'crisis_resources_viewed bare', eventType: 'crisis_resources_viewed', data: {} },
  { label: 'crisis_hotline_tapped bare', eventType: 'crisis_hotline_tapped', data: {} },
  { label: 'guidance_opened bare', eventType: 'guidance_opened', data: {} },
  { label: 'screen_viewed coarsened', eventType: 'screen_viewed', data: { screen_name: 'App' } },
  { label: 'screen_viewed Home', eventType: 'screen_viewed', data: { screen_name: 'Home' } },
  { label: 'check_in_completed duration', eventType: 'check_in_completed', data: { duration_ms: 5000 } },
  { label: 'learn_content_viewed module', eventType: 'learn_content_viewed', data: { module_id: 'm1' } },
  { label: 'learn_module_completed pair', eventType: 'learn_module_completed', data: { module_id: 'm1', duration_ms: 900 } },
  { label: 'onboarding_step_completed step', eventType: 'onboarding_step_completed', data: { step: 3 } },
  { label: 'error_occurred type', eventType: 'error_occurred', data: { error_type: 'network' } },
  { label: 'assessment_completed duration', eventType: 'assessment_completed', data: { duration_ms: 42000 } },
  { label: 'practice_completed duration', eventType: 'practice_completed', data: { duration_ms: 300000 } },
  { label: 'breathing_exercise_started bare', eventType: 'breathing_exercise_started', data: {} },
  { label: 'settings_opened bare', eventType: 'settings_opened', data: {} },
  { label: 'consent_changed bare', eventType: 'consent_changed', data: {} },

  // ---- V1 rejects: non-whitelisted event NAME.
  { label: 'unknown event', eventType: 'voice_journal_started', data: {} },
  { label: 'journal_entry_saved', eventType: 'journal_entry_saved', data: {} },
  { label: 'reflection_transcribed', eventType: 'reflection_transcribed', data: {} },
  { label: 'made-up event', eventType: 'totally_new_event', data: { step: 1 } },

  // ---- V1 rejects: PHI keyword in a string VALUE.
  { label: 'value grief', eventType: 'screen_viewed', data: { screen: 'grief' } },
  { label: 'value career', eventType: 'learn_content_viewed', data: { topic: 'career' } },
  { label: 'value conflict', eventType: 'app_opened', data: { detail: 'conflict at work' } },
  { label: 'value journal', eventType: 'app_opened', data: { detail: 'my journal from tonight' } },
  { label: 'value note', eventType: 'app_opened', data: { detail: 'a note to self' } },
  { label: 'value suicid stem', eventType: 'app_opened', data: { detail: 'suicidal thoughts' } },
  { label: 'value harm', eventType: 'app_opened', data: { detail: 'self harm' } },
  { label: 'value phq', eventType: 'assessment_completed', data: { label: 'phq total' } },
  { label: 'value mood', eventType: 'check_in_completed', data: { label: 'mood is low' } },
  { label: 'value email', eventType: 'settings_opened', data: { field: 'email address' } },

  // ---- V1 rejects: suspicious numeric in a non-safe key.
  { label: 'numeric score', eventType: 'assessment_completed', data: { total: 18 } },
  { label: 'numeric rating', eventType: 'check_in_completed', data: { rating: 4 } },
  { label: 'numeric q9', eventType: 'assessment_completed', data: { q9: 2 } },

  // ---- V1 rejects: nested object violation.
  { label: 'nested keyword value', eventType: 'app_opened', data: { meta: { detail: 'grief' } } },
  { label: 'nested numeric', eventType: 'app_opened', data: { meta: { total: 21 } } },

  // ---- V1 ACCEPTS these. They are inert under the one-sided relation by design —
  //      it asserts nothing where the baseline passed — and they are here so the
  //      corpus already covers the gaps the scan-surface tightening closes.
  { label: 'array of keyword strings', eventType: 'app_opened', data: { tags: ['grief'] } },
  { label: 'array nested deeper', eventType: 'app_opened', data: { tags: [['career']] } },
  { label: 'array inside object', eventType: 'app_opened', data: { meta: { tags: ['suicidal'] } } },
  { label: 'PHI keyword as KEY', eventType: 'check_in_completed', data: { mood: 'ok' } },
  { label: 'PHI keyword as key segment', eventType: 'assessment_completed', data: { phq_score: 'x' } },
  { label: 'journal key', eventType: 'app_opened', data: { journal_id: 'abc' } },
];

/**
 * Pinned literal, equal to the corpus's exact baseline-rejection count today
 * (4 non-whitelisted names + 10 keyword values + 3 suspicious numerics + 2 nested).
 * Growth is fine; shrinkage is not. If a future edit trims the corpus or neuters
 * the keyword list, this goes red rather than the suite passing over nothing.
 */
const MIN_BASELINE_REJECTIONS = 19;

describe('PHIFilter differential vs frozen d14d6178 baseline (INFRA-535)', () => {
  const baselineRejections = CORPUS.filter((c) => !validateV1(c.eventType, c.data).valid);

  describe('anti-vacuity guards (DEBUG-390)', () => {
    it('the corpus is non-empty and substantial', () => {
      expect(CORPUS.length).toBeGreaterThanOrEqual(35);
    });

    it('the baseline actually rejects a pinned minimum of the corpus', () => {
      // Without this, a corpus of only-benign payloads satisfies the one-sided
      // relation completely and goes green forever.
      expect(baselineRejections.length).toBeGreaterThanOrEqual(MIN_BASELINE_REJECTIONS);
    });

    it('the baseline still fires on a literal known-bad payload', () => {
      expect(validateV1('app_opened', { detail: 'grief' }).valid).toBe(false);
      expect(validateV1('not_a_real_event', {}).valid).toBe(false);
    });

    it('the baseline keyword list and whitelist are intact', () => {
      expect(BASELINE_PHI_KEYWORDS).toHaveLength(28);
      expect(BASELINE_SAFE_EVENT_TYPES.size).toBe(25);
    });

    it('containsPHI still fires on a literal known-bad string', () => {
      // Proves the detector this suite reasons about is live, not a stub.
      expect(containsPHI({ v: 'reach me at a@b.com' })).toBe(true);
      expect(containsPHI({ v: 'PHQ-9: 21' })).toBe(true);
      expect(containsPHI({ v: 'nothing sensitive here' })).toBe(false);
    });
  });

  describe('ONE-SIDED relation: anything the baseline rejected is still rejected', () => {
    it.each(CORPUS.map((c) => [c.label, c] as const))(
      '%s',
      (_label, c) => {
        const before = validateV1(c.eventType, c.data);
        const after = PHIFilter.validate(c.eventType, c.data);

        if (!before.valid) {
          expect(after.valid).toBe(false);
        }
        // Deliberately no assertion when `before.valid` is true: the live filter
        // is permitted to be stricter. See the TIGHTENED group.
      }
    );
  });

  describe('the frozen baseline is unreachable from app/src (FEAT-376)', () => {
    const SRC = path.resolve(__dirname, '../../src');

    const walk = (dir: string, acc: string[] = []): string[] => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, acc);
        else if (/\.(ts|tsx)$/.test(e.name)) acc.push(p);
      }
      return acc;
    };

    const files = walk(SRC);
    const NEEDLE = 'phiFilterBaselineV1';

    it('the scan actually found source files (anti-vacuity)', () => {
      expect(files.length).toBeGreaterThan(200);
    });

    it('the matcher fires against a literal known-bad string (anti-vacuity)', () => {
      expect(`import { validateV1 } from '../${NEEDLE}';`).toContain(NEEDLE);
    });

    it('no file under app/src references the frozen baseline', () => {
      const offenders = files.filter((f) => fs.readFileSync(f, 'utf8').includes(NEEDLE));
      expect(offenders).toEqual([]);
    });
  });
});
