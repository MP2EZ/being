/**
 * SESSION EXPIRY — THE DAILY LOOP IS DAY-BOUND (FEAT-298 slice 3b)
 *
 * The legacy flows use a rolling 24h TTL. The daily loop cannot, and this is a
 * data-accuracy fix rather than a preference:
 *
 * `CheckInCompletion` is stamped with the LOCAL CALENDAR DAY ('YYYY-MM-DD') and
 * `calculateDotState` reads those days. Under a rolling TTL, a session begun at 22:00 and
 * resumed at 08:00 the next morning is still "live", so completing it writes ONE 'daily'
 * record dated TODAY for work done mostly YESTERDAY — and leaves yesterday's dot
 * incomplete. That is the same records-accuracy fabrication slice 2's era-aware calendar
 * exists to prevent, arriving through the back door.
 *
 * A day-keyed ritual cannot outlive its day.
 */

import { computeSessionExpiry, SESSION_TTL_MS } from '../session';

/** Local-time constructor so the assertions follow the machine's timezone, as the app does. */
const at = (y: number, m: number, d: number, hh: number, mm = 0) =>
  new Date(y, m - 1, d, hh, mm, 0, 0).getTime();

describe('computeSessionExpiry', () => {
  describe('the three legacy flows keep the rolling 24h', () => {
    it.each(['morning', 'midday', 'evening'] as const)(
      '%s expires exactly 24h after it started, even across midnight',
      (flowType) => {
        const started = at(2026, 7, 25, 22, 0);
        expect(computeSessionExpiry(flowType, started)).toBe(started + SESSION_TTL_MS);
      }
    );

    it('does not clamp a legacy flow to midnight', () => {
      const started = at(2026, 7, 25, 23, 30);
      const midnight = at(2026, 7, 26, 0, 0);
      expect(computeSessionExpiry('midday', started)).toBeGreaterThan(midnight);
    });
  });

  describe('the daily loop is clamped to its own calendar day', () => {
    it('expires at next local midnight for a late-evening session', () => {
      const started = at(2026, 7, 25, 22, 0);
      expect(computeSessionExpiry('daily-loop', started)).toBe(at(2026, 7, 26, 0, 0));
    });

    it('never survives into the following day', () => {
      const started = at(2026, 7, 25, 23, 59);
      const expiry = computeSessionExpiry('daily-loop', started);
      expect(new Date(expiry).getDate()).toBe(26);
      expect(new Date(expiry).getHours()).toBe(0);
      expect(new Date(expiry).getMinutes()).toBe(0);
    });

    it('THE BUG THIS PREVENTS: a 22:00 session is dead by 08:00 next morning', () => {
      const started = at(2026, 7, 25, 22, 0);
      const nextMorning = at(2026, 7, 26, 8, 0);
      const expiry = computeSessionExpiry('daily-loop', started);

      // Under the old rolling TTL this was still live, so completing it would have written
      // a 'daily' record dated the 26th for work done on the 25th.
      expect(nextMorning).toBeGreaterThan(expiry);
      expect(nextMorning).toBeLessThan(started + SESSION_TTL_MS); // still inside 24h
    });

    it('a morning session still gets a usable same-day window, not a truncated one', () => {
      const started = at(2026, 7, 25, 6, 0);
      const expiry = computeSessionExpiry('daily-loop', started);
      // Clamped to midnight — ~18h, far more than a practice needs.
      expect(expiry).toBe(at(2026, 7, 26, 0, 0));
      expect(expiry - started).toBeGreaterThan(12 * 60 * 60 * 1000);
    });

    it('is never longer than the rolling TTL', () => {
      for (const hour of [0, 6, 12, 18, 23]) {
        const started = at(2026, 7, 25, hour);
        expect(computeSessionExpiry('daily-loop', started)).toBeLessThanOrEqual(
          started + SESSION_TTL_MS
        );
      }
    });

    it('always expires strictly after it started', () => {
      for (const hour of [0, 6, 12, 18, 23]) {
        const started = at(2026, 7, 25, hour, 30);
        expect(computeSessionExpiry('daily-loop', started)).toBeGreaterThan(started);
      }
    });

    it('gives a session started exactly at midnight the whole day', () => {
      const started = at(2026, 7, 25, 0, 0);
      // setHours(24) must roll to the NEXT midnight, not collapse to the current instant.
      expect(computeSessionExpiry('daily-loop', started)).toBe(at(2026, 7, 26, 0, 0));
    });
  });
});
