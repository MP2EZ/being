/**
 * DEBUG-643 — the __DEV__ crisis-exclusion check fires on an overlap, stays silent on a
 * clearance, measures in WINDOW coordinates, waits for a settled frame, and is absent
 * from Release.
 *
 * Every overlap case here is a real positive: the builder's parent-relative
 * `nativeEvent.layout` sits at the origin, so a check that read it instead of measuring
 * would never reach the region and these cases would go red, not pass.
 */
import React from 'react';
import { View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import {
  crisisExclusionOnLayout,
  exclusionProbeFrame,
  resetCrisisExclusionWarnings,
  useCrisisExclusionAssertion,
  type CrisisExclusionPlacement,
} from '@/core/hooks/useCrisisExclusionAssertion';
import {
  CRISIS_BUTTON_EXCLUSION_RECT,
  intersectsCrisisButtonExclusion,
} from '@/features/crisis/constants/crisisButtonGeometry';
import { crisisExclusionLayoutEvent, MOCK_WINDOW } from '../../../../__tests__/helpers/crisisExclusionLayoutEvent';

jest.mock('@/features/crisis/constants/crisisButtonGeometry', () => {
  const actual = jest.requireActual('@/features/crisis/constants/crisisButtonGeometry');
  return { ...actual, intersectsCrisisButtonExclusion: jest.fn(actual.intersectsCrisisButtonExclusion) };
});

const W = MOCK_WINDOW.width; // 375
const H = MOCK_WINDOW.height; // 812
const RECT = CRISIS_BUTTON_EXCLUSION_RECT;
const IN_BAND_Y = H - RECT.top + 10; // inside the region's vertical span

const overlapping = { x: 24, y: IN_BAND_Y, width: W - 48, height: 60 }; // right edge 351
const flush = { x: 24, y: IN_BAND_Y, width: W - 24 - RECT.left, height: 60 }; // right edge W-72
const topOfScreenOverlapping = { x: 24, y: 0, width: W - 48, height: 48 };
const topOfScreenClear = { x: 24, y: 0, width: W - 24 - RECT.left, height: 48 };
const offWindow = { ...overlapping, x: overlapping.x + W }; // a stack card mid-push

let warn: jest.SpyInstance;
const violationWarnings = () =>
  warn.mock.calls.filter(([msg]) => String(msg).includes('intersects the crisis button'));
const unverifiedWarnings = () =>
  warn.mock.calls.filter(([msg]) => String(msg).includes('could not verify'));

const fire = (testID: string, placement: CrisisExclusionPlacement, event: ReturnType<typeof crisisExclusionLayoutEvent>) => {
  const handler = crisisExclusionOnLayout(testID, placement);
  expect(handler).toBeDefined();
  act(() => handler!(event as never));
  act(() => {
    jest.advanceTimersByTime(2000);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  resetCrisisExclusionWarnings();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  (intersectsCrisisButtonExclusion as jest.Mock).mockClear();
});
afterEach(() => {
  warn.mockRestore();
  jest.useRealTimers();
});

describe('what it reports', () => {
  it('warns on an overlapping frame, naming the testID, the frame and the window', () => {
    fire('probe-overlap', 'fixed', crisisExclusionLayoutEvent(overlapping));
    expect(violationWarnings()).toHaveLength(1);
    const msg = String(violationWarnings()[0][0]);
    expect(msg).toContain('probe-overlap');
    expect(msg).toContain(`x=${overlapping.x}`);
    expect(msg).toContain(`w=${overlapping.width}`);
    expect(msg).toContain(`${W}x${H}`);
  });

  it('is silent on a frame ending exactly where the region begins (half-open)', () => {
    fire('probe-flush', 'fixed', crisisExclusionLayoutEvent(flush));
    expect(warn).not.toHaveBeenCalled();
  });

  it('evaluates through the shared predicate, never a copy of it', () => {
    fire('probe-predicate', 'fixed', crisisExclusionLayoutEvent(overlapping));
    expect(intersectsCrisisButtonExclusion).toHaveBeenCalledWith(
      expect.objectContaining({ x: overlapping.x, width: overlapping.width }),
      expect.objectContaining({ width: W, height: H })
    );
  });

  it('warns once for a repeated testID and frame', () => {
    fire('probe-dedupe', 'fixed', crisisExclusionLayoutEvent(overlapping));
    fire('probe-dedupe', 'fixed', crisisExclusionLayoutEvent(overlapping));
    expect(violationWarnings()).toHaveLength(1);
  });
});

describe("placement 'scrolls' checks the column at every y, like the jest sweeps", () => {
  it('fires for a control at the top of the screen whose x-range reaches the column', () => {
    fire('probe-scrolls', 'scrolls', crisisExclusionLayoutEvent(topOfScreenOverlapping));
    expect(violationWarnings()).toHaveLength(1);
  });

  it('is silent for the same control cleared by the rect width', () => {
    fire('probe-scrolls-clear', 'scrolls', crisisExclusionLayoutEvent(topOfScreenClear));
    expect(warn).not.toHaveBeenCalled();
  });

  it("control: 'fixed' does NOT fire for that top-of-screen frame, so the projection is doing the work", () => {
    fire('probe-fixed-top', 'fixed', crisisExclusionLayoutEvent(topOfScreenOverlapping));
    expect(violationWarnings()).toHaveLength(0);
  });

  it('projects onto the band without moving the horizontal extent', () => {
    const p = exclusionProbeFrame(topOfScreenOverlapping, MOCK_WINDOW, 'scrolls');
    expect(p).toEqual({ x: 24, y: H - RECT.top, width: W - 48, height: RECT.top - RECT.bottom });
    expect(exclusionProbeFrame(topOfScreenOverlapping, MOCK_WINDOW, 'fixed')).toEqual(topOfScreenOverlapping);
  });
});

describe('it evaluates only a settled, on-window frame', () => {
  it('ignores a frame still off-window (a card mid-push) and warns once it lands', () => {
    const event = crisisExclusionLayoutEvent([offWindow, offWindow, offWindow, overlapping, overlapping]);
    const handler = crisisExclusionOnLayout('probe-settle', 'fixed')!;
    act(() => handler(event as never));
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(violationWarnings()).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(violationWarnings()).toHaveLength(1);
  });

  it('never evaluates a frame that keeps moving, and says so instead of passing', () => {
    const moving = Array.from({ length: 40 }, (_, i) => ({ ...overlapping, x: overlapping.x + i }));
    fire('probe-moving', 'fixed', crisisExclusionLayoutEvent(moving));
    expect(violationWarnings()).toHaveLength(0);
    expect(unverifiedWarnings()).toHaveLength(1);
    expect(String(unverifiedWarnings()[0][0])).toContain('probe-moving');
  });

  it('reports a frame that never comes on-window as unverified, not as clear', () => {
    fire('probe-never-lands', 'fixed', crisisExclusionLayoutEvent(offWindow));
    expect(violationWarnings()).toHaveLength(0);
    expect(unverifiedWarnings()).toHaveLength(1);
  });

  it('stops polling once the window closes', () => {
    const event = crisisExclusionLayoutEvent(flush);
    fire('probe-bounded', 'fixed', event);
    const calls = event.measureInWindow.mock.calls.length;
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(event.measureInWindow.mock.calls.length).toBe(calls);
    expect(calls).toBeLessThanOrEqual(20);
  });
});

describe('it never throws', () => {
  it('tolerates a missing currentTarget', () => {
    const handler = crisisExclusionOnLayout('probe-no-target', 'fixed')!;
    expect(() => act(() => handler({ nativeEvent: { layout: overlapping } } as never))).not.toThrow();
  });

  it('tolerates a measureInWindow that throws', () => {
    const handler = crisisExclusionOnLayout('probe-throws', 'fixed')!;
    const event = {
      nativeEvent: { layout: overlapping },
      currentTarget: {
        measureInWindow: () => {
          throw new Error('detached');
        },
      },
    };
    expect(() => act(() => handler(event as never))).not.toThrow();
  });
});

describe('the hook form', () => {
  const Probe = ({ testID }: { testID: string }) => {
    const onLayout = useCrisisExclusionAssertion(testID, 'fixed');
    return <View testID={testID} onLayout={onLayout} />;
  };

  it('wires the same check through onLayout', () => {
    render(<Probe testID="probe-hook" />);
    fireEvent(screen.getByTestId('probe-hook'), 'layout', crisisExclusionLayoutEvent(overlapping));
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(violationWarnings()).toHaveLength(1);
  });

  it('stops measuring when the host unmounts', () => {
    const { unmount } = render(<Probe testID="probe-unmount" />);
    const event = crisisExclusionLayoutEvent([offWindow]);
    fireEvent(screen.getByTestId('probe-unmount'), 'layout', event);
    const before = event.measureInWindow.mock.calls.length;
    unmount();
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(event.measureInWindow.mock.calls.length).toBe(before);
    expect(warn).not.toHaveBeenCalled();
  });

  it('drops a measurement that answers after the host unmounted', () => {
    // On device measureInWindow answers asynchronously, so an unmount can land between the
    // request and the answer. The first answer is immediate, later ones are deferred.
    let calls = 0;
    const measureInWindow = jest.fn((cb: (x: number, y: number, w: number, h: number) => void) => {
      const answer = () => cb(overlapping.x, overlapping.y, overlapping.width, overlapping.height);
      calls += 1;
      if (calls === 1) answer();
      else setTimeout(answer, 50);
    });
    const { unmount } = render(<Probe testID="probe-late-answer" />);
    fireEvent(screen.getByTestId('probe-late-answer'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 1, height: 1 } },
      currentTarget: { measureInWindow },
    });
    act(() => {
      jest.advanceTimersByTime(120); // second request sent at 100, its answer due at 150
    });
    unmount();
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('Release: nothing is attached', () => {
  const g = global as unknown as { __DEV__: boolean };

  it('returns no handler and measures nothing when __DEV__ is false', () => {
    const was = g.__DEV__;
    g.__DEV__ = false;
    try {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const release = require('@/core/hooks/useCrisisExclusionAssertion');
        expect(release.crisisExclusionOnLayout('probe-release', 'fixed')).toBeUndefined();
        expect(release.useCrisisExclusionAssertion('probe-release', 'fixed')).toBeUndefined();
      });
    } finally {
      g.__DEV__ = was;
    }
    // Control: the same module under __DEV__ does attach a handler.
    expect(crisisExclusionOnLayout('probe-release', 'fixed')).toBeDefined();
  });
});
