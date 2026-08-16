/**
 * RE-CONSENT ROUTE CONTAINER (FEAT-417 slice C2)
 *
 * The stateful half of the re-consent screen. `ReConsentScreen` (FEAT-376) is
 * purely presentational by design — no navigation import, no store import — so
 * this is where the store reads, the two writes and the navigation live.
 *
 * ── ERROR COPY IS DELIBERATELY STAGE-BLIND ───────────────────────────────────
 * `submitReConsent` returns a `stage` of `'ineligible' | 'art9_mismatch' |
 * 'legal_gate' | 'renew'`, and `ReConsentScreen`'s `errorMessage` contract says
 * the caller must translate before passing. Every stage collapses to ONE
 * message here, and that is a compliance constraint rather than laziness:
 *
 *   · `ineligible` can fire on an AGE failure (`submitReConsent.ts:138-144`).
 *     The trigger already excludes under-18 holders, so reaching it is a race,
 *     not a designed path — but surfacing an age reason would recreate through
 *     that race exactly the under-age route founder decision D2 refused to
 *     build.
 *   · `art9_mismatch` is structurally unreachable (the screen ties both Art. 9
 *     records to one state variable). If it ever fires it is a defensive
 *     invariant catching OUR bug, on checkboxes the user had no way to desync.
 *   · `legal_gate` vs `renew` is a partial-success distinction with no
 *     actionable difference for the user: `recordLegalGateConsents` is a plain
 *     overwrite and the stale record still drives a re-prompt, so retry
 *     converges from either (`submitReConsent.ts:22-45`). Telling them which
 *     half landed is internal diagnostic detail that reads as a claim about
 *     their legal state.
 *
 * 🚫 The copy must NOT say what happens if they never re-consent. The
 * lapse-window characterisation is open counsel work — `consentStore.ts:519-522`
 * bars consent copy from it. Saying "you'll be asked again next launch"
 * describes the PROMPT CADENCE, which is observable and true; saying anything
 * about restricted processing would not be.
 *
 * 🚫 NO TELEMETRY on any branch. `PostHogProvider` gates mounting on
 * `currentConsent?.preferences?.analyticsEnabled`, and `currentConsent` is null
 * for the whole `version_mismatch` window, so no client exists — and any event
 * would describe an interaction that happened before consent existed.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getConsentDeltaSince,
  isBaseEligibleForRenewal,
  useConsentStore,
  type ConsentDelta,
} from '@/core/stores/consentStore';
import { logError, LogCategory } from '@/core/services/logging';
import ReConsentScreen from './ReConsentScreen';
import StaleConsentIneligibleScreen from './StaleConsentIneligibleScreen';
import { submitReConsent, type ReConsentSubmission } from '../services/submitReConsent';

/**
 * The single user-facing failure message, for every stage.
 *
 * Truthful under all four: the write did not complete, retrying is safe and
 * converges, and nothing about their access changed in the meantime.
 */
const GENERIC_SUBMIT_ERROR =
  "We couldn't save your choices. Please try again — you can keep using Being in the " +
  'meantime, and we\'ll ask again next time you open the app.';

export interface ReConsentRouteProps {
  /** Dismiss the modal. Supplied by the navigator; the screen never navigates. */
  onDismiss: () => void;
}

