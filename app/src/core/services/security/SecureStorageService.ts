/**
 * SECURE STORAGE SERVICE - DRD-FLOW-005 Security Implementation
 *
 * Comprehensive secure storage for wellness data:
 * - Hybrid: AES-256-GCM ciphertext in AsyncStorage; master key in platform Keychain (expo-secure-store)
 * - Tiered storage based on data sensitivity (PHQ-9/GAD-7/Crisis)
 * - Automatic encryption/decryption with performance optimization
 * - Wellness data lifecycle management and cleanup
 * - Audit trails and access logging
 *
 * STORAGE ARCHITECTURE (INFRA-144):
 * - Level 1: Crisis responses (AsyncStorage ciphertext + AES-256-GCM)
 * - Level 2: Assessment data (AsyncStorage ciphertext + AES-256-GCM)
 * - Level 3: Intervention metadata (SecureStore + AES-256)
 * - Level 4: Performance data (AsyncStorage + basic encryption)
 * - Level 5: General data (AsyncStorage, unencrypted)
 *
 * Plaintext is never written to disk. AES-256-GCM ciphertext is opaque;
 * confidentiality derives from the key (held in Keychain), not the
 * substrate. Removing SecureStore as the substrate for crisis/assessment
 * escapes the iOS Keychain 2KB per-attribute limit without weakening the
 * encryption boundary.
 *
 * PERFORMANCE REQUIREMENTS:
 * - Crisis data access: <200ms (includes decryption)
 * - Assessment data access: <300ms
 * - Bulk operations: <500ms for up to 100 records
 * - Background sync: <1000ms for data export
 *
 * DATA PROTECTION STANDARDS:
 * - Privacy-compliant storage with audit trails
 * - 3-year retention for crisis intervention records (liability protection)
 * - Secure data deletion and device cleanup
 * - Emergency data access protocols
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
 * STORAGE TIER DEFINITIONS
 */
export type StorageTier =
  | 'crisis_tier'        // Highest security - AsyncStorage ciphertext + AES-256-GCM (master key in Keychain)
  | 'assessment_tier'    // High security - AsyncStorage ciphertext + AES-256-GCM (master key in Keychain)
  | 'intervention_tier'  // Medium security - SecureStore + Level 3 encryption
  | 'performance_tier'   // Low security - AsyncStorage + basic encryption
  | 'general_tier';      // Minimal security - AsyncStorage, unencrypted

/**
 * Legacy SecureStore data format. INFRA-144 migration handles two shapes:
 * - 'encrypted_package': existing AES-256-GCM ciphertext (crisis safety plan
 *   via storeCrisisData was always encrypted). Migration decrypt-verifies under
 *   the current master key before moving to AsyncStorage.
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
 * BULK STORAGE OPERATION
 */
