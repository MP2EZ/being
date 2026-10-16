/**
 * DEBUG-694 — only the SkipLink sets the e2e skip fact; the breath running out never does.
 *
 * WHY. SkipLink and the Timer's onComplete both end the breath, and both flip
 * `breathCompleted` in place, so nothing on screen used to say WHICH one did. The Maestro
 * flows proved the skip with `notVisible daily-loop-skip-breath` / `daily-loop-input-response`,
 * and the 30s timer satisfies both on its own: DEBUG-652 measured the no-skip mutant GREEN
 * 3/3. `daily-loop-breath-skipped` is the fact only the skip path sets.
 *
 * WHY THIS PIN IS THE CI HALF (crisis ruling). The Maestro mutant runs are local-only. A
 * future change that re-merges the two handlers — or derives the fact from
 * `breathCompleted` — would restore the false green with every flow still green; this
 * file is what reds.
 *
 * WHY ON THE ROOT. At AX5 every `breathCompleted`-gated element's on-screen-ness is a
 * function of scroll offset (daily-loop-ax5-entry.yaml header), so the fact sits on the
 * screen's root container, which no scroll can move off screen. Philosopher constraint:
 * it is an automation identifier only — never a label, never persisted, never used to
 * treat a skipped breath differently, so the reflection phase must be identical.
 */
import React from 'react';
import { act, fireEvent, render, within } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import DailyLoopStepScreen from '../screens/DailyLoopStepScreen';

jest.mock('@/features/practices/shared/components', () => {
  const actual = jest.requireActual('@/features/practices/shared/components');
  const ReactLocal = require('react');
  const RN = require('react-native');
  return {
    ...actual,
    // Only the circle is stubbed; Timer and SkipLink stay REAL, because the timer's own
    // expiry is the path under test.
    BreathingCircle: (props: Record<string, unknown>) =>
      ReactLocal.createElement(RN.View, { testID: props.testID as string }),
  };
});

const FACT = 'daily-loop-breath-skipped';

const renderBreathBeat = () =>
  render(
    <DailyLoopStepScreen
      stepKey="AwarePresence"
      mode="flat"
      depth="quick"
      showBreath
      showBack={false}
      onSave={jest.fn()}
    />,
  );

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('DEBUG-694 — the breath-skip fact', () => {
  it('is absent while the breath runs', () => {
    const screen = renderBreathBeat();
    expect(screen.getByTestId('daily-loop-skip-breath')).toBeTruthy();
    expect(screen.queryByTestId(FACT)).toBeNull();
  });

  it('is NOT set when the breath runs out on its own', () => {
    const screen = renderBreathBeat();
    act(() => {
      jest.advanceTimersByTime(31_000);
    });
    // Control: the timer really did end the breath — the reflection phase is up and the
    // SkipLink is gone. Without this, an absent fact could mean the timer never fired.
    expect(screen.queryByTestId('daily-loop-skip-breath')).toBeNull();
    expect(screen.getByTestId('daily-loop-input-response')).toBeTruthy();
    expect(screen.queryByTestId(FACT)).toBeNull();
  });

  it('is set when the SkipLink ends the breath, on the root and outside the ScrollView', () => {
    const screen = renderBreathBeat();
    fireEvent.press(screen.getByTestId('daily-loop-skip-breath'));

    expect(screen.queryByTestId('daily-loop-skip-breath')).toBeNull();
    expect(screen.getByTestId('daily-loop-input-response')).toBeTruthy();
    const root = screen.getByTestId(FACT);
    // The screen's own ScrollView id is untouched and sits INSIDE the fact's node.
    expect(screen.UNSAFE_getByType(ScrollView).props.testID).toBe('daily-loop-AwarePresence-screen');
    expect(within(root).getByTestId('daily-loop-AwarePresence-screen')).toBeTruthy();
  });

  it('carries no accessibility text, so VoiceOver reads nothing new', () => {
    const screen = renderBreathBeat();
    fireEvent.press(screen.getByTestId('daily-loop-skip-breath'));
    const root = screen.getByTestId(FACT);
    expect(root.props.accessibilityLabel).toBeUndefined();
    expect(root.props.accessibilityHint).toBeUndefined();
    expect(root.props.accessibilityValue).toBeUndefined();
  });

  it('survives the timer firing after a skip — the skip path is the one that ended the beat', () => {
    const screen = renderBreathBeat();
    fireEvent.press(screen.getByTestId('daily-loop-skip-breath'));
    act(() => {
      jest.advanceTimersByTime(31_000);
    });
    expect(screen.getByTestId(FACT)).toBeTruthy();
  });
});
