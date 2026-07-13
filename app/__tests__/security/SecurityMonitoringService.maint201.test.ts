/**
 * SECURITY MONITORING SERVICE — MAINT-201
 * Threat-detector registry + analytics security-event logging (sanitization,
 * severity gating, no-throw). Isolated file so the logging mock (needed to inspect
 * log sinks) doesn't affect the existing suite.
 *
 * Isolation note: each test operates on a fresh `getInstance()` captured after
 * `__resetForTesting__()`. The reset nulls the static instance, so the default
 * export would go stale across tests — using getInstance() guarantees clean state.
 */

import { jest } from '@jest/globals';

jest.mock('@/core/services/logging', () => ({
  logError: jest.fn(),
  logSecurity: jest.fn(),
  logPerformance: jest.fn(),
  logAnalytics: jest.fn(),
  LogCategory: { SECURITY: 'security', ANALYTICS: 'analytics', SYSTEM: 'system' },
}));

import { logSecurity, logError } from '@/core/services/logging';
import { SecurityMonitoringService as SMSClass } from '@/core/services/security/SecurityMonitoringService';

const RAW = 'PHQ-9: 18';
const allLogText = () =>
  JSON.stringify([
    ...(logSecurity as jest.Mock).mock.calls,
    ...(logError as jest.Mock).mock.calls,
  ]);

type SMS = ReturnType<typeof SMSClass.getInstance>;

describe('SecurityMonitoringService — MAINT-201', () => {
  let svc: SMS;

  beforeEach(() => {
    SMSClass.__resetForTesting__();
    svc = SMSClass.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    SMSClass.__resetForTesting__();
  });

  describe('registerThreatDetector', () => {
    it('stores a named detector', () => {
      svc.registerThreatDetector('analytics_phi_exposure', {
        pattern: /PHQ/gi,
        severity: 'critical',
        action: 'block_and_alert',
      });
      expect(svc.getThreatDetectorNames()).toContain('analytics_phi_exposure');
    });

    it('overwrites a detector re-registered under the same name', () => {
      svc.registerThreatDetector('d', { pattern: /a/, severity: 'critical', action: 'block_and_alert' });
      svc.registerThreatDetector('d', { pattern: /b/, severity: 'high', action: 'alert_and_obfuscate' });
      expect(svc.getThreatDetectorNames()).toEqual(['d']);
    });
  });

  describe('logSecurityEvent', () => {
    it('never forwards raw wellness data to the log sinks', async () => {
      await svc.logSecurityEvent('phi_exposure_attempt', { rawText: RAW });
      expect(allLogText()).not.toContain(RAW);
      expect(allLogText()).not.toContain('PHQ-9');
    });

    it('records a critical event without leaking the raw value', async () => {
      await svc.logSecurityEvent('phi_exposure_attempt', { rawText: RAW });
      const events = svc.getAnalyticsSecurityEvents();
      expect(events).toHaveLength(1);
      expect(events[0].severity).toBe('critical');
      expect(JSON.stringify(events[0])).not.toContain('PHQ-9');
    });

    it('does not record a low/medium-severity event', async () => {
      await svc.logSecurityEvent('something_minor', { foo: 'bar' });
      expect(svc.getAnalyticsSecurityEvents()).toHaveLength(0);
    });

    it('never throws on wellness-data-bearing input', async () => {
      await expect(
        svc.logSecurityEvent('phi_exposure_attempt', {
          rawText: 'GAD-7 score: 21',
          email: 'user@example.com',
          note: 'suicidal',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('__resetForTesting__', () => {
    it('clears the threat-detector registry and recorded events', async () => {
      svc.registerThreatDetector('x', { pattern: /x/, severity: 'low', action: 'rotate_sessions' });
      await svc.logSecurityEvent('phi_exposure_attempt', { rawText: RAW });
      expect(svc.getThreatDetectorNames()).toHaveLength(1);
      expect(svc.getAnalyticsSecurityEvents()).toHaveLength(1);

      SMSClass.__resetForTesting__();
      const fresh = SMSClass.getInstance();

      expect(fresh.getThreatDetectorNames()).toHaveLength(0);
      expect(fresh.getAnalyticsSecurityEvents()).toHaveLength(0);
    });
  });
});
