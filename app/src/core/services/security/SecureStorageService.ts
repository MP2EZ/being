/**
 * SECURE STORAGE SERVICE - DRD-FLOW-005 Security Implementation
 *
 * Comprehensive secure storage for wellness data:
 * - Hybrid: AES-256-GCM ciphertext in AsyncStorage; master key in platform Keychain (expo-secure-store)
 * - Tiered storage based on data sensitivity (PHQ-9/GAD-7)
 * - Automatic encryption/decryption with performance optimization
 * - Wellness data lifecycle management and cleanup
 * - Audit trails and access logging
 *
 * STORAGE ARCHITECTURE (INFRA-144):
 * - Level 1: Assessment data (AsyncStorage ciphertext + AES-256-GCM)
 * - Level 2: Intervention metadata (SecureStore + AES-256)
 * - Level 3: Performance data (AsyncStorage + basic encryption)
 * - Level 4: General data (AsyncStorage, unencrypted)
 *
 * A `crisis_tier` sat above assessment until MAINT-378. It was removed as dead
 * code: its writer (`storeCrisisData`) had a single caller in an unwired service
 * and its reader (`retrieveCrisisData`) had none. The crisis safety plan is not,
 * and since MAINT-123 never has been, persisted through this service. The
 * `crisis_async_` / `crisis_secure_` namespaces are retained in the erasure paths
 * below as a defensive floor for records on already-shipped installs — see
 * SWEPT_ASYNC_PREFIXES.
 *
 * `storeAssessmentData` was removed in MAINT-716 on the same grounds (no
 * production caller), and `retrieveAssessmentData` and `deleteSecureData` went in
 * MAINT-790 for the same reason. `assessment_async_` stays swept for records
 * already on disk.
 *
 * Plaintext is never written to disk. AES-256-GCM ciphertext is opaque;
 * confidentiality derives from the key (held in Keychain), not the
 * substrate. Removing SecureStore as the substrate for assessment data
 * escapes the iOS Keychain 2KB per-attribute limit without weakening the
 * encryption boundary.
 *
 * PERFORMANCE REQUIREMENTS:
 * - Assessment data access: <300ms
 * - Background sync: <1000ms for data export
 *
 * DATA PROTECTION STANDARDS:
 * - Privacy-compliant storage with audit trails
 * - Secure data deletion and device cleanup
 */


import { logSecurity, logError, logSystem, LogCategory } from '../logging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { isLegacyPlaintextRecord } from './legacyPlaintextRecordSweeper';
import EncryptionService, { 
  EncryptedDataPackage, 
  DataSensitivityLevel 
} from './EncryptionService';

/**
 * The persisted metadata index (DEBUG-381).
 *
 * Named rather than inlined because it is swept by `clearAllWellnessData` and
 * asserted by the erasure privacy suites — sites that must agree. It was a bare
 * string literal at three of them, which is the same hand-copied-mirror shape
 * that let `audit_log_` go unswept through two work items (see
 * `SWEPT_ASYNC_PREFIXES` below).
 *
 * NOTHING WRITES OR READS IT. MAINT-716 deleted `storeAssessmentData`, its last
 * writer; MAINT-790 deleted `loadStorageMetadata`, its last reader. It survives
 * only as a sweep key: shipped installs may still carry the file and erasure
 * deletes it. `storageMetadataIndexErasure.privacy.test.ts` pins the absence of
 * both a writer and a reader, so neither can be re-added unnoticed.
 *
 * Its contents on those installs are CLEARTEXT and crisis-describing: one record
 * per stored blob carrying `storageKey` (e.g. `crisis_async_<episodeId>`),
 * `storageTier`, `sensitivityLevel`, `dataType` and access timestamps. No
 * wellness content — but enough to establish that a crisis episode existed and
 * when.
 */
export const STORAGE_METADATA_INDEX_KEY = 'storage_metadata_index';

/**
 * SECURE STORAGE CONFIGURATION
 */
