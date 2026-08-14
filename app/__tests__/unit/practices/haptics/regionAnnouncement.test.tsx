/**
 * DEBUG-425 — the Body Scan region announcement is not a function of the
 * tactile preference.
 *
 * `usePracticeHaptics` reached its `announce` callback only from inside
 * `onCue`, inside a scheduler effect that early-returned unless the MASTER
 * gate held — and that gate included `practices.practiceHaptics`. So a
 * practitioner who declined vibration lost every region-boundary utterance,
 * and BodyScanScreen has no other announcement on that boundary (the region
 * list only rewrites labels; it has no live region). Declining one guidance
 * channel silently cost the only other one.
 *
 * WHAT THESE SPECS PIN, and why they are shaped the way they are:
 *
 *   - The decline path SPEAKS, and speaks without producing any haptic. Both
 *     halves matter. Asserting only that the announcement happened would pass
 *     against a fix that simply forced the tactile channel on, which would
 *     overwrite a recorded consent answer.
 *   - The announcement survives the actuator failing. Pinned by latching the
 *     REAL engine off through a rejected native call rather than by stubbing
 *     our own module, so the spec exercises the path a device without an
 *     actuator actually takes.
 *   - The accepter's timing is unchanged, asserted at both edges (not-yet at
 *     149ms, delivered at 150ms). A spec that only advanced past the stagger
 *     would pass whether or not the stagger existed.
 *   - The anchors stay silent in the speech channel WITH A NON-EMPTY SCHEDULE.
 *     The pre-existing guard in sessionAnchors.test.tsx ran with `[]`, which
 *     early-returned the whole effect, so `announce` was unreachable in that
 *     fixture no matter how the anchors were wired — it could not have caught
 *     the regression it was written for.
 *
 * All behaviour, no source-string assertions: both files under test carry
 * `practice_haptics` in prose comments, so a source grep would pass on the
 * comment alone (DEBUG-390).
 */

import { AppState } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { usePracticeHaptics } from '@/features/practices/shared/haptics/usePracticeHaptics';
import { __resetHapticEngineForTest } from '@/features/practices/shared/haptics/hapticEngine';
import { HAPTIC_ANNOUNCEMENT_STAGGER_MS } from '@/features/practices/shared/haptics/constants';
import { regionSchedule } from '@/features/practices/shared/haptics/cueScheduler';

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

/** BodyScanScreen's real shape: a 60s scan over the six body areas. */
const SESSION_MS = 60_000;
const REGION_COUNT = 6;
const SCHEDULE = regionSchedule(SESSION_MS, REGION_COUNT);
/** regionSchedule emits interior boundaries only: i = 1..regionCount-1. */
const BOUNDARY_COUNT = REGION_COUNT - 1;
const BOUNDARY_GAP_MS = SESSION_MS / REGION_COUNT;

function setAppState(state: string): void {
  (AppState as unknown as { currentState: string }).currentState = state;
}

/** Every native call the scheduled region cue could possibly make. */
function nativeHapticCalls(): number {
  return (
    mockHaptics.impactAsync.mock.calls.length +
    mockHaptics.selectionAsync.mock.calls.length +
    mockHaptics.notificationAsync.mock.calls.length
  );
}

function setPreference(practiceHaptics: boolean): void {
  mockSettings.mockReturnValue({ practiceHaptics } as ReturnType<typeof usePracticeSettings>);
}

/** Mount the hook the way BodyScanScreen does. */
function mountBodyScan(announce: jest.Mock, sessionAnchors = false) {
  return renderHook(() =>
    usePracticeHaptics({
      schedule: SCHEDULE,
      isActive: true,
      sessionAnchors,
      announce,
    })
  );
}

/** Advance to the next region boundary, plus `extraMs` beyond it. */
async function advanceToBoundary(extraMs = 0): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(BOUNDARY_GAP_MS + extraMs);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  __resetHapticEngineForTest();
  mockFlag.mockReturnValue(true);
  setPreference(true);
  setAppState('active');
});

afterEach(() => {
  jest.useRealTimers();
});

describe('DEBUG-425: the schedule the specs are written against', () => {
  it('emits one interior boundary per region transition and none at the edges', () => {
    // The precondition. Without it, "one announcement per boundary" below
    // could be pinning an empty timeline.
    expect(SCHEDULE).toHaveLength(BOUNDARY_COUNT);
    expect(SCHEDULE.every((c) => c.cue === 'regionTransition')).toBe(true);
    expect(SCHEDULE.map((c) => c.atMs)).toEqual([10_000, 20_000, 30_000, 40_000, 50_000]);
  });
});