const ReConsentRoute: React.FC<ReConsentRouteProps> = ({ onDismiss }) => {
  const staleConsent = useConsentStore((state) => state.staleConsent);
  const currentConsent = useConsentStore((state) => state.currentConsent);
  const declineReConsent = useConsentStore((state) => state.declineReConsent);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * `staleConsent ?? currentConsent` — the read `consentStore.ts:351-353`
   * prescribes. `version_mismatch` nulls `currentConsent` and retains the record
   * here; `expired` (not triggered on today, but the store action is
   * version-agnostic) does the opposite.
   *
   * Read for DISPLAY and delta computation only. `staleConsent`'s doc
   * (`consentStore.ts:345-349`) forbids reading it to WIDEN permission, which
   * this does not: nothing here reaches `canPerformOperation`, and every control
   * on the screen mounts unchecked regardless of what this record says.
   */
  const base = staleConsent ?? currentConsent;

  const delta: ConsentDelta | null = useMemo(
    () => (base ? getConsentDeltaSince(base.version) : null),
    [base],
  );

  const handleSubmit = useCallback(
    async (submission: ReConsentSubmission) => {
      setIsSubmitting(true);
      setErrorMessage(null);
      try {
        const result = await submitReConsent(submission);
        if (result.ok) {
          onDismiss();
          return;
        }
        // `result.stage` and `result.message` are internal diagnostics and stop
        // here by design — logged for us, never rendered to the user.
        logError(
          LogCategory.SYSTEM,
          `Re-consent submit failed at stage '${result.stage}': ${result.message}`,
          new Error(result.message),
        );
        setErrorMessage(GENERIC_SUBMIT_ERROR);
      } catch (error) {
        // `submitReConsent` returns rather than throws, so this is belt-and-braces
        // against a future refactor that stops doing so. Same user-facing copy:
        // an unexpected throw is not a different situation for them.
        logError(
          LogCategory.SYSTEM,
          'Re-consent submit threw unexpectedly',
          error instanceof Error ? error : new Error(String(error)),
        );
        setErrorMessage(GENERIC_SUBMIT_ERROR);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onDismiss],
  );

  /**
   * Decline dismisses UNCONDITIONALLY, even if the audit write fails.
   *
   * `declineReConsent` writes an audit entry and deliberately touches no consent
   * record and no `consentStatus` (`consentStore.ts:1325-1327`), so the stale
   * record still re-prompts next launch. Holding the user on the screen because
   * OUR audit write failed would convert a refusal they already made into a
   * screen they cannot leave — and the screen has no other exit
   * (`gestureEnabled: false`, no header).
   */
  const handleDecline = useCallback(async () => {
    try {
      await declineReConsent();
    } catch (error) {
      logError(
        LogCategory.SYSTEM,
        'Re-consent decline failed to record — dismissing anyway',
        error instanceof Error ? error : new Error(String(error)),
      );
    } finally {
      onDismiss();
    }
  }, [declineReConsent, onDismiss]);

  /**
   * Fail closed — and DISMISS, do not merely render nothing.
   *
   * The trigger checks for a base record before navigating, so reaching this is
   * a race (a store reset between navigate and mount), not a designed path.
   *
   * 🔴 `return null` alone would be a TRAP. The route is a `transparentModal`
   * with `gestureEnabled: false` and no header, so its card still covers the
   * screen and swallows touches even with no children — leaving the user on an
   * invisible modal with no exit, over a `Main` they can see but cannot reach.
   * The only safe failure here is to pop the route.
   */
  const hasRenderableConsent = Boolean(base && delta);
  useEffect(() => {
    if (!hasRenderableConsent) {
      logError(
        LogCategory.SYSTEM,
        'ReConsent mounted with no consent record to renew — dismissing',
        new Error('ReConsent mounted without a base consent record'),
      );
      onDismiss();
    }
  }, [hasRenderableConsent, onDismiss]);

  if (!base || !delta) {
    return null;
  }

  /**
   * DEBUG-418 — which screen, decided HERE rather than passed in.
   *
   * Re-derived from the SAME `isBaseEligibleForRenewal` the trigger used, so
   * there is one definition of the 18+ boundary and no route param that could
   * drift out of sync with the record — or be constructed by a caller to reach
   * the renewable screen with an ineligible record.
   *
   * 🔴 THE BLOCK IS STRUCTURAL, NOT COSMETIC. `ReConsentScreen` is the only
   * component that can produce an Art. 9(2)(a) affirmation, and this branch means
   * it is never MOUNTED for this cohort. That makes `submitReConsent`'s
   * `'ineligible'` age-failure stage — which this file's header describes as a
   * reachable race — unreachable from this path entirely.
   */
  if (!isBaseEligibleForRenewal(base)) {
    return (
      <StaleConsentIneligibleScreen
        delta={delta}
        isSubmitting={isSubmitting}
        onAcknowledge={handleDecline}
      />
    );
  }

  return (
    <ReConsentScreen
      delta={delta}
      currentPreferences={base.preferences}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      onSubmit={handleSubmit}
      onDecline={handleDecline}
    />
  );
};

export default ReConsentRoute;