export const SECURE_STORAGE_CONFIG = {
  GENERAL_PREFIX: 'general_',

  /** AsyncStorage prefixes for hybrid wellness storage (INFRA-144) */
  CRISIS_ASYNC_PREFIX: 'crisis_async_',
  ASSESSMENT_ASYNC_PREFIX: 'assessment_async_',
  WELLNESS_ASYNC_PREFIX: 'wellness_async_',
  /** Marker namespace so re-running migration is O(1) per record */
  MIGRATION_MARKER_PREFIX: 'wellness_migrated:',
  MIGRATION_MARKER_VERSION: 'v1',

  /**
   * Keys swept on erasure by EXACT name rather than by prefix (DEBUG-305).
   *
   * The prefix convention is the rule; this is the auditable exception list for
   * keys that cannot adopt a prefix. `crisis_analytics_queue` is the pending
   * upload buffer for `crisis_detected` telemetry: renaming it would strand
   * events already queued on existing installs, so it keeps its name and is
   * named here instead.
   *
   * It is swept on erasure but NOT purged at launch — it must survive ordinary
   * restarts to flush. On account deletion it must go: `deleteAccountAndWipe`
   * erases the server BEFORE wiping locally, so a surviving queue would flush
   * on next launch and re-create crisis rows for an account the user deleted.
   *
   * Anything added here must also be covered by the crisis-path erasure guard
   * in `crisisRecordErasure.privacy.test.ts`, which reads this same constant —
   * so the exception list cannot silently grow a hole.
   *
   * `storage_metadata_index` (DEBUG-381) has had no writer since MAINT-716 and
   * no reader since MAINT-790, so membership here is the whole erasure control
   * for it: it deletes residue left by shipped installs, and nothing re-creates
   * the file afterwards. Before MAINT-716 the key was inert on its own, because
   * `storeMetadata` re-serialised an in-memory cache on every write and restored
   * the file verbatim. The no-writer and no-reader pins are in
   * `storageMetadataIndexErasure.privacy.test.ts`; a re-introduced writer
   * reopens that restore-on-write hole.
   *
   * 🔴 `@being/supabase/offline_queue` (DEBUG-698) IS INERT WITHOUT
   * SupabaseService's registered erasure reset (`resetOfflineQueueForErasure`,
   * via `erasureResetRegistry`). It is the config-backup retry buffer — its
   * payloads are CloudBackupService ciphertext under the master key, so this is
   * residue hygiene, not plaintext — and it is NOT passive: `queueOfflineOperation`,
   * `processOfflineQueue` and `cleanup` each re-serialise the whole in-memory
   * queue, so the key alone is restored by the next of them. Membership and the
   * reset land and stay together. Pin: `offlineQueueErasure.privacy.test.ts`. Live,
   * so it is not swept at launch (it must survive restarts to retry).
   *
   * Note the entries fail differently, which is why one comment cannot serve
   * them all: `crisis_analytics_queue` is a passive buffer that nothing rewrites
   * after erasure, so for IT the list membership genuinely is the whole control.
   *
   * DEBUG-539 — do NOT add PostHog's residuals here. `.posthog-rn.json` and
   * `.posthog-rn-logs.json` are storage KEYS that resolve to FILENAMES in the
   * document directory under the `expo-file-system` backend, not AsyncStorage
   * keys, so listing them deletes nothing and a test asserting "no AsyncStorage
   * key matches /posthog/i" passes before any fix and would pass forever. They
   * are handled in `core/analytics/analyticsIdentityReset.ts`, which resets
   * THROUGH the live instance where one exists — deleting the files under a live
   * client is the same write-back fake control described above for
   * `@being/supabase/offline_queue`. A tripwire pins the backend branch, because if a future
   * dependency resolution loses `Paths`/`File` the adapter silently becomes
   * AsyncStorage-backed and THIS list becomes the correct fix.
   */
  SWEPT_EXACT_KEYS: [
    '@being/supabase/crisis_analytics_queue',
    STORAGE_METADATA_INDEX_KEY,
    '@being/supabase/offline_queue',
    // DEBUG-764: holds the uid; SupabaseService.resetOfflineQueueForErasure drops its memory copy.
    '@being/supabase/pending_backup_delete',
  ] as readonly string[],

  /** Storage limits */
  MAX_SECURE_STORE_SIZE: 2048, // 2KB limit for SecureStore (legacy path)
  MAX_WELLNESS_PAYLOAD_SIZE: 256 * 1024, // 256KB cap for wellness ciphertext in AsyncStorage
  MAX_ASYNC_STORAGE_SIZE: 6 * 1024 * 1024, // 6MB total AsyncStorage budget
  BULK_OPERATION_LIMIT: 100,
  
  /** Performance thresholds */
  CRISIS_ACCESS_THRESHOLD_MS: 200,
  ASSESSMENT_ACCESS_THRESHOLD_MS: 300,
  BULK_OPERATION_THRESHOLD_MS: 500,
  
  /** Cleanup configuration */
  CACHE_EXPIRY_MS: 30 * 60 * 1000, // 30 minutes
  
  /** Audit configuration */
  AUDIT_LOG_PREFIX: 'audit_log_',
  MAX_AUDIT_ENTRIES: 10000
} as const;

/**
 * AsyncStorage prefix families swept by `clearAllWellnessData` (DEBUG-355).
 *
 * Exported so the erasure privacy suites assert against the SAME list the sweep
 * filters on. They previously hand-copied it, which is how `audit_log_` went
 * unnoticed: production could gain or lose a prefix and every mirror kept
 * passing. `SWEPT_EXACT_KEYS` above already had this property; this is the
 * prefix half.
 *
 * `audit_log_` is on this list as a defensive floor. `logStorageAccess` used to
 * persist an entry on every failed operation (and on every `crisis_tier`
 * operation until MAINT-378 removed that tier); MAINT-716 left that failure arm
 * reachable only through two methods with no production caller, and MAINT-790
 * deleted the arm, so no code writes the prefix. Nothing reads those records
 * back, so before DEBUG-355 nothing in the app could remove them at all. Unlike
 * the SecureStore `critical_log_*` records in the same work item, these
 * enumerate — so the prefix here clears already-shipped installs retroactively,
 * with no migration and no persisted index.
 *
 * `crisis_async_` is retained here after MAINT-378 deleted the tier that wrote
 * it. The namespace is now write-free: no production code path produces such a
 * key. It stays as a defensive erasure floor for records that may exist on
 * already-shipped installs. Removing a prefix from this sweep is a one-way
 * compliance regression — there is no way to re-erase what a shipped build left
 * behind once the sweep stops looking for it.
 */
