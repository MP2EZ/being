/**
 * FEAT-285 — haptic engine.
 *
 * The engine is the ONLY thing in the app permitted to call expo-haptics. Its
 * job is to make three guarantees that the call sites cannot make individually:
 *
 *   1. When the practitioner has not consented, nothing reaches the native
 *      module at all — not a suppressed call, not a call whose result is
 *      discarded. Zero.
 *   2. A device that cannot render haptics degrades quietly. A rejected native
 *      promise must never surface as a throw or an unhandled rejection during a
 *      practice, and must never be retried in a loop.
 *   3. Bursts are DROPPED, not queued. A queued burst would arrive after the
 *      moment it described, which is worse than silence.
 */

import * as Haptics from 'expo-haptics';
import {
  createHapticEngine,
  __resetHapticEngineForTest,
} from '@/features/practices/shared/haptics/hapticEngine';
import { MIN_CUE_INTERVAL_MS } from '@/features/practices/shared/haptics/constants';

const mockHaptics = Haptics as jest.Mocked<typeof Haptics>;

/**
 * A controllable clock. The engine's default is `performance.now`, which jest's
 * fake timers do not govern — and its throttle/latch state is module-scoped by
 * design, so every spec injects its own clock and resets between runs.
 */
function makeClock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

/** An engine whose clock jumps clear of the throttle window on every read. */
function engineFreeOfThrottle(platform: 'ios' | 'android' = 'ios') {
  let t = 0;
  return createHapticEngine({
    isEnabled: () => true,
    platform,
    now: () => {
      t += MIN_CUE_INTERVAL_MS * 10;
      return t;
    },
  });
}

/** Every expo-haptics entry point the engine could possibly reach. */
function totalNativeCalls(): number {
  return (
    mockHaptics.impactAsync.mock.calls.length +
    mockHaptics.selectionAsync.mock.calls.length +
    mockHaptics.notificationAsync.mock.calls.length
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetHapticEngineForTest();
});

describe('consent gate — the toggle is OFF', () => {
  it('makes ZERO native calls for every cue type', async () => {
    const engine = createHapticEngine({ isEnabled: () => false, platform: 'ios' });

    await engine.fire('sessionStart');
    await engine.fire('inhale');
    await engine.fire('exhale');
    await engine.fire('regionTransition');
    await engine.fire('intervalTick');
    await engine.fire('sessionEnd');

    expect(totalNativeCalls()).toBe(0);
  });

  it('re-reads the gate on every cue, so revoking mid-session takes effect', async () => {
    let enabled = true;
    const engine = createHapticEngine({ isEnabled: () => enabled, platform: 'ios' });

    await engine.fire('inhale');
    expect(totalNativeCalls()).toBe(1);

    enabled = false;
    await engine.fire('exhale');
    expect(totalNativeCalls()).toBe(1); // unchanged
  });

  it('reports the cue as not delivered when gated', async () => {
    const engine = createHapticEngine({ isEnabled: () => false, platform: 'ios' });
    await expect(engine.fire('inhale')).resolves.toBe(false);
  });
});

