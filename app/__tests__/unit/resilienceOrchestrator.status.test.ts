/**
 * ResilienceOrchestrator: the LIVE surface only (MAINT-749 / TEST-11).
 *
 * Callers today are initialize() and getResilienceStatus() (via
 * CrisisMonitoringService). The rest of the orchestrator's API
 * (triggerEmergencyProtocol, emergencyShutdown, isServiceAvailable,
 * isCriticalSystemHealthy) was never called and was deleted in MAINT-794.
 *
 * Not on the zero-false-negative path (that is detectCrisis() over PHQ/GAD
 * integers); this is a health-reporting layer, so it lives in test:unit, not
 * test:safety. CircuitBreakerService is mocked but its enums stay real.
 */
import {
  ResilienceOrchestrator,
  circuitBreakerService,
  CircuitBreakerState,
  ProtectedService,
} from '../../src/core/services/resilience';

jest.mock('../../src/core/services/logging', () => ({
  logSecurity: jest.fn(),
  logError: jest.fn(),
  logPerformance: jest.fn(),
  LogCategory: { SECURITY: 'security', ERROR: 'error' },
}));

// resilience/index re-exports ../monitoring, which imports back into resilience (circular).
jest.mock('../../src/core/services/monitoring', () => ({
  trackError: jest.fn(),
  trackPerformanceError: jest.fn(),
  ErrorCategory: {},
}));

jest.mock('../../src/core/services/resilience/CircuitBreakerService', () => ({
  ...jest.requireActual('../../src/core/services/resilience/CircuitBreakerService'),
  circuitBreakerService: {
    initialize: jest.fn(),
    getSystemHealth: jest.fn(),
    getCircuitBreakerStatuses: jest.fn(),
  },
}));

type Health = 'healthy' | 'degraded' | 'unhealthy';
const mocked = circuitBreakerService as unknown as {
  initialize: jest.Mock;
  getSystemHealth: jest.Mock;
  getCircuitBreakerStatuses: jest.Mock;
};

const status = (state: CircuitBreakerState, healthStatus: Health) => ({ state, healthStatus });
const allHealthy = () =>
  Object.fromEntries(Object.values(ProtectedService).map((s) => [s, status(CircuitBreakerState.CLOSED, 'healthy')]));

/** A fresh singleton per case. */
const freshOrchestrator = (): ResilienceOrchestrator => {
  (ResilienceOrchestrator as unknown as { instance: unknown }).instance = undefined;
  return ResilienceOrchestrator.getInstance();
};

const statusWith = (overrides: Record<string, ReturnType<typeof status>>) => {
  mocked.getCircuitBreakerStatuses.mockReturnValue({ ...allHealthy(), ...overrides });
  return freshOrchestrator().getResilienceStatus().criticalServicesStatus;
};

beforeEach(() => {
  jest.clearAllMocks();
  mocked.initialize.mockResolvedValue(undefined);
  mocked.getSystemHealth.mockReturnValue({ overall: 'healthy', criticalServiceFailures: 0 });
  mocked.getCircuitBreakerStatuses.mockReturnValue(allHealthy());
});

describe('initialize()', () => {
  it('initializes the circuit breaker service and reports isInitialized', async () => {
    const orchestrator = freshOrchestrator();
    expect(orchestrator.getResilienceStatus().isInitialized).toBe(false);

    await orchestrator.initialize();

    expect(mocked.initialize).toHaveBeenCalledTimes(1);
    expect(orchestrator.getResilienceStatus().isInitialized).toBe(true);
  });

  it('a second initialize() is a no-op', async () => {
    const orchestrator = freshOrchestrator();
    await orchestrator.initialize();

    await orchestrator.initialize();

    expect(mocked.initialize).toHaveBeenCalledTimes(1);
  });

  it('a failed initialize() rethrows and leaves isInitialized false, so a retry runs again', async () => {
    const orchestrator = freshOrchestrator();
    mocked.initialize.mockRejectedValueOnce(new Error('boom'));

    await expect(orchestrator.initialize()).rejects.toThrow('boom');
    expect(orchestrator.getResilienceStatus().isInitialized).toBe(false);

    await orchestrator.initialize();

    expect(mocked.initialize).toHaveBeenCalledTimes(2);
    expect(orchestrator.getResilienceStatus().isInitialized).toBe(true);
  });
});

describe('getResilienceStatus().criticalServicesStatus', () => {
  it('control: everything closed and healthy is all_healthy', () => {
    expect(statusWith({})).toBe('all_healthy');
  });

  it.each([ProtectedService.CRISIS_DETECTION, ProtectedService.AUTHENTICATION, ProtectedService.ASSESSMENT_STORE])(
    'critical service %s OPEN is critical_failure',
    (service) => {
      expect(statusWith({ [service]: status(CircuitBreakerState.OPEN, 'unhealthy') })).toBe('critical_failure');
    },
  );

  it.each([
    [CircuitBreakerState.CLOSED, 'degraded' as Health],
    [CircuitBreakerState.HALF_OPEN, 'unhealthy' as Health],
  ])('a critical service %s with health %s (not OPEN) is degraded', (state, health) => {
    expect(statusWith({ [ProtectedService.CRISIS_DETECTION]: status(state, health) })).toBe('degraded');
  });

  it('one critical service OPEN outranks another that is merely degraded', () => {
    expect(
      statusWith({
        [ProtectedService.AUTHENTICATION]: status(CircuitBreakerState.CLOSED, 'degraded'),
        [ProtectedService.CRISIS_DETECTION]: status(CircuitBreakerState.OPEN, 'unhealthy'),
      }),
    ).toBe('critical_failure');
  });

  it('negative control: a NON-critical service OPEN leaves the critical status all_healthy', () => {
    expect(statusWith({ [ProtectedService.ANALYTICS]: status(CircuitBreakerState.OPEN, 'unhealthy') })).toBe(
      'all_healthy',
    );
    expect(statusWith({ [ProtectedService.SYNC_OPERATIONS]: status(CircuitBreakerState.OPEN, 'unhealthy') })).toBe(
      'all_healthy',
    );
  });

  it('a critical service with no breaker entry is ignored', () => {
    const statuses: Record<string, unknown> = allHealthy();
    delete statuses[ProtectedService.CRISIS_DETECTION];
    mocked.getCircuitBreakerStatuses.mockReturnValue(statuses);

    expect(freshOrchestrator().getResilienceStatus().criticalServicesStatus).toBe('all_healthy');
  });
});
