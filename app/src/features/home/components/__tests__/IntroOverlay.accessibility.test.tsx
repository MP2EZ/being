/**
 * IntroOverlay (MAINT-750, audit TEST-13). Test-after: no source change.
 *
 * What these pin is that the overlay can never take a touch or a screen-reader focus —
 * it sits over CleanHomeScreen at zIndex 10. They do NOT by themselves prove the crisis
 * button is reachable: RootCrisisButton is a root sibling outside the navigator, which
 * __tests__/safety/rootOverlayFocusTrap.test.tsx pins.
 *
 * The global reanimated shim never calls withTiming's completion callback (INFRA-373 says
 * why; it stays that way), so this file spies on withTiming to capture the callback and
 * drives `finished` itself.
 *
 * Out of scope, noted: CleanHomeScreen passes an un-memoised onComplete, and the effect
 * depends on it, so a parent re-render during the intro re-announces and restarts the
 * timer. Not pinned here, because fixing it is a source change this item does not carry.
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { IntroOverlay } from '../IntroOverlay';

jest.mock('@/core/components/shared/BrainIcon', () => {
  const React_ = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: () => React_.createElement(View, { testID: 'brain-icon' }) };
});

const reanimated = jest.requireMock('react-native-reanimated') as { withTiming: (...a: unknown[]) => unknown };
const announce = AccessibilityInfo.announceForAccessibility as jest.Mock;

let timing: jest.SpyInstance;
/** The completion callback the fade-out registered, if it has been started. */
const fadeOutCallback = () =>
  timing.mock.calls.map((c) => c[2]).find((cb): cb is (finished: boolean) => void => typeof cb === 'function');

beforeEach(() => {
  jest.useFakeTimers();
  announce.mockClear();
  timing = jest.spyOn(reanimated, 'withTiming');
});

afterEach(() => {
  timing.mockRestore();
  jest.useRealTimers();
});

const advance = (ms: number) => act(() => {
  jest.advanceTimersByTime(ms);
});

function mount() {
  const onComplete = jest.fn();
  const utils = render(<IntroOverlay greeting="Good evening" onComplete={onComplete} />);
  const overlay = utils.UNSAFE_root.findAll((n) => n.props.pointerEvents === 'none')[0];
  return { ...utils, onComplete, overlay };
}

it('never takes a touch or a screen-reader focus — at mount and after the animation starts', () => {
  const { overlay } = mount();
  const assertInert = () => {
    expect(overlay.props.pointerEvents).toBe('none');
    expect(overlay.props.accessibilityElementsHidden).toBe(true);
    expect(overlay.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(overlay.props.accessibilityViewIsModal).toBeFalsy();
  };
  assertInert();
  advance(2000);
  assertInert();
});

it('announces the greeting exactly once', () => {
  mount();
  advance(5000);
  expect(announce).toHaveBeenCalledTimes(1);
  expect(announce).toHaveBeenCalledWith('Good evening. Being app ready.');
});

it('starts nothing before 2s, and completes only when the fade-out finishes', () => {
  const { onComplete } = mount();
  advance(1999);
  expect(timing).not.toHaveBeenCalled();
  advance(1);
  const done = fadeOutCallback();
  expect(done).toBeDefined();
  expect(onComplete).not.toHaveBeenCalled();

  act(() => done!(false)); // interrupted
  expect(onComplete).not.toHaveBeenCalled();
  act(() => done!(true));
  expect(onComplete).toHaveBeenCalledTimes(1);
});

it('unmounting before 2s cancels the sequence', () => {
  const { onComplete, unmount } = mount();
  advance(1500);
  unmount();
  advance(5000);
  expect(timing).not.toHaveBeenCalled();
  expect(onComplete).not.toHaveBeenCalled();
});
