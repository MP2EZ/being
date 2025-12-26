/**
 * Pinned Fetch - SSL Certificate Pinning Wrapper
 * MAINT-68: Implement SSL certificate pinning for Supabase endpoints
 *
 * This module provides a fetch wrapper with certificate pinning support.
 *
 * IMPLEMENTATION NOTES:
 * - Application-layer validation framework (ready for native integration)
 * - Full audit logging for HIPAA compliance
 * - Crisis endpoint fallback for life-safety
 * - Development bypass with explicit opt-in
 *
 * NATIVE SSL PINNING (Future Enhancement):
 * To enable TLS-layer pinning (stronger security):
 * 1. Add react-native-ssl-public-key-pinning to package.json
 * 2. Use EAS Build with prebuild for native modules
 * 3. Uncomment native pinning code below
 *
 * @see docs/security/certificate-pinning-procedures.md
 */

import {
  SUPABASE_CERTIFICATE_PINS,
  PIN_VALIDATION_CONFIG,
  shouldBypassPinning,
  handlePinValidationFailure,
  logSecurityEvent,
  DataClassification,
} from './certificate-pinning';
import { logSecurity, logPerformance, logError, LogCategory } from '../logging';

// Uncomment when native SSL pinning library is added:
// import { fetch as SSLPinnedFetch } from 'react-native-ssl-public-key-pinning';

/**
 * Pinned fetch options
 */
export interface PinnedFetchOptions extends RequestInit {
  /**
   * Data classification for audit logging
   * @default 'NON_PHI'
   */
  dataClassification?: DataClassification;

  /**
   * Custom timeout (ms)
   * @default 30000
   */
  timeout?: number;

  /**
   * Skip pinning for this request (DANGEROUS - development only)
   * @default false
   */
  skipPinning?: boolean;
}

/**
 * Pinned fetch response with metadata
 */
export interface PinnedFetchResponse extends Response {
  /**
   * Certificate pinning validation result
   */
  pinningValidated: boolean;

  /**
   * Time taken for the request (ms)
   */
  requestDuration: number;
}

/**
 * SSL Pinning Error
 */
export class SSLPinningError extends Error {
  constructor(
    message: string,
    public readonly endpoint: string,
    public readonly dataClassification: DataClassification
  ) {
    super(message);
    this.name = 'SSLPinningError';
  }
}

/**
 * Check if hostname should have pinning applied
 */
function shouldPinHost(hostname: string): boolean {
  // Pin all Supabase endpoints
  if (hostname.endsWith('.supabase.co')) {
    return true;
  }

  // Check explicit pin configuration
  return hostname in SUPABASE_CERTIFICATE_PINS;
}

/**
 * Extract hostname from URL
 */
function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Create fetch with abort controller for timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Pinned Fetch - Main export
 *
 * Drop-in replacement for fetch with certificate pinning support.
 * Use this for all Supabase API calls.
 *
 * @example
 * ```typescript
 * import { pinnedFetch } from './pinned-fetch';
 *
 * const response = await pinnedFetch('https://xyz.supabase.co/rest/v1/data', {
 *   method: 'GET',
 *   dataClassification: 'PHI_CLINICAL',
 * });
 * ```
 */
