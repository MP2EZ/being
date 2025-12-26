/**
 * SSL Certificate Pinning Configuration
 * MAINT-68: Implement SSL certificate pinning for Supabase endpoints
 *
 * HIPAA §164.312(e)(1) Transmission Security Compliance
 * Defense-in-depth against Man-in-the-Middle (MITM) attacks
 *
 * SECURITY REQUIREMENTS:
 * - Minimum 3 pins per endpoint (1 primary + 2 backup)
 * - Pin intermediate CA + root CA (NOT leaf certificates)
 * - Fail-closed policy: reject connection on pin mismatch
 * - Crisis endpoint fallback for life-safety (per compliance)
 *
 * PIN UPDATE PROCEDURE:
 * 1. Run: npm run security:check-pins (quarterly review)
 * 2. Extract new pins using openssl (see docs/security/certificate-pinning-procedures.md)
 * 3. Update pins below, keeping old pins as backups
 * 4. Deploy via OTA update for emergency rotation
 *
 * Last Updated: 2025-12-25
 * Next Review: 2026-03-25
 */

import { Platform } from 'react-native';
import { logSecurity, logError, LogCategory } from '../logging';

/**
 * Certificate pins for Supabase endpoints
 *
 * Supabase uses Google Trust Services (GTS) for TLS.
 * Pins are SHA-256 hashes of the Subject Public Key Info (SPKI)
 *
 * Current certificate chain (verified 2025-12-25):
 * - Leaf: supabase.co (issued by WE1)
 * - Intermediate: WE1 (Google Trust Services, issued by GTS Root R4)
 * - Root: GTS Root R4 (cross-signed by GlobalSign Root CA)
 *
 * IMPORTANT: Verify pins before production deployment:
 * openssl s_client -connect pqlhcblzwuonyhltjlth.supabase.co:443 -servername pqlhcblzwuonyhltjlth.supabase.co -showcerts
 */
export const SUPABASE_CERTIFICATE_PINS = {
  /**
   * Supabase production endpoint
   * Host: pqlhcblzwuonyhltjlth.supabase.co
   */
  'pqlhcblzwuonyhltjlth.supabase.co': {
    // WE1 - Google Trust Services Intermediate CA (current chain)
    // Expires: 2029-02-20 (certificate validity)
    primary: 'kIdp6NNEd8wsugYyyIYFsi1ylMCED3hZbSR8ZFsa/A4=',

    // GTS Root R4 - Google Trust Services Root CA (current chain root)
    // Cross-signed by GlobalSign Root CA
    backup1: 'mEflZT5enoR1FuXLgYYGqnVEoZvmf9c2bVBpiOjYQ0c=',

    // GTS Root R1 - Alternative Google Trust Services Root
    // Used as backup in case of CA rotation within Google PKI
    backup2: 'hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc=',
  },

  /**
   * Wildcard for any Supabase domain (fallback)
   * Used for auth endpoints and future Supabase services
   */
  '*.supabase.co': {
    primary: 'kIdp6NNEd8wsugYyyIYFsi1ylMCED3hZbSR8ZFsa/A4=',
    backup1: 'mEflZT5enoR1FuXLgYYGqnVEoZvmf9c2bVBpiOjYQ0c=',
    backup2: 'hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc=',
  },
} as const;

/**
 * Future API endpoint pins (being.fyi)
 * Placeholder for when custom API is implemented
 */
export const API_CERTIFICATE_PINS = {
  'api.being.fyi': {
    // Placeholder - update when API is deployed
    primary: 'PLACEHOLDER_UPDATE_BEFORE_USE',
    backup1: 'PLACEHOLDER_UPDATE_BEFORE_USE',
    backup2: 'PLACEHOLDER_UPDATE_BEFORE_USE',
  },
} as const;

/**
 * Pin validation configuration
 */
