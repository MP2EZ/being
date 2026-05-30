/**
 * SelfCompassionScreen Tests (MAINT-191 PR 3)
 *
 * Covers the FEAT-134 Evening Flow Redesign's dedicated self-compassion
 * step (screen 4 of 6). This screen exists explicitly to "prevent harsh
 * Stoicism" — its prompt + subtitle copy are the philosophical anchor
 * that distinguishes Stoic self-examination from self-flagellation.
 *
 * Philosopher PR-3 planning pass:
 *  - Title + subtitle: PASS (verbatim mirrors the daily-architecture
 *    "compassionate honesty, not self-flagellation" anchor; honors
 *    Seneca's De Ira 3.36 evening reckoning without pop-comfort drift).
 *  - 3 quick-tap starters: 2 PASS, 1 soft-flag.
 *      "I did my best" — prosoche acknowledgment (defensible);
 *      "I'm learning"  — Stoic prokopē / Discourses 1.4 prokopton;
 *      "Tomorrow's new" — Seneca Letters 1 / Med 8.1 renewal, but
 *                          phrasing reads as generic self-help. Known
 *                          stylistic compromise per philosopher; pin
 *                          verbatim so any future "upgrade" is a
 *                          deliberate decision.
 *  - Tests should NOT assert MIN_CHARS magic-number 10 (test the
 *    behavior — disabled below threshold, enabled at/above — not the
 *    constant). Honored below.
 *  - Tests should NOT assert a virtue-reflection tie-back (intentionally
 *    absent by FEAT-134 design). Honored.
 *
 * Anti-pattern guard (MAINT-188 PR 8 lesson): NO jest perf-budget timing
 * assertions.
 *
 * @see app/src/features/practices/evening/screens/SelfCompassionScreen.tsx
 * @see docs/product/stoic-mindfulness/practice/daily-architecture.md
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock shared/components barrel to keep the rendered tree minimal.
jest.mock('@/features/practices/shared/components', () => {
  const RealReact = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    FlowBackButton: ({ onPress, theme }: any) =>
      RealReact.createElement(
        TouchableOpacity,
        { testID: `flow-back-${theme}`, onPress },
        RealReact.createElement(Text, null, 'back')
      ),
  };
});

// AccessibleButton — passthrough that surfaces disabled state via
// accessibilityState (mirrors PrincipleFocusScreen test mock).
jest.mock('@/core/components/accessibility/AccessibleButton', () => {
  const RealReact = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    AccessibleButton: ({ onPress, label, disabled, testID, accessibilityHint }: any) =>
      RealReact.createElement(
        TouchableOpacity,
        {
          testID,
          onPress: disabled ? undefined : onPress,
          accessibilityState: { disabled: !!disabled },
          accessibilityHint,
        },
        RealReact.createElement(Text, null, label)
      ),
  };
});

// AccessibleInput — passthrough TextInput-equivalent that exposes
// testID + value + onChangeText + placeholder so fireEvent.changeText
// drives the real reflection state.
jest.mock('@/core/components/accessibility/AccessibleInput', () => {
  const RealReact = require('react');
  const { TextInput } = require('react-native');
  return {
    AccessibleInput: ({ value, onChangeText, testID, placeholder }: any) =>
      RealReact.createElement(TextInput, { value, onChangeText, testID, placeholder }),
  };
});

import SelfCompassionScreen from '@/features/practices/evening/screens/SelfCompassionScreen';

const makeProps = (overrides: Partial<any> = {}) => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const route = { params: undefined, ...overrides.route };
  return {
    navigation: navigation as any,
    route: route as any,
    onSave: jest.fn(),
    ...overrides,
  };
};

describe('SelfCompassionScreen', () => {
  // ──────────────────────────────────────────────────────────────────────
  // 1. Philosophical anchor copy — the "prevent harsh Stoicism" framing
  // ──────────────────────────────────────────────────────────────────────
  //
  // These two strings are FEAT-134's reason for existing. They mirror the
  // daily-architecture doc's "compassionate honesty, not self-flagellation"
  // anchor. A copy edit drifting toward harsh self-judgment OR pop-comfort
  // is a regression worth surfacing.
  describe('FEAT-134 prompt copy (philosophical anchor)', () => {
    it('renders the self-compassion prompt title verbatim', () => {
      const { getByText } = render(<SelfCompassionScreen {...makeProps()} />);
      expect(getByText('What kindness can you offer yourself?')).toBeTruthy();
    });

    it('renders the "gentleness, not harsh self-judgment" subtitle verbatim', () => {
      const { getByText } = render(<SelfCompassionScreen {...makeProps()} />);
      expect(
        getByText(
          'The Stoics practiced self-examination with gentleness, not harsh self-judgment'
        )
      ).toBeTruthy();
    });

    it('renders the input placeholder verbatim', () => {
      const { getByPlaceholderText } = render(<SelfCompassionScreen {...makeProps()} />);
      expect(
        getByPlaceholderText('I did my best with what I knew and had today...')
      ).toBeTruthy();
    });

    it('exposes the self-compassion-screen testID for navigation/e2e pinning', () => {
      const { getByTestId } = render(<SelfCompassionScreen {...makeProps()} />);
      expect(getByTestId('self-compassion-screen')).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 2. Quick-tap starters — friction reduction within Stoic constraints
  // ──────────────────────────────────────────────────────────────────────
  describe('quick-tap starters', () => {
    it('renders the 3 philosopher-validated starter chips', () => {
      const { getByText } = render(<SelfCompassionScreen {...makeProps()} />);
      // "I did my best"  — prosoche acknowledgment (defensible)
      expect(getByText('I did my best')).toBeTruthy();
      // "I'm learning"   — Stoic prokopē (Discourses 1.4 prokopton)
      expect(getByText("I'm learning")).toBeTruthy();
      // "Tomorrow's new" — Seneca Letters 1 renewal (philosopher soft-flag
      // on phrasing as known stylistic compromise; pin so any "upgrade"
      // is deliberate)
      expect(getByText("Tomorrow's new")).toBeTruthy();
    });

    it('exposes "Quick starters:" label above the chips', () => {
      const { getByText } = render(<SelfCompassionScreen {...makeProps()} />);
      expect(getByText('Quick starters:')).toBeTruthy();
    });

    it('tapping a starter REPLACES the input value (does not append)', () => {
      // Real UX claim: setReflection(starter) overwrites — pin so a
      // future "append" change is deliberate.
      const { getByText, getByTestId } = render(<SelfCompassionScreen {...makeProps()} />);

      // Pre-fill with something so we can prove replacement, not append.
      fireEvent.changeText(getByTestId('compassion-input'), 'xx');
      fireEvent.press(getByText("I'm learning"));

      expect(getByTestId('compassion-input').props.value).toBe("I'm learning");
    });

    it('hides the starter chips once reflection meets the threshold', () => {
      // The source toggles the whole quick-starters section on
      // `reflection.length < MIN_CHARS`. We verify the behavior — chips
      // disappear at the gate — without coupling to the magic number.
      const { queryByText, getByTestId } = render(<SelfCompassionScreen {...makeProps()} />);

      expect(queryByText('Quick starters:')).toBeTruthy();
      fireEvent.changeText(getByTestId('compassion-input'), 'I worked patiently with my limits today.');
      expect(queryByText('Quick starters:')).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 3. Continue gating — behavior, not magic numbers
  // ──────────────────────────────────────────────────────────────────────
  describe('Continue button gating', () => {
    it('is disabled on initial render (no reflection yet)', () => {
      const { getByTestId } = render(<SelfCompassionScreen {...makeProps()} />);
      expect(getByTestId('continue-button').props.accessibilityState?.disabled).toBe(true);
    });

    it('remains disabled for short input below the validation threshold', () => {
      const { getByTestId } = render(<SelfCompassionScreen {...makeProps()} />);
      fireEvent.changeText(getByTestId('compassion-input'), 'short');
      expect(getByTestId('continue-button').props.accessibilityState?.disabled).toBe(true);
    });

    it('enables once a sufficiently meaningful reflection is entered', () => {
      const { getByTestId } = render(<SelfCompassionScreen {...makeProps()} />);
      fireEvent.changeText(
        getByTestId('compassion-input'),
        'I did the best I could with what I had.'
      );
      expect(getByTestId('continue-button').props.accessibilityState?.disabled).toBe(false);
    });

    it('still treats whitespace-padded input below the trimmed threshold as invalid', () => {
      const { getByTestId } = render(<SelfCompassionScreen {...makeProps()} />);
      fireEvent.changeText(getByTestId('compassion-input'), '   short   ');
      // Source uses `reflection.trim().length` — whitespace must not
      // count toward the threshold.
      expect(getByTestId('continue-button').props.accessibilityState?.disabled).toBe(true);
    });

    it('still treats any one quick-starter as a valid completion', () => {
      // Philosopher review: starters are *valid completions*, not just
      // primers — each one alone clears the gate. This is the FEAT-134
      // friction-reduction promise.
      const starters = ['I did my best', "I'm learning", "Tomorrow's new"];
      for (const starter of starters) {
        const { getByText, getByTestId } = render(<SelfCompassionScreen {...makeProps()} />);
        fireEvent.press(getByText(starter));
        expect(getByTestId('continue-button').props.accessibilityState?.disabled).toBe(false);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 4. Continue handler — save shape + FEAT-134 routing
  // ──────────────────────────────────────────────────────────────────────
  describe('Continue handler', () => {
    it('calls onSave with the trimmed reflection + timestamp and navigates to Tomorrow', () => {
      const props = makeProps();
      const { getByTestId } = render(<SelfCompassionScreen {...props} />);

      fireEvent.changeText(
        getByTestId('compassion-input'),
        "   I'm learning to be kinder.   "
      );
      fireEvent.press(getByTestId('continue-button'));

      expect(props.onSave).toHaveBeenCalledTimes(1);
      const saved = props.onSave.mock.calls[0][0];
      expect(saved.reflection).toBe("I'm learning to be kinder.");
      expect(saved.timestamp).toBeInstanceOf(Date);

      expect(props.navigation.navigate).toHaveBeenCalledWith('Tomorrow');
    });

    it('does not save or navigate when reflection is below the threshold', () => {
      const props = makeProps();
      const { getByTestId } = render(<SelfCompassionScreen {...props} />);

      // Defensive: even if a11y path bypasses the disabled state, the
      // source's `if (!isValid) return` must hold.
      fireEvent.changeText(getByTestId('compassion-input'), 'short');
      fireEvent.press(getByTestId('continue-button'));

      expect(props.onSave).not.toHaveBeenCalled();
      expect(props.navigation.navigate).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 5. FEAT-23 — session resume
  // ──────────────────────────────────────────────────────────────────────
  describe('Session resume (FEAT-23)', () => {
    it('pre-populates the reflection field from route.params.initialData', () => {
      const props = makeProps({
        route: { params: { initialData: { reflection: 'I did what I could today.' } } },
      });
      const { getByTestId } = render(<SelfCompassionScreen {...props} />);

      expect(getByTestId('compassion-input').props.value).toBe('I did what I could today.');
      // Threshold is already met — Continue should be enabled on mount.
      expect(getByTestId('continue-button').props.accessibilityState?.disabled).toBe(false);
    });
  });
});