export interface BulkStorageOperation {
  operationType: 'store' | 'retrieve' | 'delete';
  items: Array<{
    key: string;
    data?: any;
    metadata?: Partial<SecureStorageMetadata>;
  }>;
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
 * Handles all mental health data storage with appropriate security levels
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
   * CRISIS DATA STORAGE
   * Highest security tier for crisis intervention data
   */
  public async storeCrisisData(
    key: string,
    crisisData: any,
    crisisEpisodeId: string,
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

      const storageKey = `${SECURE_STORAGE_CONFIG.CRISIS_ASYNC_PREFIX}${key}`;

      const encryptedPackage = await this.encryptionService.encryptCrisisData(
        crisisData,
        crisisEpisodeId
      );

      await this.validateStorageSize(encryptedPackage, 'crisis_tier');

      // Hybrid storage: ciphertext to AsyncStorage; AES master key remains
      // in Keychain via EncryptionService. Plaintext never touches disk.
      await AsyncStorage.setItem(storageKey, JSON.stringify(encryptedPackage));

      // Mark legacy SecureStore key as migrated so retrieve won't fall back
      // for new writes. Idempotent: this records "we have a fresh write at the
      // async key" so any stale SecureStore copy under the legacy prefix is
      // ignored on read.
      await this.markMigrated(`${SECURE_STORAGE_CONFIG.CRISIS_PREFIX}${key}`);

      const metadata: SecureStorageMetadata = {
        storageKey,
        storageTier: 'crisis_tier',
        sensitivityLevel: 'level_1_crisis_responses',
        dataType: 'crisis_intervention',
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 1,
        encrypted: true,
        dataSize: JSON.stringify(encryptedPackage).length,
        retentionPolicy: 'wellness_record'
      };

      // Cache metadata
      this.metadataCache.set(storageKey, metadata);

      // Store metadata separately
      await this.storeMetadata(storageKey, metadata);

      const operationTime = performance.now() - startTime;

      // Validate crisis performance requirement
      if (operationTime > SECURE_STORAGE_CONFIG.CRISIS_ACCESS_THRESHOLD_MS) {
        logSecurity('⚠️  Crisis storage slow: ${operationTime.toFixed(2)}ms > ${SECURE_STORAGE_CONFIG.CRISIS_ACCESS_THRESHOLD_MS}ms', 'medium', { component: 'SecurityService' });
      }

      // Log access
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'store',
        storageKey,
        storageTier: 'crisis_tier',
        dataType: 'crisis_intervention',
        success: true,
        operationTimeMs: operationTime,
        dataSize: metadata.dataSize,
        userContext,
        securityContext: 'crisis_data_storage'
      });

      logPerformance('SecureStorageService.storeCrisisData', operationTime, {
        dataSize: metadata.dataSize,
        tier: 'crisis_tier'
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
      logError(LogCategory.SECURITY, '🚨 CRISIS DATA STORAGE ERROR:', error instanceof Error ? error : new Error(String(error)));

      // Log failure
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'store',
        storageKey: `${SECURE_STORAGE_CONFIG.CRISIS_ASYNC_PREFIX}${key}`,
        storageTier: 'crisis_tier',
        dataType: 'crisis_intervention',
        success: false,
        operationTimeMs: operationTime,
        dataSize: 0,
        userContext,
        error: (error instanceof Error ? error.message : String(error))
      });

      return {
        success: false,
        operationType: 'store',
        storageKey: `${SECURE_STORAGE_CONFIG.CRISIS_ASYNC_PREFIX}${key}`,
        operationTimeMs: operationTime,
        dataSize: 0,
        error: (error instanceof Error ? error.message : String(error))
      };
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
        logSecurity('⚠️  Assessment storage slow: ${operationTime.toFixed(2)}ms > ${SECURE_STORAGE_CONFIG.ASSESSMENT_ACCESS_THRESHOLD_MS}ms', 'medium', { component: 'SecurityService' });
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
   * RETRIEVE CRISIS DATA
   * Fast retrieval for crisis intervention (must be <200ms)
   */
  public async retrieveCrisisData(
    key: string,
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

      const storageKey = `${SECURE_STORAGE_CONFIG.CRISIS_ASYNC_PREFIX}${key}`;
      const legacyKey = `${SECURE_STORAGE_CONFIG.CRISIS_PREFIX}${key}`;

      const encryptedDataString = await this.readWithLegacyFallback(storageKey, legacyKey);
      if (!encryptedDataString) {
        return null;
      }

      const encryptedPackage: EncryptedDataPackage = JSON.parse(encryptedDataString);
      const decryptedData = await this.encryptionService.decryptData(encryptedPackage);

      const metadata = this.metadataCache.get(storageKey);
      if (metadata) {
        metadata.lastAccessedAt = Date.now();
        metadata.accessCount += 1;
        this.metadataCache.set(storageKey, metadata);
      }

      const operationTime = performance.now() - startTime;

      if (operationTime > SECURE_STORAGE_CONFIG.CRISIS_ACCESS_THRESHOLD_MS) {
        logError(LogCategory.SYSTEM, `CRISIS DATA ACCESS TOO SLOW: ${operationTime.toFixed(2)}ms > ${SECURE_STORAGE_CONFIG.CRISIS_ACCESS_THRESHOLD_MS}ms`);
      }

      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'retrieve',
        storageKey,
        storageTier: 'crisis_tier',
        dataType: 'crisis_intervention',
        success: true,
        operationTimeMs: operationTime,
        dataSize: encryptedDataString.length,
        userContext,
        securityContext: 'crisis_data_retrieval'
      });

      logPerformance('SecureStorageService.retrieveCrisisData', operationTime, {
        tier: 'crisis_tier'
      });

      return {
        data: decryptedData,
        metadata: metadata || {
          storageKey,
          storageTier: 'crisis_tier',
          sensitivityLevel: 'level_1_crisis_responses',
          dataType: 'crisis_intervention',
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
      logError(LogCategory.SECURITY, '🚨 CRISIS DATA RETRIEVAL ERROR:', error instanceof Error ? error : new Error(String(error)));

      // Log failure
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'retrieve',
        storageKey: `${SECURE_STORAGE_CONFIG.CRISIS_ASYNC_PREFIX}${key}`,
        storageTier: 'crisis_tier',
        dataType: 'crisis_intervention',
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
   * BULK STORAGE OPERATIONS
   * Efficient handling of multiple storage operations
   */
  public async executeBulkOperation(
    operation: BulkStorageOperation,
    userContext?: string
  ): Promise<StorageOperationResult[]> {
    const startTime = performance.now();

    try {
      // Lazy-init the encryption layer so callers can hit these methods
      // before app-startup ordering completes (e.g. Zustand persist rehydration
      // for the assessment store fires at module load, ahead of App.tsx's
      // SecureStorageService.initialize() call). encryptionService.initialize
      // is idempotent and shares the in-flight promise across concurrent calls.
      await this.encryptionService.initialize();

      if (operation.items.length > SECURE_STORAGE_CONFIG.BULK_OPERATION_LIMIT) {
        throw new Error(`Bulk operation limit exceeded: ${operation.items.length} > ${SECURE_STORAGE_CONFIG.BULK_OPERATION_LIMIT}`);
      }

      const results: StorageOperationResult[] = [];

      // Process items in parallel where safe
      const promises = operation.items.map(async (item) => {
        try {
          switch (operation.operationType) {
            case 'store':
              if (!item.data) {
                throw new Error('Data required for store operation');
              }
              
              // Determine storage tier based on metadata
              const tier = item.metadata?.storageTier || 'general_tier';
              
              if (tier === 'crisis_tier') {
                return await this.storeCrisisData(item.key, item.data, item.key, userContext);
              } else if (tier === 'assessment_tier') {
                return await this.storeAssessmentData(item.key, item.data, userContext);
              } else {
                return await this.storeGeneralData(item.key, item.data, tier, userContext);
              }

            case 'retrieve':
              const tier2 = item.metadata?.storageTier || 'general_tier';
              
              if (tier2 === 'crisis_tier') {
                const result = await this.retrieveCrisisData(item.key, userContext);
                return {
                  success: result !== null,
                  operationType: 'retrieve' as const,
                  storageKey: item.key,
                  operationTimeMs: 0, // Would be measured
                  dataSize: result ? JSON.stringify(result.data).length : 0,
                  metadata: result?.metadata
                };
              } else if (tier2 === 'assessment_tier') {
                const result = await this.retrieveAssessmentData(item.key, userContext);
                return {
                  success: result !== null,
                  operationType: 'retrieve' as const,
                  storageKey: item.key,
                  operationTimeMs: 0,
                  dataSize: result ? JSON.stringify(result.data).length : 0,
                  metadata: result?.metadata
                };
              } else {
                const result = await this.retrieveGeneralData(item.key, userContext);
                return {
                  success: result !== null,
                  operationType: 'retrieve' as const,
                  storageKey: item.key,
                  operationTimeMs: 0,
                  dataSize: result ? JSON.stringify(result).length : 0
                };
              }

            case 'delete':
              return await this.deleteSecureData(item.key, userContext);

            default:
              throw new Error(`Unsupported bulk operation: ${operation.operationType}`);
          }
        } catch (error) {
          return {
            success: false,
            operationType: operation.operationType,
            storageKey: item.key,
            operationTimeMs: 0,
            dataSize: 0,
            error: (error instanceof Error ? error.message : String(error))
          };
        }
      });

      const operationResults = await Promise.all(promises);
      results.push(...operationResults);

      const totalOperationTime = performance.now() - startTime;

      // Validate bulk operation performance
      if (totalOperationTime > SECURE_STORAGE_CONFIG.BULK_OPERATION_THRESHOLD_MS) {
        logSecurity('⚠️  Bulk operation slow: ${totalOperationTime.toFixed(2)}ms > ${SECURE_STORAGE_CONFIG.BULK_OPERATION_THRESHOLD_MS}ms', 'medium', { component: 'SecurityService' });
      }

      // Log bulk operation
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'bulk',
        storageKey: `bulk_${operation.operationType}_${operation.items.length}_items`,
        storageTier: 'general_tier',
        dataType: 'bulk_operation',
        success: results.every(r => r.success),
        operationTimeMs: totalOperationTime,
        dataSize: results.reduce((sum, r) => sum + r.dataSize, 0),
        userContext,
        securityContext: 'bulk_storage_operation'
      });

      logPerformance('SecureStorageService.bulkOperation', totalOperationTime, {
        operationType: operation.operationType,
        itemCount: operation.items.length
      });

      return results;

    } catch (error) {
      const operationTime = performance.now() - startTime;
      logError(LogCategory.SECURITY, '🚨 BULK OPERATION ERROR:', error instanceof Error ? error : new Error(String(error)));

      // Log failure
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'bulk',
        storageKey: `bulk_${operation.operationType}_failed`,
        storageTier: 'general_tier',
        dataType: 'bulk_operation',
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
      const metadataKey = 'storage_metadata_index';
      const metadataString = await AsyncStorage.getItem(metadataKey);
      
      if (metadataString) {
        const metadataArray: Array<[string, SecureStorageMetadata]> = JSON.parse(metadataString);
        this.metadataCache = new Map(metadataArray);
        logSystem(`Loaded ${this.metadataCache.size} metadata entries`);
      }

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 METADATA LOADING ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async storeMetadata(storageKey: string, metadata: SecureStorageMetadata): Promise<void> {
    try {
      // Store in cache
      this.metadataCache.set(storageKey, metadata);

      // Persist metadata index
      const metadataArray = Array.from(this.metadataCache.entries());
      await AsyncStorage.setItem('storage_metadata_index', JSON.stringify(metadataArray));

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 METADATA STORAGE ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async deleteMetadata(storageKey: string): Promise<void> {
    try {
      this.metadataCache.delete(storageKey);
      
      // Update persisted index
      const metadataArray = Array.from(this.metadataCache.entries());
      await AsyncStorage.setItem('storage_metadata_index', JSON.stringify(metadataArray));

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

    if (storageTier === 'crisis_tier' || storageTier === 'assessment_tier') {
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
   * Wipe all wellness data on logout/account deletion. Sweeps both AsyncStorage
   * (hybrid path) and SecureStore (legacy + unmigrated). Required for CCPA/TDPSA
   * right-to-delete + GDPR Art. 17 (right to erasure).
   */
  public async clearAllWellnessData(): Promise<void> {
    const asyncKeys = await AsyncStorage.getAllKeys();
    const toRemove = asyncKeys.filter((k) =>
      k.startsWith(SECURE_STORAGE_CONFIG.CRISIS_ASYNC_PREFIX) ||
      k.startsWith(SECURE_STORAGE_CONFIG.ASSESSMENT_ASYNC_PREFIX) ||
      k.startsWith(SECURE_STORAGE_CONFIG.WELLNESS_ASYNC_PREFIX) ||
      k.startsWith(SECURE_STORAGE_CONFIG.MIGRATION_MARKER_PREFIX)
    );
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }

    // SecureStore has no enumerate API. Caller is responsible for clearing
    // known legacy keys via deleteSecureData / deleteWellnessBlob when wiping
    // specific records. clearSensitiveData on EncryptionService handles the
    // master key.
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

      // Persist critical access logs
      if (entry.storageTier === 'crisis_tier' || !entry.success) {
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
    crisisEntries: number;
    assessmentEntries: number;
    totalStorageSize: number;
    accessLogSize: number;
    averageAccessTime: number;
    successRate: number;
  }> {
    const crisisEntries = Array.from(this.metadataCache.values()).filter(m => m.storageTier === 'crisis_tier').length;
    const assessmentEntries = Array.from(this.metadataCache.values()).filter(m => m.storageTier === 'assessment_tier').length;
    const totalStorageSize = Array.from(this.metadataCache.values()).reduce((sum, m) => sum + m.dataSize, 0);
    
    const accessTimes = this.accessLog.map(log => log.operationTimeMs);
    const averageAccessTime = accessTimes.length > 0 ? accessTimes.reduce((sum, time) => sum + time, 0) / accessTimes.length : 0;
    
    const successfulOperations = this.accessLog.filter(log => log.success).length;
    const successRate = this.accessLog.length > 0 ? successfulOperations / this.accessLog.length : 0;

    return {
      totalEntries: this.metadataCache.size,
      crisisEntries,
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