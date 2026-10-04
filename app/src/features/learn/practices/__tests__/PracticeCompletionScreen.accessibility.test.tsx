/**
 * DEBUG-678 — the completion title breaks between words, never inside one, at AX sizes.
 *
 * Observed on a Release build at AX5 (402x874): "Practic / e Comple / te". headline2 is
 * 28pt semibold, ×3.571 at AX5 ≈ 100pt, and the title box is W − 2·spacing[24]. Each of
 * the two words is wider than that box on every iPhone width, so no padding fixes it.
 *
 * Accessibility ruled T2 (recorded on DEBUG-678): cap the TITLE only, at the AX5 endpoint
 * of iOS's own Title 1 ramp (28 → 58pt). That is DEBUG-629's category: a fixed string
 * that carries no state (the checkmark, the announcement and the uncapped practice name
 * all say the same thing), where a cap ≥ 2.0 IS WCAG 1.4.4 conformance. It is NOT
 * DEBUG-619's practice-name title, which is never capped, and it is no precedent for
 * the quote, the practice name or the educational copy, which are content.
 *
 * Jest has no text layout, so the width budget below is arithmetic over a CoreText
 * estimate (SF Pro semibold advances). The on-device proof is DEBUG-678 AC2.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import PracticeCompletionScreen, {
  PRACTICE_COMPLETION_TITLE_MAX_FONT_SCALE,
  PRACTICE_QUOTES,
} from '@/features/learn/practices/PracticeCompletionScreen';
import { spacing, typography } from '@/core/theme';
import type { ModuleId } from '@/features/learn/types/education';

const MODULE: ModuleId = 'interconnected-living';
const TITLE = 'Practice Complete';

/** RN's iOS content-size multipliers (RCTAccessibilityManager). */
const AX4_FONT_SCALE = 3.143;
const AX5_FONT_SCALE = 3.571;

/** iOS Title 1 at its default size and at AX5. */
const IOS_TITLE1_DEFAULT_PT = 28;
const IOS_TITLE1_AX5_PT = 58;

/** "Complete", the wider title word, in em at SF Pro semibold (CoreText estimate). */
const COMPLETE_EM = 4.358;

/** The title box on the narrowest supported iPhone (375pt wide). */
const NARROWEST_TITLE_BOX_PT = 375 - 2 * spacing[24];

function renderScreen() {
  const quote = Object.values(PRACTICE_QUOTES)[0];
  return render(
    <PracticeCompletionScreen
      practiceTitle="Breathing Space"
      quote={quote}
      moduleId={MODULE}
      onContinue={() => {}}
    />
  );
}

describe('PRACTICE_COMPLETION_TITLE_MAX_FONT_SCALE', () => {
  it('is above 1, so iOS honours it (DEBUG-579)', () => {
    expect(PRACTICE_COMPLETION_TITLE_MAX_FONT_SCALE).toBeGreaterThan(1);
  });

  it('is at least WCAG 1.4.4\'s 200%', () => {
    expect(PRACTICE_COMPLETION_TITLE_MAX_FONT_SCALE).toBeGreaterThanOrEqual(2);
  });

  it('never renders the title below iOS\'s own Title 1 at AX5', () => {
    expect(PRACTICE_COMPLETION_TITLE_MAX_FONT_SCALE).toBeGreaterThanOrEqual(
      IOS_TITLE1_AX5_PT / IOS_TITLE1_DEFAULT_PT
    );
  });

  it('keeps "Complete" inside the narrowest title box at the cap', () => {
    const cappedPt = typography.headline2.size * PRACTICE_COMPLETION_TITLE_MAX_FONT_SCALE;
    expect(COMPLETE_EM * cappedPt).toBeLessThanOrEqual(NARROWEST_TITLE_BOX_PT);
  });

  it('control: uncapped, "Complete" overflows that box at AX4 and AX5', () => {
    // If this ever goes green-to-red the budget above has stopped meaning anything:
    // the defect would no longer reproduce, so the cap would be guarding nothing.
    for (const scale of [AX4_FONT_SCALE, AX5_FONT_SCALE]) {
      expect(COMPLETE_EM * typography.headline2.size * scale).toBeGreaterThan(
        NARROWEST_TITLE_BOX_PT
      );
    }
  });
});

