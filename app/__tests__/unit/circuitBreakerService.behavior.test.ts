/**
 * CIRCUIT BREAKER SERVICE — BEHAVIOR UNIT TESTS (MAINT-242)
 *
 * Correctness-asserting tests for the CircuitBreaker resilience primitive.
 * Drives the real CLOSED -> OPEN -> HALF_OPEN -> CLOSED lifecycle via the
 * configured failureThreshold + recoveryTimeout, exercising Date.now()
 * advancement with fake timers, executeWithTimeout rejection, and each
 * fallback strategy.
 *
 * PLACEMENT: authored under __tests__/unit/ so it is gated by
 * `npm run test:unit` (jest --testPathPattern=unit). The co-located
 * src tree __tests__ files are NOT run by that CI suite.
 *
 * BUG FIXED (TDD, see "force-open recovery" test):
 *   forceState(OPEN) did not set metrics.circuitOpenTime, so
 *   shouldAttemptRecovery() — which compares Date.now() - circuitOpenTime
 *   against recoveryTimeout — could never become true for a force-opened
 *   circuit. The breaker stayed wedged OPEN forever. Fix: forceState now
 *   stamps circuitOpenTime when transitioning to OPEN (mirroring the
 *   natural transitionToOpen()).
 *
 * INFRA-180 discipline: literal error strings asserted; fake timers +
 * setSystemTime for Date.now control + advanceTimersByTime for the queue;
 * microtasks flushed; real timers restored in afterEach.
 */

import {
  CircuitBreakerService,
  CircuitBreakerState,
  ProtectedService,
} from '@/core/services/resilience/CircuitBreakerService';

// AsyncStorage is globally mocked in jest.setup.js, but assert a clean
// state per-test so cache/queue fallbacks read predictable values.
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The service is a singleton with private state. Each test re-initializes
 * a fresh instance by emergency-shutdown + initialize so circuit breakers
 * start CLOSED with zeroed metrics.
 */
async function freshService(): Promise<CircuitBreakerService> {
  const svc = CircuitBreakerService.getInstance();
  await svc.emergencyShutdown();
  await svc.initialize();
  return svc;
}

const flushMicrotasks = () => Promise.resolve();