export const SWEPT_ASYNC_PREFIXES = [
  SECURE_STORAGE_CONFIG.CRISIS_ASYNC_PREFIX,
  SECURE_STORAGE_CONFIG.ASSESSMENT_ASYNC_PREFIX,
  SECURE_STORAGE_CONFIG.WELLNESS_ASYNC_PREFIX,
  SECURE_STORAGE_CONFIG.MIGRATION_MARKER_PREFIX,
  SECURE_STORAGE_CONFIG.AUDIT_LOG_PREFIX,
] as const;

/**
 * MAINT-241 — right-to-erasure manifest.
 *
 * SecureStore has no enumerate API, so a full wipe must explicitly name every
 * fixed wellness key that lives OUTSIDE the sweepable AsyncStorage prefixes.
 * Keep this in sync whenever a new SecureStore-backed wellness key is added.
 */
export const WELLNESS_SECURE_STORE_KEYS = [
  'stoic_practice_state',        // stoicPracticeStore — check-ins, virtue progress
  'assessment_store_encrypted',  // assessmentStore — PHQ-9 / GAD-7 history
  'subscription_secure_v1',      // subscriptionStore — entitlement state
  'stoic_session_morning',       // SessionStorageService — per-flow session blobs
  'stoic_session_midday',
  'stoic_session_evening',
  'stoic_session_daily_loop',    // DEBUG-671: every SESSION_STORAGE_KEYS value, pinned
] as const;

/**
 * DEBUG-545 — the account-deletion attestation's own key.
 *
 * It exists as a SEPARATE key from `consent_history_v1` because that key is
 * shared with the consent-history chain, whose migration into AES-256-GCM
 * AsyncStorage is REQUIRED behaviour and cannot be switched off. The attestation
 * rode along with it: `readWithLegacyFallback` relocated the plaintext hit into
 * `wellness_async_*` and deleted the SecureStore copy, and both that prefix and
 * the migration marker are in `SWEPT_ASYNC_PREFIXES` — so the Art. 17(3)(b)
 * evidence left its erasure-excluded home on the next consent read and became
 * sweepable by any later `clearAllWellnessData`, including a partial one.
 *
 * Plaintext at rest is deliberate, not an oversight: the record must survive
 * `deleteMasterKey: true`, and AES-256-GCM under a deleted master key is
 * unrecoverable. It carries no identifier — booleans, a timestamp and a count —
 * which is what makes plaintext acceptable, and that ceiling is load-bearing.
 */
export const ACCOUNT_DELETION_ATTESTATION_KEY = 'account_deletion_attestation_v1';

/**
 * Keys DELIBERATELY EXCLUDED from the erasure sweep (documented so the
 * exclusion is a reviewable decision, not an accidental omission). Like the
 * manifest above this is DOCUMENTATION plus assertion coverage: `clearAllWellnessData`
 * deletes only what it enumerates, so a key's ABSENCE from every deleting list
 * is the real protection.
 *
 *  - `ACCOUNT_DELETION_ATTESTATION_KEY` — the Art. 17(3)(b) record that an
 *    erasure happened. Carries no identifier (see its doc).
 *  - `consent_history_v1` — NOT the history chain (that is an encrypted
 *    `wellness_async_*` blob and is swept). It is the legacy plaintext key the
 *    attestation was dual-written to (DEBUG-545), and it is excluded only so that
 *    copy can serve as the single-entry fallback when the isolated key cannot
 *    be read. `stripLegacyAttestationCopy` removes it as soon as the isolated key
 *    verifies, and deletes it outright if it ever holds more than that one entry.
 *
 * DEBUG-762 moved the consent record, legal-gate acceptances, age check and the
 * device anchors OUT of this list and into `ACCOUNT_ERASURE_SECURE_STORE_KEYS`:
 * they belong to the account, and keeping them was never evidence of anything
 * the attestation does not already prove.
 */
export const ERASURE_EXCLUDED_SECURE_STORE_KEYS = [
  'consent_history_v1',
  ACCOUNT_DELETION_ATTESTATION_KEY,
] as const;

