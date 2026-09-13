/**
 * CONSENT-BLOCKED ROUTE CONTAINER (DEBUG-451)
 *
 * The stateful half of `ConsentBlockedScreen`, which is presentational by design
 * — no navigation import, no store import — so the store read, the retry and the
 * dismiss live here. Same split as `ReConsentRoute`/`ReConsentScreen`.
 *
 * 🔴 THE VARIANT IS RE-DERIVED FROM THE STORE, NEVER PASSED AS A ROUTE PARAM.
 * Same reasoning as `ReConsentRoute`'s screen choice: a param can be constructed
 * by any caller, and can drift out of sync with the status the store actually
 * holds. Reading `consentStatus` here means the copy a user sees and the state
 * the app is in cannot disagree.
 *
 * 🔴 STATUS-DRIVEN, NOT RECORD-DRIVEN — the whole point of DEBUG-451. This file
 * deliberately does NOT read `staleConsent ?? currentConsent`. `loadConsent`
 * nulls both for `integrity_error` (`consentStore.ts:875-885`, and the catch at
 * `:978-995`) and for `revoked` (`:887-897`), so a record-driven container would
 * fail closed and dismiss straight back to the fail-closed `Main` — reproducing
 * the defect one layer down, which is exactly what reusing DEBUG-418's seam
 * wholesale would have done.
 *
 * 🚫 NO `declineReConsent` CALL ON ANY BRANCH. It gates on
 * `isReConsentEligible(consentStatus)` — `{version_mismatch, expired}` — and
 * additionally requires a base record, so from all three of these statuses it
 * would set an error and write nothing. A dismiss control wired to it would look
 * like an audited acknowledgement and record nothing at all. Dismiss here is a
 * pure navigation act, and is not presented as a decision.
 */

import React, { useCallback, useState } from 'react';
import { useConsentStore } from '@/core/stores/consentStore';
import { logError, LogCategory } from '@/core/services/logging';
import ConsentBlockedScreen, { type ConsentBlockedVariant } from './ConsentBlockedScreen';

export interface ConsentBlockedRouteProps {
  /** Dismiss the modal. Supplied by the navigator; the screen never navigates. */
  onDismiss: () => void;
}

/** The statuses this route can render. Anything else is a mount it should not have had. */
const VARIANTS: readonly ConsentBlockedVariant[] = ['integrity_error', 'revoked', 'under_age'];

const isRenderableVariant = (status: string): status is ConsentBlockedVariant =>
  (VARIANTS as readonly string[]).includes(status);

const ConsentBlockedRoute: React.FC<ConsentBlockedRouteProps> = ({ onDismiss }) => {
  const consentStatus = useConsentStore((state) => state.consentStatus);
  const loadConsent = useConsentStore((state) => state.loadConsent);

  const [isRetrying, setIsRetrying] = useState(false);

  /**
   * Retry means ONE thing: re-read storage. Nothing else.
   *
   * If the read succeeds and resolves to `valid`, that is the record
   * self-healing — the trigger simply stops matching and this route is popped by
   * the effect below on the next render. It is not a consent event and writes
   * nothing. If it fails again, `loadConsent` re-sets `integrity_error` and the
   * user stays here, which is the honest outcome.
   *
   * `loadConsent` swallows internally and returns null rather than throwing, so
   * the catch is belt-and-braces against a future refactor that stops doing so.
   */
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await loadConsent();
    } catch (error) {
      logError(
        LogCategory.SYSTEM,
        'Consent re-read from the blocked notice failed — staying on the notice',
        error instanceof Error ? error : new Error(String(error)),
      );
    } finally {
      setIsRetrying(false);
    }
  }, [loadConsent]);

  /**
   * Fail closed — and DISMISS, do not merely render nothing.
   *
   * Reaching this is a race: the trigger checked the status before navigating,
   * so it only happens if the status changed between navigate and mount (a
   * successful retry is the ordinary way).
   *
   * 🔴 `return null` alone would be a TRAP, exactly as in `ReConsentRoute`. The
   * route is a `transparentModal` with `gestureEnabled: false` and no header, so
   * its card still covers the screen and swallows touches with no children —
   * leaving the user on an invisible modal over a `Main` they can see but cannot
   * reach. The only safe failure here is to pop the route.
   */
  const renderable = isRenderableVariant(consentStatus);
  React.useEffect(() => {
    if (!renderable) {
      onDismiss();
    }
  }, [renderable, onDismiss]);

  if (!isRenderableVariant(consentStatus)) {
    return null;
  }

  return (
    <ConsentBlockedScreen
      variant={consentStatus}
      isRetrying={isRetrying}
      // Offered only where a re-read can resolve the state. On `revoked` and
      // `under_age` a retry would be a re-consent affordance with a new label.
      onRetry={consentStatus === 'integrity_error' ? handleRetry : undefined}
      onDismiss={onDismiss}
    />
  );
};

export default ConsentBlockedRoute;
