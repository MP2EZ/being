/**
 * DEEP LINK VALIDATION SERVICE - MAINT-120 Security Implementation
 *
 * COMPREHENSIVE DEEP LINK SECURITY FOR MENTAL HEALTH APPLICATION:
 * - URL scheme and host validation against allowlist
 * - Parameter sanitization to prevent XSS/injection attacks
 * - Path validation against known navigation routes
 * - Malicious pattern detection and blocking
 * - Security event logging for suspicious attempts
 * - Rate limiting for abuse prevention
 *
 * SECURITY REQUIREMENTS:
 * - All deep link parameters validated against allowlist
 * - Malformed URLs rejected gracefully (no crashes)
 * - No arbitrary navigation via deep link parameters
 * - SQL injection / XSS patterns blocked
 * - Deep link handler logs suspicious attempts
 *
 * PERFORMANCE REQUIREMENTS:
 * - Validation: <50ms for standard URLs
 * - Pattern matching: <10ms per check
 * - Logging: non-blocking async
 */

import { logSecurity, logError, LogCategory } from '../logging';

/**
 * DEEP LINK VALIDATION CONFIGURATION
 */
export const DEEP_LINK_CONFIG = {
  /** Allowed URL schemes */
  ALLOWED_SCHEMES: ['being', 'https'] as const,

  /** Allowed hosts for https scheme */
  ALLOWED_HOSTS: ['being.fyi', 'www.being.fyi', 'app.being.fyi'] as const,

  /** Allowed navigation paths (must match RootStackParamList routes) */
  ALLOWED_PATHS: [
    '/',
    '/main',
    '/morning',
    '/midday',
    '/evening',
    '/crisis',
    '/assessment',
    '/learn',
    '/module',
    '/practice',
    '/profile',
    '/settings',
    '/subscription',
  ] as const,

  /** Allowed query parameter keys */
  ALLOWED_PARAMS: [
    'moduleId',
    'practiceId',
    'source',
    'utm_source',
    'utm_medium',
    'utm_campaign',
  ] as const,

  /** Maximum parameter value length */
  MAX_PARAM_LENGTH: 128,

  /** Maximum URL length */
  MAX_URL_LENGTH: 2048,

  /** Rate limiting configuration */
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 30,
    SUSPICIOUS_THRESHOLD: 10,
    BLOCK_DURATION_MS: 60000, // 1 minute
  },

  /** Validation timeouts */
  VALIDATION_TIMEOUT_MS: 50,
} as const;

/**
 * MALICIOUS PATTERN DEFINITIONS
 * Patterns that indicate potential attack attempts
 */
