/**
 * DAILY LOOP — CHECK-IN + PRINCIPLE-ENGAGEMENT SEMANTICS (FEAT-298 slice 3)
 *
 * FEAT-291 shipped the loop recording `markCheckInComplete('midday')` and ZERO principle
 * engagements. Slice 3 pays that debt: the loop becomes a first-class check-in with its
 * own 'daily' type, and records one engagement per beat reached.
 *
 * These specs pin the philosopher-pass semantics, because every one of them is a claim
 * about what the Insights chart and the JSON export MEAN — not an implementation detail:
 *
 *  - Engagement type is derived from MODE and uniform across a session's beats. The three
 *    modes map 1:1 onto what the legacy flows recorded, which is what keeps history
 *    interpretable across the slice-6 flow retirement.
 *  - One engagement per beat REACHED, never per captured field (which would inflate the
 *    two multi-field beats and manufacture a false dominance signal).
 *  - A quick session records 3, never 5. Crediting the omitted beats would fabricate acts
 *    the user did not perform.
 */

import {
  ENGAGEMENT_TYPE_BY_MODE,
  STEP_PRINCIPLE,
  getStepKeysForDepth,
  DAILY_LOOP_STEP_KEYS,
  QUICK_STEP_KEYS,
} from '../config/tenseMode';
import type { DailyLoopMode } from '@/features/practices/types/flows';

describe('daily loop — principle engagement semantics (FEAT-298 slice 3)', () => {
  describe('every beat maps to the principle it IS', () => {
    it('maps all five canonical beats, in canonical order', () => {
      expect(DAILY_LOOP_STEP_KEYS.map(k => STEP_PRINCIPLE[k])).toEqual([
        'aware_presence',
        'radical_acceptance',
        'sphere_sovereignty',
        'virtuous_response',
        'interconnected_living',
      ]);
    });

    it('maps every step key without exception', () => {
      for (const key of DAILY_LOOP_STEP_KEYS) {
        expect(STEP_PRINCIPLE[key]).toBeDefined();
      }
    });

    it('never maps two beats onto the same principle', () => {
      const principles = DAILY_LOOP_STEP_KEYS.map(k => STEP_PRINCIPLE[k]);
      expect(new Set(principles).size).toBe(DAILY_LOOP_STEP_KEYS.length);
    });
  });

  describe('engagement type is derived from tense mode', () => {
    it.each([
      ['morning', 'selected'],
      ['flat', 'applied'],
      ['evening', 'reflected'],
    ])('a %s-mode session records %s', (mode, expected) => {
      expect(ENGAGEMENT_TYPE_BY_MODE[mode as DailyLoopMode]).toBe(expected);
    });

    it('never records practiced — that is reserved for the Learn module (FEAT-133)', () => {
      // Reusing it would leave the exported vocabulary unable to distinguish in-app
      // education from lived practice.
      expect(Object.values(ENGAGEMENT_TYPE_BY_MODE)).not.toContain('practiced');
    });

    it('never records selected for a non-prospective mode', () => {
      // Nothing was chosen and nothing is forward-looking in flat/evening — recording
      // 'selected' there would assert an act that did not happen.
      expect(ENGAGEMENT_TYPE_BY_MODE.flat).not.toBe('selected');
      expect(ENGAGEMENT_TYPE_BY_MODE.evening).not.toBe('selected');
    });

    it('gives every mode a distinct type, so the tense survives into the export', () => {
      expect(new Set(Object.values(ENGAGEMENT_TYPE_BY_MODE)).size).toBe(3);
    });
  });

  describe('how many engagements a session records', () => {
    it('a deep session records one per principle — five', () => {
      expect(getStepKeysForDepth('deep')).toHaveLength(5);
    });

    it('a quick session records exactly three, never five', () => {
      // Crediting Radical Acceptance and Interconnected Living for a quick session would
      // fabricate two acts the user did not perform.
      const quick = getStepKeysForDepth('quick');
      expect(quick).toHaveLength(3);
      expect(quick.map(k => STEP_PRINCIPLE[k])).toEqual([
        'aware_presence',
        'sphere_sovereignty',
        'virtuous_response',
      ]);
    });

    it('omits exactly radical acceptance and interconnected living from quick', () => {
      const quickPrinciples = QUICK_STEP_KEYS.map(k => STEP_PRINCIPLE[k]);
      expect(quickPrinciples).not.toContain('radical_acceptance');
      expect(quickPrinciples).not.toContain('interconnected_living');
    });

    it('runs quick as a canonical-order SUBSET, never a reorder', () => {
      const canonicalIndex = (k: (typeof QUICK_STEP_KEYS)[number]) =>
        DAILY_LOOP_STEP_KEYS.indexOf(k);
      const indices = QUICK_STEP_KEYS.map(canonicalIndex);
      expect(indices).toEqual([...indices].sort((a, b) => a - b));
    });

    it('records the same count regardless of mode — tense changes the type, not the arc', () => {
      const modes: DailyLoopMode[] = ['morning', 'flat', 'evening'];
      for (const mode of modes) {
        expect(ENGAGEMENT_TYPE_BY_MODE[mode]).toBeDefined();
      }
      // Depth alone determines how many beats are reached.
      expect(getStepKeysForDepth('deep')).toHaveLength(5);
      expect(getStepKeysForDepth('quick')).toHaveLength(3);
    });
  });
});