describe('DEBUG-425: a decline silences the vibration, not the speech', () => {
  it('announces every region boundary with the tactile preference off', async () => {
    setPreference(false);
    const announce = jest.fn();
    mountBodyScan(announce);

    for (let i = 0; i < BOUNDARY_COUNT; i += 1) {
      await advanceToBoundary();
    }

    expect(announce).toHaveBeenCalledTimes(BOUNDARY_COUNT);
  });

  it('produces no haptic at all on that same run', async () => {
    // The other half of the fix. An implementation that restored the speech by
    // forcing `practiceHaptics` on would satisfy the spec above and violate
    // this one — and would overwrite an unrepeatable consent answer to do it.
    setPreference(false);
    const announce = jest.fn();
    mountBodyScan(announce);

    for (let i = 0; i < BOUNDARY_COUNT; i += 1) {
      await advanceToBoundary();
    }

    expect(announce).toHaveBeenCalledTimes(BOUNDARY_COUNT);
    expect(nativeHapticCalls()).toBe(0);
  });

  it('speaks on the boundary itself, with no tactile lead to trail', async () => {
    // The stagger exists to let the tap land first — every justification for
    // it in constants.ts is visuotactile. With no tap there is nothing to
    // follow, so the decline path must not inherit the delay.
    setPreference(false);
    const announce = jest.fn();
    mountBodyScan(announce);

    await advanceToBoundary();

    expect(announce).toHaveBeenCalledTimes(1);
  });
});

describe('DEBUG-425: the accepter path is untouched', () => {
  it('still delivers the haptic and trails the announcement by the stagger', async () => {
    const announce = jest.fn();
    mountBodyScan(announce);

    await advanceToBoundary();

    // The tap has landed; the utterance has not.
    expect(mockHaptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    expect(announce).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(HAPTIC_ANNOUNCEMENT_STAGGER_MS - 1);
    });
    expect(announce).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(announce).toHaveBeenCalledTimes(1);
  });
});

describe('DEBUG-425: the utterance does not depend on the actuator succeeding', () => {
  it('still announces after the engine latches off on a failed native call', async () => {
    // Latch the REAL engine off the way a device with no actuator does, rather
    // than stubbing our own module: `available` flips inside hapticEngine's
    // own catch, and every later cue then short-circuits before `isEnabled`.
    mockHaptics.impactAsync.mockRejectedValue(new Error('no actuator'));
    const announce = jest.fn();
    mountBodyScan(announce);

    // First boundary: the native call is attempted and rejects.
    await advanceToBoundary();
    await act(async () => {
      jest.advanceTimersByTime(HAPTIC_ANNOUNCEMENT_STAGGER_MS);
    });
    expect(announce).toHaveBeenCalledTimes(1);

    const callsAfterLatch = mockHaptics.impactAsync.mock.calls.length;

    // Second boundary: the engine is latched off and makes no further call,
    // but the boundary must still be spoken.
    await advanceToBoundary();
    await act(async () => {
      jest.advanceTimersByTime(HAPTIC_ANNOUNCEMENT_STAGGER_MS);
    });

    expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(callsAfterLatch);
    expect(announce).toHaveBeenCalledTimes(2);
  });
});

describe('DEBUG-425: the session anchors stay silent in the speech channel', () => {
  it('never routes an anchor through `announce` — on a NON-empty schedule', async () => {
    // Replaces the guard in sessionAnchors.test.tsx, which ran with an empty
    // schedule. That early-returned the whole scheduler effect, so `announce`
    // was unreachable there whatever the anchors did.
    const announce = jest.fn();
    const { result } = mountBodyScan(announce, true);

    // sessionStart has fired by now (isActive true from mount) and completion
    // is requested explicitly — neither may speak.
    await act(async () => {
      result.current.emitSessionEnd();
    });

    expect(announce).not.toHaveBeenCalled();

    // Guard the guard: prove this fixture CAN reach `announce`, so the
    // assertion above is a real constraint and not an unreachable code path.
    await advanceToBoundary();
    await act(async () => {
      jest.advanceTimersByTime(HAPTIC_ANNOUNCEMENT_STAGGER_MS);
    });
    expect(announce).toHaveBeenCalledTimes(1);
  });
});

describe('DEBUG-425: the build flag still gates the whole pipeline', () => {
  it('stays silent in both channels when practice_haptics is off', async () => {
    // The founder decision for this item: speech rides the build flag, so the
    // change ships dark and INFRA-395's device session verifies it before the
    // flip. If this ever goes red, the item's blast radius changed.
    mockFlag.mockReturnValue(false);
    setPreference(false);
    const announce = jest.fn();
    mountBodyScan(announce);

    for (let i = 0; i < BOUNDARY_COUNT; i += 1) {
      await advanceToBoundary();
    }

    expect(announce).not.toHaveBeenCalled();
    expect(nativeHapticCalls()).toBe(0);
  });
});
