/**
 * STALE-CONSENT INELIGIBLE NOTICE — accessibility specs (DEBUG-418)
 *
 * Sited `*.accessibility.test.tsx` because `npm run test:accessibility` is
 * `--testPathPattern=accessibility` — the suffix is load-bearing, not decorative.
 * The Validation Matrix requires accessibility for any UI change.
 *
 * What this file pins, in order of severity:
 *
 *   1. NO ACCEPT AFFORDANCE. This cohort cannot lawfully grant Art. 9(2)(a)
 *      consent. A control that looks like agreement — a checkbox, an "Accept",
 *      an "Agree" — must not exist on this screen at any point.
 *   2. THE COPY DOES NOT OVERCLAIM. `isBaseEligibleForRenewal` fails closed on a
 *      missing or unparseable `birthYear`, so this screen also serves records we
 *      cannot read. It must say we cannot ESTABLISH 18+, never that the user IS
 *      under 18 — the weaker claim is true of both sub-cohorts.
 *   3. THE COPY DOES NOT CHARACTERISE THE LAPSE WINDOW. `consentStore` bars
 *      consent copy from saying what happens if the user never re-consents; that
 *      is open counsel work.
 *   4. Ordinary a11y: headers are headers, every control clears the touch
 *      target, and nothing is hidden from VoiceOver by an over-eager ancestor.
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { render } from '@testing-library/react-native';
import { TOUCH_TARGETS } from '@/core/theme';
import type { ConsentDelta } from '@/core/stores/consentStore';
import StaleConsentIneligibleScreen from '../StaleConsentIneligibleScreen';

const SCREEN_PATH = path.join(__dirname, '../StaleConsentIneligibleScreen.tsx');
const source = fs.readFileSync(SCREEN_PATH, 'utf-8');

/** The stylesheet block for a single named style, for source-level assertions. */
const styleBlock = (name: string): string => {
  const start = source.indexOf(`  ${name}: {`);
  if (start === -1) throw new Error(`style "${name}" not found in StaleConsentIneligibleScreen`);
  return source.slice(start, source.indexOf('\n  },', start));
};

const DELTA: ConsentDelta = {
  fromVersion: '1.0.0',
  toVersion: '1.1.0',
  changes: [
    {
      version: '1.1.0',
      summary:
        'We raised the minimum age to use Being to 18, and we now ask for your ' +
        'separate, explicit consent before processing wellness data.',
    },
  ],
  changedKeys: [],
  isKnownVersion: true,
} as ConsentDelta;

const renderScreen = (overrides: Partial<React.ComponentProps<typeof StaleConsentIneligibleScreen>> = {}) =>
  render(
    <StaleConsentIneligibleScreen
      delta={DELTA}
      isSubmitting={false}
      onAcknowledge={jest.fn()}
      {...overrides}
    />,
  );

/** Flatten an RN style prop (object | array | nested) into one object. */
const flatten = (style: unknown): Record<string, any> => {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten));
  return (style as Record<string, any>) ?? {};
};

describe('StaleConsentIneligibleScreen — it can only refuse', () => {
  it('renders exactly one control, and it is the acknowledgement', () => {
    const { getByTestId, getAllByRole } = renderScreen();

    expect(getByTestId('stale-consent-ineligible-acknowledge')).toBeTruthy();

    // `getAllByRole` rather than a raw tree walk: a Pressable renders both a
    // composite and a host node carrying the same role, so `UNSAFE_root.findAll`
    // counts one control several times and the assertion becomes meaningless.
    // Links are role="link" and are counted separately — they navigate out, they
    // do not consent.
    expect(getAllByRole('button')).toHaveLength(1);
  });

  it('exposes no checkbox, switch, or accept-shaped CONTROL', () => {
    const { queryAllByRole, getAllByRole } = renderScreen();

    for (const role of ['checkbox', 'switch', 'radio'] as const) {
      expect(queryAllByRole(role)).toHaveLength(0);
    }

    // Anti-vacuity: prove the role query can find anything on this tree, or
    // "zero checkboxes" is satisfied by a query that matches nothing at all.
    expect(getAllByRole('button').length).toBeGreaterThan(0);

    /**
     * Scoped to the CONTROL's accessible name, deliberately — not to the whole
     * rendered tree. The body copy legitimately contains "agree" in a NEGATION
     * ("we can't ask you to agree to the updated terms"), and a tree-wide word
     * ban would fail on correct copy while proving nothing about affordances.
     * What matters is that no control invites agreement.
     */
    for (const control of [...getAllByRole('button'), ...queryAllByRole('link')]) {
      const name = String(
        control.props.accessibilityLabel ?? control.props.children ?? '',
      );
      expect(name).not.toMatch(/\b(accept|agree|allow|consent|continue)\b/i);
    }
  });
});

