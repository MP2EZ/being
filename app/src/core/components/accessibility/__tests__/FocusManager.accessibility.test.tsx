/**
 * FocusManager — focus order, wrap, trap/restore, SkipLink (MAINT-750, audit TEST-43).
 *
 * THE DEFECT. focusPrevious from the initial index (-1) computed -1 - 1 = -2,
 * focusOrder[-2] is undefined, and the call silently did nothing.
 *
 * Focusable registers its own internal host ref, which a test cannot inject, so a probe
 * consumer registers mock refs through registerFocusable and records the calls. The probe
 * re-reads the context on every render: trap/release read state set by a previous call, so a
 * closure captured once would see stale values.
 *
 * FocusManager's Focusable wraps the PHQ-9 / GAD-7 answer group and the crisis banners on the
 * gated assessment hosts. This change is index arithmetic only — no change to Focusable's
 * render, the announcement strings, or SkipLink — and no consumer gains trapFocus or
 * accessibilityViewIsModal (DEBUG-575: a modal trap on an overlay prunes crisis-button-root).
 */

import React, { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { FocusProvider, SkipLink, useFocusManager } from '../FocusManager';

const announce = AccessibilityInfo.announceForAccessibility as jest.Mock;

type Ctx = ReturnType<typeof useFocusManager>;
let ctx: Ctx;
let focused: string[];

/** Registers one mock ref per id (lower priority first) and exposes the live context. */
function Probe({ ids }: { ids: string[] }) {
  const value = useFocusManager();
  ctx = value;
  useEffect(() => {
    ids.forEach((id, i) => value.registerFocusable(id, { focus: () => focused.push(id) }, i));
    // Register once; the probe is the only consumer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function mount(ids = ['a', 'b', 'c'], providerProps: Partial<React.ComponentProps<typeof FocusProvider>> = {}) {
  return render(
    <FocusProvider {...providerProps}>
      <Probe ids={ids} />
    </FocusProvider>,
  );
}

beforeEach(() => {
  focused = [];
  announce.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

it('focusPrevious from the initial state focuses the LAST element', () => {
  mount();
  act(() => ctx.focusPrevious());
  expect(focused).toEqual(['c']);
});

it('focusNext walks the order and wraps to the first', () => {
  mount();
  for (let i = 0; i < 4; i++) act(() => ctx.focusNext());
  expect(focused).toEqual(['a', 'b', 'c', 'a']);
});

it('focusPrevious walks backwards and wraps to the last', () => {
  mount();
  act(() => ctx.setFocus('b'));
  focused = [];
  for (let i = 0; i < 3; i++) act(() => ctx.focusPrevious());
  expect(focused).toEqual(['a', 'c', 'b']);
});

it('announces each focus change with the exact message', () => {
  mount();
  act(() => ctx.focusNext());
  expect(announce).toHaveBeenLastCalledWith('Focused a');
});

it('announces nothing when announceChanges is off', () => {
  mount(['a', 'b'], { announceChanges: false });
  act(() => ctx.focusNext());
  expect(focused).toEqual(['a']);
  expect(announce).not.toHaveBeenCalled();
});

it('trapFocus moves to the first element; releaseFocus restores the previous one', () => {
  mount();
  act(() => ctx.setFocus('b'));
  focused = [];

  act(() => ctx.trapFocus({}));
  expect(ctx.isTrapped).toBe(true);
  act(() => {
    jest.advanceTimersByTime(100);
  });
  expect(focused).toEqual(['a']);

  act(() => ctx.releaseFocus()); // re-read ctx: previousFocus is state
  expect(ctx.isTrapped).toBe(false);
  act(() => {
    jest.advanceTimersByTime(100);
  });
  expect(focused).toEqual(['a', 'b']);
  expect(announce).toHaveBeenLastCalledWith('Focused b');
});

it("SkipLink moves focus to its target", () => {
  const utils = render(
    <FocusProvider>
      <Probe ids={['a', 'target']} />
      <SkipLink targetId="target" text="Skip to answers" />
    </FocusProvider>,
  );
  fireEvent(utils.getByLabelText('Skip to answers'), 'touchEnd');
  expect(focused).toEqual(['target']);
});
