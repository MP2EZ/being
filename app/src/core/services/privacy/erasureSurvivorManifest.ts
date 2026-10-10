/**
 * erasureSurvivorManifest (DEBUG-775) — every app-owned storage key that is
 * ALLOWED to survive account erasure, and the disclosure each one falls under.
 *
 * Privacy policy §7.4 and DeleteAccountScreen's PRESERVED_NOTE promise that only
 * three things stay on the device after a deletion. This is that promise as data:
 * each category carries the exact phrase from both, and
 * `erasureSurvivorManifest.privacy.test.ts` runs the real `deleteAccountAndWipe`
 * over every key the source can write or read and asserts that what survives is
 * exactly this list. A key that survives without a row here fails that suite, so
 * the fix for a new survivor is to SWEEP it — adding a row moves the published
 * policy (§7.4, PRESERVED_NOTE, a §10 revision and generate:legal-content) and
 * goes back through compliance.
 *
 * A survivor must hold no identifier and no information about the deleted user.
 * Activity-bearing keys (backup/sync timestamps, retention audit counts, error
 * alerts) do not qualify; they are swept by `ACCOUNT_ERASURE_ASYNC_KEYS` /
 * `ACCOUNT_ERASURE_ASYNC_PREFIXES` in SecureStorageService.
 *
 * Dependency-free on purpose: the manifest test and documentation read it.
 */

export const ERASURE_SURVIVOR_CATEGORIES = {
  DELETION_RECORD: {
    preservedNote: 'a short record that this deletion happened',
    policy: 'the account-deletion record described in §7.3',
  },
  FIRST_OPEN_MARKER: {
    preservedNote: 'a note that the app was opened before',
    policy: 'a marker that records only that the app has been opened on this device before',
  },
  APP_SETTINGS_CACHE: {
    preservedNote: 'some app settings caches that hold no information about you',
    policy: 'some app settings caches that hold no information about you',
  },
} as const;

export type ErasureSurvivorCategory = keyof typeof ERASURE_SURVIVOR_CATEGORIES;

export interface ErasureSurvivor {
  key: string;
  store: 'async' | 'secure';
  category: ErasureSurvivorCategory;
  /**
   * `always` — kept by the wipe whenever present.
   * `default-form-only` — may remain only holding defaults, never the deleted
   * user's choices (its erasure reset removes it today, which is stricter).
   */
  retention: 'always' | 'default-form-only';
  why: string;
}

export const ERASURE_SURVIVOR_MANIFEST: readonly ErasureSurvivor[] = [
  {
    key: 'account_deletion_attestation_v1',
    store: 'secure',
    category: 'DELETION_RECORD',
    retention: 'always',
    why: 'Art. 17(3)(b) evidence that the erasure happened: booleans, a timestamp, a count (DEBUG-545).',
  },
  {
    key: 'consent_history_v1',
    store: 'secure',
    category: 'DELETION_RECORD',
    retention: 'always',
    why: 'Legacy single-entry fallback copy of the attestation; stripped once the isolated key verifies (DEBUG-762).',
  },
  {
    key: '@being/analytics_has_launched_before',
    store: 'async',
    category: 'FIRST_OPEN_MARKER',
    retention: 'always',
    why: 'A bare flag that the app was opened before on this device.',
  },
  {
    key: 'being.consent_history_migration_v2',
    store: 'async',
    category: 'APP_SETTINGS_CACHE',
    retention: 'always',
    why: 'Storage-migration completion flag.',
  },
  {
    key: 'being.encryption_migration_v2',
    store: 'secure',
    category: 'APP_SETTINGS_CACHE',
    retention: 'always',
    why: 'Encryption-migration completion flag.',
  },
  {
    key: 'app_settings_v1',
    store: 'async',
    category: 'APP_SETTINGS_CACHE',
    retention: 'default-form-only',
    why: 'App settings; resetSettingsForErasure removes it (DEBUG-755), and any later write is defaults.',
  },
];
