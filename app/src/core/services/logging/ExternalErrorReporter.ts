/**
 * EXTERNAL ERROR REPORTER - INFRA-61
 *
 * Privacy-first external error reporting service.
 *
 * PRIVACY PRINCIPLES:
 * - Being is NOT a Privacy covered entity (wellness app, not healthcare)
 * - We voluntarily implement strong privacy practices per our privacy policy
 * - Local-first data architecture: wellness data never leaves device
 * - Only crash/error metadata sent externally (no PHI, no wellness data)
 *
 * DESIGN:
 * - Abstracted interface supporting any error reporting backend (Sentry, etc.)
 * - Allowlist-based sanitization: only explicitly allowed fields transmitted
 * - Multi-layer PHI scrubbing before any external transmission
 * - Kill switch for immediate disable in production
 * - Crisis events logged locally only (never external)
 *
 * ACTIVATION:
 * - Set SENTRY_DSN environment variable when ready
 * - No BAA required (Being is not Privacy covered entity)
 * - Any Sentry tier is sufficient (including free)
 */

import { Platform } from 'react-native';
import { LogCategory, logger } from './ProductionLogger';

/**
 * CONFIGURATION
 */
export interface ExternalReporterConfig {
  enabled: boolean;
  dsn?: string;
  environment: 'development' | 'staging' | 'production';
  sampleRate: number;
  maxBreadcrumbs: number;
  debug: boolean;
}

/**
 * ALLOWLIST: Fields explicitly allowed in external reports
 * Everything not on this list is BLOCKED
 */
const ALLOWED_ERROR_FIELDS = [
  // Error identification
  'type',
  'message',         // Sanitized message only
  'name',
  'errorCode',

  // Context (no PHI)
  'platform',
  'version',
  'buildNumber',
  'environment',
  'timestamp',

  // Stack trace (file names only, no data)
  'filename',
  'function',
  'lineno',
  'colno',

  // Performance (no PHI)
  'duration',
  'operationType',

  // App state (no PHI)
  'screenName',       // Generic screen names only
  'flowType',         // morning/midday/evening only
  'networkStatus',
  'memoryUsage',
] as const;

/**
 * BLOCKLIST: Fields that must NEVER be sent externally
 * Defense-in-depth: blocked even if somehow bypasses allowlist
 */
const BLOCKED_FIELDS = [
  // User identifiers
  'userId', 'user_id', 'userIdentifier', 'id', 'email', 'phone',

  // Assessment data
  'phq9', 'gad7', 'score', 'scores', 'responses', 'assessment',
  'assessmentData', 'result', 'results', 'answer', 'answers',

  // Crisis data
  'crisis', 'crisisData', 'detection', 'intervention',
  'emergencyContact', 'safetyPlan',

  // Session/Auth
  'token', 'authToken', 'accessToken', 'refreshToken',
  'password', 'secret', 'key', 'apiKey', 'session', 'sessionId',

  // Personal data
  'data', 'userData', 'profile', 'profileData', 'private',
  'therapeutic', 'mood', 'emotion', 'feeling', 'thought',
  'journal', 'reflection', 'note', 'content',

  // Stoic/philosophical content
  'principle', 'virtue', 'practice', 'exercise',
] as const;

/**
 * PHI PATTERNS: Regex patterns for additional PHI detection
 */