describe('StaleConsentIneligibleScreen — copy constraints', () => {
  it('says we cannot establish 18+, never that the user IS under 18', () => {
    const { toJSON } = renderScreen();
    const text = JSON.stringify(toJSON());

    // The claim we are entitled to make.
    expect(text).toMatch(/can['\u2019]t confirm|cannot confirm/i);

    // The claims we are NOT: these assert a fact about a real person that
    // `isBaseEligibleForRenewal` does not establish (it also fails closed on a
    // missing birthYear).
    expect(text).not.toMatch(/you are under 18/i);
    expect(text).not.toMatch(/you'?re under 18/i);
    expect(text).not.toMatch(/because you are (a )?minor/i);
  });

  it('does not characterise the lapse window', () => {
    const { toJSON } = renderScreen();
    const text = JSON.stringify(toJSON());

    // consentStore bars consent copy from saying what happens if the user never
    // re-consents — restricted processing, deletion timelines, loss of access.
    for (const forbidden of [
      /will be deleted/i,
      /lose access/i,
      /your data will/i,
      /restricted/i,
      /suspend/i,
    ]) {
      expect(text).not.toMatch(forbidden);
    }
  });

  it('renders the changelog summary it was given rather than authoring its own', () => {
    const { getByText } = renderScreen();
    expect(getByText(DELTA.changes[0].summary)).toBeTruthy();
  });
});

describe('StaleConsentIneligibleScreen — ordinary accessibility', () => {
  it('marks its headings as headers', () => {
    const { UNSAFE_root } = renderScreen();
    const headers = UNSAFE_root.findAll(
      (n: any) => n.props?.accessibilityRole === 'header',
    );
    expect(headers.length).toBeGreaterThanOrEqual(3);
  });

  it('gives every interactive element a minimum touch target', () => {
    const { getByTestId } = renderScreen();

    const ack = getByTestId('stale-consent-ineligible-acknowledge');
    expect(flatten(ack.props.style).minHeight).toBeGreaterThanOrEqual(TOUCH_TARGETS.minimum);

    for (const id of ['stale-consent-ineligible-childmind', 'stale-consent-ineligible-teenmh']) {
      expect(flatten(getByTestId(id).props.style).minHeight).toBeGreaterThanOrEqual(
        TOUCH_TARGETS.minimum,
      );
    }
  });

  it('labels the referral links as links, with destinations named', () => {
    const { getByTestId } = renderScreen();

    for (const id of ['stale-consent-ineligible-childmind', 'stale-consent-ineligible-teenmh']) {
      const el = getByTestId(id);
      expect(el.props.accessibilityRole).toBe('link');
      expect(typeof el.props.accessibilityLabel).toBe('string');
      expect(el.props.accessibilityLabel.length).toBeGreaterThan(0);
    }
  });

  /**
   * INFRA-181: `accessible={true}` on an ancestor collapses its whole subtree
   * into a single iOS element, hiding the children from VoiceOver and from
   * Maestro. The section wrappers set `accessible={false}` for that reason, and
   * this asserts none of them regressed to true.
   */
  it('does not collapse any section subtree away from VoiceOver', () => {
    const { getByTestId } = renderScreen();
    for (const id of [
      'stale-consent-ineligible-delta',
      'stale-consent-ineligible-support',
    ]) {
      expect(getByTestId(id).props.accessible).toBe(false);
    }
  });

  it('disables the acknowledgement while the audit write is in flight', () => {
    const { getByTestId } = renderScreen({ isSubmitting: true });
    const ack = getByTestId('stale-consent-ineligible-acknowledge');

    expect(ack.props.accessibilityState?.disabled).toBe(true);
  });

  it('never calls onAcknowledge on mount — it must be a user act', () => {
    const onAcknowledge = jest.fn();
    renderScreen({ onAcknowledge });
    expect(onAcknowledge).not.toHaveBeenCalled();
  });
});

/**
 * INFRA-377 — the crisis-FAB clearance.
 *
 * `ReConsentScreen` has had this pin since FEAT-376
 * (`ReConsentScreen.accessibility.test.tsx`); this screen carries the identical
 * constant for the identical reason and had none. The asymmetry mattered more
 * here than there: `ReConsentScreen` degrades to "Decline is hard to hit", but
 * this screen has exactly ONE control, `gestureEnabled: false`, and no other
 * exit (`ReConsentRoute.tsx:135-137`) — so a swallowed tap strands the user on a
 * modal with Main visible but unreachable beneath it.
 *
 * These are source-level and cannot measure geometry: RN Testing Library has no
 * layout engine, so no jest test can know whether a 44pt FAB at `bottom: 100`
 * overlaps a footer whose height depends on Dynamic Type and safe-area insets.
 * They pin that the mitigation is DECLARED and ORDERED correctly. Falsifying the
 * value of 72 itself is device work, owned by the Maestro flow.
 */
describe('INFRA-377 — the acknowledge footer stays clear of the crisis button', () => {
  it('reserves horizontal room for the FAB on the footer', () => {
    expect(styleBlock('footer')).toContain('paddingRight: CRISIS_FAB_CLEARANCE');
    expect(source).toMatch(/const CRISIS_FAB_CLEARANCE = spacing\[72\]/);
  });

  it('declares paddingRight AFTER paddingHorizontal, so it is not overridden', () => {
    // RN StyleSheet is last-key-wins. `paddingHorizontal: spacing[24]` and
    // `paddingRight: CRISIS_FAB_CLEARANCE` both set the right inset, so swapping
    // the two lines silently drops the clearance to 24 while leaving both the
    // constant and the assertion above intact. Nothing else catches that.
    const footer = styleBlock('footer');
    expect(footer.indexOf('paddingRight')).toBeGreaterThan(footer.indexOf('paddingHorizontal'));
  });

  it('the matchers above can still fail (DEBUG-390 control)', () => {
    // A source-shape assertion is only worth its cost if some plausible change
    // makes it go red. Prove each matcher fires against a known-bad literal
    // rather than silently matching nothing.
    expect(() => styleBlock('noSuchStyleBlock')).toThrow(/not found/);
    expect('  paddingHorizontal: spacing[24],\n    paddingRight: X,').toContain('paddingRight');
    expect('const CRISIS_FAB_CLEARANCE = spacing[24];').not.toMatch(
      /const CRISIS_FAB_CLEARANCE = spacing\[72\]/,
    );
    expect(source.length).toBeGreaterThan(1000);
  });
});
