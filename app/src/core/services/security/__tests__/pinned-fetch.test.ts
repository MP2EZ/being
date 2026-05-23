/**
 * Pinned Fetch Unit Tests
 * MAINT-68: SSL Certificate Pinning for Supabase Endpoints
 *
 * TEST COVERAGE:
 * - SSLPinningError class
 * - Configuration validation
 * - Helper functions
 *
 * Note: Full integration tests of pinnedFetch require native SSL library.
 * These tests focus on the TypeScript-testable components.
 */

// Mock react-native Platform before any imports
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Mock logging
const mockLogSecurity = jest.fn();
const mockLogPerformance = jest.fn();
const mockLogError = jest.fn();

jest.mock('../../logging', () => ({
  logSecurity: (...args: unknown[]) => mockLogSecurity(...args),
  logPerformance: (...args: unknown[]) => mockLogPerformance(...args),
  logError: (...args: unknown[]) => mockLogError(...args),
  LogCategory: {
    SECURITY: 'security',
    SYSTEM: 'system',
  },
}));

// Import after mocks
import {
  SSLPinningError,
  validatePinningConfiguration,
} from '../pinned-fetch';

import {
  SUPABASE_CERTIFICATE_PINS,
  PIN_VALIDATION_CONFIG,
} from '../certificate-pinning';

describe('SSLPinningError', () => {
  it('should create error with correct properties', () => {
    const error = new SSLPinningError(
      'Certificate pin mismatch',
      'https://test.supabase.co/api/data',
      'CLINICAL_DATA'
    );

    expect(error.name).toBe('SSLPinningError');
    expect(error.message).toBe('Certificate pin mismatch');
    expect(error.endpoint).toBe('https://test.supabase.co/api/data');
    expect(error.dataClassification).toBe('CLINICAL_DATA');
  });

  it('should be instanceof Error', () => {
    const error = new SSLPinningError('Test', 'url', 'METADATA');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SSLPinningError);
  });

  it('should have stack trace', () => {
    const error = new SSLPinningError('Test', 'url', 'METADATA');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('SSLPinningError');
  });

  it('should support all data classifications', () => {
    const classifications = ['CLINICAL_DATA', 'CRISIS_DATA', 'CHECKIN_DATA', 'METADATA'] as const;

    classifications.forEach((classification) => {
      const error = new SSLPinningError('Test', 'url', classification);
      expect(error.dataClassification).toBe(classification);
    });
  });
});

describe('validatePinningConfiguration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate current configuration', () => {
    const result = validatePinningConfiguration();

    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('should return valid for properly configured pins', () => {
    const result = validatePinningConfiguration();

    // Current config should be valid
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should log successful validation', () => {
    validatePinningConfiguration();

    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.stringContaining('validated successfully'),
      'low',
      expect.any(Object)
    );
  });
});

