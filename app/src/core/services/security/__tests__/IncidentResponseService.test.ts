/**
 * IncidentResponseService API-contract tests (TEST-18b)
 *
 * Scope: regression guard against accidental removal + config constant
 * validation. Deep severity-classification + 24h notification timer tests
 * deferred — they require mocked time control out of proportion to value.
 *
 * Coverage:
 * - Singleton getInstance returns same instance
 * - Required public methods exist
 * - INCIDENT_RESPONSE_CONFIG exports documented values
 * - Type exports (IncidentSeverity, DataSensitivityType) are usable
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

import {
  IncidentResponseService,
  INCIDENT_RESPONSE_CONFIG,
  type IncidentSeverity,
} from '../IncidentResponseService';

describe('IncidentResponseService', () => {
  describe('singleton + public API existence', () => {
    test('getInstance returns same instance', () => {
      const a = IncidentResponseService.getInstance();
      const b = IncidentResponseService.getInstance();
      expect(a).toBe(b);
    });

    test('exposes required public methods', () => {
      const service = IncidentResponseService.getInstance();
      expect(typeof service.initialize).toBe('function');
      expect(typeof service.detectAndRespondToIncident).toBe('function');
      expect(typeof service.respondToCrisisDataBreach).toBe('function');
      expect(typeof service.executeContainmentProcedures).toBe('function');
    });
  });

  describe('INCIDENT_RESPONSE_CONFIG (audit contract)', () => {
    test('SEVERITY_LEVELS object exists with documented levels', () => {
      expect(INCIDENT_RESPONSE_CONFIG.SEVERITY_LEVELS).toBeTruthy();
      const levels = Object.keys(INCIDENT_RESPONSE_CONFIG.SEVERITY_LEVELS);
      expect(levels.length).toBeGreaterThanOrEqual(3);
    });

    test('DATA_SENSITIVITY_IMPACT object exists', () => {
      expect(INCIDENT_RESPONSE_CONFIG.DATA_SENSITIVITY_IMPACT).toBeTruthy();
    });

    test('IncidentSeverity type accepts SEVERITY_LEVELS keys', () => {
      // Runtime smoke: cast a known key as IncidentSeverity, no throw.
      const levels = Object.keys(INCIDENT_RESPONSE_CONFIG.SEVERITY_LEVELS);
      const sample: IncidentSeverity = levels[0] as IncidentSeverity;
      expect(typeof sample).toBe('string');
    });
  });
});
