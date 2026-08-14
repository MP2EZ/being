/**
 * INFRA-395 — the `haptic_trace` diagnostic flag.
 *
 * `practice_haptics` ships dark pending an attended on-device sign-off that CI
 * structurally cannot run (100% ubuntu-latest, and the iOS simulator emits no
 * haptics at all). That sign-off must measure a RELEASE build, where the
 * pre-existing `__DEV__` traces fold away — so `haptic_trace` exists to make
 * the cue pipeline observable in exactly the build a user gets.
 *
 * That is a dangerous shape, and these specs pin the reason it is safe: a flag
 * on the cue path which is read for OBSERVABILITY could just as easily be read
 * for CONTROL, and the failure would be silent — a diagnostic left off in
 * production is indistinguishable from a diagnostic that works, right up until
 * it is also suppressing cues for the low-vision and eyes-closed practitioners
 * the subsystem exists for.
 *
 * So the contract under test is: flipping `haptic_trace` changes what is
 * LOGGED and nothing else. Same native calls, same return values, same drops.
 */

import * as Haptics from 'expo-haptics';
import fs from 'fs';
import path from 'path';

import {
  createHapticEngine,
  __resetHapticEngineForTest,
} from '@/features/practices/shared/haptics/hapticEngine';
import { MIN_CUE_INTERVAL_MS } from '@/features/practices/shared/haptics/constants';
import { isFeatureEnabled } from '@/core/services/featureFlags';

jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: jest.fn(() => false),
}));

const mockHaptics = Haptics as jest.Mocked<typeof Haptics>;
const mockIsFeatureEnabled = isFeatureEnabled as jest.MockedFunction<typeof isFeatureEnabled>;

/** Every expo-haptics entry point the engine could possibly reach. */
function totalNativeCalls(): number {
  return (
    mockHaptics.impactAsync.mock.calls.length +
    mockHaptics.selectionAsync.mock.calls.length +
    mockHaptics.notificationAsync.mock.calls.length
  );
}

/** An engine whose clock clears the throttle window on every read. */
function engineFreeOfThrottle() {
  let t = 0;
  return createHapticEngine({
    isEnabled: () => true,
    platform: 'ios',
    now: () => {
      t += MIN_CUE_INTERVAL_MS * 10;
      return t;
    },
  });
}

/**
 * Run the same cue sequence under a given `haptic_trace` value and report only
 * what the flag must NOT be able to change.
 */
async function observeCueRun(traceEnabled: boolean) {
  __resetHapticEngineForTest();
  jest.clearAllMocks();
  mockIsFeatureEnabled.mockImplementation((name) =>
    name === 'haptic_trace' ? traceEnabled : false
  );

  const engine = engineFreeOfThrottle();
  const results = [
    await engine.fire('inhale'),
    await engine.fire('exhale'),
    await engine.fire('sessionEnd'),
  ];

  return {
    results,
    nativeCalls: totalNativeCalls(),
    primitives: mockHaptics.impactAsync.mock.calls.map((c) => c[0]),
    available: engine.isAvailable(),
  };
}

describe('haptic_trace is observability-only', () => {
  afterEach(() => {
    __resetHapticEngineForTest();
    jest.clearAllMocks();
  });

  it('delivers identical cues whether the diagnostic is on or off', async () => {
    const off = await observeCueRun(false);
    const on = await observeCueRun(true);

    expect(on).toEqual(off);
    // Guard against the whole comparison passing vacuously on a run that
    // delivered nothing at all.
    expect(off.nativeCalls).toBe(3);
    expect(off.results).toEqual([true, true, true]);
  });

  it('does not gate delivery — cues still fire with the diagnostic off', async () => {
    __resetHapticEngineForTest();
    mockIsFeatureEnabled.mockReturnValue(false);

    const engine = engineFreeOfThrottle();
    await expect(engine.fire('inhale')).resolves.toBe(true);
    expect(totalNativeCalls()).toBe(1);
  });

  it('does not resurrect a latched-off actuator when switched on', async () => {
    __resetHapticEngineForTest();
    mockIsFeatureEnabled.mockReturnValue(false);
    mockHaptics.impactAsync.mockRejectedValueOnce(new Error('no actuator'));

    const engine = engineFreeOfThrottle();
    await engine.fire('inhale');
    expect(engine.isAvailable()).toBe(false);

    // Turning the diagnostic on must observe the latch, never clear it.
    mockIsFeatureEnabled.mockReturnValue(true);
    await expect(engine.fire('exhale')).resolves.toBe(false);
    expect(engine.isAvailable()).toBe(false);
  });
});

/**
 * The env-declaration pins.
 *
 * `isFeatureEnabled` is `FLAGS[name] === true`, so an ABSENT flag and a flag
 * deliberately set false are indistinguishable at runtime — which means an
 * omission can never be caught by behaviour, only by reading the declaration.
 * That is precisely how `practice_haptics` went missing from the e2e-sim
 * profile in the first place.
 */
describe('e2e-sim profile declares both flags explicitly', () => {
  const easJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'eas.json'), 'utf8')
  );
  const flags: string = easJson.build['e2e-sim'].env.EXPO_PUBLIC_FEATURE_FLAGS;

  it('reads a non-empty flag string (proves the fixture resolved)', () => {
    expect(typeof flags).toBe('string');
    expect(flags.length).toBeGreaterThan(0);
  });

  it('declares practice_haptics explicitly rather than by omission', () => {
    expect(flags).toContain('practice_haptics:');
  });

  it('ships the diagnostic dark in the Maestro gate build', () => {
    expect(flags).toContain('haptic_trace:false');
  });

  it('never ships the diagnostic enabled', () => {
    expect(flags).not.toContain('haptic_trace:true');
  });
});
