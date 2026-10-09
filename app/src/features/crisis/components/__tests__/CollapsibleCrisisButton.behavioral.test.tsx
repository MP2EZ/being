/**
 * Behavioral test for CollapsibleCrisisButton — the always-visible <3-tap
 * entry to 988 / Crisis Text Line. Per CLAUDE.md: <200ms response budget,
 * zero false negatives.
 *
 * The existing `CollapsibleCrisisButton.accessibility.test.ts` covers the
 * 44pt touch-target size guarantee. This file covers the safety contract
 * the audit (TEST-04) flagged as untested: pressing the button actually
 * invokes the onNavigate callback. Without this, a regression that wires
 * the press handler to a no-op would ship undetected — the navigation to
 * CrisisResourcesScreen is the entire point of the button.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CollapsibleCrisisButton } from '../CollapsibleCrisisButton';
import { __resetCrisisTapTraceForTests } from '@/features/crisis/services/crisisTapTrace';

describe('CollapsibleCrisisButton — onNavigate behavioral contract', () => {
  // Every case below presses the REAL button, so each opens a crisisTapTrace mark and
  // arms its 5s watchdog. Nothing here closes one — these cases pin dispatch, not a
  // terminal outcome — so without this the timer outlives the suite and fires
  // `deadline_exceeded` at HIGH severity into a torn-down runtime (DEBUG-596 RC1).
  //
  // HYGIENE, NOT THE FIX. The tracer's terminal contract is pinned by
  // services/__tests__/crisisTapTrace.contract.test.ts; this hook only stops one
  // suite's state leaking into the next. Never reach for it as a way to silence the
  // watchdog — a quiet watchdog with no terminal assertion anywhere is the state
  // DEBUG-596 exists to end.
  afterEach(() => {
    __resetCrisisTapTraceForTests();
  });

  test('pressing the collapsed button invokes onNavigate', () => {
    const onNavigate = jest.fn();
    const { getByTestId } = render(
      <CollapsibleCrisisButton
        onNavigate={onNavigate}
        mode="standard"
        testID="crisis-button"
      />,
    );

    fireEvent.press(getByTestId('crisis-button'));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  test('press dispatch completes within the <200ms crisis-response budget', () => {
    const onNavigate = jest.fn();
    const { getByTestId } = render(
      <CollapsibleCrisisButton
        onNavigate={onNavigate}
        mode="prominent"
        testID="crisis-button-prominent"
      />,
    );

    const start = performance.now();
    fireEvent.press(getByTestId('crisis-button-prominent'));
    const elapsed = performance.now() - start;

    expect(onNavigate).toHaveBeenCalledTimes(1);
    // Synthetic event dispatch is far below 200ms; assertion guards against
    // a future regression that wires a slow side-effect into the press path
    // (e.g. sync encryption or storage). Production budget is <200ms total.
    expect(elapsed).toBeLessThan(200);
  });

  test('immersive mode still fires onNavigate on direct tap (MAINT-127 contract)', () => {
    const onNavigate = jest.fn();
    const { getByTestId } = render(
      <CollapsibleCrisisButton
        onNavigate={onNavigate}
        mode="immersive"
        testID="crisis-immersive"
      />,
    );

    // immersive mode starts faded but the 44x44 hit area must still respond
    // to direct tap — that's the documented MAINT-127 accessibility
    // requirement. A regression that gates onPress on opacity would silently
    // break the safety contract.
    fireEvent.press(getByTestId('crisis-immersive'));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