/**
 * DEBUG-762 — fixed SecureStore keys that belong to the ACCOUNT and are deleted
 * by a full account-deletion wipe (`clearAllWellnessData({ deleteMasterKey: true })`)
 * only. NEVER by a logout or partial clear: the consent record and age check are
 * what lets a signed-in user keep using the app.
 *
 *  - `consent_record_v1`, `legal_gate_consents_v1`, `age_verification_v1` — the
 *    deleted account's consent, legal acceptances and age check. Until DEBUG-762
 *    these survived (DEBUG-755 only retired them), so the next person on the device
 *    inherited a stale record and the privacy policy said "retained indefinitely".
 *  - `privacy_policy_ack_v1` (FEAT-860) — the record that this person saw the policy at some
 *    version. Acknowledgement, not consent; account-scoped, so the next person must see the
 *    material changes themselves.
 *  - `auth_device_id` — the pre-INFRA-260 device-identity anchor. Nothing reads it
 *    since the anonymous Supabase session replaced it; deleting it cannot
 *    de-authenticate anyone.
 *  - `@being/device_id` — written only by `EncryptionService.generateSecureDeviceId`,
 *    which has no caller. Listed so a build that ever wrote it cannot keep it.
 *
 * Deleted BEFORE the master key and NOT best-effort: a failed delete throws, so
 * `deleteAccountAndWipe` reports failure and the user retries (the server account
 * is already gone, which is why that retry is safe).
 */
export const ACCOUNT_ERASURE_SECURE_STORE_KEYS = [
  'consent_record_v1',
  'legal_gate_consents_v1',
  'age_verification_v1',
  'privacy_policy_ack_v1',
  'auth_device_id',
  '@being/device_id',
] as const;

/**
 * DEBUG-775 — AsyncStorage keys that are information about the ACCOUNT rather than
 * wellness content, deleted by a full account-deletion wipe only (alongside
 * `ACCOUNT_ERASURE_SECURE_STORE_KEYS`). Privacy policy §7.4 says only the deletion
 * record, the first-open marker and settings caches stay on the device
 * (`erasureSurvivorManifest.ts`); each of these is activity data that does not
 * qualify, so it goes.
 *
 *  - cloud backup / sync: config, last-backup time and hash, stats, error history
 *    and last-sync time. Every writer is gated on `cloud_sync` consent, which the
 *    wipe deletes, so sweeping the key is the whole control (no erasure reset).
 *    One window remains: a backup already past its consent check writes
 *    `last_backup` after its awaited upload (no wellness data; DPIA residual).
 *  - `data_retention_*`: the retention audit (category, record counts, oldest and
 *    newest screening dates) and its daily limiter. `runRetentionCleanup` is fenced
 *    off while an erasure is pending or in flight, so it cannot rewrite them.
 *  - `consent_cache_v1`: the deleted account's privacy choices. A backstop to the
 *    consent store's own reset.
 *  - Dead writers a shipped build may have left: the circuit-breaker fallback caches
 *    and `subscription_metadata_v1`; `@being/cloud_backup/stats` and
 *    `@being/cloud_sync/stats` (read, never written, today).
 *
 * `error_alert_*` (sanitized alert events) and `circuit_breaker_queue_*` (unsanitized
 * retry context) are prefix families in `ACCOUNT_ERASURE_ASYNC_PREFIXES`; both
 * writers are reached only through CircuitBreaker, which has no production caller.
 */
export const ACCOUNT_ERASURE_ASYNC_KEYS = [
  '@being/cloud_backup/config',
  '@being/cloud_backup/last_backup',
  '@being/cloud_backup/stats',
  '@being/cloud_sync/stats',
  '@being/cloud_sync/error_history',
  '@being/supabase/last_sync',
  'data_retention_audit_log',
  'data_retention_last_cleanup',
  'consent_cache_v1',
  'assessment_cache',
  'auth_cache',
  'network_cache',
  'subscription_metadata_v1',
] as const;

export const ACCOUNT_ERASURE_ASYNC_PREFIXES = ['error_alert_', 'circuit_breaker_queue_'] as const;

/**
 * DEBUG-545 — keys that must NEVER be routed through the legacy-migration path.
 *
 * A SEPARATE list from `ERASURE_EXCLUDED_SECURE_STORE_KEYS`, and conflating the
 * two would break consent history outright: `consent_history_v1` is erasure-
 * excluded AND is legitimately passed to `readWithLegacyFallback` on every load.
 * Erasure-exclusion says "the sweep leaves this alone"; migration-isolation says
 * "no code path may relocate this into sweepable storage". Only the second is
 * what the attestation needs.
 *
 * Enforced in `readWithLegacyFallback` rather than left as a convention, because
 * the defect it prevents is silent: the write succeeds, the read succeeds, and
 * the record is simply gone one launch later.
 */
export const MIGRATION_ISOLATED_SECURE_STORE_KEYS = [
  ACCOUNT_DELETION_ATTESTATION_KEY,
] as const;

/**
 * STORAGE TIER DEFINITIONS
 */
export type StorageTier =
  | 'assessment_tier'    // High security - AsyncStorage ciphertext + AES-256-GCM (master key in Keychain)
  | 'intervention_tier'  // Medium security - SecureStore + Level 3 encryption
  | 'performance_tier'   // Low security - AsyncStorage + basic encryption
  | 'general_tier';      // Minimal security - AsyncStorage, unencrypted

