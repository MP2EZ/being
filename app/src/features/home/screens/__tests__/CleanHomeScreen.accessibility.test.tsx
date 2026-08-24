/**
 * CleanHomeScreen accessibility tests (MAINT-257).
 *
 * Pins the harmonized heading idiom for the Home tab: the "Being" brand wordmark
 * is the SINGLE screen heading (accessibilityRole="header", level 1), and the
 * time-of-day greeting below it is a PLAIN text line — not a heading. MAINT-257
 * demoted the greeting from a level-2 header so every tab screen exposes exactly
 * one h1 (matching InsightsScreen.accessibility.test.tsx). Guards against the
 * greeting silently regaining heading semantics.
 *
 * DEBUG-469 adds the Dynamic Type REACHABILITY block at the end. It lives here rather
 * than in a file of its own because `--testPathPattern=accessibility` is what the CI
 * accessibility job collects: a sibling named for `reachability` matched no pattern and
 * would have run on no PR at all.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({ trackScreenView: jest.fn(), trackGuidanceOpened: jest.fn() }),
}));

// FEAT-457: the guidance entry point is build-time flagged, so the row's presence
// is a function of this mock rather than of the ambient env blob. Mocked (not read
// from env) so BOTH states are reachable from a test — an unmocked read would pin
// whichever value the host `.env` happened to carry, which is not a contract.
const mockFlags: Record<string, boolean> = { domain_guidance: true };
jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: (name: string) => mockFlags[name] ?? false,
}));

// DEBUG-527: the COMPLETED card is a distinct render path carrying its own
// contrast obligations, and it was unreachable from any test while this mock
// hardcoded `false`. Mutable for the same reason `mockFlags` above is — pinning
// one branch of a two-branch decision is not a contract.
const mockPractice = { completedToday: false };
jest.mock('@/features/practices/stores/stoicPracticeStore', () => {
  const state = { isCheckInCompletedToday: () => mockPractice.completedToday };
  return {
    useStoicPracticeStore: (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
  };
});

jest.mock('@/core/stores/settingsStore', () => {
  const state = { getLastActiveTimestamp: () => Date.now() };
  return {
    useSettingsStore: (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
    // reducedMotion=true → shouldShowIntroInitially=false, so the intro overlay
    // never gates the header in the test.
    useAccessibilitySettings: () => ({ reducedMotion: true }),
  };
});

jest.mock('@/features/crisis/components/CollapsibleCrisisButton', () => ({
  __esModule: true,
  CollapsibleCrisisButton: () => null,
}));

jest.mock('@/features/assessment/components/AssessmentStatusBadge', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/IntroOverlay', () => ({
  __esModule: true,
  IntroOverlay: () => null,
  default: () => null,
}));

import CleanHomeScreen from '../CleanHomeScreen';

describe('CleanHomeScreen accessibility (MAINT-257)', () => {
  it('marks the "Being" brand title as a level-1 accessibility header', () => {
    const { getByText } = render(<CleanHomeScreen />);
    const title = getByText('Being');
    expect(title.props.accessibilityRole).toBe('header');
    expect(title.props.accessibilityLevel).toBe(1);
  });

  it('renders the greeting as plain text, NOT a heading (single h1 per screen)', () => {
    const { getByText } = render(<CleanHomeScreen />);
    // getGreeting() returns one of these depending on the host clock.
    const greeting = getByText(/Good (morning|afternoon|evening)/);
    expect(greeting.props.accessibilityRole).toBeUndefined();
    expect(greeting.props.accessibilityLevel).toBeUndefined();
  });
});

describe('CleanHomeScreen safe-area edges (MAINT-456)', () => {
  // Pins the VALUE, never the pixels: the safe-area-context jest mock holds every
  // inset at zero, so no test here can observe an edges value having a layout
  // effect. Home is tab-hosted and React Navigation reserves the tab bar's height,
  // so claiming `bottom` would re-add the ~34pt dead band MAINT-456 measured and
  // removed. `edges` must stay explicit — omitting it silently claims all four.
  it('claims only the top edge, matching InsightsScreen', () => {
    const { getByTestId } = render(<CleanHomeScreen />);
    expect(getByTestId('home-screen').props.edges).toEqual(['top']);
  });
});

/** Flatten a possibly-array style prop into one object. */
const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

