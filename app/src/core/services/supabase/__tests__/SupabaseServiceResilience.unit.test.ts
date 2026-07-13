/**
 * SupabaseService resilience error-surfacing (DEBUG-255) — UNIT
 *
 * Pins the contract that a Supabase call which RESOLVES with `{ error }` (no
 * throw) is treated as a failure, not a false success. `supabase-js` resolves
 * with `{ data, error }` for most failures (RLS denial, PostgREST errors,
 * constraint violations) and only throws on transport faults; since
 * `executeWithResilience` keys failure off a throw, the operation closures must
 * re-throw `resp.error` (the pattern flushCrisisAnalytics / getBackup already
 * use). Otherwise saveBackup reports success + writes last_sync + never queues,
 * and flushAnalytics silently drops the in-flight events.
 *
 * NOTE: deliberately does NOT mock expo-crypto — the global jest.setup mock
 * provides getRandomBytes (a local mock would shadow it incompletely and break
 * the import-time singleton construction).
 */
import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

// trackEvent() gates on cloud_sync consent (INFRA-214 T5) — grant it so the
// analytics flush path executes.
const mockCanPerform = jest.fn(() => true);
jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: { getState: () => ({ canPerformOperation: mockCanPerform }) },
}));

// A single STABLE query-builder returned by every from() call so per-test
// terminal overrides (upsert/insert/single) actually reach the impl.
const mockChain: any = {
  select: jest.fn(() => mockChain),
  insert: jest.fn(() => mockChain),
  upsert: jest.fn(() => mockChain),
  eq: jest.fn(() => mockChain),
  order: jest.fn(() => mockChain),
  limit: jest.fn(() => mockChain),
  single: jest.fn(() => Promise.resolve({ data: null, error: null })),
};
// INFRA-260: identity is the Supabase anonymous session — initialize() calls
// auth.signInAnonymously() to set userId (== auth.uid()). Without this mock the
// write paths under test would early-return on a null userId.
const mockAuth: any = {
  getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  signInAnonymously: jest.fn(() =>
    Promise.resolve({ data: { user: { id: 'user_123' }, session: {} }, error: null }),
  ),
};
const mockSupabaseClient = { from: jest.fn(() => mockChain), auth: mockAuth };

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

import SupabaseService from '../SupabaseService';

/** Run an async op under fake timers, flushing the resilience retry backoff. */
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

describe('SupabaseService resilience — resolved {error} is a failure (DEBUG-255)', () => {
  let service: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCanPerform.mockReturnValue(true);

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
    mockChain.single.mockResolvedValue({ data: { id: 'user_123' }, error: null });
    mockSupabaseClient.from.mockImplementation(() => mockChain);

    mockAuth.getSession.mockReset();
    mockAuth.signInAnonymously.mockReset();
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockAuth.signInAnonymously.mockResolvedValue({
      data: { user: { id: 'user_123' }, session: {} },
      error: null,
    });

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    service = new (SupabaseService as any).constructor();
    await service.initialize();
    (AsyncStorage.setItem as jest.Mock).mockClear(); // ignore init-time writes
  });

  it('saveBackup: a resolved {error} returns false, queues offline, and does NOT write last_sync', async () => {
    // upsert resolves with an error on EVERY attempt (no throw).
    mockChain.upsert.mockResolvedValue({ data: null, error: { message: 'RLS denied' } });

    const result = await withFakeTimers(() => service.saveBackup('data', 'checksum', 1));

    expect(result).toBe(false);
    expect(service.offlineQueue).toContainEqual(
      expect.objectContaining({
        operation: 'saveBackup',
        data: { encryptedData: 'data', checksum: 'checksum', version: 1 },
      })
    );
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      '@being/supabase/last_sync',
      expect.any(String)
    );
  });

  it('saveBackup: a resolved {error} feeds the circuit breaker (opens after threshold)', async () => {
    mockChain.upsert.mockResolvedValue({ data: null, error: { message: 'RLS denied' } });

    await withFakeTimers(async () => {
      for (let i = 0; i < 5; i++) {
        await service.saveBackup('data', 'checksum', 1);
      }
    });

    expect(service.circuitBreaker.state).toBe('open');
  });

  it('flushAnalytics: a resolved {error} re-queues events instead of dropping them', async () => {
    // insert (terminal in flushAnalytics) resolves with an error every attempt.
    mockChain.insert.mockResolvedValue({ data: null, error: { message: 'insert failed' } });

    await withFakeTimers(async () => {
      // 10th event hits the flush threshold; the failed flush must retain them.
      for (let i = 0; i < 10; i++) {
        await service.trackEvent('evt', {});
      }
    });

    expect(service.analyticsQueue.length).toBeGreaterThanOrEqual(10);
  });
});
