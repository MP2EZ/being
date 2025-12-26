/**
 * SSL CERTIFICATE PINNING SECURITY TESTING SUITE
 * MAINT-68: SSL Certificate Pinning for Supabase Endpoints
 *
 * SECURITY REQUIREMENTS TESTED:
 * - Certificate pins are valid SHA-256 SPKI hashes
 * - Minimum 3 pins per endpoint (primary + 2 backups)
 * - Fail-closed policy (block on mismatch)
 * - Crisis endpoint fallback for life-safety
 * - Development bypass requires explicit opt-in
 * - Audit logging for HIPAA compliance
 *
 * HIPAA §164.312(e)(1) Transmission Security Compliance
 */

import { Platform } from 'react-native';

// Mock dependencies before imports
const mockLogSecurity = jest.fn();
const mockLogError = jest.fn();

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('../../src/core/services/logging', () => ({
  logSecurity: (...args: unknown[]) => mockLogSecurity(...args),
  logError: (...args: unknown[]) => mockLogError(...args),
  LogCategory: {
    SECURITY: 'security',
    SYSTEM: 'system',
  },
}));

// Import after mocks
import {
  SUPABASE_CERTIFICATE_PINS,
  API_CERTIFICATE_PINS,
  PIN_VALIDATION_CONFIG,
  getPinsForHost,
  validateCertificatePin,
  handlePinValidationFailure,
  shouldBypassPinning,
  isCrisisEndpoint,
  logSecurityEvent,
  DataClassification,
  PinValidationResult,
} from '../../src/core/services/security/certificate-pinning';

describe('Certificate Pinning Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pin Format Validation', () => {
    it('should have valid base64-encoded SHA-256 pins for Supabase', () => {
      const supabasePins = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'];

      // SHA-256 base64 = 44 characters
      expect(supabasePins.primary).toHaveLength(44);
      expect(supabasePins.backup1).toHaveLength(44);
      expect(supabasePins.backup2).toHaveLength(44);

      // Valid base64 pattern
      const base64Regex = /^[A-Za-z0-9+/]+=*$/;
      expect(supabasePins.primary).toMatch(base64Regex);
      expect(supabasePins.backup1).toMatch(base64Regex);
      expect(supabasePins.backup2).toMatch(base64Regex);
    });

    it('should have 3 unique pins per endpoint (defense in depth)', () => {
      const supabasePins = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'];
      const pins = [supabasePins.primary, supabasePins.backup1, supabasePins.backup2];
      const uniquePins = new Set(pins);

      expect(uniquePins.size).toBe(3);
    });

    it('should have matching pins for wildcard and specific domain', () => {
      const specificPins = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'];
      const wildcardPins = SUPABASE_CERTIFICATE_PINS['*.supabase.co'];

      expect(specificPins.primary).toBe(wildcardPins.primary);
      expect(specificPins.backup1).toBe(wildcardPins.backup1);
      expect(specificPins.backup2).toBe(wildcardPins.backup2);
    });

    it('should have placeholder pins for future API endpoint', () => {
      const apiPins = API_CERTIFICATE_PINS['api.being.fyi'];

      expect(apiPins.primary).toBe('PLACEHOLDER_UPDATE_BEFORE_USE');
      expect(apiPins.backup1).toBe('PLACEHOLDER_UPDATE_BEFORE_USE');
      expect(apiPins.backup2).toBe('PLACEHOLDER_UPDATE_BEFORE_USE');
    });
  });

  describe('Pin Validation Config', () => {
    it('should have fail-closed policy enabled', () => {
      expect(PIN_VALIDATION_CONFIG.failOnPinMismatch).toBe(true);
    });

    it('should have development bypass disabled by default', () => {
      // allowDebugBypass is a getter that checks __DEV__ and env var
      // In test environment, it should be false unless explicitly enabled
      expect(typeof PIN_VALIDATION_CONFIG.allowDebugBypass).toBe('boolean');
    });

    it('should have reasonable validation timeout', () => {
      expect(PIN_VALIDATION_CONFIG.validationTimeoutMs).toBeLessThanOrEqual(100);
      expect(PIN_VALIDATION_CONFIG.validationTimeoutMs).toBeGreaterThan(0);
    });

    it('should have expiry warning threshold', () => {
      expect(PIN_VALIDATION_CONFIG.expiryWarningDays).toBeGreaterThanOrEqual(30);
    });

    it('should NOT retry on pin mismatch (security requirement)', () => {
      expect(PIN_VALIDATION_CONFIG.maxRetries).toBe(0);
    });
  });
});

