/**
 * CloudBackupService Unit Tests
 *
 * TEST COVERAGE:
 * - Service initialization
 * - Backup creation and encryption
 * - Restore operations
 * - Store integration
 * - Configuration management
 * - Error handling
 * - Performance constraints
 */

import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto');
jest.mock('../../../flows/assessment/stores/assessmentStore');
jest.mock('../SupabaseService');
jest.mock('../../security/EncryptionService');

// Mock stores
const mockAssessmentStore = {
  getState: jest.fn(() => ({
    currentAssessment: 'PHQ9',
    responses: [1, 2, 1, 0, 2, 1, 1, 0, 0],
    lastCompleted: '2024-01-01T12:00:00Z',
  })),
  setState: jest.fn(),
  subscribe: jest.fn(),
};

jest.mock('../../../flows/assessment/stores/assessmentStore', () => ({
  assessmentStore: mockAssessmentStore,
}));

// Mock SupabaseService
const mockSupabaseService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  saveBackup: jest.fn().mockResolvedValue(true),
  getBackup: jest.fn().mockResolvedValue(null),
  trackEvent: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../SupabaseService', () => ({
  __esModule: true,
  default: mockSupabaseService,
}));

// Mock EncryptionService
const mockEncryptionService = {
  encryptData: jest.fn().mockResolvedValue('encrypted_data'),
  decryptData: jest.fn().mockResolvedValue('decrypted_data'),
};

jest.mock('../../security/EncryptionService', () => ({
  __esModule: true,
  default: mockEncryptionService,
}));

// Mock crypto
const mockCrypto = {
  digestStringAsync: jest.fn().mockResolvedValue('test_checksum'),
};

jest.mock('expo-crypto', () => mockCrypto);

// Import service after mocks
import CloudBackupService from '../CloudBackupService';

