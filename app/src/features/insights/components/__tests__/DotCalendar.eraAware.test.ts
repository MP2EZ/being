/**
 * INSIGHTS DOT CALENDAR — ERA-AWARE COMPLETENESS (FEAT-298 slice 2)
 *
 * The audit called this "the single place 'preserve historical records' can be violated by
 * a one-line edit". Today a day is `complete` at `checkIns.length >= 3`, because three
 * time-of-day flows was the whole ritual. Once ONE daily ritual replaces three, a naive
 * edit (complete at 1) silently reclassifies every historical partial day as complete —
 * rewriting the user's practice history in the UI without touching a single record.
 *
 * THE RULE: a day is SELF-DESCRIBING. If its own records contain 'daily', it is a
 * daily-era day and completes at 1. Otherwise it is a legacy day and keeps the 3-of-3 bar.
 *
 * Deliberately NOT keyed off a date or app-version cutover (compliance constraint): a
 * date-based cutoff misclassifies days whenever real data disagrees with the assumed
 * rollout timeline — flag rollback, staggered rollout, a user who skipped an update — and
 * a UI asserting "complete" against records that say otherwise is an accuracy problem.
 *
 * PROPERTY THIS SLICE GUARANTEES: because no 'daily' record exists until slice 3 makes the
 * loop a first-class check-in, slice 2 changes ZERO existing day verdicts. The final
 * describe block pins exactly that.
 */

import { calculateDotState } from '../DotCalendar';
import type { CheckInType } from '@/features/practices/stores/stoicPracticeStore';

/** The pre-FEAT-298 rule, kept verbatim as the oracle for the no-regression property. */
const legacyRule = (checkIns: CheckInType[]): 'empty' | 'partial' | 'complete' => {
  if (checkIns.length === 0) return 'empty';
  if (checkIns.length >= 3) return 'complete';
  return 'partial';
};

describe('calculateDotState — era-aware completeness', () => {
  describe('legacy era (no daily record) — unchanged 3-of-3 bar', () => {
    it('is empty for a day with no check-ins', () => {
      expect(calculateDotState([])).toBe('empty');
    });

    it('is partial for one legacy check-in', () => {
      expect(calculateDotState(['morning'])).toBe('partial');
    });

    it('is partial for two legacy check-ins', () => {
      expect(calculateDotState(['morning', 'evening'])).toBe('partial');
    });

    it('is complete for all three legacy check-ins', () => {
      expect(calculateDotState(['morning', 'midday', 'evening'])).toBe('complete');
    });
  });

  describe('daily era (day contains a daily record) — completes at one', () => {
    it('is complete for a lone daily ritual', () => {
      expect(calculateDotState(['daily'])).toBe('complete');
    });

    it('is complete for a daily ritual alongside a legacy check-in (transition day)', () => {
      expect(calculateDotState(['morning', 'daily'])).toBe('complete');
    });

    it('is complete for a daily ritual alongside a learn engagement', () => {
      expect(calculateDotState(['learn', 'daily'])).toBe('complete');
    });

    it('is still empty for a day with nothing, daily era or not', () => {
      expect(calculateDotState([])).toBe('empty');
    });
  });

  describe('the pre-existing learn quirk is PRESERVED, not silently fixed', () => {
    /**
     * `getCheckInHistory(90)` is unfiltered (InsightsScreen.tsx:115), so 'learn'
     * completions already reach this function and already count toward the legacy
     * >= 3 bar. That is arguably a bug — 'learn' is a Learn-module engagement (FEAT-133),
     * not a time-of-day check-in. It is left EXACTLY as-is here on purpose: "fixing" it in
     * this slice would flip historical days from complete to partial, which is the same
     * class of harm this slice exists to prevent, just in the other direction. Pinned so a
     * future fix is a deliberate, reviewed change rather than an accident.
     */
    it('counts learn toward the legacy three, as it does today', () => {
      expect(calculateDotState(['morning', 'evening', 'learn'])).toBe('complete');
    });

    it('does not treat learn alone as a complete day', () => {
      expect(calculateDotState(['learn'])).toBe('partial');
    });
  });

  describe('PROPERTY: slice 2 changes no existing day verdict', () => {
    /**
     * Every combination reachable from records that exist TODAY (i.e. no 'daily', because
     * nothing writes it until slice 3) must produce exactly the legacy verdict. This is the
     * regression pin for "preserve historical records".
     */
    const LEGACY_TYPES: CheckInType[] = ['morning', 'midday', 'evening', 'learn'];

    /** All 16 subsets of the four legacy types. */
    const allLegacySubsets = (): CheckInType[][] => {
      const out: CheckInType[][] = [];
      for (let mask = 0; mask < 1 << LEGACY_TYPES.length; mask++) {
        out.push(LEGACY_TYPES.filter((_, i) => mask & (1 << i)));
      }
      return out;
    };

    it.each(allLegacySubsets().map(s => [s.join('+') || '(none)', s]))(
      'day [%s] keeps its pre-FEAT-298 verdict',
      (_label, checkIns) => {
        expect(calculateDotState(checkIns as CheckInType[])).toBe(
          legacyRule(checkIns as CheckInType[])
        );
      }
    );
  });
});
