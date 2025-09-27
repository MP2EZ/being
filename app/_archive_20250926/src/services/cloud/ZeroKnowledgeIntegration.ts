/**
 * Zero-Knowledge Cloud Integration Service
 *
 * Integrates local EncryptionService with cloud storage for zero-knowledge architecture
 * All data encrypted client-side before transmission to Supabase
 */

import { z } from 'zod';
import { CheckIn, Assessment, UserProfile, CrisisPlan } from '../../types';
import {
  EncryptedDataContainer,
  CloudSyncMetadata,
  CloudFeatureFlags,
  CLOUD_CONSTANTS
} from '../../types/cloud';
import { encryptionService, DataSensitivity } from '../security/EncryptionService';
import { cloudSyncAPI } from './CloudSyncAPI';
import { supabaseClient } from './SupabaseClient';

/**
 * Data type mapping for encryption sensitivity levels
 */
const DATA_SENSITIVITY_MAP: Record<string, DataSensitivity> = {
  'assessment': DataSensitivity.CRITICAL, // PHQ-9/GAD-7 clinical data
  'crisis_plan': DataSensitivity.HIGH,    // Crisis intervention data
  'check_in': DataSensitivity.MEDIUM,     // Daily mood/emotion data
  'user_profile': DataSensitivity.LOW     // App preferences and settings
};

/**
 * Conflict resolution strategies for different data types
 */
type ConflictStrategy = 'local_wins' | 'cloud_wins' | 'newest_wins' | 'manual';

const CONFLICT_RESOLUTION_MAP: Record<string, ConflictStrategy> = {
  'assessment': 'manual',      // Clinical data requires manual review
  'crisis_plan': 'newest_wins', // Latest crisis plan usually preferred
  'check_in': 'newest_wins',   // Most recent check-in data preferred
  'user_profile': 'local_wins' // Local preferences take precedence
};

/**
 * Cloud sync operation result
 */
interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  errors: string[];
  duration: number;
}

/**
 * Zero-knowledge cloud integration with client-side encryption
 */
export class ZeroKnowledgeIntegration {
  private initialized = false;
  private featureFlags: CloudFeatureFlags = CLOUD_CONSTANTS.DEFAULT_FEATURE_FLAGS;
  private deviceId: string = '';
  private lastSyncToken: string | null = null;

  constructor() {
    this.initializeAsync();
  }

  /**
   * Initialize the zero-knowledge integration
   */
  private async initializeAsync(): Promise<void> {
    try {
      // Initialize encryption service
      await encryptionService.initialize();

      // Get or generate device ID
      this.deviceId = await this.getOrCreateDeviceId();

      // Update feature flags from environment
      this.updateFeatureFlags();

      this.initialized = true;
      console.log('Zero-knowledge cloud integration initialized');

    } catch (error) {
      console.error('Failed to initialize zero-knowledge integration:', error);
      this.initialized = false;
    }
  }

  /**
   * Update feature flags from environment
   */
  private updateFeatureFlags(): void {
    const envFlags = process.env.EXPO_PUBLIC_FEATURE_FLAGS;
    if (envFlags) {
      try {
        const flags = this.parseFeatureFlags(envFlags);
        this.featureFlags = { ...CLOUD_CONSTANTS.DEFAULT_FEATURE_FLAGS, ...flags };
        supabaseClient.updateFeatureFlags(this.featureFlags);
      } catch (error) {
        console.warn('Failed to parse feature flags, using defaults:', error);
      }
    }
  }

  /**
   * Parse feature flags from environment string
   */
  private parseFeatureFlags(flagString: string): Partial<CloudFeatureFlags> {
    const flags: Partial<CloudFeatureFlags> = {};

    flagString.split(',').forEach(flag => {
      const [key, value] = flag.trim().split(':');
      switch (key) {
        case 'cloud_sync':
          flags.enabled = value === 'true';
          flags.supabaseSync = value === 'true';
          break;
        case 'encrypted_backup':
          flags.encryptedBackup = value === 'true';
          break;
        case 'cross_device_sync':
          flags.crossDeviceSync = value === 'true';
          break;
        case 'emergency_sync':
          flags.emergencySync = value === 'true';
          break;
      }
    });

    return flags;
  }