describe('primitive dispatch', () => {
  it('routes impact cues through impactAsync with the catalog primitive', async () => {
    const engine = engineFreeOfThrottle();

    await engine.fire('inhale');
    expect(mockHaptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);

    await engine.fire('exhale');
    expect(mockHaptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  // The `selectionAsync` dispatch branch used to be covered here, via the `hold`
  // cue — the only cue that ever mapped to the `selection` primitive. MAINT-391
  // deleted the breath-retention engine and the cue with it, so there is no
  // longer a cue to fire that reaches this branch. `selection` joins
  // `impactHeavy`, `notificationWarning` and `notificationError`: a rung of the
  // expo-haptics surface that `invokePrimitive` still handles exhaustively but
  // no catalog entry selects. Reachability, not the switch, is what moved.

  it('routes session end through notificationAsync', async () => {
    await engineFreeOfThrottle().fire('sessionEnd');
    expect(mockHaptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
  });

  it('reaches the native layer on Android too — no silent platform no-op', async () => {
    const clock = makeClock();
    const android = createHapticEngine({
      isEnabled: () => true,
      platform: 'android',
      now: clock.now,
    });

    await android.fire('regionTransition');
    expect(totalNativeCalls()).toBe(1);
  });
});

describe('failure latch — a device that cannot render haptics', () => {
  it('does not throw when the native promise rejects', async () => {
    mockHaptics.impactAsync.mockRejectedValueOnce(new Error('no actuator'));
    const engine = createHapticEngine({ isEnabled: () => true, platform: 'android' });

    await expect(engine.fire('inhale')).resolves.toBe(false);
  });

  it('produces no unhandled rejection', async () => {
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);

    mockHaptics.impactAsync.mockRejectedValueOnce(new Error('no actuator'));
    const engine = createHapticEngine({ isEnabled: () => true, platform: 'android' });
    await engine.fire('inhale');
    await new Promise((resolve) => setImmediate(resolve));

    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('LATCHES to a permanent no-op — one failure stops all later native calls', async () => {
    mockHaptics.impactAsync.mockRejectedValueOnce(new Error('no actuator'));
    const engine = createHapticEngine({ isEnabled: () => true, platform: 'android' });

    await engine.fire('inhale');
    const callsAfterFailure = totalNativeCalls();

    // Subsequent cues of every kind must not retry the native layer.
    await engine.fire('exhale');
    await engine.fire('intervalTick');
    await engine.fire('sessionEnd');
    await engine.fire('regionTransition');

    expect(totalNativeCalls()).toBe(callsAfterFailure);
  });

  it('exposes the latched state so callers can stop scheduling', async () => {
    mockHaptics.impactAsync.mockRejectedValueOnce(new Error('no actuator'));
    const engine = engineFreeOfThrottle('android');

    expect(engine.isAvailable()).toBe(true);
    await engine.fire('inhale');
    expect(engine.isAvailable()).toBe(false);
  });

  it('latches on a synchronous throw too, not only a rejection', async () => {
    mockHaptics.impactAsync.mockImplementationOnce(() => {
      throw new Error('module missing');
    });
    const engine = engineFreeOfThrottle('android');

    await expect(engine.fire('inhale')).resolves.toBe(false);
    expect(engine.isAvailable()).toBe(false);
  });

  it('latches ACROSS engine instances — the actuator is a device property', async () => {
    mockHaptics.impactAsync.mockRejectedValueOnce(new Error('no actuator'));
    await engineFreeOfThrottle('android').fire('inhale');

    const second = engineFreeOfThrottle('android');
    expect(second.isAvailable()).toBe(false);
    await second.fire('exhale');
    expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(1);
  });
});

describe('throttle — sub-threshold bursts are DROPPED, not queued', () => {
  it('drops a second cue fired inside the minimum interval', async () => {
    const clock = makeClock();
    const engine = createHapticEngine({ isEnabled: () => true, platform: 'ios', now: clock.now });

    await engine.fire('inhale');
    expect(totalNativeCalls()).toBe(1);

    clock.advance(MIN_CUE_INTERVAL_MS - 1);
    await expect(engine.fire('exhale')).resolves.toBe(false);
    expect(totalNativeCalls()).toBe(1);
  });

  it('does NOT deliver the dropped cue later (proves drop, not queue)', async () => {
    const clock = makeClock();
    const engine = createHapticEngine({ isEnabled: () => true, platform: 'ios', now: clock.now });

    await engine.fire('inhale');
    clock.advance(MIN_CUE_INTERVAL_MS - 1);
    await engine.fire('exhale');

    // Move well past the throttle window with no further fire() calls. A queued
    // implementation would flush here; a dropping one stays at one delivery.
    clock.advance(MIN_CUE_INTERVAL_MS * 10);
    await new Promise((resolve) => setImmediate(resolve));

    expect(totalNativeCalls()).toBe(1);
  });

  it('allows a cue once the interval has elapsed', async () => {
    const clock = makeClock();
    const engine = createHapticEngine({ isEnabled: () => true, platform: 'ios', now: clock.now });

    await engine.fire('inhale');
    clock.advance(MIN_CUE_INTERVAL_MS);
    await expect(engine.fire('exhale')).resolves.toBe(true);
    expect(totalNativeCalls()).toBe(2);
  });

  it('collapses a rapid burst to a single delivered cue', async () => {
    const clock = makeClock();
    const engine = createHapticEngine({ isEnabled: () => true, platform: 'ios', now: clock.now });

    for (let i = 0; i < 20; i += 1) {
      clock.advance(1); // 20 cues inside 20ms
      await engine.fire('inhale');
    }

    expect(totalNativeCalls()).toBe(1);
  });

  it('does not let a gated cue consume the throttle budget', async () => {
    const clock = makeClock();
    let enabled = false;
    const engine = createHapticEngine({
      isEnabled: () => enabled,
      platform: 'ios',
      now: clock.now,
    });

    await engine.fire('inhale'); // gated, no native call
    enabled = true;
    await engine.fire('exhale'); // must still be allowed immediately

    expect(totalNativeCalls()).toBe(1);
  });

  it('is SHARED across engines — two cue sources cannot each get a budget', async () => {
    const clock = makeClock();
    const breathing = createHapticEngine({
      isEnabled: () => true,
      platform: 'ios',
      now: clock.now,
    });
    const intervals = createHapticEngine({
      isEnabled: () => true,
      platform: 'ios',
      now: clock.now,
    });

    await breathing.fire('inhale');
    await intervals.fire('intervalTick'); // same instant, different engine

    expect(totalNativeCalls()).toBe(1);
  });
});

describe('constants', () => {
  it('sets a throttle floor above zero', () => {
    expect(MIN_CUE_INTERVAL_MS).toBeGreaterThan(0);
  });

  it('keeps the floor below the shortest real phase so valid cues survive', () => {
    // The shortest phase in any shipped pattern is a 4000ms inhale/exhale.
    // A floor at or above that would silently swallow legitimate cues.
    expect(MIN_CUE_INTERVAL_MS).toBeLessThan(4000);
  });
});