describe('CloudBackupService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new (CloudBackupService as any).constructor();

    // Setup AsyncStorage mocks
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await service.initialize();

      expect(service.isInitialized).toBe(true);
      expect(mockSupabaseService.initialize).toHaveBeenCalled();
    });

    it('should load configuration from storage', async () => {
      const savedConfig = {
        autoBackupEnabled: false,
        compressionEnabled: false,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(savedConfig)
      );

      await service.initialize();

      expect(service.config.autoBackupEnabled).toBe(false);
      expect(service.config.compressionEnabled).toBe(false);
    });

    it('should setup store listeners', async () => {
      await service.initialize();

      expect(mockAssessmentStore.subscribe).toHaveBeenCalled();
    });
  });

  describe('Backup Creation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should create backup successfully', async () => {
      const result = await service.createBackup();

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(mockEncryptionService.encryptData).toHaveBeenCalled();
      expect(mockSupabaseService.saveBackup).toHaveBeenCalled();
    });

    it('should track analytics on successful backup', async () => {
      await service.createBackup();

      expect(mockSupabaseService.trackEvent).toHaveBeenCalledWith(
        'backup_completed',
        expect.objectContaining({
          size_mb: expect.any(Number),
          duration_ms: expect.any(Number),
        })
      );
    });

    it('should handle backup failure', async () => {
      mockSupabaseService.saveBackup.mockResolvedValueOnce(false);

      const result = await service.createBackup();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should skip backup if no changes detected', async () => {
      // First backup
      await service.createBackup();

      // Second backup (no changes)
      const result = await service.createBackup();

      expect(result.success).toBe(true);
      // Should not call encryption/upload again
      expect(mockEncryptionService.encryptData).toHaveBeenCalledTimes(1);
    });

    it('should respect size limits', async () => {
      // Mock large data
      const largeData = 'x'.repeat(20 * 1024 * 1024); // 20MB
      mockAssessmentStore.getState.mockReturnValueOnce({ largeData });

      const result = await service.createBackup();

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds limit');
    });
  });

  describe('Store Data Collection', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should collect data from all stores', async () => {
      const backupData = await service.collectStoreData();

      expect(backupData).toEqual(
        expect.objectContaining({
          version: 1,
          timestamp: expect.any(Number),
          stores: expect.objectContaining({
            assessment: expect.any(Object),
          }),
          metadata: expect.objectContaining({
            platform: 'react-native',
          }),
        })
      );
    });

    it('should include assessment store data', async () => {
      const backupData = await service.collectStoreData();

      expect(backupData.stores.assessment).toEqual({
        currentAssessment: 'PHQ9',
        responses: [1, 2, 1, 0, 2, 1, 1, 0, 0],
        lastCompleted: '2024-01-01T12:00:00Z',
      });
    });
  });

  describe('Data Restoration', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should restore from backup successfully', async () => {
      const mockBackup = {
        encrypted_data: 'encrypted_backup',
        checksum: 'valid_checksum',
        created_at: '2024-01-01T12:00:00Z',
      };

      const mockRestoredData = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        stores: {
          assessment: {
            currentAssessment: 'GAD7',
            responses: [2, 2, 1, 3, 2, 1, 0],
          },
        },
      });

      mockSupabaseService.getBackup.mockResolvedValueOnce(mockBackup);
      mockEncryptionService.decryptData.mockResolvedValueOnce(mockRestoredData);
      mockCrypto.digestStringAsync.mockResolvedValueOnce('valid_checksum');

      const result = await service.restoreFromBackup();

      expect(result.success).toBe(true);
      expect(result.restoredStores).toContain('assessment');
      expect(mockAssessmentStore.setState).toHaveBeenCalled();
    });

    it('should handle no backup available', async () => {
      mockSupabaseService.getBackup.mockResolvedValueOnce(null);

      const result = await service.restoreFromBackup();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No backup found');
    });

    it('should validate backup integrity', async () => {
      const mockBackup = {
        encrypted_data: 'encrypted_backup',
        checksum: 'expected_checksum',
      };

      mockSupabaseService.getBackup.mockResolvedValueOnce(mockBackup);
      mockCrypto.digestStringAsync.mockResolvedValueOnce('different_checksum');

      const result = await service.restoreFromBackup();

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('integrity check failed');
    });

    it('should handle partial restore failures', async () => {
      const mockBackup = {
        encrypted_data: 'encrypted_backup',
        checksum: 'valid_checksum',
      };

      const mockRestoredData = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        stores: {
          assessment: { data: 'valid' },
          user: { data: 'invalid' },
        },
      });

      mockSupabaseService.getBackup.mockResolvedValueOnce(mockBackup);
      mockEncryptionService.decryptData.mockResolvedValueOnce(mockRestoredData);
      mockCrypto.digestStringAsync.mockResolvedValueOnce('valid_checksum');

      // Mock assessment store success, user store failure
      mockAssessmentStore.setState.mockImplementationOnce(() => {
        // Success
      });

      const result = await service.restoreFromBackup();

      expect(result.success).toBe(true); // Partial success
      expect(result.restoredStores).toContain('assessment');
      expect(result.restoredStores).not.toContain('user');
    });
  });

  describe('Backup Status', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should check for cloud backup existence', async () => {
      mockSupabaseService.getBackup.mockResolvedValueOnce({
        id: 'backup_123',
        created_at: '2024-01-01T12:00:00Z',
      });

      const hasBackup = await service.hasCloudBackup();

      expect(hasBackup).toBe(true);
    });

    it('should return comprehensive backup status', async () => {
      const mockBackup = {
        created_at: '2024-01-01T12:00:00Z',
      };

      const mockLastBackup = {
        timestamp: Date.now() - 3600000, // 1 hour ago
        hash: 'old_hash',
      };

      mockSupabaseService.getBackup.mockResolvedValueOnce(mockBackup);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockLastBackup)
      );

      // Mock current data hash being different
      service.calculateCurrentDataHash = jest.fn().mockResolvedValue('new_hash');

      const status = await service.getBackupStatus();

      expect(status).toEqual(
        expect.objectContaining({
          hasLocalData: expect.any(Boolean),
          hasCloudBackup: true,
          lastBackupTime: mockLastBackup.timestamp,
          cloudBackupTime: new Date(mockBackup.created_at).getTime(),
          needsBackup: true, // Because hash changed
        })
      );
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should update configuration', async () => {
      const newConfig = {
        autoBackupEnabled: false,
        compressionEnabled: true,
      };

      await service.updateConfig(newConfig);

      expect(service.config.autoBackupEnabled).toBe(false);
      expect(service.config.compressionEnabled).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@being/cloud_backup/config',
        JSON.stringify(service.config)
      );
    });

    it('should get current configuration', () => {
      const config = service.getConfig();

      expect(config).toEqual(
        expect.objectContaining({
          autoBackupEnabled: expect.any(Boolean),
          autoBackupIntervalMs: expect.any(Number),
          compressionEnabled: expect.any(Boolean),
        })
      );
    });
  });

  describe('Store Integration', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should trigger backup on assessment completion', async () => {
      const createBackupSpy = jest.spyOn(service, 'createBackup');

      // Get the subscription callback
      const subscriptionCallback = mockAssessmentStore.subscribe.mock.calls[0][0];

      // Simulate assessment completion
      const newState = { lastCompleted: '2024-01-01T13:00:00Z' };
      const prevState = { lastCompleted: null };

      subscriptionCallback(newState, prevState);

      // Wait for debounced backup
      await new Promise(resolve => setTimeout(resolve, 5100));

      expect(createBackupSpy).toHaveBeenCalled();
    });

    it('should trigger backup on crisis detection', async () => {
      const createBackupSpy = jest.spyOn(service, 'createBackup');

      const subscriptionCallback = mockAssessmentStore.subscribe.mock.calls[0][0];

      const newState = { crisisDetected: true };
      const prevState = { crisisDetected: false };

      subscriptionCallback(newState, prevState);

      await new Promise(resolve => setTimeout(resolve, 5100));

      expect(createBackupSpy).toHaveBeenCalled();
    });
  });

  describe('Data Compression', () => {
    beforeEach(async () => {
      await service.initialize();
      service.config.compressionEnabled = true;
    });

    it('should compress data when enabled', async () => {
      const compressSpy = jest.spyOn(service, 'compressData');

      await service.createBackup();

      expect(compressSpy).toHaveBeenCalled();
    });

    it('should decompress data during restore', async () => {
      const mockBackup = {
        encrypted_data: 'compressed_encrypted_backup',
        checksum: 'valid_checksum',
      };

      const decompressSpy = jest.spyOn(service, 'decompressData');

      mockSupabaseService.getBackup.mockResolvedValueOnce(mockBackup);
      mockEncryptionService.decryptData.mockResolvedValueOnce('compressed_data');
      mockCrypto.digestStringAsync.mockResolvedValueOnce('valid_checksum');

      service.decompressData.mockResolvedValueOnce(JSON.stringify({
        version: 1,
        stores: { assessment: {} },
      }));

      await service.restoreFromBackup();

      expect(decompressSpy).toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle encryption failures', async () => {
      mockEncryptionService.encryptData.mockRejectedValueOnce(
        new Error('Encryption failed')
      );

      const result = await service.createBackup();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Encryption failed');
    });

    it('should handle network failures gracefully', async () => {
      mockSupabaseService.saveBackup.mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await service.createBackup();

      expect(result.success).toBe(false);
      expect(mockSupabaseService.trackEvent).toHaveBeenCalledWith(
        'backup_failed',
        expect.objectContaining({
          error_type: 'Error',
        })
      );
    });

    it('should handle invalid backup data during restore', async () => {
      const mockBackup = {
        encrypted_data: 'encrypted_backup',
        checksum: 'valid_checksum',
      };

      mockSupabaseService.getBackup.mockResolvedValueOnce(mockBackup);
      mockEncryptionService.decryptData.mockResolvedValueOnce('invalid_json');
      mockCrypto.digestStringAsync.mockResolvedValueOnce('valid_checksum');

      const result = await service.restoreFromBackup();

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Invalid backup structure');
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should cleanup service properly', async () => {
      const createBackupSpy = jest.spyOn(service, 'createBackup');

      await service.cleanup();

      expect(createBackupSpy).toHaveBeenCalled(); // Final backup
      expect(service.isInitialized).toBe(false);
    });
  });
});

describe('Data Validation', () => {
  let service: any;

  beforeEach(() => {
    service = new (CloudBackupService as any).constructor();
  });

  it('should validate backup structure correctly', () => {
    const validBackup = {
      version: 1,
      timestamp: Date.now(),
      stores: { assessment: {} },
    };

    const invalidBackup = {
      version: 'invalid',
      stores: 'not_object',
    };

    expect(service.validateBackupStructure(validBackup)).toBe(true);
    expect(service.validateBackupStructure(invalidBackup)).toBe(false);
  });

  it('should calculate data hash consistently', async () => {
    const data = {
      version: 1,
      timestamp: 123456,
      stores: { test: 'data' },
    };

    const hash1 = await service.calculateDataHash(data);
    const hash2 = await service.calculateDataHash(data);

    expect(hash1).toBe(hash2);
  });
});