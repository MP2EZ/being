/**
 * Mock implementation of EncryptionService for testing
 * Provides consistent, testable encryption operations for clinical data
 */

export const DataSensitivity = {
  CLINICAL: 'clinical',
  PERSONAL: 'personal',
  THERAPEUTIC: 'therapeutic',
  SYSTEM: 'system'
};

const mockEncryptionResult = {
  encryptedData: 'mock_encrypted_data_12345',
  iv: 'mock_iv_67890',
  authTag: 'mock_auth_tag_abcdef',
  timestamp: new Date().toISOString(),
  metadata: {
    algorithm: 'aes-256-gcm',
    keyVersion: 1,
    dataType: 'test_data',
    sensitivity: DataSensitivity.CLINICAL,
    createdAt: new Date().toISOString(),
    deviceInfo: { platform: 'ios', version: '15.0' }
  }
};

const mockEncryptionStatus = {
  initialized: true,
  keyVersion: 1,
  lastRotation: new Date().toISOString(),
  daysUntilRotation: 30,
  supportedAlgorithms: ['aes-256-gcm']
};

export class EncryptionService {
  static getInstance() {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  initialize = jest.fn().mockResolvedValue(undefined);

  encryptData = jest.fn().mockImplementation(async (data, sensitivity, metadata = {}) => {
    // Skip encryption for system data
    if (sensitivity === DataSensitivity.SYSTEM) {
      return {
        encryptedData: JSON.stringify(data),
        iv: '',
        timestamp: new Date().toISOString()
      };
    }

    return {
      ...mockEncryptionResult,
      metadata: {
        ...mockEncryptionResult.metadata,
        sensitivity,
        ...metadata
      }
    };
  });

  decryptData = jest.fn().mockImplementation(async (encryptionResult, sensitivity) => {
    // Handle unencrypted system data
    if (sensitivity === DataSensitivity.SYSTEM || !encryptionResult.iv) {
      return JSON.parse(encryptionResult.encryptedData);
    }

    // Return mock decrypted data for tests
    return {
      emergencyContacts: ['911', '988'],
      crisisPlan: 'emergency procedures'
    };
  });

  validateDataIntegrity = jest.fn().mockResolvedValue(true);

  getEncryptionStatus = jest.fn().mockResolvedValue(mockEncryptionStatus);

  rotateKeys = jest.fn().mockResolvedValue(undefined);

  secureDeleteKeys = jest.fn().mockResolvedValue(undefined);
}

// Export singleton instance
export const encryptionService = new EncryptionService();
export default encryptionService;