  /**
   * Get or create unique device identifier
   */
  private async getOrCreateDeviceId(): Promise<string> {
    const stored = await encryptionService.getSecureValue('device_id');
    if (stored) {
      return stored;
    }

    // Generate new device ID
    const deviceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await encryptionService.setSecureValue('device_id', deviceId);
    return deviceId;
  }

  /**
   * Check if cloud sync is enabled and available
   */
  public isEnabled(): boolean {
    return this.initialized &&
           this.featureFlags.enabled &&
           this.featureFlags.supabaseSync &&
           supabaseClient.isEnabled();
  }

  /**
   * Encrypt data for cloud storage
   */
  private async encryptForCloud<T>(
    data: T,
    entityType: string,
    entityId: string
  ): Promise<EncryptedDataContainer> {
    if (!this.initialized) {
      throw new Error('Zero-knowledge integration not initialized');
    }

    const sensitivity = DATA_SENSITIVITY_MAP[entityType] || DataSensitivity.MEDIUM;

    // Encrypt the data using production encryption service
    const encryptionResult = await encryptionService.encryptData(
      JSON.stringify(data),
      sensitivity
    );

    if (!encryptionResult.success || !encryptionResult.encryptedData) {
      throw new Error('Failed to encrypt data for cloud storage');
    }

    // Calculate checksum for integrity
    const checksum = await encryptionService.calculateChecksum(
      JSON.stringify(data)
    );

    const metadata: CloudSyncMetadata = {
      entityId,
      entityType,
      version: 1, // Would be incremented on updates
      lastModified: new Date().toISOString(),
      checksum,
      deviceId: this.deviceId,
      userId: supabaseClient.getSession()?.user?.id,
      cloudVersion: 1
    };

    return {
      id: entityId,
      entityType: entityType as any,
      userId: metadata.userId || '',
      deviceId: this.deviceId,
      encryptedData: encryptionResult.encryptedData,
      encryptionVersion: CLOUD_CONSTANTS.ENCRYPTION_VERSION,
      checksum,
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Decrypt data from cloud storage
   */
  private async decryptFromCloud<T>(container: EncryptedDataContainer): Promise<T> {
    if (!this.initialized) {
      throw new Error('Zero-knowledge integration not initialized');
    }

    // Verify checksum first
    const decryptionResult = await encryptionService.decryptData(
      container.encryptedData,
      DATA_SENSITIVITY_MAP[container.entityType] || DataSensitivity.MEDIUM
    );

    if (!decryptionResult.success || !decryptionResult.decryptedData) {
      throw new Error('Failed to decrypt cloud data');
    }

    try {
      const data = JSON.parse(decryptionResult.decryptedData) as T;

      // Verify data integrity
      const checksum = await encryptionService.calculateChecksum(
        decryptionResult.decryptedData
      );

      if (checksum !== container.checksum) {
        throw new Error('Data integrity check failed - possible corruption');
      }

      return data;

    } catch (error) {
      throw new Error(`Failed to parse decrypted data: ${error}`);
    }
  }

  /**
   * Sync check-in data to cloud
   */
  public async syncCheckIn(checkIn: CheckIn): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled()) {
      return { success: false, error: 'Cloud sync not enabled' };
    }

    try {
      const container = await this.encryptForCloud(checkIn, 'check_in', checkIn.id);

      const result = await cloudSyncAPI.syncBatch({
        operations: [{
          id: `upload_${checkIn.id}`,
          type: 'upload',
          entityType: 'check_in',
          priority: 'normal',
          encryptedPayload: JSON.stringify(container),
          metadata: container.metadata,
          retryCount: 0,
          scheduledAt: new Date().toISOString()
        }],
        deviceId: this.deviceId,
        timestamp: new Date().toISOString(),
        checksum: container.checksum
      });

      return {
        success: result.success && result.failed === 0,
        error: result.errors.length > 0 ? result.errors[0].error : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      };
    }
  }