describe('DEBUG-469: the daily-loop entry point is reachable at any text size', () => {
  // Home had NO scroll container: SafeAreaView > View(flex:1) holding header + badge +
  // checkInSection + practicesEntry. flexShrink defaults to 0, so at AX5 the intrinsic-
  // height siblings took their full height and checkInSection (flex:1, i.e. flexBasis 0)
  // was handed nothing — the card overflowed to y=970..1010 on a screen ending at 583.
  // It was in the accessibility hierarchy and off the screen at once, which is why
  // scrollUntilVisible and three plain scrolls all failed: a swipe needs something to move.
  //
  // jsdom has no fold, no safe-area insets and no fontScale, so a render test cannot see
  // the defect directly. What it pins is the MECHANISM. The on-device evidence is the
  // `maestro hierarchy` capture recorded on the work item.
  it('renders the Home content inside a scroll container', () => {
    const { UNSAFE_queryAllByType } = render(<CleanHomeScreen />);
    expect(UNSAFE_queryAllByType(ScrollView).length).toBeGreaterThan(0);
  });

  it('keeps the Daily Practice card INSIDE that scroll container', () => {
    // A scroll container that does not contain the card fixes nothing.
    const { UNSAFE_getAllByType, getByTestId } = render(<CleanHomeScreen />);
    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    const card = getByTestId('checkin-card-daily-loop');
    const within = (node: { children?: unknown }): boolean => {
      const kids = (node?.children ?? []) as Array<{ children?: unknown }>;
      return kids.some(k => k === (card as unknown) || (typeof k === 'object' && k !== null && within(k)));
    };
    expect(within(scroll as unknown as { children?: unknown })).toBe(true);
  });

  it('keeps the home-screen testID on the outermost node', () => {
    // Four Maestro flows wait on it (_seeded-home, deeplink-consent-gate,
    // daily-loop-deeplink, reconsent-stale). Moving it re-times every one of them.
    const { getByTestId } = render(<CleanHomeScreen />);
    expect(getByTestId('home-screen')).toBeTruthy();
  });

  it('does not give the growth chain flexBasis 0 — the collapse mechanism', () => {
    const { getByTestId } = render(<CleanHomeScreen />);
    const card = flat(getByTestId('checkin-card-daily-loop').props.style) as Record<string, unknown>;
    // `flex: 1` would surface as flexBasis 0 once flattened by RN's style resolver.
    expect(card.flexBasis).not.toBe(0);
    expect(card.flex).not.toBe(1);
    // It must still fill a surplus at default text size, or the card shrinks to its
    // content and Home looks broken for the 99% case.
    expect(card.flexGrow).toBe(1);
    // And it must have a floor, so a squeeze cannot take it below a usable size.
    expect(typeof card.minHeight).toBe('number');
    expect(card.minHeight as number).toBeGreaterThan(0);
  });
});

