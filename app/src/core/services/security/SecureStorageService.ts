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
 * SWEPT_ASYNC_PREFIXES and deleteSecureData.
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


import { logSecurity, logPerformance, logError, logSystem, LogCategory } from '../logging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import EncryptionService, { 
  EncryptedDataPackage, 
  DataSensitivityLevel 
} from './EncryptionService';

/**
 * The persisted metadata index (DEBUG-381).
 *
 * Named rather than inlined because it is written from `storeMetadata` and
 * `deleteMetadata`, read by `loadStorageMetadata`, swept by
 * `clearAllWellnessData`, and asserted by the erasure privacy suites — five
 * sites that must agree. It was a bare string literal at three of them, which is
 * the same hand-copied-mirror shape that let `audit_log_` go unswept through two
 * work items (see `SWEPT_ASYNC_PREFIXES` below).
 *
 * Its contents are CLEARTEXT and crisis-describing: one record per stored blob
 * carrying `storageKey` (e.g. `crisis_async_<episodeId>`), `storageTier`,
 * `sensitivityLevel`, `dataType` and access timestamps. No wellness content —
 * but enough to establish that a crisis episode existed and when.
 */
export const STORAGE_METADATA_INDEX_KEY = 'storage_metadata_index';

/**
 * SECURE STORAGE CONFIGURATION
 */
