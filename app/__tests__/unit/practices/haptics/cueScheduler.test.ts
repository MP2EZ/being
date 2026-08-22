/**
 * FEAT-285 — cue scheduler.
 *
 * The properties under test are the ones the performance planning pass called
 * non-negotiable: exactly one pending timer at any moment, absolute targeting
 * so error never accumulates, and a resume from background that emits ZERO cues
 * rather than flushing a burst.
 *
 * Deliberately absent: any frame-rate or "within 50ms" assertion. Those are not
 * observable in jest, and this repo already deleted one generation of
 * aspirational perf tests (MAINT-188 PR 8). Frame behaviour is on-device.
 */

import {
  createCueScheduler,
  intervalSchedule,
  regionSchedule,
  type ScheduledCue,
} from '@/features/practices/shared/haptics/cueScheduler';
import {
  boundariesWithin,
  type BreathPattern,
} from '@/features/practices/shared/haptics/phaseAtElapsed';
import { MAX_CUE_LATENESS_MS } from '@/features/practices/shared/haptics/constants';

/**
 * 4-6 — asymmetric extended exhale. Was 4-4-6 until MAINT-391 deleted the
 * breath-retention engine. Deliberately NOT the symmetric 4-4 default: an
 * uneven cadence is what exercises the scheduler's absolute targeting, since a
 * symmetric one would let a "fire every N ms" regression pass.
 */
const PATTERN_46: BreathPattern = { inhale: 4000, exhale: 6000 };

/**
 * A controllable clock + timer queue. Using our own rather than jest's global
 * fake timers keeps the "exactly one pending timer" invariant directly
 * observable: `pending.size` IS the assertion.
 */
