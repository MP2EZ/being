/**
 * LegalGate consent-state contract pin (INFRA-494)
 *
 * WHAT THIS PINS. The four `legal-consent-*-check` glyphs render ONLY when their own
 * consent state is true, and the gate opens on the THREE required consents with the
 * optional GDPR Art. 9 wellness-processing box left unticked. That second half is
 * FEAT-470's user-visible contract, and until now it was asserted only against a
 * mocked consent store — never against the real gating expression.
 *
 * WHY IT EXISTS INDEPENDENTLY OF ANY MAESTRO FLOW. These testIDs were added by
 * FEAT-470 and removed again by its revert (`6ca5c71f`) as collateral when the flow
 * they served was dropped. Nothing noticed, because the only consumer went in the same
 * commit. `legal-gate-art9-optional.yaml` has since landed and consumes them again —
 * which is exactly when this file matters most, because a flow that CAN go red is also
 * a flow someone can delete.
 *
 * That history is the argument for this file. Maestro is local-only (INFRA-171), so CI
 * can never guard these ids; a jest pin can, and it runs in `test:safety` — i.e. in
 * `precommit` AND the CI "Safety + privacy gates" job. It also makes the contract
 * itself CI-enforced rather than dependent on a flow the gate runs only when a safety
 * path changes, on one developer's machine.
 *
 * Every assertion is written to fail in BOTH directions — absent when unticked,
 * present when ticked — because an id that silently stops existing must not read as a
 * pass. Verified by mutation: deleting a check testID, making Art. 9 required in the
 * gate, and making the wellness tick optional each turn this file red.
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

jest.mock('@react-native-picker/picker', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Picker = ({ children, ...props }: never) => React.createElement(View, props, children);
  Picker.Item = (props: never) => React.createElement(View, props);
  return { Picker };
});

jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: () => ({ verifyAge: jest.fn() }),
  recordLegalGateConsents: jest.fn(),
}));

import CombinedLegalGateScreen from '@/features/consent/screens/CombinedLegalGateScreen';
import { SUPPRESSED_ROUTES } from '@/features/crisis/components/RootCrisisButton';

/** The Art. 9 glyph must be absent at the moment the gate opens. */
const queryGlyph = (get: (id: string) => unknown) => {
  try {
    return get('legal-consent-mh-processing-check');
  } catch {
    return null;
  }
};

const renderScreen = () =>
  render(<CombinedLegalGateScreen onComplete={jest.fn()} onUnderAge={jest.fn()} />);

/** testID of the tappable indicator, and of the glyph that proves it is ticked. */
const CONSENTS = [
  { box: 'legal-consent-tos', check: 'legal-consent-tos-check' },
  { box: 'legal-consent-privacy', check: 'legal-consent-privacy-check' },
  { box: 'legal-consent-wellness', check: 'legal-consent-wellness-check' },
  { box: 'legal-consent-mh-processing', check: 'legal-consent-mh-processing-check' },
] as const;

describe('LegalGate Maestro oracle (INFRA-494)', () => {
  describe.each(CONSENTS)('$box', ({ box, check }) => {
    it('renders no check glyph until the box is ticked, and one after', () => {
      const { queryByTestId, getByTestId } = renderScreen();

      // Both halves matter. The first proves the glyph is a real signal rather
      // than something always present; the second proves the id still exists at
      // all. A rename passes neither.
      expect(queryByTestId(check)).toBeNull();
      fireEvent.press(getByTestId(box));
      expect(queryByTestId(check)).not.toBeNull();
    });

    it('returns to no check glyph when unticked, so the glyph tracks state', () => {
      // Guards the re-tap semantics the flow relies on: its `repeat … while`
      // body is safe only because a second tap cannot happen once the glyph is
      // present. If the glyph ever latched on, a swallowed-tap retry would
      // silently toggle a consent back OFF and the flow would still green.
      const { queryByTestId, getByTestId } = renderScreen();

      fireEvent.press(getByTestId(box));
      expect(queryByTestId(check)).not.toBeNull();
      fireEvent.press(getByTestId(box));
      expect(queryByTestId(check)).toBeNull();
    });
  });

  it('counts the outstanding REQUIRED consents, and excludes the Art. 9 box', () => {
    // This is the ONLY place "the wellness disclaimer is still required" can be
    // pinned, and that is a measured fact rather than a preference (INFRA-494).
    // The contract lives on the Continue button's accessibilityHint, and iOS does
    // not publish accessibilityHint to XCUITest: on the running Release build every
    // node in this screen's hierarchy reports `hintText: ""`, including the four
    // checkboxes that demonstrably set one. So the Maestro flow's intended
    // `.*1 remaining.*` assertion was one that could never pass, and it is not in
    // `legal-gate-art9-optional.yaml`. Deleting this test does not fall back to
    // on-device coverage — it leaves the contract unpinned anywhere.
    const { getByTestId, getByLabelText } = renderScreen();
    const hintOf = () => getByLabelText('Continue').props.accessibilityHint as string | undefined;

    expect(hintOf()).toContain('3 remaining');

    fireEvent.press(getByTestId('legal-consent-tos'));
    expect(hintOf()).toContain('2 remaining');

    fireEvent.press(getByTestId('legal-consent-privacy'));
    expect(hintOf()).toContain('1 remaining');

    // Ticking the OPTIONAL box must not move the counter — if it ever did, the
    // count would no longer mean "wellness is required", which is the whole
    // reason it is asserted.
    fireEvent.press(getByTestId('legal-consent-mh-processing'));
    expect(hintOf()).toContain('1 remaining');

    // The third REQUIRED tick clears the consent count — and the hint does NOT go
    // silent, it moves to the remaining blocker. No birth year is selected here, so
    // it names that instead (CombinedLegalGateScreen.tsx:604-608). Asserting the
    // transition rather than merely the absence of "1 remaining" is what proves the
    // count reached zero BECAUSE of the wellness tick, rather than the hint having
    // disappeared for some unrelated reason.
    fireEvent.press(getByTestId('legal-consent-wellness'));
    expect(hintOf()).toBe('Disabled until you select your birth year.');
  });
});

