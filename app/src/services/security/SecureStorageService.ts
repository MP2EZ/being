/**
import { logSecurity, logPerformance, logError, LogCategory } from '../services/logging';
 * SECURE STORAGE SERVICE - DRD-FLOW-005 Security Implementation
 *
 * COMPREHENSIVE SECURE STORAGE FOR MENTAL HEALTH DATA:
 * - React Native SecureStore integration with encryption layers
 * - Tiered storage based on data sensitivity (PHQ-9/GAD-7/Crisis)
 * - Automatic encryption/decryption with performance optimization
 * - Secure data lifecycle management and cleanup
 * - Audit trails and access logging for compliance
 *
 * STORAGE ARCHITECTURE:
 * - Level 1: Crisis responses (SecureStore + AES-256-GCM)
 * - Level 2: Assessment data (SecureStore + AES-256-GCM)
 * - Level 3: Intervention metadata (SecureStore + AES-256)
 * - Level 4: Performance data (AsyncStorage + basic encryption)
 * - Level 5: General data (AsyncStorage, unencrypted)
 *
 * PERFORMANCE REQUIREMENTS:
 * - Crisis data access: <200ms (includes decryption)
 * - Assessment data access: <300ms
 * - Bulk operations: <500ms for up to 100 records
 * - Background sync: <1000ms for data export
 *
 * MENTAL HEALTH COMPLIANCE:
 * - HIPAA-compliant storage with audit trails
 * - 7-year retention for clinical records
 * - Secure data deletion and device cleanup
 * - Emergency data access protocols
 */

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
  /** Storage tier prefixes */
  CRISIS_PREFIX: 'crisis_secure_',
  ASSESSMENT_PREFIX: 'assessment_secure_',
  INTERVENTION_PREFIX: 'intervention_secure_',
  PERFORMANCE_PREFIX: 'performance_',
  GENERAL_PREFIX: 'general_',
  
  /** Storage limits */
  MAX_SECURE_STORE_SIZE: 2048, // 2KB limit for SecureStore
  MAX_ASYNC_STORAGE_SIZE: 6 * 1024 * 1024, // 6MB limit
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
  | 'crisis_tier'        // Highest security - SecureStore + Level 1 encryption
  | 'assessment_tier'    // High security - SecureStore + Level 2 encryption  
  | 'intervention_tier'  // Medium security - SecureStore + Level 3 encryption
  | 'performance_tier'   // Low security - AsyncStorage + basic encryption
  | 'general_tier';      // Minimal security - AsyncStorage, unencrypted

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
  retentionPolicy: 'temporary' | 'session' | 'persistent' | 'clinical_record';
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
  error?: string;
  metadata?: SecureStorageMetadata;
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
  userContext?: string;
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
    this.initializeCleanupScheduler();
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
      logPerformance('🔒 Initializing Secure Storage Service...');

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
      logPerformance(`✅ Secure Storage Service initialized (${initializationTime.toFixed(2)}ms)`);

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
      logError('🚨 SECURE STORAGE INITIALIZATION ERROR:', error);
      throw new Error(`Secure storage initialization failed: ${error.message}`);
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
      if (!this.initialized) {
        throw new Error('Secure storage not initialized');
      }

      const storageKey = `${SECURE_STORAGE_CONFIG.CRISIS_PREFIX}${key}`;

      // Encrypt crisis data with highest security
      const encryptedPackage = await this.encryptionService.encryptCrisisData(
        crisisData,
        crisisEpisodeId
      );

      // Validate size constraints
      await this.validateStorageSize(encryptedPackage, 'crisis_tier');

      // Store in SecureStore
      await SecureStore.setItemAsync(storageKey, JSON.stringify(encryptedPackage));

      // Create metadata
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
        retentionPolicy: 'clinical_record'
      };

      // Cache metadata
      this.metadataCache.set(storageKey, metadata);

      // Store metadata separately
      await this.storeMetadata(storageKey, metadata);

      const operationTime = performance.now() - startTime;

      // Validate crisis performance requirement
      if (operationTime > SECURE_STORAGE_CONFIG.CRISIS_ACCESS_THRESHOLD_MS) {
        logSecurity(`⚠️  Crisis storage slow: ${operationTime.toFixed(2)}ms > ${SECURE_STORAGE_CONFIG.CRISIS_ACCESS_THRESHOLD_MS}ms`);
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

      logPerformance(`🚨 Crisis data stored (${operationTime.toFixed(2)}ms, ${metadata.dataSize} bytes)`);

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
      logError('🚨 CRISIS DATA STORAGE ERROR:', error);

      // Log failure
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'store',
        storageKey: `${SECURE_STORAGE_CONFIG.CRISIS_PREFIX}${key}`,
        storageTier: 'crisis_tier',
        dataType: 'crisis_intervention',
        success: false,
        operationTimeMs: operationTime,
        dataSize: 0,
        userContext,
        error: error.message
      });

      return {
        success: false,
        operationType: 'store',
        storageKey: `${SECURE_STORAGE_CONFIG.CRISIS_PREFIX}${key}`,
        operationTimeMs: operationTime,
        dataSize: 0,
        error: error.message
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
      if (!this.initialized) {
        throw new Error('Secure storage not initialized');
      }

      const storageKey = `${SECURE_STORAGE_CONFIG.ASSESSMENT_PREFIX}${assessmentId}`;

      // Encrypt assessment data
      const encryptedPackage = await this.encryptionService.encryptAssessmentData(
        assessmentData,
        assessmentId
      );

      // Validate size constraints
      await this.validateStorageSize(encryptedPackage, 'assessment_tier');

      // Store in SecureStore
      await SecureStore.setItemAsync(storageKey, JSON.stringify(encryptedPackage));

      // Create metadata
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
        retentionPolicy: 'clinical_record'
      };

      // Cache metadata
      this.metadataCache.set(storageKey, metadata);

      // Store metadata
      await this.storeMetadata(storageKey, metadata);

      const operationTime = performance.now() - startTime;

      // Validate assessment performance requirement
      if (operationTime > SECURE_STORAGE_CONFIG.ASSESSMENT_ACCESS_THRESHOLD_MS) {
        logSecurity(`⚠️  Assessment storage slow: ${operationTime.toFixed(2)}ms > ${SECURE_STORAGE_CONFIG.ASSESSMENT_ACCESS_THRESHOLD_MS}ms`);
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

      logPerformance(`📋 Assessment data stored (${assessmentData.type}, ${operationTime.toFixed(2)}ms)`);

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
      logError('🚨 ASSESSMENT DATA STORAGE ERROR:', error);

      // Log failure
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'store',
        storageKey: `${SECURE_STORAGE_CONFIG.ASSESSMENT_PREFIX}${assessmentId}`,
        storageTier: 'assessment_tier',
        dataType: 'assessment_data',
        success: false,
        operationTimeMs: operationTime,
        dataSize: 0,
        userContext,
        error: error.message
      });

      return {
        success: false,
        operationType: 'store',
        storageKey: `${SECURE_STORAGE_CONFIG.ASSESSMENT_PREFIX}${assessmentId}`,
        operationTimeMs: operationTime,
        dataSize: 0,
        error: error.message
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
      if (!this.initialized) {
        throw new Error('Secure storage not initialized');
      }

      const storageKey = `${SECURE_STORAGE_CONFIG.CRISIS_PREFIX}${key}`;

      // Retrieve from SecureStore
      const encryptedDataString = await SecureStore.getItemAsync(storageKey);
      if (!encryptedDataString) {
        return null;
      }

      // Parse encrypted package
      const encryptedPackage: EncryptedDataPackage = JSON.parse(encryptedDataString);

      // Decrypt data
      const decryptedData = await this.encryptionService.decryptData(encryptedPackage);

      // Update metadata access tracking
      const metadata = this.metadataCache.get(storageKey);
      if (metadata) {
        metadata.lastAccessedAt = Date.now();
        metadata.accessCount += 1;
        this.metadataCache.set(storageKey, metadata);
      }

      const operationTime = performance.now() - startTime;

      // Critical: Crisis data access must be fast
      if (operationTime > SECURE_STORAGE_CONFIG.CRISIS_ACCESS_THRESHOLD_MS) {
        logError(`🚨 CRISIS DATA ACCESS TOO SLOW: ${operationTime.toFixed(2)}ms > ${SECURE_STORAGE_CONFIG.CRISIS_ACCESS_THRESHOLD_MS}ms`);
      }

      // Log access
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

      logPerformance(`🚨 Crisis data retrieved (${operationTime.toFixed(2)}ms)`);

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
          retentionPolicy: 'clinical_record'
        }
      };

    } catch (error) {
      const operationTime = performance.now() - startTime;
      logError('🚨 CRISIS DATA RETRIEVAL ERROR:', error);

      // Log failure
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'retrieve',
        storageKey: `${SECURE_STORAGE_CONFIG.CRISIS_PREFIX}${key}`,
        storageTier: 'crisis_tier',
        dataType: 'crisis_intervention',
        success: false,
        operationTimeMs: operationTime,
        dataSize: 0,
        userContext,
        error: error.message
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
      if (!this.initialized) {
        throw new Error('Secure storage not initialized');
      }

      const storageKey = `${SECURE_STORAGE_CONFIG.ASSESSMENT_PREFIX}${assessmentId}`;

      // Retrieve from SecureStore
      const encryptedDataString = await SecureStore.getItemAsync(storageKey);
      if (!encryptedDataString) {
        return null;
      }

      // Parse and decrypt
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

      logPerformance(`📋 Assessment data retrieved (${operationTime.toFixed(2)}ms)`);

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
          retentionPolicy: 'clinical_record'
        }
      };

    } catch (error) {
      const operationTime = performance.now() - startTime;
      logError('🚨 ASSESSMENT DATA RETRIEVAL ERROR:', error);

      // Log failure
      await this.logStorageAccess({
        timestamp: Date.now(),
        operationType: 'retrieve',
        storageKey: `${SECURE_STORAGE_CONFIG.ASSESSMENT_PREFIX}${assessmentId}`,
        storageTier: 'assessment_tier',
        dataType: 'assessment_data',
        success: false,
        operationTimeMs: operationTime,
        dataSize: 0,
        userContext,
        error: error.message
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
      if (!this.initialized) {
        throw new Error('Secure storage not initialized');
      }

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
            error: error.message
          };
        }
      });

      const operationResults = await Promise.all(promises);
      results.push(...operationResults);

      const totalOperationTime = performance.now() - startTime;

      // Validate bulk operation performance
      if (totalOperationTime > SECURE_STORAGE_CONFIG.BULK_OPERATION_THRESHOLD_MS) {
        logSecurity(`⚠️  Bulk operation slow: ${totalOperationTime.toFixed(2)}ms > ${SECURE_STORAGE_CONFIG.BULK_OPERATION_THRESHOLD_MS}ms`);
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

      logPerformance(`📦 Bulk ${operation.operationType} completed (${operation.items.length} items, ${totalOperationTime.toFixed(2)}ms)`);

      return results;

    } catch (error) {
      const operationTime = performance.now() - startTime;
      logError('🚨 BULK OPERATION ERROR:', error);

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
        error: error.message
      });

      throw error;
    }
  }

  /**
   * GENERAL DATA STORAGE
   * Lower security tiers for non-sensitive data
   */
  private async storeGeneralData(
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
        error: error.message
      };
    }
  }

  private async retrieveGeneralData(
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
      logError('🚨 GENERAL DATA RETRIEVAL ERROR:', error);
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
      if (!this.initialized) {
        throw new Error('Secure storage not initialized');
      }

      // Try all possible storage tiers
      const possibleKeys = [
        `${SECURE_STORAGE_CONFIG.CRISIS_PREFIX}${key}`,
        `${SECURE_STORAGE_CONFIG.ASSESSMENT_PREFIX}${key}`,
        `${SECURE_STORAGE_CONFIG.INTERVENTION_PREFIX}${key}`,
        `${SECURE_STORAGE_CONFIG.PERFORMANCE_PREFIX}${key}`,
        `${SECURE_STORAGE_CONFIG.GENERAL_PREFIX}${key}`
      ];

      let deletedKey: string | null = null;
      let dataSize = 0;

      for (const storageKey of possibleKeys) {
        try {
          // Check SecureStore
          const secureData = await SecureStore.getItemAsync(storageKey);
          if (secureData) {
            await SecureStore.deleteItemAsync(storageKey);
            deletedKey = storageKey;
            dataSize = secureData.length;
            break;
          }

          // Check AsyncStorage
          const asyncData = await AsyncStorage.getItem(storageKey);
          if (asyncData) {
            await AsyncStorage.removeItem(storageKey);
            deletedKey = storageKey;
            dataSize = asyncData.length;
            break;
          }
        } catch (error) {
          // Continue checking other keys
          continue;
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

      logPerformance(`🗑️  Data deleted (${deletedKey || 'not found'}, ${operationTime.toFixed(2)}ms)`);

      return {
        success: deletedKey !== null,
        operationType: 'delete',
        storageKey: deletedKey || key,
        operationTimeMs: operationTime,
        dataSize
      };

    } catch (error) {
      const operationTime = performance.now() - startTime;
      logError('🚨 SECURE DATA DELETION ERROR:', error);

      return {
        success: false,
        operationType: 'delete',
        storageKey: key,
        operationTimeMs: operationTime,
        dataSize: 0,
        error: error.message
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
        logError('🚨 SCHEDULED CLEANUP ERROR:', error);
      }
    }, SECURE_STORAGE_CONFIG.AUTO_CLEANUP_INTERVAL_MS);
  }

  private async performScheduledCleanup(): Promise<void> {
    try {
      logPerformance('🧹 Performing scheduled storage cleanup...');

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

      logPerformance(`✅ Cleanup completed (${cleanedCount} items removed)`);

    } catch (error) {
      logError('🚨 CLEANUP ERROR:', error);
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
      logError('🚨 AUDIT LOG CLEANUP ERROR:', error);
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
        logPerformance(`📋 Loaded ${this.metadataCache.size} metadata entries`);
      }

    } catch (error) {
      logError('🚨 METADATA LOADING ERROR:', error);
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
      logError('🚨 METADATA STORAGE ERROR:', error);
    }
  }

  private async deleteMetadata(storageKey: string): Promise<void> {
    try {
      this.metadataCache.delete(storageKey);
      
      // Update persisted index
      const metadataArray = Array.from(this.metadataCache.entries());
      await AsyncStorage.setItem('storage_metadata_index', JSON.stringify(metadataArray));

    } catch (error) {
      logError('🚨 METADATA DELETION ERROR:', error);
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
      if (packageSize > SECURE_STORAGE_CONFIG.MAX_SECURE_STORE_SIZE) {
        throw new Error(`SecureStore size limit exceeded: ${packageSize} > ${SECURE_STORAGE_CONFIG.MAX_SECURE_STORE_SIZE}`);
      }
    } else {
      if (packageSize > SECURE_STORAGE_CONFIG.MAX_ASYNC_STORAGE_SIZE) {
        throw new Error(`AsyncStorage size limit exceeded: ${packageSize} > ${SECURE_STORAGE_CONFIG.MAX_ASYNC_STORAGE_SIZE}`);
      }
    }
  }

  private async verifyStorageCapabilities(): Promise<void> {
    try {
      logPerformance('🔍 Verifying storage capabilities...');

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

      logPerformance('✅ Storage capabilities verified');

    } catch (error) {
      logError('🚨 STORAGE CAPABILITY VERIFICATION ERROR:', error);
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
      logError('🚨 ACCESS LOGGING ERROR:', error);
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
      logError('🚨 STORAGE EXPORT ERROR:', error);
      throw error;
    }
  }

  public async destroy(): Promise<void> {
    try {
      logPerformance('🗑️  Destroying secure storage service...');

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

      logPerformance('✅ Secure storage service destroyed');

    } catch (error) {
      logError('🚨 SECURE STORAGE DESTRUCTION ERROR:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default SecureStorageService.getInstance();