const MALICIOUS_PATTERNS = {
  // SQL Injection patterns (simplified to avoid ReDoS)
  SQL_INJECTION: [
    /['"]|(%27)|(%22)/i,                     // Quotes (primary injection vector)
    /--|(%2D%2D)|#|(%23)/i,                  // SQL comments
    /\bunion\b/i,                             // UNION keyword
    /\bselect\b/i,                            // SELECT keyword
    /\b(drop|insert|delete|update)\b/i,       // Dangerous DDL/DML
    /\bexec\b/i,                              // EXEC keyword
    /\bor\b.*=/i,                             // OR-based injection
    /\band\b.*=/i,                            // AND-based injection
  ],

  // XSS patterns
  XSS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    /<\s*img[^>]+src\s*=/i,
    /<\s*iframe/i,
    /data:/i,
    /vbscript:/i,
    /expression\s*\(/i,
    /<\s*svg/i,
    /<\s*object/i,
  ],

  // Path traversal patterns
  PATH_TRAVERSAL: [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e\//i,
    /\.%2e\//i,
    /%2e\.\//i,
    /\.\.%5c/i,
    /%252e/i,
  ],

  // Command injection patterns (comprehensive shell metacharacters)
  COMMAND_INJECTION: [
    /[;&|`$<>]/,           // Shell metacharacters
    /\$\{/,                 // ${} variable expansion
    /\$\(/,                 // $() subshell
    /`[^`]*`/,              // Backtick execution (non-greedy)
    /%0[aAdD]/i,            // URL-encoded newline/carriage return
    /[\r\n]/,               // Literal newline/CR
  ],

  // Protocol injection patterns
  PROTOCOL_INJECTION: [
    /^file:/i,
    /^ftp:/i,
    /^gopher:/i,
    /^ldap:/i,
    /^telnet:/i,
  ],
} as const;

/**
 * VALIDATION RESULT TYPE
 */
export interface DeepLinkValidationResult {
  isValid: boolean;
  sanitizedUrl: string | null;
  originalUrl: string;
  errors: DeepLinkValidationError[];
  warnings: string[];
  metadata: {
    scheme: string | null;
    host: string | null;
    path: string | null;
    params: Record<string, string>;
    validationTimeMs: number;
  };
}

/**
 * VALIDATION ERROR TYPE
 */
export interface DeepLinkValidationError {
  code: DeepLinkErrorCode;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  field?: string;
  pattern?: string;
}

/**
 * ERROR CODES
 */
export type DeepLinkErrorCode =
  | 'INVALID_URL_FORMAT'
  | 'URL_TOO_LONG'
  | 'DISALLOWED_SCHEME'
  | 'DISALLOWED_HOST'
  | 'DISALLOWED_PATH'
  | 'DISALLOWED_PARAM'
  | 'PARAM_TOO_LONG'
  | 'SQL_INJECTION_DETECTED'
  | 'XSS_DETECTED'
  | 'PATH_TRAVERSAL_DETECTED'
  | 'COMMAND_INJECTION_DETECTED'
  | 'PROTOCOL_INJECTION_DETECTED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'VALIDATION_TIMEOUT';

/**
 * SECURITY EVENT TYPE
 */
export interface DeepLinkSecurityEvent {
  timestamp: number;
  url: string;
  eventType: 'validation_passed' | 'validation_failed' | 'attack_detected' | 'rate_limited';
  errors: DeepLinkValidationError[];
  userAgent?: string;
  source?: string;
}

/**
 * DEEP LINK VALIDATION SERVICE
 */
class DeepLinkValidationService {
  private static instance: DeepLinkValidationService;
  private requestTimestamps: number[] = [];
  private blockedUntil: number = 0;
  private securityEvents: DeepLinkSecurityEvent[] = [];
  private readonly MAX_SECURITY_EVENTS = 1000;

  private constructor() {}

  public static getInstance(): DeepLinkValidationService {
    if (!DeepLinkValidationService.instance) {
      DeepLinkValidationService.instance = new DeepLinkValidationService();
    }
    return DeepLinkValidationService.instance;
  }

  /**
   * VALIDATE AND SANITIZE DEEP LINK URL
   * Main entry point for deep link validation
   */
  public validateDeepLink(url: string): DeepLinkValidationResult {
    const startTime = performance.now();
    const errors: DeepLinkValidationError[] = [];
    const warnings: string[] = [];

    // Initialize result metadata
    let scheme: string | null = null;
    let host: string | null = null;
    let path: string | null = null;
    let params: Record<string, string> = {};

    try {
      // Check rate limiting first
      if (this.isRateLimited()) {
        errors.push({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many deep link requests. Please try again later.',
          severity: 'high',
        });
        this.logSecurityEvent(url, 'rate_limited', errors);
        return this.buildResult(false, null, url, errors, warnings, {
          scheme, host, path, params,
          validationTimeMs: performance.now() - startTime,
        });
      }

      // Track request for rate limiting
      this.trackRequest();

      // Check URL length
      if (url.length > DEEP_LINK_CONFIG.MAX_URL_LENGTH) {
        errors.push({
          code: 'URL_TOO_LONG',
          message: `URL exceeds maximum length of ${DEEP_LINK_CONFIG.MAX_URL_LENGTH} characters`,
          severity: 'medium',
        });
        this.logSecurityEvent(url, 'validation_failed', errors);
        return this.buildResult(false, null, url, errors, warnings, {
          scheme, host, path, params,
          validationTimeMs: performance.now() - startTime,
        });
      }

      // Parse URL
      let parsedUrl: URL;
      try {
        // Handle custom scheme URLs
        const normalizedUrl = this.normalizeCustomScheme(url);
        parsedUrl = new URL(normalizedUrl);
        scheme = this.extractScheme(url);
        host = parsedUrl.hostname;
        path = parsedUrl.pathname;
      } catch {
        errors.push({
          code: 'INVALID_URL_FORMAT',
          message: 'Unable to parse URL format',
          severity: 'medium',
        });
        this.logSecurityEvent(url, 'validation_failed', errors);
        return this.buildResult(false, null, url, errors, warnings, {
          scheme, host, path, params,
          validationTimeMs: performance.now() - startTime,
        });
      }

      // Validate scheme
      if (!this.isAllowedScheme(scheme)) {
        errors.push({
          code: 'DISALLOWED_SCHEME',
          message: `URL scheme '${scheme}' is not allowed`,
          severity: 'high',
          field: 'scheme',
        });
      }

      // Validate host (only for https scheme, being:// scheme doesn't have a real host)
      if (scheme === 'https') {
        // For being:// URLs converted to https://being.app/, skip host check
        const originalUrl = url.toLowerCase();
        const isBeinglUrl = originalUrl.startsWith('being://');

        if (!isBeinglUrl && !this.isAllowedHost(host)) {
          errors.push({
            code: 'DISALLOWED_HOST',
            message: `Host '${host}' is not allowed`,
            severity: 'high',
            field: 'host',
          });
        }
      }

      // Validate path
      if (!this.isAllowedPath(path)) {
        errors.push({
          code: 'DISALLOWED_PATH',
          message: `Path '${path}' is not a valid navigation target`,
          severity: 'medium',
          field: 'path',
        });
      }

      // Parse and validate query parameters
      const paramValidation = this.validateAndSanitizeParams(parsedUrl.searchParams);
      params = paramValidation.sanitizedParams;
      errors.push(...paramValidation.errors);
      warnings.push(...paramValidation.warnings);

      // Check for malicious patterns in the path and URL structure
      // Note: URL parsers normalize path traversal (../) so we check the original URL
      // Parameter values are already checked in validateAndSanitizeParams
      if (path) {
        const pathErrors = this.detectMaliciousPatterns(path);
        errors.push(...pathErrors);
      }

      // Also check the original URL (before query string) for path traversal
      // This catches attempts that the URL parser normalizes away
      const urlWithoutQuery = url.split('?')[0] ?? url;
      const originalPathErrors = this.detectMaliciousPatterns(urlWithoutQuery);
      // Filter to only add path traversal errors (avoid duplicate detection)
      const newPathTraversalErrors = originalPathErrors.filter(
        e => e.code === 'PATH_TRAVERSAL_DETECTED' &&
          !errors.some(existing => existing.code === 'PATH_TRAVERSAL_DETECTED')
      );
      errors.push(...newPathTraversalErrors);

      // Determine if validation passed
      const hasBlockingErrors = errors.some(e =>
        e.severity === 'critical' || e.severity === 'high'
      );

      if (hasBlockingErrors) {
        this.logSecurityEvent(url, 'attack_detected', errors);
        return this.buildResult(false, null, url, errors, warnings, {
          scheme, host, path, params,
          validationTimeMs: performance.now() - startTime,
        });
      }

      // Build sanitized URL
      const sanitizedUrl = this.buildSanitizedUrl(scheme, host, path, params);

      // Log successful validation (with warnings if any)
      if (warnings.length > 0 || errors.length > 0) {
        this.logSecurityEvent(url, 'validation_passed', errors);
      }

      return this.buildResult(true, sanitizedUrl, url, errors, warnings, {
        scheme, host, path, params,
        validationTimeMs: performance.now() - startTime,
      });

    } catch (error) {
      logError(
        LogCategory.SECURITY,
        'Deep link validation error:',
        error instanceof Error ? error : new Error(String(error))
      );

      errors.push({
        code: 'INVALID_URL_FORMAT',
        message: 'Unexpected error during URL validation',
        severity: 'high',
      });

      this.logSecurityEvent(url, 'validation_failed', errors);

      return this.buildResult(false, null, url, errors, warnings, {
        scheme, host, path, params,
        validationTimeMs: performance.now() - startTime,
      });
    }
  }

  /**
   * EXTRACT NAVIGATION PARAMS FROM VALIDATED URL
   * Returns typed params for React Navigation
   */
  public extractNavigationParams(validationResult: DeepLinkValidationResult): {
    screen: string | null;
    params: Record<string, unknown>;
  } {
    if (!validationResult.isValid || !validationResult.sanitizedUrl) {
      return { screen: null, params: {} };
    }

    const { path, params } = validationResult.metadata;

    // Map path to screen name
    const screenMap: Record<string, string> = {
      '/': 'Main',
      '/main': 'Main',
      '/morning': 'MorningFlow',
      '/midday': 'MiddayFlow',
      '/evening': 'EveningFlow',
      '/crisis': 'CrisisResources',
      '/assessment': 'AssessmentFlow',
      '/learn': 'Main',
      '/module': 'ModuleDetail',
      '/practice': 'PracticeTimer',
      '/profile': 'Main',
      '/settings': 'Main',
      '/subscription': 'Subscription',
    };

    const screen = path ? screenMap[path] || null : null;

    // Convert string params to typed params
    const typedParams: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      typedParams[key] = value;
    }

    return { screen, params: typedParams };
  }

  /**
   * GET SECURITY METRICS
   * Returns metrics about deep link validation
   */
  public getSecurityMetrics(): {
    totalEvents: number;
    attacksDetected: number;
    rateLimitedRequests: number;
    recentEvents: DeepLinkSecurityEvent[];
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    const recentEvents = this.securityEvents.filter(e => e.timestamp > oneHourAgo);

    return {
      totalEvents: this.securityEvents.length,
      attacksDetected: recentEvents.filter(e => e.eventType === 'attack_detected').length,
      rateLimitedRequests: recentEvents.filter(e => e.eventType === 'rate_limited').length,
      recentEvents: recentEvents.slice(-10),
    };
  }

  /**
   * CLEAR SECURITY EVENTS
   * Used for testing and maintenance
   */
  public clearSecurityEvents(): void {
    this.securityEvents = [];
    this.requestTimestamps = [];
    this.blockedUntil = 0;
  }

  // ==================== PRIVATE METHODS ====================

  private normalizeCustomScheme(url: string): string {
    // Convert being:// to https://being.app/ for URL parsing
    if (url.startsWith('being://')) {
      return url.replace('being://', 'https://being.app/');
    }
    return url;
  }

  private extractScheme(url: string): string | null {
    const match = url.match(/^(\w+):/);
    return match && match[1] ? match[1].toLowerCase() : null;
  }

  private isAllowedScheme(scheme: string | null): boolean {
    if (!scheme) return false;
    return (DEEP_LINK_CONFIG.ALLOWED_SCHEMES as readonly string[]).includes(scheme);
  }

  private isAllowedHost(host: string | null): boolean {
    if (!host) return false;
    return (DEEP_LINK_CONFIG.ALLOWED_HOSTS as readonly string[]).includes(host.toLowerCase());
  }

  private isAllowedPath(path: string | null): boolean {
    if (!path) return false;

    // Normalize path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Extract base path (first two segments like /module)
    const segments = normalizedPath.split('/').filter(Boolean);
    const basePath = segments.length > 0 ? `/${segments[0]}` : '/';

    // Check if base path is allowed
    const baseAllowed = (DEEP_LINK_CONFIG.ALLOWED_PATHS as readonly string[]).includes(basePath);

    if (!baseAllowed && basePath !== '/') {
      return false;
    }

    // Limit path depth to prevent access to unintended nested routes (max 3 segments)
    // e.g., /module/id is OK, but /module/id/sub/deep is not
    if (segments.length > 3) {
      return false;
    }

    // If there are path parameters (like /module/123), validate they're alphanumeric
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment) continue;
      // Allow only alphanumeric, hyphens, underscores (max 64 chars per segment)
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(segment)) {
        return false;
      }
    }

    return true;
  }

  private validateAndSanitizeParams(searchParams: URLSearchParams): {
    sanitizedParams: Record<string, string>;
    errors: DeepLinkValidationError[];
    warnings: string[];
  } {
    const sanitizedParams: Record<string, string> = {};
    const errors: DeepLinkValidationError[] = [];
    const warnings: string[] = [];

    for (const [key, value] of searchParams.entries()) {
      // Check if parameter is allowed
      if (!(DEEP_LINK_CONFIG.ALLOWED_PARAMS as readonly string[]).includes(key)) {
        warnings.push(`Parameter '${key}' was stripped (not in allowlist)`);
        continue;
      }

      // Check parameter length - high severity as oversized params could be attack vectors
      if (value.length > DEEP_LINK_CONFIG.MAX_PARAM_LENGTH) {
        errors.push({
          code: 'PARAM_TOO_LONG',
          message: `Parameter '${key}' exceeds maximum length`,
          severity: 'high',
          field: key,
        });
        continue;
      }

      // Sanitize value
      const sanitizedValue = this.sanitizeParamValue(value);

      // Check for malicious patterns in value
      const valueErrors = this.detectMaliciousPatterns(value);
      if (valueErrors.length > 0) {
        errors.push(...valueErrors.map(e => ({
          ...e,
          field: key,
        })));
        continue;
      }

      sanitizedParams[key] = sanitizedValue;
    }

    return { sanitizedParams, errors, warnings };
  }

  private sanitizeParamValue(value: string): string {
    // Remove null bytes
    let sanitized = value.replace(/\0/g, '');

    // HTML entity encode special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    // Remove control characters (except common whitespace)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return sanitized;
  }

  private detectMaliciousPatterns(input: string): DeepLinkValidationError[] {
    const errors: DeepLinkValidationError[] = [];
    const decodedInput = this.decodeForAnalysis(input);

    // Check SQL injection
    for (const pattern of MALICIOUS_PATTERNS.SQL_INJECTION) {
      if (pattern.test(input) || pattern.test(decodedInput)) {
        errors.push({
          code: 'SQL_INJECTION_DETECTED',
          message: 'Potential SQL injection pattern detected',
          severity: 'critical',
          pattern: pattern.source,
        });
        break; // One detection is enough
      }
    }

    // Check XSS
    for (const pattern of MALICIOUS_PATTERNS.XSS) {
      if (pattern.test(input) || pattern.test(decodedInput)) {
        errors.push({
          code: 'XSS_DETECTED',
          message: 'Potential XSS pattern detected',
          severity: 'critical',
          pattern: pattern.source,
        });
        break;
      }
    }

    // Check path traversal
    for (const pattern of MALICIOUS_PATTERNS.PATH_TRAVERSAL) {
      if (pattern.test(input) || pattern.test(decodedInput)) {
        errors.push({
          code: 'PATH_TRAVERSAL_DETECTED',
          message: 'Potential path traversal pattern detected',
          severity: 'high',
          pattern: pattern.source,
        });
        break;
      }
    }

    // Check command injection
    for (const pattern of MALICIOUS_PATTERNS.COMMAND_INJECTION) {
      if (pattern.test(input) || pattern.test(decodedInput)) {
        errors.push({
          code: 'COMMAND_INJECTION_DETECTED',
          message: 'Potential command injection pattern detected',
          severity: 'critical',
          pattern: pattern.source,
        });
        break;
      }
    }

    // Check protocol injection
    for (const pattern of MALICIOUS_PATTERNS.PROTOCOL_INJECTION) {
      if (pattern.test(input) || pattern.test(decodedInput)) {
        errors.push({
          code: 'PROTOCOL_INJECTION_DETECTED',
          message: 'Potential protocol injection pattern detected',
          severity: 'high',
          pattern: pattern.source,
        });
        break;
      }
    }

    return errors;
  }

  private decodeForAnalysis(input: string): string {
    try {
      // Try multiple decoding passes to catch nested encoding
      let decoded = input;
      for (let i = 0; i < 3; i++) {
        const newDecoded = decodeURIComponent(decoded);
        if (newDecoded === decoded) break;
        decoded = newDecoded;
      }
      return decoded;
    } catch {
      return input;
    }
  }

  private buildSanitizedUrl(
    scheme: string | null,
    host: string | null,
    path: string | null,
    params: Record<string, string>
  ): string {
    // Build URL with being scheme
    let url = 'being://';

    if (path) {
      // Remove leading slash for being:// scheme
      url += path.startsWith('/') ? path.substring(1) : path;
    }

    // Add query params
    const paramEntries = Object.entries(params);
    if (paramEntries.length > 0) {
      const queryString = paramEntries
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      url += `?${queryString}`;
    }

    return url;
  }

  private buildResult(
    isValid: boolean,
    sanitizedUrl: string | null,
    originalUrl: string,
    errors: DeepLinkValidationError[],
    warnings: string[],
    metadata: DeepLinkValidationResult['metadata']
  ): DeepLinkValidationResult {
    return {
      isValid,
      sanitizedUrl,
      originalUrl,
      errors,
      warnings,
      metadata,
    };
  }

  private isRateLimited(): boolean {
    const now = Date.now();

    // Check if currently blocked
    if (now < this.blockedUntil) {
      return true;
    }

    // Clean old timestamps
    const oneMinuteAgo = now - 60000;
    this.requestTimestamps = this.requestTimestamps.filter(t => t > oneMinuteAgo);

    // Check if should block
    if (this.requestTimestamps.length >= DEEP_LINK_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
      this.blockedUntil = now + DEEP_LINK_CONFIG.RATE_LIMIT.BLOCK_DURATION_MS;
      return true;
    }

    return false;
  }

  private trackRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  private logSecurityEvent(
    url: string,
    eventType: DeepLinkSecurityEvent['eventType'],
    errors: DeepLinkValidationError[]
  ): void {
    const event: DeepLinkSecurityEvent = {
      timestamp: Date.now(),
      url: url.substring(0, 500), // Truncate for storage
      eventType,
      errors: errors.slice(0, 10), // Limit stored errors
    };

    // Store event
    this.securityEvents.push(event);

    // Trim if too many events
    if (this.securityEvents.length > this.MAX_SECURITY_EVENTS) {
      this.securityEvents = this.securityEvents.slice(-this.MAX_SECURITY_EVENTS);
    }

    // Log to security monitoring system
    const severityMap = {
      'validation_passed': 'info',
      'validation_failed': 'warning',
      'attack_detected': 'critical',
      'rate_limited': 'warning',
    } as const;

    const severity = severityMap[eventType];
    const message = `Deep link ${eventType}: ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`;

    if (eventType === 'attack_detected') {
      logSecurity('DeepLinkValidation: Attack detected', 'critical', {
        url: event.url,
        errors: errors.map(e => ({ code: e.code, severity: e.severity })),
        timestamp: event.timestamp,
      });
    } else if (eventType === 'validation_failed') {
      logSecurity('DeepLinkValidation: Validation failed', 'medium', {
        url: event.url,
        errorCount: errors.length,
        timestamp: event.timestamp,
      });
    } else if (eventType === 'rate_limited') {
      logSecurity('DeepLinkValidation: Rate limited', 'medium', {
        url: event.url,
        errorCount: errors.length,
        timestamp: event.timestamp,
      });
    }
  }
}

// Export singleton instance
export default DeepLinkValidationService.getInstance();

// Also export the class for testing
export { DeepLinkValidationService };