/**
 * INFRA-656 — the layout premises `_legal-and-onboarding.yaml`'s consent-tap guard is
 * DERIVED from. That helper runs only on physical iPhones, which no Maestro can drive
 * (DEBUG-589), so its safety cannot be observed: it rests on a derivation, and this block
 * pins every premise the derivation needs. Each is written so the dangerous drift reds:
 *
 *   - every consent tap carries `above: { text: "Need support now.*" }` plus `point:`, so
 *     a tap lands at most 11pt below the footer TITLE's top edge (24pt indicator, centre
 *     point, strict top-vs-top compare);
 *   - the title is the footer's FIRST child and every crisis control sits in the row
 *     AFTER it, so each control's top is >= title top + title height + marginBottom;
 *   - hence no guarded tap can reach a crisis control while the title has any height.
 *
 * The footer title moving BELOW the buttons is the one drift that fails DANGEROUS: the
 * guard would then admit taps on the controls themselves, and nothing on-device would
 * notice. The drag anchors are pinned too, but they only affect liveness.
 */

type HostNode = ReactTestRendererJSON;
const kids = (n: HostNode): (HostNode | string)[] => (n.children ?? []) as (HostNode | string)[];
const hostKids = (n: HostNode): HostNode[] =>
  kids(n).filter((c): c is HostNode => typeof c !== 'string');
const textOf = (n: HostNode | string): string =>
  typeof n === 'string' ? n : kids(n).map(textOf).join('');

/** Root-to-node path of the first host node matching `pred`, depth-first. */
function pathTo(node: HostNode, pred: (n: HostNode) => boolean, trail: HostNode[] = []): HostNode[] | null {
  const here = [...trail, node];
  if (pred(node)) return here;
  for (const child of hostKids(node)) {
    const found = pathTo(child, pred, here);
    if (found) return found;
  }
  return null;
}

function all(node: HostNode, pred: (n: HostNode) => boolean, acc: HostNode[] = []): HostNode[] {
  if (pred(node)) acc.push(node);
  hostKids(node).forEach((c) => all(c, pred, acc));
  return acc;
}

const tree = (): HostNode => {
  const json = renderScreen().toJSON();
  if (!json || Array.isArray(json)) throw new Error('expected a single host root');
  return json;
};

const mustPath = (root: HostNode, pred: (n: HostNode) => boolean, what: string): HostNode[] => {
  const found = pathTo(root, pred);
  if (!found) throw new Error(`${what} not found in the rendered LegalGate tree`);
  return found;
};

const byTestId = (id: string) => (n: HostNode) => n.props.testID === id;
const isText = (re: RegExp) => (n: HostNode) => n.type === 'Text' && re.test(textOf(n));
const flat = (n: HostNode) => StyleSheet.flatten(n.props.style) ?? {};

/** Index, within `parent`'s host children, of the child that contains `node`. */
const indexOfBranch = (parent: HostNode, node: HostNode): number =>
  hostKids(parent).findIndex((c) => c === node || pathTo(c, (x) => x === node) !== null);

const FOOTER_TITLE = /^Need support now\?$/;

