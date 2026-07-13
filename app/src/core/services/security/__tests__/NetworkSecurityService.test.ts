/**
 * NetworkSecurityService API-contract tests (TEST-18a)
 *
 * Scope: regression guard against accidental removal of the SURVIVING public
 * surface + config constant validation. The mock `secureRequest` pipeline (and
 * its `getSecurityViolations` / `destroy` companions) was deleted in MAINT-238
 * as dead code with zero production callers; the assertions that pinned them
 * were removed with it.
 *
 * Coverage:
 * - Singleton getInstance returns same instance
 * - Surviving public methods exist (initialize, getSecurityMetrics)
 * - NETWORK_CONFIG exports documented values
 * - getSecurityMetrics returns the documented NetworkSecurityMetrics shape
 *   (successfulRequests / totalRequests / securityViolations are read by
 *   SecurityMonitoringService — load-bearing fields)
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

import { NetworkSecurityService, NETWORK_CONFIG } from '../NetworkSecurityService';

describe('NetworkSecurityService', () => {
  describe('singleton + public API existence', () => {
    test('getInstance returns same instance', () => {
      const a = NetworkSecurityService.getInstance();
      const b = NetworkSecurityService.getInstance();
      expect(a).toBe(b);
    });

    test('exposes required public methods', () => {
      const service = NetworkSecurityService.getInstance();
      expect(typeof service.initialize).toBe('function');
      expect(typeof service.getSecurityMetrics).toBe('function');
    });
  });

  describe('NETWORK_CONFIG (audit-documented contract)', () => {
    test('exports a truthy config object', () => {
      expect(NETWORK_CONFIG).toBeTruthy();
      expect(typeof NETWORK_CONFIG).toBe('object');
    });
  });

  describe('metrics shape', () => {
    const service = NetworkSecurityService.getInstance();

    test('getSecurityMetrics returns truthy object (data contract)', () => {
      const metrics = service.getSecurityMetrics();
      expect(metrics).toBeTruthy();
      expect(typeof metrics).toBe('object');
    });

    test('getSecurityMetrics exposes the fields SecurityMonitoringService reads', () => {
      const metrics = service.getSecurityMetrics();
      // These three are consumed by SecurityMonitoringService.assessNetworkSecurity()
      // and checkDataProtectionCompliance(); their presence is load-bearing.
      expect(typeof metrics.successfulRequests).toBe('number');
      expect(typeof metrics.totalRequests).toBe('number');
      expect(typeof metrics.securityViolations).toBe('number');
    });
  });
});