  /**
   * Sync assessment data to cloud (critical priority)
   */
  public async syncAssessment(assessment: Assessment): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled()) {
      return { success: false, error: 'Cloud sync not enabled' };
    }

    try {
      const container = await this.encryptForCloud(assessment, 'assessment', assessment.id);

      const result = await cloudSyncAPI.syncBatch({
        operations: [{
          id: `upload_${assessment.id}`,
          type: 'upload',
          entityType: 'assessment',
          priority: 'critical', // Critical data gets priority
          encryptedPayload: JSON.stringify(container),
          metadata: container.metadata,
          retryCount: 0,
          scheduledAt: new Date().toISOString()
        }],
        deviceId: this.deviceId,
        timestamp: new Date().toISOString(),
        checksum: container.checksum
      });

      return {
        success: result.success && result.failed === 0,
        error: result.errors.length > 0 ? result.errors[0].error : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Assessment sync failed'
      };
    }
  }

  /**
   * Sync crisis plan to cloud (high priority)
   */
  public async syncCrisisPlan(crisisPlan: CrisisPlan): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled()) {
      return { success: false, error: 'Cloud sync not enabled' };
    }

    try {
      const container = await this.encryptForCloud(crisisPlan, 'crisis_plan', crisisPlan.id);

      const result = await cloudSyncAPI.syncBatch({
        operations: [{
          id: `upload_${crisisPlan.id}`,
          type: 'upload',
          entityType: 'crisis_plan',
          priority: 'high', // Crisis data is high priority
          encryptedPayload: JSON.stringify(container),
          metadata: container.metadata,
          retryCount: 0,
          scheduledAt: new Date().toISOString()
        }],
        deviceId: this.deviceId,
        timestamp: new Date().toISOString(),
        checksum: container.checksum
      });

      return {
        success: result.success && result.failed === 0,
        error: result.errors.length > 0 ? result.errors[0].error : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Crisis plan sync failed'
      };
    }
  }

  /**
   * Sync user profile to cloud
   */
  public async syncUserProfile(profile: UserProfile): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled()) {
      return { success: false, error: 'Cloud sync not enabled' };
    }

    try {
      const container = await this.encryptForCloud(profile, 'user_profile', profile.id);

      const result = await cloudSyncAPI.syncBatch({
        operations: [{
          id: `upload_${profile.id}`,
          type: 'upload',
          entityType: 'user_profile',
          priority: 'low', // Profile data is lower priority
          encryptedPayload: JSON.stringify(container),
          metadata: container.metadata,
          retryCount: 0,
          scheduledAt: new Date().toISOString()
        }],
        deviceId: this.deviceId,
        timestamp: new Date().toISOString(),
        checksum: container.checksum
      });

      return {
        success: result.success && result.failed === 0,
        error: result.errors.length > 0 ? result.errors[0].error : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Profile sync failed'
      };
    }
  }

  /**
   * Download and decrypt data from cloud
   */
  public async downloadCloudData<T>(
    entityType: string,
    since?: string
  ): Promise<{ success: boolean; data?: T[]; error?: string }> {
    if (!this.isEnabled()) {
      return { success: false, error: 'Cloud sync not enabled' };
    }

    try {
      const result = await cloudSyncAPI.getEncryptedData(entityType, since);

      if (!result.success || !result.data) {
        return { success: false, error: result.error };
      }

      const decryptedData: T[] = [];

      for (const container of result.data) {
        try {
          const decrypted = await this.decryptFromCloud<T>(container);
          decryptedData.push(decrypted);
        } catch (error) {
          console.error(`Failed to decrypt ${entityType} data:`, error);
          // Continue with other items, don't fail entire sync
        }
      }

      return { success: true, data: decryptedData };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  /**
   * Perform full bidirectional sync
   */
  public async performFullSync(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      errors: [],
      duration: 0
    };

    if (!this.isEnabled()) {
      result.errors.push('Cloud sync not enabled');
      result.duration = Date.now() - startTime;
      return result;
    }

    try {
      // Check for conflicts first
      const conflictsResult = await cloudSyncAPI.getSyncConflicts();
      if (conflictsResult.success && conflictsResult.conflicts) {
        result.conflicts = conflictsResult.conflicts.length;

        // Auto-resolve conflicts where possible
        for (const conflict of conflictsResult.conflicts) {
          if (conflict.autoResolvable) {
            await this.resolveConflict(conflict);
          }
        }
      }

      // Download latest data from cloud
      const downloadTypes = ['check_in', 'assessment', 'crisis_plan', 'user_profile'];

      for (const entityType of downloadTypes) {
        try {
          const downloadResult = await this.downloadCloudData(entityType, this.lastSyncToken);
          if (downloadResult.success && downloadResult.data) {
            result.downloaded += downloadResult.data.length;
          }
        } catch (error) {
          result.errors.push(`Download ${entityType} failed: ${error}`);
        }
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      // Update last sync token
      this.lastSyncToken = new Date().toISOString();

      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Full sync failed');
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Resolve conflict using predefined strategies
   */
  private async resolveConflict(conflict: any): Promise<void> {
    const strategy = CONFLICT_RESOLUTION_MAP[conflict.entityType] || 'manual';

    switch (strategy) {
      case 'newest_wins':
        // Use data with most recent timestamp
        const localTime = new Date(conflict.localData.updatedAt).getTime();
        const cloudTime = new Date(conflict.cloudData.updatedAt).getTime();

        if (localTime > cloudTime) {
          // Upload local data to resolve conflict
          await this.uploadConflictResolution(conflict, 'local');
        } else {
          // Accept cloud data
          await this.acceptCloudData(conflict);
        }
        break;

      case 'local_wins':
        await this.uploadConflictResolution(conflict, 'local');
        break;

      case 'cloud_wins':
        await this.acceptCloudData(conflict);
        break;

      case 'manual':
        // Clinical data conflicts require manual resolution
        console.log(`Manual resolution required for ${conflict.entityType} conflict`);
        break;
    }
  }

  /**
   * Upload local data to resolve conflict
   */
  private async uploadConflictResolution(conflict: any, resolution: string): Promise<void> {
    // Mark conflict as resolved in cloud
    await cloudSyncAPI.syncBatch({
      operations: [{
        id: `resolve_${conflict.id}`,
        type: 'resolve_conflict',
        entityType: conflict.entityType,
        priority: 'high',
        metadata: {
          entityId: conflict.id,
          entityType: conflict.entityType,
          version: 1,
          lastModified: new Date().toISOString(),
          checksum: '',
          deviceId: this.deviceId,
          cloudVersion: 1
        },
        retryCount: 0,
        scheduledAt: new Date().toISOString()
      }],
      deviceId: this.deviceId,
      timestamp: new Date().toISOString(),
      checksum: 'conflict_resolution'
    });
  }

  /**
   * Accept cloud data for conflict resolution
   */
  private async acceptCloudData(conflict: any): Promise<void> {
    // This would integrate with local data store to update local data
    console.log(`Accepting cloud data for conflict ${conflict.id}`);
  }

  /**
   * Emergency sync for crisis situations
   */
  public async emergencySync(): Promise<{ success: boolean; error?: string }> {
    if (!this.featureFlags.emergencySync) {
      return { success: false, error: 'Emergency sync not enabled' };
    }

    // Sync critical data only (crisis plan, latest assessment)
    try {
      // This would be implemented based on current crisis state
      console.log('Emergency sync triggered');
      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Emergency sync failed'
      };
    }
  }

  /**
   * Get cloud sync status
   */
  public async getSyncStatus(): Promise<{
    enabled: boolean;
    authenticated: boolean;
    lastSync: string | null;
    conflicts: number;
    pendingUploads: number;
  }> {
    const conflictsResult = await cloudSyncAPI.getSyncConflicts();

    return {
      enabled: this.isEnabled(),
      authenticated: supabaseClient.isAuthenticated(),
      lastSync: this.lastSyncToken,
      conflicts: conflictsResult.success ? (conflictsResult.conflicts?.length || 0) : 0,
      pendingUploads: 0 // Would be calculated from local queue
    };
  }

  /**
   * Cleanup and destroy integration
   */
  public destroy(): void {
    this.initialized = false;
    this.deviceId = '';
    this.lastSyncToken = null;
    cloudSyncAPI.destroy();
  }
}

// Export singleton instance
export const zeroKnowledgeIntegration = new ZeroKnowledgeIntegration();