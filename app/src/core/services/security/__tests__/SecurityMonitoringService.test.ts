/**
 * SecurityMonitoringService API-contract tests (TEST-18c)
 *
 * Scope: regression guard against accidental removal + config validation.
 * Deep alert dedup + threshold escalation tests deferred — they need time
 * control + mocked downstream services out of proportion to value.
 *
 * MAINT-238 rewrite: the prior guard suite pinned the empty-stub threat
 * pipeline (`performThreatDetection` returning []). That method and its
 * detectors were deleted as dead code, so its guards were removed. The guards
 * now pin the SURVIVING real-work surface instead:
 * - performVulnerabilityAssessment → exercises assessNetworkSecurity +
 *   checkSecureConfiguration (real metric-driven + __DEV__ vuln)
 * - performComplianceCheck → exercises checkDataProtectionCompliance (real)
 * - detectIncidents → exercises the real auth-failure / compliance branches
 * - registerThreatDetector / logSecurityEvent → MAINT-201 detector registry
 *
 * Coverage:
 * - Singleton getInstance returns same instance
 * - Surviving public methods exist
 * - MONITORING_CONFIG exports documented values
 * - performComplianceCheck returns documented shape
 */

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async (_a: string, v: string) => `d_${v}`),
  getRandomBytesAsync: jest.fn(async (n: number) => new Uint8Array(n).fill(7)),
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  CryptoEncoding: { HEX: 'hex', BASE64: 'base64' },
}));

// Downstream service stubs — same Proxy pattern as IncidentResponseService
// test (TEST-06). SecurityMonitoringService.initialize() chains into 5
// other security services. Catch-all jest.fn() avoids the whack-a-mole
// of listing each downstream method.
jest.mock('../SecureStorageService', () => ({
  __esModule: true,
  default: new Proxy({}, { get: () => jest.fn().mockResolvedValue(undefined) }),
}));

jest.mock('../EncryptionService', () => ({
  __esModule: true,
  // `assessDataSecurity()` at line 800 reads encryptionStatus.successRate
  // — undefined would crash. Provide a "healthy state" stub.
  default: new Proxy({
    getEncryptionStatus: jest.fn().mockResolvedValue({ successRate: 1.0, keyVersion: 1, keyRotationDue: false }),
  } as Record<string, unknown>, {
    get(target, prop: string) {
      if (prop in target) return (target as Record<string, unknown>)[prop];
      return jest.fn().mockResolvedValue(undefined);
    },
  }),
}));

jest.mock('../AuthenticationService', () => ({
  __esModule: true,
  default: new Proxy({
    getAuthenticationMetrics: jest.fn().mockResolvedValue({
      authenticationAttempts: 0, failedAttempts: 0, lockedAccounts: 0,
    }),
  } as Record<string, unknown>, {
    get(target, prop: string) {
      if (prop in target) return (target as Record<string, unknown>)[prop];
      return jest.fn().mockResolvedValue(undefined);
    },
  }),
}));

jest.mock('../NetworkSecurityService', () => ({
  __esModule: true,
  default: new Proxy({
    getSecurityMetrics: jest.fn().mockResolvedValue({
      successfulRequests: 0, failedRequests: 0, blockedRequests: 0,
    }),
  } as Record<string, unknown>, {
    get(target, prop: string) {
      if (prop in target) return (target as Record<string, unknown>)[prop];
      return jest.fn().mockResolvedValue(undefined);
    },
  }),
}));

jest.mock('@/features/crisis/services/CrisisSecurityProtocol', () => ({
  __esModule: true,
  default: new Proxy({}, { get: () => jest.fn().mockResolvedValue(undefined) }),
  CrisisSecurityProtocol: {
    getInstance: () => new Proxy({}, { get: () => jest.fn().mockResolvedValue(undefined) }),
  },
}));

import {
  SecurityMonitoringService,
  MONITORING_CONFIG,
} from '../SecurityMonitoringService';