/**
 * Legacy SecureStore data format. INFRA-144 migration handles two shapes:
 * - 'encrypted_package': existing AES-256-GCM ciphertext. Migration
 *   decrypt-verifies under the current master key before moving to
 *   AsyncStorage.
 * - 'plaintext_json': pre-INFRA-144 plain JSON written directly to SecureStore
 *   (assessment_store_encrypted and consent_history_v1 — the variable was named
 *   "encrypted" but the data was JSON-stringified plaintext relying solely on
 *   Keychain hardware encryption). Migration encrypts on the fly.
 */
export type LegacyFormat = 'encrypted_package' | 'plaintext_json';

/**
 * STORAGE OPERATION RESULT
 */
export interface StorageOperationResult {
  success: boolean;
  operationType: 'store' | 'retrieve' | 'delete' | 'bulk_operation';
  storageKey: string;
  operationTimeMs: number;
  dataSize: number;
  error?: string | undefined;
}

/**
 * STORAGE ACCESS LOG ENTRY
 */
export interface StorageAccessLogEntry {
  timestamp: number;
  operationType: 'store' | 'retrieve' | 'delete' | 'bulk' | 'cleanup';
  storageKey: string;
  storageTier: StorageTier;
  dataType: string;
  success: boolean;
  operationTimeMs: number;
  dataSize: number;
  userContext?: string | undefined;
  securityContext?: string;
  error?: string;
}

/**
 * COMPREHENSIVE SECURE STORAGE SERVICE
 * Handles all wellness data storage with appropriate security levels
 */
export class SecureStorageService {
  private static instance: SecureStorageService;
  private encryptionService: typeof EncryptionService;
  private accessLog: StorageAccessLogEntry[] = [];

  private constructor() {
    this.encryptionService = EncryptionService;
  }

