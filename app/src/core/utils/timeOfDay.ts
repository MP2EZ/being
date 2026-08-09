/**
 * TIME OF DAY — ONE SOURCE FOR EVERY TIME-DERIVED DECISION (FEAT-298 slice 5)
 *
 * Before this, `CleanHomeScreen.getCurrentPeriod()` and `getGreeting()` each inlined the
 * SAME `<12` / `<17` thresholds. Two copies of one boundary is exactly how they drift
 * apart later — and once the daily loop derives its tense from the clock too, a drift
 * means the greeting says "Good evening" while the practice opens in its morning tense.
 * The boundary is one decision, so it lives in one place.
 *
 * THE DECISION (founder, 2026-07-25, recorded on FEAT-298/FEAT-291): the daily loop is
 * TENSED, and the tense is INFERRED FROM TIME OF DAY, never picked by the user. Home shows
 * one indistinguishable "Daily Practice" button; tapping it enters the loop already tensed
 * for the current hour.
 *
 *   05:00 – 11:59  morning   prospective — "setting your day's tone before reactive
 *                            patterns engage" (daily-architecture.md)
 *   12:00 – 16:59  flat      day underway; neither ahead nor behind
 *   17:00 – 01:59  evening   retrospective — the Senecan examen, "before sleep"
 *   02:00 – 04:59  flat      DELIBERATE, and the one window that is not obvious:
 *
 * At 3am the day is genuinely neither ahead nor behind, and someone opening a wellness app
 * at that hour is disproportionately awake involuntarily. `evening` would hand them a
 * retrospective review of the day — a rumination-shaped prompt at the worst possible hour
 * for it. `morning` would presume a night's sleep they have not had. `flat` is the honest
 * and the safest framing. This window is a therapeutic-safety carve-out, not an oversight:
 * do not "simplify" it away by extending the evening band to 05:00.
 */

import type { DailyLoopMode } from '@/features/practices/types/flows';

/** Coarse band used for greeting copy and for Home's "which card is current" highlight. */
export type TimeOfDayBand = 'morning' | 'midday' | 'evening';

/**
 * The single boundary table. Every consumer below derives from this; nothing re-inlines an
 * hour comparison.
 */
const MORNING_START = 5;
const MIDDAY_START = 12;
const EVENING_START = 17;
/** Evening runs past midnight; the small hours below this are their own case. */
const SMALL_HOURS_END = 5;
const SMALL_HOURS_START = 2;

/**
 * The daily loop's tense for a given hour.
 *
 * Returns a `DailyLoopMode`, which since FEAT-298 slice 5 is an INTERNAL, time-derived
 * value — no longer user-facing state. There is no mode picker.
 */
export const getDailyLoopTense = (date: Date = new Date()): DailyLoopMode => {
  const hour = date.getHours();

  // 02:00–04:59 — the rumination carve-out. Checked FIRST so it can never be swallowed by
  // the evening band, which wraps past midnight.
  if (hour >= SMALL_HOURS_START && hour < SMALL_HOURS_END) return 'flat';

  if (hour >= MORNING_START && hour < MIDDAY_START) return 'morning';
  if (hour >= MIDDAY_START && hour < EVENING_START) return 'flat';

  // 17:00–01:59 — everything else, including 00:00–01:59.
  return 'evening';
};

/**
 * The coarse band, for greeting copy and Home card highlighting.
 *
 * Note this is NOT the same partition as the tense: 'midday' is a band name here, whereas
 * the loop's equivalent tense is 'flat'. Keeping them separate is deliberate — the greeting
 * is about the clock, the tense is about the posture of the practice — but both read the
 * same boundary constants above, which is the property that stops them drifting.
 */
export const getTimeOfDayBand = (date: Date = new Date()): TimeOfDayBand => {
  const hour = date.getHours();

  if (hour >= MORNING_START && hour < MIDDAY_START) return 'morning';
  if (hour >= MIDDAY_START && hour < EVENING_START) return 'midday';
  return 'evening';
};

/** Greeting copy. Derived from the band so it cannot disagree with it. */
export const getGreeting = (date: Date = new Date()): string => {
  switch (getTimeOfDayBand(date)) {
    case 'morning':
      return 'Good morning';
    case 'midday':
      return 'Good afternoon';
    case 'evening':
      return 'Good evening';
  }
};
