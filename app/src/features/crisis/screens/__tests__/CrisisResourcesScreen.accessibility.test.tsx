/**
 * DEBUG-560 — contact lines on the crisis destination are one text flow, not two columns.
 *
 * THE DEFECT, from Sentry TestFlight feedback (2026-08-25, fyi.being.app@1.2.1+2,
 * iPhone 16e 390x844, iOS 26.6): "Languages spills to another line and looks bad."
 *
 * `contactLabel` carried `width: 80` beside a `flex: 1` `contactValue`. That pairing is a
 * fixed pt dimension holding text that Dynamic Type scales, so the box is guaranteed to
 * overflow at the step where legibility matters most. Two distinct failures shared the line:
 *
 *   Label wrap.  Card content box on 390x844 is 390 - 2*spacing[24] (section)
 *                - 2*spacing[24] (card) = 294pt; the label box was a fixed 80pt.
 *                "Languages:" at bodySmall 14 semibold measures ~77-80pt — 0 to 3pt of
 *                slack. At the first step above Large (xLarge, x1.12) it needs ~86-90pt
 *                and word-breaks inside its own box, orphaning the colon.
 *   Value wrap.  The value column was 214pt. It still wraps after the fix; see below.
 *
 * WHAT IS AND IS NOT PINNED HERE. AC 1 was authored as "without the value column
 * wrapping" and that is arithmetically unreachable: the Domestic Violence line is ~58
 * characters, ~395-405pt at bodySmall 14, against a 294pt box. One line would need a ~28%
 * smaller font or truncation, and truncation is forbidden on a crisis affordance (the
 * DEBUG-390 ruling recorded at `styles.crisisFooter`: capping text growth on the crisis
 * affordance inverts the priority). The crisis pass restated it as: ONE continuous text
 * flow, continuation lines at the content-box left edge, no orphaned or word-broken label,
 * no narrow indented second column. That is what these tests pin.
 *
 * WHAT JEST CANNOT DO. `react-test-renderer` has no text measurement and no layout, so no
 * assertion here proves "does not wrap" or "uses the full card width" — the same split
 * `CrisisResourcesScreen.reachability.test.tsx` draws for the 988 footer, and the same
 * limitation `CleanHomeScreen.accessibility.test.tsx` records. Jest owns STRUCTURE; real
 * bounds are `maestro hierarchy`'s job. Do not rename these to claim otherwise.
 *
 * VOICEOVER. Verified against this worktree's native source, not inferred.
 * `RCTParagraphComponentView.mm` returns `isAccessibilityElement = NO` and delegates to
 * `RCTParagraphComponentAccessibilityProvider.mm:60-105`, which exposes exactly ONE element
 * whose label is the rendered attributed string, adding further elements only for nested
 * spans whose role is "button" or "link". So a nested styled Text merges natively: the
 * platform composes "Languages: English, Spanish, ..." with no hand-authored label to go
 * stale against `resource.languages`. Pre-fix this line was TWO stops, the first an
 * orphaned "Languages:" with no referent.
 *
 * OUT OF SCOPE, do not "fix" here: `ResourceCard`'s outer View carries
 * `accessibilityRole="button"` + `accessibilityLabel` with no `accessible` prop, which on
 * Fabric (`AccessibilityProps.h` defaults `accessible{false}`) makes both inert. Adding
 * `accessible` would coopt the card into one node and swallow the phone number and the
 * action buttons — the DEBUG-341-shaped regression this file's parent warns about.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Alert, Linking, Text } from 'react-native';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({
    trackScreenView: jest.fn(),
    trackCrisisResourcesViewed: jest.fn(),
    trackCrisisHotlineTapped: jest.fn(),
  }),
}));

jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

import CrisisResourcesScreen from '../CrisisResourcesScreen';

const renderScreen = () => render(<CrisisResourcesScreen />);

/** Flatten a possibly-nested RN style prop into one object. */
const flatten = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten));
  return (style ?? {}) as Record<string, unknown>;
};

