/**
 * StorageKeyMigrator Test Suite
 *
 * Comprehensive tests for storage key migration from Fullmind to Being.
 * Focuses on data integrity, safety, and rollback capabilities.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { storageKeyMigrator } from '../StorageKeyMigrator';

// Mock AsyncStorage and SecureStore
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('StorageKeyMigrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockAsyncStorage.getAllKeys.mockResolvedValue([]);
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();

    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue();
    mockSecureStore.deleteItemAsync.mockResolvedValue();
  });

  describe('assessMigrationNeeds', () => {
    it('should detect no migration needed when no old keys exist', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValue(['@being_user', '@being_assessments']);

      const assessment = await storageKeyMigrator.assessMigrationNeeds();

      expect(assessment.isRequired).toBe(false);
      expect(assessment.existingOldKeys).toHaveLength(0);
      expect(assessment.criticalDataAtRisk).toHaveLength(0);
    });

    it('should detect migration needed for old storage keys', async () => {
      const oldKeys = [
        '@fullmind_user',
        '@fullmind_assessments',
        '@fullmind_crisis',
        'fullmind_widget_data'
      ];

      mockAsyncStorage.getAllKeys.mockResolvedValue([
        ...oldKeys,
        '@being_checkins' // Some new keys already exist
      ]);

      // Mock data for size estimation
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (oldKeys.includes(key)) {
          return JSON.stringify({ id: 'test', data: 'sample' });
        }
        return null;
      });

      const assessment = await storageKeyMigrator.assessMigrationNeeds();

      expect(assessment.isRequired).toBe(true);
      expect(assessment.existingOldKeys).toEqual(expect.arrayContaining(oldKeys));
      expect(assessment.criticalDataAtRisk).toEqual(
        expect.arrayContaining(['@fullmind_user', '@fullmind_assessments', '@fullmind_crisis'])
      );
      expect(assessment.estimatedDataSize).toBeGreaterThan(0);
    });

    it('should identify critical clinical data requiring urgent migration', async () => {
      const clinicalKeys = [
        '@fullmind_assessments',
        '@fullmind_resumable_session_assessment_phq9',
        '@fullmind_clinical_key_v1'
      ];

      mockAsyncStorage.getAllKeys.mockResolvedValue(clinicalKeys);
      mockSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key === '@fullmind_clinical_key_v1') {
          return 'mock_clinical_key';
        }
        return null;
      });

      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (clinicalKeys.includes(key)) {
          return JSON.stringify([
            { id: '1', type: 'phq9', score: 15, answers: [1, 2, 2, 1, 3, 2, 1, 2, 1] }
          ]);
        }
        return null;
      });

      const assessment = await storageKeyMigrator.assessMigrationNeeds();

      expect(assessment.criticalDataAtRisk).toEqual(expect.arrayContaining(clinicalKeys));
      expect(assessment.safetyRecommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('CRITICAL: PHQ-9/GAD-7 assessment data')
        ])
      );
    });

    it('should identify crisis data requiring urgent migration', async () => {
      const crisisKeys = [
        '@fullmind_crisis',
        '@fullmind_emergency_contacts',
        '@fullmind_crisis_config_v1'
      ];

      mockAsyncStorage.getAllKeys.mockResolvedValue(crisisKeys);
      mockSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key === '@fullmind_emergency_contacts') {
          return JSON.stringify({ contacts: ['911', 'family'] });
        }
        return null;
      });

      const assessment = await storageKeyMigrator.assessMigrationNeeds();

      expect(assessment.criticalDataAtRisk).toEqual(expect.arrayContaining(crisisKeys));
      expect(assessment.safetyRecommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Crisis and safety data')
        ])
      );
    });
  });

  describe('performMigration', () => {
    it('should successfully migrate single AsyncStorage key', async () => {
      const testData = JSON.stringify({ id: 'user1', name: 'Test User' });

      mockAsyncStorage.getAllKeys.mockResolvedValue(['@fullmind_user']);
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === '@fullmind_user') return testData;
        if (key === '@being_user') return testData; // Verification
        return null;
      });

      const progressEvents: any[] = [];
      const result = await storageKeyMigrator.performMigration((progress) => {
        progressEvents.push(progress);
      });

      expect(result.success).toBe(true);
      expect(result.migratedKeys).toContain('@fullmind_user');
      expect(result.errors).toHaveLength(0);

      // Verify data was written to new location
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@being_user', testData);

      // Verify old key was removed
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@fullmind_user');

      // Verify progress tracking
      expect(progressEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ stage: 'scanning' }),
          expect.objectContaining({ stage: 'backing_up' }),
          expect.objectContaining({ stage: 'migrating' }),
          expect.objectContaining({ stage: 'validating' }),
          expect.objectContaining({ stage: 'complete' })
        ])
      );
    });

    it('should successfully migrate SecureStore keys', async () => {
      const testKey = 'secure_test_key_data';

      mockSecureStore.getItemAsync.mockImplementation(async (key) => {
        if (key === '@fullmind_master_key_v1') return testKey;
        if (key === '@being_master_key_v1') return testKey; // Verification
        return null;
      });

      // Mock assessment to include SecureStore key
      const assessment = {
        isRequired: true,
        existingOldKeys: ['@fullmind_master_key_v1'],
        criticalDataAtRisk: ['@fullmind_master_key_v1'],
        estimatedDataSize: testKey.length,
        safetyRecommendations: []
      };

      jest.spyOn(storageKeyMigrator, 'assessMigrationNeeds').mockResolvedValue(assessment);

      const result = await storageKeyMigrator.performMigration();

      expect(result.success).toBe(true);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('@being_master_key_v1', testKey);
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('@fullmind_master_key_v1');
    });

    it('should validate critical clinical data during migration', async () => {
      const invalidAssessmentData = JSON.stringify({ invalid: 'data' });

      mockAsyncStorage.getAllKeys.mockResolvedValue(['@fullmind_assessments']);
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === '@fullmind_assessments') return invalidAssessmentData;
        return null;
      });

      const result = await storageKeyMigrator.performMigration();

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Data validation failed for critical key')
        ])
      );
    });

    it('should preserve valid clinical assessment data structure', async () => {
      const validAssessmentData = JSON.stringify([
        {
          id: 'phq9_1',
          type: 'phq9',
          score: 15,
          answers: [1, 2, 2, 1, 3, 2, 1, 2, 1],
          completedAt: '2024-01-01T10:00:00Z'
        },
        {
          id: 'gad7_1',
          type: 'gad7',
          score: 12,
          answers: [2, 1, 3, 2, 1, 2, 1],
          completedAt: '2024-01-01T10:30:00Z'
        }
      ]);

      mockAsyncStorage.getAllKeys.mockResolvedValue(['@fullmind_assessments']);
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === '@fullmind_assessments') return validAssessmentData;
        if (key === '@being_assessments') return validAssessmentData; // Verification
        return null;
      });

      const result = await storageKeyMigrator.performMigration();

      expect(result.success).toBe(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@being_assessments', validAssessmentData);
    });

    it('should handle partial migration failure gracefully', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValue([
        '@fullmind_user',
        '@fullmind_assessments'
      ]);

      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === '@fullmind_user') return JSON.stringify({ id: 'user1' });
        if (key === '@fullmind_assessments') return JSON.stringify([]);
        return null;
      });

      // Simulate failure on second key
      mockAsyncStorage.setItem.mockImplementation(async (key, value) => {
        if (key === '@being_assessments') {
          throw new Error('Storage write failed');
        }
      });

      const result = await storageKeyMigrator.performMigration();

      expect(result.success).toBe(false);
      expect(result.migratedKeys).toContain('@fullmind_user');
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Failed to migrate @fullmind_assessments')
        ])
      );
    });

    it('should create comprehensive backup before migration', async () => {
      const testData = JSON.stringify({ id: 'test' });

      mockAsyncStorage.getAllKeys.mockResolvedValue(['@fullmind_user']);
      mockAsyncStorage.getItem.mockResolvedValue(testData);

      const result = await storageKeyMigrator.performMigration();

      expect(result.backupId).toBeDefined();
      expect(result.backupId).toMatch(/being_storage_migration_backup_\d+/);

      // Verify backup was stored
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        result.backupId,
        expect.stringContaining('fullmind_to_being_storage_keys')
      );
    });
  });

  describe('rollbackMigration', () => {
    it('should successfully restore data from backup', async () => {
      const backupId = 'being_storage_migration_backup_1234567890';
      const originalData = JSON.stringify({ id: 'original_user' });

      const backupData = JSON.stringify({
        backupId,
        timestamp: new Date().toISOString(),
        version: '1.0',
        migration: 'fullmind_to_being_storage_keys',
        keyCount: 1,
        backup: {
          '@fullmind_user': {
            data: originalData,
            type: 'async_storage',
            category: 'user',
            critical: true,
            targetKey: '@being_user'
          }
        }
      });

      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === backupId) return backupData;
        return null;
      });

      const result = await storageKeyMigrator.rollbackMigration(backupId);

      expect(result.success).toBe(true);
      expect(result.restoredKeys).toContain('@fullmind_user');
      expect(result.errors).toHaveLength(0);

      // Verify original data was restored
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@fullmind_user', originalData);

      // Verify new key was removed
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@being_user');
    });

    it('should handle missing backup gracefully', async () => {
      const backupId = 'nonexistent_backup';

      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await storageKeyMigrator.rollbackMigration(backupId);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual([`Backup not found: ${backupId}`]);
    });

    it('should restore both AsyncStorage and SecureStore data', async () => {
      const backupId = 'being_storage_migration_backup_1234567890';
      const asyncData = JSON.stringify({ id: 'user' });
      const secureData = 'secure_key_data';

      const backupData = JSON.stringify({
        backupId,
        backup: {
          '@fullmind_user': {
            data: asyncData,
            type: 'async_storage',
            critical: true
          },
          '@fullmind_master_key_v1': {
            data: secureData,
            type: 'secure_store',
            critical: true
          }
        }
      });

      mockAsyncStorage.getItem.mockResolvedValue(backupData);

      const result = await storageKeyMigrator.rollbackMigration(backupId);

      expect(result.success).toBe(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@fullmind_user', asyncData);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('@fullmind_master_key_v1', secureData);
    });
  });

  describe('getAvailableBackups', () => {
    it('should return sorted backup IDs', async () => {
      const allKeys = [
        'being_storage_migration_backup_1000',
        '@being_user',
        'being_storage_migration_backup_3000',
        'being_storage_migration_backup_2000',
        'other_key'
      ];

      mockAsyncStorage.getAllKeys.mockResolvedValue(allKeys);

      const backups = await storageKeyMigrator.getAvailableBackups();

      expect(backups).toEqual([
        'being_storage_migration_backup_3000', // Most recent first
        'being_storage_migration_backup_2000',
        'being_storage_migration_backup_1000'
      ]);
    });

    it('should return empty array when no backups exist', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValue(['@being_user', '@being_assessments']);

      const backups = await storageKeyMigrator.getAvailableBackups();

      expect(backups).toEqual([]);
    });
  });

  describe('Data Integrity Validation', () => {
    it('should detect data corruption during migration', async () => {
      const originalData = JSON.stringify({ id: 'test', critical: 'data' });
      const corruptedData = JSON.stringify({ corrupted: 'data' });

      mockAsyncStorage.getAllKeys.mockResolvedValue(['@fullmind_user']);
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === '@fullmind_user') return originalData;
        if (key === '@being_user') return corruptedData; // Simulated corruption
        return null;
      });

      const result = await storageKeyMigrator.performMigration();

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Data verification failed after migration')
        ])
      );
    });

    it('should validate critical data checksums', async () => {
      const criticalData = JSON.stringify([
        { id: 'phq9_1', type: 'phq9', score: 15, answers: [1, 2, 2, 1, 3, 2, 1, 2, 1] }
      ]);

      mockAsyncStorage.getAllKeys.mockResolvedValue(['@fullmind_assessments']);
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === '@fullmind_assessments' || key === '@being_assessments') {
          return criticalData;
        }
        return null;
      });

      const result = await storageKeyMigrator.performMigration();

      expect(result.success).toBe(true);
      expect(result.dataIntegrityChecks.checksumMatches).toBe(true);
    });
  });

  describe('Crisis Data Protection', () => {
    it('should handle crisis data with highest priority', async () => {
      const crisisData = JSON.stringify({
        isActive: false,
        contacts: {
          emergency: '911',
          trustedFriends: ['friend1', 'friend2'],
          therapist: 'Dr. Smith'
        },
        safetyPlan: ['go to safe place', 'call friend', 'use breathing technique']
      });

      mockAsyncStorage.getAllKeys.mockResolvedValue([
        '@fullmind_crisis',
        '@fullmind_user',
        '@fullmind_cache_stats'
      ]);

      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === '@fullmind_crisis') return crisisData;
        if (key === '@being_crisis') return crisisData;
        return JSON.stringify({ test: 'data' });
      });

      const progressEvents: any[] = [];
      const result = await storageKeyMigrator.performMigration((progress) => {
        if (progress.currentKey) {
          progressEvents.push(progress.currentKey);
        }
      });

      expect(result.success).toBe(true);

      // Crisis data should be migrated first (highest priority)
      expect(progressEvents[0]).toBe('@fullmind_crisis');
    });

    it('should validate crisis data structure during migration', async () => {
      const invalidCrisisData = JSON.stringify({ invalid: 'structure' });

      mockAsyncStorage.getAllKeys.mockResolvedValue(['@fullmind_crisis']);
      mockAsyncStorage.getItem.mockResolvedValue(invalidCrisisData);

      const result = await storageKeyMigrator.performMigration();

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Data validation failed for critical key')
        ])
      );
    });
  });
});