function makeHarness() {
  let clock = 0;
  let nextHandle = 1;
  const pending = new Map<number, { fn: () => void; at: number }>();

  return {
    now: () => clock,
    pendingCount: () => pending.size,
    setTimer: (fn: () => void, ms: number) => {
      const handle = nextHandle++;
      pending.set(handle, { fn, at: clock + ms });
      return handle as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer: (handle: ReturnType<typeof setTimeout>) => {
      pending.delete(handle as unknown as number);
    },
    /** Advance the clock, running any timer whose deadline is reached. */
    advance: (ms: number) => {
      const target = clock + ms;
      for (;;) {
        let due: [number, { fn: () => void; at: number }] | null = null;
        for (const entry of pending.entries()) {
          if (entry[1].at <= target && (due === null || entry[1].at < due[1].at)) due = entry;
        }
        if (!due) break;
        pending.delete(due[0]);
        // NEVER rewind. After a suspend, a pending timer's deadline is already
        // in the past; running it must not move the clock backwards, or the
        // scheduler would compute a lateness of zero for a cue that is in fact
        // minutes stale — which is precisely the bug this suite exists to catch.
        clock = Math.max(clock, due[1].at);
        due[1].fn();
      }
      clock = target;
    },
    /** Jump the clock WITHOUT running timers — models a suspended JS runtime. */
    suspend: (ms: number) => {
      clock += ms;
    },
  };
}

function breathingSchedule(sessionMs: number): ScheduledCue[] {
  return boundariesWithin(PATTERN_46, sessionMs).map((b) => ({
    atMs: b.atMs,
    cue: b.phase,
  }));
}

describe('single-timer invariant', () => {
  it('holds at most ONE pending timer at any point in a session', () => {
    const h = makeHarness();
    const onCue = jest.fn();
    const scheduler = createCueScheduler({
      schedule: breathingSchedule(60_000),
      onCue,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    expect(h.pendingCount()).toBe(1);

    for (let i = 0; i < 60; i += 1) {
      h.advance(1000);
      expect(h.pendingCount()).toBeLessThanOrEqual(1);
    }
  });

  it('does not double-arm when start is called twice', () => {
    const h = makeHarness();
    const scheduler = createCueScheduler({
      schedule: breathingSchedule(60_000),
      onCue: jest.fn(),
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    scheduler.start();
    expect(h.pendingCount()).toBe(1);
  });

  it('releases the timer on stop', () => {
    const h = makeHarness();
    const scheduler = createCueScheduler({
      schedule: breathingSchedule(60_000),
      onCue: jest.fn(),
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    scheduler.stop();
    expect(h.pendingCount()).toBe(0);
  });

  it('emits nothing after stop even as the clock runs on', () => {
    const h = makeHarness();
    const onCue = jest.fn();
    const scheduler = createCueScheduler({
      schedule: breathingSchedule(60_000),
      onCue,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    h.advance(100);
    const delivered = onCue.mock.calls.length;
    scheduler.stop();
    h.advance(60_000);

    expect(onCue).toHaveBeenCalledTimes(delivered);
  });
});

describe('delivery over a full session', () => {
  it('delivers exactly one cue per scheduled boundary', () => {
    const h = makeHarness();
    const onCue = jest.fn();
    const schedule = breathingSchedule(60_000);
    const scheduler = createCueScheduler({
      schedule,
      onCue,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    h.advance(60_000);

    expect(onCue).toHaveBeenCalledTimes(schedule.length);
  });

  it('delivers them in phase order', () => {
    const h = makeHarness();
    const onCue = jest.fn();
    const scheduler = createCueScheduler({
      schedule: breathingSchedule(30_000),
      onCue,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    h.advance(30_000);

    // Cycles open at 0/10000/20000, each exhaling 4000 ms in: 0, 4000, 10000,
    // 14000, 20000, 24000. Cycle 3 would open at 30000, the session end.
    expect(onCue.mock.calls.map((c) => c[0])).toEqual([
      'inhale', 'exhale',
      'inhale', 'exhale',
      'inhale', 'exhale',
    ]);
  });

  it('does not accumulate drift — the last cue lands on its absolute target', () => {
    const h = makeHarness();
    const fired: number[] = [];
    const schedule = breathingSchedule(60_000);
    const scheduler = createCueScheduler({
      schedule,
      onCue: () => fired.push(h.now()),
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    h.advance(60_000);

    expect(fired[fired.length - 1]).toBe(schedule[schedule.length - 1].atMs);
  });
});

describe('pause excludes paused time from the session position', () => {
  it('resumes at the position it paused at', () => {
    const h = makeHarness();
    const scheduler = createCueScheduler({
      schedule: breathingSchedule(60_000),
      onCue: jest.fn(),
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    h.advance(2000);
    scheduler.pause();
    h.advance(30_000); // paused — should not count
    scheduler.start();

    expect(scheduler.elapsedMs()).toBe(2000);
  });

  it('fires no cues while paused', () => {
    const h = makeHarness();
    const onCue = jest.fn();
    const scheduler = createCueScheduler({
      schedule: breathingSchedule(60_000),
      onCue,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    h.advance(100);
    const before = onCue.mock.calls.length;
    scheduler.pause();
    h.advance(60_000);

    expect(onCue).toHaveBeenCalledTimes(before);
  });

  it('clears the pending timer on pause', () => {
    const h = makeHarness();
    const scheduler = createCueScheduler({
      schedule: breathingSchedule(60_000),
      onCue: jest.fn(),
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    scheduler.pause();
    expect(h.pendingCount()).toBe(0);
  });
});

describe('resume from background emits ZERO cues', () => {
  it('drops every boundary that elapsed while the runtime was suspended', () => {
    const h = makeHarness();
    const onCue = jest.fn();
    const scheduler = createCueScheduler({
      schedule: breathingSchedule(120_000),
      onCue,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    h.advance(1000);
    const beforeSuspend = onCue.mock.calls.length;

    // JS suspended: clock moves, timers do not run. Then the runtime wakes and
    // the scheduler re-arms — as the AppState guard would drive it.
    h.suspend(45_000);
    scheduler.pause();
    scheduler.start();

    expect(onCue).toHaveBeenCalledTimes(beforeSuspend);
    expect(h.pendingCount()).toBeLessThanOrEqual(1);
  });

  it('does not fire a burst when the timer queue flushes late', () => {
    const h = makeHarness();
    const onCue = jest.fn();
    const scheduler = createCueScheduler({
      schedule: breathingSchedule(120_000),
      onCue,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    h.suspend(45_000); // many boundaries now overdue
    h.advance(0); // flush

    // Every overdue boundary is stale; at most the one at the flush instant
    // could be within budget.
    expect(onCue.mock.calls.length).toBeLessThanOrEqual(1);
  });
});

describe('lateness budget', () => {
  it('drops a cue overshot by more than the budget', () => {
    const h = makeHarness();
    const onCue = jest.fn();
    const scheduler = createCueScheduler({
      schedule: [{ atMs: 1000, cue: 'inhale' }],
      onCue,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    h.suspend(1000 + MAX_CUE_LATENESS_MS + 1);
    h.advance(0);

    expect(onCue).not.toHaveBeenCalled();
  });

  it('still delivers a cue inside the budget', () => {
    const h = makeHarness();
    const onCue = jest.fn();
    const scheduler = createCueScheduler({
      schedule: [{ atMs: 1000, cue: 'inhale' }],
      onCue,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    h.suspend(1000 + MAX_CUE_LATENESS_MS - 1);
    h.advance(0);

    expect(onCue).toHaveBeenCalledWith('inhale');
  });

  it('skips past stale cues and still delivers the next in-budget one', () => {
    const h = makeHarness();
    const onCue = jest.fn();
    const scheduler = createCueScheduler({
      schedule: [
        { atMs: 1000, cue: 'inhale' },
        { atMs: 2000, cue: 'exhale' },
        { atMs: 9000, cue: 'intervalTick' },
      ],
      onCue,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    h.suspend(3000); // 1000 and 2000 are now stale
    h.advance(6000); // reaches 9000

    expect(onCue.mock.calls.map((c) => c[0])).toEqual(['intervalTick']);
  });
});

/**
 * INFRA-395 — the lateness report.
 *
 * The scheduler already COMPUTES per-cue lateness in order to decide whether to
 * drop; it simply discarded the number. INFRA-395's acceptance criteria require
 * recording cue latency as figures from an attended on-device session, and no
 * other layer can produce them: `hapticEngine`'s trace is `__DEV__`-only and
 * carries no timing, and the engine never learns what a cue's target WAS.
 *
 * Reported as an injected callback rather than a log call, because this module
 * imports no app services by design — its clock and timers are injected for the
 * same reason. `usePracticeHaptics` supplies the callback under `__DEV__`, so
 * production folds it to `undefined` and every call site below no-ops.
 *
 * The invariant that makes the figures trustworthy: EVERY cue the scheduler
 * passes is reported exactly once, whether it was delivered or dropped. A drop
 * rate computed from delivered-only reports would read 100% on a session that
 * silently lost half its cues.
 */
describe('lateness reporting', () => {
  it('reports a delivered cue with its actual lateness', () => {
    const h = makeHarness();
    const onLateness = jest.fn();
    const scheduler = createCueScheduler({
      schedule: [{ atMs: 1000, cue: 'inhale' }],
      onCue: jest.fn(),
      onLateness,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    h.advance(1000);

    expect(onLateness).toHaveBeenCalledTimes(1);
    expect(onLateness).toHaveBeenCalledWith({
      cue: 'inhale',
      latenessMs: 0,
      delivered: true,
    });
  });

  it('reports the real overshoot, not a value clamped to the budget', () => {
    const h = makeHarness();
    const onLateness = jest.fn();
    const scheduler = createCueScheduler({
      schedule: [{ atMs: 1000, cue: 'inhale' }],
      onCue: jest.fn(),
      onLateness,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    // Inside the budget, so it still delivers — but late by a measurable amount.
    h.suspend(1000 + MAX_CUE_LATENESS_MS - 1);
    h.advance(0);

    expect(onLateness).toHaveBeenCalledWith({
      cue: 'inhale',
      latenessMs: MAX_CUE_LATENESS_MS - 1,
      delivered: true,
    });
  });

  it('reports a cue dropped at fire time as undelivered', () => {
    const h = makeHarness();
    const onCue = jest.fn();
    const onLateness = jest.fn();
    const scheduler = createCueScheduler({
      schedule: [{ atMs: 1000, cue: 'inhale' }],
      onCue,
      onLateness,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    h.suspend(1000 + MAX_CUE_LATENESS_MS + 1);
    h.advance(0);

    expect(onCue).not.toHaveBeenCalled();
    expect(onLateness).toHaveBeenCalledWith({
      cue: 'inhale',
      latenessMs: MAX_CUE_LATENESS_MS + 1,
      delivered: false,
    });
  });

  it('accounts for cues skipped during re-arm, not just those that reach a timer', () => {
    const h = makeHarness();
    const onCue = jest.fn();
    const onLateness = jest.fn();
    const scheduler = createCueScheduler({
      schedule: [
        { atMs: 1000, cue: 'inhale' },
        { atMs: 2000, cue: 'exhale' },
        { atMs: 9000, cue: 'intervalTick' },
      ],
      onCue,
      onLateness,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    scheduler.start();
    h.suspend(3000); // 1000 and 2000 are now stale and are skipped, never armed
    h.advance(6000); // reaches 9000

    // Every cue in the schedule is accounted for exactly once.
    expect(onLateness.mock.calls.map((c) => c[0])).toEqual([
      { cue: 'inhale', latenessMs: 2000, delivered: false },
      { cue: 'exhale', latenessMs: 1000, delivered: false },
      { cue: 'intervalTick', latenessMs: 0, delivered: true },
    ]);
    expect(onCue.mock.calls.map((c) => c[0])).toEqual(['intervalTick']);
  });

  it('is optional — a scheduler built without it runs unchanged', () => {
    const h = makeHarness();
    const onCue = jest.fn();
    const scheduler = createCueScheduler({
      schedule: [{ atMs: 1000, cue: 'inhale' }],
      onCue,
      now: h.now,
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
    });

    expect(() => {
      scheduler.start();
      h.advance(1000);
    }).not.toThrow();
    expect(onCue).toHaveBeenCalledWith('inhale');
  });
});

describe('schedule builders', () => {
  it('intervalSchedule places one identical tick per interval, excluding the end', () => {
    expect(intervalSchedule(300_000, 60_000)).toEqual([
      { atMs: 60_000, cue: 'intervalTick' },
      { atMs: 120_000, cue: 'intervalTick' },
      { atMs: 180_000, cue: 'intervalTick' },
      { atMs: 240_000, cue: 'intervalTick' },
    ]);
  });

  it('intervalSchedule is empty when the cadence is off', () => {
    expect(intervalSchedule(300_000, 0)).toEqual([]);
  });

  it('regionSchedule places a transition between regions but not at 0 or the end', () => {
    const cues = regionSchedule(600_000, 6);
    expect(cues).toHaveLength(5);
    expect(cues[0].atMs).toBe(100_000);
    expect(cues[4].atMs).toBe(500_000);
    expect(cues.every((c) => c.cue === 'regionTransition')).toBe(true);
  });

  it('regionSchedule is empty for a single region', () => {
    expect(regionSchedule(600_000, 1)).toEqual([]);
  });
});
