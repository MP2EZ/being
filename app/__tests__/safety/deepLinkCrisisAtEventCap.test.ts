/**
 * The crisis deep link stays valid when the security event log is full
 * (MAINT-749 / TEST-66, crisis ruling).
 *
 * `being://crisis` must resolve however many hostile links came before it. The
 * event log is capped at 1000 (DeepLinkValidationService.MAX_SECURITY_EVENTS);
 * this pins that a log AT the cap neither rejects nor delays the crisis link,
 * and that a failing link arriving at the cap does not throw or grow the log.
 * Fixtures are synthetic (`being://e/N`).
 */
import { DeepLinkValidationService } from '../../src/core/services/security/DeepLinkValidationService';

jest.mock('../../src/core/services/logging', () => ({
  logSecurity: jest.fn(),
  logError: jest.fn(),
  LogCategory: { SECURITY: 'security', ERROR: 'error' },
}));

describe('being://crisis with the deep-link event log at the cap', () => {
  const service = DeepLinkValidationService.getInstance();
  const fill = (n: number) => {
    const log = (service as unknown as { logSecurityEvent: (u: string, t: string, e: unknown[]) => void }).logSecurityEvent;
    for (let i = 0; i < n; i++) log.call(service, `being://e/${i}`, 'validation_failed', []);
  };

  beforeEach(() => service.clearSecurityEvents());
  afterEach(() => service.clearSecurityEvents());

  it('control: the crisis link is valid on an empty log', () => {
    const result = service.validateDeepLink('being://crisis');

    expect(result.isValid).toBe(true);
    expect(result.sanitizedUrl).toBe('being://crisis');
  });

  it('is still valid, with no errors, when the log is already full', () => {
    fill(1005);
    expect(service.getSecurityMetrics().totalEvents).toBe(1000); // precondition: at the cap

    const result = service.validateDeepLink('being://crisis');

    expect(result.isValid).toBe(true);
    expect(result.sanitizedUrl).toBe('being://crisis');
    expect(result.errors).toHaveLength(0);
  });

  it('a rejected link at the cap is logged without throwing and the log stays at 1000', () => {
    fill(1000);

    const bad = service.validateDeepLink('javascript:alert(1)');
    const crisis = service.validateDeepLink('being://crisis');

    expect(bad.isValid).toBe(false);
    expect(service.getSecurityMetrics().totalEvents).toBe(1000);
    expect(crisis.isValid).toBe(true);
  });
});
