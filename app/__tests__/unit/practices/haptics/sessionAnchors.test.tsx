/**
 * FEAT-311 — the session-level cue anchors.
 *
 * `sessionStart` and `sessionEnd` shipped in FEAT-285's catalog with authored
 * meanings and no producer. This wires them, and the wiring is where all the
 * hazards are — every one of them silent.
 *
 * WHY THESE ANCHORS ARE IMPERATIVE AND NOT SCHEDULED. Three independent
 * reasons, each of which alone is sufficient:
 *
 *   1. The scheduler drops any cue more than MAX_CUE_LATENESS_MS late. The
 *      first tick after a Begin press on a cold device can exceed that, so a
 *      scheduled `sessionStart` would vanish on exactly the low-end devices
 *      where an eyes-closed practitioner most needs it — and per the catalog's
 *      own reasoning, a missing cue is indistinguishable from "no signal".
 *   2. `usePracticeHaptics`' scheduler effect early-returns when the schedule
 *      is empty. ReflectionTimerScreen's schedule IS empty unless the
 *      practitioner separately opted into interval cadence, so an anchor riding
 *      that effect would never fire on that screen at all.
 *   3. `handleTimerComplete` sets `isTimerActive` false BEFORE invoking
 *      `onComplete`, so at the moment `sessionEnd` must fire, the scheduler's
 *      own gate reads false. Depending on render ordering to leave it
 *      stale-true is a race, not a design.
 *
 * These specs pin the behaviour, not the implementation: they assert what
 * reaches expo-haptics, which is the only thing a practitioner can feel.
 */

import { AppState } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { usePracticeHaptics } from '@/features/practices/shared/haptics/usePracticeHaptics';
import { __resetHapticEngineForTest } from '@/features/practices/shared/haptics/hapticEngine';
import { MIN_CUE_INTERVAL_MS } from '@/features/practices/shared/haptics/constants';
import { boundariesWithin } from '@/features/practices/shared/haptics/phaseAtElapsed';
import { DEFAULT_PATTERN } from '@/features/practices/shared/breathingPatterns';
import type { ScheduledCue } from '@/features/practices/shared/haptics/cueScheduler';

jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: jest.fn(() => true),
}));
jest.mock('@/core/stores/settingsStore', () => ({
  usePracticeSettings: jest.fn(() => ({ practiceHaptics: true })),
}));

import { isFeatureEnabled } from '@/core/services/featureFlags';
import { usePracticeSettings } from '@/core/stores/settingsStore';

const mockHaptics = Haptics as jest.Mocked<typeof Haptics>;
const mockFlag = isFeatureEnabled as jest.MockedFunction<typeof isFeatureEnabled>;
const mockSettings = usePracticeSettings as jest.MockedFunction<typeof usePracticeSettings>;

/** No schedule at all — ReflectionTimerScreen's default shape. */
const NO_SCHEDULE: ScheduledCue[] = [];

function setAppState(state: string): void {
  (AppState as unknown as { currentState: string }).currentState = state;
}

/** Did the light impact that carries `sessionStart` reach the native layer? */
function sessionStartFired(): boolean {
  return mockHaptics.impactAsync.mock.calls.some(
    ([style]) => style === Haptics.ImpactFeedbackStyle.Light
  );
}

/** Did the success notification that carries `sessionEnd` reach it? */
function sessionEndFired(): boolean {
  return mockHaptics.notificationAsync.mock.calls.some(
    ([type]) => type === Haptics.NotificationFeedbackType.Success
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetHapticEngineForTest();
  mockFlag.mockReturnValue(true);
  mockSettings.mockReturnValue({ practiceHaptics: true } as ReturnType<typeof usePracticeSettings>);
  setAppState('active');
});

