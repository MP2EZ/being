/**
 * TIME OF DAY — TENSE INFERENCE + ONE SHARED BOUNDARY (FEAT-298 slice 5)
 *
 * Pins the founder's recorded TENSED decision (2026-07-25): the daily loop's tense is
 * INFERRED FROM THE CLOCK, never picked by the user.
 *
 * The 02:00–04:59 → 'flat' window is the one that most looks like a bug and is not. It is
 * a therapeutic-safety carve-out: at 3am the day is genuinely neither ahead nor behind, and
 * someone opening a wellness app at that hour is disproportionately awake involuntarily.
 * 'evening' would hand them a retrospective review of the day — a rumination-shaped prompt
 * at the worst possible hour for it. 'morning' would presume a night's sleep they have not
 * had. These tests exist so a future "simplification" that extends the evening band to
 * 05:00 fails loudly instead of quietly re-introducing that prompt.
 */

import { getDailyLoopTense, getTimeOfDayBand, getGreeting } from '../timeOfDay';

/** Local-time constructor — the helpers read getHours(), which is local. */
const at = (hour: number, minute = 0) => new Date(2026, 6, 25, hour, minute, 0, 0);

describe('getDailyLoopTense', () => {
  describe('the four windows', () => {
    it.each([5, 6, 9, 11])('%s:00 is morning (prospective)', (h) => {
      expect(getDailyLoopTense(at(h))).toBe('morning');
    });

    it.each([12, 14, 16])('%s:00 is flat (day underway)', (h) => {
      expect(getDailyLoopTense(at(h))).toBe('flat');
    });

    it.each([17, 20, 23, 0, 1])('%s:00 is evening (retrospective)', (h) => {
      expect(getDailyLoopTense(at(h))).toBe('evening');
    });

    it.each([2, 3, 4])('%s:00 is flat — the rumination carve-out', (h) => {
      expect(getDailyLoopTense(at(h))).toBe('flat');
    });
  });

  describe('boundaries are exact', () => {
    it.each([
      [4, 59, 'flat'],
      [5, 0, 'morning'],
      [11, 59, 'morning'],
      [12, 0, 'flat'],
      [16, 59, 'flat'],
      [17, 0, 'evening'],
      [1, 59, 'evening'],
      [2, 0, 'flat'],
    ])('%s:%s resolves to %s', (h, m, expected) => {
      expect(getDailyLoopTense(at(h as number, m as number))).toBe(expected);
    });
  });

  describe('the small-hours carve-out specifically', () => {
    it('NEVER hands a 3am user the retrospective evening tense', () => {
      // The whole point. An evening-tensed loop at 3am asks the user to review the day
      // behind them — rumination-shaped, at the hour least able to bear it.
      expect(getDailyLoopTense(at(3))).not.toBe('evening');
    });

    it('NEVER hands a 3am user the morning tense either', () => {
      // 'morning' presumes a night's sleep that a 3am user has not had.
      expect(getDailyLoopTense(at(3))).not.toBe('morning');
    });

    it('the evening band does NOT swallow the small hours', () => {
      // Evening wraps past midnight, so the carve-out must be evaluated first. If this
      // fails, someone extended the evening band and re-introduced the 3am review.
      expect(getDailyLoopTense(at(1, 59))).toBe('evening');
      expect(getDailyLoopTense(at(2, 0))).toBe('flat');
      expect(getDailyLoopTense(at(4, 59))).toBe('flat');
      expect(getDailyLoopTense(at(5, 0))).toBe('morning');
    });
  });

  it('covers all 24 hours with a valid tense — no hour falls through', () => {
    for (let h = 0; h < 24; h++) {
      expect(['flat', 'morning', 'evening']).toContain(getDailyLoopTense(at(h)));
    }
  });
});

describe('getTimeOfDayBand + getGreeting share the boundary', () => {
  it('greeting is derived from the band, so the two cannot disagree', () => {
    for (let h = 0; h < 24; h++) {
      const band = getTimeOfDayBand(at(h));
      const greeting = getGreeting(at(h));
      const expected = {
        morning: 'Good morning',
        midday: 'Good afternoon',
        evening: 'Good evening',
      }[band];
      expect(greeting).toBe(expected);
    }
  });

  it('band and tense agree on the morning and afternoon starts', () => {
    // Both read the same constants; this pins that they actually do, rather than
    // coincidentally matching today. Two inlined copies is what slice 5 removed.
    expect(getTimeOfDayBand(at(5))).toBe('morning');
    expect(getDailyLoopTense(at(5))).toBe('morning');
    expect(getTimeOfDayBand(at(12))).toBe('midday');
    expect(getDailyLoopTense(at(12))).toBe('flat'); // midday band == flat tense
    expect(getTimeOfDayBand(at(17))).toBe('evening');
    expect(getDailyLoopTense(at(17))).toBe('evening');
  });

  it('every hour produces a greeting', () => {
    for (let h = 0; h < 24; h++) {
      expect(getGreeting(at(h))).toMatch(/^Good /);
    }
  });
});