export const PIN_VALIDATION_CONFIG = {
  /**
   * Fail-closed: reject connection on pin mismatch
   * SECURITY REQUIREMENT: Must be true in production
   */
  failOnPinMismatch: true,

  /**
   * Development bypass
   * Only allowed when ALL conditions are met:
   * 1. __DEV__ is true
   * 2. EXPO_PUBLIC_ALLOW_INSECURE_SSL env var is 'true'
   *
   * CRITICAL: Never enable in production builds
   */
  get allowDebugBypass(): boolean {
    if (!__DEV__) return false;
    return process.env['EXPO_PUBLIC_ALLOW_INSECURE_SSL'] === 'true';
  },

  /**
   * Timeout for pin validation (ms)
   * Must not impact crisis endpoint <200ms requirement
   */
  validationTimeoutMs: 100,

  /**
   * Days before expiry to trigger warning
   */
  expiryWarningDays: 60,

  /**
   * Maximum retry attempts on transient failures
   * NOTE: Pin mismatch is NOT retried (security)
   */
  maxRetries: 0,
} as const;

/**
 * Data classification for audit logging
 */
export type DataClassification =
  | 'PHI_CLINICAL' // PHQ-9, GAD-7 assessment data
  | 'PHI_CRISIS' // Crisis intervention data
  | 'PHI_CHECKIN' // Check-in and mood data
  | 'NON_PHI'; // Analytics and metadata

/**
 * Pin validation result
 */
export interface PinValidationResult {
  valid: boolean;
  matchedPin?: string;
  error?: string;
  endpoint: string;
  timestamp: number;
}

/**
 * Audit log entry for certificate pinning events
 * HIPAA §164.312(b) Audit Controls compliance
 */
export interface CertificatePinningAuditLog {
  timestamp: string;
  event:
    | 'pin_validation_success'
    | 'pin_validation_failure'
    | 'certificate_rotation'
    | 'fallback_pin_used'
    | 'development_bypass'
    | 'crisis_fallback';
  endpoint: string;
  matchedPin?: string;
  dataClassification: DataClassification;
  action: 'allow' | 'block' | 'fallback';
  securityException?: string;
  platform: string;
}

/**
 * Check if endpoint is crisis-critical
 * Crisis endpoints get fallback behavior per HIPAA §164.308(a)(7)(ii)(E)
 * Life-safety takes precedence over security controls
 */
export function isCrisisEndpoint(url: string): boolean {
  const crisisPatterns = [
    '/crisis/',
    '/emergency/',
    '/intervention/',
    '/safety-plan/',
    '/988/', // National Suicide Prevention Lifeline
  ];

  return crisisPatterns.some((pattern) => url.toLowerCase().includes(pattern));
}

/**
 * Get pins for a hostname
 */
export function getPinsForHost(
  hostname: string
): { primary: string; backup1: string; backup2: string } | null {
  // Direct match
  if (hostname in SUPABASE_CERTIFICATE_PINS) {
    return SUPABASE_CERTIFICATE_PINS[
      hostname as keyof typeof SUPABASE_CERTIFICATE_PINS
    ];
  }

  // Wildcard match for *.supabase.co
  if (hostname.endsWith('.supabase.co')) {
    return SUPABASE_CERTIFICATE_PINS['*.supabase.co'];
  }

  // Future: API endpoint match
  if (hostname in API_CERTIFICATE_PINS) {
    const pins =
      API_CERTIFICATE_PINS[hostname as keyof typeof API_CERTIFICATE_PINS];
    // Don't return placeholder pins
    if (pins.primary === 'PLACEHOLDER_UPDATE_BEFORE_USE') {
      return null;
    }
    return pins;
  }

  return null;
}

/**
 * Validate certificate pin against known pins
 */
export function validateCertificatePin(
  hostname: string,
  serverPin: string
): PinValidationResult {
  const timestamp = Date.now();
  const pins = getPinsForHost(hostname);

  if (!pins) {
    logSecurity(
      `[CertPinning] No pins configured for hostname: ${hostname}`,
      'medium',
      { hostname }
    );
    return {
      valid: false,
      error: `No certificate pins configured for ${hostname}`,
      endpoint: hostname,
      timestamp,
    };
  }

  // Check against all pins (primary + backups)
  const allPins = [pins.primary, pins.backup1, pins.backup2];

  for (const pin of allPins) {
    if (serverPin === pin) {
      // Track if backup pin was used (indicates rotation in progress)
      if (pin !== pins.primary) {
        logSecurityEvent({
          event: 'fallback_pin_used',
          endpoint: hostname,
          matchedPin: pin === pins.backup1 ? 'backup1' : 'backup2',
          dataClassification: 'NON_PHI',
          action: 'allow',
        });
      }

      return {
        valid: true,
        matchedPin: pin,
        endpoint: hostname,
        timestamp,
      };
    }
  }

  // No pin matched
  return {
    valid: false,
    error: 'Certificate pin mismatch - potential MITM attack',
    endpoint: hostname,
    timestamp,
  };
}

