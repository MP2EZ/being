/**
 * AccountDeletionService (FEAT-267) — orchestrates the data-subject right to
 * erasure across the two halves that already exist:
 *   1. Server cascade  — SupabaseService.deleteAccount() (INFRA-260 PR3)
 *   2. On-device wipe   — SecureStorageService.clearAllWellnessData({ deleteMasterKey })
 *
 * This is UNGATED by design: erasure is a legal obligation under CCPA / TDPSA /
 * VCDPA / CPA / CTDPA / GDPR Art. 17, not a consent-dependent feature — gating a
 * data-subject right would itself be an unfair practice. (Mirrors the already-
 * ungated consentStore.exportConsentRecords().)
 *
 * NON-NEGOTIABLE ORDERING (compliance + crisis sign-off):
 *   server delete → (true) → erasure marker → audit attestation → in-memory reset
 *   → local wipe → marker cleared.
 * A `false` from the server delete ABORTS without touching local data so the
 * user can retry with their data intact.
 *
 * DEBUG-763: the local half is `completeLocalErasure`, shared with
 * `resumeInterruptedErasure`, which finishes it at the next launch when a kill or
 * a throw left the marker behind. This module is launch-path safety code.
 */

import supabaseService from '@/core/services/supabase/SupabaseService';
import SecureStorageService from '@/core/services/security/SecureStorageService';
import {
  resetAnalyticsIdentity,
  type AnalyticsIdentityResetTarget,
} from '@/core/analytics/analyticsIdentityReset';
import { useConsentStore } from '@/core/stores/consentStore';
import { clearLogAuditTrail, logError, logSecurity, LogCategory } from '@/core/services/logging';
import { env } from '@/core/config/env';
import {
  readPersistedSession,
  removePersistedSession,
  supabaseAuthStorageKey,
} from '@/core/services/supabase/secureStoreSessionAdapter';
import { sweepExportArtifacts } from './exportArtifactSweeper';
import { resetInMemoryStateForErasure } from './erasureResetRegistry';
import { clearErasurePending, markErasurePending, readErasurePendingAt } from './erasurePending';
import { awaitErasureInFlight, trackErasureInFlight } from './erasureResumeGate';

export type AccountDeletionResult =
  | { ok: true }
  | { ok: false; retryable: true };

/**
 * Erase the account everywhere. Returns `{ ok: true }` once the server account
 * is gone and local wellness data has been wiped (master key included), or
 * `{ ok: false, retryable: true }` if the server erasure is unconfirmed — in which
 * case NO local data was touched and the caller may safely retry the full sequence.
 *
 * DEBUG-704 — a retry converges through the server, not through a client-side fast
 * path. If an earlier attempt erased the account but its reply was lost, the session is
 * still persisted, so the retry reaches the edge function again; that call fails on the
 * missing user, and `deleteAccount()` then confirms erasure only from GoTrue answering
 * `user_not_found` for the session's own `sub`. The previous wording here ("returns
 * true via the no-account fast path") described the defect: that path returned true
 * whenever this run had built no client, without contacting the server at all.
 */
export async function deleteAccountAndWipe({
  posthog,
}: {
  /**
   * The live PostHog client, or `null` when the caller has none.
   *
   * DEBUG-539: REQUIRED and explicitly nullable, with no default. A future
   * caller must decide what to pass rather than silently inheriting the defect
   * this parameter exists to fix — an optional parameter would let a new
   * deletion entry point erase the account and leave the analytics identity
   * intact, which is exactly what happened here.
   *
   * `null` is not a fallback to "skip the reset": the primitive falls back to a
   * module-registered instance, and only unlinks storage when no instance was
   * ever built.
   */
  posthog: AnalyticsIdentityResetTarget | null;
}): Promise<AccountDeletionResult> {
  // 1. Server erasure FIRST. On failure, abort before touching local storage.
  const serverErased = await supabaseService.deleteAccount();
  if (!serverErased) {
    logSecurity('[AccountDeletion] server erase failed — local data preserved for retry', 'low');
    return { ok: false, retryable: true };
  }

  // 1b. DEBUG-763 — the marker, so a kill or a throw from here on is finished at the
  //     next launch. Best-effort: a marker fault must not strand a confirmed server
  //     erasure. Joins a resume in flight first, so the two never run concurrently.
  const erasedAt = Date.now();
  const prior = awaitErasureInFlight();
  const local = (async () => {
    await prior;
    try {
      await markErasurePending(erasedAt);
    } catch (error) {
      logSecurity('[AccountDeletion] erasure marker write failed (continuing with wipe)', 'high', {
        error: error instanceof Error ? error.name : 'Unknown error',
      });
    }
    await completeLocalErasure({ posthog, erasedAt });
  })();
  trackErasureInFlight(local);
  await local;
  return { ok: true };
}

/**
 * DEBUG-763 — steps 2-7: everything after a confirmed server erasure. Idempotent, so
 * a launch can re-run it over a partly wiped install. Rejects only when the wipe
 * throws, which leaves the marker for the next launch.
 */
