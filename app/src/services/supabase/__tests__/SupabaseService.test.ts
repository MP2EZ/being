/**
 * SupabaseService Unit Tests
 *
 * TEST COVERAGE:
 * - Service initialization
 * - Anonymous user creation
 * - Encrypted backup operations
 * - Analytics event tracking
 * - Circuit breaker functionality
 * - Offline queue management
 * - Error handling
 */

import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto');
jest.mock('@supabase/supabase-js');

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  })),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock crypto
const mockCrypto = {
  digestStringAsync: jest.fn().mockResolvedValue('mock_hash'),
};

jest.mock('expo-crypto', () => mockCrypto);

// Import service after mocks
import SupabaseService from '../SupabaseService';

describe('SupabaseService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new (SupabaseService as any).constructor();

    // Setup AsyncStorage mocks
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      // Mock environment variables
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test_key';

      // Mock user creation
      mockSupabaseClient.from().single.mockResolvedValueOnce({
        data: { id: 'user_123', device_id: 'device_hash' },
        error: null,
      });

      await service.initialize();

      expect(service.isInitialized).toBe(true);
      expect(service.userId).toBe('user_123');
    });

    it('should throw error with missing configuration', async () => {
      // Clear environment variables
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      await expect(service.initialize()).rejects.toThrow('Supabase configuration missing');
    });

    it('should create new anonymous user if none exists', async () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test_key';

      // Mock no existing user
      mockSupabaseClient.from().single
        .mockResolvedValueOnce({ data: null, error: { message: 'No rows found' } })
        .mockResolvedValueOnce({ data: { id: 'new_user_123' }, error: null });

      await service.initialize();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(service.userId).toBe('new_user_123');
    });
  });

  describe('Backup Operations', () => {
    beforeEach(async () => {
      // Setup initialized service
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test_key';

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { id: 'user_123' },
        error: null,
      });

      await service.initialize();
    });

    it('should save backup successfully', async () => {
      const encryptedData = 'encrypted_test_data';
      const checksum = 'test_checksum';
      const version = 1;

      mockSupabaseClient.from().upsert.mockResolvedValueOnce({
        data: { id: 'backup_123' },
        error: null,
      });

      const result = await service.saveBackup(encryptedData, checksum, version);

      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('encrypted_backups');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@being/supabase/last_sync',
        expect.any(String)
      );
    });

    it('should handle backup failure gracefully', async () => {
      mockSupabaseClient.from().upsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Backup failed' },
      });

      const result = await service.saveBackup('data', 'checksum', 1);

      expect(result).toBe(false);
      // Should queue for offline processing
      expect(service.offlineQueue).toContain(
        expect.objectContaining({
          operation: 'saveBackup',
        })
      );
    });

    it('should retrieve backup successfully', async () => {
      const mockBackup = {
        id: 'backup_123',
        encrypted_data: 'encrypted_data',
        checksum: 'checksum',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.from().single.mockResolvedValueOnce({
        data: mockBackup,
        error: null,
      });

      const result = await service.getBackup();

      expect(result).toEqual(mockBackup);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('encrypted_backups');
    });

    it('should return null when no backup exists', async () => {
      mockSupabaseClient.from().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows found' },
      });

      const result = await service.getBackup();

      expect(result).toBeNull();
    });
  });

  describe('Analytics Tracking', () => {
    beforeEach(async () => {
      // Setup initialized service
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test_key';

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { id: 'user_123' },
        error: null,
      });

      await service.initialize();
    });

    it('should track analytics event', async () => {
      const eventType = 'test_event';
      const properties = { test_prop: 'value' };

      await service.trackEvent(eventType, properties);

      expect(service.analyticsQueue).toContain(
        expect.objectContaining({
          event_type: eventType,
          properties,
          user_id: 'user_123',
        })
      );
    });

    it('should sanitize analytics properties', async () => {
      const properties = {
        phq9_score: 15, // Should be converted to bucket
        valid_prop: 'keep_this',
        unsafe_object: { nested: 'remove_this' },
      };

      await service.trackEvent('test', properties);

      const queuedEvent = service.analyticsQueue[0];
      expect(queuedEvent.properties).toEqual({
        phq9_score_bucket: 'moderate',
        valid_prop: 'keep_this',
        // unsafe_object should be removed
      });
    });

    it('should flush analytics when queue is full', async () => {
      // Fill queue to trigger flush
      for (let i = 0; i < 10; i++) {
        await service.trackEvent('test_event', {});
      }

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('analytics_events');
    });

    it('should convert PHQ9 scores to severity buckets', async () => {
      const testCases = [
        { score: 3, expected: 'minimal' },
        { score: 7, expected: 'mild' },
        { score: 12, expected: 'moderate' },
        { score: 17, expected: 'moderate_severe' },
        { score: 23, expected: 'severe' },
      ];

      for (const { score, expected } of testCases) {
        await service.trackEvent('test', { phq9_score: score });
        const event = service.analyticsQueue[service.analyticsQueue.length - 1];
        expect(event.properties.phq9_score_bucket).toBe(expected);
      }
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(async () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test_key';

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { id: 'user_123' },
        error: null,
      });

      await service.initialize();
    });

    it('should open circuit after threshold failures', async () => {
      // Mock failures
      mockSupabaseClient.from().upsert.mockRejectedValue(new Error('Network error'));

      // Trigger multiple failures
      for (let i = 0; i < 5; i++) {
        await service.saveBackup('data', 'checksum', 1);
      }

      expect(service.circuitBreaker.state).toBe('open');
    });

    it('should prevent operations when circuit is open', async () => {
      // Manually open circuit
      service.circuitBreaker.state = 'open';
      service.circuitBreaker.lastFailureTime = Date.now();

      const result = await service.saveBackup('data', 'checksum', 1);

      expect(result).toBe(false);
      // Should not call Supabase
      expect(mockSupabaseClient.from().upsert).not.toHaveBeenCalled();
    });

    it('should transition to half-open after timeout', async () => {
      // Set circuit to open with old timestamp
      service.circuitBreaker.state = 'open';
      service.circuitBreaker.lastFailureTime = Date.now() - 70000; // 70 seconds ago

      // Mock successful operation
      mockSupabaseClient.from().upsert.mockResolvedValueOnce({
        data: { id: 'backup_123' },
        error: null,
      });

      const result = await service.saveBackup('data', 'checksum', 1);

      expect(result).toBe(true);
      expect(service.circuitBreaker.state).toBe('closed');
    });
  });

  describe('Offline Queue', () => {
    beforeEach(async () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test_key';

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { id: 'user_123' },
        error: null,
      });

      await service.initialize();
    });

    it('should queue operations when not initialized', async () => {
      const uninitializedService = new (SupabaseService as any).constructor();

      await uninitializedService.saveBackup('data', 'checksum', 1);

      expect(uninitializedService.offlineQueue).toHaveLength(1);
      expect(uninitializedService.offlineQueue[0]).toEqual(
        expect.objectContaining({
          operation: 'saveBackup',
          data: { encryptedData: 'data', checksum: 'checksum', version: 1 },
        })
      );
    });

    it('should process offline queue on connectivity restore', async () => {
      // Add items to queue
      service.offlineQueue = [
        {
          operation: 'saveBackup',
          data: { encryptedData: 'data1', checksum: 'checksum1', version: 1 },
          timestamp: Date.now(),
        },
        {
          operation: 'saveBackup',
          data: { encryptedData: 'data2', checksum: 'checksum2', version: 1 },
          timestamp: Date.now(),
        },
      ];

      mockSupabaseClient.from().upsert.mockResolvedValue({
        data: { id: 'backup_123' },
        error: null,
      });

      await service.processOfflineQueue();

      expect(service.offlineQueue).toHaveLength(0);
      expect(mockSupabaseClient.from().upsert).toHaveBeenCalledTimes(2);
    });

    it('should limit offline queue size', async () => {
      // Fill queue beyond limit
      for (let i = 0; i < 150; i++) {
        service.queueOfflineOperation('test', { data: i });
      }

      expect(service.offlineQueue).toHaveLength(100); // Should be limited to 100
      expect(service.offlineQueue[0].data).toEqual({ data: 50 }); // Oldest should be removed
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test_key';

      mockSupabaseClient.from().single.mockRejectedValue(new Error('Network error'));

      await expect(service.initialize()).rejects.toThrow('Network error');
      expect(service.isInitialized).toBe(false);
    });

    it('should handle Supabase errors', async () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test_key';

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { id: 'user_123' },
        error: null,
      });

      await service.initialize();

      // Mock Supabase error
      mockSupabaseClient.from().upsert.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await service.saveBackup('data', 'checksum', 1);

      expect(result).toBe(false);
    });
  });

  describe('Service Status', () => {
    it('should return accurate service status', async () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test_key';

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { id: 'user_123' },
        error: null,
      });

      await service.initialize();

      const status = service.getStatus();

      expect(status).toEqual(
        expect.objectContaining({
          isInitialized: true,
          userId: 'user_123',
          circuitBreakerState: 'closed',
          offlineQueueSize: 0,
          analyticsQueueSize: 0,
        })
      );
    });
  });

  describe('Cleanup', () => {
    it('should cleanup service properly', async () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test_key';

      mockSupabaseClient.from().single.mockResolvedValue({
        data: { id: 'user_123' },
        error: null,
      });

      await service.initialize();

      // Add some analytics to queue
      await service.trackEvent('test', {});

      await service.cleanup();

      // Should flush analytics and save offline queue
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@being/supabase/offline_queue',
        expect.any(String)
      );
    });
  });
});

describe('Device ID Generation', () => {
  it('should generate consistent device ID hash', async () => {
    const service = new (SupabaseService as any).constructor();

    // Mock AsyncStorage to return same device ID
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('device_123');

    const hash1 = await service.generateDeviceIdHash();
    const hash2 = await service.generateDeviceIdHash();

    expect(hash1).toBe(hash2);
    expect(mockCrypto.digestStringAsync).toHaveBeenCalledWith(
      expect.any(String),
      'device_123'
    );
  });

  it('should create new device ID if none exists', async () => {
    const service = new (SupabaseService as any).constructor();

    // Mock AsyncStorage to return null, then save new ID
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await service.generateDeviceIdHash();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@being/device_id',
      expect.any(String)
    );
  });
});