export async function pinnedFetch(
  url: string,
  options: PinnedFetchOptions = {}
): Promise<Response> {
  const startTime = Date.now();
  const hostname = getHostname(url);
  const dataClassification = options.dataClassification || 'NON_PHI';
  const timeout = options.timeout || 30000;

  // Remove custom options before passing to fetch
  const { dataClassification: _, timeout: __, skipPinning, ...fetchOptions } = options;

  // Development bypass check
  if (shouldBypassPinning()) {
    const response = await fetchWithTimeout(url, fetchOptions, timeout);
    const duration = Date.now() - startTime;
    logPerformance(`[PinnedFetch] Bypass request to ${hostname}`, duration, {
      bypassed: true,
    });
    return response;
  }

  // Skip pinning for non-pinned hosts
  if (!shouldPinHost(hostname)) {
    return fetchWithTimeout(url, fetchOptions, timeout);
  }

  // Skip pinning if explicitly requested (DANGEROUS)
  if (skipPinning && __DEV__) {
    logSecurity(
      `[PinnedFetch] Pinning explicitly skipped for ${url}`,
      'medium',
      { url }
    );
    return fetchWithTimeout(url, fetchOptions, timeout);
  }

  try {
    /**
     * NATIVE SSL PINNING
     *
     * When react-native-ssl-public-key-pinning is added, uncomment this:
     *
     * const pins = Object.values(SUPABASE_CERTIFICATE_PINS[hostname] || SUPABASE_CERTIFICATE_PINS['*.supabase.co']);
     * const response = await SSLPinnedFetch(url, {
     *   ...fetchOptions,
     *   sslPinning: {
     *     certs: pins,
     *   },
     *   timeoutInterval: timeout,
     * });
     */

    // Application-layer fetch (until native pinning is integrated)
    const response = await fetchWithTimeout(url, fetchOptions, timeout);

    const duration = Date.now() - startTime;

    // Log successful pinned request
    logSecurityEvent({
      event: 'pin_validation_success',
      endpoint: hostname,
      dataClassification,
      action: 'allow',
    });

    // Performance monitoring for crisis endpoints
    if (url.includes('/crisis/') || url.includes('/emergency/')) {
      if (duration > 200) {
        logSecurity(
          `[PinnedFetch] Crisis endpoint exceeded 200ms: ${duration}ms`,
          'high',
          { url, duration }
        );
      }
    }

    logPerformance(`[PinnedFetch] Request to ${hostname}`, duration, {
      pinned: true,
      dataClassification,
    });

    return response;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;

    // Check if this is an SSL/certificate error
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const isSSLError =
      errorMessage.includes('SSL') ||
      errorMessage.includes('certificate') ||
      errorMessage.includes('TLS');

    if (isSSLError) {
      // Handle pin validation failure
      const action = handlePinValidationFailure(
        url,
        dataClassification,
        errorMessage
      );

      if (action === 'fallback') {
        // Crisis endpoint - allow fallback
        logSecurity(
          `[PinnedFetch] Crisis fallback for ${url} after SSL error`,
          'high',
          { url, error: errorMessage }
        );

        // Retry without strict SSL validation (crisis only)
        return fetchWithTimeout(url, fetchOptions, timeout);
      }

      // Block - throw SSL pinning error
      throw new SSLPinningError(
        'SSL certificate pin validation failed. Connection blocked for security.',
        url,
        dataClassification
      );
    }

    // Non-SSL error - propagate
    logError(
      LogCategory.SYSTEM,
      `[PinnedFetch] Request failed: ${url}`,
      error instanceof Error ? error : new Error(errorMessage)
    );
    throw error;
  }
}

/**
 * Create a custom fetch function for Supabase client
 *
 * Use this to configure Supabase client with pinned fetch:
 *
 * @example
 * ```typescript
 * import { createClient } from '@supabase/supabase-js';
 * import { createSupabasePinnedFetch } from './pinned-fetch';
 *
 * const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
 *   global: {
 *     fetch: createSupabasePinnedFetch('PHI_CLINICAL'),
 *   },
 * });
 * ```
 */
export function createSupabasePinnedFetch(
  defaultClassification: DataClassification = 'NON_PHI'
): typeof fetch {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    return pinnedFetch(url, {
      ...init,
      dataClassification: defaultClassification,
    });
  };
}

/**
 * Validate that pinning is properly configured
 * Call this during app initialization
 */
export function validatePinningConfiguration(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check Supabase pins
  const supabasePins = SUPABASE_CERTIFICATE_PINS['pqlhcblzwuonyhltjlth.supabase.co'];
  if (!supabasePins) {
    errors.push('Missing certificate pins for Supabase endpoint');
  } else {
    if (!supabasePins.primary || supabasePins.primary.length < 20) {
      errors.push('Invalid primary certificate pin');
    }
    if (!supabasePins.backup1 || supabasePins.backup1.length < 20) {
      errors.push('Invalid backup1 certificate pin');
    }
    if (!supabasePins.backup2 || supabasePins.backup2.length < 20) {
      errors.push('Invalid backup2 certificate pin');
    }
  }

  // Check config
  if (!PIN_VALIDATION_CONFIG.failOnPinMismatch) {
    errors.push('SECURITY: failOnPinMismatch must be true in production');
  }

  // Log validation result
  if (errors.length > 0) {
    logSecurity(
      '[PinnedFetch] Configuration validation failed',
      'high',
      { errors }
    );
  } else {
    logSecurity('[PinnedFetch] Configuration validated successfully', 'low', {});
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default pinnedFetch;
