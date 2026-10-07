/**
 * useInstructionsFade against its real code (MAINT-746, audit TEST-25).
 *
 * The design (and the AC): once a practice starts, instructions stay for `fadeDelay`, then
 * fade over `fadeDuration` to reduce clutter; pausing brings them straight back. So "guidance
 * vanishes mid-session" is intended here — this pins that it happens on schedule, not that it
 * doesn't.
 *
 * "Latched" means the effect re-running while `isActive` STAYS true must not schedule a
 * second fade. An active → inactive → active cycle is a pause and a resume, and is
 * SUPPOSED to fade again: pausing resets the latch. Both are pinned.
 *
 * Observation channel: the animations use the native driver, which under jest never writes
 * the JS-side value back (opacity reads 1 throughout), though completion callbacks do fire.
 * So the tests read what the hook ASKS for — the `toValue` of each Animated.timing it starts —
 * plus `showInstructions`, which the fade-out's completion callback sets.
 */

import { renderHook, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { useInstructionsFade } from '@/features/learn/practices/shared/useInstructionsFade';

const FADE_DELAY = 2000;
const FADE_DURATION = 1000;
const FRAME = 50; // margin for the animation's final frame

let timing: jest.SpyInstance;
/** The toValue of every animation started so far, in order. */
const targets = () => timing.mock.calls.map(([, config]) => (config as { toValue: number }).toValue);
const advance = (ms: number) => act(() => {
  jest.advanceTimersByTime(ms);
});

beforeEach(() => {
  jest.useFakeTimers();
  timing = jest.spyOn(Animated, 'timing');
});

afterEach(() => {
  timing.mockRestore();
  jest.useRealTimers();
});

function mount(isActive: boolean) {
  return renderHook(({ active }) => useInstructionsFade(active), { initialProps: { active: isActive } });
}

it('shows instructions until fadeDelay, then fades them out and hides them', () => {
  const { result } = mount(true);
  advance(FADE_DELAY - 100);
  expect(result.current.showInstructions).toBe(true);
  expect(targets()).toEqual([]);

  advance(100 + FADE_DURATION + FRAME);
  expect(targets()).toEqual([0]);
  expect(timing.mock.calls[0][1]).toMatchObject({ duration: FADE_DURATION });
  expect(result.current.showInstructions).toBe(false);
});

it('deactivating before the delay cancels the pending fade', () => {
  const { result, rerender } = mount(true);
  advance(FADE_DELAY - 500);
  rerender({ active: false });
  advance(FADE_DELAY + FADE_DURATION + FRAME);
  expect(targets()).toEqual([1]); // only the fade back in — the fade-out never started
  expect(result.current.showInstructions).toBe(true);
});

it('pausing mid-fade brings the instructions back to full opacity', () => {
  const { result, rerender } = mount(true);
  advance(FADE_DELAY + FADE_DURATION / 2);
  expect(targets()).toEqual([0]);

  rerender({ active: false });
  advance(300 + FRAME);
  expect(targets()).toEqual([0, 1]);
  expect(timing.mock.calls[1][1]).toMatchObject({ duration: 300 });
  expect(result.current.showInstructions).toBe(true);
});

it('a re-render while still active schedules no second fade (the latch)', () => {
  const { result, rerender } = mount(true);
  advance(FADE_DELAY + FADE_DURATION + FRAME);
  expect(result.current.showInstructions).toBe(false);
  const timersAfterFade = jest.getTimerCount();

  rerender({ active: true });
  advance(FADE_DELAY + FADE_DURATION + FRAME);
  expect(jest.getTimerCount()).toBe(timersAfterFade);
  expect(targets()).toEqual([0]); // no second fade
  expect(result.current.showInstructions).toBe(false);
});

it('pause then resume fades again, because pausing resets the latch', () => {
  const { result, rerender } = mount(true);
  advance(FADE_DELAY + FADE_DURATION + FRAME);
  rerender({ active: false });
  advance(300 + FRAME);
  expect(result.current.showInstructions).toBe(true);

  rerender({ active: true });
  advance(FADE_DELAY + FADE_DURATION + FRAME);
  expect(result.current.showInstructions).toBe(false);
  expect(targets()).toEqual([0, 1, 0]);
});

it('unmounting before the delay leaves no pending timer', () => {
  const { unmount } = mount(true);
  advance(500);
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});
