/**
 * Encryption Integration Tests
 * End-to-end validation of the complete encryption system
 */

import { secureDataStore } from '../SecureDataStore';
import { dataStoreMigrator } from '../DataStoreMigrator';
import { encryptionService } from '../security/EncryptionService';
import { UserProfile, CheckIn, Assessment, CrisisPlan } from '../../../types';

// Mock dependencies
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(),
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  CryptoEncoding: { HEX: 'hex' }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Encryption Integration Tests', () => {
  // Test data
  const mockUser: UserProfile = {
    id: 'user-integration-test',
    createdAt: '2024-01-01T00:00:00Z',
    onboardingCompleted: true,
    values: ['mindfulness', 'growth'],
    notifications: {
      enabled: true,
      morning: '08:00',
      midday: '13:00', 
      evening: '20:00'
    },
    preferences: {
      haptics: true,
      theme: 'light'
    }
  };

  const mockCheckIn: CheckIn = {
    id: 'checkin-integration-test',
    type: 'morning',
    startedAt: '2024-01-01T08:00:00Z',
    completedAt: '2024-01-01T08:15:00Z',
    skipped: false,
    data: {
      emotions: ['calm', 'focused'],
      energyLevel: 7,
      anxietyLevel: 3,
      todayValue: 'mindfulness'
    }
  };

  const mockAssessment: Assessment = {
    id: 'assessment-integration-test',
    type: 'phq9',
    completedAt: '2024-01-01T10:00:00Z',
    answers: [1, 1, 0, 1, 2, 0, 0, 1, 0], // Total score: 6
    score: 6,
    severity: 'mild',
    context: 'standalone'
  };

  const mockCrisisPlan: CrisisPlan = {
    id: 'crisis-integration-test',
    updatedAt: '2024-01-01T12:00:00Z',
    warningSigns: ['Persistent sadness'],
    copingStrategies: ['Deep breathing'],
    contacts: {
      crisisLine: '988',
      trustedFriends: [{ name: 'Test Friend', phone: '555-0123' }]
    },
    safetyMeasures: ['Call trusted friend'],
    isActive: true
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock encryption setup
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
      const mockKeys = {
        '@fullmind_master_key_v1': 'mock_master_key_hex',
        '@fullmind_clinical_key_v1': 'mock_clinical_key_hex',
        '@fullmind_personal_key_v1': 'mock_personal_key_hex',
        '@fullmind_key_rotation_date': new Date().toISOString()
      };
      return Promise.resolve(mockKeys[key] || null);
    });

    (Crypto.getRandomBytesAsync as jest.Mock).mockImplementation((size: number) => {
      const bytes = new Uint8Array(size);
      for (let i = 0; i < size; i++) bytes[i] = i % 256;
      return Promise.resolve(bytes);
    });

    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('mock_hash_result');

    // Mock AsyncStorage with encrypted data format
    (AsyncStorage.getItem as jest.Mock).mockImplementation(() => null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
  });

  describe('Complete Data Flow', () => {
    test('should handle complete user data lifecycle with encryption', async () => {
      // 1. Save all types of data
      await secureDataStore.saveUser(mockUser);
      await secureDataStore.saveCheckIn(mockCheckIn);
      await secureDataStore.saveAssessment(mockAssessment);
      await secureDataStore.saveCrisisPlan(mockCrisisPlan);

      // Verify all data was encrypted and saved
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(4);
      
      // Check that the saved data contains encryption markers
      const saveCallArgs = (AsyncStorage.setItem as jest.Mock).mock.calls;
      for (const [key, data] of saveCallArgs) {
        const parsedData = JSON.parse(data);
        expect(parsedData.__ENCRYPTED_V1__).toBe(true);
        expect(parsedData.encryptedData).toBeDefined();
        expect(parsedData.iv).toBeDefined();
      }
    });

    test('should maintain clinical data accuracy through encryption', async () => {
      // Mock encrypted storage response
      const encryptedAssessmentData = {
        encryptedData: `encrypted_${JSON.stringify([mockAssessment])}`,
        iv: 'mock_iv',
        timestamp: new Date().toISOString(),
        __ENCRYPTED_V1__: true,
        sensitivity: 'clinical'
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(encryptedAssessmentData)
      );

      // Retrieve and verify assessment data
      const retrievedAssessments = await secureDataStore.getAssessments();
      
      expect(retrievedAssessments).toHaveLength(1);
      expect(retrievedAssessments[0].score).toBe(6);
      expect(retrievedAssessments[0].answers).toEqual([1, 1, 0, 1, 2, 0, 0, 1, 0]);
      expect(retrievedAssessments[0].severity).toBe('mild');
    });

    test('should prevent saving assessments with incorrect scores', async () => {
      const invalidAssessment = {
        ...mockAssessment,
        score: 99 // Wrong score for the given answers
      };

      await expect(
        secureDataStore.saveAssessment(invalidAssessment)
      ).rejects.toThrow('Assessment scoring error');
    });
  });

  describe('Security Features', () => {
    test('should provide comprehensive security status', async () => {
      const securityStatus = await secureDataStore.getSecurityStatus();
      
      expect(securityStatus).toHaveProperty('encrypted');
      expect(securityStatus).toHaveProperty('clinicalDataSecure');
      expect(securityStatus).toHaveProperty('complianceLevel');
      expect(securityStatus).toHaveProperty('recommendations');
      expect(Array.isArray(securityStatus.recommendations)).toBe(true);
    });

    test('should handle key rotation correctly', async () => {
      // Mock current data
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        const mockData = {
          encryptedData: 'encrypted_test_data',
          iv: 'test_iv',
          __ENCRYPTED_V1__: true,
          sensitivity: 'personal'
        };
        return Promise.resolve(JSON.stringify(mockData));
      });

      // Perform key rotation
      await secureDataStore.rotateEncryptionKeys();

      // Verify SecureStore operations for key rotation
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });

    test('should validate data integrity', async () => {
      const validation = await secureDataStore.validateData();
      
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('errors');
      expect(Array.isArray(validation.errors)).toBe(true);
    });
  });

  describe('Migration System', () => {
    test('should detect need for migration', async () => {
      // Mock unencrypted legacy data
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        switch (key) {
          case '@fullmind_user':
            return Promise.resolve(JSON.stringify(mockUser));
          case '@fullmind_assessments':
            return Promise.resolve(JSON.stringify([mockAssessment]));
          default:
            return Promise.resolve(null);
        }
      });

      const migrationStatus = await dataStoreMigrator.assessMigrationNeeds();
      
      expect(migrationStatus.isRequired).toBe(true);
      expect(migrationStatus.unencryptedKeys).toContain('USER');
      expect(migrationStatus.unencryptedKeys).toContain('ASSESSMENTS');
    });

    test('should prioritize clinical data migration', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock unencrypted clinical data
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@fullmind_assessments') {
          return Promise.resolve(JSON.stringify([mockAssessment]));
        }
        return Promise.resolve(null);
      });

      const result = await dataStoreMigrator.checkAndAutoMigrate();
      
      // Should attempt migration due to clinical data
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto-migrating sensitive mental health data')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Data Export and Privacy', () => {
    test('should export data with security metadata', async () => {
      // Mock encrypted data
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        const mockEncryptedData = {
          encryptedData: '',
          iv: 'mock_iv',
          __ENCRYPTED_V1__: true,
          sensitivity: 'personal'
        };

        switch (key) {
          case '@fullmind_user':
            mockEncryptedData.encryptedData = `encrypted_${JSON.stringify(mockUser)}`;
            break;
          case '@fullmind_checkins':
            mockEncryptedData.encryptedData = `encrypted_${JSON.stringify([mockCheckIn])}`;
            break;
          case '@fullmind_assessments':
            mockEncryptedData.encryptedData = `encrypted_${JSON.stringify([mockAssessment])}`;
            mockEncryptedData.sensitivity = 'clinical';
            break;
          case '@fullmind_crisis':
            mockEncryptedData.encryptedData = `encrypted_${JSON.stringify(mockCrisisPlan)}`;
            mockEncryptedData.sensitivity = 'clinical';
            break;
          default:
            return Promise.resolve(null);
        }

        return Promise.resolve(JSON.stringify(mockEncryptedData));
      });

      const exportResult = await secureDataStore.emergencyExport();
      
      expect(exportResult.success).toBe(true);
      expect(exportResult.exportData).toBeDefined();
      expect(exportResult.exportData?.disclaimer).toContain('Security Status');
      expect(exportResult.exportData?.version).toBe('1.1-encrypted');
    });

    test('should handle secure data deletion', async () => {
      await secureDataStore.clearAllData();
      
      // Verify AsyncStorage cleanup
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@fullmind_user');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@fullmind_assessments');
      
      // Verify secure key deletion
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle encryption errors gracefully', async () => {
      // Mock crypto failure
      (Crypto.getRandomBytesAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Crypto hardware unavailable')
      );

      // Should fail gracefully without crashing
      await expect(
        secureDataStore.saveUser(mockUser)
      ).rejects.toThrow();
    });

    test('should handle corrupted encrypted data', async () => {
      // Mock corrupted data
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid_json');

      const user = await secureDataStore.getUser();
      expect(user).toBeNull();
    });

    test('should handle partial session encryption', async () => {
      const partialCheckIn = {
        id: 'partial-test',
        type: 'morning' as const,
        data: { emotions: ['tired'] }
      };

      await secureDataStore.savePartialCheckIn(partialCheckIn);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/partial_sessions_current_checkin_morning/),
        expect.stringContaining('encryptedData')
      );
    });
  });

  describe('Compliance Validation', () => {
    test('should meet HIPAA technical safeguards', async () => {
      const storageInfo = await secureDataStore.getStorageInfo();
      
      // Access Control
      expect(storageInfo.encryptionStatus.initialized).toBe(true);
      
      // Integrity
      expect(storageInfo.encryptionStatus.keyVersion).toBeGreaterThan(0);
      
      // Audit Controls (verified through console.log calls)
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await secureDataStore.saveAssessment(mockAssessment);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CLINICAL AUDIT')
      );
      
      consoleSpy.mockRestore();
    });

    test('should support data subject rights (GDPR)', async () => {
      // Right to access (data export)
      const exportResult = await secureDataStore.exportData();
      expect(exportResult.user).toBeDefined();
      
      // Right to deletion
      await secureDataStore.clearAllData();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
      
      // Right to portability (structured export)
      expect(exportResult.version).toBeDefined();
      expect(exportResult.disclaimer).toBeDefined();
    });
  });
});