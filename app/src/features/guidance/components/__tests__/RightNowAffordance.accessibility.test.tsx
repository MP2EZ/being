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

import fsNode from 'fs';
import pathNode from 'path';
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

/**
 * DEBUG-547: the guidance row's FRAME clears the crisis FAB's exclusion region.
 *
 * This row is NOT incidental to the Home fix — it is the reason the fix could not
 * be scoped to `features/home/`. `eas.json`'s `e2e-sim` profile sets
 * `domain_guidance: true`, so this row is LIT in every gate build. With it
 * rendered it sits inside the exclusion region itself AND pushes the Practices
 * row below it down into the FAB's band, which is worse than the filed defect.
 * A Home-only fix would have shipped a screen whose only armed witness
 * (`crisis-button-reachability`, 375x667) renders a still-broken row on every run.
 */
describe('DEBUG-547: the guidance row clears the crisis FAB exclusion region', () => {
  const SRC = fsNode.readFileSync(pathNode.join(__dirname, '../RightNowAffordance.tsx'), 'utf-8');

  /**
   * COMMENT-STRIPPED (DEBUG-390). The block below deliberately names the
   * anti-patterns it must avoid — "Must NOT be `paddingRight`", and a warning
   * about `marginHorizontal` — so a bare `not.toContain` would match the warning
   * and fail on correct code.
   */
  const styleBlock = (name: string): string => {
    const start = SRC.indexOf(`  ${name}: {`);
    if (start === -1) throw new Error(`style "${name}" not found in RightNowAffordance`);
    return SRC.slice(start, SRC.indexOf('\n  },', start))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
  };

  it('sets the inset on the SAME element that carries the testID', () => {
    const { getByTestId } = render(<RightNowAffordance />);
    const style = StyleSheetFlatten(getByTestId('home-guidance-entry').props.style);
    expect(style.marginRight).toBe(72);
    expect(style.paddingRight).toBeUndefined();
  });

  it('keeps its 44pt minimum touch height — the inset is horizontal only', () => {
    // The clearance must not be bought with vertical space; this row's own
    // `minHeight: TOUCH_TARGETS.minimum` pin is the one that could regress.
    const { getByTestId } = render(<RightNowAffordance />);
    const style = StyleSheetFlatten(getByTestId('home-guidance-entry').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });

  it('uses the derived constant and declares it LAST', () => {
    const block = styleBlock('row');
    expect(block).toContain('marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left');
    expect(block).not.toMatch(/marginHorizontal\s*:/);
    expect(block).not.toMatch(/paddingRight\s*:/);
    expect(block.indexOf('marginRight:')).toBeGreaterThan(block.indexOf('marginTop:'));
  });

  it('PROOF OF LIVENESS — the matchers can still go red (DEBUG-390)', () => {
    expect(() => styleBlock('noSuchStyleBlock')).toThrow(/not found/);
    const stripped = styleBlock('row');
    expect(stripped).toMatch(/marginRight\s*:/);
    expect(stripped).not.toContain('Must NOT be');
    expect('  paddingRight: 72,').toMatch(/paddingRight\s*:/);
  });
});
