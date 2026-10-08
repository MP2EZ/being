/**
 * resolveInitialRoute — the root navigator's first-route decision, as a pure function
 * (DEBUG-755). `CleanRootNavigator.checkInitialRoute` gathers the inputs; this decides.
 *
 * ORDERING IS DELIBERATE (DEBUG-418/451) and unchanged: an onboarded launch goes to Main
 * whatever its consent status — version_mismatch, revoked, under_age, integrity_error and
 * expired users are served there by the re-consent and consent-blocked surfaces. Do not
 * reorder this to "consent first": that changes the root those cohorts land on.
 *
 * The one added input is `retired`: the launch's consent record does not post-date an
 * account-deletion attestation, so the onboarded state belongs to an erased account and
 * must never reach Main. A retired launch goes to LegalGate — an existing root route,
 * FAB-suppressed, whose 988 footer is unconditional (DEBUG-341).
 */

import type { ConsentStatus } from '@/core/stores/consentStore';

export type InitialRoute = 'Main' | 'LegalGate' | 'Onboarding';

export interface InitialRouteInputs {
  settings: { onboardingCompleted?: boolean } | null;
  consent: unknown;
  /** The navigator's render-closure status. 'loading' on the first run — see below. */
  consentStatus: ConsentStatus;
  retired: boolean;
}

export function resolveInitialRoute({
  settings,
  consent,
  consentStatus,
  retired,
}: InitialRouteInputs): InitialRoute {
  if (retired) return 'LegalGate';
  if (settings?.onboardingCompleted) return 'Main';
  // `!consent` carries the first run, where the closure status is still 'loading'.
  if (!consent || consentStatus === 'missing' || consentStatus === 'under_age') return 'LegalGate';
  return 'Onboarding';
}
