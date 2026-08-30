/**
 * useKeyboardFrameHeight — subscription shape and snapshot (DEBUG-516).
 *
 * WHY THIS SUITE EXISTS. This hook is the single source for the occluding edge that
 * VoiceReflectionScreen's pinned footer is inset against, and `useOverlayBottomInset` now
 * derives from it too. Two properties have to hold: every consumer reads ONE snapshot (so
 * two surfaces cannot disagree about whether the keyboard is up), and the real `Keyboard`
 * subscriptions are O(1) in mounts — `keyboardWillChangeFrame` fires on every frame of the
 * show animation, so per-mount subscription would run 2N callbacks per frame.
 */

import React from 'react';
import { Keyboard, Text } from 'react-native';
import { act, render } from '@testing-library/react-native';

import { useKeyboardFrameHeight } from '../useKeyboardFrameHeight';
import { useOverlayBottomInset } from '../useOverlayBottomInset';
import { CRISIS_BUTTON_RESERVED_BAND } from '@/features/crisis/constants/crisisButtonGeometry';

const Height: React.FC = () => <Text>{`h:${useKeyboardFrameHeight()}`}</Text>;
const Inset: React.FC = () => <Text>{`i:${useOverlayBottomInset()}`}</Text>;

/** The full keyboard window measured on the iPhone SE 3 gate device. */
const SE3_KEYBOARD_HEIGHT = 260;

describe('useKeyboardFrameHeight', () => {
  let addListener: jest.SpyInstance;
  let handlers: Array<[string, (e: unknown) => void]>;

  beforeEach(() => {
    handlers = [];
    addListener = jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation(((event: string, handler: (e: unknown) => void) => {
        handlers.push([event, handler]);
        return { remove: jest.fn() };
      }) as never);
  });

  afterEach(() => addListener.mockRestore());

  const emit = (height: number): void => {
    act(() => {
    for (const [event, handler] of handlers) {
      if (height > 0 && (event === 'keyboardWillChangeFrame' || event === 'keyboardDidShow')) {
        handler({ endCoordinates: { height } });
      }
      if (height === 0 && (event === 'keyboardWillHide' || event === 'keyboardDidHide')) {
        handler({});
      }
    }
    });
  };

  it('registers the SAME number of listeners for three mounts as for one', () => {
    const one = render(<Height />);
    const afterOne = addListener.mock.calls.length;
    one.unmount();

    addListener.mockClear();
    const three = render(
      <>
        <Height />
        <Height />
        <Height />
      </>,
    );
    expect(addListener.mock.calls.length).toBe(afterOne);
    three.unmount();
  });

  it('publishes the reported frame height to every consumer at once', () => {
    const utils = render(
      <>
        <Height />
        <Inset />
      </>,
    );

    emit(SE3_KEYBOARD_HEIGHT);

    expect(utils.getByText(`h:${SE3_KEYBOARD_HEIGHT}`)).toBeTruthy();
    // The extraction must not have changed useOverlayBottomInset's contract: it still
    // takes the MAX with the crisis band, which is what distinguishes an overlay inset
    // from the raw keyboard inset a full-screen pinned footer wants.
    expect(
      utils.getByText(`i:${Math.max(CRISIS_BUTTON_RESERVED_BAND, SE3_KEYBOARD_HEIGHT)}`),
    ).toBeTruthy();
    utils.unmount();
  });

  it('reports zero once the keyboard hides', () => {
    const utils = render(<Height />);
    emit(SE3_KEYBOARD_HEIGHT);
    emit(0);

    expect(utils.getByText('h:0')).toBeTruthy();
    // And the overlay inset falls back to its band rather than to nothing — that floor is
    // correct for a centred card and is exactly why VoiceReflectionScreen does not use it.
    utils.unmount();
  });

  it('does not inherit a stale height across a full teardown', () => {
    const first = render(<Height />);
    emit(SE3_KEYBOARD_HEIGHT);
    expect(first.getByText(`h:${SE3_KEYBOARD_HEIGHT}`)).toBeTruthy();
    first.unmount();

    // The last consumer leaving detaches the listeners, so a keyboard dismissed while
    // nothing was listening would otherwise be remembered as still up.
    const second = render(<Height />);
    expect(second.getByText('h:0')).toBeTruthy();
    second.unmount();
  });
});
