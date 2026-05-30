/**
 * GratitudeScreen Tests (MAINT-191 PR 4)
 *
 * Covers the FEAT-134 Evening Flow Redesign's gratitude entry (screen 2 of 6).
 * Architecture is 1 REQUIRED + 2 OPTIONAL (not 3 required) — friction
 * reduction per the FEAT-134 design philosophy. 3rd entry uses progressive
 * disclosure.
 *
 * Philosopher PR-4 planning pass:
 *  - All 7 user-visible strings pinned verbatim (no in-copy classical
 *    citations — pinning is safe across translation refactors).
 *  - 1-required + 2-optional architecture: PASS. Stoic prosoche values
 *    consistency over intensity (Discourses 1.4); friction reduction
 *    serves prohairesis over algorithmic coercion.
 *  - "What are you grateful for today?" is generic positive-psychology
 *    framing rather than distinctively Stoic — not a regression, but
 *    a product follow-up if a more Stoically-distinct framing is wanted.
 *    Pin as-is.
 *  - **Impermanence toggle absence is asserted as DELIBERATE design.**
 *    Memento mori on a gratitude screen risks the catastrophizing
 *    failure mode flagged in the philosopher spec. If impermanence
 *    belongs in evening flow at all, it's a separate opt-in screen
 *    with anxiety-aware framing — not this surface.
 *
 * Anti-pattern guard (MAINT-188 PR 8 lesson): NO jest perf-budget timing
 * assertions; behavior over magic numbers (don't pin MIN_CHARS=10).
 *
 * @see app/src/features/practices/evening/screens/GratitudeScreen.tsx
 * @see docs/product/stoic-mindfulness/practice/daily-architecture.md
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

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

jest.mock('@/core/components/accessibility/AccessibleInput', () => {
  const RealReact = require('react');
  const { TextInput, View, Text } = require('react-native');
  return {
    // Surface label + helperText as Text so getByText can match.
    AccessibleInput: ({ value, onChangeText, testID, placeholder, label, helperText }: any) =>
      RealReact.createElement(View, null, [
        label
          ? RealReact.createElement(Text, { key: 'l' }, label)
          : null,
        helperText
          ? RealReact.createElement(Text, { key: 'h' }, helperText)
          : null,
        RealReact.createElement(TextInput, {
          key: 'i',
          value,
          onChangeText,
          testID,
          placeholder,
        }),
      ]),
  };
});

import GratitudeScreen from '@/features/practices/evening/screens/GratitudeScreen';

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

describe('GratitudeScreen', () => {
  // ──────────────────────────────────────────────────────────────────────
  // 1. FEAT-134 visible copy (pinned verbatim per philosopher review)
  // ──────────────────────────────────────────────────────────────────────
  describe('FEAT-134 visible copy', () => {
    it('renders the gratitude prompt title verbatim', () => {
      const { getByText } = render(<GratitudeScreen {...makeProps()} />);
      expect(getByText('What are you grateful for today?')).toBeTruthy();
    });

    it('renders the required input with its philosopher-pinned placeholder', () => {
      const { getByPlaceholderText } = render(<GratitudeScreen {...makeProps()} />);
      expect(getByPlaceholderText("I'm grateful for...")).toBeTruthy();
    });

    it('renders the optional second input with "Add another" / "optional" / placeholder', () => {
      const { getByText, getByPlaceholderText } = render(<GratitudeScreen {...makeProps()} />);
      expect(getByText('Add another')).toBeTruthy();
      // helperText "optional" appears for both 2nd and 3rd — count is
      // not asserted here (counted in "3rd disclosure" below).
      expect(getByPlaceholderText('Something else...')).toBeTruthy();
    });

    it('renders the validation hint when no gratitude is entered yet', () => {
      const { getByText } = render(<GratitudeScreen {...makeProps()} />);
      expect(getByText('Add at least one gratitude (10+ characters)')).toBeTruthy();
    });

    it('exposes the gratitude-screen testID for navigation/e2e pinning', () => {
      const { getByTestId } = render(<GratitudeScreen {...makeProps()} />);
      expect(getByTestId('gratitude-screen')).toBeTruthy();
    });

    // FEAT-134 + philosopher safety guidance: memento-mori / impermanence
    // framing belongs on a separate opt-in surface (catastrophizing risk
    // on a gratitude screen). This assertion pins the deliberate absence.
    it('does NOT render impermanence / memento-mori framing on this surface', () => {
      const { queryByText } = render(<GratitudeScreen {...makeProps()} />);
      expect(queryByText(/impermanence/i)).toBeNull();
      expect(queryByText(/fleeting/i)).toBeNull();
      expect(queryByText(/won't last/i)).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 2. 1 REQUIRED + 2 OPTIONAL architecture (FEAT-134 friction reduction)
  // ──────────────────────────────────────────────────────────────────────
  //
  // The design philosophy explicitly chose 1 required + 2 optional over
  // 3 required to "develop more virtue across 90 days than one who
  // abandons 3-required after week 2" (philosopher PR-4 review citing
  // Discourses 1.4 prokopē). A future PR collapsing back to 3-required
  // would invert that decision — these assertions surface the inversion.
  describe('1-required + 2-optional architecture', () => {
    it('renders both gratitude inputs 1 and 2 by default', () => {
      const { getByTestId } = render(<GratitudeScreen {...makeProps()} />);
      expect(getByTestId('gratitude-1')).toBeTruthy();
      expect(getByTestId('gratitude-2')).toBeTruthy();
    });

    it('keeps gratitude 3 collapsed initially behind an "+ Add a third" affordance', () => {
      const { queryByTestId, getByText } = render(<GratitudeScreen {...makeProps()} />);
      expect(queryByTestId('gratitude-3')).toBeNull();
      expect(getByText('+ Add a third')).toBeTruthy();
    });

    it('reveals gratitude 3 with its "One more" label after tapping "+ Add a third"', () => {
      const { getByText, getByTestId, queryByText } = render(<GratitudeScreen {...makeProps()} />);

      fireEvent.press(getByText('+ Add a third'));

      expect(getByTestId('gratitude-3')).toBeTruthy();
      expect(getByText('One more')).toBeTruthy();
      // Affordance disappears once expanded — pin to prevent both-rendered
      // state regressions.
      expect(queryByText('+ Add a third')).toBeNull();
    });

    it('renders the 3rd input placeholder verbatim once expanded', () => {
      const { getByText, getByPlaceholderText } = render(<GratitudeScreen {...makeProps()} />);
      fireEvent.press(getByText('+ Add a third'));
      expect(getByPlaceholderText('And one more...')).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 3. Continue gating — behavior, not the MIN_CHARS magic number
  // ──────────────────────────────────────────────────────────────────────
  describe('Continue button gating', () => {
    it('is disabled on initial render', () => {
      const { getByTestId } = render(<GratitudeScreen {...makeProps()} />);
      expect(getByTestId('continue-button').props.accessibilityState?.disabled).toBe(true);
    });

    it('is disabled for short input below the validation threshold', () => {
      const { getByTestId } = render(<GratitudeScreen {...makeProps()} />);
      fireEvent.changeText(getByTestId('gratitude-1'), 'short');
      expect(getByTestId('continue-button').props.accessibilityState?.disabled).toBe(true);
    });

    it('enables once the REQUIRED entry meets the threshold (optional entries empty)', () => {
      const { getByTestId } = render(<GratitudeScreen {...makeProps()} />);
      fireEvent.changeText(getByTestId('gratitude-1'), 'My partner made dinner tonight.');
      expect(getByTestId('continue-button').props.accessibilityState?.disabled).toBe(false);
    });

    it('still treats whitespace-padded input below the trimmed threshold as invalid', () => {
      const { getByTestId } = render(<GratitudeScreen {...makeProps()} />);
      fireEvent.changeText(getByTestId('gratitude-1'), '   short   ');
      expect(getByTestId('continue-button').props.accessibilityState?.disabled).toBe(true);
    });

    it('stays disabled when only optional entries are populated (REQUIRED-first invariant)', () => {
      // Defensive: the 2nd input alone cannot enable Continue. This pins
      // the 1-required-not-2-required-not-3-required invariant.
      const { getByTestId } = render(<GratitudeScreen {...makeProps()} />);
      fireEvent.changeText(getByTestId('gratitude-2'), 'A long quiet walk after lunch.');
      expect(getByTestId('continue-button').props.accessibilityState?.disabled).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 4. Continue handler — save shape + FEAT-134 routing
  // ──────────────────────────────────────────────────────────────────────
  describe('Continue handler', () => {
    it('saves only the trimmed required gratitude when optionals are empty', () => {
      const props = makeProps();
      const { getByTestId } = render(<GratitudeScreen {...props} />);

      fireEvent.changeText(getByTestId('gratitude-1'), '  My partner made dinner.  ');
      fireEvent.press(getByTestId('continue-button'));

      expect(props.onSave).toHaveBeenCalledTimes(1);
      const saved = props.onSave.mock.calls[0][0];
      expect(saved.items).toEqual(['My partner made dinner.']);
      expect(saved.timestamp).toBeInstanceOf(Date);
    });

    it('includes the 2nd optional entry when populated', () => {
      const props = makeProps();
      const { getByTestId } = render(<GratitudeScreen {...props} />);

      fireEvent.changeText(getByTestId('gratitude-1'), 'My partner made dinner tonight.');
      fireEvent.changeText(getByTestId('gratitude-2'), 'A long quiet walk.');
      fireEvent.press(getByTestId('continue-button'));

      const saved = props.onSave.mock.calls[0][0];
      expect(saved.items).toEqual(['My partner made dinner tonight.', 'A long quiet walk.']);
    });

    it('includes the 3rd entry only after it is expanded and populated', () => {
      const props = makeProps();
      const { getByTestId, getByText } = render(<GratitudeScreen {...props} />);

      fireEvent.changeText(getByTestId('gratitude-1'), 'My partner made dinner tonight.');
      fireEvent.press(getByText('+ Add a third'));
      fireEvent.changeText(getByTestId('gratitude-3'), 'Finishing the long book.');
      fireEvent.press(getByTestId('continue-button'));

      const saved = props.onSave.mock.calls[0][0];
      expect(saved.items).toEqual([
        'My partner made dinner tonight.',
        'Finishing the long book.',
      ]);
    });

    it('navigates to VirtueReflection on continue (FEAT-134 routing)', () => {
      const props = makeProps();
      const { getByTestId } = render(<GratitudeScreen {...props} />);

      fireEvent.changeText(getByTestId('gratitude-1'), 'My partner made dinner tonight.');
      fireEvent.press(getByTestId('continue-button'));

      expect(props.navigation.navigate).toHaveBeenCalledWith('VirtueReflection');
    });

    it('does not save or navigate when the required entry is below the threshold', () => {
      const props = makeProps();
      const { getByTestId } = render(<GratitudeScreen {...props} />);

      fireEvent.changeText(getByTestId('gratitude-1'), 'short');
      fireEvent.press(getByTestId('continue-button'));

      expect(props.onSave).not.toHaveBeenCalled();
      expect(props.navigation.navigate).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 5. FEAT-23 — session resume
  // ──────────────────────────────────────────────────────────────────────
  describe('Session resume (FEAT-23)', () => {
    it('pre-populates entries 1 and 2 from initialData.items', () => {
      const props = makeProps({
        route: {
          params: {
            initialData: { items: ['Restored first.', 'Restored second.'] },
          },
        },
      });
      const { getByTestId, queryByTestId } = render(<GratitudeScreen {...props} />);

      expect(getByTestId('gratitude-1').props.value).toBe('Restored first.');
      expect(getByTestId('gratitude-2').props.value).toBe('Restored second.');
      // Without a 3rd item, gratitude-3 stays collapsed.
      expect(queryByTestId('gratitude-3')).toBeNull();
    });

    it('auto-expands the 3rd entry when initialData.items includes a third gratitude', () => {
      const props = makeProps({
        route: {
          params: {
            initialData: {
              items: ['Restored first.', 'Restored second.', 'Restored third.'],
            },
          },
        },
      });
      const { getByTestId } = render(<GratitudeScreen {...props} />);

      expect(getByTestId('gratitude-3').props.value).toBe('Restored third.');
    });
  });
});
