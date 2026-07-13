/**
 * CrisisSecurityProtocol behavioral tests (TEST-17 → reduced in MAINT-237)
 *
 * Protected Path. MAINT-237 stripped this module to the surface actually
 * consumed by `SecurityMonitoringService`: getInstance / initialize /
 * getCrisisSecurityMetrics / destroy / __resetForTesting__. The
 * grant/protect/validate/detect machinery (and its encryption-layer-count
 * contract tests) was deleted as grep-confirmed-unreachable theater, so the
 * tests that exercised it are gone too.
 *
 * Surviving coverage:
 * 1. Singleton identity + surviving public API exist (regression guard)
 * 2. initialize() resolves without throwing (it's awaited in the
 *    SecurityMonitoringService init chain)
 * 3. getCrisisSecurityMetrics() returns truthful numeric zeros for the
 *    retired signals (no writer → 0), in the shape the consumer reads
 * 4. destroy() is idempotent
 * 5. __resetForTesting__() throws outside NODE_ENV=test (MAINT-190 guard)
 */

// Break the downstream service import chain. Each underlying service has
// heavy side effects (key-rotation setInterval, native module access) that
// hang Jest unless mocked.
jest.mock('@/core/services/security/EncryptionService', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/core/services/security/AuthenticationService', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/core/services/security/NetworkSecurityService', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(undefined),
  },
}));

import { CrisisSecurityProtocol } from '../CrisisSecurityProtocol';

describe('CrisisSecurityProtocol (reduced surface — MAINT-237)', () => {
  const protocol = CrisisSecurityProtocol.getInstance();

  describe('public API existence (regression guard)', () => {
    test('singleton getInstance returns the same instance', () => {
      const a = CrisisSecurityProtocol.getInstance();
      const b = CrisisSecurityProtocol.getInstance();
      expect(a).toBe(b);
    });

    test('exposes the surviving public methods', () => {
      expect(typeof protocol.initialize).toBe('function');
      expect(typeof protocol.getCrisisSecurityMetrics).toBe('function');
      expect(typeof protocol.destroy).toBe('function');
      expect(typeof CrisisSecurityProtocol.__resetForTesting__).toBe('function');
    });
  });

  describe('initialize', () => {
    test('resolves without throwing (consumed in the init chain)', async () => {
      await expect(protocol.initialize()).resolves.toBeUndefined();
    });
  });

  describe('getCrisisSecurityMetrics', () => {
    beforeAll(async () => {
      await protocol.initialize();
    });

    test('returns truthful numeric zeros for the retired signals', async () => {
      const metrics = await protocol.getCrisisSecurityMetrics();
      expect(typeof metrics.securityViolations).toBe('number');
      expect(typeof metrics.averageAccessTime).toBe('number');
      // No writer exists for either signal after MAINT-237 → honest zeros.
      expect(metrics.securityViolations).toBe(0);
      expect(metrics.averageAccessTime).toBe(0);
    });
  });

  describe('__resetForTesting__ production guard (MAINT-190)', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('throws when NODE_ENV is not test', () => {
      process.env.NODE_ENV = 'production';
      expect(() => CrisisSecurityProtocol.__resetForTesting__()).toThrow(
        /refusing to clear crisis-monitoring state in production/i
      );
    });

    test('does not throw under NODE_ENV=test', () => {
      process.env.NODE_ENV = 'test';
      expect(() => CrisisSecurityProtocol.__resetForTesting__()).not.toThrow();
    });
  });

  describe('cleanup', () => {
    test('destroy is idempotent (no throw on second call)', async () => {
      await expect(protocol.destroy()).resolves.toBeUndefined();
      await expect(protocol.destroy()).resolves.toBeUndefined();
    });
  });
});
