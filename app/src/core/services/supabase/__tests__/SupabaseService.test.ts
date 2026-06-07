/**
 * SupabaseService Unit Tests
 *
 * REVIVED IN MAINT-243. The legacy version of this file never executed: a
 * local `expo-crypto` mock that stubbed only `digestStringAsync` shadowed the
 * complete global mock, so import-time singleton construction threw
 * `Crypto.getRandomBytes is not a function` before any test ran. Because the
 * file isn't matched by the precommit `test:unit` pattern (no `.unit.` in the
 * name) the breakage only surfaced in full CI and went unnoticed. That dead
 * state hid two classes of rot, both fixed here:
 *
 *  1. No-op assertions — `expect(arr).toContain(expect.objectContaining(...))`.
 *     `toContain` compares by reference / SameValueZero and does NOT honor
 *     asymmetric matchers, so the matcher was never found yet the call was
 *     silently treated as satisfied. Replaced with `toContainEqual`, which
 *     does recursive equality.
 *  2. Stale-vs-impl tests — the failure-path tests mocked Supabase calls to
 *     *resolve* with an `{ error }` object, but `executeWithResilience` only
 *     treats a *thrown* error as failure; the per-`from()` throwaway builder
 *     meant `mockResolvedValueOnce` never reached the impl; and `trackEvent`
 *     now gates on `cloud_sync` consent (INFRA-214 T5). All corrected.
 *
 * COVERAGE:
 * - Service initialization (incl. missing-config guard)
 * - Anonymous user creation
 * - Encrypted backup save/retrieve
 * - Analytics: cloud_sync consent gate, PHI-stripping + severity bucketing
 * - Circuit breaker open / prevent / half-open
 * - Offline queue: queue-on-failure, drain, size cap
 * - Device ID hashing
 */

import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Deliberately do NOT mock expo-crypto here — the global jest.setup mock
// supplies BOTH getRandomBytes (used by the import-time singleton's session-id
// generation) and digestStringAsync. A local mock shadows it incompletely and
// breaks module import (the trap documented in the sibling
// analyticsGate.unit / crisisTelemetry*.unit tests in this directory).
jest.mock('@react-native-async-storage/async-storage');

// trackEvent() carries OPERATIONAL telemetry gated on cloud_sync consent
// (INFRA-214 T5). Grant it so the analytics-queue paths under test execute;
// the gate itself is pinned independently in analyticsGate.unit.test.ts.
const mockCanPerform = jest.fn(() => true);
jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: { getState: () => ({ canPerformOperation: mockCanPerform }) },
}));

// A single STABLE query-builder returned by every from() call, so a test's
// `mockChain.single.mockResolvedValueOnce(...)` actually reaches the impl.
// Chain methods return `this`; terminals (single/upsert/insert) are
// configured per-test. Reset + re-seeded in the file-level beforeEach below.
const mockChain: any = {
  select: jest.fn(() => mockChain),
  insert: jest.fn(() => mockChain),
  upsert: jest.fn(() => mockChain),
  eq: jest.fn(() => mockChain),
  order: jest.fn(() => mockChain),
  limit: jest.fn(() => mockChain),
  single: jest.fn(() => Promise.resolve({ data: null, error: null })),
};
const mockSupabaseClient = { from: jest.fn(() => mockChain) };

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Import service after mocks
import SupabaseService from '../SupabaseService';

/**
 * Run an async op under fake timers, flushing the resilience layer's setTimeout
 * backoff (1s + 2s per failed attempt) so retry-heavy paths resolve instantly
 * and deterministically instead of burning real wall-clock against the 10s
 * jest timeout.
 */
async function withFakeTimers<T>(fn: () => Promise<T>): Promise<T> {
  jest.useFakeTimers();
  try {
    const promise = fn();
    await jest.runAllTimersAsync();
    return await promise;
  } finally {
    jest.useRealTimers();
  }
}

