/**
 * CONSENT-BLOCKED NOTICE — accessibility + copy constraints (DEBUG-451)
 *
 * `npm run test:accessibility` is `jest --testPathPattern=accessibility`, so the
 * filename is what puts these in that leg.
 *
 * The copy cases here are not style checks. Each pins a claim the app is not
 * entitled to make about a real person, and they are asserted against the
 * RENDERED tree rather than source text, so they describe what a user is shown.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import ConsentBlockedScreen, { type ConsentBlockedVariant } from '../ConsentBlockedScreen';

const VARIANTS: ConsentBlockedVariant[] = ['integrity_error', 'revoked', 'under_age'];

const renderVariant = (variant: ConsentBlockedVariant, overrides = {}) =>
  render(
    <ConsentBlockedScreen
      variant={variant}
      isRetrying={false}
      onDismiss={jest.fn()}
      {...overrides}
    />,
  );

/** Every string a user can actually read, flattened from the rendered tree. */
const visibleText = (tree: ReturnType<typeof renderVariant>): string =>
  tree.root.findAllByType(require('react-native').Text as never)
    .map((n: { props: { children?: unknown } }) =>
      typeof n.props.children === 'string' ? n.props.children : '',
    )
    .join(' ');

describe('ConsentBlockedScreen — accessibility', () => {
  it.each(VARIANTS)('exposes a header for %s', (variant) => {
    const { getAllByRole } = renderVariant(variant);
    expect(getAllByRole('header').length).toBeGreaterThan(0);
  });

  it.each(VARIANTS)('gives the dismiss control a button role and a label for %s', (variant) => {
    const { getByTestId } = renderVariant(variant);
    const dismiss = getByTestId('consent-blocked-dismiss');
    expect(dismiss.props.accessibilityRole).toBe('button');
    expect(String(dismiss.props.accessibilityLabel ?? '').length).toBeGreaterThan(0);
  });

  it('disables both controls while a re-read is in flight', () => {
    const { getByTestId } = renderVariant('integrity_error', {
      isRetrying: true,
      onRetry: jest.fn(),
    });
    expect(getByTestId('consent-blocked-retry').props.accessibilityState.disabled).toBe(true);
    expect(getByTestId('consent-blocked-dismiss').props.accessibilityState.disabled).toBe(true);
  });

  /**
   * INFRA-181: `accessible` on an ancestor collapses the subtree into a single
   * element, hiding the referral links from VoiceOver. The wrapper must stay
   * `accessible={false}`.
   */
  it('does not collapse the under-18 referral subtree for a screen reader', () => {
    const { getByTestId } = renderVariant('under_age');
    expect(getByTestId('consent-blocked-support').props.accessible).toBe(false);
    expect(getByTestId('consent-blocked-childmind').props.accessibilityRole).toBe('link');
    expect(getByTestId('consent-blocked-teenmh').props.accessibilityRole).toBe('link');
  });

  it('shows referrals only on the under-age variant', () => {
    expect(renderVariant('revoked').queryByTestId('consent-blocked-support')).toBeNull();
    expect(renderVariant('integrity_error').queryByTestId('consent-blocked-support')).toBeNull();
  });
});

describe('ConsentBlockedScreen — copy constraints', () => {
  /**
   * 🔴 NEVER ASSERTS THE USER IS UNDER 18 — only that we cannot ESTABLISH 18+.
   * The weaker claim is the only one true of every record that lands here,
   * including one whose age evidence we simply cannot read.
   */
  it('never claims the user IS under 18', () => {
    const text = visibleText(renderVariant('under_age'));
    expect(text).toMatch(/can'?t confirm|cannot confirm|can'?t establish|cannot establish/i);
    expect(text).not.toMatch(/you are under \d+|you'?re under \d+|because you are a minor/i);
  });

  it('that under-18 matcher can still go red', () => {
    expect('you are under 18').toMatch(/you are under \d+/i);
  });

  /**
   * 🔴 `integrity_error` may assert ONLY that the record could not be read —
   * never that no prior consent existed, that the user is new, or that age is
   * unverified as opposed to unknown. We cannot rule out that the unreadable
   * record was a withdrawal, which is why `loadConsent` checks integrity first.
   */
  it('never claims a first-time user or an absent record for integrity_error', () => {
    const text = visibleText(renderVariant('integrity_error'));
    expect(text).not.toMatch(/never (consented|agreed)|no consent (record )?(exists|was found)/i);
    expect(text).not.toMatch(/welcome|get started|first time/i);
  });

  /**
   * 🔴 NO LAPSE-WINDOW CHARACTERISATION on any variant. Naming a feature that is
   * currently off is observable and true; predicting what the user loses by not
   * acting is open counsel work, barred for consent copy by `consentStore`.
   */
  it.each(VARIANTS)('does not characterise the consequences of inaction for %s', (variant) => {
    const text = visibleText(renderVariant(variant));
    expect(text).not.toMatch(/will be (deleted|removed|lost)|you will lose|permanently/i);
    expect(text).not.toMatch(/within \d+ days|after \d+ days/i);
  });

  /** `revoked` is a withdrawal being confirmed, never re-litigated. */
  it('confirms the withdrawal without inviting a re-grant', () => {
    const text = visibleText(renderVariant('revoked'));
    expect(text).toMatch(/withdrew|asked us to stop/i);
    expect(text).not.toMatch(/turn (it )?back on|re-?enable|change your mind|opt back in/i);
  });
});
