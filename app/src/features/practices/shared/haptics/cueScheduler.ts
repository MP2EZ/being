/**
 * cueScheduler — drives practice haptic cues off an absolute timeline (FEAT-285).
 *
 * INVARIANT: at most ONE pending timer, ever.
 *
 * That is the load-bearing design decision, and it is a correctness property
 * rather than an optimisation. iOS suspends JS timers when the app backgrounds,
 * and RN flushes every overdue timer in a single tick on resume. If the
 * scheduler pre-armed one timeout per boundary, a two-minute background would
 * resume into a dozen `impactAsync` calls in one tick — a machine-gun burst
 * against the practitioner's hand, and the one realistic way this feature drops
 * frames. Holding a single timer makes that burst structurally impossible,
 * independent of whether any AppState listener won the race. It is NOT safe to
 * delegate this to the listener, which races the flush.
 *
 * Every target is absolute, measured from a fixed session origin, never chained
 * off the previous fire. Relative chaining accumulates ~5-20ms per link — over a
 * 20-minute session that is seconds of lag. Absolute targeting keeps error
 * per-cue and non-accumulating, which is the whole reason `phaseAtElapsed`
 * exists.
 *
 * Late cues are DROPPED, not fired late. See MAX_CUE_LATENESS_MS.
 */

import type { PracticeCue } from './cueCatalog';
import { MAX_CUE_LATENESS_MS } from './constants';

export interface ScheduledCue {
  /** Absolute position in the session timeline, ms from session start. */
  atMs: number;
  cue: PracticeCue;
}

/**
 * One cue's outcome, with the number that decided it.
 *
 * `latenessMs` is the overshoot against the cue's absolute target — never
 * clamped to MAX_CUE_LATENESS_MS, because a report clamped to the budget could
 * not distinguish a cue that scraped in from one that missed by a minute.
 */
export interface CueLatenessReport {
  cue: PracticeCue;
  latenessMs: number;
  /** False for both drop paths: skipped at re-arm, and re-checked at fire time. */
  delivered: boolean;
}

export interface CueSchedulerOptions {
  /** The full session timeline, sorted or not — the scheduler sorts. */
  schedule: ScheduledCue[];
  /** Deliver a cue. Should be the haptic engine's `fire`. */
  onCue: (cue: PracticeCue) => void;
  /**
   * Diagnostic sink for per-cue lateness (INFRA-395). Optional; omitted in
   * production.
   *
   * This is the only layer that can report cue latency at all. `hapticEngine`
   * sees a cue arrive but never learns what its target WAS, so it cannot
   * compute an overshoot — and its own trace is `__DEV__`-only and carries no
   * timing. Meanwhile the number is already computed here to decide dropping;
   * before INFRA-395 it was simply discarded.
   *
   * Injected rather than logged directly, because this module deliberately
   * imports no app services — the same reason its clock and timers are
   * injected. `usePracticeHaptics` supplies it under `__DEV__`, which Metro
   * folds away in production, leaving every call site below a no-op.
   *
   * INVARIANT: every cue the scheduler passes is reported EXACTLY ONCE, whether
   * delivered or dropped. A drop rate computed from delivered-only reports
   * would read 100% on a session that silently lost half its cues.
   *
   * The explicit `| undefined` is required, not stylistic: `exactOptionalPropertyTypes`
   * is on, and the caller passes `__DEV__ ? fn : undefined` — a property that is
   * PRESENT and undefined, which a bare `?:` rejects.
   */
  onLateness?: ((report: CueLatenessReport) => void) | undefined;
  /** Monotonic clock. Injectable for tests. */
  now: () => number;
  /** Timer primitives, injectable so tests need not rely on global fakes. */
  setTimer?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (handle: ReturnType<typeof setTimeout>) => void;
}

export interface CueScheduler {
  /** Begin or resume. Idempotent — calling twice does not double-arm. */
  start: () => void;
  /** Suspend without losing position (user pause, or app backgrounded). */
  pause: () => void;
  /** Stop permanently and release the timer. */
  stop: () => void;
  /** Elapsed session position in ms, excluding paused time. */
  elapsedMs: () => number;
  /** Test/diagnostic seam: index of the next cue to be delivered. */
  nextIndex: () => number;
}