// File-level harness reset — applies to every test, including the standalone
// "Device ID Generation" describe outside describe('SupabaseService').
beforeEach(() => {
  jest.clearAllMocks();
  mockCanPerform.mockReturnValue(true);

  // mockReset drains call data, implementations AND any leftover *Once queue
  // between tests; then re-seed the stable chain.
  for (const m of [
    mockChain.select,
    mockChain.insert,
    mockChain.upsert,
    mockChain.eq,
    mockChain.order,
    mockChain.limit,
    mockChain.single,
    mockSupabaseClient.from,
  ]) {
    m.mockReset();
  }
  mockChain.select.mockImplementation(() => mockChain);
  mockChain.insert.mockImplementation(() => mockChain);
  mockChain.upsert.mockImplementation(() => mockChain);
  mockChain.eq.mockImplementation(() => mockChain);
  mockChain.order.mockImplementation(() => mockChain);
  mockChain.limit.mockImplementation(() => mockChain);
  mockChain.single.mockResolvedValue({ data: null, error: null });
  mockSupabaseClient.from.mockImplementation(() => mockChain);

  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

describe('SupabaseService', () => {
  let service: any;

  beforeEach(() => {
    service = new (SupabaseService as any).constructor();
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      // Anonymous-user lookup resolves to an existing user.
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'user_123', device_id: 'device_hash' },
        error: null,
      });

      await service.initialize();

      expect(service.isInitialized).toBe(true);
      expect(service.userId).toBe('user_123');
    });

    it('should throw error with missing configuration', async () => {
      // SUPABASE_URL/KEY are captured from `@/core/config/env` at module load,
      // not from process.env — so the missing-config guard can only be
      // exercised by re-importing the service against an env with empty values.
      await jest.isolateModulesAsync(async () => {
        jest.doMock('@/core/config/env', () => ({
          env: { EXPO_PUBLIC_SUPABASE_URL: '', EXPO_PUBLIC_SUPABASE_KEY: '' },
        }));
        const FreshDefault = require('../SupabaseService').default;
        const freshSvc = new (FreshDefault as any).constructor();

        await expect(freshSvc.initialize()).rejects.toThrow(
          'Supabase configuration missing'
        );
      });
    });

    it('should create new anonymous user if none exists', async () => {
      mockChain.single
        // existing-user lookup → none
        .mockResolvedValueOnce({ data: null, error: { message: 'No rows found' } })
        // insert(...).select().single() → created user
        .mockResolvedValueOnce({ data: { id: 'new_user_123' }, error: null });

      await service.initialize();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(service.userId).toBe('new_user_123');
    });
  });

  describe('Backup Operations', () => {
    beforeEach(async () => {
      mockChain.single.mockResolvedValue({ data: { id: 'user_123' }, error: null });
      await service.initialize();
    });

    it('should save backup successfully', async () => {
      mockChain.upsert.mockResolvedValueOnce({ data: { id: 'backup_123' }, error: null });

      const result = await service.saveBackup('encrypted_test_data', 'test_checksum', 1);

      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('encrypted_backups');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@being/supabase/last_sync',
        expect.any(String)
      );
    });

    it('should handle backup failure gracefully', async () => {
      // A thrown error is what the resilience layer treats as failure (a
      // resolved `{ error }` is NOT — see the file header note).
      mockChain.upsert.mockRejectedValue(new Error('Backup failed'));

      const result = await withFakeTimers(() => service.saveBackup('data', 'checksum', 1));

      expect(result).toBe(false);
      // toContainEqual (not the legacy toContain) actually verifies the queued
      // op shape — operation name AND the carried payload.
      expect(service.offlineQueue).toContainEqual(
        expect.objectContaining({
          operation: 'saveBackup',
          data: { encryptedData: 'data', checksum: 'checksum', version: 1 },
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

      mockChain.single.mockResolvedValueOnce({ data: mockBackup, error: null });

      const result = await service.getBackup();

      expect(result).toEqual(mockBackup);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('encrypted_backups');
    });

    it('should return null when no backup exists', async () => {
      // Supabase "no rows" surfaces as an error; getBackup throws it into the
      // resilience layer (hence fake timers for the retry backoff) and resolves
      // to null. Use a persistent value (not *Once) so every retry attempt —
      // not just the first — sees the error and the op ultimately fails.
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      });

      const result = await withFakeTimers(() => service.getBackup());

      expect(result).toBeNull();
    });
  });

  describe('Analytics Tracking', () => {
    beforeEach(async () => {
      mockChain.single.mockResolvedValue({ data: { id: 'user_123' }, error: null });
      await service.initialize();
    });

    it('should track analytics event', async () => {
      const eventType = 'test_event';
      const properties = { test_prop: 'value' };

      await service.trackEvent(eventType, properties);

      // toContainEqual does recursive equality and honors objectContaining —
      // the previous toContain compared by reference and silently no-op'd, so
      // the queued event's shape was never actually verified.
      expect(service.analyticsQueue).toContainEqual(
        expect.objectContaining({
          event_type: eventType,
          properties: { test_prop: 'value' },
          user_id: 'user_123',
        })
      );
    });

    it('should sanitize analytics properties (strip objects, bucket clinical numerics)', async () => {
      const properties = {
        phq9_score: 15, // clinically-named numeric → severity bucket
        valid_prop: 'keep_this',
        unsafe_object: { nested: 'remove_this' }, // non-primitive → stripped
      };

      await service.trackEvent('test', properties);

      const queuedEvent = service.analyticsQueue[0];
      expect(queuedEvent.properties).toEqual({
        // PHQ-9 15 is "moderately severe" (band 15–19), NOT "moderate" (10–14).
        // The legacy assertion expected 'moderate' and never ran to catch it.
        phq9_score_bucket: 'moderate_severe',
        valid_prop: 'keep_this',
        // unsafe_object is absent — only string/number/boolean pass through.
      });
      expect('unsafe_object' in queuedEvent.properties).toBe(false);
      expect('phq9_score' in queuedEvent.properties).toBe(false);
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
      mockChain.single.mockResolvedValue({ data: { id: 'user_123' }, error: null });
      await service.initialize();
    });

    it('should open circuit after threshold failures', async () => {
      mockChain.upsert.mockRejectedValue(new Error('Network error'));

      await withFakeTimers(async () => {
        // 5 failing ops (each exhausting its retries) cross the threshold.
        for (let i = 0; i < 5; i++) {
          await service.saveBackup('data', 'checksum', 1);
        }
      });

      expect(service.circuitBreaker.state).toBe('open');
    });

    it('should prevent operations when circuit is open', async () => {
      // Manually open circuit
      service.circuitBreaker.state = 'open';
      service.circuitBreaker.lastFailureTime = Date.now();

      const result = await service.saveBackup('data', 'checksum', 1);

      expect(result).toBe(false);
      // Should not reach Supabase
      expect(mockChain.upsert).not.toHaveBeenCalled();
    });

    it('should transition to half-open after timeout', async () => {
      // Open circuit with an expired cooldown
      service.circuitBreaker.state = 'open';
      service.circuitBreaker.lastFailureTime = Date.now() - 70000; // 70s ago

      mockChain.upsert.mockResolvedValueOnce({ data: { id: 'backup_123' }, error: null });

      const result = await service.saveBackup('data', 'checksum', 1);

      expect(result).toBe(true);
      expect(service.circuitBreaker.state).toBe('closed');
    });
  });

  describe('Offline Queue', () => {
    beforeEach(async () => {
      mockChain.single.mockResolvedValue({ data: { id: 'user_123' }, error: null });
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

      mockChain.upsert.mockResolvedValue({ data: { id: 'backup_123' }, error: null });

      await service.processOfflineQueue();

      expect(service.offlineQueue).toHaveLength(0);
      expect(mockChain.upsert).toHaveBeenCalledTimes(2);
    });

    it('should limit offline queue size', async () => {
      // Fill queue beyond limit
      for (let i = 0; i < 150; i++) {
        service.queueOfflineOperation('test', { data: i });
      }

      expect(service.offlineQueue).toHaveLength(100); // capped at 100
      expect(service.offlineQueue[0].data).toEqual({ data: 50 }); // oldest evicted
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockChain.single.mockRejectedValue(new Error('Network error'));

      await expect(service.initialize()).rejects.toThrow('Network error');
      expect(service.isInitialized).toBe(false);
    });

    it('should treat a thrown Supabase error as a failed backup', async () => {
      mockChain.single.mockResolvedValue({ data: { id: 'user_123' }, error: null });
      await service.initialize();

      // NOTE: the resilience layer keys failure off a THROW. A Supabase call
      // that resolves with `{ error }` (no throw) is currently treated as
      // success by saveBackup — a separate production gap, out of scope for
      // MAINT-243 (test-only). Here we pin the throw path.
      mockChain.upsert.mockRejectedValue(new Error('Database error'));

      const result = await withFakeTimers(() => service.saveBackup('data', 'checksum', 1));

      expect(result).toBe(false);
    });
  });

  describe('Service Status', () => {
    it('should return accurate service status', async () => {
      mockChain.single.mockResolvedValue({ data: { id: 'user_123' }, error: null });
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
      mockChain.single.mockResolvedValue({ data: { id: 'user_123' }, error: null });
      await service.initialize();

      // Add some analytics to queue
      await service.trackEvent('test', {});

      await service.cleanup();

      // Should flush analytics and persist offline queue
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

    // Same stored device ID → same hash
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('device_123');

    const hash1 = await service.generateDeviceIdHash();
    const hash2 = await service.generateDeviceIdHash();

    expect(hash1).toBe(hash2);
    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      expect.any(String),
      'device_123'
    );
  });

  it('should create new device ID if none exists', async () => {
    const service = new (SupabaseService as any).constructor();

    // No stored device ID → a new one is generated and persisted
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await service.generateDeviceIdHash();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@being/device_id',
      expect.any(String)
    );
  });
});