const SENSITIVE_DATA_PATTERNS = [
  // UUIDs (could be user IDs)
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,

  // Assessment scores (PHQ-9: 0-27, GAD-7: 0-21)
  /phq[_-]?9?[:\s]*\d+/gi,
  /gad[_-]?7?[:\s]*\d+/gi,
  /score[:\s]*\d+/gi,

  // Email patterns
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,

  // Phone numbers
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,

  // SSN patterns
  /\b\d{3}-?\d{2}-?\d{4}\b/g,

  // JWT tokens
  /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,

  // Base64 encoded data (potential PHI)
  /(?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g,

  // Therapeutic content patterns
  /mood[:\s]*["']?[a-zA-Z]+["']?/gi,
  /feeling[:\s]*["']?[a-zA-Z]+["']?/gi,
  /thought[:\s]*["']?[^"'\n]{5,}["']?/gi,
];

/**
 * Sanitized error event structure
 */
interface SanitizedErrorEvent {
  type: string;
  message: string;
  timestamp: number;
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'web';
  environment: 'development' | 'staging' | 'production';
  version?: string | undefined;
  buildNumber?: string | undefined;
  context: {
    screenName?: string | undefined;
    flowType?: string | undefined;
    networkStatus?: string | undefined;
  };
  stack?: {
    filename: string;
    function: string;
    lineno: number;
    colno: number;
  }[] | undefined;
}

/**
 * EXTERNAL ERROR REPORTER SERVICE
 */
export class ExternalErrorReporter {
  private static instance: ExternalErrorReporter;
  private config: ExternalReporterConfig;
  private initialized: boolean = false;
  private killed: boolean = false;
  private sentryModule: any = null;

  private constructor() {
    this.config = {
      enabled: false,
      environment: this.detectEnvironment(),
      sampleRate: 1.0,
      maxBreadcrumbs: 50,
      debug: __DEV__,
    };
  }

  static getInstance(): ExternalErrorReporter {
    if (!ExternalErrorReporter.instance) {
      ExternalErrorReporter.instance = new ExternalErrorReporter();
    }
    return ExternalErrorReporter.instance;
  }

  /**
   * Initialize external error reporting
   * Call this during app startup with Sentry DSN when ready
   */
  async initialize(dsn?: string): Promise<boolean> {
    if (this.killed) {
      logger.warn(LogCategory.SECURITY, 'External error reporter is killed - cannot initialize');
      return false;
    }

    // Expo requires EXPO_PUBLIC_ prefix for client-side env vars
    const envDsn = process.env['EXPO_PUBLIC_SENTRY_DSN'];
    if (!dsn && !envDsn) {
      logger.info(LogCategory.SYSTEM, 'External error reporting not configured (no DSN)');
      return false;
    }

    try {
      this.config.dsn = dsn || envDsn;
      this.config.enabled = true;

      // Dynamic import of Sentry (only load if needed)
      // This allows the app to work without Sentry installed
      try {
        this.sentryModule = await this.loadSentryModule();

        if (this.sentryModule) {
          this.sentryModule.init({
            dsn: this.config.dsn,
            environment: this.config.environment,
            sampleRate: this.config.sampleRate,
            maxBreadcrumbs: this.config.maxBreadcrumbs,
            debug: this.config.debug,

            // CRITICAL: Privacy-first beforeSend hook
            beforeSend: (event: any) => this.beforeSendHook(event),

            // CRITICAL: Privacy-first beforeBreadcrumb hook
            beforeBreadcrumb: (breadcrumb: any) => this.beforeBreadcrumbHook(breadcrumb),

            // Disable features that could leak PHI
            autoSessionTracking: false,
            enableAutoPerformanceTracing: false,
            attachStacktrace: true,
            normalizeDepth: 3, // Limit depth to prevent deep object exposure
          });

          this.initialized = true;
          logger.info(LogCategory.SYSTEM, 'External error reporting initialized');
          return true;
        }
      } catch {
        logger.info(LogCategory.SYSTEM, 'Sentry SDK not installed - external reporting disabled');
        this.config.enabled = false;
        return false;
      }

      return false;
    } catch (error) {
      logger.error(LogCategory.SECURITY, 'Failed to initialize external error reporting', error);
      this.config.enabled = false;
      return false;
    }
  }

  /**
   * Dynamic Sentry module loader
   * Returns null if Sentry is not installed
   */
  private async loadSentryModule(): Promise<any> {
    try {
      // Try to load @sentry/react-native
      const Sentry = require('@sentry/react-native');
      return Sentry;
    } catch {
      // Sentry not installed - this is fine
      return null;
    }
  }

  /**
   * Report an error externally
   * NEVER call this for crisis events - they stay local only
   */
  async reportError(
    error: Error,
    context?: {
      screenName?: string;
      flowType?: 'morning' | 'midday' | 'evening';
      operationType?: string;
    }
  ): Promise<void> {
    // Gate checks
    if (!this.config.enabled || !this.initialized || this.killed) {
      return;
    }

    // CRITICAL: Never report crisis-related errors externally
    if (this.isCrisisRelated(error, context)) {
      logger.warn(LogCategory.SECURITY, 'Blocked external report of crisis-related error');
      return;
    }

    try {
      const sanitizedEvent = this.sanitizeError(error, context);

      if (this.sentryModule) {
        this.sentryModule.captureException(error, {
          extra: sanitizedEvent.context,
          tags: {
            platform: sanitizedEvent.platform,
            environment: sanitizedEvent.environment,
          },
        });
      }
    } catch {
      // Never let reporting errors break the app
      logger.error(LogCategory.SYSTEM, 'External error reporting failed silently');
    }
  }

  /**
   * CRITICAL: beforeSend hook for Sentry
   * Sanitizes ALL data before external transmission
   */
  private beforeSendHook(event: any): any | null {
    if (this.killed) {
      return null; // Drop all events if killed
    }

    try {
      // Check for crisis-related content
      if (this.containsCrisisContent(event)) {
        logger.warn(LogCategory.SECURITY, 'Blocked crisis content from external report');
        return null;
      }

      // Apply allowlist filtering
      const sanitized = this.applyAllowlist(event);

      // Apply PHI pattern scrubbing
      return this.scrubPHI(sanitized);
    } catch {
      // On any error, drop the event (fail-safe)
      logger.error(LogCategory.SECURITY, 'beforeSend sanitization failed - dropping event');
      return null;
    }
  }

  /**
   * beforeBreadcrumb hook for Sentry
   * Sanitizes breadcrumbs before storage
   */
  private beforeBreadcrumbHook(breadcrumb: any): any | null {
    if (this.killed) {
      return null;
    }

    try {
      // Block navigation breadcrumbs to assessment/crisis screens
      if (breadcrumb.category === 'navigation') {
        const route = breadcrumb.data?.to || breadcrumb.message || '';
        if (this.isSensitiveRoute(route)) {
          return null;
        }
      }

      // Block user interaction breadcrumbs on sensitive screens
      if (breadcrumb.category === 'ui.click' || breadcrumb.category === 'ui.input') {
        return null; // Block all user input breadcrumbs
      }

      // Sanitize message
      if (breadcrumb.message) {
        breadcrumb.message = this.sanitizeString(breadcrumb.message);
      }

      return breadcrumb;
    } catch {
      return null; // Fail-safe: drop on error
    }
  }

  /**
   * Check if error is crisis-related
   */
  private isCrisisRelated(error: Error, context?: any): boolean {
    const errorText = `${error.name} ${error.message} ${error.stack || ''}`.toLowerCase();
    const contextText = JSON.stringify(context || {}).toLowerCase();

    const crisisKeywords = [
      'crisis', 'phq', 'gad', 'assessment', 'score', 'suicidal',
      'suicide', 'self-harm', 'emergency', '988', 'intervention',
      'safety', 'safetyplan', 'emergencycontact'
    ];

    return crisisKeywords.some(keyword =>
      errorText.includes(keyword) || contextText.includes(keyword)
    );
  }

  /**
   * Check if event contains crisis content
   */
  private containsCrisisContent(event: any): boolean {
    const eventStr = JSON.stringify(event).toLowerCase();
    const crisisPatterns = [
      'phq-9', 'phq9', 'gad-7', 'gad7',
      'crisis', 'suicid', 'self-harm',
      'emergency', 'intervention', '988'
    ];

    return crisisPatterns.some(pattern => eventStr.includes(pattern));
  }

  /**
   * Apply allowlist filtering to event
   */
  private applyAllowlist(event: any): any {
    const filtered: any = {};

    // Only copy allowed fields
    for (const field of ALLOWED_ERROR_FIELDS) {
      if (event[field] !== undefined) {
        filtered[field] = event[field];
      }
    }

    // Sanitize exception data
    if (event.exception?.values) {
      filtered.exception = {
        values: event.exception.values.map((ex: any) => ({
          type: ex.type,
          value: this.sanitizeString(ex.value),
          stacktrace: ex.stacktrace ? {
            frames: ex.stacktrace.frames?.map((frame: any) => ({
              filename: this.sanitizeFilename(frame.filename),
              function: frame.function,
              lineno: frame.lineno,
              colno: frame.colno,
            })).slice(0, 10) // Limit stack depth
          } : undefined,
        })),
      };
    }

    // Add safe metadata
    filtered.platform = Platform.OS;
    filtered.timestamp = Date.now();
    filtered.environment = this.config.environment;

    return filtered;
  }

  /**
   * Scrub PHI patterns from event
   */
  private scrubPHI(event: any): any {
    const eventStr = JSON.stringify(event);
    let scrubbed = eventStr;

    // Apply all PHI patterns
    for (const pattern of SENSITIVE_DATA_PATTERNS) {
      scrubbed = scrubbed.replace(pattern, '[REDACTED]');
    }

    // Remove blocked field values
    for (const field of BLOCKED_FIELDS) {
      const fieldPattern = new RegExp(`"${field}"\\s*:\\s*[^,}]+`, 'gi');
      scrubbed = scrubbed.replace(fieldPattern, `"${field}":"[BLOCKED]"`);
    }

    try {
      return JSON.parse(scrubbed);
    } catch {
      return event; // Return original if parsing fails
    }
  }

  /**
   * Sanitize error for external reporting
   */
  private sanitizeError(error: Error, context?: any): SanitizedErrorEvent {
    const sanitizedContext: SanitizedErrorEvent['context'] = {};

    const screenName = this.sanitizeScreenName(context?.screenName);
    if (screenName !== undefined) {
      sanitizedContext.screenName = screenName;
    }

    if (context?.flowType !== undefined) {
      sanitizedContext.flowType = context.flowType;
    }

    if (context?.networkStatus !== undefined) {
      sanitizedContext.networkStatus = context.networkStatus;
    }

    return {
      type: error.name,
      message: this.sanitizeString(error.message),
      timestamp: Date.now(),
      platform: Platform.OS,
      environment: this.config.environment,
      context: sanitizedContext,
      stack: this.sanitizeStack(error.stack),
    };
  }

  /**
   * Sanitize string by removing PHI patterns
   */
  private sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') return '';

    let sanitized = str;
    for (const pattern of SENSITIVE_DATA_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // Truncate to reasonable length
    return sanitized.substring(0, 500);
  }

  /**
   * Sanitize filename to remove potentially sensitive paths
   */
  private sanitizeFilename(filename: string): string {
    if (!filename) return '';

    // Remove user-specific paths
    return filename
      .replace(/\/Users\/[^/]+\//gi, '/~/')
      .replace(/C:\\Users\\[^\\]+\\/gi, 'C:\\~\\')
      .replace(/node_modules/gi, 'nm');
  }

  /**
   * Sanitize screen name
   */
  private sanitizeScreenName(name?: string): string | undefined {
    if (!name) return undefined;

    // Only allow generic screen names
    const allowedScreens = [
      'Home', 'Settings', 'Profile', 'Learn', 'Practice',
      'Morning', 'Midday', 'Evening', 'CheckIn', 'Progress',
    ];

    const genericName = name.replace(/Screen$/, '');
    if (allowedScreens.some(s => genericName.toLowerCase().includes(s.toLowerCase()))) {
      return genericName;
    }

    return 'App'; // Default for sensitive screens
  }

  /**
   * Check if route is sensitive
   */
  private isSensitiveRoute(route: string): boolean {
    const sensitiveRoutes = [
      'assessment', 'phq', 'gad', 'crisis', 'emergency',
      'safety', 'intervention', 'journal', 'reflection'
    ];

    const routeLower = route.toLowerCase();
    return sensitiveRoutes.some(r => routeLower.includes(r));
  }

  /**
   * Sanitize stack trace
   */
  private sanitizeStack(stack?: string): SanitizedErrorEvent['stack'] {
    if (!stack) return undefined;

    const frames: SanitizedErrorEvent['stack'] = [];
    const lines = stack.split('\n');

    for (const line of lines.slice(0, 10)) { // Limit to 10 frames
      const match = line.match(/at\s+(\S+)\s+\(([^:]+):(\d+):(\d+)\)/);
      if (match && match[1] && match[2] && match[3] && match[4]) {
        frames.push({
          function: match[1],
          filename: this.sanitizeFilename(match[2]),
          lineno: parseInt(match[3], 10),
          colno: parseInt(match[4], 10),
        });
      }
    }

    return frames.length > 0 ? frames : undefined;
  }

  /**
   * Detect environment
   */
  private detectEnvironment(): 'development' | 'staging' | 'production' {
    if (__DEV__) return 'development';
    if (process.env.NODE_ENV === 'staging') return 'staging';
    return 'production';
  }

  /**
   * KILL SWITCH: Immediately disable all external reporting
   * Use this in case of emergency or privacy concern
   */
  kill(): void {
    this.killed = true;
    this.config.enabled = false;
    this.initialized = false;

    if (this.sentryModule) {
      try {
        this.sentryModule.close();
      } catch {
        // Ignore close errors
      }
    }

    logger.security('External error reporter KILLED', 'critical', {
      component: 'ExternalErrorReporter',
      action: 'kill_switch_activated',
    });
  }

  /**
   * Check if reporter is active
   */
  isActive(): boolean {
    return this.config.enabled && this.initialized && !this.killed;
  }

  /**
   * Get reporter status (for monitoring)
   */
  getStatus(): {
    enabled: boolean;
    initialized: boolean;
    killed: boolean;
    environment: string;
  } {
    return {
      enabled: this.config.enabled,
      initialized: this.initialized,
      killed: this.killed,
      environment: this.config.environment,
    };
  }
}

// Singleton export
export const externalErrorReporter = ExternalErrorReporter.getInstance();

// Convenience functions
export const reportExternalError = (error: Error, context?: any) =>
  externalErrorReporter.reportError(error, context);

export const killExternalReporting = () =>
  externalErrorReporter.kill();

export const isExternalReportingActive = () =>
  externalErrorReporter.isActive();
