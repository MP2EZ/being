/**
 * Timer against its real code (MAINT-746, audit TEST-05).
 *
 * Every screen suite jest.mock()s Timer, so until now nothing exercised it. This imports the
 * real module. Modern fake timers fake Date.now too, so no separate clock spy (a fixed spy
 * would freeze elapsed time). The interval ticks every 250ms, so advances land on multiples
 * of 250 to make every boundary exact. Pause and resume are driven the way production does
 * it — the parent flips `isActive`; the Pause button only calls onPause.
 *
 * Characterization only: no Timer.tsx change. Its announcements are pinned as text here,
 * which is NOT a ruling that Timer may speak over a crisis surface — that question belongs
 * to the crisis agent if Timer is ever changed.
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render } from '@testing-library/react-native';
import Timer from '../Timer';

const announce = AccessibilityInfo.announceForAccessibility as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

const advance = (ms: number) => act(() => {
  jest.advanceTimersByTime(ms);
});

function mount(props: Partial<React.ComponentProps<typeof Timer>> = {}) {
  const onComplete = jest.fn();
  const onTick = jest.fn();
  const base = { duration: 5000, isActive: true, onComplete, onTick, showControls: false, showSkip: false };
  const utils = render(<Timer {...base} {...props} />);
  const rerender = (next: Partial<React.ComponentProps<typeof Timer>>) =>
    utils.rerender(<Timer {...base} {...props} {...next} />);
  return { ...utils, rerender, onComplete, onTick };
}

it('fires onComplete exactly once, at the duration', () => {
  const { onComplete } = mount();
  advance(4750);
  expect(onComplete).not.toHaveBeenCalled();
  advance(250);
  expect(onComplete).toHaveBeenCalledTimes(1);
  advance(5000);
  expect(onComplete).toHaveBeenCalledTimes(1);
});

it('pause then resume neither loses nor gains time', () => {
  const { onComplete, rerender } = mount();
  advance(2000);
  rerender({ isActive: false });
  advance(3000); // paused: does not count
  rerender({ isActive: true });
  advance(2750);
  expect(onComplete).not.toHaveBeenCalled(); // 4750ms active
  advance(250);
  expect(onComplete).toHaveBeenCalledTimes(1); // 5000ms active
});

it('reports onTick once per whole second, from the first tick, never at zero', () => {
  const { onTick, onComplete } = mount({ duration: 3000 });
  advance(250);
  expect(onTick).toHaveBeenCalledTimes(1);
  expect(Math.ceil(onTick.mock.calls[0][0] / 1000)).toBe(3);
  advance(2750);
  expect(onComplete).toHaveBeenCalledTimes(1);
  expect(onTick).toHaveBeenCalledTimes(3); // seconds 3, 2, 1
  expect(onTick.mock.calls.map(([ms]) => Math.ceil(ms / 1000))).toEqual([3, 2, 1]);
});

it('announces at 30, 10 and 5..1 seconds with the exact text, and at no other second', () => {
  mount({ duration: 31000 });
  advance(31000);
  expect(announce.mock.calls.map(([text]) => text)).toEqual([
    '30 seconds remaining',
    '10 seconds remaining',
    '5 seconds remaining',
    '4 seconds remaining',
    '3 seconds remaining',
    '2 seconds remaining',
    '1 second remaining',
  ]);
});

it('a duration change resets the display and the countdown', () => {
  const { getByLabelText, rerender, onComplete } = mount({ duration: 5000 });
  advance(3000);
  expect(getByLabelText('Time remaining: 0:02')).toBeTruthy();

  rerender({ duration: 10000 });
  expect(getByLabelText('Time remaining: 0:10')).toBeTruthy();

  advance(9000);
  expect(onComplete).not.toHaveBeenCalled(); // the old 5s countdown did not carry over
  advance(1500);
  expect(onComplete).toHaveBeenCalledTimes(1);
});