describe('CircuitBreakerService — lifecycle & fallbacks (MAINT-242)', () => {
  let svc: CircuitBreakerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    svc = await freshService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('CLOSED -> OPEN via failureThreshold', () => {
    it('stays CLOSED before the threshold and opens once it is reached', async () => {
      // ANALYTICS: failureThreshold = 10, fallback strategy 'skip' (enabled).
      const failing = () => Promise.reject(new Error('boom'));

      // 9 failures (< threshold of 10): still CLOSED.
      for (let i = 0; i < 9; i++) {
        await svc.executeProtected(ProtectedService.ANALYTICS, failing);
      }
      let statuses = svc.getCircuitBreakerStatuses();
      expect(statuses[ProtectedService.ANALYTICS].state).toBe(CircuitBreakerState.CLOSED);

      // 10th failure reaches threshold -> OPEN.
      await svc.executeProtected(ProtectedService.ANALYTICS, failing);
      statuses = svc.getCircuitBreakerStatuses();
      expect(statuses[ProtectedService.ANALYTICS].state).toBe(CircuitBreakerState.OPEN);
      expect(statuses[ProtectedService.ANALYTICS].metrics.failedRequests).toBe(10);
    });
  });

  describe('full CLOSED -> OPEN -> HALF_OPEN -> CLOSED recovery cycle', () => {
    it('recovers to CLOSED after recoveryTimeout + successful half-open calls', async () => {
      jest.useFakeTimers();
      const t0 = 1_700_000_000_000;
      jest.setSystemTime(t0);

      // ASSESSMENT_STORE: failureThreshold 2, recoveryTimeout 30000,
      // halfOpenMaxCalls 3, fallback strategy 'cache' (enabled).
      const failing = () => Promise.reject(new Error('store down'));
      const ok = () => Promise.resolve('value');

      // Drive to OPEN (2 failures).
      await svc.executeProtected(ProtectedService.ASSESSMENT_STORE, failing);
      await svc.executeProtected(ProtectedService.ASSESSMENT_STORE, failing);
      let s = svc.getCircuitBreakerStatuses()[ProtectedService.ASSESSMENT_STORE];
      expect(s.state).toBe(CircuitBreakerState.OPEN);

      // Before recoveryTimeout elapses, calls hit the fallback and stay OPEN.
      jest.setSystemTime(t0 + 10_000); // 10s < 30s
      await svc.executeProtected(ProtectedService.ASSESSMENT_STORE, ok);
      s = svc.getCircuitBreakerStatuses()[ProtectedService.ASSESSMENT_STORE];
      expect(s.state).toBe(CircuitBreakerState.OPEN);

      // Advance past recoveryTimeout: next call transitions to HALF_OPEN
      // and (since op succeeds) records a half-open success.
      jest.setSystemTime(t0 + 31_000); // 31s > 30s
      await svc.executeProtected(ProtectedService.ASSESSMENT_STORE, ok);
      await flushMicrotasks();
      s = svc.getCircuitBreakerStatuses()[ProtectedService.ASSESSMENT_STORE];
      expect(s.state).toBe(CircuitBreakerState.HALF_OPEN);

      // halfOpenMaxCalls = 3: need 3 total successes to close. One already
      // recorded above; two more close the circuit.
      await svc.executeProtected(ProtectedService.ASSESSMENT_STORE, ok);
      await svc.executeProtected(ProtectedService.ASSESSMENT_STORE, ok);
      await flushMicrotasks();
      s = svc.getCircuitBreakerStatuses()[ProtectedService.ASSESSMENT_STORE];
      expect(s.state).toBe(CircuitBreakerState.CLOSED);
      expect(s.metrics.circuitOpenTime).toBeNull();
    });

    it('re-opens immediately if a half-open probe fails', async () => {
      jest.useFakeTimers();
      const t0 = 1_700_000_000_000;
      jest.setSystemTime(t0);

      const failing = () => Promise.reject(new Error('store down'));

      await svc.executeProtected(ProtectedService.ASSESSMENT_STORE, failing);
      await svc.executeProtected(ProtectedService.ASSESSMENT_STORE, failing);
      expect(
        svc.getCircuitBreakerStatuses()[ProtectedService.ASSESSMENT_STORE].state
      ).toBe(CircuitBreakerState.OPEN);

      // Past recovery window -> transition to HALF_OPEN, then the probe
      // fails -> recordFailure re-opens immediately.
      jest.setSystemTime(t0 + 31_000);
      await svc.executeProtected(ProtectedService.ASSESSMENT_STORE, failing);
      await flushMicrotasks();
      expect(
        svc.getCircuitBreakerStatuses()[ProtectedService.ASSESSMENT_STORE].state
      ).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('BUG FIX (MAINT-242): forceState(OPEN) sets circuitOpenTime so recovery can fire', () => {
    it('force-opened circuit transitions to HALF_OPEN after recoveryTimeout', async () => {
      jest.useFakeTimers();
      const t0 = 1_700_000_000_000;
      jest.setSystemTime(t0);

      // Force OPEN (this is the regression surface: pre-fix, circuitOpenTime
      // stayed null, so shouldAttemptRecovery() never returned true).
      svc.forceCircuitState(ProtectedService.ASSESSMENT_STORE, CircuitBreakerState.OPEN);
      let s = svc.getCircuitBreakerStatuses()[ProtectedService.ASSESSMENT_STORE];
      expect(s.state).toBe(CircuitBreakerState.OPEN);
      // The fix stamps circuitOpenTime at force time.
      expect(s.metrics.circuitOpenTime).toBe(t0);

      // Advance past recoveryTimeout (30s) and issue a successful op:
      // recovery must be attempted -> HALF_OPEN. (Pre-fix: stuck OPEN.)
      jest.setSystemTime(t0 + 31_000);
      await svc.executeProtected(ProtectedService.ASSESSMENT_STORE, () => Promise.resolve('ok'));
      await flushMicrotasks();
      s = svc.getCircuitBreakerStatuses()[ProtectedService.ASSESSMENT_STORE];
      expect(s.state).toBe(CircuitBreakerState.HALF_OPEN);
    });

    it('forceState(CLOSED) clears circuitOpenTime', async () => {
      svc.forceCircuitState(ProtectedService.ASSESSMENT_STORE, CircuitBreakerState.OPEN);
      expect(
        svc.getCircuitBreakerStatuses()[ProtectedService.ASSESSMENT_STORE].metrics.circuitOpenTime
      ).not.toBeNull();

      svc.forceCircuitState(ProtectedService.ASSESSMENT_STORE, CircuitBreakerState.CLOSED);
      expect(
        svc.getCircuitBreakerStatuses()[ProtectedService.ASSESSMENT_STORE].metrics.circuitOpenTime
      ).toBeNull();
    });
  });

  describe('executeWithTimeout', () => {
    it('rejects with the literal timeout message when an operation exceeds requestTimeout', async () => {
      jest.useFakeTimers();

      // ANALYTICS requestTimeout = 10000ms. A never-resolving op should
      // be rejected by the timeout timer. fallback strategy is 'skip',
      // which returns undefined — so the call resolves to undefined, but
      // the timeout DID fire (metrics.timeouts increments).
      const hang = () => new Promise<string>(() => {});

      const p = svc.executeProtected(ProtectedService.ANALYTICS, hang);
      jest.advanceTimersByTime(10_000);
      const result = await p;

      // 'skip' fallback returns undefined.
      expect(result).toBeUndefined();
      const s = svc.getCircuitBreakerStatuses()[ProtectedService.ANALYTICS];
      expect(s.metrics.timeouts).toBe(1);
    });

    it('surfaces the literal timeout error to a non-fallback (escalate) service', async () => {
      jest.useFakeTimers();

      // CRISIS_DETECTION: requestTimeout 2000, fallback enabled:false ->
      // the original error rethrows. The first failure also opens the
      // breaker (failureThreshold 1).
      const hang = () => new Promise<string>(() => {});

      const p = svc.executeProtected(ProtectedService.CRISIS_DETECTION, hang);
      jest.advanceTimersByTime(2000);

      await expect(p).rejects.toThrow('Operation timeout after 2000ms');
    });
  });

  describe('fallback strategies', () => {
    it("'cache' fallback returns the stored cached value when OPEN", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ cached: true }));

      // Force ASSESSMENT_STORE OPEN (strategy 'cache', cacheKey 'assessment_cache').
      jest.useFakeTimers();
      jest.setSystemTime(1_700_000_000_000);
      svc.forceCircuitState(ProtectedService.ASSESSMENT_STORE, CircuitBreakerState.OPEN);

      // Within recovery window so it stays OPEN and serves the fallback.
      const result = await svc.executeProtected(
        ProtectedService.ASSESSMENT_STORE,
        () => Promise.resolve({ cached: false })
      );

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('assessment_cache');
      expect(result).toEqual({ cached: true });
    });

    it("'queue' fallback returns the configured defaultValue and enqueues the context", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(1_700_000_000_000);
      // SYNC_OPERATIONS: strategy 'queue', defaultValue { success:false, queued:true }.
      svc.forceCircuitState(ProtectedService.SYNC_OPERATIONS, CircuitBreakerState.OPEN);

      const result = await svc.executeProtected(
        ProtectedService.SYNC_OPERATIONS,
        () => Promise.resolve('live'),
        { item: 'x' }
      );

      expect(result).toEqual({ success: false, queued: true });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'circuit_breaker_queue_sync_operations',
        expect.any(String)
      );
    });

    it("'skip' fallback returns undefined when OPEN", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(1_700_000_000_000);
      svc.forceCircuitState(ProtectedService.ANALYTICS, CircuitBreakerState.OPEN);

      const result = await svc.executeProtected(
        ProtectedService.ANALYTICS,
        () => Promise.resolve('live')
      );
      expect(result).toBeUndefined();
    });

    it("'escalate' (crisis, fail-closed) throws the literal escalation message when OPEN", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(1_700_000_000_000);
      // CRISIS_DETECTION: enabled:false strategy 'escalate'. When forced OPEN
      // and within the recovery window, handleFallback throws.
      svc.forceCircuitState(ProtectedService.CRISIS_DETECTION, CircuitBreakerState.OPEN);

      await expect(
        svc.executeProtected(ProtectedService.CRISIS_DETECTION, () => Promise.resolve('live'))
      ).rejects.toThrow('Circuit breaker escalated (fail-closed) for crisis_detection');
    });
  });

  describe('getSystemHealth', () => {
    it('reports critical when a critical service circuit is OPEN', async () => {
      svc.forceCircuitState(ProtectedService.CRISIS_DETECTION, CircuitBreakerState.OPEN);
      const health = svc.getSystemHealth();
      expect(health.overall).toBe('critical');
      expect(health.criticalServiceFailures).toBe(1);
      expect(health.openCircuits).toBe(1);
    });

    it('reports healthy when all circuits are CLOSED', () => {
      const health = svc.getSystemHealth();
      expect(health.overall).toBe('healthy');
      expect(health.openCircuits).toBe(0);
    });
  });

  describe('executeProtected error handling', () => {
    it('throws the literal "no circuit breaker" error for an unknown service after shutdown', async () => {
      await svc.emergencyShutdown();
      await expect(
        svc.executeProtected(ProtectedService.ANALYTICS, () => Promise.resolve('x'))
      ).rejects.toThrow('No circuit breaker configured for service: analytics');
    });
  });
});
