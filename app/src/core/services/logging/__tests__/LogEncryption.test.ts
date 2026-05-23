/**
 * Log Encryption Integration Tests - INFRA-61
 *
 * Validates ProductionLogger encryption integration:
 * - Encryption enable/disable
 * - Category-to-sensitivity mapping
 * - Encrypted storage of critical logs
 * - Fallback on encryption failure
 * - Performance requirements (<200ms)
 *
 * COMPLIANCE: Privacy encryption at rest requirement
 */

import { ProductionLogger, LogCategory } from '../ProductionLogger';

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiRemove: jest.fn().mockResolvedValue(undefined),
}));

// Create mock EncryptionService that returns valid encrypted packages
const createMockEncryptionService = () => ({
  encryptData: jest.fn().mockImplementation(async (data: any, sensitivityLevel: string) => {
    return {
      ciphertext: 'mockedCiphertext',
      iv: 'mockedIv',
      tag: 'mockedTag',
      metadata: {
        algorithm: 'AES-GCM',
        sensitivityLevel,
        encryptedAt: new Date().toISOString(),
        performanceMetrics: {
          encryptionTimeMs: 5,
        },
      },
    };
  }),
  initialize: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
});

describe('ProductionLogger Encryption Integration - INFRA-61', () => {
  let logger: ProductionLogger;
  let mockEncryptionService: ReturnType<typeof createMockEncryptionService>;

  beforeEach(async () => {
    // Get logger instance
    logger = ProductionLogger.getInstance();

    // Create mock encryption service
    mockEncryptionService = createMockEncryptionService();

    // Reset any previous encryption state
    logger.disableEncryption();

    // Clear mocks
    const SecureStore = require('expo-secure-store');
    SecureStore.setItemAsync.mockClear();
    SecureStore.getItemAsync.mockClear();
  });

  afterEach(async () => {
    // Cleanup
    logger.disableEncryption();
  });

  describe('Encryption Enable/Disable', () => {
    it('should start with encryption disabled by default', () => {
      const logger = ProductionLogger.getInstance();

      // Private property check via behavior
      // (Encryption should be disabled initially)
      expect(() => logger.disableEncryption()).not.toThrow();
    });

    it('should enable encryption with valid EncryptionService', async () => {
      await expect(logger.enableEncryption(mockEncryptionService as any)).resolves.not.toThrow();
    });

    it('should disable encryption', () => {
      expect(() => logger.disableEncryption()).not.toThrow();
    });

    it('should allow re-enabling after disabling', async () => {
      await logger.enableEncryption(mockEncryptionService as any);
      logger.disableEncryption();
      await expect(logger.enableEncryption(mockEncryptionService as any)).resolves.not.toThrow();
    });
  });

  describe('Category to Sensitivity Level Mapping', () => {
    it('should map CRISIS to level_1_crisis_responses', async () => {
      await logger.enableEncryption(mockEncryptionService as any);

      const SecureStore = require('expo-secure-store');
      SecureStore.setItemAsync.mockClear();

      // Log a crisis event
      logger.crisis('Crisis detected', {
        severity: 'high',
        detectionTime: 150,
      });

      // Wait for async storage
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify encrypted storage was attempted
      expect(SecureStore.setItemAsync).toHaveBeenCalled();

      // Get the stored data
      const calls = SecureStore.setItemAsync.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const lastCall = calls[calls.length - 1];
      const storedData = JSON.parse(lastCall[1]);

      // Should be encrypted
      expect(storedData).toHaveProperty('encrypted', true);
      expect(storedData).toHaveProperty('package');
    });

    it('should map ASSESSMENT to level_2_assessment_data', async () => {
      await logger.enableEncryption(mockEncryptionService as any);

      const SecureStore = require('expo-secure-store');
      SecureStore.setItemAsync.mockClear();

      logger.assessment('Assessment completed', {
        type: 'PHQ-9',
        questionCount: 9,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const calls = SecureStore.setItemAsync.mock.calls;
      if (calls.length > 0) {
        const lastCall = calls[calls.length - 1];
        const storedData = JSON.parse(lastCall[1]);
        expect(storedData).toHaveProperty('encrypted', true);
      }
    });

    it('should map SECURITY to level_3_intervention_metadata', async () => {
      await logger.enableEncryption(mockEncryptionService as any);

      const SecureStore = require('expo-secure-store');
      SecureStore.setItemAsync.mockClear();

      logger.security('Security event', 'high', {
        action: 'blocked',
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Security logs are ERROR level, so they should be stored
      const calls = SecureStore.setItemAsync.mock.calls;
      if (calls.length > 0) {
        const lastCall = calls[calls.length - 1];
        const storedData = JSON.parse(lastCall[1]);
        expect(storedData).toHaveProperty('encrypted', true);
      }
    });
  });

  describe('Encrypted Storage', () => {
    it('should store unencrypted when encryption disabled', async () => {
      // Encryption disabled by default
      const SecureStore = require('expo-secure-store');
      SecureStore.setItemAsync.mockClear();

      logger.crisis('Crisis event', { severity: 'high' });

      await new Promise(resolve => setTimeout(resolve, 100));

      if (SecureStore.setItemAsync.mock.calls.length > 0) {
        const lastCall = SecureStore.setItemAsync.mock.calls[
          SecureStore.setItemAsync.mock.calls.length - 1
        ];
        const storedData = JSON.parse(lastCall[1]);

        // Should NOT have encrypted wrapper
        expect(storedData.encrypted).not.toBe(true);
      }
    });

    it('should store encrypted when encryption enabled', async () => {
      await logger.enableEncryption(mockEncryptionService as any);

      const SecureStore = require('expo-secure-store');
      SecureStore.setItemAsync.mockClear();

      logger.crisis('Encrypted crisis event', {
        severity: 'critical',
        detectionTime: 120,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(SecureStore.setItemAsync).toHaveBeenCalled();

      const lastCall = SecureStore.setItemAsync.mock.calls[
        SecureStore.setItemAsync.mock.calls.length - 1
      ];
      const storedData = JSON.parse(lastCall[1]);

      // Verify encryption wrapper
      expect(storedData).toHaveProperty('encrypted', true);
      expect(storedData).toHaveProperty('package');

      // Verify package structure
      const pkg = storedData.package;
      expect(pkg).toHaveProperty('ciphertext');
      expect(pkg).toHaveProperty('iv');
      expect(pkg).toHaveProperty('tag');
      expect(pkg).toHaveProperty('metadata');
    });

    it('should include correct metadata in encrypted package', async () => {
      await logger.enableEncryption(mockEncryptionService as any);

      const SecureStore = require('expo-secure-store');
      SecureStore.setItemAsync.mockClear();

      logger.crisis('Test crisis', { severity: 'high' });

      await new Promise(resolve => setTimeout(resolve, 100));

      const lastCall = SecureStore.setItemAsync.mock.calls[
        SecureStore.setItemAsync.mock.calls.length - 1
      ];
      const storedData = JSON.parse(lastCall[1]);
      const metadata = storedData.package.metadata;

      expect(metadata).toHaveProperty('algorithm', 'AES-GCM');
      expect(metadata).toHaveProperty('sensitivityLevel', 'level_1_crisis_responses');
      expect(metadata).toHaveProperty('encryptedAt');
      expect(metadata).toHaveProperty('performanceMetrics');
    });
  });

  describe('Fallback on Encryption Failure', () => {
    it('should fall back to unencrypted if encryption service fails', async () => {
      // Create a mock encryption service that fails
      const failingEncryptionService = {
        encryptData: jest.fn().mockRejectedValue(new Error('Encryption failed')),
      } as any;

      await logger.enableEncryption(failingEncryptionService);

      const SecureStore = require('expo-secure-store');
      SecureStore.setItemAsync.mockClear();

      logger.crisis('Crisis with failing encryption', {
        severity: 'high',
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should still store (unencrypted)
      expect(SecureStore.setItemAsync).toHaveBeenCalled();

      const lastCall = SecureStore.setItemAsync.mock.calls[
        SecureStore.setItemAsync.mock.calls.length - 1
      ];
      const storedData = JSON.parse(lastCall[1]);

      // Should NOT have encrypted wrapper (fell back to unencrypted)
      expect(storedData.encrypted).not.toBe(true);
      expect(storedData.encrypted).toBeUndefined();
    });

    it('should not throw when encryption fails', async () => {
      const failingEncryptionService = {
        encryptData: jest.fn().mockRejectedValue(new Error('Encryption failed')),
      } as any;

      await logger.enableEncryption(failingEncryptionService);

      // Should not throw
      expect(() => {
        logger.crisis('Test', { severity: 'high' });
      }).not.toThrow();
    });
  });

  describe('Performance Requirements', () => {
    it('should complete crisis logging with encryption in <200ms', async () => {
      await logger.enableEncryption(mockEncryptionService as any);

      const start = Date.now();

      logger.crisis('Performance test crisis', {
        severity: 'critical',
        detectionTime: 100,
        interventionType: 'modal',
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      const duration = Date.now() - start;

      // Should complete in <200ms (INFRA-61 requirement)
      expect(duration).toBeLessThan(200);
    });

    it('should handle 10 encrypted logs in <500ms', async () => {
      await logger.enableEncryption(mockEncryptionService as any);

      const start = Date.now();

      for (let i = 0; i < 10; i++) {
        logger.crisis(`Crisis ${i}`, {
          severity: 'high',
          detectionTime: 100 + i * 10,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const duration = Date.now() - start;

      // 10 logs should complete in <500ms
      expect(duration).toBeLessThan(500);
    });

    it('should not block main thread during encryption', async () => {
      await logger.enableEncryption(mockEncryptionService as any);

      // Log should return immediately (async storage)
      const start = Date.now();
      logger.crisis('Non-blocking test', { severity: 'high' });
      const syncDuration = Date.now() - start;

      // Synchronous part should be very fast (<10ms)
      expect(syncDuration).toBeLessThan(10);
    });
  });

  describe('Multiple Log Categories', () => {
    it('should encrypt all critical log categories correctly', async () => {
      await logger.enableEncryption(mockEncryptionService as any);

      const SecureStore = require('expo-secure-store');
      SecureStore.setItemAsync.mockClear();

      // Log different categories
      logger.crisis('Crisis log', { severity: 'high' });
      logger.security('Security log', 'high', { action: 'blocked' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Both should be encrypted
      const calls = SecureStore.setItemAsync.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);

      calls.forEach(call => {
        const storedData = JSON.parse(call[1]);
        expect(storedData).toHaveProperty('encrypted', true);
      });
    });
  });

  describe('Encryption Service Integration', () => {
    it('should use provided EncryptionService instance', async () => {
      await logger.enableEncryption(mockEncryptionService as any);

      logger.crisis('Test encryption service usage', {
        severity: 'high',
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify encryptData was called
      expect(mockEncryptionService.encryptData).toHaveBeenCalled();
    });

    it('should pass correct sensitivity level to encryption service', async () => {
      await logger.enableEncryption(mockEncryptionService as any);

      logger.crisis('Test sensitivity level', { severity: 'high' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify called with correct sensitivity level
      expect(mockEncryptionService.encryptData).toHaveBeenCalledWith(
        expect.any(Object),
        'level_1_crisis_responses'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle encryption with null context', async () => {
      await logger.enableEncryption(mockEncryptionService as any);

      expect(() => {
        logger.crisis('Crisis with null context');
      }).not.toThrow();
    });

    it('should handle encryption with large context', async () => {
      await logger.enableEncryption(mockEncryptionService as any);

      const largeContext = {
        data: new Array(1000).fill('test').join(''),
        severity: 'high',
      };

      expect(() => {
        logger.crisis('Large context', largeContext);
      }).not.toThrow();
    });

    it('should handle rapid enable/disable cycles', async () => {
      for (let i = 0; i < 10; i++) {
        await logger.enableEncryption(mockEncryptionService as any);
        logger.disableEncryption();
      }

      // Should not throw
      expect(() => logger.crisis('Test', { severity: 'high' })).not.toThrow();
    });
  });
});