describe('FEAT-311: sessionStart anchor', () => {
  it('fires when the practice starts', async () => {
    const { rerender } = renderHook(
      ({ isActive }) =>
        usePracticeHaptics({ schedule: NO_SCHEDULE, isActive, sessionAnchors: true }),
      { initialProps: { isActive: false } }
    );

    expect(sessionStartFired()).toBe(false); // opening the screen is silent

    await act(async () => {
      rerender({ isActive: true });
    });

    expect(sessionStartFired()).toBe(true);
  });

  it('is SILENT on mount when the practice has not been started', () => {
    // Opening a practice screen and not pressing Begin must feel like nothing.
    renderHook(() =>
      usePracticeHaptics({ schedule: NO_SCHEDULE, isActive: false, sessionAnchors: true })
    );

    expect(sessionStartFired()).toBe(false);
  });

  it('does NOT re-fire on resume after a pause', async () => {
    // A resume is not a beginning. Announcing it as one is false to an
    // eyes-closed practitioner, and firing per-resume makes the pulse count
    // encode how many times they paused — the "signature" the catalog forbids.
    const { rerender } = renderHook(
      ({ isActive }) =>
        usePracticeHaptics({ schedule: NO_SCHEDULE, isActive, sessionAnchors: true }),
      { initialProps: { isActive: false } }
    );

    await act(async () => {
      rerender({ isActive: true });
    });
    expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      rerender({ isActive: false }); // pause
    });
    await act(async () => {
      rerender({ isActive: true }); // resume
    });

    expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('does not fire when the screen has not opted into anchors', async () => {
    const { rerender } = renderHook(
      ({ isActive }) => usePracticeHaptics({ schedule: NO_SCHEDULE, isActive }),
      { initialProps: { isActive: false } }
    );

    await act(async () => {
      rerender({ isActive: true });
    });

    expect(sessionStartFired()).toBe(false);
  });

  it('makes NO native call when the build-time flag is off', async () => {
    mockFlag.mockReturnValue(false);

    const { rerender } = renderHook(
      ({ isActive }) =>
        usePracticeHaptics({ schedule: NO_SCHEDULE, isActive, sessionAnchors: true }),
      { initialProps: { isActive: false } }
    );

    await act(async () => {
      rerender({ isActive: true });
    });

    expect(mockHaptics.impactAsync).not.toHaveBeenCalled();
  });

  it('makes NO native call when the practitioner has not consented', async () => {
    mockSettings.mockReturnValue({ practiceHaptics: false } as ReturnType<
      typeof usePracticeSettings
    >);

    const { rerender } = renderHook(
      ({ isActive }) =>
        usePracticeHaptics({ schedule: NO_SCHEDULE, isActive, sessionAnchors: true }),
      { initialProps: { isActive: false } }
    );

    await act(async () => {
      rerender({ isActive: true });
    });

    expect(mockHaptics.impactAsync).not.toHaveBeenCalled();
  });
});