export function createCueScheduler(options: CueSchedulerOptions): CueScheduler {
  const { onCue, onLateness, now } = options;
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;

  const schedule = [...options.schedule].sort((a, b) => a.atMs - b.atMs);

  let handle: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let stopped = false;
  /** Clock value at which the current running stretch began. */
  let segmentStartedAt = 0;
  /** Session time accumulated across all previous running stretches. */
  let accumulatedMs = 0;
  let nextIdx = 0;

  function elapsedMs(): number {
    return running ? accumulatedMs + (now() - segmentStartedAt) : accumulatedMs;
  }

  function clearPending(): void {
    if (handle !== null) {
      clearTimer(handle);
      handle = null;
    }
  }

  /**
   * Arm the single timer for the next undelivered cue.
   *
   * Cues already past their lateness budget are skipped here rather than fired,
   * which is what makes a resume emit zero cues instead of a burst: by the time
   * we re-arm, every boundary that elapsed while suspended is stale.
   */
  function arm(): void {
    clearPending();
    if (!running || stopped) return;

    const elapsed = elapsedMs();

    // Skip anything too late to be meaningful. Each skip is a DROP and is
    // reported as one — these cues never reach a timer, so the fire-time report
    // below would otherwise miss them entirely.
    for (;;) {
      const candidate = schedule[nextIdx];
      if (!candidate || elapsed - candidate.atMs <= MAX_CUE_LATENESS_MS) break;
      onLateness?.({
        cue: candidate.cue,
        latenessMs: elapsed - candidate.atMs,
        delivered: false,
      });
      nextIdx += 1;
    }

    const target = schedule[nextIdx];
    if (!target) return;

    const delay = Math.max(0, target.atMs - elapsed);

    handle = setTimer(() => {
      handle = null;
      if (!running || stopped) return;

      const lateness = elapsedMs() - target.atMs;
      nextIdx += 1;

      // Re-check lateness at fire time: the timer itself may have been delayed
      // by a React commit landing on the same tick.
      const delivered = lateness <= MAX_CUE_LATENESS_MS;
      if (delivered) {
        onCue(target.cue);
      }
      onLateness?.({ cue: target.cue, latenessMs: lateness, delivered });

      arm();
    }, delay);
  }

  return {
    start: () => {
      if (stopped || running) return;
      running = true;
      segmentStartedAt = now();
      arm();
    },

    pause: () => {
      if (!running || stopped) return;
      accumulatedMs += now() - segmentStartedAt;
      running = false;
      clearPending();
    },

    stop: () => {
      if (running) accumulatedMs += now() - segmentStartedAt;
      running = false;
      stopped = true;
      clearPending();
    },

    elapsedMs,
    nextIndex: () => nextIdx,
  };
}

/** Build the interval-cue timeline for a reflection / meditation timer. */
export function intervalSchedule(sessionMs: number, everyMs: number): ScheduledCue[] {
  if (everyMs <= 0 || sessionMs <= 0) return [];
  const cues: ScheduledCue[] = [];
  for (let t = everyMs; t < sessionMs; t += everyMs) {
    cues.push({ atMs: t, cue: 'intervalTick' });
  }
  return cues;
}

/**
 * Build the region-transition timeline for a body scan.
 *
 * Computed as absolute targets rather than read off the screen's ~1Hz `onTick`,
 * which quantises to whole seconds and would import up to a second of error
 * into every cue.
 */
export function regionSchedule(sessionMs: number, regionCount: number): ScheduledCue[] {
  if (sessionMs <= 0 || regionCount <= 1) return [];
  const per = sessionMs / regionCount;
  const cues: ScheduledCue[] = [];
  for (let i = 1; i < regionCount; i += 1) {
    cues.push({ atMs: per * i, cue: 'regionTransition' });
  }
  return cues;
}