describe('PracticeCompletionScreen title', () => {
  it('carries the cap', () => {
    const { getByText } = renderScreen();
    expect(getByText(TITLE).props.maxFontSizeMultiplier).toBe(
      PRACTICE_COMPLETION_TITLE_MAX_FONT_SCALE
    );
  });

  it('wraps rather than shrinking or truncating', () => {
    expectWrapsAndScales(renderScreen().getByText(TITLE).props);
  });

  it('is still the screen\'s header, with its wording unchanged', () => {
    expect(renderScreen().getByText(TITLE).props.accessibilityRole).toBe('header');
  });
});

describe('content text wraps and is never capped, shrunk or truncated (ruling in the screen header)', () => {
  it('the practice name, quote, attribution, copy and Continue label all scale freely', () => {
    const { UNSAFE_getAllByType } = renderScreen();
    const others = UNSAFE_getAllByType(Text).filter((node) => node.props.children !== TITLE);

    // Positive control: the sweep must actually reach the content it is protecting.
    const rendered = others.map((node) => JSON.stringify(node.props.children));
    expect(rendered.some((c) => c.includes('Breathing Space'))).toBe(true);
    expect(rendered.some((c) => c.includes('Continue'))).toBe(true);
    expect(rendered.some((c) => c.includes('Each time you practice'))).toBe(true);

    for (const node of others) {
      expect(node.props.maxFontSizeMultiplier).toBeUndefined();
      expectWrapsAndScales(node.props);
    }
  });

  it('no quote word is longer than 13 characters, the width the AX2 bar was measured for', () => {
    // The bar is whole words through AX2 on 375pt. The quote box there is 291pt
    // (327 − 2·16 padding − 4 border) and quote text is bodyLarge italic × 2.143 ≈ 38.6pt, so
    // a word may be up to 7.54em. Jest has no font metrics, so this guards by length:
    // "perturbations" is 5.82em, and the widest realistic 13-character word tried,
    // "commonwealths", is 7.04em. A longer word in a new quote must be re-measured.
    const tokens = Object.values(PRACTICE_QUOTES).flatMap((q) => `"${q.text}"`.split(/\s+/));
    expect(tokens.length).toBeGreaterThan(100); // control: the sweep reached the corpus
    const tooLong = tokens.filter((t) => t.length > 13);
    expect(tooLong).toEqual([]);
  });
});

/**
 * DEBUG-683 — the root ScrollView was `accessible`, which collapses its whole subtree into one
 * VoiceOver / XCUITest element. MEASURED 2026-10-02: `maestro hierarchy` showed the screen as a
 * single node, with Continue absent. Continue is the only exit on five gestureEnabled:false
 * routes, so the only other focusable control was the crisis button.
 *
 * RNTL's role queries do not model that collapse, so the pin walks the rendered tree instead.
 * It starts above the Pressable COMPOSITE: the host Views under it are `accessible` by default
 * and are Continue itself, not an ancestor that hides it. Every node carrying Continue's testID
 * is Continue, so the walk begins at the first node that does not.
 */
type RenderedNode = {
  parent: RenderedNode | null;
  props: Record<string, unknown>;
  type: unknown;
};

const CONTINUE_ID = 'practice-completion-screen-continue-button';

function aboveControl(node: RenderedNode, testID: string): RenderedNode | null {
  let current: RenderedNode | null = node;
  while (current && current.props.testID === testID) current = current.parent;
  return current;
}

/** Named, never the nodes themselves: a node's `parent` chain is circular and a failing
 *  `toEqual` would try to print it whole, aborting the jest worker instead of reporting. */
