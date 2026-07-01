/**
 * EXTERNAL ERROR REPORTER - INFRA-61
 *
 * Privacy-first external error reporting service.
 *
 * PRIVACY PRINCIPLES:
 * - Being is NOT a HIPAA-covered entity (wellness app, not healthcare). See
 *   docs/legal/regulatory-applicability.md for the applicable regulatory frame.
 * - We voluntarily implement strong privacy practices per our privacy policy
 * - Local-first data architecture: wellness data never leaves device
 * - Only crash/error metadata sent externally (no wellness data, no sensitive
 *   identifiers)
 *
 * DESIGN:
 * - Abstracted interface supporting any error reporting backend (Sentry, etc.)
 * - Allowlist-based sanitization: only explicitly allowed fields transmitted
 * - Multi-layer sensitive-data scrubbing before any external transmission
 * - Kill switch for immediate disable in production
 * - Crisis events logged locally only (never external)
 *
 * ACTIVATION:
 * - Set SENTRY_DSN environment variable when ready
 * - Any Sentry tier is sufficient (including free)
 */

import { Platform } from 'react-native';
import { LogCategory, logger } from './ProductionLogger';
import { env } from '@/core/config/env';
import { isSensitiveRoute, sanitizeScreenName } from '@/core/utils/sensitiveScreens';
// MAINT-248: canonical sensitive-data patterns single source of truth. The
// reporter keeps only its two reporter-specific extras (JWT, base64) below.
import { SENSITIVE_DATA_PATTERNS as CORE_SENSITIVE_DATA_PATTERNS } from './SensitiveDataPatterns';

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

  // Context (no sensitive data)
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

  // Performance (no sensitive data)
  'duration',
  'operationType',

  // App state (no sensitive data)
  'screenName',       // Generic screen names only
  'flowType',         // morning/midday/evening only
  'networkStatus',
  'memoryUsage',
] as const;

/**
 * BLOCKLIST: Fields that must NEVER be sent externally
 * Defense-in-depth: blocked even if somehow bypasses allowlist
 */
// Exported (read-only) so privacy regression tests can pin the contract that
// sensitive fields — e.g. wellness scores — are never sent to Sentry.
export const BLOCKED_FIELDS = [
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
  'journal', 'reflection', 'note', 'content', 'annotation',

  // Stoic/philosophical content
  'principle', 'virtue', 'practice', 'exercise',
] as const;

/**
 * REPORTER-SPECIFIC SENSITIVE-DATA PATTERNS
 *
 * MAINT-248: only the two patterns that are NOT in the canonical
 * SensitiveDataPatterns set live here. The UUID / PHQ / GAD / score / email /
 * phone / SSN / mood / feeling / thought patterns the reporter used inline are
 * all covered by the canonical set, so they were removed (zero coverage loss).
 */
