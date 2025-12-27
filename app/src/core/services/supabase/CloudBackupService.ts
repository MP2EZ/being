/**
 * Cloud Backup Service - Encrypted Data Backup to Supabase
 *
 * PRIVACY-FIRST DESIGN:
 * - Uses existing EncryptionService for client-side encryption
 * - Only stores encrypted blobs in cloud (no PHI)
 * - Integrity verification with checksums
 * - Anonymous user association only
 *
 * Privacy COMPLIANCE (MAINT-117):
 * Cloud backup MUST NOT include Protected Health Information (PHI).
 *
 * SENSITIVE FIELDS EXCLUDED (privacy protection):
 * - Individual PHQ-9/GAD-7 question responses (answers[])
 * - Assessment scores (totalScore, severity)
 * - Crisis indicators (suicidalIdeation, isCrisis)
 * - Crisis detection/intervention records
 * - Completed assessment history
 *
 * PERMITTED DATA (Non-PHI settings only):
 * - autoSaveEnabled (boolean preference)
 * - lastSyncAt (backup metadata timestamp)
 *
 * FILTERING APPROACH: STRICT ALLOWLIST
 * Only explicitly permitted fields are backed up. Unknown fields
 * are automatically excluded for fail-safe PHI protection.
 *
 * FEATURES:
 * - Automated backup on significant events
 * - Conflict resolution (last-write-wins)
 * - Offline queue support
 * - Integrity verification
 * - Performance monitoring
 *
 * INTEGRATION:
 * - Leverages existing Zustand stores
 * - Uses EncryptionService for AES-256-GCM encryption
 * - Integrates with SupabaseService for cloud storage
 *
 * PERFORMANCE:
 * - Non-blocking backup operations
 * - Incremental backup detection
 * - Compression for large data sets
 * - Background processing
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../logging';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

// Services
import EncryptionService, { EncryptedDataPackage } from '../security/EncryptionService';
import supabaseService from './SupabaseService';

// Store imports
import { useAssessmentStore as assessmentStore } from '@/features/assessment/stores/assessmentStore';

// Types
interface BackupData {
  version: number;
  timestamp: number;
  stores: {
    assessment?: AssessmentStoreBackup;
    user?: any;
    exercises?: any;
    // Add other stores as needed
  };
  metadata: {
    deviceInfo?: string;
    appVersion?: string;
    platform?: string;
  };
}

/**
 * Privacy-Compliant Assessment Store Backup
 *
 * STRICT ALLOWLIST: Only non-PHI configuration fields are backed up.
 * All PHQ-9/GAD-7 responses, scores, and clinical data are EXCLUDED.
 *
 * This interface defines the ONLY fields that may be transmitted to cloud backup.
 * Any fields not in this interface are automatically excluded.
 *
 * @security MAINT-117 - PHI Filtering Implementation
 */
interface AssessmentStoreBackup {
  /** User preference for automatic saving - NOT PHI */
  autoSaveEnabled: boolean;
  /** Timestamp of last sync operation (backup metadata) - NOT PHI */
  lastSyncAt: number | null;
}

/**
 * PHI fields that are PROHIBITED from cloud backup
 * Used for validation logging only - these fields are NEVER included
 *
 * @security Reference list for audit purposes
 */
const SENSITIVE_FIELDS_EXCLUDED = [
  'answers',                    // Individual PHQ-9/GAD-7 question responses
  'currentSession',             // Active assessment session with responses
  'currentQuestionIndex',       // Assessment progress indicator
  'completedAssessments',       // Historical assessment data with scores
  'currentResult',              // Assessment result with scores/severity
  'crisisDetection',            // Crisis detection records
  'crisisIntervention',         // Crisis intervention records
  'hasRecoverableSession',      // Indicates in-progress assessment
  'isLoading',                  // Transient state (not needed)
  'error',                      // Transient state (not needed)
] as const;

interface BackupResult {
  success: boolean;
  timestamp?: number;
  size?: number;
  error?: string;
}

interface RestoreResult {
  success: boolean;
  timestamp?: number;
  restoredStores: string[];
  errors: string[];
}

interface BackupConfig {
  autoBackupEnabled: boolean;
  autoBackupIntervalMs: number;
  maxBackupSizeMB: number;
  compressionEnabled: boolean;
  integrityCheckEnabled: boolean;
}

// Storage keys
const STORAGE_KEYS = {
  LAST_BACKUP: '@being/cloud_backup/last_backup',
  BACKUP_CONFIG: '@being/cloud_backup/config',
  BACKUP_STATS: '@being/cloud_backup/stats',
} as const;

