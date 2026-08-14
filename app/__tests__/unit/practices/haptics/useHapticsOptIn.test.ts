/**
 * useHapticsOptIn — the once-ever invariant (FEAT-385).
 *
 * The prompt is unrepeatable: a decline is permanent, and re-asking after a "no"
 * would make the "no" meaningless. FEAT-385 re-homes the prompt onto THREE mount
 * sites, which is what makes this file necessary — the invariant stopped being
 * structural (one mount) and became something that has to be enforced.
 *
 * The hazard is the AWAIT WINDOW, not simultaneous render. `updatePracticeSettings`
 * is async, so between the tap and the persisted `practiceHapticsPrompted: true`
 * there is an interval in which another practice screen can mount, read `false`,
 * and show the prompt a second time. A latch that lives only in the store cannot
 * close that window; the claim must be taken synchronously in module scope.
 */

import { act, renderHook } from '@testing-library/react-native';

import { useHapticsOptIn, __resetHapticsOptInLatch } from '@/features/practices/shared/haptics/useHapticsOptIn';

jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: jest.fn(() => true),
}));

const mockUpdatePracticeSettings = jest.fn();
let mockSettings: { practices: Record<string, unknown> } | null = null;

jest.mock('@/core/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: unknown) => unknown) =>
    selector({
      settings: mockSettings,
      updatePracticeSettings: mockUpdatePracticeSettings,
    }),
}));

import { isFeatureEnabled } from '@/core/services/featureFlags';

const settingsWith = (prompted: boolean) => ({
  practices: {
    practiceHaptics: false,
    practiceHapticsInterval: 'none',
    practiceHapticsPrompted: prompted,
  },
});

beforeEach(() => {
  __resetHapticsOptInLatch();
  mockUpdatePracticeSettings.mockReset();
  // Never resolve by default — this IS the await window the latch must survive.
  mockUpdatePracticeSettings.mockReturnValue(new Promise(() => {}));
  (isFeatureEnabled as jest.Mock).mockReturnValue(true);
  mockSettings = settingsWith(false);
});

describe('eligibility', () => {
  it('prompts when the flag is on, settings are loaded, and it has never been answered', () => {
    const { result } = renderHook(() => useHapticsOptIn());
    expect(result.current.shouldPrompt).toBe(true);
  });

  it('does NOT prompt once the persisted flag records an answer', () => {
    mockSettings = settingsWith(true);
    const { result } = renderHook(() => useHapticsOptIn());
    expect(result.current.shouldPrompt).toBe(false);
  });

  it('does NOT prompt before settings have loaded', () => {
    // Prompting against a null blob would ask on top of an unknown prior answer.
    mockSettings = null;
    const { result } = renderHook(() => useHapticsOptIn());
    expect(result.current.shouldPrompt).toBe(false);
  });

  it('does NOT prompt when practice_haptics is disabled', () => {
    // With the flag off no haptic can ever fire, so asking would spend an
    // unrepeatable choice on a capability that cannot exist.
    (isFeatureEnabled as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useHapticsOptIn());
    expect(result.current.shouldPrompt).toBe(false);
  });
});

describe('once-ever across the three mount sites', () => {
  it('grants the prompt to exactly ONE of two concurrently mounted screens', () => {
    const first = renderHook(() => useHapticsOptIn());
    const second = renderHook(() => useHapticsOptIn());

    const granted = [first.result.current.shouldPrompt, second.result.current.shouldPrompt];
    expect(granted.filter(Boolean)).toHaveLength(1);
  });

  it('SURVIVES THE AWAIT WINDOW: answer, navigate away, and a second screen '
    + 'mounting before the write lands is still not prompted', () => {
    // The real interleaving: the user answers on one practice screen, that screen
    // unmounts as navigation moves on, and the next practice screen mounts while
    // the store write is STILL in flight.
    //
    // The unmount is what makes this test non-vacuous. With the holder still
    // mounted, `claimHolder` alone would block the second screen and the
    // assertion would pass even with the synchronous latch removed.
    const first = renderHook(() => useHapticsOptIn());
    expect(first.result.current.shouldPrompt).toBe(true);

    act(() => {
      first.result.current.onChoose(false);
    });
    first.unmount();

    // The store write is deliberately never resolved, so the PERSISTED flag is
    // still false — exactly the state a second screen would read. Anything that
    // blocks the second prompt here can only be the module-scope latch.
    expect(mockSettings?.practices.practiceHapticsPrompted).toBe(false);

    const second = renderHook(() => useHapticsOptIn());
    expect(second.result.current.shouldPrompt).toBe(false);
  });

  it('hands the claim on when the holder unmounts WITHOUT answering', () => {
    // Backing out of a practice must not permanently consume the prompt.
    const first = renderHook(() => useHapticsOptIn());
    expect(first.result.current.shouldPrompt).toBe(true);

    first.unmount();

    const second = renderHook(() => useHapticsOptIn());
    expect(second.result.current.shouldPrompt).toBe(true);
  });
});