const REPORTER_EXTRA_PATTERNS = [
  // JWT tokens — reporter-specific (Sentry events can carry auth headers)
  /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,

  // Base64-encoded data (potential sensitive payload) — reporter-specific
  /(?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g,
];

/**
 * SENSITIVE-DATA PATTERNS: canonical patterns + the two reporter-specific extras.
 * Exported (read-only) so privacy regression tests can pin the scrub contract.
 */
export const SENSITIVE_DATA_PATTERNS = [
  ...CORE_SENSITIVE_DATA_PATTERNS,
  ...REPORTER_EXTRA_PATTERNS,
];

/**
 * CRISIS / WELLNESS CONTENT SUBSTRINGS
 *
 * Content that must never reach an external processor (Sentry) — assessment
 * identifiers, crisis terms, the 988 hotline. Single-sourced so the error path
 * (`containsCrisisContent`) and the FEAT-284 feedback path
 * (`feedbackContainsCrisisContent`) enforce the identical set.
 */
const CRISIS_CONTENT_PATTERNS = [
  'phq-9', 'phq9', 'gad-7', 'gad7',
  'crisis', 'suicid', 'self-harm',
  'emergency', 'intervention', '988',
] as const;

/* ------------------------------------------------------------------------- *
 * FEAT-284 — in-app bug/feedback reporting (Sentry `captureFeedback`)
 *
 * These are pure, exported so the precommit privacy contract
 * (__tests__/privacy/feedbackScrub.contract.test.ts) can pin them directly.
 *
 * WHY A SEPARATE PATH: `captureFeedback` emits a `type:'feedback'` event that
 * BYPASSES `beforeSend` (verified in @sentry/core@10.x: client.js runs
 * beforeSend only when `event.type === undefined`). So none of the class's
 * beforeSendHook allowlist/denylist scrub runs for feedback. `scrubFeedbackEvent`
 * is registered as a global event processor (which DOES run for feedback via
 * prepareEvent) and is the enforcement point that both scrubs and can drop.
 * ------------------------------------------------------------------------- */

/**
 * True if any crisis/wellness content appears anywhere in `value` (deep, via
 * JSON serialization). Used as the pre-submit guard (block + prompt-rephrase)
 * and as the event-processor drop backstop.
 */
export function feedbackContainsCrisisContent(value: unknown): boolean {
  let str: string;
  try {
    str = JSON.stringify(value ?? '').toLowerCase();
  } catch {
    return true; // Unserializable → treat as unsafe (fail-safe).
  }
  return CRISIS_CONTENT_PATTERNS.some((p) => str.includes(p));
}

/**
 * Pattern-scrub + truncate a user-authored feedback string. Redacts inline
 * scores, emails, tokens, etc. via the shared SENSITIVE_DATA_PATTERNS and caps
 * length at 500 (matching the reporter's `sanitizeString` contract).
 */
export function sanitizeFeedbackMessage(message: string): string {
  if (!message || typeof message !== 'string') return '';
  let out = message;
  for (const pattern of SENSITIVE_DATA_PATTERNS) {
    out = out.replace(pattern, '[REDACTED]');
  }
  return out.substring(0, 500);
}

/**
 * Global Sentry event processor for FEAT-284 feedback events.
 *
 * - Non-feedback events pass through untouched (beforeSend still owns them).
 * - Feedback events: drop entirely on any surviving crisis content; strip the
 *   merged-scope leak vectors (breadcrumbs, extra, tags, request, rich device
 *   context); reduce `user` to the anonymous uid ONLY (never email/ip/username);
 *   never carry an `associated_event_id`; pattern-scrub the message. Preserves
 *   top-level release/environment/platform for triage.
 * - Fail-safe: any throw → return null (drop), never fail-open.
 */
export function scrubFeedbackEvent(event: any): any | null {
  if (!event || event.type !== 'feedback') return event;
  try {
    // Strip scope data that prepareEvent merges onto feedback events FIRST.
    // Breadcrumbs/tags/extra routinely carry screen names (PHQ9ResultsScreen);
    // removing them means an otherwise-clean report isn't force-dropped just for
    // having navigated a sensitive screen earlier in the session.
    delete event.breadcrumbs;
    delete event.extra;
    delete event.tags;
    delete event.request;
    delete event.server_name;

    // Identity: keep ONLY the anonymous Supabase uid; drop email/ip/username.
    if (event.user) {
      event.user = event.user.id ? { id: event.user.id } : undefined;
    }

    // Contexts: keep only the (scrubbed) feedback block — drop device/os/app,
    // which can carry a personal device name.
    if (event.contexts) {
      const fb = event.contexts.feedback;
      if (fb) {
        delete fb.associated_event_id;
        if (fb.message) fb.message = sanitizeFeedbackMessage(fb.message);
        if (fb.name) fb.name = sanitizeFeedbackMessage(fb.name);
      }
      event.contexts = fb ? { feedback: fb } : {};
    }

    // Backstop drop: after stripping + scrubbing, if crisis/wellness content
    // still survives (only possible in the user message), drop the whole event.
    // The pre-submit guard in submitFeedback is the primary, user-visible gate.
    if (feedbackContainsCrisisContent(event)) return null;

    return event;
  } catch {
    return null; // Fail-safe: drop on any error.
  }
}

/** Outcome of a feedback submission (maps to the screen's confirmation UI). */
export type FeedbackResult = 'submitted' | 'blocked' | 'noop' | 'error';

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

    // Expo requires EXPO_PUBLIC_ prefix for client-side env vars.
    // Schema-validated at startup (core/config/env.ts) — empty string is
    // the documented "Sentry disabled" sentinel (treated falsy below).
    const envDsn = env.EXPO_PUBLIC_SENTRY_DSN;
    const resolvedDsn = dsn || envDsn;
    if (!resolvedDsn) {
      logger.info(LogCategory.SYSTEM, 'External error reporting not configured (no DSN)');
      return false;
    }

    try {
      this.config.dsn = resolvedDsn;
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

            // Disable features that could leak sensitive data
            autoSessionTracking: false,
            enableAutoPerformanceTracing: false,
            attachStacktrace: true,
            normalizeDepth: 3, // Limit depth to prevent deep object exposure
          });

          // FEAT-284: feedback events (captureFeedback) BYPASS beforeSend, so
          // register a global event processor as the enforcement point. It is a
          // no-op for non-feedback events (which beforeSend still scrubs).
          if (typeof this.sentryModule.addEventProcessor === 'function') {
            this.sentryModule.addEventProcessor(scrubFeedbackEvent);
          }

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
   * FEAT-284: Submit an in-app bug report / feedback via Sentry captureFeedback.
   *
   * Privacy contract (enforced here + by the scrubFeedbackEvent processor):
   * - Empty DSN / not active / killed → silent no-op ('noop'), never throws.
   * - Pre-submit guard: a message with crisis/wellness content is BLOCKED
   *   ('blocked') so the screen can prompt the user to rephrase — nothing is
   *   sent. This is stricter (and more honest) than a silent drop.
   * - The message is pattern-scrubbed before send; identity is the anonymous
   *   Supabase uid ONLY (caller supplies it — this module must not import the
   *   Supabase service). No attachments, no associated event id.
   */
  async submitFeedback(input: {
    message: string;
    name?: string;
    email?: string;
    userId?: string | null;
  }): Promise<FeedbackResult> {
    // Empty-DSN (dev/sim) and killed states short-circuit before any Sentry call.
    if (!this.isActive() || !this.sentryModule) {
      return 'noop';
    }

    const message = (input.message ?? '').trim();
    if (!message) return 'blocked';

    // Primary gate: never let crisis/wellness content reach the processor.
    if (feedbackContainsCrisisContent(message) || feedbackContainsCrisisContent(input.name ?? '')) {
      logger.warn(LogCategory.SECURITY, 'Feedback blocked pre-submit: wellness/crisis content');
      return 'blocked';
    }

    try {
      // Reporter identity: anonymous uid only, never an SDK default / PII.
      if (input.userId && typeof this.sentryModule.setUser === 'function') {
        this.sentryModule.setUser({ id: input.userId });
      }

      const payload: { message: string; name?: string; email?: string } = {
        message: sanitizeFeedbackMessage(message),
      };
      if (input.name) payload.name = sanitizeFeedbackMessage(input.name);
      // Email is an intentional contact field — truncate only (pattern-scrubbing
      // would redact the address itself). It is user-typed and opt-in.
      if (input.email) payload.email = input.email.trim().substring(0, 254);

      this.sentryModule.captureFeedback(payload);
      return 'submitted';
    } catch {
      logger.error(LogCategory.SYSTEM, 'Feedback submission failed silently');
      return 'error';
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

      // Apply sensitive-data pattern scrubbing
      return this.scrubSensitiveData(sanitized);
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
        if (isSensitiveRoute(route)) {
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
    return CRISIS_CONTENT_PATTERNS.some(pattern => eventStr.includes(pattern));
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
   * Scrub sensitive-data patterns from event
   */
  private scrubSensitiveData(event: any): any {
    const eventStr = JSON.stringify(event);
    let scrubbed = eventStr;

    // Apply all sensitive-data patterns
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

    const screenName = sanitizeScreenName(context?.screenName);
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
   * Sanitize string by removing sensitive-data patterns
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
    if ((process.env.NODE_ENV as string) === 'staging') return 'staging';
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

/**
 * FEAT-284: Submit an in-app bug report / feedback. Caller supplies the anonymous
 * Supabase uid (this module must not import the Supabase service — would create a
 * dependency cycle, since Supabase imports the logger).
 */
export const submitExternalFeedback = (input: {
  message: string;
  name?: string;
  email?: string;
  userId?: string | null;
}): Promise<FeedbackResult> => externalErrorReporter.submitFeedback(input);