function accessibleAncestors(start: RenderedNode | null): string[] {
  const hits: string[] = [];
  for (let node = start; node; node = node.parent) {
    if (node.props.accessible) hits.push(describeNode(node));
  }
  return hits;
}

function describeNode(node: RenderedNode): string {
  const type = node.type as string | { displayName?: string; name?: string };
  const name = typeof type === 'string' ? type : type.displayName ?? type.name ?? '?';
  return `${name}#${String(node.props.testID ?? '')}`;
}

/** Props that remove a subtree from the accessibility tree outright. */
function hidesSubtree(props: Record<string, unknown>): boolean {
  return (
    Boolean(props.accessibilityViewIsModal) ||
    Boolean(props.accessibilityElementsHidden) ||
    props.importantForAccessibility === 'no' ||
    props.importantForAccessibility === 'no-hide-descendants'
  );
}

describe('DEBUG-683: Continue is its own accessibility element', () => {
  it('no ancestor of Continue is an accessibility element', () => {
    const cont = renderScreen().getByTestId(CONTINUE_ID) as unknown as RenderedNode;
    const start = aboveControl(cont, CONTINUE_ID);
    expect(start).not.toBeNull(); // control: the walk has somewhere to start
    expect(accessibleAncestors(start)).toEqual([]);
  });

  it('control: the same walker finds an accessible ancestor when one exists', () => {
    const { getByTestId } = render(
      <View accessible>
        <View>
          <Pressable testID="fixture" accessibilityRole="button" onPress={() => {}} />
        </View>
      </View>
    );
    const fixture = getByTestId('fixture') as unknown as RenderedNode;
    expect(accessibleAncestors(aboveControl(fixture, 'fixture'))).not.toEqual([]);
  });

  it('hides no subtree from assistive technology', () => {
    const { UNSAFE_root } = renderScreen();
    const nodes = UNSAFE_root.findAll(() => true);
    expect(nodes.length).toBeGreaterThan(10); // control: the sweep reached the screen
    const hiding = nodes.filter((node) => hidesSubtree(node.props));
    expect(hiding.map((node) => describeNode(node as unknown as RenderedNode))).toEqual([]);
  });

  it('control: the subtree check fires on a hiding prop', () => {
    const { UNSAFE_root } = render(<View importantForAccessibility="no-hide-descendants" />);
    expect(UNSAFE_root.findAll((node) => hidesSubtree(node.props)).length).toBeGreaterThan(0);
  });

  it('the root keeps its testID and no longer carries a label of its own', () => {
    const root = renderScreen().getByTestId('practice-completion-screen');
    expect(root.props.accessible).toBeFalsy();
    expect(root.props.accessibilityLabel).toBeUndefined();
  });

  it('Continue keeps its role, label and hint, and the title stays a header', () => {
    const screen = renderScreen();
    const cont = screen.getByTestId(CONTINUE_ID);
    expect(cont.props.accessibilityRole).toBe('button');
    expect(cont.props.accessibilityLabel).toBe('Continue');
    expect(cont.props.accessibilityHint).toBe('Continue from practice completion');
    expect(screen.getByRole('header', { name: TITLE })).toBeTruthy();
  });

  it('pressing Continue calls onContinue exactly once', () => {
    const onContinue = jest.fn();
    const { getByTestId } = render(
      <PracticeCompletionScreen
        practiceTitle="Breathing Space"
        quote={Object.values(PRACTICE_QUOTES)[0]}
        moduleId={MODULE}
        onContinue={onContinue}
      />
    );
    fireEvent.press(getByTestId(CONTINUE_ID));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

/** Wraps and follows the user's text size: no truncation, no shrink, no opt-out. */
function expectWrapsAndScales(props: Record<string, unknown>) {
  expect(props.numberOfLines).toBeUndefined();
  expect(props.ellipsizeMode).toBeUndefined();
  expect(props.adjustsFontSizeToFit).toBeUndefined();
  expect(props.minimumFontScale).toBeUndefined();
  expect(props.allowFontScaling).not.toBe(false);
}
