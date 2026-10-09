/**
 * DEBUG-643 — a layout event whose `currentTarget` answers `measureInWindow` with window
 * frames, for driving the __DEV__ crisis-exclusion check without a layout engine.
 *
 * `nativeEvent.layout` is deliberately a DIFFERENT, parent-relative frame at the origin: a
 * check that read it instead of measuring would see a control at (0,0), which never
 * reaches the exclusion region, and every overlap case below would pass vacuously.
 *
 * `frames` are returned in order, one per measurement, and the last one repeats — so a
 * single frame reads as a control at rest, and a sequence reads as one settling.
 */
export type WindowFrame = { x: number; y: number; width: number; height: number };

export function crisisExclusionLayoutEvent(frames: WindowFrame | WindowFrame[]) {
  const queue = Array.isArray(frames) ? frames : [frames];
  let i = 0;
  const measureInWindow = jest.fn(
    (cb: (x: number, y: number, width: number, height: number) => void) => {
      const f = queue[Math.min(i, queue.length - 1)];
      i += 1;
      cb(f.x, f.y, f.width, f.height);
    }
  );
  return {
    nativeEvent: { layout: { x: 0, y: 0, width: queue[0].width, height: queue[0].height } },
    currentTarget: { measureInWindow },
    measureInWindow,
  };
}

/** The mocked window in __tests__/setup/jest.setup.js: `Dimensions.get` answers 375x812. */
export const MOCK_WINDOW = { width: 375, height: 812 };

/**
 * Fires a layout event on `element` whose measured window frame reaches the crisis FAB
 * column, and resolves once the host's __DEV__ check has warned naming `testID`. An
 * element with no check wired has no layout handler, so this times out rather than passing.
 * The measurement then reports zero size, which ends the check's polling, so no timer
 * outlives the test.
 */
export async function expectExclusionCheckWired(element: unknown, testID: string): Promise<void> {
  // Required lazily so this module stays importable from suites that mock react-native.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { Dimensions } = require('react-native');
  const { fireEvent, waitFor } = require('@testing-library/react-native');
  const { resetCrisisExclusionWarnings } = require('@/core/hooks/useCrisisExclusionAssertion');
  /* eslint-enable @typescript-eslint/no-require-imports */
  resetCrisisExclusionWarnings();
  const { width, height } = Dimensions.get('window');
  const overlap = { x: 24, y: height - 150, width: width - 48, height: 60 };
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    fireEvent(element, 'layout', crisisExclusionLayoutEvent([overlap, overlap, { x: 0, y: 0, width: 0, height: 0 }]));
    await waitFor(() =>
      expect(warn.mock.calls.some(([m]) => String(m).includes(`${testID} intersects`))).toBe(true)
    );
  } finally {
    warn.mockRestore();
  }
}
