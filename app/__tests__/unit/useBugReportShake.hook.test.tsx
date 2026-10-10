/**
 * FEAT-284 / DEBUG-533 — useBugReportShake HOOK behaviour (MAINT-748).
 *
 * `bugReportShake.test.ts` pins the three pure helpers. This file pins what only
 * the hook can get wrong: the flag gate, the subscription lifecycle, and the way
 * the crossing counter and the debounce compose across accelerometer samples.
 *
 * The burst requirement is a RATE CONTROL on an opaque, accessibility-pruning
 * overlay (see the hook's own docblock) — which is why 2 crossings must not open
 * it, and why a crossing dropped during the debounce must not open a second form.
 */

import { renderHook } from '@testing-library/react-native';

const mockAddListener = jest.fn();
const mockSetUpdateInterval = jest.fn();
jest.mock('expo-sensors', () => ({
  __esModule: true,
  Accelerometer: {
    addListener: (...args: unknown[]) => mockAddListener(...args),
    setUpdateInterval: (...args: unknown[]) => mockSetUpdateInterval(...args),
  },
}));

const mockIsFeatureEnabled = jest.fn((_flag: string) => true);
jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: (flag: string) => mockIsFeatureEnabled(flag),
}));

const mockShowFeedbackForm = jest.fn();
jest.mock('@/core/services/logging', () => ({
  showFeedbackForm: () => mockShowFeedbackForm(),
}));

import { useBugReportShake } from '@/core/hooks/useBugReportShake';

type Sample = { x: number; y: number; z: number };
/** Magnitude 3.0 — above the 2.7 threshold. */
const SHAKE: Sample = { x: 3, y: 0, z: 0 };
/** Magnitude 1.0 — gravity at rest. */
const REST: Sample = { x: 0, y: 0, z: 1 };

// Well above SHAKE_DEBOUNCE_MS: `lastShakeAt` starts at 0, so a Date.now() under
// 2000 would be swallowed by the debounce before the first burst could count.
const T0 = 100_000;

let listener: ((sample: Sample) => void) | undefined;
const mockRemove = jest.fn();
let nowSpy: jest.SpyInstance<number, []>;
let now = T0;

/** Deliver one accelerometer sample at absolute time `at`. */
function sampleAt(at: number, sample: Sample = SHAKE): void {
  now = at;
  if (!listener) throw new Error('no accelerometer listener was registered');
  listener(sample);
}

beforeEach(() => {
  jest.clearAllMocks();
  listener = undefined;
  now = T0;
  mockIsFeatureEnabled.mockReturnValue(true);
  mockAddListener.mockImplementation((cb: (sample: Sample) => void) => {
    listener = cb;
    return { remove: mockRemove };
  });
  nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => {
  nowSpy.mockRestore();
});

describe('useBugReportShake · flag gate', () => {
  it('does not subscribe or set the sample interval when bug_reporting is off', () => {
    mockIsFeatureEnabled.mockReturnValue(false);

    renderHook(() => useBugReportShake());

    expect(mockIsFeatureEnabled).toHaveBeenCalledWith('bug_reporting');
    expect(mockAddListener).not.toHaveBeenCalled();
    expect(mockSetUpdateInterval).not.toHaveBeenCalled();
  });

  it('subscribes once at 10Hz when bug_reporting is on', () => {
    renderHook(() => useBugReportShake());

    expect(mockSetUpdateInterval).toHaveBeenCalledWith(100);
    expect(mockAddListener).toHaveBeenCalledTimes(1);
  });
});

describe('useBugReportShake · burst requirement', () => {
  it('does not open on two crossings', () => {
    renderHook(() => useBugReportShake());

    sampleAt(T0);
    sampleAt(T0 + 100);

    expect(mockShowFeedbackForm).not.toHaveBeenCalled();
  });

  it('opens exactly once on three crossings within one second', () => {
    renderHook(() => useBugReportShake());

    sampleAt(T0);
    sampleAt(T0 + 100);
    sampleAt(T0 + 200);

    expect(mockShowFeedbackForm).toHaveBeenCalledTimes(1);
  });

  it('ignores resting samples between crossings rather than counting them', () => {
    renderHook(() => useBugReportShake());

    sampleAt(T0);
    sampleAt(T0 + 50, REST);
    sampleAt(T0 + 100);
    sampleAt(T0 + 150, REST);
    expect(mockShowFeedbackForm).not.toHaveBeenCalled();

    sampleAt(T0 + 200);
    expect(mockShowFeedbackForm).toHaveBeenCalledTimes(1);
  });

  it('does not open when three crossings are spread past the one-second window', () => {
    renderHook(() => useBugReportShake());

    // Walking, not shaking: by the third crossing the first has aged out.
    sampleAt(T0);
    sampleAt(T0 + 600);
    sampleAt(T0 + 1200);

    expect(mockShowFeedbackForm).not.toHaveBeenCalled();
  });
});

describe('useBugReportShake · debounce', () => {
  it('drops crossings that arrive within two seconds of an open', () => {
    renderHook(() => useBugReportShake());
    sampleAt(T0);
    sampleAt(T0 + 100);
    sampleAt(T0 + 200);
    expect(mockShowFeedbackForm).toHaveBeenCalledTimes(1);

    // A sustained shake keeps producing crossings; none may open a second form.
    for (let at = T0 + 300; at < T0 + 200 + 2000; at += 100) {
      sampleAt(at);
    }

    expect(mockShowFeedbackForm).toHaveBeenCalledTimes(1);
  });

  it('does not let crossings dropped inside the debounce seed the next burst', () => {
    renderHook(() => useBugReportShake());
    sampleAt(T0);
    sampleAt(T0 + 100);
    sampleAt(T0 + 200);
    expect(mockShowFeedbackForm).toHaveBeenCalledTimes(1);

    // Two inside the debounce (dropped), then the first one after it ends. If the
    // dropped pair had been accumulated, all three sit inside one second and this
    // would open a second form.
    sampleAt(T0 + 1900);
    sampleAt(T0 + 2100);
    sampleAt(T0 + 2200);

    expect(mockShowFeedbackForm).toHaveBeenCalledTimes(1);
  });

  it('after the debounce, two fresh crossings do not open and the third does', () => {
    renderHook(() => useBugReportShake());
    sampleAt(T0);
    sampleAt(T0 + 100);
    sampleAt(T0 + 200);
    expect(mockShowFeedbackForm).toHaveBeenCalledTimes(1);

    const afterDebounce = T0 + 200 + 2000;
    sampleAt(afterDebounce);
    sampleAt(afterDebounce + 100);
    expect(mockShowFeedbackForm).toHaveBeenCalledTimes(1);

    sampleAt(afterDebounce + 200);
    expect(mockShowFeedbackForm).toHaveBeenCalledTimes(2);
  });
});

describe('useBugReportShake · lifecycle', () => {
  it('removes the subscription on unmount, exactly once', () => {
    const { unmount } = renderHook(() => useBugReportShake());
    expect(mockRemove).not.toHaveBeenCalled();

    unmount();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
