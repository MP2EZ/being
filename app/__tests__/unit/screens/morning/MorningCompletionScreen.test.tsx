/**
 * MorningCompletionScreen Tests (MAINT-191 PR 2)
 *
 * Covers the post-FEAT-46 auto-toast pattern + MAINT-140 principle-restatement
 * enhancement. Each of the 5 Stoic Mindfulness principles ships a paired
 * Marcus Aurelius quote that closes out the morning flow — every quote +
 * citation is pinned verbatim here as a regression sentinel.
 *
 * Philosopher validation (PR 2 planning pass):
 *  - All 5 quote/citation pairs validated as classically authentic
 *    or as the conventional popular attribution; thematic pairings
 *    pass without misapplication.
 *  - Quotes 1 (Med 7:47) and 3 (Med 4:3) are the popularized renderings
 *    rather than tight translator-faithful Hays — acceptable to pin as
 *    the product's chosen wording, but documented here so a future PR
 *    that "upgrades" the wording knows it's making a deliberate choice.
 *  - Send-off framing `Today's focus: ${Name}` is the morning→day handoff
 *    contract; pin verbatim.
 *
 * Anti-pattern guard (MAINT-188 PR 8 lesson): NO jest perf-budget timing
 * assertions. The CelebrationToast `duration={8}` is the user-visible
 * contract (8s celebration), not a budget; assert the value, not timing.
 *
 * @see app/src/features/practices/morning/screens/MorningCompletionScreen.tsx
 * @see docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

// Capture CelebrationToast props so the test can both assert on them and
// drive the onComplete callback directly (mirrors EveningBreathingScreen
// pattern at __tests__/unit/practices/EveningBreathingScreen.test.tsx).
const celebrationToastPropsLog: any[] = [];

jest.mock('@/core/components/CelebrationToast', () => {
  const RealReact = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    CelebrationToast: (props: any) => {
      celebrationToastPropsLog.push(props);
      return RealReact.createElement(View, { testID: 'celebration-toast-mock' }, [
        // Surface the rendered enhancement copy for the rare assertion
        // that reads through the DOM rather than the prop log.
        props.enhancement?.message
          ? RealReact.createElement(Text, { key: 'm' }, props.enhancement.message)
          : null,
        props.enhancement?.subtext
          ? RealReact.createElement(Text, { key: 's' }, props.enhancement.subtext)
          : null,
        props.enhancement?.attribution
          ? RealReact.createElement(Text, { key: 'a' }, props.enhancement.attribution)
          : null,
        // A button the test fires to drive onComplete without waiting on
        // the real 8s celebration animation.
        RealReact.createElement(
          TouchableOpacity,
          { key: 'c', testID: 'mock-trigger-complete', onPress: props.onComplete },
          RealReact.createElement(Text, null, 'complete')
        ),
      ]);
    },
  };
});

const mockClearSession = jest.fn().mockResolvedValue(undefined);
jest.mock('@/core/services/session/SessionStorageService', () => ({
  SessionStorageService: {
    clearSession: (...args: any[]) => mockClearSession(...args),
  },
}));

import MorningCompletionScreen from '@/features/practices/morning/screens/MorningCompletionScreen';
import type { StoicPrinciple } from '@/features/practices/types/stoic';

const makeProps = (overrides: Partial<any> = {}) => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const route = {
    params: {
      flowData: {},
      startTime: undefined,
      ...overrides.routeParams,
    },
  };
  return {
    navigation: navigation as any,
    route: route as any,
    onSave: jest.fn(),
    ...overrides,
  };
};

describe('MorningCompletionScreen', () => {
  beforeEach(() => {
    celebrationToastPropsLog.length = 0;
    mockClearSession.mockClear();
  });

  // ──────────────────────────────────────────────────────────────────────
  // 1. Toast wiring — the FEAT-46 auto-toast contract
  // ──────────────────────────────────────────────────────────────────────
  describe('CelebrationToast wiring (FEAT-46)', () => {
    it('renders with morning theme, 5-screen count, 8s duration, streak=1', () => {
      render(<MorningCompletionScreen {...makeProps()} />);
      const passed = celebrationToastPropsLog[0];

      expect(passed.flowType).toBe('morning');
      expect(passed.screenCount).toBe(5);
      // Note: 8s duration is the user-visible celebration contract, NOT
      // a Jest performance budget — pinning the value, not enforcing time.
      expect(passed.duration).toBe(8);
      expect(passed.streak).toBe(1);
    });

    it('exposes the morning-completion-screen testID for navigation/e2e pinning', () => {
      const { getByTestId } = render(<MorningCompletionScreen {...makeProps()} />);
      expect(getByTestId('morning-completion-screen')).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 2. MAINT-140 — principle restatement message format
  // ──────────────────────────────────────────────────────────────────────
  //
  // The morning→day handoff format is `Today's focus: ${Principle Name}`.
  // A copy edit to "Your focus today:" or dropping the colon is a
  // regression — the philosopher-flagged contract is the framing, not
  // just the principle name.
  describe('principle restatement (MAINT-140)', () => {
    const restatementCases: Array<{ key: StoicPrinciple; expected: string }> = [
      { key: 'aware_presence',        expected: "Today's focus: Aware Presence" },
      { key: 'radical_acceptance',    expected: "Today's focus: Radical Acceptance" },
      { key: 'sphere_sovereignty',    expected: "Today's focus: Sphere Sovereignty" },
      { key: 'virtuous_response',     expected: "Today's focus: Virtuous Response" },
      { key: 'interconnected_living', expected: "Today's focus: Interconnected Living" },
    ];

    it.each(restatementCases)(
      'restates the chosen principle "$key" with the send-off framing',
      ({ key, expected }) => {
        render(
          <MorningCompletionScreen
            {...makeProps({ routeParams: { flowData: { principleFocus: { principleKey: key } } } })}
          />
        );
        const passed = celebrationToastPropsLog[0];
        expect(passed.enhancement.message).toBe(expected);
      }
    );
  });

  // ──────────────────────────────────────────────────────────────────────
  // 3. MAINT-140 — Marcus Aurelius quotes (philosopher-validated)
  // ──────────────────────────────────────────────────────────────────────
  //
  // Each principle ships a paired classical quote. Pinned verbatim per the
  // PR 2 philosopher review. Quotes 1 (Med 7:47) and 3 (Med 4:3) are
  // popularized renderings rather than tight translator-faithful — the
  // locators are the conventional attributions. If a future PR "upgrades"
  // to a closer Hays translation, that's a deliberate decision worth
  // surfacing via test failure.
  describe('Marcus Aurelius quote pinning (MAINT-140)', () => {
    const quoteCases: Array<{
      key: StoicPrinciple;
      quote: string;
      citation: string;
    }> = [
      {
        key: 'aware_presence',
        quote: 'Dwell on the beauty of life. Watch the stars, and see yourself running with them.',
        citation: '— Marcus Aurelius, Meditations 7:47',
      },
      {
        key: 'radical_acceptance',
        quote:
          'Accept the things to which fate binds you, and love the people with whom fate brings you together.',
        citation: '— Marcus Aurelius, Meditations 6:39',
      },
      {
        key: 'sphere_sovereignty',
        quote: 'You have power over your mind — not outside events. Realize this, and you will find strength.',
        citation: '— Marcus Aurelius, Meditations 4:3',
      },
      {
        key: 'virtuous_response',
        quote: 'Waste no more time arguing about what a good man should be. Be one.',
        citation: '— Marcus Aurelius, Meditations 10:16',
      },
      {
        key: 'interconnected_living',
        quote: 'What injures the hive, injures the bee.',
        citation: '— Marcus Aurelius, Meditations 6:54',
      },
    ];

    it.each(quoteCases)(
      'pairs principle "$key" with verbatim quote + citation',
      ({ key, quote, citation }) => {
        render(
          <MorningCompletionScreen
            {...makeProps({ routeParams: { flowData: { principleFocus: { principleKey: key } } } })}
          />
        );
        const passed = celebrationToastPropsLog[0];
        expect(passed.enhancement.subtext).toBe(quote);
        expect(passed.enhancement.attribution).toBe(citation);
      }
    );
  });

  // ──────────────────────────────────────────────────────────────────────
  // 4. Enhancement absent when no/invalid principle
  // ──────────────────────────────────────────────────────────────────────
  describe('enhancement gating', () => {
    it('passes enhancement undefined when no principle was selected (empty flowData)', () => {
      render(<MorningCompletionScreen {...makeProps()} />);
      expect(celebrationToastPropsLog[0].enhancement).toBeUndefined();
    });

    it('passes enhancement undefined when principleFocus is missing', () => {
      render(
        <MorningCompletionScreen
          {...makeProps({ routeParams: { flowData: { /* no principleFocus */ } } })}
        />
      );
      expect(celebrationToastPropsLog[0].enhancement).toBeUndefined();
    });

    it('passes enhancement undefined for an unknown principleKey (defensive)', () => {
      // If a future flow ships a new principle key before MorningCompletion
      // is updated, fall through to no enhancement rather than crash.
      render(
        <MorningCompletionScreen
          {...makeProps({
            routeParams: { flowData: { principleFocus: { principleKey: 'unknown_principle' } } },
          })}
        />
      );
      expect(celebrationToastPropsLog[0].enhancement).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 5. onComplete — flow finalization (FEAT-23 session clear + onSave shape)
  // ──────────────────────────────────────────────────────────────────────
  describe('flow completion handler', () => {
    it('calls SessionStorageService.clearSession("morning") on toast complete (FEAT-23)', async () => {
      const props = makeProps({ routeParams: { flowData: { principleFocus: { principleKey: 'aware_presence' } } } });
      const { getByTestId } = render(<MorningCompletionScreen {...props} />);

      await act(async () => {
        fireEvent.press(getByTestId('mock-trigger-complete'));
      });

      await waitFor(() => {
        expect(mockClearSession).toHaveBeenCalledWith('morning');
      });
    });

    it('calls onSave with the merged flowData + completedAt + flowVersion "stoic_v1"', async () => {
      const startTime = new Date('2026-05-29T08:00:00Z');
      const props = makeProps({
        routeParams: {
          flowData: { principleFocus: { principleKey: 'virtuous_response' } },
          startTime,
        },
      });
      const { getByTestId } = render(<MorningCompletionScreen {...props} />);

      await act(async () => {
        fireEvent.press(getByTestId('mock-trigger-complete'));
      });

      await waitFor(() => {
        expect(props.onSave).toHaveBeenCalledTimes(1);
      });
      const saved = props.onSave.mock.calls[0][0];

      // Preserves the upstream flow data verbatim (the spread in the source).
      expect(saved.principleFocus).toEqual({ principleKey: 'virtuous_response' });
      // Stamps the completion sentinel.
      expect(saved.completedAt).toBeInstanceOf(Date);
      // flowVersion is the schema marker for downstream parsing.
      expect(saved.flowVersion).toBe('stoic_v1');
      // timeSpentSeconds is a non-negative integer derived from startTime.
      expect(saved.timeSpentSeconds).toEqual(expect.any(Number));
      expect(saved.timeSpentSeconds).toBeGreaterThanOrEqual(0);
    });

    it('treats a missing startTime as 0 elapsed seconds (defensive)', async () => {
      const props = makeProps({ routeParams: { flowData: {}, startTime: undefined } });
      const { getByTestId } = render(<MorningCompletionScreen {...props} />);

      await act(async () => {
        fireEvent.press(getByTestId('mock-trigger-complete'));
      });

      await waitFor(() => {
        expect(props.onSave).toHaveBeenCalled();
      });
      expect(props.onSave.mock.calls[0][0].timeSpentSeconds).toBe(0);
    });
  });
});