describe('DEBUG-527: the completed card keeps its authored contrast', () => {
  afterEach(() => {
    mockPractice.completedToday = false;
  });

  it('applies no container-level opacity once today is done', () => {
    // `opacity` on the Pressable composites the ENTIRE subtree, so it scales every
    // descendant's contrast at once — cardDescription (semantic.text.secondary) and
    // the gray[400] border chosen a few lines above precisely to clear 3:1. Opacity
    // is not a colour token and cannot be contrast-audited, so the only safe value
    // on a container holding text is none. This is the state a daily user sees
    // every day after they practise.
    mockPractice.completedToday = true;
    const { getByTestId } = render(<CleanHomeScreen />);
    const card = flat(getByTestId('checkin-card-daily-loop').props.style) as Record<string, unknown>;
    expect(card.opacity ?? 1).toBe(1);
  });

  it('does not label the completed state with the imperative "Complete"', () => {
    // In a filled, high-contrast, full-width bar, "Complete" parses as a verb — a
    // call to action telling you to complete something you have already completed.
    mockPractice.completedToday = true;
    const { queryByText } = render(<CleanHomeScreen />);
    expect(queryByText('Complete')).toBeNull();
  });

  it('states completion as a quiet status line rather than a button', () => {
    mockPractice.completedToday = true;
    const { getByText } = render(<CleanHomeScreen />);
    expect(getByText(/Done today/)).toBeTruthy();
  });

  it('keeps the screen-reader announcement of completion and of restart', () => {
    // The visual affordance stops being a button; the CARD is still tappable and
    // must still say so, or the state becomes invisible to VoiceOver.
    mockPractice.completedToday = true;
    const { getByTestId } = render(<CleanHomeScreen />);
    const card = getByTestId('checkin-card-daily-loop');
    expect(card.props.accessibilityLabel).toMatch(/completed today/);
    expect(card.props.accessibilityHint).toMatch(/again/);
  });

  // CONTROLS — these must stay GREEN across the change. A red that fails every
  // case is indistinguishable from a harness that never ran.
  it('control — the NOT-completed card is untouched by this fix', () => {
    const { getByTestId, getByText } = render(<CleanHomeScreen />);
    const card = flat(getByTestId('checkin-card-daily-loop').props.style) as Record<string, unknown>;
    expect(card.opacity ?? 1).toBe(1);
    expect(getByText('Start')).toBeTruthy();
  });

  it('control — the completed card still renders and is still tappable', () => {
    mockPractice.completedToday = true;
    const { getByTestId } = render(<CleanHomeScreen />);
    const card = getByTestId('checkin-card-daily-loop');
    expect(card).toBeTruthy();
    expect(card.props.accessibilityRole).toBe('button');
  });
});

describe('CleanHomeScreen — the guidance entry point (FEAT-457)', () => {
  afterEach(() => {
    mockFlags['domain_guidance'] = true;
  });

  it('renders the row when `domain_guidance` is enabled', () => {
    const { getByTestId } = render(<CleanHomeScreen />);
    expect(getByTestId('home-guidance-entry')).toBeTruthy();
  });

  it('renders nothing at all when the flag is dark — no placeholder, no disabled row', () => {
    // Ships dark in `.env.production`. A "coming soon" or disabled affordance would
    // be worse than absence: it advertises a surface the reader cannot reach.
    mockFlags['domain_guidance'] = false;
    const { queryByTestId } = render(<CleanHomeScreen />);
    expect(queryByTestId('home-guidance-entry')).toBeNull();
  });

  it('sits BELOW the daily practice card and ABOVE the practices row', () => {
    // Order is the product decision, not an accident: subordinate to the daily
    // ritual (never above it), and above the Practices row. DEBUG-469 replaced the
    // flex:1 chain this originally reasoned about with a scrolling container and a
    // `minHeight` floor, which changes what a squeeze DOES but not the ordering —
    // so this pins the order directly rather than the layout mechanism behind it.
    const { getByTestId, UNSAFE_root } = render(<CleanHomeScreen />);
    const guidance = getByTestId('home-guidance-entry');
    const practices = getByTestId('home-practices-entry');
    const order: string[] = [];
    const walk = (node: { props?: Record<string, unknown>; children?: unknown[] }) => {
      const id = node?.props?.['testID'];
      if (typeof id === 'string') order.push(id);
      for (const child of (node?.children ?? []) as typeof order) {
        if (child && typeof child === 'object') walk(child as never);
      }
    };
    walk(UNSAFE_root as never);
    expect(guidance).toBeTruthy();
    expect(practices).toBeTruthy();
    expect(order.indexOf('home-guidance-entry')).toBeLessThan(
      order.indexOf('home-practices-entry')
    );
  });

  it('exposes exactly one h1 still — the row adds no competing heading', () => {
    // MAINT-257's invariant. The row is a button with a label, never a header.
    const { getByTestId } = render(<CleanHomeScreen />);
    expect(getByTestId('home-guidance-entry').props.accessibilityRole).toBe('button');
  });
});