class CloudBackupService {
  private isInitialized = false;
  private autoBackupTimer: NodeJS.Timeout | null = null;
  private config: BackupConfig;
  private lastBackupHash: string | null = null;

  constructor() {
    this.config = {
      autoBackupEnabled: true,
      autoBackupIntervalMs: 4 * 60 * 60 * 1000, // 4 hours
      maxBackupSizeMB: 10,
      compressionEnabled: true,
      integrityCheckEnabled: true,
    };
  }

  /**
   * Initialize the cloud backup service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure dependencies are initialized
      await supabaseService.initialize();

      // Load configuration
      await this.loadConfig();

      // Setup auto-backup
      if (this.config.autoBackupEnabled) {
        this.setupAutoBackup();
      }

      // Setup store listeners for immediate backup triggers
      this.setupStoreListeners();

      // Setup app state listener
      this.setupAppStateListener();

      this.isInitialized = true;
      console.log('[CloudBackupService] Initialized');

    } catch (error) {
      logError(LogCategory.SYSTEM, '[CloudBackupService] Initialization failed:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Create and upload backup to cloud
   */
  async createBackup(): Promise<BackupResult> {
    if (!this.isInitialized) {
      logSecurity('[CloudBackupService] Not initialized', 'low');
      return { success: false, error: 'Service not initialized' };
    }

    try {
      const startTime = Date.now();

      // Collect data from stores
      const backupData = await this.collectStoreData();

      // Check if data has changed since last backup
      const dataHash = await this.calculateDataHash(backupData);
      if (dataHash === this.lastBackupHash) {
        console.log('[CloudBackupService] No changes detected, skipping backup');
        return { success: true, timestamp: Date.now() };
      }

      // Serialize and optionally compress
      let serializedData = JSON.stringify(backupData);
      let originalSize = new Blob([serializedData]).size;

      if (this.config.compressionEnabled) {
        serializedData = await this.compressData(serializedData);
      }

      const finalSize = new Blob([serializedData]).size;

      // Check size limits
      if (finalSize > this.config.maxBackupSizeMB * 1024 * 1024) {
        throw new Error(`Backup size (${Math.round(finalSize / 1024 / 1024)}MB) exceeds limit (${this.config.maxBackupSizeMB}MB)`);
      }

      // Encrypt data using existing encryption service
      const encryptedData = await EncryptionService.encryptData(
        serializedData,
        'level_3_intervention_metadata' // Cloud backup is level 3 sensitivity
      );

      // Serialize encrypted package for storage
      const encryptedDataString = JSON.stringify(encryptedData);

      // Calculate integrity checksum
      const checksum = await this.calculateChecksum(encryptedDataString);

      // Upload to Supabase
      const uploadSuccess = await supabaseService.saveBackup(
        encryptedDataString,
        checksum,
        backupData.version
      );

      if (!uploadSuccess) {
        throw new Error('Failed to upload backup to cloud');
      }

      // Update tracking
      this.lastBackupHash = dataHash;
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_BACKUP, JSON.stringify({
        timestamp: Date.now(),
        hash: dataHash,
        size: finalSize,
        originalSize,
        compressed: this.config.compressionEnabled,
      }));

      // Track analytics
      await supabaseService.trackEvent('backup_completed', {
        size_mb: Math.round(finalSize / 1024 / 1024 * 100) / 100,
        compression_ratio: originalSize > 0 ? Math.round(originalSize / finalSize * 100) / 100 : 1,
        duration_ms: Date.now() - startTime,
      });

      const duration = Date.now() - startTime;
      logPerformance('CloudBackupService.createBackup', duration, {
        sizeKB: Math.round(finalSize / 1024)
      });

      return {
        success: true,
        timestamp: Date.now(),
        size: finalSize,
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, '[CloudBackupService] Backup failed:', error instanceof Error ? error : new Error(String(error)));

      // Track failure
      await supabaseService.trackEvent('backup_failed', {
        error_type: error instanceof Error ? error.constructor.name : 'Unknown',
        error_message: error instanceof Error ? error.message.substring(0, 100) : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Restore data from cloud backup
   */
  async restoreFromBackup(): Promise<RestoreResult> {
    if (!this.isInitialized) {
      logSecurity('[CloudBackupService] Not initialized', 'low');
      return { success: false, restoredStores: [], errors: ['Service not initialized'] };
    }

    try {
      const startTime = Date.now();

      // Retrieve backup from cloud
      const backupRecord = await supabaseService.getBackup();
      if (!backupRecord) {
        return { success: false, restoredStores: [], errors: ['No backup found'] };
      }

      // Verify integrity if enabled
      if (this.config.integrityCheckEnabled) {
        const calculatedChecksum = await this.calculateChecksum(backupRecord.encrypted_data);
        if (calculatedChecksum !== backupRecord.checksum) {
          throw new Error('Backup integrity check failed - data may be corrupted');
        }
      }

      // Decrypt data (parse JSON string back to EncryptedDataPackage)
      const encryptedPackage = JSON.parse(backupRecord.encrypted_data) as EncryptedDataPackage;
      const decryptedData = await EncryptionService.decryptData(
        encryptedPackage,
        'level_3_intervention_metadata'
      );

      // Decompress if needed
      let restoredDataString = decryptedData;
      if (this.config.compressionEnabled) {
        restoredDataString = await this.decompressData(decryptedData);
      }

      // Parse backup data
      const backupData: BackupData = JSON.parse(restoredDataString);

      // Validate backup structure
      if (!this.validateBackupStructure(backupData)) {
        throw new Error('Invalid backup structure');
      }

      // Restore stores with PHI-safe filtering
      // Privacy COMPLIANCE (MAINT-117): Backups contain ONLY non-PHI config fields.
      // Even on restore, we use allowlist approach to prevent any accidental PHI restoration.
      const restoredStores: string[] = [];
      const errors: string[] = [];

      if (backupData.stores.assessment) {
        try {
          // STRICT ALLOWLIST: Only restore non-PHI configuration fields
          // This protects against any legacy backups that might contain PHI
          const safeRestoreData: Partial<AssessmentStoreBackup> = {};

          // Only restore fields that are explicitly safe (non-PHI)
          if (typeof backupData.stores.assessment.autoSaveEnabled === 'boolean') {
            safeRestoreData.autoSaveEnabled = backupData.stores.assessment.autoSaveEnabled;
          }
          if (backupData.stores.assessment.lastSyncAt !== undefined) {
            safeRestoreData.lastSyncAt = backupData.stores.assessment.lastSyncAt;
          }

          // Log if unexpected fields were found (might be legacy backup with PHI)
          // SECURITY: Use minimal metadata to prevent structure disclosure (CR-2)
          const EXPECTED_SAFE_FIELDS = 2; // autoSaveEnabled, lastSyncAt
          const safeFieldCount = Object.keys(safeRestoreData).length;
          const backupFieldCount = Object.keys(backupData.stores.assessment).length;

          if (backupFieldCount > safeFieldCount) {
            // Legacy backup detected - PHI was filtered out
            logSecurity('[CloudBackupService] Legacy backup filtered (PHI excluded)', 'medium', {
              legacyBackupDetected: true,
              safeFieldsRestored: safeFieldCount,
              // DO NOT log: exact field counts (prevents structure disclosure)
            });
          }

          // Restore only the safe fields (merges with existing state)
          if (Object.keys(safeRestoreData).length > 0) {
            assessmentStore.setState(safeRestoreData);
            restoredStores.push('assessment (config only - PHI excluded per Privacy)');
          }
        } catch (error) {
          errors.push(`Failed to restore assessment store: ${error}`);
        }
      }

      // Add other store restorations as needed with similar PHI filtering
      // if (backupData.stores.user) { ... }
      // if (backupData.stores.exercises) { ... }

      // Track restoration
      await supabaseService.trackEvent('backup_restored', {
        backup_timestamp: backupData.timestamp,
        restored_stores: restoredStores.length,
        errors_count: errors.length,
        duration_ms: Date.now() - startTime,
      });

      const duration = Date.now() - startTime;
      logPerformance('CloudBackupService.restoreBackup', duration, {
        restoredStores: restoredStores.join(', ')
      });

      return {
        success: errors.length === 0,
        timestamp: backupData.timestamp,
        restoredStores,
        errors,
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, '[CloudBackupService] Restore failed:', error instanceof Error ? error : new Error(String(error)));

      // Track failure
      await supabaseService.trackEvent('backup_restore_failed', {
        error_type: error instanceof Error ? error.constructor.name : 'Unknown',
        error_message: error instanceof Error ? error.message.substring(0, 100) : 'Unknown error',
      });

      return {
        success: false,
        restoredStores: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Check if backup exists in cloud
   */
  async hasCloudBackup(): Promise<boolean> {
    try {
      const backup = await supabaseService.getBackup();
      return backup !== null;
    } catch (error) {
      logError(LogCategory.SYSTEM, '[CloudBackupService] Failed to check for backup:', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Get backup status and metadata
   */
  async getBackupStatus(): Promise<{
    hasLocalData: boolean;
    hasCloudBackup: boolean;
    lastBackupTime?: number | undefined;
    cloudBackupTime?: number | undefined;
    needsBackup: boolean;
  }> {
    try {
      const [localData, cloudBackup] = await Promise.all([
        this.getLastBackupInfo(),
        supabaseService.getBackup(),
      ]);

      const hasLocalData = await this.hasLocalData();
      const hasCloudBackup = cloudBackup !== null;
      const cloudBackupTime = cloudBackup ? new Date(cloudBackup.created_at).getTime() : undefined;

      // Check if backup is needed
      const currentDataHash = await this.calculateCurrentDataHash();
      const needsBackup = !localData || currentDataHash !== localData.hash;

      return {
        hasLocalData,
        hasCloudBackup,
        lastBackupTime: localData?.timestamp,
        cloudBackupTime,
        needsBackup,
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, '[CloudBackupService] Failed to get backup status:', error instanceof Error ? error : new Error(String(error)));
      return {
        hasLocalData: false,
        hasCloudBackup: false,
        needsBackup: true,
      };
    }
  }

  /**
   * Collect data from all stores with PHI filtering
   *
   * Privacy COMPLIANCE (MAINT-117):
   * This method implements STRICT ALLOWLIST filtering to ensure no Protected
   * Health Information (PHI) is included in cloud backups.
   *
   * PERMITTED DATA (Non-PHI only):
   * - Assessment: autoSaveEnabled, lastSyncAt
   * - User: preferences (if added)
   * - Exercises: progress (if added, non-clinical)
   *
   * EXCLUDED DATA (PHI):
   * - All PHQ-9/GAD-7 question responses
   * - Assessment scores and severity levels
   * - Crisis detection/intervention records
   * - Completed assessment history
   *
   * @security Uses allowlist pattern - only explicitly safe fields are included
   */
  private async collectStoreData(): Promise<BackupData> {
    // Get full assessment state for filtering
    const fullAssessmentState = assessmentStore.getState();

    // STRICT ALLOWLIST: Extract ONLY non-PHI configuration fields
    // Any field not explicitly copied here is EXCLUDED from backup
    const filteredAssessmentData: AssessmentStoreBackup = {
      autoSaveEnabled: fullAssessmentState.autoSaveEnabled,
      lastSyncAt: fullAssessmentState.lastSyncAt,
    };

    // Audit log: Track PHI filtering (metadata only, no PHI structure revealed)
    // SECURITY: Use static expected count to prevent structure disclosure (CR-2)
    const EXPECTED_SAFE_FIELDS = 2; // autoSaveEnabled, lastSyncAt
    const actualSafeFieldCount = Object.keys(filteredAssessmentData).length;

    logSecurity('[CloudBackupService] PHI filtering applied', 'low', {
      safeFieldsBackedUp: EXPECTED_SAFE_FIELDS,
      filteringActive: true,
      // DO NOT log: excludedFieldCount (reveals PHI structure over time)
      // DO NOT log: field names or values
    });

    // Anomaly detection: Flag unexpected field counts (indicates code change needed)
    if (actualSafeFieldCount !== EXPECTED_SAFE_FIELDS) {
      logSecurity('[CloudBackupService] Backup field count anomaly', 'high', {
        expected: EXPECTED_SAFE_FIELDS,
        actual: actualSafeFieldCount,
        // Security note: Update EXPECTED_SAFE_FIELDS if allowlist changes
      });
    }

    // Validate backup size (config-only should be <1KB)
    const backupPayload = {
      version: 1,
      timestamp: Date.now(),
      stores: {
        assessment: filteredAssessmentData,
        // Add other stores as needed with similar PHI filtering
        // user: filterUserStore(userStore.getState()),
        // exercises: filterExerciseStore(exerciseStore.getState()),
      },
      metadata: {
        platform: 'react-native',
        // deviceInfo: await getDeviceInfo(),
        // appVersion: getAppVersion(),
      },
    };

    // SECURITY: Precise size validation for PHI leak detection (CR-1)
    // Config-only backup (2 assessment fields + metadata) is ~150-200 bytes
    // PHI-containing backups would be in KB range (thousands of bytes)
    const EXPECTED_MAX_SIZE = 500; // ~150 bytes typical + generous margin for future metadata
    const payloadSize = JSON.stringify(backupPayload).length;

    if (payloadSize > EXPECTED_MAX_SIZE) {
      logSecurity('[CloudBackupService] Backup size exceeds expected maximum (PHI leak risk)', 'critical', {
        actualSize: payloadSize,
        expectedMax: EXPECTED_MAX_SIZE,
        // SECURITY: Large backup may indicate accidental PHI inclusion
      });

      // FAIL-SAFE: Abort backup if size anomaly detected
      // This prevents potential PHI transmission to cloud
      throw new Error(
        `Backup size validation failed: ${payloadSize} bytes exceeds expected ${EXPECTED_MAX_SIZE} bytes. ` +
        'Potential PHI inclusion detected. Aborting backup for safety.'
      );
    }

    return backupPayload;
  }

  /**
   * Calculate hash of backup data for change detection
   */
  private async calculateDataHash(data: BackupData): Promise<string> {
    const serialized = JSON.stringify({
      stores: data.stores,
      // Exclude timestamp and metadata from hash calculation
    });

    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      serialized
    );
  }

  /**
   * Calculate current data hash without creating backup
   */
  private async calculateCurrentDataHash(): Promise<string> {
    const currentData = await this.collectStoreData();
    return await this.calculateDataHash(currentData);
  }

  /**
   * Calculate checksum for integrity verification
   */
  private async calculateChecksum(data: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
  }

  /**
   * Compress data using simple algorithm
   */
  private async compressData(data: string): Promise<string> {
    // For React Native, we'll use a simple compression
    // In a real implementation, you might use pako or similar

    // Simple run-length encoding for demonstration
    // This is a placeholder - use proper compression library
    return data; // TODO: Implement actual compression
  }

  /**
   * Decompress data
   */
  private async decompressData(data: string): Promise<string> {
    // Placeholder for decompression
    return data; // TODO: Implement actual decompression
  }

  /**
   * Validate backup data structure
   */
  private validateBackupStructure(data: any): data is BackupData {
    return (
      typeof data === 'object' &&
      typeof data.version === 'number' &&
      typeof data.timestamp === 'number' &&
      typeof data.stores === 'object'
    );
  }

  /**
   * Check if there's local data to backup
   */
  private async hasLocalData(): Promise<boolean> {
    try {
      const assessmentState = assessmentStore.getState();
      return assessmentState && Object.keys(assessmentState).length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get last backup information
   */
  private async getLastBackupInfo(): Promise<any> {
    try {
      const info = await AsyncStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
      return info ? JSON.parse(info) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Load configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem(STORAGE_KEYS.BACKUP_CONFIG);
      if (configData) {
        const savedConfig = JSON.parse(configData);
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      logSecurity('[CloudBackupService] Failed to load config, using defaults', 'low');
    }
  }

  /**
   * Save configuration to storage
   */
  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BACKUP_CONFIG, JSON.stringify(this.config));
    } catch (error) {
      logSecurity('[CloudBackupService] Failed to save config:', 'medium', { error });
    }
  }

  /**
   * Setup automatic backup timer
   */
  private setupAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
    }

    this.autoBackupTimer = setInterval(
      () => this.createBackup(),
      this.config.autoBackupIntervalMs
    );
  }

  /**
   * Setup store listeners for immediate backup triggers
   */
  private setupStoreListeners(): void {
    // Listen to assessment store changes
    assessmentStore.subscribe((state: any, prevState: any) => {
      // Trigger backup on significant changes
      if (this.shouldTriggerImmediateBackup(state, prevState)) {
        // Debounce rapid changes
        setTimeout(() => this.createBackup(), 5000);
      }
    });
  }

  /**
   * Determine if changes warrant immediate backup
   */
  private shouldTriggerImmediateBackup(newState: any, prevState: any): boolean {
    // Backup immediately after assessment completion
    if (!prevState?.lastCompleted && newState?.lastCompleted) {
      return true;
    }

    // Backup after crisis events
    if (newState?.crisisDetected && !prevState?.crisisDetected) {
      return true;
    }

    return false;
  }

  /**
   * Setup app state listener for foreground backup
   */
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground, check if backup is needed
        setTimeout(() => {
          this.createBackup();
        }, 2000); // Small delay to let app stabilize
      }
    });
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<BackupConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();

    // Restart auto-backup with new interval if changed
    if (newConfig.autoBackupIntervalMs !== undefined && this.config.autoBackupEnabled) {
      this.setupAutoBackup();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): BackupConfig {
    return { ...this.config };
  }

  /**
   * Cleanup service
   */
  async cleanup(): Promise<void> {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
    }

    // Perform final backup if needed
    if (this.isInitialized) {
      await this.createBackup();
    }

    this.isInitialized = false;
  }
}

// Export singleton instance
export const cloudBackupService = new CloudBackupService();
export default cloudBackupService;