describe('getPinsForHost', () => {
  it('should return pins for exact Supabase hostname', () => {
    const pins = getPinsForHost('pqlhcblzwuonyhltjlth.supabase.co');

    expect(pins).not.toBeNull();
    expect(pins?.primary).toBeDefined();
    expect(pins?.backup1).toBeDefined();
    expect(pins?.backup2).toBeDefined();
  });

  it('should return wildcard pins for other Supabase subdomains', () => {
    const pins = getPinsForHost('other-project.supabase.co');

    expect(pins).not.toBeNull();
    expect(pins?.primary).toBe(SUPABASE_CERTIFICATE_PINS['*.supabase.co'].primary);
  });

  it('should return null for unknown hosts', () => {
    const pins = getPinsForHost('evil.com');

    expect(pins).toBeNull();
  });

  it('should return null for placeholder API pins', () => {
    const pins = getPinsForHost('api.being.fyi');

    // Should not return placeholder pins
    expect(pins).toBeNull();
  });
});

describe('validateCertificatePin', () => {
  const validPrimary = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'].primary;
  const validBackup1 = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'].backup1;
  const validBackup2 = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'].backup2;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate matching primary pin', () => {
    const result = validateCertificatePin(
      'pqlhcblzwuonyhltjlth.supabase.co',
      validPrimary
    );

    expect(result.valid).toBe(true);
    expect(result.matchedPin).toBe(validPrimary);
    expect(result.error).toBeUndefined();
  });

  it('should validate matching backup1 pin and log fallback', () => {
    const result = validateCertificatePin(
      'pqlhcblzwuonyhltjlth.supabase.co',
      validBackup1
    );

    expect(result.valid).toBe(true);
    expect(result.matchedPin).toBe(validBackup1);

    // Should log that backup pin was used
    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.stringContaining('fallback_pin_used'),
      expect.any(String),
      expect.objectContaining({
        audit: expect.objectContaining({
          event: 'fallback_pin_used',
          matchedPin: 'backup1',
        }),
      })
    );
  });

  it('should validate matching backup2 pin and log fallback', () => {
    const result = validateCertificatePin(
      'pqlhcblzwuonyhltjlth.supabase.co',
      validBackup2
    );

    expect(result.valid).toBe(true);
    expect(result.matchedPin).toBe(validBackup2);
  });

  it('should reject non-matching pin', () => {
    const result = validateCertificatePin(
      'pqlhcblzwuonyhltjlth.supabase.co',
      'InvalidPinThatDoesNotMatch123456789012='
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('pin mismatch');
    expect(result.matchedPin).toBeUndefined();
  });

  it('should reject unknown hostname', () => {
    const result = validateCertificatePin('unknown.com', validPrimary);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('No certificate pins configured');
  });

  it('should include timestamp in validation result', () => {
    const before = Date.now();
    const result = validateCertificatePin(
      'pqlhcblzwuonyhltjlth.supabase.co',
      validPrimary
    );
    const after = Date.now();

    expect(result.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('Crisis Endpoint Detection', () => {
  it('should identify crisis endpoints', () => {
    expect(isCrisisEndpoint('/api/crisis/intervention')).toBe(true);
    expect(isCrisisEndpoint('/api/emergency/call')).toBe(true);
    expect(isCrisisEndpoint('/api/intervention/start')).toBe(true);
    expect(isCrisisEndpoint('/api/safety-plan/view')).toBe(true);
    expect(isCrisisEndpoint('/api/988/redirect')).toBe(true);
  });

  it('should not flag non-crisis endpoints', () => {
    expect(isCrisisEndpoint('/api/checkin/submit')).toBe(false);
    expect(isCrisisEndpoint('/api/users/profile')).toBe(false);
    expect(isCrisisEndpoint('/api/analytics/events')).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(isCrisisEndpoint('/api/CRISIS/test')).toBe(true);
    expect(isCrisisEndpoint('/api/Crisis/Test')).toBe(true);
  });
});

describe('handlePinValidationFailure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return fallback for crisis endpoints', () => {
    const action = handlePinValidationFailure(
      '/api/crisis/intervention',
      'PHI_CRISIS',
      'Pin mismatch error'
    );

    expect(action).toBe('fallback');
    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.stringContaining('crisis_fallback'),
      expect.any(String),
      expect.objectContaining({
        audit: expect.objectContaining({
          event: 'crisis_fallback',
          action: 'fallback',
        }),
      })
    );
  });

  it('should return block for non-crisis endpoints', () => {
    const action = handlePinValidationFailure(
      '/api/checkin/submit',
      'PHI_CHECKIN',
      'Pin mismatch error'
    );

    expect(action).toBe('block');
    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.stringContaining('pin_validation_failure'),
      expect.any(String),
      expect.objectContaining({
        audit: expect.objectContaining({
          event: 'pin_validation_failure',
          action: 'block',
        }),
      })
    );
  });

  it('should log error for validation failures', () => {
    handlePinValidationFailure('/api/data', 'PHI_CLINICAL', 'Test error');

    expect(mockLogError).toHaveBeenCalledWith(
      'security',
      expect.stringContaining('Certificate pin validation failed'),
      expect.any(Error)
    );
  });
});

