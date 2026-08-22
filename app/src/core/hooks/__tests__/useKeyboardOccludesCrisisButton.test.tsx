/**
 * useKeyboardOccludesCrisisButton — listener count must be O(1) in mounts (DEBUG-506).
 *
 * WHY THIS SUITE EXISTS NOW. Under DEBUG-450 this hook had exactly one consumer, mounted
 * once at app root, so a per-mount subscription cost nothing. DEBUG-506 moves the accessory
 * to one instance per TextInput, and `DailyLoopStepScreen` can render three concurrently.
 * A per-mount subscription would register 2N `Keyboard` listeners, and
 * `keyboardWillChangeFrame` fires repeatedly through the keyboard's show animation — so the
 * cost is 2N callbacks per frame of an animation that runs while a distressed user is
 * looking at a crisis affordance. Hoisting to a single module-level source is a
 * prerequisite of the per-input mount, not a follow-up optimisation.
 *
 * The predicate itself is NOT re-tested here. DEBUG-506 AC2 records that
 * `keyboardOccludesCrisisButton` was verified correct and is not the defect; this suite
 * pins the subscription shape only.
 */

import React from 'react';
import { Keyboard, Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { useKeyboardOccludesCrisisButton } from '../useKeyboardOccludesCrisisButton';

const Probe: React.FC = () => {
  const occluded = useKeyboardOccludesCrisisButton();
  return <Text>{occluded ? 'occluded' : 'clear'}</Text>;
};

describe('useKeyboardOccludesCrisisButton — subscription shape (DEBUG-506)', () => {
  let addListener: jest.SpyInstance;
  const removes: jest.Mock[] = [];

  beforeEach(() => {
    removes.length = 0;
    addListener = jest.spyOn(Keyboard, 'addListener').mockImplementation(() => {
      const remove = jest.fn();
      removes.push(remove);
      return { remove } as never;
    });
  });

  afterEach(() => {
    addListener.mockRestore();
  });

  it('registers the SAME number of listeners for three mounts as for one', () => {
    const one = render(<Probe />);
    const afterOne = addListener.mock.calls.length;
    one.unmount();

    addListener.mockClear();
    removes.length = 0;

    const three = render(
      <>
        <Probe />
        <Probe />
        <Probe />
      </>,
    );
    const afterThree = addListener.mock.calls.length;
    three.unmount();

    // The DailyLoopStepScreen worst case is three concurrent inputs. Per-mount
    // subscription makes this 3x, and keyboardWillChangeFrame fires on every frame
    // of the show animation.
    expect(afterThree).toBe(afterOne);
  });

  it('releases the underlying listeners when the last consumer unmounts', () => {
    const view = render(
      <>
        <Probe />
        <Probe />
      </>,
    );
    expect(removes.every((r) => r.mock.calls.length === 0)).toBe(true);

    view.unmount();

    // A module-level source that never tears down would keep a listener alive for the
    // life of the process — the leak a hoist is most likely to introduce.
    expect(removes.length).toBeGreaterThan(0);
    expect(removes.every((r) => r.mock.calls.length > 0)).toBe(true);
  });

  it('still exposes a boolean to every consumer', () => {
    const { getAllByText } = render(
      <>
        <Probe />
        <Probe />
      </>,
    );
    expect(getAllByText('clear')).toHaveLength(2);
  });
});