describe('INFRA-656 — premises of the helper\'s consent-tap guard', () => {
  it('LegalGate suppresses the root FAB, so the footer buttons are the only crisis controls', () => {
    // If this ever flips, the FAB becomes a third crisis control that the footer-title
    // guard does not bound. Re-derive the helper before changing it.
    expect(SUPPRESSED_ROUTES.has('LegalGate')).toBe(true);
  });

  it('the footer title is the footer\'s FIRST child, outside the ScrollView, and inert', () => {
    const trail = mustPath(tree(), isText(FOOTER_TITLE), 'footer title');
    const title = trail[trail.length - 1];
    const footer = trail[trail.length - 2];
    expect(hostKids(footer)[0]).toBe(title);
    expect(trail.some((n) => n.type === 'RCTScrollView')).toBe(false);
    expect(title.props.onPress).toBeUndefined();
  });

  it('every crisis control sits in the row AFTER the title — 988 first, wrapping downward', () => {
    const root = tree();
    const trail = mustPath(root, isText(FOOTER_TITLE), 'footer title');
    const footer = trail[trail.length - 2];
    const row = hostKids(footer)[1];
    expect(row).toBeDefined();
    expect(flat(row)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' });
    expect(hostKids(row)[0].props.testID).toBe('legal-gate-crisis-988');
    // EVERY crisis control on the screen lives in that row — a third one added
    // elsewhere (above the title, or in the content) would escape the derivation.
    const crisisControls = all(root, (n) => /^legal-gate-crisis-/.test(n.props.testID ?? ''));
    expect(crisisControls.map((n) => n.props.testID).sort()).toEqual([
      'legal-gate-crisis-988',
      'legal-gate-crisis-text',
    ]);
    for (const control of crisisControls) {
      expect(indexOfBranch(footer, control)).toBe(1);
    }
  });

  it('neither footer control carries hitSlop', () => {
    // hitSlop would extend a control's touch area above its frame, toward the title,
    // and eat the margin the guard relies on.
    const root = tree();
    for (const id of ['legal-gate-crisis-988', 'legal-gate-crisis-text']) {
      const [control] = all(root, byTestId(id));
      expect([id, control.props.hitSlop]).toEqual([id, undefined]);
    }
  });

  it('each consent indicator is a fixed 24pt box, and half of it is under the title-to-988 gap', () => {
    const root = tree();
    const title = mustPath(root, isText(FOOTER_TITLE), 'footer title').pop()!;
    const { marginBottom, fontSize } = flat(title) as { marginBottom: number; fontSize: number };
    for (const { box } of CONSENTS) {
      const [indicator] = all(root, byTestId(box));
      const { width, height } = flat(indicator) as { width: number; height: number };
      expect([box, width, height]).toEqual([box, 24, 24]);
      // Tap y <= title top + height/2 - 1; the 988 top is >= title top + title height
      // + marginBottom. Title height is at least its font size.
      expect(height / 2).toBeLessThan(marginBottom + fontSize);
    }
  });

  it('each drag anchor precedes, in the same column, the element its guard is keyed on', () => {
    const root = tree();
    const branchOf = (pred: (n: HostNode) => boolean, what: string, depth: number) => {
      const trail = mustPath(root, pred, what);
      return { column: trail[trail.length - 1 - depth], node: trail[trail.length - depth] };
    };
    const precedes = (anchor: RegExp, pred: (n: HostNode) => boolean, what: string, depth: number) => {
      const { column, node } = branchOf(pred, what, depth);
      const a = hostKids(column).findIndex((c) => isText(anchor)(c));
      const b = hostKids(column).indexOf(node);
      expect([what, a >= 0, a < b]).toEqual([what, true, true]);
      return { column, index: b };
    };
    // depth 2: indicator -> Pressable -> section column; picker -> container -> section.
    const picker = precedes(/^What year were you born/, byTestId('legal-dob-picker'), 'picker', 2);
    expect(textOf(hostKids(picker.column)[picker.index + 1])).toMatch(/^We use your age only/);
    precedes(/^Required to continue$/, byTestId('legal-consent-tos'), 'tos', 2);
    const mh = precedes(/^Optional$/, byTestId('legal-consent-mh-processing'), 'mh', 2);
    expect(textOf(hostKids(mh.column)[mh.index + 1])).toMatch(/^This one is optional/);
    // Each box's "ruler" (the landing test) must come AFTER the box it measures.
    const order = CONSENTS.map(({ box }) => branchOf(byTestId(box), box, 2).node);
    const column = branchOf(byTestId('legal-consent-tos'), 'tos', 2).column;
    const indices = order.map((n) => hostKids(column).indexOf(n));
    expect(indices).toEqual([...indices].sort((x, y) => x - y));
  });

  it('every text anchor the helper and the art9 flow name full-matches exactly ONE rendered node', () => {
    // A copy change would make the helper fail CLOSED on a device nobody can run it on;
    // this turns that into a CI red instead. Read from the flows, so they cannot drift.
    const maestro = path.join(__dirname, '..', '..', '.maestro');
    const helper = fs.readFileSync(path.join(maestro, '_legal-and-onboarding.yaml'), 'utf8');
    const art9 = fs.readFileSync(path.join(maestro, 'legal-gate-art9-optional.yaml'), 'utf8');
    const ANCHORS = [
      'Need support now.*',
      'We use your age only.*',
      'What year were you born.*',
      'Required to continue',
      'Optional',
      'This one is optional.*',
    ];
    for (const a of ANCHORS) expect([a, helper.includes(`text: "${a}"`)]).toEqual([a, true]);
    expect(art9.includes('text: "Need support now.*"')).toBe(true);
    const root = tree();
    for (const a of ANCHORS) {
      const re = new RegExp(`^(?:${a})$`, 's');
      const hits = all(root, (n) => n.type === 'Text' && re.test(textOf(n)));
      expect([a, hits.length]).toEqual([a, 1]);
    }
  });
});