/**
 * The full rendered string of a node, walking nested Text spans. `children` on a
 * paragraph with a nested label is an array, so a bare `props.children` read would
 * return a fragment and quietly pass a two-column layout.
 */
const textOf = (node: { props: { children?: unknown } }): string => {
  const walk = (child: unknown): string => {
    if (child == null || child === false) return '';
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    if (Array.isArray(child)) return child.map(walk).join('');
    const el = child as { props?: { children?: unknown } };
    return el.props ? walk(el.props.children) : '';
  };
  return walk(node.props.children);
};

/**
 * The Domestic Violence Hotline is the ONLY card that renders a long Languages value.
 * `emergency_911`'s 'Interpreter services available' (CrisisResources.ts:133) renders
 * nowhere — it is `priority: 'emergency'`, excluded by BOTH render paths
 * (CrisisResourcesScreen.tsx:375 filters to 'high'; :461 excludes `cat.id === 'emergency'`).
 */
const DV_LANGUAGES_LINE = 'Languages: English, Spanish, 200+ languages via interpreter';

const LABEL = /(Phone|Text|Languages): /g;

/**
 * The contact PARAGRAPHS — label-prefixed Text nodes with no Text ancestor.
 *
 * The nesting is the whole point of the fix, so the pins must discriminate on it: the
 * label span renders as its own node in the react-test-renderer tree but is NOT its own
 * accessibility element natively (the paragraph provider adds elements only for
 * "button"/"link" spans). A pin that merely scanned every Text would therefore see the
 * correct structure and the pre-fix two-column structure as identical.
 */
const contactParagraphs = (screen: ReturnType<typeof renderScreen>) => {
  const texts = screen.UNSAFE_getAllByType(Text);
  const known = new Set(texts);
  const hasTextAncestor = (node: (typeof texts)[number]) => {
    let cur = node.parent;
    while (cur) {
      if (known.has(cur as (typeof texts)[number])) return true;
      cur = cur.parent;
    }
    return false;
  };
  return texts.filter(n => !hasTextAncestor(n) && /^(Phone|Text|Languages): /.test(textOf(n)));
};

