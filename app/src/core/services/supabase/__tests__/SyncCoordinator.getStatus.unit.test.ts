/**
 * SyncCoordinator.getStatus() — SyncStatusIndicator status contract (DEBUG-276)
 *
 * Regression pin for DEBUG-276: `SyncStatusIndicator.updateStatus()` called
 * `(SyncCoordinator as any).getStatus()`, but the SyncCoordinator singleton had
 * NO `getStatus` method. The `as any` cast suppressed the compile error, so at
 * runtime the call resolved to `undefined`, threw `TypeError: undefined is not a
 * function`, and was caught + logged as "Status update failed" on every 30s poll.
 *
 * Contract pinned here (the shape the indicator reads — see SyncStatusIndicator's
 * `SyncStatus` interface):
 *   { isInitialized, lastSyncTime, pendingOperations, isConnected,
 *     circuitBreakerState, errorCount, retryScheduled }
 *
 * The circuit-breaker tri-state is delegated to SupabaseService (its breaker is
 * the real 'closed' | 'open' | 'half-open' machine); any unrecognised value must
 * narrow to 'closed' so the indicator's strict display union can never receive an
 * out-of-contract string. Read-only status path; no clinical/safety surface.
 */

import SyncCoordinator from '../SyncCoordinator';
import supabaseService from '../SupabaseService';

const mockSupabaseStatus = (circuitBreakerState: string) => ({
  isInitialized: true,
  userId: 'anon' as string | null,
  circuitBreakerState,
  offlineQueueSize: 0,
  analyticsQueueSize: 0,
  lastSyncTime: null as string | null,
});

describe('SyncCoordinator.getStatus() — DEBUG-276', () => {
  afterEach(() => jest.restoreAllMocks());

  it('exposes getStatus() as a real method (regression: was undefined, threw every poll)', () => {
    expect(typeof (SyncCoordinator as { getStatus?: unknown }).getStatus).toBe('function');
  });

  it('returns the indicator status shape and does not throw', () => {
    jest.spyOn(supabaseService, 'getStatus').mockReturnValue(mockSupabaseStatus('open'));

    const status = SyncCoordinator.getStatus();

    expect(status).toEqual({
      isInitialized: expect.any(Boolean),
      // lastSyncTime is number | null; 0 (never synced) normalises to null
      lastSyncTime: status.lastSyncTime,
      pendingOperations: expect.any(Number),
      isConnected: expect.any(Boolean),
      circuitBreakerState: 'open',
      errorCount: expect.any(Number),
      retryScheduled: expect.any(Boolean),
    });
    expect(status.lastSyncTime === null || typeof status.lastSyncTime === 'number').toBe(true);
  });

  it('delegates the circuit-breaker tri-state to SupabaseService', () => {
    jest.spyOn(supabaseService, 'getStatus').mockReturnValue(mockSupabaseStatus('half-open'));
    expect(SyncCoordinator.getStatus().circuitBreakerState).toBe('half-open');
  });

  it('narrows an unrecognised circuit-breaker value to "closed" (strict display union)', () => {
    jest.spyOn(supabaseService, 'getStatus').mockReturnValue(mockSupabaseStatus('totally-unknown'));
    expect(SyncCoordinator.getStatus().circuitBreakerState).toBe('closed');
  });
});
