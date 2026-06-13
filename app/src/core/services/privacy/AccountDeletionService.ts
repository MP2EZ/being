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
 *   server delete → (true) → audit attestation → local wipe.
 * A `false` from the server delete ABORTS without touching local data so the
 * user can retry with their data intact.
 */

import supabaseService from '@/core/services/supabase/SupabaseService';
import SecureStorageService from '@/core/services/security/SecureStorageService';
import { useConsentStore } from '@/core/stores/consentStore';
import { logError, logSecurity, LogCategory } from '@/core/services/logging';

export type AccountDeletionResult =
  | { ok: true }
  | { ok: false; retryable: true };

/**
 * Erase the account everywhere. Returns `{ ok: true }` once the server account
 * is gone and local wellness data has been wiped (master key included), or
 * `{ ok: false, retryable: true }` if the server delete failed — in which case
 * NO local data was touched and the caller may safely retry the full sequence
 * (a second deleteAccount() on an already-erased account returns true via the
 * no-account fast path).
 */
export async function deleteAccountAndWipe(): Promise<AccountDeletionResult> {
  // 1. Server erasure FIRST. On failure, abort before touching local storage.
  const serverErased = await supabaseService.deleteAccount();
  if (!serverErased) {
    logSecurity('[AccountDeletion] server erase failed — local data preserved for retry', 'low');
    return { ok: false, retryable: true };
  }

  // 2. Terminal audit attestation BEFORE the wipe. It lands in the plaintext
  //    consent_history_v1 key, which is in ERASURE_EXCLUDED_SECURE_STORE_KEYS
  //    (survives the sweep) and is NOT master-key encrypted (survives
  //    deleteMasterKey:true). Best-effort: a failed attestation must not strand
  //    an already-successful server erasure.
  try {
    await useConsentStore.getState().recordAccountDeletionAttestation();
  } catch (error) {
    logError(
      LogCategory.SYSTEM,
      '[AccountDeletion] audit attestation write failed (continuing with wipe)',
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  // 3. On-device wipe incl. master key. Non-retryable once reached: if this
  //    throws, do NOT loop back to the server call — the account is already
  //    gone server-side and a retry of the whole sequence remains safe.
  await SecureStorageService.clearAllWellnessData({ deleteMasterKey: true });
  logSecurity('[AccountDeletion] local wellness data wiped after server erasure', 'low');
  return { ok: true };
}