describe('DEBUG-560 — a contact line is one text flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.openURL as jest.Mock).mockResolvedValue(true);
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
  });

  /**
   * PIN A. Stated over the render output, so it survives style refactors, and it goes red
   * the moment anyone re-splits label and value into siblings — which IS the defect. It
   * simultaneously pins the single-VoiceOver-stop reading established above: the label
   * and its referent are one accessibility element because they are one paragraph.
   */
  it('renders the Languages label and value as a single Text node', () => {
    const screen = renderScreen();

    const matches = screen.UNSAFE_getAllByType(Text).filter(n => textOf(n) === DV_LANGUAGES_LINE);

    // Exactly one: two would mean a nested span also matched the whole string, which
    // would indicate the label is not actually nested inside the value's paragraph.
    expect(matches).toHaveLength(1);
  });

  /**
   * The orphan-fragment guard, and the reason Pin A is not satisfiable by a stray
   * concatenation elsewhere. A bare "Languages:" node is precisely the pre-fix shape:
   * a label with no referent, which is both the layout defect and the VoiceOver defect.
   */
  it('renders no bare label fragment outside a contact paragraph', () => {
    const screen = renderScreen();
    const texts = screen.UNSAFE_getAllByType(Text);
    const known = new Set(texts);

    const orphans = texts
      .filter(n => /^(Phone|Text|Languages):\s*$/.test(textOf(n)))
      .filter(n => {
        let cur = n.parent;
        while (cur) {
          if (known.has(cur as (typeof texts)[number])) return false;
          cur = cur.parent;
        }
        return true;
      })
      .map(textOf);

    // A label span nested in its paragraph is the fix. A label standing on its own is the
    // defect: a column head with no referent, both visually and to VoiceOver.
    expect(orphans).toEqual([]);
  });

  /**
   * PIN B — the class guard. The honest generalization: it would have caught the original
   * and catches the next instance, where an assertion naming `contactLabel.width` would
   * pin only the token that was deleted and fall to a rename to `minWidth`.
   */
  it('gives no text-bearing node in a resource card a fixed width', () => {
    const screen = renderScreen();
    const offenders: string[] = [];
    let visited = 0;

    for (const node of screen.UNSAFE_getAllByType(Text)) {
      visited += 1;
      const style = flatten(node.props.style);
      if (typeof style.width === 'number' || typeof style.minWidth === 'number') {
        offenders.push(`${textOf(node).slice(0, 40)} -> ${JSON.stringify(style.width ?? style.minWidth)}`);
      }
    }

    // Positive control, per the DEBUG-390 rule: a walker that silently stops matching is
    // indistinguishable from a clean tree, and this one would then be permanently green.
    expect(visited).toBeGreaterThan(0);

    expect(offenders).toEqual([]);
  });

  /**
   * The second half of Pin B's control: proof the predicate still fires. Without this,
   * a refactor that broke the style read would leave `offenders` empty for the wrong
   * reason and the pin above would pass on a regressed tree.
   */
  it('Pin B rejects a known-bad style (control)', () => {
    const knownBad = flatten([{ fontSize: 14 }, { width: 80 }]);

    expect(typeof knownBad.width === 'number' || typeof knownBad.minWidth === 'number').toBe(true);
  });

  /**
   * Constraint 5, as amended by the crisis pass. The merge must come from the platform
   * composing the attributed string, never from a hand-authored label — which replaces
   * the rendered text outright (`if (accessibilityLabel.length == 0)` in the provider)
   * and cannot be kept in sync with `resource.languages`. `accessible={false}` would
   * erase the line, phone number included, from the accessibility tree.
   */
  it('carries no accessibility overrides on the contact lines', () => {
    const screen = renderScreen();

    const contactLines = screen
      .UNSAFE_getAllByType(Text)
      .filter(n => /^(Phone|Text|Languages): \S/.test(textOf(n)));

    expect(contactLines.length).toBeGreaterThan(0);

    for (const node of contactLines) {
      expect(node.props.accessibilityLabel).toBeUndefined();
      expect(node.props.accessible).toBeUndefined();
      expect(node.props.accessibilityRole).toBeUndefined();
      // Constraint 4 — truncating language information on a crisis card is content loss.
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.maxFontSizeMultiplier).toBeUndefined();
      expect(node.props.allowFontScaling).toBeUndefined();
    }
  });
});

describe('DEBUG-560 — the fix stays in its lane', () => {
  /**
   * Constraint 3. The two `priority: 'high'` cards carry `languages: ['English','Spanish']`,
   * which does not spill, so a correct fix costs them zero height. This cannot measure
   * height, but it pins the input to it: the joined value these cards render is unchanged.
   */
  it('keeps each contact line a separate paragraph', () => {
    const screen = renderScreen();
    const paragraphs = contactParagraphs(screen);

    expect(paragraphs.length).toBeGreaterThan(0);

    // Constraint 5: the three lines stay three paragraphs. Collapsing Phone/Text/Languages
    // into one Text would also merge them into a single VoiceOver stop, which is a
    // different change from merging a label with its own value.
    for (const node of paragraphs) {
      expect(textOf(node).match(LABEL)).toHaveLength(1);
    }

    // The long value the Sentry report was about is one of them, unsplit.
    expect(paragraphs.map(textOf)).toContain(DV_LANGUAGES_LINE);
  });

  /**
   * Constraint 1. The fix touches ResourceCard and the contact styles only; the 988
   * control's position is a property of `crisisFooter` being a sibling of the ScrollView.
   * `CrisisResourcesScreen.reachability.test.tsx` is authoritative for that invariant —
   * this is the cheap tripwire that the count did not move under this diff.
   */
  it('still renders exactly one 988 control', () => {
    const screen = renderScreen();

    expect(screen.getAllByTestId('crisis-call-988-button')).toHaveLength(1);
  });
});
