/**
 * Mock implementation of ProductionEncryptionService for testing
 * Simulates production-grade AES-256-GCM encryption for test environments
 */

export const DataSensitivity = {
  CLINICAL: 'clinical',
  PERSONAL: 'personal',
  THERAPEUTIC: 'therapeutic',
  SYSTEM: 'system'
};

const mockPerformanceMetrics = {
  encryptionTime: 45,
  decryptionTime: 25,
  keyDerivationTime: 150,
  operationsPerformed: 10,
  averageEncryptionTime: 45,
  averageDecryptionTime: 25,
  cacheHitRate: 0.8,
  recommendedOptimizations: []
};

const mockEncryptionResult = {
  encryptedData: 'production_mock_encrypted_12345abcdef',
  iv: 'production_mock_iv_67890',
  authTag: 'production_mock_tag_fedcba',
  timestamp: new Date().toISOString(),
  metadata: {
    algorithm: 'aes-256-gcm',
    keyVersion: 1,
    dataType: 'encrypted_data',
    sensitivity: DataSensitivity.CLINICAL,
    createdAt: new Date().toISOString(),
    deviceInfo: { platform: 'ios', version: '15.0' }
  }
};

export class ProductionEncryptionService {
  static getInstance() {
    return new ProductionEncryptionService();
  }

  async encryptData(data, sensitivity, metadata = {}) {
    // Simulate timing for performance tests
    await new Promise(resolve => setTimeout(resolve, 1));

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
        dataType: metadata.dataType || 'encrypted_data',
        ...metadata
      }
    };
  }

  async decryptData(encryptionResult, sensitivity) {
    // Simulate timing for performance tests
    await new Promise(resolve => setTimeout(resolve, 1));

    // Handle unencrypted system data
    if (sensitivity === DataSensitivity.SYSTEM || !encryptionResult.iv) {
      return JSON.parse(encryptionResult.encryptedData);
    }

    // Return the original data based on context
    if (encryptionResult.metadata?.dataType === 'phq9_assessment') {
      return {
        phq9Scores: [1, 2, 1, 0, 1, 2, 1, 1, 0],
        totalScore: 9,
        severity: 'mild',
        timestamp: new Date().toISOString(),
        assessmentId: 'phq9_001'
      };
    }

    // Default mock decrypted data
    return {
      test: 'data',
      clinical: false,
      operationId: 0,
      timestamp: new Date().toISOString()
    };
  }

  async validateDataIntegrity(originalData, encryptionResult, sensitivity) {
    // Simulate validation process
    await new Promise(resolve => setTimeout(resolve, 1));
    return true;
  }

  async validateConfiguration() {
    return {
      valid: true,
      issues: [],
      recommendations: []
    };
  }

  getPerformanceMetrics() {
    return mockPerformanceMetrics;
  }

  async clearSensitiveData() {
    return Promise.resolve();
  }
}

// Export singleton instance
export const productionEncryptionService = new ProductionEncryptionService();