describe('both choices spend the prompt', () => {
  it.each([
    ['accept', true],
    ['decline', false],
  ])('marks it answered on %s', (_name, enabled) => {
    const { result } = renderHook(() => useHapticsOptIn());

    act(() => {
      result.current.onChoose(enabled as boolean);
    });

    expect(mockUpdatePracticeSettings).toHaveBeenCalledWith({
      practiceHaptics: enabled,
      practiceHapticsPrompted: true,
    });
    expect(result.current.shouldPrompt).toBe(false);
  });

  it('is idempotent — a double tap writes exactly once', () => {
    // Two presses landing in the same frame must not produce two writes, the
    // second of which could carry the opposite value.
    const { result } = renderHook(() => useHapticsOptIn());

    act(() => {
      result.current.onChoose(true);
      result.current.onChoose(false);
    });

    expect(mockUpdatePracticeSettings).toHaveBeenCalledTimes(1);
    expect(mockUpdatePracticeSettings).toHaveBeenCalledWith({
      practiceHaptics: true,
      practiceHapticsPrompted: true,
    });
  });
});

/**
 * DEBUG-426 — hardware that cannot vibrate is never asked.
 *
 * The prompt recommends "Turn on", accepts the practitioner's assent, spends
 * their single unrepeatable choice, and then does nothing — on an iPad there
 * is no actuator and iOS raises no error, so `hapticEngine`'s catch-only latch
 * never fires and a production build records nothing.
 *
 * Suppression must be a PURE READ. The two assertions that matter most here are
 * therefore the negative ones: nothing may be persisted. If suppression wrote
 * `practiceHapticsPrompted: true`, the choice would be spent by the very fix
 * meant to preserve it, and a practitioner who later moved to a device that CAN
 * deliver would never be asked.
 */
describe('DEBUG-426: device capability', () => {
  const mockDevice = jest.requireMock('expo-device') as {
    isDevice: boolean;
    modelId: string | null;
    deviceType: number;
  };

  const asCapableIPhone = (): void => {
    mockDevice.isDevice = true;
    mockDevice.modelId = 'iPhone14,2';
    mockDevice.deviceType = 1;
  };
  const asIPad = (): void => {
    mockDevice.isDevice = true;
    mockDevice.modelId = 'iPad13,16';
    mockDevice.deviceType = 2;
  };

  beforeEach(asCapableIPhone);
  afterEach(asCapableIPhone);

  it('still prompts on hardware that can vibrate', () => {
    // POSITIVE CONTROL, and it is not optional. `shouldPrompt === false` also
    // holds if the flag is off, if settings never hydrated, if the render threw,
    // or if the expo-device mock returned a shape the predicate does not read.
    // Only a same-file case that goes the other way distinguishes those from a
    // working suppression.
    const { result } = renderHook(() => useHapticsOptIn());
    expect(result.current.shouldPrompt).toBe(true);
  });

  it('does not prompt on an iPad', () => {
    asIPad();
    const { result } = renderHook(() => useHapticsOptIn());
    expect(result.current.shouldPrompt).toBe(false);
  });

  it('spends nothing when it suppresses — no write of any kind', () => {
    asIPad();
    renderHook(() => useHapticsOptIn());
    expect(mockUpdatePracticeSettings).not.toHaveBeenCalled();
  });

  it('leaves the prompt unspent across a relaunch, so a capable device still asks', () => {
    // Simulate the app being opened again on the iPad: the module latch resets,
    // the persisted bit is still false because nothing wrote it.
    asIPad();
    renderHook(() => useHapticsOptIn());
    __resetHapticsOptInLatch();
    const second = renderHook(() => useHapticsOptIn());
    expect(second.result.current.shouldPrompt).toBe(false);
    expect(mockUpdatePracticeSettings).not.toHaveBeenCalled();

    // Now the same unspent state on a device that CAN deliver.
    __resetHapticsOptInLatch();
    asCapableIPhone();
    const onCapable = renderHook(() => useHapticsOptIn());
    expect(onCapable.result.current.shouldPrompt).toBe(true);
  });

  it('does not prompt on a simulator', () => {
    mockDevice.isDevice = false;
    mockDevice.modelId = 'arm64';
    const { result } = renderHook(() => useHapticsOptIn());
    expect(result.current.shouldPrompt).toBe(false);
  });

  it('still prompts on an unrecognised device — the predicate fails open', () => {
    mockDevice.modelId = null;
    mockDevice.deviceType = 0; // DeviceType.UNKNOWN
    const { result } = renderHook(() => useHapticsOptIn());
    expect(result.current.shouldPrompt).toBe(true);
  });

  it('does not take the cross-screen claim when it suppresses', () => {
    // The capability term belongs INSIDE `eligible`, not as a late guard on
    // `shouldPrompt`: only `eligible` gates the claim-taking effect. A late
    // guard would let an incapable mount consume `claimHolder` and starve a
    // capable sibling screen for the rest of the session.
    asIPad();
    renderHook(() => useHapticsOptIn());

    asCapableIPhone();
    const sibling = renderHook(() => useHapticsOptIn());
    expect(sibling.result.current.shouldPrompt).toBe(true);
  });
});