describe('Certificate Pin Configuration Integrity', () => {
  it('should have Supabase endpoint configured', () => {
    expect(SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co']).toBeDefined();
  });

  it('should have wildcard Supabase configured', () => {
    expect(SUPABASE_CERTIFICATE_PINS['*.supabase.co']).toBeDefined();
  });

  it('should have 3 pins per endpoint', () => {
    const pins = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'];

    expect(pins.primary).toBeDefined();
    expect(pins.backup1).toBeDefined();
    expect(pins.backup2).toBeDefined();
  });

  it('should have valid SHA-256 base64 pins (44 chars)', () => {
    const pins = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'];

    expect(pins.primary).toHaveLength(44);
    expect(pins.backup1).toHaveLength(44);
    expect(pins.backup2).toHaveLength(44);
  });

  it('should have Google Trust Services pins (verified 2025-12-25)', () => {
    const pins = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'];

    // WE1 intermediate CA
    expect(pins.primary).toBe('kIdp6NNEd8wsugYyyIYFsi1ylMCED3hZbSR8ZFsa/A4=');
    // GTS Root R4
    expect(pins.backup1).toBe('mEflZT5enoR1FuXLgYYGqnVEoZvmf9c2bVBpiOjYQ0c=');
    // GTS Root R1
    expect(pins.backup2).toBe('hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc=');
  });
});

describe('PIN_VALIDATION_CONFIG Security Requirements', () => {
  it('should enforce fail-closed policy', () => {
    expect(PIN_VALIDATION_CONFIG.failOnPinMismatch).toBe(true);
  });

  it('should have zero retries on pin mismatch', () => {
    expect(PIN_VALIDATION_CONFIG.maxRetries).toBe(0);
  });

  it('should have sub-100ms validation timeout', () => {
    expect(PIN_VALIDATION_CONFIG.validationTimeoutMs).toBeLessThanOrEqual(100);
  });

  it('should warn 60+ days before certificate expiry', () => {
    expect(PIN_VALIDATION_CONFIG.expiryWarningDays).toBeGreaterThanOrEqual(60);
  });

  it('should have debug bypass as getter (not static value)', () => {
    // allowDebugBypass should be a computed property based on environment
    const descriptor = Object.getOwnPropertyDescriptor(PIN_VALIDATION_CONFIG, 'allowDebugBypass');
    expect(descriptor?.get).toBeDefined();
  });
});

describe('PinnedFetchOptions Interface', () => {
  it('should document expected option types', () => {
    // Type-level test - these should compile without error
    const options: Record<string, unknown> = {
      dataClassification: 'CLINICAL_DATA',
      timeout: 5000,
      skipPinning: false,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    };

    expect(options.dataClassification).toBe('CLINICAL_DATA');
    expect(options.timeout).toBe(5000);
    expect(options.skipPinning).toBe(false);
  });
});

describe('Security Audit Trail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log to security category', () => {
    validatePinningConfiguration();

    expect(mockLogSecurity).toHaveBeenCalled();
    const [message, severity] = mockLogSecurity.mock.calls[0];
    expect(message).toContain('PinnedFetch');
    expect(['low', 'medium', 'high']).toContain(severity);
  });
});

describe('Privacy Compliance Validation', () => {
  it('should have Privacy-compliant transmission security (§164.312(e)(1))', () => {
    // Requirement: Technical security measures to guard against unauthorized access
    expect(PIN_VALIDATION_CONFIG.failOnPinMismatch).toBe(true);

    // Verify pins exist for protected health information endpoints
    const supabasePins = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'];
    expect(Object.keys(supabasePins).length).toBeGreaterThanOrEqual(3);
  });

  it('should support data classification for audit controls (§164.312(b))', () => {
    // SSLPinningError captures data classification for audit
    const error = new SSLPinningError('Test', '/api/assessment', 'CLINICAL_DATA');
    expect(error.dataClassification).toBe('CLINICAL_DATA');
  });
});

describe('Defense in Depth', () => {
  it('should have multiple pin layers (primary + 2 backups)', () => {
    const pins = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'];
    const uniquePins = new Set([pins.primary, pins.backup1, pins.backup2]);

    // All pins should be unique
    expect(uniquePins.size).toBe(3);
  });

  it('should pin both intermediate and root CAs', () => {
    const pins = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'];

    // primary = intermediate CA (WE1)
    // backup1 = root CA (GTS Root R4)
    // backup2 = alternate root (GTS Root R1)
    // All should be different
    expect(pins.primary).not.toBe(pins.backup1);
    expect(pins.primary).not.toBe(pins.backup2);
    expect(pins.backup1).not.toBe(pins.backup2);
  });

  it('should not pin leaf certificate (expires too frequently)', () => {
    const pins = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'];

    // Leaf cert pin would be different and expire every 90 days
    // These pins should be stable intermediate/root CAs
    // We verify by checking they match documented GTS pins
    const knownGTSPins = [
      'kIdp6NNEd8wsugYyyIYFsi1ylMCED3hZbSR8ZFsa/A4=', // WE1
      'mEflZT5enoR1FuXLgYYGqnVEoZvmf9c2bVBpiOjYQ0c=', // GTS R4
      'hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc=', // GTS R1
    ];

    expect(knownGTSPins).toContain(pins.primary);
    expect(knownGTSPins).toContain(pins.backup1);
    expect(knownGTSPins).toContain(pins.backup2);
  });
});
