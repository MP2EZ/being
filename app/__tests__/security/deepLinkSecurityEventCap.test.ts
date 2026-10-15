/**
 * Deep-link security event log is bounded (MAINT-749 / TEST-66).
 *
 * DeepLinkValidationService keeps an in-memory log (MAX_SECURITY_EVENTS = 1000)
 * so a flood of hostile links cannot grow memory without bound. The log is
 * written through the private `logSecurityEvent` (bracket access below), which
 * is also what validateDeepLink calls; driving it directly keeps the rate
 * limiter (30 requests/minute) out of a 1000+-event test.
 *
 * Fixtures are synthetic (`being://e/N`, no user data). Ordering is asserted
 * through the synthetic index only, not as a promise about what URL content the
 * log retains.
 */
import { DeepLinkValidationService } from '../../src/core/services/security/DeepLinkValidationService';

jest.mock('../../src/core/services/logging', () => ({
  logSecurity: jest.fn(),
  logError: jest.fn(),
  LogCategory: { SECURITY: 'security', ERROR: 'error' },
}));

type EventType = 'validation_passed' | 'validation_failed' | 'attack_detected' | 'rate_limited';
type LogError = { code: string; message: string; severity: 'low' | 'medium' | 'high' | 'critical' };

const MAX = 1000;

describe('deep-link security event log cap', () => {
  const service = DeepLinkValidationService.getInstance();
  const log = (url: string, type: EventType, errors: LogError[] = []) =>
    (service as unknown as { logSecurityEvent: (u: string, t: EventType, e: LogError[]) => void }).logSecurityEvent(
      url,
      type,
      errors,
    );
  const stored = () => (service as unknown as { securityEvents: { url: string }[] }).securityEvents;

  beforeEach(() => service.clearSecurityEvents());
  afterEach(() => service.clearSecurityEvents());

  it('liveness: below the cap every event is retained', () => {
    for (let i = 0; i < 10; i++) log(`being://e/${i}`, 'validation_failed');

    expect(service.getSecurityMetrics().totalEvents).toBe(10);
  });

  it('keeps totalEvents at 1000 after 1005 events and evicts the OLDEST, retaining the newest', () => {
    // The 5 oldest are the only attacks, so eviction is also visible in the counts.
    for (let i = 0; i < 1005; i++) log(`being://e/${i}`, i < 5 ? 'attack_detected' : 'validation_failed');

    const metrics = service.getSecurityMetrics();

    expect(metrics.totalEvents).toBe(MAX);
    expect(stored()).toHaveLength(MAX);
    expect(stored()[0]!.url).toBe('being://e/5');
    expect(stored()[MAX - 1]!.url).toBe('being://e/1004');
    expect(metrics.attacksDetected).toBe(0);
  });

  it('exactly at the cap nothing is evicted; one more evicts exactly one', () => {
    for (let i = 0; i < MAX; i++) log(`being://e/${i}`, 'validation_failed');
    expect(stored()[0]!.url).toBe('being://e/0');
    expect(service.getSecurityMetrics().totalEvents).toBe(MAX);

    log(`being://e/${MAX}`, 'validation_failed');

    expect(service.getSecurityMetrics().totalEvents).toBe(MAX);
    expect(stored()[0]!.url).toBe('being://e/1');
  });

  it('recentEvents is the last 10 events, oldest first', () => {
    for (let i = 0; i < 1005; i++) log(`being://e/${i}`, 'validation_failed');

    const recent = service.getSecurityMetrics().recentEvents;

    expect(recent.map((e) => e.url)).toEqual(Array.from({ length: 10 }, (_, k) => `being://e/${995 + k}`));
  });

  it('stores at most the first 10 errors of one event', () => {
    const errors: LogError[] = Array.from({ length: 15 }, (_, i) => ({
      code: `E${i}`,
      message: 'synthetic',
      severity: 'low',
    }));

    log('being://e/errors', 'validation_failed', errors);

    const event = service.getSecurityMetrics().recentEvents[0] as { errors: LogError[] };
    expect(event.errors).toHaveLength(10);
    expect(event.errors.map((e) => e.code)).toEqual(errors.slice(0, 10).map((e) => e.code));
  });
});