describe('FEAT-311: sessionEnd anchor', () => {
  it('fires from the completion path even though isActive is already false', async () => {
    // THE REGRESSION THIS FILE EXISTS FOR. handleTimerComplete sets
    // isTimerActive false and THEN calls the completion callback, in the same
    // tick. An emit path gated on isActive would be silent at exactly the
    // moment the session's most meaningful cue is due.
    const { result, rerender } = renderHook(
      ({ isActive }) =>
        usePracticeHaptics({ schedule: NO_SCHEDULE, isActive, sessionAnchors: true }),
      { initialProps: { isActive: true } }
    );

    await act(async () => {
      rerender({ isActive: false });
    });

    // The anchors share hapticEngine's module-scoped throttle clock, and this
    // spec fires both within a millisecond. Clear it so we are testing the
    // isActive gate rather than the burst guard — a real session puts minutes
    // between the two. The throttle interaction itself is pinned separately
    // below, deliberately, rather than papered over here.
    __resetHapticEngineForTest();

    await act(async () => {
      result.current.emitSessionEnd();
    });

    expect(sessionEndFired()).toBe(true);
  });

  it('IS eaten by the burst throttle if it lands within MIN_CUE_INTERVAL_MS of another cue', async () => {
    // Characterization, not an endorsement. The throttle is module-scoped by
    // design so burst control holds across every cue source, which means it
    // also spans a whole session. sessionEnd is the most meaningful cue of the
    // session, so it is worth knowing that a rhythm cue landing inside the last
    // 500ms would silently swallow it.
    //
    // Unreachable today: with DEFAULT_PATTERN (4-4, no hold) and whole-second
    // durations the final residue is always >= 1000ms, which the tail spec
    // below proves exhaustively. But it is one pattern change or one
    // non-integer duration away from being false, and the failure is silent.
    const { result, rerender } = renderHook(
      ({ isActive }) =>
        usePracticeHaptics({ schedule: NO_SCHEDULE, isActive, sessionAnchors: true }),
      { initialProps: { isActive: false } }
    );

    await act(async () => {
      rerender({ isActive: true }); // sessionStart delivers, arming the throttle
    });
    expect(sessionStartFired()).toBe(true);

    await act(async () => {
      result.current.emitSessionEnd(); // same millisecond — inside the window
    });

    expect(sessionEndFired()).toBe(false);
  });

  it('fires on a screen whose cue schedule is EMPTY', async () => {
    // ReflectionTimerScreen's schedule is empty unless interval cadence was
    // separately opted into. The anchors ride the MASTER toggle, so they must
    // still fire — an anchor riding the schedule-gated effect would not.
    const { result } = renderHook(() =>
      usePracticeHaptics({ schedule: NO_SCHEDULE, isActive: true, sessionAnchors: true })
    );

    await act(async () => {
      result.current.emitSessionEnd();
    });

    expect(sessionEndFired()).toBe(true);
  });

  it('is SILENT while the app is backgrounded', async () => {
    // Timer is timestamp-based, so a session can complete while the app is in
    // the background — a success buzz in a pocket, for a practice the user is
    // not in.
    setAppState('background');

    const { result } = renderHook(() =>
      usePracticeHaptics({ schedule: NO_SCHEDULE, isActive: true, sessionAnchors: true })
    );

    await act(async () => {
      result.current.emitSessionEnd();
    });

    expect(mockHaptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('is SILENT when the screen has not opted into anchors', async () => {
    const { result } = renderHook(() =>
      usePracticeHaptics({ schedule: NO_SCHEDULE, isActive: true })
    );

    await act(async () => {
      result.current.emitSessionEnd();
    });

    expect(mockHaptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('makes NO native call when the practitioner has not consented', async () => {
    mockSettings.mockReturnValue({ practiceHaptics: false } as ReturnType<
      typeof usePracticeSettings
    >);

    const { result } = renderHook(() =>
      usePracticeHaptics({ schedule: NO_SCHEDULE, isActive: true, sessionAnchors: true })
    );

    await act(async () => {
      result.current.emitSessionEnd();
    });

    expect(mockHaptics.notificationAsync).not.toHaveBeenCalled();
  });
});

describe('FEAT-311: anchors never speak through the scheduler announcement', () => {
  it('does not invoke `announce` for either anchor', async () => {
    // BodyScanScreen's announce callback takes NO cue argument and speaks
    // "Next area" unconditionally. Routing an anchor through it would tell a
    // blind practitioner to move body region at t=0 and again at completion.
    // The anchors bypass the scheduler entirely; this pins that they keep
    // doing so, because the mis-instruction would be inaudible in review.
    const announce = jest.fn();

    const { result, rerender } = renderHook(
      ({ isActive }) =>
        usePracticeHaptics({
          schedule: NO_SCHEDULE,
          isActive,
          sessionAnchors: true,
          announce,
        }),
      { initialProps: { isActive: false } }
    );

    await act(async () => {
      rerender({ isActive: true });
    });
    await act(async () => {
      result.current.emitSessionEnd();
    });

    expect(announce).not.toHaveBeenCalled();
  });
});

describe('FEAT-311: the t=0 collision', () => {
  it('boundariesWithin emits an opening boundary at atMs 0 by default', () => {
    // The precondition. Without this, the trim below would be pinning nothing.
    const boundaries = boundariesWithin(DEFAULT_PATTERN, 60_000);
    expect(boundaries[0]).toMatchObject({ atMs: 0, phase: 'inhale' });
  });

  it('skipOpening removes ONLY the opening boundary', () => {
    const full = boundariesWithin(DEFAULT_PATTERN, 60_000);
    const trimmed = boundariesWithin(DEFAULT_PATTERN, 60_000, { skipOpening: true });

    expect(trimmed).toEqual(full.slice(1));
    expect(trimmed.some((b) => b.atMs === 0)).toBe(false);
  });

  it('leaves a gap wider than the throttle window before the first rhythm cue', () => {
    // sessionStart REPLACES the opening inhale rather than racing it. Both are
    // impactLight at the same instant, so firing both means one is dropped by
    // the 500ms throttle and the practitioner feels a single pulse either way —
    // the choice of WHICH survives must be ours, not the throttle's.
    const trimmed = boundariesWithin(DEFAULT_PATTERN, 60_000, { skipOpening: true });
    expect(trimmed[0]!.atMs).toBeGreaterThanOrEqual(MIN_CUE_INTERVAL_MS);
  });

  it('leaves the tail clear of the throttle window for every integer duration', () => {
    // Documents WHY no tail trim is needed. sessionEnd is the session's most
    // meaningful cue and would be silently eaten if a rhythm boundary landed
    // within 500ms of it. With a 4-4 pattern and whole-second durations the
    // minimum residue is 1000ms — but this is one pattern change away from
    // being false, so it is pinned rather than assumed.
    for (let seconds = 1; seconds <= 1800; seconds += 1) {
      const sessionMs = seconds * 1000;
      const boundaries = boundariesWithin(DEFAULT_PATTERN, sessionMs, { skipOpening: true });
      const last = boundaries[boundaries.length - 1];
      if (!last) continue;
      expect(sessionMs - last.atMs).toBeGreaterThanOrEqual(MIN_CUE_INTERVAL_MS);
    }
  });
});
