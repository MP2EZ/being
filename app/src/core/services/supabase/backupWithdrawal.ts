/**
 * DEBUG-764 — when withdrawing cloud-backup consent must delete the server copy.
 *
 * Pure and dependency-free (type imports only), so the rule is readable on its own and
 * consentStore never has to import the service that hosts the crisis audit sink.
 *
 * Compliance ruling R2: delete on a COMMITTED consent transition where the prior record had
 * cloud sync on and was not revoked, and the next record is non-null with cloud sync off or
 * revoked. That covers the Settings Backup switch (updateConsent), revokeConsent, and a
 * re-consent submitted with backup unticked (renewConsent, whose prior record sits on
 * `staleConsent` in the version_mismatch state).
 *
 * Never fires on: Universal Opt-Out on/off (R1: suppression only, the preference is
 * unchanged), hydration null -> record, erasure reset to null, version_mismatch / expiry /
 * under_age / 'loading' (each leaves the record as it was, or nulls it), or the
 * CloudBackupSettings auto-backup toggle (not a consent record at all).
 */
import type { ConsentRecord, ConsentStatus } from '@/core/stores/consentStore';

/** The pending delete, in its own key: the offline queue drops and evicts (R4). */
export const PENDING_BACKUP_DELETE_KEY = '@being/supabase/pending_backup_delete';

/**
 * CloudBackupService's change-detection record. Cleared after a confirmed delete so a
 * re-grant uploads a fresh backup even when the data is unchanged; shared here because
 * SupabaseService clears it whether or not CloudBackupService was ever loaded.
 */
export const LAST_BACKUP_KEY = '@being/cloud_backup/last_backup';

export interface ConsentSnapshot {
  currentConsent: ConsentRecord | null;
  staleConsent?: ConsentRecord | null;
  consentStatus?: ConsentStatus;
}

export function isBackupConsentWithdrawal(
  prev: ConsentSnapshot | null | undefined,
  next: ConsentSnapshot | null | undefined,
): boolean {
  const before = prev?.currentConsent ?? prev?.staleConsent ?? null;
  const after = next?.currentConsent ?? null;
  if (!before || !after || before === after) return false;
  if (before.revoked || before.preferences?.cloudSyncEnabled !== true) return false;
  return after.revoked === true || after.preferences?.cloudSyncEnabled === false;
}

/** Consent became known for this process: the boot point to retry a pending delete (R3). */
export function isConsentHydration(
  prev: ConsentSnapshot | null | undefined,
  next: ConsentSnapshot | null | undefined,
): boolean {
  return prev?.consentStatus === 'loading' && next?.consentStatus !== 'loading';
}
