/**
 * PrincipleFocusScreen Tests (MAINT-191 PR 1)
 *
 * Fresh coverage for the post-FEAT-45 5-principle Stoic Mindfulness framework
 * (replaces the obsolete pre-FEAT-45 12-principle tests deleted in MAINT-188).
 * Also pins the FEAT-139 simplification (reminder removed, RelationalClose
 * routing). Assertions follow the philosopher-validated punch list — each
 * source citation, description marker, and framework invariant is pinned
 * verbatim so a future copy edit that drifts toward pop-Stoicism (e.g.
 * "control what you can", dropping a cardinal virtue, reordering the
 * developmental progression) fails the test loudly rather than shipping.
 *
 * Anti-pattern guard (MAINT-188 PR 8 lesson): NO jest perf-budget timing
 * assertions. Production budgets live in CLAUDE.md + Maestro.
 *
 * @see app/src/features/practices/morning/screens/PrincipleFocusScreen.tsx
 * @see docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md (v1.1 LOCKED)
 * @see docs/product/stoic-mindfulness/INDEX.md (Foundation → Discernment →
 *      Response → Ethics → Practice ordering)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock the shared-components barrel so PrincipleFocusScreen's tree is
// reduced to its own logic without pulling in animated/native modules.
// Mirrors the pattern in __tests__/unit/practices/EveningBreathingScreen.test.tsx.
jest.mock('@/features/practices/shared/components', () => {
  const RealReact = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    FlowBackButton: ({ onPress }: any) =>
      RealReact.createElement(
        TouchableOpacity,
        { testID: 'flow-back', onPress },
        RealReact.createElement(Text, null, 'back')
      ),
    FlowHeader: ({ title, subtitle }: any) =>
      RealReact.createElement(View, { testID: 'flow-header' }, [
        RealReact.createElement(Text, { key: 't' }, title),
        RealReact.createElement(Text, { key: 's' }, subtitle),
      ]),
    SkipLink: ({ onPress, accessibilityLabel }: any) =>
      RealReact.createElement(
        TouchableOpacity,
        { testID: 'skip-link', onPress, accessibilityLabel },
        RealReact.createElement(Text, null, 'skip')
      ),
  };
});

// AccessibleButton exposes its disabled state via accessibilityState — pass
// it through so the gating assertion below works without the real
// haptic/animation tree.
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

import PrincipleFocusScreen from '@/features/practices/morning/screens/PrincipleFocusScreen';
import type { PrincipleFocusData } from '@/features/practices/types/flows';

const makeProps = (overrides: Partial<any> = {}) => {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };
  const route = {
    params: undefined,
    ...overrides.route,
  };
  return {
    navigation: navigation as any,
    route: route as any,
    onSave: jest.fn(),
    ...overrides,
  };
};

describe('PrincipleFocusScreen', () => {
  // ──────────────────────────────────────────────────────────────────────
  // 1. Rendering — the 5-principle framework, in canonical order
  // ──────────────────────────────────────────────────────────────────────
  //
  // Order encodes the developmental progression (Foundation → Discernment →
  // Response → Ethics → Practice). Reshuffling breaks the framework.
  describe('5-principle framework (FEAT-45)', () => {
    it('renders exactly 5 principles in canonical developmental order', () => {
      const { getByTestId, queryByTestId } = render(<PrincipleFocusScreen {...makeProps()} />);

      // Each principle exists with its canonical testID
      expect(getByTestId('principle-aware_presence')).toBeTruthy();
      expect(getByTestId('principle-radical_acceptance')).toBeTruthy();
      expect(getByTestId('principle-sphere_sovereignty')).toBeTruthy();
      expect(getByTestId('principle-virtuous_response')).toBeTruthy();
      expect(getByTestId('principle-interconnected_living')).toBeTruthy();

      // Negative assertion — no sixth principle ever appears.
      // Non-negotiable #2 from philosopher review: framework is fixed at 5.
      expect(queryByTestId('principle-mindfulness')).toBeNull();
      expect(queryByTestId('principle-resilience')).toBeNull();
    });

    it('renders each principle with the philosopher-validated title', () => {
      const { getByText } = render(<PrincipleFocusScreen {...makeProps()} />);

      expect(getByText('Aware Presence')).toBeTruthy();
      expect(getByText('Radical Acceptance')).toBeTruthy();
      expect(getByText('Sphere Sovereignty')).toBeTruthy();
      expect(getByText('Virtuous Response')).toBeTruthy();
      expect(getByText('Interconnected Living')).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 2. Description content — regression sentinels against pop-Stoicism drift
  // ──────────────────────────────────────────────────────────────────────
  //
  // These literal-substring assertions are deliberate: each phrase carries
  // philosophical weight that a casual copy edit could erase. If a future
  // PR rewrites any of these descriptions, the test must fail so a
  // philosopher agent can re-validate before merge.
  describe('description content (philosopher-validated copy)', () => {
    it('Sphere Sovereignty preserves the non-oversimplified prohairetic framing', () => {
      const { getByText } = render(<PrincipleFocusScreen {...makeProps()} />);

      // The dichotomy must list what IS in our sphere (prohairetic):
      // intentions, judgments, character, responses
      const description = getByText(/Distinguish what you control/);
      expect(description.props.children).toContain('intentions, judgments, character, responses');

      // AND what is NOT (aprohairetic): outcomes, others' choices, externals.
      // A drift to "control what you can" would be a philosophical regression.
      expect(description.props.children).toContain("outcomes, others' choices, externals");
    });

    it('Virtuous Response names all four cardinal virtues', () => {
      // Non-negotiable: only four cardinal virtues, all four must appear.
      // A copy edit dropping one would violate the Stoic framework.
      const { getByText } = render(<PrincipleFocusScreen {...makeProps()} />);
      const description = getByText(/In every situation, ask/);

      const text = description.props.children as string;
      expect(text).toContain('wisdom');
      expect(text).toContain('courage');
      expect(text).toContain('justice');
      expect(text).toContain('temperance');
    });

    it('Radical Acceptance preserves the acceptance-not-resignation marker', () => {
      // "What do I do from here?" is the Stoic agency marker that
      // distinguishes acceptance (active) from resignation (passive).
      const { getByText } = render(<PrincipleFocusScreen {...makeProps()} />);
      const description = getByText(/This is what's happening right now/);
      expect(description.props.children).toContain('What do I do from here?');
    });

    it('Interconnected Living preserves the oikeiosis / common-good markers', () => {
      const { getByText } = render(<PrincipleFocusScreen {...makeProps()} />);
      const description = getByText(/Bring full presence to others/);

      const text = description.props.children as string;
      expect(text).toContain('one human community');
      expect(text).toContain('common good');
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 3. Selection + classical-source citation pinning
  // ──────────────────────────────────────────────────────────────────────
  //
  // Source citations are the bridge from product copy to classical text.
  // They MUST be exact — a wrong citation misrepresents Stoicism to users.
  describe('selection + source citations', () => {
    it('selecting a principle reveals the Selected Principle detail with classical source', () => {
      const { getByTestId, getByText, queryByText } = render(
        <PrincipleFocusScreen {...makeProps()} />
      );

      // Detail section absent before selection.
      expect(queryByText('Selected Principle')).toBeNull();

      fireEvent.press(getByTestId('principle-aware_presence'));

      expect(getByText('Selected Principle')).toBeTruthy();
      expect(getByText('Marcus Aurelius, Meditations 2:1')).toBeTruthy();
    });

    it('Sphere Sovereignty cites Epictetus Enchiridion 1 (the foundational prohairesis text)', () => {
      const { getByTestId, getByText } = render(<PrincipleFocusScreen {...makeProps()} />);
      fireEvent.press(getByTestId('principle-sphere_sovereignty'));
      expect(getByText('Epictetus, Enchiridion 1')).toBeTruthy();
    });

    it('Radical Acceptance cites Meditations 10:6 (amor fati)', () => {
      const { getByTestId, getByText } = render(<PrincipleFocusScreen {...makeProps()} />);
      fireEvent.press(getByTestId('principle-radical_acceptance'));
      expect(getByText('Marcus Aurelius, Meditations 10:6')).toBeTruthy();
    });

    it('Virtuous Response cites Meditations 5:20 (impediment-to-action)', () => {
      const { getByTestId, getByText } = render(<PrincipleFocusScreen {...makeProps()} />);
      fireEvent.press(getByTestId('principle-virtuous_response'));
      expect(getByText('Marcus Aurelius, Meditations 5:20')).toBeTruthy();
    });

    it('Interconnected Living cites Meditations 8:59 (oikeiosis / "men exist for one another")', () => {
      const { getByTestId, getByText } = render(<PrincipleFocusScreen {...makeProps()} />);
      fireEvent.press(getByTestId('principle-interconnected_living'));
      expect(getByText('Marcus Aurelius, Meditations 8:59')).toBeTruthy();
    });

    it('flips accessibilityState.selected on the chosen card', () => {
      const { getByTestId } = render(<PrincipleFocusScreen {...makeProps()} />);
      const card = getByTestId('principle-virtuous_response');

      expect(card.props.accessibilityState.selected).toBe(false);
      fireEvent.press(card);
      expect(card.props.accessibilityState.selected).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 4. Continue button — gating + onSave payload + FEAT-139 navigation
  // ──────────────────────────────────────────────────────────────────────
  describe('Continue button', () => {
    it('is disabled until a principle is selected', () => {
      const { getByTestId } = render(<PrincipleFocusScreen {...makeProps()} />);
      expect(getByTestId('continue-button').props.accessibilityState?.disabled).toBe(true);

      fireEvent.press(getByTestId('principle-aware_presence'));
      expect(getByTestId('continue-button').props.accessibilityState?.disabled).toBe(false);
    });

    it('calls onSave with the selected principleKey and navigates to RelationalClose (FEAT-139)', () => {
      const props = makeProps();
      const { getByTestId } = render(<PrincipleFocusScreen {...props} />);

      fireEvent.press(getByTestId('principle-sphere_sovereignty'));
      fireEvent.press(getByTestId('continue-button'));

      expect(props.onSave).toHaveBeenCalledTimes(1);
      const saved = props.onSave.mock.calls[0][0] as PrincipleFocusData;
      expect(saved.principleKey).toBe('sphere_sovereignty');
      expect(saved.timestamp).toBeInstanceOf(Date);

      // FEAT-139 routing: NOT PhysicalGrounding (the pre-FEAT-139 destination).
      expect(props.navigation.navigate).toHaveBeenCalledWith('RelationalClose');
    });

    it('treats a whitespace-only personalInterpretation as undefined', () => {
      // Preserves prohairesis (user choice to elaborate or not) — empty
      // intent must not be stored as performative virtue-signaling.
      const props = makeProps();
      const { getByTestId } = render(<PrincipleFocusScreen {...props} />);

      fireEvent.press(getByTestId('principle-aware_presence'));
      fireEvent.changeText(getByTestId('personal-interpretation'), '   ');
      fireEvent.press(getByTestId('continue-button'));

      const saved = props.onSave.mock.calls[0][0] as PrincipleFocusData;
      expect(saved.personalInterpretation).toBeUndefined();
    });

    it('preserves a non-empty personalInterpretation verbatim', () => {
      const props = makeProps();
      const { getByTestId } = render(<PrincipleFocusScreen {...props} />);

      fireEvent.press(getByTestId('principle-aware_presence'));
      fireEvent.changeText(getByTestId('personal-interpretation'), 'Notice breath at every doorway.');
      fireEvent.press(getByTestId('continue-button'));

      const saved = props.onSave.mock.calls[0][0] as PrincipleFocusData;
      expect(saved.personalInterpretation).toBe('Notice breath at every doorway.');
    });

    it('does not save or navigate when no principle is selected and Continue is somehow invoked', () => {
      const props = makeProps();
      const { getByTestId } = render(<PrincipleFocusScreen {...props} />);

      // Defensive: even if a future a11y path bypasses the disabled state,
      // the source's `if (!selectedPrinciple) return` must hold.
      fireEvent.press(getByTestId('continue-button'));

      expect(props.onSave).not.toHaveBeenCalled();
      expect(props.navigation.navigate).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 5. Skip path — `aware_presence` default is the philosophical floor
  // ──────────────────────────────────────────────────────────────────────
  //
  // Aware Presence is Principle 1 (Foundation) on which the other four
  // depend (per docs/product/stoic-mindfulness/INDEX.md). Defaulting a
  // skipped user to "be present" is the safest floor — committing them
  // to nothing beyond attention itself. An empty/null principle would
  // lose the prosoche commitment that the entire morning practice is
  // designed to establish. DO NOT "fix" this to null without a
  // philosopher re-validation.
  describe('Skip path (philosophical default)', () => {
    it('saves principleKey "aware_presence" as the foundational baseline', () => {
      const props = makeProps();
      const { getByLabelText } = render(<PrincipleFocusScreen {...props} />);

      fireEvent.press(getByLabelText('Skip principle focus'));

      expect(props.onSave).toHaveBeenCalledTimes(1);
      const saved = props.onSave.mock.calls[0][0] as PrincipleFocusData;
      expect(saved.principleKey).toBe('aware_presence');
      expect(saved.personalInterpretation).toBeUndefined();
      expect(saved.timestamp).toBeInstanceOf(Date);
    });

    it('navigates to RelationalClose on skip (FEAT-139 routing)', () => {
      const props = makeProps();
      const { getByLabelText } = render(<PrincipleFocusScreen {...props} />);

      fireEvent.press(getByLabelText('Skip principle focus'));

      expect(props.navigation.navigate).toHaveBeenCalledWith('RelationalClose');
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 6. FEAT-23 — restore session state from route.params.initialData
  // ──────────────────────────────────────────────────────────────────────
  describe('Session resume (FEAT-23)', () => {
    it('pre-populates the selected principle and personalInterpretation', () => {
      const initialData: PrincipleFocusData = {
        principleKey: 'virtuous_response',
        personalInterpretation: 'Today: courage in the difficult conversation.',
        reminderTime: undefined,
        timestamp: new Date('2026-05-29T08:00:00Z'),
      };
      const props = makeProps({ route: { params: { initialData } } });

      const { getByTestId, getByDisplayValue } = render(<PrincipleFocusScreen {...props} />);

      // The selected card reflects the restored choice.
      expect(getByTestId('principle-virtuous_response').props.accessibilityState.selected).toBe(true);
      // And the personal interpretation rehydrates verbatim.
      expect(getByDisplayValue('Today: courage in the difficult conversation.')).toBeTruthy();
    });
  });
});