  public static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  /**
   * MAINT-190: Test-only escape hatch for singleton state isolation.
   * Clears the in-memory access log and drops the singleton. Does NOT delete
   * persisted secure-store entries — those belong to the underlying
   * expo-secure-store and survive process restarts. Tests that need a clean
   * store must call the explicit clear/erase APIs.
   *
   * Production safety: throws if NODE_ENV !== 'test'.
   */
  public static __resetForTesting__(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'SecureStorageService.__resetForTesting__() called outside NODE_ENV=test — refusing to clear secure storage state in production'
      );
    }
    if (SecureStorageService.instance) {
      SecureStorageService.instance.accessLog = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional: nulling private static reset target
    SecureStorageService.instance = undefined as any;
  }

  /**
   * GENERAL DATA STORAGE
   * Lower security tiers for non-sensitive data
   */
  public async storeGeneralData(
    key: string,
    data: any,
    tier: StorageTier,
    userContext?: string
  ): Promise<StorageOperationResult> {
    const startTime = performance.now();

    try {
      const storageKey = `${SECURE_STORAGE_CONFIG.GENERAL_PREFIX}${key}`;
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);

      if (tier === 'general_tier') {
        // Store unencrypted in AsyncStorage
        await AsyncStorage.setItem(storageKey, dataString);
      } else {
        // Store with basic encryption
        const encryptedPackage = await this.encryptionService.encryptData(
          data,
          'level_5_general_data'
        );
        await AsyncStorage.setItem(storageKey, JSON.stringify(encryptedPackage));
      }

      const operationTime = performance.now() - startTime;

      return {
        success: true,
        operationType: 'store',
        storageKey,
        operationTimeMs: operationTime,
        dataSize: dataString.length
      };

    } catch (error) {
      const operationTime = performance.now() - startTime;
      
      return {
        success: false,
        operationType: 'store',
        storageKey: `${SECURE_STORAGE_CONFIG.GENERAL_PREFIX}${key}`,
        operationTimeMs: operationTime,
        dataSize: 0,
        error: (error instanceof Error ? error.message : String(error))
      };
    }
  }

  public async retrieveGeneralData(
    key: string,
    userContext?: string
  ): Promise<any | null> {
    try {
      const storageKey = `${SECURE_STORAGE_CONFIG.GENERAL_PREFIX}${key}`;
      const dataString = await AsyncStorage.getItem(storageKey);
      
      if (!dataString) {
        return null;
      }

      // Try to parse as JSON
      try {
        return JSON.parse(dataString);
      } catch {
        return dataString;
      }

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 GENERAL DATA RETRIEVAL ERROR:', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * VALIDATION AND VERIFICATION
   */

  private async validateStorageSize(
    encryptedPackage: EncryptedDataPackage,
    storageTier: StorageTier
  ): Promise<void> {
    const packageSize = JSON.stringify(encryptedPackage).length;

    if (storageTier === 'assessment_tier') {
      // Hybrid: ciphertext sits in AsyncStorage now. Cap at 256KB per record
      // to keep AsyncStorage performant and force pagination on unbounded
      // growth (assessment history, consent audit trail) rather than allowing
      // single records to grow without limit.
      if (packageSize > SECURE_STORAGE_CONFIG.MAX_WELLNESS_PAYLOAD_SIZE) {
        throw new Error(`Wellness payload size limit exceeded: ${packageSize} > ${SECURE_STORAGE_CONFIG.MAX_WELLNESS_PAYLOAD_SIZE}`);
      }
    } else {
      if (packageSize > SECURE_STORAGE_CONFIG.MAX_ASYNC_STORAGE_SIZE) {
        throw new Error(`AsyncStorage size limit exceeded: ${packageSize} > ${SECURE_STORAGE_CONFIG.MAX_ASYNC_STORAGE_SIZE}`);
      }
    }
  }

  /**
   * Hybrid storage: AES-256-GCM ciphertext written to AsyncStorage;
   * master key stored in platform Keychain (expo-secure-store).
   * Plaintext is never written to disk. This architecture removes the 2KB
   * per-attribute size limit of Keychain without reducing the encryption boundary.
   *
   * Migration: on first read of a legacy Keychain key, ciphertext is moved to
   * AsyncStorage and deleted from Keychain. Idempotent; safe to re-run.
   */
  public async storeWellnessBlob(
    key: string,
    data: unknown,
    sensitivityLevel: DataSensitivityLevel,
    userContext?: string
  ): Promise<StorageOperationResult> {
    const startTime = performance.now();
    const storageKey = `${SECURE_STORAGE_CONFIG.WELLNESS_ASYNC_PREFIX}${key}`;

    try {
      // Lazy-init the encryption layer so callers can hit these methods
      // before any app-startup ordering completes (e.g. Zustand persist
      // rehydration for the assessment store fires at module load).
      // encryptionService.initialize is idempotent and shares the in-flight
      // promise across concurrent calls. Nothing else initialises this service.
      await this.encryptionService.initialize();

      const encryptedPackage = await this.encryptionService.encryptData(data, sensitivityLevel);
      await this.validateStorageSize(encryptedPackage, 'assessment_tier');
      await AsyncStorage.setItem(storageKey, JSON.stringify(encryptedPackage));

      const dataSize = JSON.stringify(encryptedPackage).length;
      const operationTime = performance.now() - startTime;

      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'store',
        storageKey,
        storageTier: 'assessment_tier',
        dataType: 'wellness_blob',
        success: true,
        operationTimeMs: operationTime,
        dataSize,
        userContext,
        securityContext: 'wellness_blob_storage'
      });

      return {
        success: true,
        operationType: 'store',
        storageKey,
        operationTimeMs: operationTime,
        dataSize
      };
    } catch (error) {
      const operationTime = performance.now() - startTime;
      logError(LogCategory.SECURITY, '🚨 WELLNESS BLOB STORAGE ERROR:', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        operationType: 'store',
        storageKey,
        operationTimeMs: operationTime,
        dataSize: 0,
        error: (error instanceof Error ? error.message : String(error))
      };
    }
  }

  /**
   * Retrieve a wellness blob written via storeWellnessBlob.
   *
   * Migration: if no AsyncStorage value is found and a `legacySecureStoreKey`
   * is provided, the legacy SecureStore key is read, verified decryptable,
   * written to AsyncStorage, then deleted from SecureStore. Idempotent via
   * per-record migration marker.
   */
  public async retrieveWellnessBlob<T = unknown>(
    key: string,
    legacySecureStoreKey?: string,
    options?: { legacyFormat?: LegacyFormat; sensitivityLevel?: DataSensitivityLevel },
    userContext?: string
  ): Promise<T | null> {
    await this.encryptionService.initialize();

    const storageKey = `${SECURE_STORAGE_CONFIG.WELLNESS_ASYNC_PREFIX}${key}`;
    const encryptedDataString = await this.readWithLegacyFallback(
      storageKey,
      legacySecureStoreKey,
      options?.legacyFormat ?? 'encrypted_package',
      options?.sensitivityLevel ?? 'level_2_assessment_data'
    );

    if (!encryptedDataString) {
      return null;
    }

    const encryptedPackage: EncryptedDataPackage = JSON.parse(encryptedDataString);
    const decryptedData = await this.encryptionService.decryptData(encryptedPackage);

    await this.logStorageAccess({
      timestamp: Date.now(),
      operationType: 'retrieve',
      storageKey,
      storageTier: 'assessment_tier',
      dataType: 'wellness_blob',
      success: true,
      operationTimeMs: 0,
      dataSize: encryptedDataString.length,
      userContext,
      securityContext: 'wellness_blob_retrieval'
    });

    return decryptedData as T;
  }

  /**
   * Delete a wellness blob (both AsyncStorage copy and any lingering legacy
   * SecureStore copy). Idempotent — succeeds even if no value exists.
   */
  public async deleteWellnessBlob(
    key: string,
    legacySecureStoreKey?: string
  ): Promise<void> {
    const storageKey = `${SECURE_STORAGE_CONFIG.WELLNESS_ASYNC_PREFIX}${key}`;
    await AsyncStorage.removeItem(storageKey);
    if (legacySecureStoreKey) {
      try {
        await SecureStore.deleteItemAsync(legacySecureStoreKey);
      } catch {
        // No-op: legacy key may not exist
      }
      await this.markMigrated(legacySecureStoreKey);
    }
  }

  /**
   * Logical names of the wellness blobs whose name starts with `logicalPrefix`
   * (FEAT-530). The prefix and the returned names are the same logical form
   * `storeWellnessBlob` takes, so `wellness_async_` never reaches a caller.
   *
   * Key enumeration only: no value is read and nothing is decrypted, so it costs
   * no key derivation. It exists so a feature that shards one logical record
   * across numbered keys can erase every shard without trusting a stored count.
   */
  public async listWellnessBlobKeys(logicalPrefix: string): Promise<string[]> {
    const full = `${SECURE_STORAGE_CONFIG.WELLNESS_ASYNC_PREFIX}${logicalPrefix}`;
    const keys = await AsyncStorage.getAllKeys();
    return keys
      .filter((k) => k.startsWith(full))
      .map((k) => k.slice(SECURE_STORAGE_CONFIG.WELLNESS_ASYNC_PREFIX.length));
  }

  /**
   * Hybrid-storage read helper: AsyncStorage first, falling back to a legacy
   * SecureStore key for unmigrated existing users. On legacy hit, we
   * decrypt-verify (proving the data is recoverable under the current master
   * key), write the ciphertext to AsyncStorage, verify the AsyncStorage
   * read-back matches, then delete the SecureStore copy. Write-before-delete
   * is intentional: a crash between write and delete leaves duplicate
   * ciphertext (harmless); a crash between delete and write would lose data.
   */
  private async readWithLegacyFallback(
    asyncKey: string,
    legacySecureStoreKey?: string,
    legacyFormat: LegacyFormat = 'encrypted_package',
    plaintextSensitivity: DataSensitivityLevel = 'level_2_assessment_data'
  ): Promise<string | null> {
    const fromAsync = await AsyncStorage.getItem(asyncKey);
    if (fromAsync !== null) {
      return fromAsync;
    }

    if (!legacySecureStoreKey || (await this.isMigrated(legacySecureStoreKey))) {
      return null;
    }

    // DEBUG-545 — refuse to migrate a migration-isolated key.
    //
    // Migrating one relocates it into `wellness_async_*` (swept) and deletes the
    // SecureStore copy, which for the account-deletion attestation destroys the
    // Art. 17(3)(b) evidence it exists to preserve. Loud in development so a
    // future caller's mistake is unmissable; in release it degrades to "no legacy
    // value" plus a high-severity log, because throwing here would abort a
    // consent load — and a deletion flow — in the field.
    if ((MIGRATION_ISOLATED_SECURE_STORE_KEYS as readonly string[]).includes(legacySecureStoreKey)) {
      const message =
        `[SecureStorage] ${legacySecureStoreKey} is migration-isolated and must not be ` +
        'passed to readWithLegacyFallback — migrating it would move the record into ' +
        'sweepable storage. Read it directly via SecureStore.';
      if (__DEV__) throw new Error(message);
      logSecurity(message, 'high');
      return null;
    }

    const legacyData = await SecureStore.getItemAsync(legacySecureStoreKey);
    if (legacyData === null) {
      await this.markMigrated(legacySecureStoreKey);
      return null;
    }

    let ciphertext: string;
    if (legacyFormat === 'plaintext_json') {
      // Pre-INFRA-144 callers (assessment_store, consent_history) wrote plain
      // JSON to SecureStore. Encrypt it on the fly so the migrated AsyncStorage
      // copy is genuine AES-256-GCM ciphertext — this is also the data-layer
      // security upgrade INFRA-144 quietly delivers.
      const parsed: unknown = JSON.parse(legacyData);
      const encryptedPackage = await this.encryptionService.encryptData(
        parsed,
        plaintextSensitivity
      );
      ciphertext = JSON.stringify(encryptedPackage);
    } else {
      // Decrypt-verify: confirm the legacy ciphertext is well-formed and
      // recoverable under the current master key before we lose the SecureStore
      // copy. Throws on tampered, corrupted, or unparseable data — caller's
      // try/catch surfaces the failure and the SecureStore copy stays intact.
      const parsed: EncryptedDataPackage = JSON.parse(legacyData);
      await this.encryptionService.decryptData(parsed);
      ciphertext = legacyData;
    }

    await AsyncStorage.setItem(asyncKey, ciphertext);

    // Verify read-back: catastrophic data loss if we delete legacy before
    // confirming the new copy is durable.
    const verify = await AsyncStorage.getItem(asyncKey);
    if (verify !== ciphertext) {
      throw new Error('Wellness migration write verification failed');
    }

    await SecureStore.deleteItemAsync(legacySecureStoreKey);
    await this.markMigrated(legacySecureStoreKey);

    logSystem(`Wellness storage migrated (${legacyFormat}): ${legacySecureStoreKey} → ${asyncKey}`);
    return ciphertext;
  }

  private migrationMarkerKey(legacySecureStoreKey: string): string {
    return `${SECURE_STORAGE_CONFIG.MIGRATION_MARKER_PREFIX}${legacySecureStoreKey}`;
  }

  private async isMigrated(legacySecureStoreKey: string): Promise<boolean> {
    const marker = await AsyncStorage.getItem(this.migrationMarkerKey(legacySecureStoreKey));
    return marker === SECURE_STORAGE_CONFIG.MIGRATION_MARKER_VERSION;
  }

  private async markMigrated(legacySecureStoreKey: string): Promise<void> {
    await AsyncStorage.setItem(
      this.migrationMarkerKey(legacySecureStoreKey),
      SECURE_STORAGE_CONFIG.MIGRATION_MARKER_VERSION
    );
  }

  /**
   * Wipe all wellness data on logout/account deletion. Sweeps AsyncStorage
   * (hybrid path) AND the fixed legacy SecureStore wellness keys
   * (`WELLNESS_SECURE_STORE_KEYS`). On a full account-deletion wipe it also deletes
   * the account-scoped consent/age/device keys (`ACCOUNT_ERASURE_SECURE_STORE_KEYS`,
   * DEBUG-762); the deletion attestation is deliberately preserved
   * (`ERASURE_EXCLUDED_SECURE_STORE_KEYS`).
   *
   * Required for CCPA/TDPSA right-to-delete + GDPR Art. 17 (right to erasure).
   *
   * @param options.deleteMasterKey  Full account-deletion wipe ONLY. Deletes
   *   the AES master key LAST (after all dependent ciphertext above is gone),
   *   rendering all wellness ciphertext cryptographically unrecoverable. NEVER
   *   pass this on logout / partial clears, or remaining encrypted data becomes
   *   permanently unreadable.
   */
  public async clearAllWellnessData(
    options: { deleteMasterKey?: boolean } = {}
  ): Promise<void> {
    const asyncKeys = await AsyncStorage.getAllKeys();
    const toRemove = asyncKeys.filter((k) =>
      // Prefix families — SWEPT_ASYNC_PREFIXES is the single source of truth the
      // erasure privacy suites assert against (DEBUG-355).
      SWEPT_ASYNC_PREFIXES.some((p) => k.startsWith(p)) ||
      // Keys that cannot adopt a prefix — see SWEPT_EXACT_KEYS (DEBUG-305).
      SECURE_STORAGE_CONFIG.SWEPT_EXACT_KEYS.includes(k) ||
      // Legacy plaintext records from shipped builds. `legacyPlaintextRecordSweeper`
      // purges these at launch; sweeping them here too covers the user who
      // deletes their account without relaunching first (DEBUG-305). Same
      // predicate as the sweeper, so the two lists cannot drift (DEBUG-672).
      isLegacyPlaintextRecord(k) ||
      // DEBUG-775 — account activity, on a full account-deletion wipe only.
      (options.deleteMasterKey === true &&
        ((ACCOUNT_ERASURE_ASYNC_KEYS as readonly string[]).includes(k) ||
          ACCOUNT_ERASURE_ASYNC_PREFIXES.some((p) => k.startsWith(p))))
    );
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }

    // SecureStore has no enumerate API: explicitly delete the fixed wellness
    // keys from the manifest. The deletion attestation is intentionally NOT in
    // the manifest (see ERASURE_EXCLUDED_SECURE_STORE_KEYS) and is preserved.
    await Promise.all(
      WELLNESS_SECURE_STORE_KEYS.map((key) => SecureStore.deleteItemAsync(key))
    );

    if (options.deleteMasterKey) {
      // DEBUG-762 — the account-scoped consent/age/device keys go with the account.
      // Full wipe ONLY (a logout must keep the user consented), BEFORE the master key,
      // and deliberately NOT best-effort: a failed delete must throw so erasure reports
      // failure and the user retries, rather than reporting a deletion that left the
      // previous subject's consent record for the next person. Every key is attempted
      // before the first failure is rethrown. Independent of the attestation write
      // (AccountDeletionService step 2, best-effort): this path never reads it.
      const results = await Promise.allSettled(
        ACCOUNT_ERASURE_SECURE_STORE_KEYS.map((key) => SecureStore.deleteItemAsync(key))
      );
      const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed) throw failed.reason;

      // Delete the master key LAST, after all dependent wellness ciphertext
      // above has been removed.
      await EncryptionService.deleteMasterKey();
    }
  }

  /**
   * AUDIT AND LOGGING
   */

  private async logStorageAccess(entry: StorageAccessLogEntry): Promise<void> {
    try {
      this.accessLog.push(entry);

      // Limit log size
      if (this.accessLog.length > SECURE_STORAGE_CONFIG.MAX_AUDIT_ENTRIES) {
        this.accessLog = this.accessLog.slice(-SECURE_STORAGE_CONFIG.MAX_AUDIT_ENTRIES);
      }

      // In-memory only. Nothing persists an access-log entry (MAINT-790): the
      // `audit_log_` prefix is swept on erasure but no code writes it.
    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 ACCESS LOGGING ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * PUBLIC API METHODS
   */

  public async getAccessLog(): Promise<StorageAccessLogEntry[]> {
    return [...this.accessLog];
  }

  public async destroy(): Promise<void> {
    try {
      logSystem('Destroying secure storage service');

      this.accessLog = [];

      // Destroy encryption service
      await this.encryptionService.destroy();

      logSystem('Secure storage service destroyed');

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 SECURE STORAGE DESTRUCTION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

// Export singleton instance
export default SecureStorageService.getInstance();