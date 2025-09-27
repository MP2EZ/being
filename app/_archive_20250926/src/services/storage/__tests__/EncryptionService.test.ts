/**
 * Encryption Service Tests
 * Validates HIPAA-compliant encryption functionality
 */

import { encryptionService, DataSensitivity, EncryptionService } from '../../security/EncryptionService';

// Mock SecureStore and Crypto for testing
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(),
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'sha256'
  },
  CryptoEncoding: {
    HEX: 'hex'
  }
}));

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

describe('EncryptionService', () => {
  let service: EncryptionService;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock SecureStore responses
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
      if (key === '@fullmind_master_key_v1') {
        return Promise.resolve('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
      }
      if (key === '@fullmind_clinical_key_v1' || key === '@fullmind_personal_key_v1') {
        return Promise.resolve('fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210');
      }
      if (key === '@fullmind_key_rotation_date') {
        return Promise.resolve(new Date().toISOString());
      }
      return Promise.resolve(null);
    });

    // Mock Crypto functions
    (Crypto.getRandomBytesAsync as jest.Mock).mockImplementation((size: number) => {
      const bytes = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        bytes[i] = i % 256;
      }
      return Promise.resolve(bytes);
    });

    (Crypto.digestStringAsync as jest.Mock).mockImplementation(() => {
      return Promise.resolve('mocked_hash_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    });

    service = EncryptionService.getInstance();
    await service.initialize();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const status = await service.getEncryptionStatus();
      expect(status.initialized).toBe(true);
      expect(status.keyVersion).toBe(1);
    });

    test('should create master key if none exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      
      await service.initialize();
      
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        '@fullmind_master_key_v1',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Data Encryption', () => {
    test('should encrypt clinical data with highest security', async () => {
      const testData = {
        type: 'phq9',
        answers: [1, 2, 0, 1, 2, 1, 0, 1, 3],
        score: 11
      };

      const encrypted = await service.encryptData(
        testData, 
        DataSensitivity.CLINICAL,
        { dataType: 'Assessment' }
      );

      expect(encrypted.encryptedData).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.timestamp).toBeDefined();
      expect(encrypted.encryptedData).not.toEqual(JSON.stringify(testData));
    });

    test('should encrypt personal data', async () => {
      const testData = {
        emotions: ['anxious', 'worried'],
        thoughtPatterns: ['rumination']
      };

      const encrypted = await service.encryptData(
        testData,
        DataSensitivity.PERSONAL
      );

      expect(encrypted.encryptedData).toBeDefined();
      expect(encrypted.iv).toBeDefined();
    });

    test('should not encrypt system data', async () => {
      const testData = {
        theme: 'dark',
        notifications: true
      };

      const encrypted = await service.encryptData(
        testData,
        DataSensitivity.SYSTEM
      );

      expect(encrypted.encryptedData).toEqual(JSON.stringify(testData));
      expect(encrypted.iv).toBe('');
    });
  });

  describe('Data Decryption', () => {
    test('should decrypt clinical data correctly', async () => {
      const originalData = {
        type: 'phq9',
        answers: [1, 2, 0, 1, 2, 1, 0, 1, 3],
        score: 11,
        severity: 'moderate'
      };

      // Encrypt then decrypt
      const encrypted = await service.encryptData(
        originalData,
        DataSensitivity.CLINICAL
      );

      const decrypted = await service.decryptData(
        encrypted,
        DataSensitivity.CLINICAL
      );

      expect(decrypted).toEqual(originalData);
    });

    test('should handle system data without decryption', async () => {
      const systemData = { setting: 'value' };
      
      const encrypted = await service.encryptData(
        systemData,
        DataSensitivity.SYSTEM
      );

      const decrypted = await service.decryptData(
        encrypted,
        DataSensitivity.SYSTEM
      );

      expect(decrypted).toEqual(systemData);
    });
  });

  describe('Data Integrity', () => {
    test('should validate data integrity correctly', async () => {
      const testData = {
        checkInId: 'test-123',
        emotions: ['calm', 'focused'],
        timestamp: new Date().toISOString()
      };

      const encrypted = await service.encryptData(
        testData,
        DataSensitivity.PERSONAL
      );

      const isValid = await service.validateDataIntegrity(
        testData,
        encrypted,
        DataSensitivity.PERSONAL
      );

      expect(isValid).toBe(true);
    });

    test('should detect corrupted data', async () => {
      const testData = { value: 'original' };
      
      const encrypted = await service.encryptData(
        testData,
        DataSensitivity.PERSONAL
      );

      // Corrupt the encrypted data
      encrypted.encryptedData = 'corrupted_data';

      const isValid = await service.validateDataIntegrity(
        testData,
        encrypted,
        DataSensitivity.PERSONAL
      );

      expect(isValid).toBe(false);
    });
  });

  describe('Key Management', () => {
    test('should rotate keys successfully', async () => {
      await service.rotateKeys();

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        '@fullmind_key_rotation_date',
        expect.any(String)
      );
    });

    test('should securely delete keys', async () => {
      await service.secureDeleteKeys();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('@fullmind_master_key_v1');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('@fullmind_clinical_key_v1');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('@fullmind_personal_key_v1');
    });
  });

  describe('Error Handling', () => {
    test('should handle encryption failures gracefully', async () => {
      (Crypto.getRandomBytesAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Crypto operation failed')
      );

      await expect(
        service.encryptData({ test: 'data' }, DataSensitivity.CLINICAL)
      ).rejects.toThrow('Failed to encrypt clinical data');
    });

    test('should handle missing keys gracefully', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.encryptData({ test: 'data' }, DataSensitivity.CLINICAL)
      ).rejects.toThrow('Encryption key unavailable');
    });
  });

  describe('Compliance Requirements', () => {
    test('should use different keys for different sensitivity levels', async () => {
      const clinicalData = { type: 'phq9', score: 15 };
      const personalData = { mood: 'anxious' };

      // Mock different keys for different data types
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('clinical_key_hex')  // Clinical key
        .mockResolvedValueOnce('personal_key_hex'); // Personal key

      await service.encryptData(clinicalData, DataSensitivity.CLINICAL);
      await service.encryptData(personalData, DataSensitivity.PERSONAL);

      // Verify different keys were requested
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('@fullmind_clinical_key_v1');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('@fullmind_personal_key_v1');
    });

    test('should generate audit logs for clinical data', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const clinicalData = { type: 'phq9', answers: [1, 1, 1, 1, 1, 1, 1, 1, 0] };

      await service.encryptData(clinicalData, DataSensitivity.CLINICAL);
      await service.decryptData(
        await service.encryptData(clinicalData, DataSensitivity.CLINICAL),
        DataSensitivity.CLINICAL
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AUDIT:')
      );

      consoleSpy.mockRestore();
    });
  });
});