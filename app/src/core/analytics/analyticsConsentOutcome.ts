/**
 * The analytics consent outcome for a consent-store snapshot (DEBUG-686, AC4).
 *
 * One pure, exhaustive function so every `ConsentStatus` has exactly one pinned
 * disposition for PostHog, and a new status cannot compile until it is given one
 * (same pattern as `decideWellnessWrite` in consentStore.ts):
 *
 *   emit  — `valid` AND analyticsEnabled AND NOT universalOptOut
 *   hold  — `loading`: consent is not yet known, so neither emit nor destroy
 *   purge — everything else: drop what PostHog has queued and keep it opted out
 *
 * `ConsentStatus` is imported TYPE-ONLY: several suites `jest.mock` the whole
 * consentStore module, and a value import here would hand them this module's
 * dependency on a mocked-away store.
 *
 * Scope: today only `consentWithdrawalPurge` consumes this. DEBUG-690 moves
 * `useAnalyticsConsent` onto it; until then that hook reads only the two
 * preference paths and ignores `consentStatus`.
 */

import type { ConsentStatus } from '@/core/stores/consentStore';

export type AnalyticsConsentOutcome = 'emit' | 'hold' | 'purge';

/**
 * The store fields the outcome reads. Structural, so a `ConsentStore` snapshot
 * (whose `currentConsent` is a full `ConsentRecord | null`) fits as-is.
 */
export interface AnalyticsConsentState {
  consentStatus: ConsentStatus;
  currentConsent: {
    preferences?: { analyticsEnabled?: boolean };
    universalOptOut?: boolean;
  } | null;
}

/** Analytics granted AND no universal opt-out (INFRA-151: the opt-out overrides). */
function preferencesAllowEmit(consent: AnalyticsConsentState['currentConsent']): boolean {
  if (!consent) return false;
  return consent.preferences?.analyticsEnabled === true && consent.universalOptOut !== true;
}

export function analyticsConsentOutcome(state: AnalyticsConsentState): AnalyticsConsentOutcome {
  const { consentStatus, currentConsent } = state;
  switch (consentStatus) {
    case 'loading':
      return 'hold';
    case 'valid':
      return preferencesAllowEmit(currentConsent) ? 'emit' : 'purge';
    case 'revoked':
    case 'missing':
    case 'integrity_error':
    case 'under_age':
    case 'version_mismatch':
    case 'expired':
      return 'purge';
    default: {
      // A new ConsentStatus must be given an analytics disposition before it compiles.
      const unhandled: never = consentStatus;
      throw new Error(`unhandled consent status: ${String(unhandled)}`);
    }
  }
}
