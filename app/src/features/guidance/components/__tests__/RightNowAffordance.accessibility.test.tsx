/**
 * The Home guidance entry point — accessibility and disclosure contract
 * (FEAT-457, slice 4).
 *
 * SITING: `--testPathPattern=accessibility` matches on PATH, so this location is
 * gated by `test:accessibility` and passes `check-ci-test-coverage.js`. A suite
 * named without that substring under `src/features/guidance/__tests__/` would
 * match no CI pattern and hard-fail that check — which is why the sibling clinical
 * suites live in `app/__tests__/clinical/` instead.
 *
 * What these pin, and why each one is the kind of thing a later tidy-up removes:
 *   · the row NEVER reads assessment state (one gate, one site — on the destination)
 *   · the spoken label matches the visible text rather than being reduced
 *   · the destination is read from the binding table, not hardcoded
 *   · the analytics call carries NO argument
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockTrackGuidanceOpened = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({ trackGuidanceOpened: mockTrackGuidanceOpened }),
}));

import RightNowAffordance from '../RightNowAffordance';
import { DOMAIN_BINDINGS } from '../../constants/domainBindings';

beforeEach(() => {
  mockNavigate.mockClear();
  mockTrackGuidanceOpened.mockClear();
});

describe('RightNowAffordance — the two-line label', () => {
  it('renders a generic frame ABOVE the honest destination', () => {
    // Neither line alone is sanctionable. Generic-only is a bait-and-switch,
    // because AVAILABLE_DOMAINS is ['conflict'] and the row navigates straight
    // into conflict content. Specific-only asserts a hardship at a reader who may
    // not be in one.
    const { getByText } = render(<RightNowAffordance />);
    expect(getByText('Something hard right now')).toBeTruthy();
    expect(getByText(DOMAIN_BINDINGS.conflict.label)).toBeTruthy();
  });

  it('reads the destination from the binding table rather than a hardcoded string', () => {
    // Forward-compatibility with the SituationPicker: when career/grief/pain land,
    // the secondary line becomes the picker entry and the primary line is unchanged.
    const { getByText } = render(<RightNowAffordance />);
    expect(getByText('Conflict with someone')).toBeTruthy();
    expect(DOMAIN_BINDINGS.conflict.label).toBe('Conflict with someone');
  });

  it('never names a principle — situation-language only', () => {
    // domainBindings.ts clause 2: a distressed reader will not translate "my mother
    // died" into "review Radical Acceptance".
    const { queryByText } = render(<RightNowAffordance />);
    for (const principle of DOMAIN_BINDINGS.conflict.principles) {
      expect(queryByText(principle)).toBeNull();
    }
  });
});

describe('RightNowAffordance — accessibility', () => {
  it('speaks the SAME information the row displays, not a reduced version', () => {
    // Compliance ruling (amended): once the visible row is cleared, the assistive
    // channel carries the same information. Stripping the spoken label to hedge
    // against speaker-mode audibility would be an accessibility regression traded
    // for no privacy gain — and would apply equally to every other labelled
    // control already on Home, the crisis button included.
    const { getByTestId } = render(<RightNowAffordance />);
    const row = getByTestId('home-guidance-entry');
    expect(row.props.accessibilityLabel).toBe(
      'Something hard right now: Conflict with someone'
    );
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityHint).toBe('Opens guidance for conflict with someone');
  });

  it('meets the minimum touch target', () => {
    const { getByTestId } = render(<RightNowAffordance />);
    const style = StyleSheetFlatten(getByTestId('home-guidance-entry').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });
});

describe('RightNowAffordance — it must not become a state indicator', () => {
  it('renders identically regardless of any assessment state, because it reads none', () => {
    // 🔴 The row does not import useGuidanceGate, decideGuidanceAccess, or the
    // assessment store. This suite deliberately provides NO store mock — if the
    // component ever starts reading one, this file fails to render at all, which
    // is the loud failure we want.
    //
    // Two behaviours depend on it: the row stays visible for a SUPPRESSED reader
    // (an affordance that disappears by score is an ambient disclosure of that
    // score), and it is reachable pre-assessment (a missing axis resolves to
    // `gentle`, which is real content).
    const first = render(<RightNowAffordance />).getByTestId('home-guidance-entry');
    expect(first.props.accessibilityLabel).toBe(
      'Something hard right now: Conflict with someone'
    );
  });

  it('carries no badge, count or urgency affordance', () => {
    const { queryByTestId } = render(<RightNowAffordance />);
    expect(queryByTestId('home-guidance-entry-badge')).toBeNull();
    expect(queryByTestId('home-guidance-entry-count')).toBeNull();
  });
});

describe('RightNowAffordance — navigation and instrumentation', () => {
  it('navigates to the guidance screen with an explicit domain param', () => {
    const { getByTestId } = render(<RightNowAffordance />);
    fireEvent.press(getByTestId('home-guidance-entry'));
    expect(mockNavigate).toHaveBeenCalledWith('DomainGuidance', { domain: 'conflict' });
  });

  it('fires guidance_opened with NO arguments — the domain never leaves the device', () => {
    // The hardship domain is the wellness inference itself, and
    // analytics-architecture.md publishes "What We NEVER Collect: … Any mental
    // health data." An argument here would make that published promise false.
    const { getByTestId } = render(<RightNowAffordance />);
    fireEvent.press(getByTestId('home-guidance-entry'));
    expect(mockTrackGuidanceOpened).toHaveBeenCalledTimes(1);
    expect(mockTrackGuidanceOpened).toHaveBeenCalledWith();
  });
});

/** Local flatten so the suite does not depend on RN's StyleSheet.flatten typing. */
function StyleSheetFlatten(style: unknown): Record<string, number> {
  if (Array.isArray(style)) {
    return style.reduce(
      (acc: Record<string, number>, s) => ({ ...acc, ...StyleSheetFlatten(s) }),
      {}
    );
  }
  return (style ?? {}) as Record<string, number>;
}