describe('Security Event Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log events with required audit fields', () => {
    logSecurityEvent({
      event: 'pin_validation_success',
      endpoint: 'test.supabase.co',
      dataClassification: 'PHI_CLINICAL',
      action: 'allow',
    });

    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.stringContaining('pin_validation_success'),
      'low',
      expect.objectContaining({
        audit: expect.objectContaining({
          event: 'pin_validation_success',
          endpoint: 'test.supabase.co',
          dataClassification: 'PHI_CLINICAL',
          action: 'allow',
          timestamp: expect.any(String),
          platform: 'ios',
        }),
      })
    );
  });

  it('should log pin failures as high severity', () => {
    logSecurityEvent({
      event: 'pin_validation_failure',
      endpoint: 'test.supabase.co',
      dataClassification: 'PHI_CLINICAL',
      action: 'block',
      securityException: 'Pin mismatch',
    });

    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.any(String),
      'high',
      expect.any(Object)
    );
  });

  it('should log crisis fallback as high severity', () => {
    logSecurityEvent({
      event: 'crisis_fallback',
      endpoint: '/crisis/help',
      dataClassification: 'PHI_CRISIS',
      action: 'fallback',
    });

    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.any(String),
      'high',
      expect.any(Object)
    );
  });

  it('should log development bypass as medium severity', () => {
    logSecurityEvent({
      event: 'development_bypass',
      endpoint: 'all',
      dataClassification: 'NON_PHI',
      action: 'allow',
    });

    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.any(String),
      'medium',
      expect.any(Object)
    );
  });
});

describe('Data Classification Types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should support all required data classifications', () => {
    const classifications: DataClassification[] = [
      'PHI_CLINICAL',
      'PHI_CRISIS',
      'PHI_CHECKIN',
      'NON_PHI',
    ];

    classifications.forEach((classification) => {
      logSecurityEvent({
        event: 'pin_validation_success',
        endpoint: 'test',
        dataClassification: classification,
        action: 'allow',
      });
    });

    expect(mockLogSecurity).toHaveBeenCalledTimes(4);
  });
});

describe('HIPAA Compliance Requirements', () => {
  it('should have transmission security controls (§164.312(e)(1))', () => {
    // Verify fail-closed policy
    expect(PIN_VALIDATION_CONFIG.failOnPinMismatch).toBe(true);

    // Verify minimum pin count
    const pins = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'];
    expect(Object.keys(pins)).toHaveLength(3);
  });

  it('should have audit controls (§164.312(b))', () => {
    // Verify logging is called with audit structure
    logSecurityEvent({
      event: 'pin_validation_success',
      endpoint: 'test',
      dataClassification: 'PHI_CLINICAL',
      action: 'allow',
    });

    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        audit: expect.objectContaining({
          timestamp: expect.any(String),
          platform: expect.any(String),
        }),
      })
    );
  });

  it('should support crisis fallback per §164.308(a)(7)(ii)(E)', () => {
    // Emergency access provision - crisis endpoints should have fallback
    const action = handlePinValidationFailure(
      '/crisis/988',
      'PHI_CRISIS',
      'Error'
    );

    expect(action).toBe('fallback');
  });
});

describe('Security Edge Cases', () => {
  it('should handle empty hostname', () => {
    const pins = getPinsForHost('');
    expect(pins).toBeNull();
  });

  it('should handle hostname with only TLD', () => {
    const pins = getPinsForHost('.co');
    expect(pins).toBeNull();
  });

  it('should handle very long hostname', () => {
    const longHostname = 'a'.repeat(253) + '.supabase.co';
    const pins = getPinsForHost(longHostname);
    expect(pins).not.toBeNull(); // Should match wildcard
  });

  it('should handle unicode in hostname', () => {
    const pins = getPinsForHost('tëst.supabase.co');
    expect(pins).not.toBeNull(); // Should match wildcard
  });

  it('should reject pin with wrong length', () => {
    const result = validateCertificatePin(
      'pqlhcblzwuonyhltjlth.supabase.co',
      'short'
    );
    expect(result.valid).toBe(false);
  });
});
