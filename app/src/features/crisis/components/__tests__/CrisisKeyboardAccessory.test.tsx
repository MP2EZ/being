/**
 * CrisisKeyboardAccessory — the second control carrying the crisis contract (DEBUG-450).
 *
 * AC5 RULING (founder, 2026-08-16). The `<200ms` budget on this control means what it
 * means on the root button: **tap → crisis navigation dispatched**, measured by the same
 * synthetic-dispatch proxy shape. It does NOT mean tap-to-visible wall clock.
 * `InputAccessoryView` appears on the OS keyboard's own animation (~250ms typical), which
 * no app code controls, so a tap-to-visible budget would be unmeetable on every device
 * regardless of implementation quality. The appearance path is recorded as OS-paced and
 * is deliberately not contracted — see the suite's last block.
 *
 * What is asserted here is therefore ORDER and REUSE, not milliseconds: that the tap opens
 * the trace before it navigates (you cannot measure tap→render starting after the
 * navigate), and that it runs the SHARED navigation path rather than a re-typed copy that
 * could silently lack DEBUG-341's retry-then-fallback.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { CrisisKeyboardAccessory } from '../CrisisKeyboardAccessory';
import {
  CRISIS_KEYBOARD_ACCESSORY_CONTAINER_TEST_ID,
  CRISIS_KEYBOARD_ACCESSORY_TEST_ID,
} from '@/features/crisis/constants/crisisInputAccessory';

const calls: string[] = [];

jest.mock('@/features/crisis/services/crisisTapTrace', () => ({
  beginCrisisTap: jest.fn((source: string) => {
    calls.push(`beginCrisisTap:${source}`);
  }),
}));

jest.mock('@/features/crisis/utils/navigateToCrisisResources', () => ({
  navigateToCrisisResources: jest.fn((source: string, component: string) => {
    calls.push(`navigate:${source}:${component}`);
  }),
}));

jest.mock('@/core/hooks/useKeyboardOccludesCrisisButton', () => ({
  useKeyboardOccludesCrisisButton: jest.fn(() => true),
}));

const { beginCrisisTap } = require('@/features/crisis/services/crisisTapTrace');
const { navigateToCrisisResources } = require('@/features/crisis/utils/navigateToCrisisResources');
const { useKeyboardOccludesCrisisButton } = require('@/core/hooks/useKeyboardOccludesCrisisButton');

beforeEach(() => {
  calls.length = 0;
  jest.clearAllMocks();
  useKeyboardOccludesCrisisButton.mockReturnValue(true);
});

describe('CrisisKeyboardAccessory (DEBUG-450)', () => {
  it('opens the trace BEFORE navigating — order, not just occurrence', () => {
    const { getByTestId } = render(<CrisisKeyboardAccessory />);
    fireEvent.press(getByTestId(CRISIS_KEYBOARD_ACCESSORY_TEST_ID));

    // Occurrence alone would pass a handler that navigates first and traces after,
    // which cannot measure tap→render at all.
    expect(calls).toEqual([
      'beginCrisisTap:keyboard_accessory',
      'navigate:keyboard_accessory:CrisisKeyboardAccessory',
    ]);
  });

  it('reuses the SHARED navigation path, not a re-typed copy', () => {
    const { getByTestId } = render(<CrisisKeyboardAccessory />);
    fireEvent.press(getByTestId(CRISIS_KEYBOARD_ACCESSORY_TEST_ID));

    // The shared module is what carries DEBUG-341's retry-then-fallback, its
    // single-flight guard and the 400ms deadline. A control that navigated directly
    // would look correct here and dead-end on a cold start.
    expect(navigateToCrisisResources).toHaveBeenCalledTimes(1);
    expect(navigateToCrisisResources).toHaveBeenCalledWith(
      'keyboard_accessory',
      'CrisisKeyboardAccessory',
    );
  });

  it('reports its own tap source, distinguishable from the root button', () => {
    const { getByTestId } = render(<CrisisKeyboardAccessory />);
    fireEvent.press(getByTestId(CRISIS_KEYBOARD_ACCESSORY_TEST_ID));
    expect(beginCrisisTap).toHaveBeenCalledWith('keyboard_accessory');
  });

  it('announces itself identically to the root button', () => {
    // The same affordance in a different place must not read as a different control
    // to a screen-reader user.
    const { getByTestId } = render(<CrisisKeyboardAccessory />);
    const btn = getByTestId(CRISIS_KEYBOARD_ACCESSORY_TEST_ID);
    expect(btn.props.accessibilityLabel).toBe('I need support');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  describe('collapsed state', () => {
    it('stays MOUNTED when not occluding, rather than rendering null', () => {
      // InputAccessoryView unmounts entirely at zero children, and re-attaching a
      // native accessory view to an already-focused field is the real RN risk here.
      // Collapsing in place avoids it — so the control must still be in the tree.
      //
      // includeHiddenElements is required precisely BECAUSE the collapsed bar is
      // a11y-hidden; the default query would not see it. That is the next assertion.
      useKeyboardOccludesCrisisButton.mockReturnValue(false);
      const { getByTestId } = render(<CrisisKeyboardAccessory />);
      expect(
        getByTestId(CRISIS_KEYBOARD_ACCESSORY_TEST_ID, { includeHiddenElements: true }),
      ).toBeTruthy();
    });

    it('is hidden from assistive tech while collapsed', () => {
      useKeyboardOccludesCrisisButton.mockReturnValue(false);
      const { getByTestId, queryByTestId } = render(<CrisisKeyboardAccessory />);

      // The library's own accessibility model is the assertion: a default query
      // excludes a11y-hidden elements, so not finding it IS the proof it is hidden.
      // Stronger than reading the props back, which would pass even if RN ignored them.
      expect(queryByTestId(CRISIS_KEYBOARD_ACCESSORY_TEST_ID)).toBeNull();

      const bar = getByTestId(CRISIS_KEYBOARD_ACCESSORY_CONTAINER_TEST_ID, {
        includeHiddenElements: true,
      });
      expect(bar.props.accessibilityElementsHidden).toBe(true);
      expect(bar.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(bar.props.pointerEvents).toBe('none');
    });

    it('is exposed and interactive while occluding', () => {
      const { getByTestId } = render(<CrisisKeyboardAccessory />);
      const bar = getByTestId(CRISIS_KEYBOARD_ACCESSORY_CONTAINER_TEST_ID);
      expect(bar.props.accessibilityElementsHidden).toBe(false);
      expect(bar.props.pointerEvents).toBe('auto');
    });
  });

  /**
   * AC5's boundary, stated as a test so it is not silently re-litigated.
   *
   * There is no assertion here about how fast the bar becomes VISIBLE, and that absence
   * is deliberate: the appearance is driven by the OS keyboard animation. What the app
   * controls — and what is therefore contracted — is the tap path above.
   */
  it('contracts the TAP path only; appearance latency is OS-paced and uncontracted', () => {
    const { getByTestId } = render(<CrisisKeyboardAccessory />);
    const t0 = performance.now();
    fireEvent.press(getByTestId(CRISIS_KEYBOARD_ACCESSORY_TEST_ID));
    const dispatchMs = performance.now() - t0;

    // Same synthetic-dispatch proxy shape as CollapsibleCrisisButton.behavioral —
    // coarse by construction (it measures dispatch, not tap→render), and honest about it.
    expect(dispatchMs).toBeLessThan(200);
    expect(navigateToCrisisResources).toHaveBeenCalled();
  });
});
