/**
 * CONSENT-BLOCKED ROUTE — invariant specs (DEBUG-451)
 *
 * Sited as `*.privacy.test.tsx`: `npm run test:privacy` is
 * `jest --testPathPattern=privacy` and runs in `precommit`, so these specs gate.
 *
 * What is under test is a LEGAL-BASIS boundary, not a rendering detail. Three
 * properties here each stop a specific unlawful or unsafe outcome:
 *   · the variant comes from the STORE, so displayed copy cannot contradict the
 *     state the app is actually in
 *   · retry is offered ONLY where a re-read can resolve the state — anywhere
 *     else it would be a re-consent affordance with a different label
 *   · `declineReConsent` is never called, because from these three statuses it
 *     writes nothing and would make a dismiss look audited when it is not
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useConsentStore } from '@/core/stores/consentStore';
import type { ConsentStatus } from '@/core/stores/consentStore';
import ConsentBlockedRoute from '../ConsentBlockedRoute';

const setStatus = (consentStatus: ConsentStatus) => {
  useConsentStore.setState({ consentStatus, currentConsent: null, staleConsent: null });
};

describe('ConsentBlockedRoute — variant selection', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each<[ConsentStatus, string]>([
    ['integrity_error', "We couldn't read your saved settings"],
    ['revoked', 'You withdrew your consent'],
    ['under_age', 'Being is now for ages 18 and over'],
  ])('renders the %s copy read from the store', (status, title) => {
    setStatus(status);
    const { getByText } = render(<ConsentBlockedRoute onDismiss={jest.fn()} />);
    expect(getByText(title)).toBeTruthy();
  });

  /**
   * 🔴 The variant is re-derived from `consentStatus`, never a route param. A
   * param could be constructed by any caller to show copy that contradicts the
   * store. Asserted by driving the store and taking no props but `onDismiss`.
   */
  it('takes no status prop — the store is the only source', () => {
    setStatus('revoked');
    const { getByText, queryByText } = render(<ConsentBlockedRoute onDismiss={jest.fn()} />);
    expect(getByText('You withdrew your consent')).toBeTruthy();
    expect(queryByText('Being is now for ages 18 and over')).toBeNull();
  });
});

describe('ConsentBlockedRoute — retry is scoped to the recoverable status', () => {
  it('offers retry for integrity_error, the one status a re-read can resolve', () => {
    setStatus('integrity_error');
    const { getByTestId } = render(<ConsentBlockedRoute onDismiss={jest.fn()} />);
    expect(getByTestId('consent-blocked-retry')).toBeTruthy();
  });

  it.each<ConsentStatus>(['revoked', 'under_age'])(
    'offers NO retry for %s — it would be a re-consent affordance relabelled',
    (status) => {
      setStatus(status);
      const { queryByTestId } = render(<ConsentBlockedRoute onDismiss={jest.fn()} />);
      expect(queryByTestId('consent-blocked-retry')).toBeNull();
    },
  );

  it('retry re-reads storage and nothing else', async () => {
    setStatus('integrity_error');
    const loadConsent = jest.fn().mockResolvedValue(null);
    useConsentStore.setState({ loadConsent });

    const { getByTestId } = render(<ConsentBlockedRoute onDismiss={jest.fn()} />);
    fireEvent.press(getByTestId('consent-blocked-retry'));

    await waitFor(() => expect(loadConsent).toHaveBeenCalledTimes(1));
  });

  /**
   * `loadConsent` swallows internally, but a future refactor could stop doing
   * so. A throw must not escape into the navigator — the user stays on the
   * notice rather than losing the screen.
   */
  it('survives a throwing re-read without unmounting', async () => {
    setStatus('integrity_error');
    const loadConsent = jest.fn().mockRejectedValue(new Error('SecureStore unavailable'));
    useConsentStore.setState({ loadConsent });

    const { getByTestId, getByText } = render(<ConsentBlockedRoute onDismiss={jest.fn()} />);
    fireEvent.press(getByTestId('consent-blocked-retry'));

    await waitFor(() => expect(loadConsent).toHaveBeenCalled());
    expect(getByText("We couldn't read your saved settings")).toBeTruthy();
  });
});

describe('ConsentBlockedRoute — what it must never do', () => {
  /**
   * 🔴 `declineReConsent` gates on `isReConsentEligible(consentStatus)` —
   * `{version_mismatch, expired}` — and additionally requires a base record, so
   * from all three of these statuses it sets an error and writes NOTHING. Wiring
   * dismiss to it would present an unrecorded dismissal as an audited decision.
   */
  it.each<ConsentStatus>(['integrity_error', 'revoked', 'under_age'])(
    'never records a decline on dismiss from %s',
    (status) => {
      setStatus(status);
      const declineReConsent = jest.fn();
      useConsentStore.setState({ declineReConsent });
      const onDismiss = jest.fn();

      const { getByTestId } = render(<ConsentBlockedRoute onDismiss={onDismiss} />);
      fireEvent.press(getByTestId('consent-blocked-dismiss'));

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(declineReConsent).not.toHaveBeenCalled();
    },
  );

  /**
   * Fail closed by POPPING, never by rendering nothing. The route is a
   * `transparentModal` with `gestureEnabled: false` and no header, so a bare
   * `return null` leaves an invisible card swallowing touches over a Main the
   * user can see but cannot reach.
   */
  it.each<ConsentStatus>(['valid', 'version_mismatch', 'loading'])(
    'dismisses rather than rendering an invisible trap when status is %s',
    (status) => {
      setStatus(status);
      const onDismiss = jest.fn();
      render(<ConsentBlockedRoute onDismiss={onDismiss} />);
      expect(onDismiss).toHaveBeenCalled();
    },
  );

  /** A successful retry resolving to `valid` is the record self-healing. */
  it('pops itself once the status resolves away from a blocked one', () => {
    setStatus('integrity_error');
    const onDismiss = jest.fn();
    const { rerender } = render(<ConsentBlockedRoute onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();

    setStatus('valid');
    rerender(<ConsentBlockedRoute onDismiss={onDismiss} />);
    expect(onDismiss).toHaveBeenCalled();
  });
});