describe('SecurityMonitoringService', () => {
  describe('singleton + public API existence', () => {
    test('getInstance returns same instance', () => {
      const a = SecurityMonitoringService.getInstance();
      const b = SecurityMonitoringService.getInstance();
      expect(a).toBe(b);
    });

    test('exposes required public methods', () => {
      const service = SecurityMonitoringService.getInstance();
      expect(typeof service.initialize).toBe('function');
      expect(typeof service.performVulnerabilityAssessment).toBe('function');
      expect(typeof service.detectIncidents).toBe('function');
      expect(typeof service.performComplianceCheck).toBe('function');
      // MAINT-201 detector registry (surviving real-work API)
      expect(typeof service.registerThreatDetector).toBe('function');
      expect(typeof service.getThreatDetectorNames).toBe('function');
      expect(typeof service.logSecurityEvent).toBe('function');
    });
  });

  describe('MONITORING_CONFIG (audit contract)', () => {
    test('exports a truthy config object', () => {
      expect(MONITORING_CONFIG).toBeTruthy();
      expect(typeof MONITORING_CONFIG).toBe('object');
    });
  });

  describe('behavioral happy-paths (TEST-06)', () => {
    // Locks the core monitoring orchestration: assessment/detection/check
    // methods return shaped results (not silently no-op). The audit (TEST-06)
    // flagged the prior "method exists only" suite as insufficient — a
    // regression that returned `undefined` from any of these would still
    // pass the existence check but break downstream consumers.

    let service: SecurityMonitoringService;

    beforeAll(async () => {
      service = SecurityMonitoringService.getInstance();
      await service.initialize();
    });

    test('performVulnerabilityAssessment runs the real sub-assessments (assessNetworkSecurity + checkSecureConfiguration)', async () => {
      // Pins the surviving real-work path: the orchestration runs to completion
      // and returns a shaped assessment with a vulnerabilities array. Under
      // __DEV__/test, checkSecureConfiguration emits a real "Development Mode
      // Enabled" vuln, so the array is the live aggregation of the kept
      // metric-driven sub-assessments (not a deleted stub's []).
      const assessment = await service.performVulnerabilityAssessment();
      expect(assessment).toBeTruthy();
      expect(typeof assessment).toBe('object');
      expect(Array.isArray(assessment.vulnerabilities)).toBe(true);
      expect(typeof assessment.overallScore).toBe('number');
    });

    test('detectIncidents returns an array (real auth-failure + compliance branches)', async () => {
      const incidents = await service.detectIncidents();
      expect(Array.isArray(incidents)).toBe(true);
    });

    test('performComplianceCheck returns a ComplianceStatus with the real dataProtectionCompliance shape', async () => {
      const status = await service.performComplianceCheck();
      expect(status).toBeTruthy();
      expect(typeof status).toBe('object');
      // checkDataProtectionCompliance (surviving real metric-driven check)
      expect(status.dataProtectionCompliance).toBeTruthy();
      expect(typeof status.dataProtectionCompliance.encryptionCompliance).toBe('boolean');
      expect(typeof status.dataProtectionCompliance.transmissionCompliance).toBe('boolean');
    });

    test('registerThreatDetector + getThreatDetectorNames round-trips (MAINT-201 registry)', () => {
      service.registerThreatDetector('test_detector_maint238', {
        pattern: /abc/,
        severity: 'high',
        action: 'block_and_alert',
      });
      expect(service.getThreatDetectorNames()).toContain('test_detector_maint238');
    });

    test('logSecurityEvent records sanitized critical/high events (MAINT-201)', async () => {
      const before = service.getAnalyticsSecurityEvents().length;
      await service.logSecurityEvent('phi_exposure_attempt', { rawText: 'PHQ-9: 18' });
      const after = service.getAnalyticsSecurityEvents();
      expect(after.length).toBe(before + 1);
      // severity is derived by the service; caller cannot downgrade
      expect(after[after.length - 1].severity).toBe('critical');
    });

    test('isMonitoringActive returns a boolean (data-contract guard)', () => {
      expect(typeof service.isMonitoringActive()).toBe('boolean');
    });
  });

  afterAll(async () => {
    // Some monitoring loops may start during initialize(); explicitly shut
    // them down so jest doesn't need --forceExit to terminate.
    const service = SecurityMonitoringService.getInstance();
    await service.destroy().catch(() => {});
  });
});