/**
 * Log security event for audit trail
 * HIPAA §164.312(b) Audit Controls
 */
export function logSecurityEvent(
  event: Omit<CertificatePinningAuditLog, 'timestamp' | 'platform'>
): void {
  const auditLog: CertificatePinningAuditLog = {
    ...event,
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
  };

  // Determine severity based on event type
  const severity =
    event.event === 'pin_validation_failure' ||
    event.event === 'crisis_fallback'
      ? 'high'
      : event.event === 'development_bypass'
        ? 'medium'
        : 'low';

  logSecurity(`[CertPinning] ${event.event}: ${event.endpoint}`, severity, {
    audit: auditLog,
  });

  // For critical events, also log to error category for monitoring
  if (event.event === 'pin_validation_failure') {
    logError(
      LogCategory.SECURITY,
      `Certificate pin validation failed for ${event.endpoint}`,
      new Error(event.securityException || 'Pin mismatch')
    );
  }
}

/**
 * Handle pin validation failure
 * Returns action to take: 'block' or 'fallback' (crisis only)
 */
export function handlePinValidationFailure(
  url: string,
  dataClassification: DataClassification,
  error: string
): 'block' | 'fallback' {
  // COMPLIANCE: Crisis endpoints get fallback per life-safety requirement
  if (isCrisisEndpoint(url)) {
    logSecurityEvent({
      event: 'crisis_fallback',
      endpoint: url,
      dataClassification,
      action: 'fallback',
      securityException:
        'Crisis endpoint pin failure - fallback allowed per life-safety requirement (HIPAA §164.308(a)(7)(ii)(E))',
    });

    // Alert would be sent to security monitoring in production
    console.warn(
      '[SECURITY ALERT] Crisis endpoint pin failure - using fallback'
    );

    return 'fallback';
  }

  // All other endpoints: fail-closed
  logSecurityEvent({
    event: 'pin_validation_failure',
    endpoint: url,
    dataClassification,
    action: 'block',
    securityException: error,
  });

  return 'block';
}

/**
 * Check if pinning should be bypassed (development only)
 */
export function shouldBypassPinning(): boolean {
  if (!PIN_VALIDATION_CONFIG.allowDebugBypass) {
    return false;
  }

  // Log bypass for audit trail
  logSecurityEvent({
    event: 'development_bypass',
    endpoint: 'all',
    dataClassification: 'NON_PHI',
    action: 'allow',
    securityException: 'Development mode SSL pinning bypass enabled',
  });

  if (__DEV__) {
    console.warn('━'.repeat(60));
    console.warn('⚠️  SSL CERTIFICATE PINNING BYPASSED');
    console.warn('⚠️  THIS IS ONLY ALLOWED IN DEVELOPMENT');
    console.warn('⚠️  NEVER USE IN PRODUCTION');
    console.warn('━'.repeat(60));
  }

  return true;
}

/**
 * Build-time safety check
 * Prevents accidental bypass in production builds
 */
if (
  !__DEV__ &&
  typeof process !== 'undefined' &&
  process.env?.['EXPO_PUBLIC_ALLOW_INSECURE_SSL'] === 'true'
) {
  throw new Error(
    'SECURITY: Cannot enable SSL bypass in production build. ' +
      'Remove EXPO_PUBLIC_ALLOW_INSECURE_SSL from production environment.'
  );
}

export default {
  SUPABASE_CERTIFICATE_PINS,
  API_CERTIFICATE_PINS,
  PIN_VALIDATION_CONFIG,
  getPinsForHost,
  validateCertificatePin,
  handlePinValidationFailure,
  shouldBypassPinning,
  isCrisisEndpoint,
  logSecurityEvent,
};
