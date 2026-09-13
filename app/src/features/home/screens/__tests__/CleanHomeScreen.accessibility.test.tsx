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
import fs from 'fs';
import path from 'path';
import { spacing } from '@/core/theme';
import { intersectsCrisisButtonExclusion } from '@/features/crisis/constants/crisisButtonGeometry';

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

  // MAINT-528 REWROTE this test rather than deleting it. The INVARIANT is unchanged and
  // still DEBUG-469's: the card must be reachable at AX5, which requires that nothing in
  // the tree competes for vertical space. Only the MECHANISM changed. DEBUG-469 satisfied
  // it with `flexGrow: 1` + a `minHeight` floor — a card that grows into surplus and is
  // stopped from collapsing below 180. MAINT-528 removes the growth entirely: with no
  // grower, there is no flexBasis-0 collapse to guard against, and the surplus lands
  // BELOW the last element instead of inside the card.
  //
  // Deleting it would have silently dropped the regression coverage for a defect that
  // made the daily loop completely unenterable at accessibility text sizes.
  it('lets nothing inside the content container grow — the collapse cannot recur', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(<CleanHomeScreen />);

    // The container itself MUST still grow: it is what makes the content fill the
    // viewport at default size, and `flexGrow` (never `flex: 1`) is what keeps it free
    // to exceed the viewport at AX5 so the ScrollView engages.
    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    const content = flat(scroll.props.contentContainerStyle) as Record<string, unknown>;
    expect(content.flexGrow).toBe(1);
    expect(content.flex).toBeUndefined();
    expect(content.flexBasis).not.toBe(0);

    // ...and nothing INSIDE it may grow. A single grower re-creates the competition
    // DEBUG-469 diagnosed; at AX5 it is handed nothing and collapses.
    const card = flat(getByTestId('checkin-card-daily-loop').props.style) as Record<string, unknown>;
    expect(card.flexGrow).toBeUndefined();
    expect(card.flex).toBeUndefined();
    expect(card.flexBasis).not.toBe(0);
    // The floor existed only to bound a squeeze. With no squeeze, a floor would just be
    // a magic number forcing the card past its own content.
    expect(card.minHeight).toBeUndefined();
  });

  it('adds no spacer or wrapper node — the surplus falls out of flex-start', () => {
    // A `<View style={{flexGrow:1}}/>` spacer would also work, but it is a new node in
    // the XCUITest hierarchy and therefore a new DEBUG-465 surface. The surplus should
    // come from `justifyContent` defaulting to flex-start, costing zero nodes.
    const { getByTestId } = render(<CleanHomeScreen />);
    const card = flat(getByTestId('checkin-card-daily-loop').props.style) as Record<string, unknown>;
    // `space-between` on the card is what stranded the button 300pt below its own text.
    expect(card.justifyContent).toBeUndefined();
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

/**
 * DEBUG-548: the card announces what the practice IS, not only its name and length.
 *
 * `Pressable` defaults `accessible` to true, which collapses the subtree into one
 * element, so the explicit `accessibilityLabel` WINS and the visible
 * `cardDescription` child is never read. The description reached sighted users only.
 *
 * The accessibility ruling (recorded on the work item) is that this is a PARITY
 * defect, not a WCAG conformance failure — 4.1.2 is met as authored, 1.3.1 is
 * credible but not airtight, 2.5.3 is met, and 3.1.4 is AAA and outside the AA
 * target. What decides it is that the description is the ONLY text on the card
 * saying what the practice consists of, and FEAT-298 collapsed the section to a
 * SINGLE card, so the usual list-scanning objection to a longer name does not apply.
 *
 * The duration badge is ruled the OTHER way and stays unexposed: the label already
 * carries "5-6 min" in prose, so announcing the badge too would double-speak it.
 */
describe('DEBUG-548: the card announces what the practice is', () => {
  afterEach(() => {
    mockPractice.completedToday = false;
  });

  const CEILING = 120;

  it('carries the visible description in the announcement, derived not hardcoded', () => {
    const { getByTestId } = render(<CleanHomeScreen />);
    const described = getByTestId('checkin-card-description').props.children as string;

    // MATCHER-FIRES CONTROL (DEBUG-390): a derived string that silently resolved to
    // '' would make the assertion below true of ANY label, forever. Prove the
    // matcher has something real to match before trusting it.
    expect(typeof described).toBe('string');
    expect(described.length).toBeGreaterThan(10);

    expect(getByTestId('checkin-card-daily-loop').props.accessibilityLabel)
      .toContain(described);
  });

  it('keeps the duration in prose, so the muted badge loses nothing', () => {
    // The badge is deliberately unexposed. That is only safe while the LABEL
    // carries the duration — this pair is the ruling, in executable form.
    const { getByTestId, getByText } = render(<CleanHomeScreen />);
    expect(getByTestId('checkin-card-daily-loop').props.accessibilityLabel)
      .toMatch(/5-6 min/);
    expect(getByText('5-6 min').props.importantForAccessibility).toBe('no');
  });

  it('keeps BOTH the completion clause and the description when completed', () => {
    // Catches a half-applied fix that only ever touched the pending template.
    mockPractice.completedToday = true;
    const { getByTestId } = render(<CleanHomeScreen />);
    const described = getByTestId('checkin-card-description').props.children as string;
    const label = getByTestId('checkin-card-daily-loop').props.accessibilityLabel as string;

    expect(label).toMatch(/completed today/);
    expect(label).toContain(described);
  });

  it('announces status before the static description', () => {
    // A returning daily user is listening for the status; a new user needs the
    // prose. Status first serves the former at no cost to the latter, because on
    // the pending path the status clause is empty and the orders coincide.
    mockPractice.completedToday = true;
    const { getByTestId } = render(<CleanHomeScreen />);
    const described = getByTestId('checkin-card-description').props.children as string;
    const label = getByTestId('checkin-card-daily-loop').props.accessibilityLabel as string;

    expect(label.indexOf('completed today')).toBeLessThan(label.indexOf(described));
  });

  it.each([
    ['pending', false],
    ['completed', true],
  ])('keeps the %s announcement under the length ceiling', (_name, completed) => {
    // THE CONDITION UNDER WHICH THE RULING HOLDS. Including the description is
    // correct only while it stays short; the pre-MAINT-528 copy was a 134-char
    // enumeration that would have made the announcement unusable. The visible text
    // has `numberOfLines={2}` to clamp it — the announcement has no such clamp, so
    // this assertion is it.
    mockPractice.completedToday = completed as boolean;
    const { getByTestId } = render(<CleanHomeScreen />);
    const label = getByTestId('checkin-card-daily-loop').props.accessibilityLabel as string;
    expect(label.length).toBeLessThanOrEqual(CEILING);
  });

  it('does not duplicate the description into the hint', () => {
    // The description belongs in the NAME, where it cannot be switched off —
    // hints are user-disableable. Doubling it produces the long-name-plus-long-hint
    // failure mode the ruling exists to avoid.
    const { getByTestId } = render(<CleanHomeScreen />);
    const described = getByTestId('checkin-card-description').props.children as string;
    expect(getByTestId('checkin-card-daily-loop').props.accessibilityHint)
      .not.toContain(described);
  });
});

/**
 * DEBUG-547: the Practices row's FRAME clears the crisis FAB's exclusion region.
 *
 * The crisis FAB carries `zIndex: 9999`, so in any overlap it takes the tap — a
 * user reaching for "Explore ›" at the row's right end reached CrisisResources
 * instead of PracticeLibrary. Measured on device (iPhone SE 3, 375x667):
 *
 *   crisis-button-root    [331,523][375,567]
 *   home-practices-entry  [24,516][351,561]      overlapping on BOTH axes
 *
 * WHY marginRight AND NOT paddingRight
 *
 * The filed fix was `paddingRight`. It cannot work, and the tests below are
 * shaped to make that unmissable: `testID="home-practices-entry"` and
 * `styles.practicesEntry` are on the SAME Pressable, so padding sits INSIDE its
 * border box. The frame stays [24..351], the FAB keeps winning the tap, and only
 * the glyph moves. Every cited precedent pads a non-interactive WRAPPER around
 * the control — the inverted topology.
 *
 * WHAT THESE TESTS CANNOT DO
 *
 * jsdom has no layout engine, so the frame is COMPUTED from tokens rather than
 * measured. Falsifying the value 72 on a real device is Maestro's job, and the
 * flow must use a POINT tap in the contested column — `tapOn: id:` hits the
 * element centre (x~151 after the fix) and passes on the UNFIXED build.
 */
describe('DEBUG-547: the Practices row clears the crisis FAB exclusion region', () => {
  const SCREEN_SRC = fs.readFileSync(
    path.join(__dirname, '../CleanHomeScreen.tsx'),
    'utf-8'
  );

  /**
   * The stylesheet block for one named style, COMMENT-STRIPPED.
   *
   * The stripping is load-bearing, not tidiness (DEBUG-390). This codebase
   * deliberately names anti-patterns in prose to warn the next reader off them —
   * the block below says "Must NOT be `paddingRight`" and warns about a
   * `marginHorizontal` override — so a bare `not.toContain('paddingRight')`
   * matches the WARNING and fails on correct code. The assertions are about what
   * the file DOES, so they must read only executable text.
   */
  const styleBlock = (name: string): string => {
    const start = SCREEN_SRC.indexOf(`  ${name}: {`);
    if (start === -1) throw new Error(`style "${name}" not found in CleanHomeScreen`);
    return SCREEN_SRC.slice(start, SCREEN_SRC.indexOf('\n  },', start))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
  };

  it('sets the inset on the SAME element that carries the testID', () => {
    // THE ASSERTION THE FILED FIX WOULD FAIL. `paddingRight` here would leave the
    // frame — and therefore the tap target — exactly where it was.
    const { getByTestId } = render(<CleanHomeScreen />);
    const style = flat(getByTestId('home-practices-entry').props.style) as Record<string, unknown>;
    expect(style.marginRight).toBe(72);
    expect(style.paddingRight).toBeUndefined();
  });

  it('uses the DERIVED constant, not a fourth hand-copied literal', () => {
    // crisisButtonGeometry already derives 72 as size(44) + hitSlop(12) +
    // clearance(16). A local `spacing[72]` would silently stop tracking the FAB
    // if any of those three ever moved.
    expect(styleBlock('practicesEntry')).toContain('marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left');
    expect(SCREEN_SRC).toMatch(/from '@\/features\/crisis\/constants\/crisisButtonGeometry'/);
  });

  it('declares the inset LAST — RN StyleSheet is last-key-wins', () => {
    const block = styleBlock('practicesEntry');
    // `marginHorizontal` is the one key that could silently override the right
    // inset, so its ABSENCE is the contract, not merely today's shape.
    expect(block).not.toMatch(/marginHorizontal\s*:/);
    expect(block.indexOf('marginRight:')).toBeGreaterThan(block.indexOf('marginTop:'));
  });

  it('ANTI-REGRESSION: reverting to paddingRight red-lines here', () => {
    expect(styleBlock('practicesEntry')).not.toMatch(/paddingRight\s*:/);
  });

  it('the computed frame is disjoint from the exclusion region, flag DARK and LIT', () => {
    const { getByTestId } = render(<CleanHomeScreen />);
    const inset = (flat(getByTestId('home-practices-entry').props.style) as Record<string, number>)
      .marginRight;
    const width = 375 - spacing[24] - inset - spacing[24];
    // y=516 is the measured resting position with domain_guidance DARK; y=591 is
    // where the row lands once the guidance row above it renders. The FAB's band
    // covers the second, which is why both are asserted.
    for (const y of [516, 591]) {
      expect(
        intersectsCrisisButtonExclusion(
          { x: spacing[24], y, width, height: 45 },
          { width: 375, height: 667 }
        )
      ).toBe(false);
    }
  });

  it('PROOF OF LIVENESS — these matchers can still go red (DEBUG-390)', () => {
    // A source-shape assertion plus a narrow matcher is exactly the combination
    // that can silently match nothing at all. Prove each instrument fires.
    expect(() => styleBlock('noSuchStyleBlock')).toThrow(/not found/);
    expect(SCREEN_SRC.length).toBeGreaterThan(1000);
    // Comment-stripping plus a narrow regex is the combination that can silently
    // match NOTHING. Prove the stripped block still has executable content, and
    // that it really did lose the prose naming the anti-patterns.
    const stripped = styleBlock('practicesEntry');
    expect(stripped).toMatch(/marginRight\s*:/);
    expect(stripped).not.toContain('Must NOT be');
    // and the prop-shaped matchers fire against known-bad literals
    expect('  paddingRight: 72,').toMatch(/paddingRight\s*:/);
    expect('  marginHorizontal: spacing[24],').toMatch(/marginHorizontal\s*:/);
    // the arithmetic assertion above is not vacuous: at inset 0 it must be TRUE
    expect(
      intersectsCrisisButtonExclusion(
        { x: spacing[24], y: 516, width: 375 - spacing[24] * 2, height: 45 },
        { width: 375, height: 667 }
      )
    ).toBe(true);
  });
});