export async function completeLocalErasure({
  posthog,
  erasedAt,
}: {
  posthog: AnalyticsIdentityResetTarget | null;
  /** The server-erasure time (the marker's value): the attestation's timestamp, never fabricated. */
  erasedAt: number;
}): Promise<void> {
  // 2. Terminal audit attestation BEFORE the wipe. It lands in the plaintext
  //    account_deletion_attestation_v1 key (and, for fallback, the legacy
  //    consent_history_v1 key), both in ERASURE_EXCLUDED_SECURE_STORE_KEYS
  //    (survive the sweep) and NOT master-key encrypted (survive
  //    deleteMasterKey:true). Best-effort: a failed attestation must not strand
  //    an already-successful server erasure — and step 6's deletion of the consent,
  //    legal-gate, age and device keys does not depend on it (DEBUG-762).
  try {
    // DEBUG-763: written only if this erasure's attestation is absent and a consent
    //  record remains to attest (consentStore decides).
    await useConsentStore.getState().recordAccountDeletionAttestation({ erasedAt });
  } catch (error) {
    logError(
      LogCategory.SYSTEM,
      '[AccountDeletion] audit attestation write failed (continuing with wipe)',
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  // 3. Analytics identity reset. AFTER the server delete (a failed one aborts
  //    with local state untouched) and BEFORE the wipe (so a wipe failure cannot
  //    strand a still-linked analytics identity).
  //
  //    Best-effort, mirroring the attestation above: a reset failure must never
  //    gate the wipe. Note the WIPE itself stays non-best-effort — swallowing its
  //    error would route a FAILED deletion to DeleteAccountScreen's success path.
  try {
    resetAnalyticsIdentity({ posthog });
  } catch (error) {
    logSecurity(
      '[AccountDeletion] analytics identity reset failed (continuing with wipe)',
      'high',
      { error: error instanceof Error ? error.message : 'Unknown error' },
    );
  }

  // 4. Plaintext export sweep (DEBUG-645). A data export is written to the app
  //    cache as plaintext JSON and deleted when its share settles, but a process
  //    killed in between never runs that delete, and the wipe below walks storage
  //    keys, never the filesystem. BEFORE the wipe, so a wipe failure cannot strand
  //    the most exposed copy; best-effort, like steps 2 and 3, because a throw here
  //    would report an already-completed server erasure as a failure.
  try {
    sweepExportArtifacts();
  } catch (error) {
    logSecurity(
      '[AccountDeletion] export-file sweep failed (continuing with wipe)',
      'high',
      { error: error instanceof Error ? error.message : 'Unknown error' },
    );
  }

  // 5. In-memory store reset (DEBUG-671). Stores still holding pre-erasure
  //    records would write them back on their next persist, so each registered
  //    store drops its state here. IMMEDIATELY BEFORE the wipe, so a persist
  //    already in flight lands on disk that is about to be cleared rather than
  //    after it. Best-effort like steps 2-4: the registry never rejects, and a
  //    store that fails to reset must not gate the wipe. Never runs on the abort
  //    path above, so a failed server delete leaves memory and timers untouched.
  try {
    const failed = await resetInMemoryStateForErasure();
    if (failed.length > 0) {
      logSecurity('[AccountDeletion] in-memory reset failed (continuing with wipe)', 'high', {
        owners: failed.join(','),
      });
    }
  } catch (error) {
    logSecurity('[AccountDeletion] in-memory reset failed (continuing with wipe)', 'high', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // 6. On-device wipe incl. master key. Non-retryable once reached: if this
  //    throws, do NOT loop back to the server call — the account is already
  //    gone server-side and a retry of the whole sequence remains safe.
  await SecureStorageService.clearAllWellnessData({ deleteMasterKey: true });
  logSecurity('[AccountDeletion] local wellness data wiped after server erasure', 'low');

  // 6b. DEBUG-763 — the erased session, if `deleteAccount`'s removal did not land (or
  //     this is a resume). Best-effort.
  try {
    const key = supabaseAuthStorageKey(env.EXPO_PUBLIC_SUPABASE_URL ?? '');
    if ((await readPersistedSession(key)).present) await removePersistedSession(key);
  } catch (error) {
    logSecurity('[AccountDeletion] persisted session removal failed', 'high', {
      error: error instanceof Error ? error.name : 'Unknown error',
    });
  }

  // 6c. DEBUG-763 — only now, after the wipe and master-key delete resolved.
  try {
    await clearErasurePending();
  } catch (error) {
    logSecurity('[AccountDeletion] erasure marker clear failed', 'medium', {
      error: error instanceof Error ? error.name : 'Unknown error',
    });
  }

  // 7. Drop the in-memory log audit trail LAST (DEBUG-355), so the entry the
  //    line above just pushed goes with it. Synchronous and structurally
  //    non-throwing by design — a rejection here, after both erasures have
  //    already succeeded, would be caught by DeleteAccountScreen and reported to
  //    the user as a failed deletion, skipping the navigation reset. The
  //    durable erasure evidence is the attestation written in step 2, not this
  //    in-memory echo.
  clearLogAuditTrail();
}

let resumeInFlight: Promise<void> | null = null;

/**
 * DEBUG-763 — finish an erasure the server confirmed but the device did not, at launch.
 *
 * Triggered by the marker alone (never by the clock or the attestation); no server call.
 * Single-flight, and joins a warm deletion in flight. Never rejects: on failure the
 * marker stays for the next launch, with no in-session retry. Shows NO UI and dispatches
 * NO navigation — any future post-wipe navigation must go through
 * runWhenNoCrisisDestinationFocused.
 */
export function resumeInterruptedErasure(): Promise<void> {
  if (resumeInFlight) return resumeInFlight;
  const prior = awaitErasureInFlight();
  const flight = (async () => {
    try {
      await prior;
      const erasedAt = await readErasurePendingAt();
      if (erasedAt === null) return;
      await completeLocalErasure({ posthog: null, erasedAt });
    } catch (error) {
      logSecurity('[AccountDeletion] interrupted erasure not finished — retried next launch', 'high', {
        error: error instanceof Error ? error.name : 'Unknown error',
      });
    }
  })();
  resumeInFlight = flight;
  trackErasureInFlight(flight);
  void flight.then(() => {
    if (resumeInFlight === flight) resumeInFlight = null;
  });
  return flight;
}
