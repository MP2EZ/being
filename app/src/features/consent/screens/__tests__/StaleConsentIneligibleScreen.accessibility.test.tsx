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
import { render } from '@testing-library/react-native';
import { TOUCH_TARGETS } from '@/core/theme';
import type { ConsentDelta } from '@/core/stores/consentStore';
import StaleConsentIneligibleScreen from '../StaleConsentIneligibleScreen';

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