export const SECURE_STORAGE_CONFIG = {
  /** Storage tier prefixes — legacy SecureStore (kept for migration fallback) */
  CRISIS_PREFIX: 'crisis_secure_',
  ASSESSMENT_PREFIX: 'assessment_secure_',
  INTERVENTION_PREFIX: 'intervention_secure_',
  PERFORMANCE_PREFIX: 'performance_',
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
   * 🔴 `storage_metadata_index` (DEBUG-381) IS INERT WITHOUT THE CACHE CLEAR IN
   * `clearAllWellnessData`. Do not "simplify" that clear away on the reasoning
   * that membership here already covers the key — it does not, and the two must
   * land and stay together. `storeMetadata` re-serialises the ENTIRE in-memory
   * `metadataCache` on every write, so sweeping the key alone deletes the file
   * and lets the very next crisis or assessment write restore it verbatim,
   * erased records included. That is a fake control: it reads as coverage and
   * provides none. The regression pin for the write-back specifically is
   * `storageMetadataIndexErasure.privacy.test.ts` → "does not COME BACK".
   *
   * Note the two entries fail differently, which is why one comment cannot serve
   * both: `crisis_analytics_queue` is a passive buffer that nothing rewrites
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
   * `storeMetadata`. A tripwire pins the backend branch, because if a future
   * dependency resolution loses `Paths`/`File` the adapter silently becomes
   * AsyncStorage-backed and THIS list becomes the correct fix.
   */
  SWEPT_EXACT_KEYS: [
    '@being/supabase/crisis_analytics_queue',
    STORAGE_METADATA_INDEX_KEY,
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
  AUTO_CLEANUP_INTERVAL_MS: 24 * 60 * 60 * 1000, // Daily
  TEMP_DATA_EXPIRY_MS: 60 * 60 * 1000, // 1 hour
  CACHE_EXPIRY_MS: 30 * 60 * 1000, // 30 minutes
  
  /** Audit configuration */
  AUDIT_LOG_PREFIX: 'audit_log_',
  MAX_AUDIT_ENTRIES: 10000,
  AUDIT_ROTATION_DAYS: 90
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
 * `audit_log_` is on this list because `logStorageAccess` persists an entry on
 * every failed operation. (It also persisted on every `crisis_tier` operation
 * until MAINT-378 removed that tier; the failure arm is now the only writer.)
 * Nothing reads those records back and `cleanupAuditLogs()` prunes only the
 * in-memory array, so before DEBUG-355 nothing in the app could remove them at
 * all. Unlike the SecureStore `critical_log_*` records in the same work item,
 * these enumerate — so adding the prefix here fixes already-shipped installs
 * retroactively, with no migration and no persisted index.
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
] as const;

/**
 * Keys DELIBERATELY EXCLUDED from the erasure sweep (documented so the
 * exclusion is a reviewable decision, not an accidental omission):
 *  - consent_record_v1 / consent_history_v1 / legal_gate_consents_v1 /
 *    age_verification_v1 — consent audit trail (lawful-basis evidence;
 *    DataRetentionService already refuses to delete consent records).
 *  - auth_device_id — anonymous device-identity anchor; deleting it would
 *    de-authenticate the device with no recovery path and holds no wellness
 *    content.
 */
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

export const ERASURE_EXCLUDED_SECURE_STORE_KEYS = [
  'consent_record_v1',
  'consent_history_v1',
  'legal_gate_consents_v1',
  'age_verification_v1',
  'auth_device_id',
  ACCOUNT_DELETION_ATTESTATION_KEY,
] as const;

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
 * SECURE STORAGE METADATA
 */
export interface SecureStorageMetadata {
  storageKey: string;
  storageTier: StorageTier;
  sensitivityLevel: DataSensitivityLevel;
  dataType: string;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  encrypted: boolean;
  dataSize: number;
  expiresAt?: number;
  retentionPolicy: 'temporary' | 'session' | 'persistent' | 'wellness_record';
}

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
  metadata?: SecureStorageMetadata | undefined;
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
  private metadataCache: Map<string, SecureStorageMetadata> = new Map();
  private accessLog: StorageAccessLogEntry[] = [];
  private cleanupTimer: NodeJS.Timeout | null = null;
  private initialized: boolean = false;

  private constructor() {
    this.encryptionService = EncryptionService;
    // Skip the long-lived cleanup setInterval in test runs; otherwise it
    // keeps the Jest runtime alive past test completion and triggers
    // "open handle" warnings + worker process timeouts.
    if (process.env.NODE_ENV !== 'test') {
      this.initializeCleanupScheduler();
    }
  }

  public static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  /**
   * MAINT-190: Test-only escape hatch for singleton state isolation.
   * Clears the in-memory metadata cache + access log + cleanup timer.
   * Does NOT delete persisted secure-store entries — those belong to the
   * underlying expo-secure-store and survive process restarts. Tests that
   * need a clean store must call the explicit clear/erase APIs.
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
      const inst = SecureStorageService.instance;
      if (inst.cleanupTimer) {
        clearInterval(inst.cleanupTimer);
        inst.cleanupTimer = null;
      }
      inst.metadataCache.clear();
      inst.accessLog = [];
      inst.initialized = false;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional: nulling private static reset target
    SecureStorageService.instance = undefined as any;
  }

  /**
   * INITIALIZE SECURE STORAGE
   */
  public async initialize(): Promise<void> {
    const startTime = performance.now();

    try {
      logSystem('Initializing Secure Storage Service');

      // Initialize encryption service
      await this.encryptionService.initialize();

      // Load existing metadata
      await this.loadStorageMetadata();

      // Verify storage capabilities
      await this.verifyStorageCapabilities();

      // Schedule cleanup
      await this.scheduleDataCleanup();

      this.initialized = true;

      const initializationTime = performance.now() - startTime;
      logPerformance('SecureStorageService.initialize', initializationTime, {
        status: 'success',
        context: 'service_initialization'
      });

      // Log initialization
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'store',
        storageKey: 'system_initialization',
        storageTier: 'general_tier',
        dataType: 'system_event',
        success: true,
        operationTimeMs: initializationTime,
        dataSize: 0,
        securityContext: 'secure_storage_init'
      });

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 SECURE STORAGE INITIALIZATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Secure storage initialization failed: ${(error instanceof Error ? error.message : String(error))}`);
    }
  }

  /**
   * ASSESSMENT DATA STORAGE
   * High security tier for PHQ-9/GAD-7 assessment data
   */
  public async storeAssessmentData(
    assessmentId: string,
    assessmentData: {
      type: 'PHQ-9' | 'GAD-7';
      responses: number[];
      totalScore: number;
      timestamp: number;
      userId: string;
    },
    userContext?: string
  ): Promise<StorageOperationResult> {
    const startTime = performance.now();

    try {
      // Lazy-init the encryption layer so callers can hit these methods
      // before app-startup ordering completes (e.g. Zustand persist rehydration
      // for the assessment store fires at module load, ahead of App.tsx's
      // SecureStorageService.initialize() call). encryptionService.initialize
      // is idempotent and shares the in-flight promise across concurrent calls.
      await this.encryptionService.initialize();

      const storageKey = `${SECURE_STORAGE_CONFIG.ASSESSMENT_ASYNC_PREFIX}${assessmentId}`;

      const encryptedPackage = await this.encryptionService.encryptAssessmentData(
        assessmentData,
        assessmentId
      );

      await this.validateStorageSize(encryptedPackage, 'assessment_tier');

      await AsyncStorage.setItem(storageKey, JSON.stringify(encryptedPackage));
      await this.markMigrated(`${SECURE_STORAGE_CONFIG.ASSESSMENT_PREFIX}${assessmentId}`);

      const metadata: SecureStorageMetadata = {
        storageKey,
        storageTier: 'assessment_tier',
        sensitivityLevel: 'level_2_assessment_data',
        dataType: `assessment_${assessmentData.type.toLowerCase()}`,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 1,
        encrypted: true,
        dataSize: JSON.stringify(encryptedPackage).length,
        retentionPolicy: 'wellness_record'
      };

      // Cache metadata
      this.metadataCache.set(storageKey, metadata);

      // Store metadata
      await this.storeMetadata(storageKey, metadata);

      const operationTime = performance.now() - startTime;

      // Validate assessment performance requirement
      if (operationTime > SECURE_STORAGE_CONFIG.ASSESSMENT_ACCESS_THRESHOLD_MS) {
        logSecurity(`⚠️  Assessment storage slow: ${operationTime.toFixed(2)}ms > ${SECURE_STORAGE_CONFIG.ASSESSMENT_ACCESS_THRESHOLD_MS}ms`, 'medium', { component: 'SecurityService' });
      }

      // Log access
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'store',
        storageKey,
        storageTier: 'assessment_tier',
        dataType: metadata.dataType,
        success: true,
        operationTimeMs: operationTime,
        dataSize: metadata.dataSize,
        userContext,
        securityContext: 'assessment_data_storage'
      });

      logPerformance('SecureStorageService.storeAssessmentData', operationTime, {
        assessmentType: assessmentData.type,
        tier: 'assessment_tier'
      });

      return {
        success: true,
        operationType: 'store',
        storageKey,
        operationTimeMs: operationTime,
        dataSize: metadata.dataSize,
        metadata
      };

    } catch (error) {
      const operationTime = performance.now() - startTime;
      logError(LogCategory.SECURITY, '🚨 ASSESSMENT DATA STORAGE ERROR:', error instanceof Error ? error : new Error(String(error)));

      // Log failure
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'store',
        storageKey: `${SECURE_STORAGE_CONFIG.ASSESSMENT_ASYNC_PREFIX}${assessmentId}`,
        storageTier: 'assessment_tier',
        dataType: 'assessment_data',
        success: false,
        operationTimeMs: operationTime,
        dataSize: 0,
        userContext,
        error: (error instanceof Error ? error.message : String(error))
      });

      return {
        success: false,
        operationType: 'store',
        storageKey: `${SECURE_STORAGE_CONFIG.ASSESSMENT_ASYNC_PREFIX}${assessmentId}`,
        operationTimeMs: operationTime,
        dataSize: 0,
        error: (error instanceof Error ? error.message : String(error))
      };
    }
  }

  /**
   * RETRIEVE ASSESSMENT DATA
   * Retrieval for PHQ-9/GAD-7 assessment data
   */
  public async retrieveAssessmentData(
    assessmentId: string,
    userContext?: string
  ): Promise<{ data: any; metadata: SecureStorageMetadata } | null> {
    const startTime = performance.now();

    try {
      // Lazy-init the encryption layer so callers can hit these methods
      // before app-startup ordering completes (e.g. Zustand persist rehydration
      // for the assessment store fires at module load, ahead of App.tsx's
      // SecureStorageService.initialize() call). encryptionService.initialize
      // is idempotent and shares the in-flight promise across concurrent calls.
      await this.encryptionService.initialize();

      const storageKey = `${SECURE_STORAGE_CONFIG.ASSESSMENT_ASYNC_PREFIX}${assessmentId}`;
      const legacyKey = `${SECURE_STORAGE_CONFIG.ASSESSMENT_PREFIX}${assessmentId}`;

      const encryptedDataString = await this.readWithLegacyFallback(storageKey, legacyKey);
      if (!encryptedDataString) {
        return null;
      }

      const encryptedPackage: EncryptedDataPackage = JSON.parse(encryptedDataString);
      const decryptedData = await this.encryptionService.decryptData(encryptedPackage);

      // Update metadata
      const metadata = this.metadataCache.get(storageKey);
      if (metadata) {
        metadata.lastAccessedAt = Date.now();
        metadata.accessCount += 1;
        this.metadataCache.set(storageKey, metadata);
      }

      const operationTime = performance.now() - startTime;

      // Log access
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'retrieve',
        storageKey,
        storageTier: 'assessment_tier',
        dataType: 'assessment_data',
        success: true,
        operationTimeMs: operationTime,
        dataSize: encryptedDataString.length,
        userContext,
        securityContext: 'assessment_data_retrieval'
      });

      logPerformance('SecureStorageService.retrieveAssessmentData', operationTime, {
        tier: 'assessment_tier'
      });

      return {
        data: decryptedData,
        metadata: metadata || {
          storageKey,
          storageTier: 'assessment_tier',
          sensitivityLevel: 'level_2_assessment_data',
          dataType: 'assessment_data',
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 1,
          encrypted: true,
          dataSize: encryptedDataString.length,
          retentionPolicy: 'wellness_record'
        }
      };

    } catch (error) {
      const operationTime = performance.now() - startTime;
      logError(LogCategory.SECURITY, '🚨 ASSESSMENT DATA RETRIEVAL ERROR:', error instanceof Error ? error : new Error(String(error)));

      // Log failure
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'retrieve',
        storageKey: `${SECURE_STORAGE_CONFIG.ASSESSMENT_ASYNC_PREFIX}${assessmentId}`,
        storageTier: 'assessment_tier',
        dataType: 'assessment_data',
        success: false,
        operationTimeMs: operationTime,
        dataSize: 0,
        userContext,
        error: (error instanceof Error ? error.message : String(error))
      });

      throw error;
    }
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
   * SECURE DATA DELETION
   */
  public async deleteSecureData(
    key: string,
    userContext?: string
  ): Promise<StorageOperationResult> {
    const startTime = performance.now();

    try {
      // Lazy-init the encryption layer so callers can hit these methods
      // before app-startup ordering completes (e.g. Zustand persist rehydration
      // for the assessment store fires at module load, ahead of App.tsx's
      // SecureStorageService.initialize() call). encryptionService.initialize
      // is idempotent and shares the in-flight promise across concurrent calls.
      await this.encryptionService.initialize();

      // Hybrid storage (INFRA-144): wellness data lives under *_ASYNC_PREFIX
      // in AsyncStorage; legacy *_PREFIX keys remain in SecureStore until
      // first-read migration. Enumerate both. Always also clear the migration
      // marker so a future write under the legacy key would re-migrate if
      // needed.
      //
      // The two crisis namespaces below are write-free since MAINT-378 removed
      // the tier that produced them. They are enumerated deliberately, as a
      // defensive erasure floor for records on already-shipped installs. Do not
      // prune them for tidiness: dropping a namespace from a deletion path is a
      // one-way regression, and SecureStore in particular has no enumerate API,
      // so a legacy `crisis_secure_*` key can only ever be reached by name.
      const asyncPossibleKeys = [
        `${SECURE_STORAGE_CONFIG.CRISIS_ASYNC_PREFIX}${key}`,
        `${SECURE_STORAGE_CONFIG.ASSESSMENT_ASYNC_PREFIX}${key}`,
        `${SECURE_STORAGE_CONFIG.WELLNESS_ASYNC_PREFIX}${key}`,
        `${SECURE_STORAGE_CONFIG.PERFORMANCE_PREFIX}${key}`,
        `${SECURE_STORAGE_CONFIG.GENERAL_PREFIX}${key}`,
      ];
      const secureStorePossibleKeys = [
        `${SECURE_STORAGE_CONFIG.CRISIS_PREFIX}${key}`,
        `${SECURE_STORAGE_CONFIG.ASSESSMENT_PREFIX}${key}`,
        `${SECURE_STORAGE_CONFIG.INTERVENTION_PREFIX}${key}`,
      ];

      let deletedKey: string | null = null;
      let dataSize = 0;

      for (const storageKey of asyncPossibleKeys) {
        try {
          const asyncData = await AsyncStorage.getItem(storageKey);
          if (asyncData) {
            await AsyncStorage.removeItem(storageKey);
            deletedKey = storageKey;
            dataSize = asyncData.length;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!deletedKey) {
        for (const storageKey of secureStorePossibleKeys) {
          try {
            const secureData = await SecureStore.getItemAsync(storageKey);
            if (secureData) {
              await SecureStore.deleteItemAsync(storageKey);
              deletedKey = storageKey;
              dataSize = secureData.length;
              break;
            }
          } catch {
            continue;
          }
        }
      }

      // Remove from metadata cache
      if (deletedKey) {
        this.metadataCache.delete(deletedKey);
        await this.deleteMetadata(deletedKey);
      }

      const operationTime = performance.now() - startTime;

      // Log deletion
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'delete',
        storageKey: deletedKey || key,
        storageTier: 'general_tier',
        dataType: 'unknown',
        success: deletedKey !== null,
        operationTimeMs: operationTime,
        dataSize,
        userContext,
        securityContext: 'secure_data_deletion'
      });

      logPerformance('SecureStorageService.deleteData', operationTime, {
        success: deletedKey !== null,
        key: deletedKey || 'not_found'
      });

      return {
        success: deletedKey !== null,
        operationType: 'delete',
        storageKey: deletedKey || key,
        operationTimeMs: operationTime,
        dataSize
      };

    } catch (error) {
      const operationTime = performance.now() - startTime;
      logError(LogCategory.SECURITY, '🚨 SECURE DATA DELETION ERROR:', error instanceof Error ? error : new Error(String(error)));

      return {
        success: false,
        operationType: 'delete',
        storageKey: key,
        operationTimeMs: operationTime,
        dataSize: 0,
        error: (error instanceof Error ? error.message : String(error))
      };
    }
  }

  /**
   * DATA CLEANUP AND MAINTENANCE
   */

  private initializeCleanupScheduler(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.performScheduledCleanup();
      } catch (error) {
        logError(LogCategory.SECURITY, '🚨 SCHEDULED CLEANUP ERROR:', error instanceof Error ? error : new Error(String(error)));
      }
    }, SECURE_STORAGE_CONFIG.AUTO_CLEANUP_INTERVAL_MS);
  }

  private async performScheduledCleanup(): Promise<void> {
    try {
      logSystem('Performing scheduled storage cleanup');

      let cleanedCount = 0;
      const currentTime = Date.now();

      // Clean up expired data
      for (const [storageKey, metadata] of this.metadataCache.entries()) {
        if (metadata.expiresAt && currentTime > metadata.expiresAt) {
          await this.deleteSecureData(storageKey.replace(/^[^_]+_/, ''));
          cleanedCount++;
        } else if (metadata.retentionPolicy === 'temporary' && 
                  currentTime - metadata.createdAt > SECURE_STORAGE_CONFIG.TEMP_DATA_EXPIRY_MS) {
          await this.deleteSecureData(storageKey.replace(/^[^_]+_/, ''));
          cleanedCount++;
        }
      }

      // Clean up old audit logs
      await this.cleanupAuditLogs();

      logSystem(`Cleanup completed (${cleanedCount} items removed)`);

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 CLEANUP ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async cleanupAuditLogs(): Promise<void> {
    try {
      const cutoffTime = Date.now() - (SECURE_STORAGE_CONFIG.AUDIT_ROTATION_DAYS * 24 * 60 * 60 * 1000);
      
      this.accessLog = this.accessLog.filter(entry => entry.timestamp > cutoffTime);

      // Keep only latest entries if still too many
      if (this.accessLog.length > SECURE_STORAGE_CONFIG.MAX_AUDIT_ENTRIES) {
        this.accessLog = this.accessLog.slice(-SECURE_STORAGE_CONFIG.MAX_AUDIT_ENTRIES);
      }

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 AUDIT LOG CLEANUP ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * METADATA MANAGEMENT
   */

  private async loadStorageMetadata(): Promise<void> {
    try {
      const metadataString = await AsyncStorage.getItem(STORAGE_METADATA_INDEX_KEY);
      
      if (metadataString) {
        const metadataArray: Array<[string, SecureStorageMetadata]> = JSON.parse(metadataString);
        this.metadataCache = new Map(metadataArray);
        logSystem(`Loaded ${this.metadataCache.size} metadata entries`);
      }

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 METADATA LOADING ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Write the cache to `storage_metadata_index`, or REMOVE the key when the
   * cache is empty (DEBUG-381).
   *
   * Extracted so `storeMetadata` and `deleteMetadata` cannot drift — they held
   * byte-identical persist blocks, which is how the key ended up written from
   * two places and swept from none.
   *
   * The empty-cache branch matters for erasure hygiene: without it, deleting the
   * last remaining record via `deleteSecureData` → `deleteMetadata` re-creates
   * the key holding `"[]"`. Harmless in content, but it leaves a
   * crisis-path-adjacent key present in a store that just enumerated clean, and
   * the whole-store assertions in the privacy suites are the poorer for it.
   */
  private async persistMetadataIndex(): Promise<void> {
    if (this.metadataCache.size === 0) {
      await AsyncStorage.removeItem(STORAGE_METADATA_INDEX_KEY);
      return;
    }
    const metadataArray = Array.from(this.metadataCache.entries());
    await AsyncStorage.setItem(STORAGE_METADATA_INDEX_KEY, JSON.stringify(metadataArray));
  }

  private async storeMetadata(storageKey: string, metadata: SecureStorageMetadata): Promise<void> {
    try {
      // Store in cache
      this.metadataCache.set(storageKey, metadata);

      // Persist metadata index
      await this.persistMetadataIndex();

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 METADATA STORAGE ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async deleteMetadata(storageKey: string): Promise<void> {
    try {
      this.metadataCache.delete(storageKey);

      // Update persisted index
      await this.persistMetadataIndex();

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 METADATA DELETION ERROR:', error instanceof Error ? error : new Error(String(error)));
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
      // before app-startup ordering completes (e.g. Zustand persist rehydration
      // for the assessment store fires at module load, ahead of App.tsx's
      // SecureStorageService.initialize() call). encryptionService.initialize
      // is idempotent and shares the in-flight promise across concurrent calls.
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
   * (`WELLNESS_SECURE_STORE_KEYS`). Consent audit-trail + device-identity keys
   * are deliberately preserved (`ERASURE_EXCLUDED_SECURE_STORE_KEYS`).
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
    // DEBUG-381 — MUST be the first statement, and MUST be synchronous.
    //
    // `storeMetadata` re-serialises this entire cache to
    // `storage_metadata_index` on every write, and nothing cleared it here — so
    // sweeping the key below (via SWEPT_EXACT_KEYS) without this line would
    // delete the file and let the next crisis or assessment write restore every
    // erased record verbatim. Membership in the sweep list is inert on its own.
    //
    // POSITION IS LOAD-BEARING, not stylistic. `storeMetadata` is synchronous
    // from entry through `JSON.stringify`; its only suspension point is inside
    // the `AsyncStorage.setItem` await. So a snapshot's contents are frozen when
    // its synchronous prelude runs, and there are exactly two cases: a prelude
    // that ran BEFORE this clear enqueued its write before our removal (and
    // AsyncStorage's native module dispatches serially, so the removal wins), or
    // it ran AFTER and can only contain post-erasure entries. Move this line
    // below the `getAllKeys()` await and a third case opens — a prelude
    // capturing the full pre-erasure map inside that window.
    //
    // The reverse order (remove the key, then clear the cache) is strictly
    // worse: a prelude landing between the two steps re-persists the ENTIRE
    // pre-erasure index.
    //
    // Unconditional on both `deleteMasterKey` branches, deliberately. Every
    // entry this cache can hold names a `crisis_async_*` or `assessment_async_*`
    // key — only `storeCrisisData` and `storeAssessmentData` write metadata —
    // and both prefixes are swept on both branches, so after either call the
    // cache is 100% stale by construction. `accessLog` is deliberately NOT
    // cleared alongside it: `getStorageMetrics` derives `successRate` from that
    // array, and an empty one reports 0, which trips
    // SecurityMonitoringService's reliability and audit-trail checks.
    this.metadataCache.clear();

    const asyncKeys = await AsyncStorage.getAllKeys();
    const toRemove = asyncKeys.filter((k) =>
      // Prefix families — SWEPT_ASYNC_PREFIXES is the single source of truth the
      // erasure privacy suites assert against (DEBUG-355).
      SWEPT_ASYNC_PREFIXES.some((p) => k.startsWith(p)) ||
      // Keys that cannot adopt a prefix — see SWEPT_EXACT_KEYS (DEBUG-305).
      SECURE_STORAGE_CONFIG.SWEPT_EXACT_KEYS.includes(k) ||
      // Legacy plaintext records from shipped builds. `legacyPlaintextRecordSweeper`
      // purges these at launch; sweeping them here too covers the user who
      // deletes their account without relaunching first (DEBUG-305).
      k.startsWith('crisis_intervention_') ||
      k === 'assessment_audit_trail'
    );
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }

    // SecureStore has no enumerate API: explicitly delete the fixed wellness
    // keys from the manifest. Consent/identity keys are intentionally NOT in
    // the manifest (see ERASURE_EXCLUDED_SECURE_STORE_KEYS) and are preserved.
    await Promise.all(
      WELLNESS_SECURE_STORE_KEYS.map((key) => SecureStore.deleteItemAsync(key))
    );

    // Full account-deletion wipe only: delete the master key LAST, after all
    // dependent wellness ciphertext above has been removed.
    if (options.deleteMasterKey) {
      await EncryptionService.deleteMasterKey();
    }
  }

  private async verifyStorageCapabilities(): Promise<void> {
    try {
      logSystem('Verifying storage capabilities');

      // Test SecureStore
      const testKey = 'storage_capability_test';
      const testData = 'test_data';
      
      await SecureStore.setItemAsync(testKey, testData);
      const retrievedData = await SecureStore.getItemAsync(testKey);
      await SecureStore.deleteItemAsync(testKey);

      if (retrievedData !== testData) {
        throw new Error('SecureStore capability test failed');
      }

      // Test AsyncStorage
      await AsyncStorage.setItem(testKey, testData);
      const asyncRetrievedData = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);

      if (asyncRetrievedData !== testData) {
        throw new Error('AsyncStorage capability test failed');
      }

      logSystem('Storage capabilities verified');

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 STORAGE CAPABILITY VERIFICATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
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

      // Persist critical access logs.
      // Failure is the only persistence trigger since MAINT-378 removed the
      // crisis tier. `audit_log_` stays in SWEPT_ASYNC_PREFIXES because this
      // arm still writes.
      if (!entry.success) {
        const logKey = `${SECURE_STORAGE_CONFIG.AUDIT_LOG_PREFIX}${Date.now()}`;
        await AsyncStorage.setItem(logKey, JSON.stringify(entry));
      }

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 ACCESS LOGGING ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async scheduleDataCleanup(): Promise<void> {
    // Immediate cleanup of any expired data
    await this.performScheduledCleanup();
  }

  /**
   * PUBLIC API METHODS
   */

  public async getStorageMetrics(): Promise<{
    totalEntries: number;
    assessmentEntries: number;
    totalStorageSize: number;
    accessLogSize: number;
    averageAccessTime: number;
    successRate: number;
  }> {
    const assessmentEntries = Array.from(this.metadataCache.values()).filter(m => m.storageTier === 'assessment_tier').length;
    const totalStorageSize = Array.from(this.metadataCache.values()).reduce((sum, m) => sum + m.dataSize, 0);
    
    const accessTimes = this.accessLog.map(log => log.operationTimeMs);
    const averageAccessTime = accessTimes.length > 0 ? accessTimes.reduce((sum, time) => sum + time, 0) / accessTimes.length : 0;
    
    const successfulOperations = this.accessLog.filter(log => log.success).length;
    const successRate = this.accessLog.length > 0 ? successfulOperations / this.accessLog.length : 0;

    return {
      totalEntries: this.metadataCache.size,
      assessmentEntries,
      totalStorageSize,
      accessLogSize: this.accessLog.length,
      averageAccessTime,
      successRate
    };
  }

  public async getAccessLog(): Promise<StorageAccessLogEntry[]> {
    return [...this.accessLog];
  }

  public async exportStorageData(userContext?: string): Promise<{
    metadata: SecureStorageMetadata[];
    accessLog: StorageAccessLogEntry[];
    exportTimestamp: number;
  }> {
    try {
      // Log export operation
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'retrieve',
        storageKey: 'storage_export',
        storageTier: 'general_tier',
        dataType: 'export_operation',
        success: true,
        operationTimeMs: 0,
        dataSize: this.metadataCache.size + this.accessLog.length,
        userContext,
        securityContext: 'storage_data_export'
      });

      return {
        metadata: Array.from(this.metadataCache.values()),
        accessLog: [...this.accessLog],
        exportTimestamp: Date.now()
      };

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 STORAGE EXPORT ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async destroy(): Promise<void> {
    try {
      logSystem('Destroying secure storage service');

      // Clear cleanup timer
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = null;
      }

      // Clear caches
      this.metadataCache.clear();
      this.accessLog = [];

      // Destroy encryption service
      await this.encryptionService.destroy();

      this.initialized = false;

      logSystem('Secure storage service destroyed');

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 SECURE STORAGE DESTRUCTION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

// Export singleton instance
export default SecureStorageService.getInstance();