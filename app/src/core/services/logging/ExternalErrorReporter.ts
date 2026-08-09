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
  'level',           // INFRA-295: fatal vs error — no user content, and dropping
                     // it flattens every crash to the same severity in Sentry.
                     // Validated against ALLOWED_LEVELS in applyAllowlist.

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
  'flowType',         // closed PracticeIdentity set only — clamped at runtime, see ALLOWED_FLOW_TYPES
  'networkStatus',
  'memoryUsage',
] as const;

import type { PracticeIdentity } from '@/core/types/practice-identity';

/**
 * INFRA-295: Sentry's `level` is a closed enum. Anything outside it is dropped
 * rather than forwarded, so the field can never become a free-text channel.
 */
const ALLOWED_LEVELS = ['fatal', 'error', 'warning', 'log', 'info', 'debug'] as const;

/**
 * FEAT-298 slice 4: same reasoning as ALLOWED_LEVELS, applied to `flowType`.
 *
 * `flowType` is on ALLOWED_ERROR_FIELDS and was copied through verbatim into a field typed
 * `string | undefined` — so it was a FREE-TEXT CHANNEL into Sentry guarded only by
 * TypeScript. Widening the compile-time union does nothing about that; a runtime clamp
 * does. Anything outside the closed PracticeIdentity set is dropped, not forwarded.
 *
 * Carries the PRESENTATION identity ('daily-loop'), never the persisted record token
 * ('daily'): the breadcrumb answers "which surface did this error occur on". Mixing in the
 * CheckInType vocabulary would make a future record-schema change ripple into telemetry.
 *
 * CAUTION when adding a token: `isCrisisRelated` keyword-scans the stringified context for
 * terms including 'safety', 'crisis', 'emergency'. A surface token containing one would
 * silently suppress EVERY error report from that surface. 'daily-loop' hits none.
 */
const ALLOWED_FLOW_TYPES: readonly PracticeIdentity[] = [
  'morning',
  'midday',
  'evening',
  'daily-loop',
];

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
 * FEAT-284 — in-app bug/feedback reporting (Sentry feedback widget)
 *
 * The surface is Sentry's native feedback widget (message + screenshot),
 * triggered by shake-to-report or the Profile entry. It is INTERNAL-ONLY: the
 * whole thing is gated behind the build-time `bug_reporting` flag, which is ON
 * for TestFlight/dev and MUST be flipped OFF before the public App Store launch
 * (there is no build-time TestFlight-vs-App-Store distinction — same binary).
 *
 * PRIVACY POSTURE (deliberately useful, not maximal — internal tool, owner's
 * own data): the screenshot is intentional and never scrubbed. Breadcrumbs ride
 * along because they are ALREADY sanitized app-wide by `beforeBreadcrumbHook`
 * (drops ui-interaction and sensitive-route nav, scrubs messages) and are the trail
 * a bug report needs. `scrubFeedbackEvent` (a global event processor) applies
 * light identity hygiene + a message pattern-scrub as defense-in-depth.
 *
 * WHY A PROCESSOR: `captureFeedback` (which the widget calls) emits a
 * `type:'feedback'` event that BYPASSES `beforeSend` (verified in
 * @sentry/core@10.x: beforeSend runs only when `event.type === undefined`). A
 * global event processor DOES run for feedback (via prepareEvent), so it is the
 * only place to touch the outbound feedback event.
 * ------------------------------------------------------------------------- */

/**
 * Pattern-scrub + truncate a user-authored feedback string. Redacts inline
 * secrets/scores/emails via the shared SENSITIVE_DATA_PATTERNS and caps length
 * at 500 (matching the reporter's `sanitizeString` contract).
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
 * - Feedback events: keep the useful debugging context (screenshot attachment,
 *   already-sanitized breadcrumbs, device, release) but apply light hygiene —
 *   reduce `user` to the anonymous uid ONLY (never email/ip/username), never
 *   cross-link via `associated_event_id`, and pattern-scrub the typed message.
 * - Fail-safe: any throw → return null (drop), never fail-open.
 */
export function scrubFeedbackEvent(event: any): any | null {
  if (!event || event.type !== 'feedback') return event;
  try {
    // Identity hygiene: keep ONLY the anonymous Supabase uid; never email/ip.
    if (event.user) {
      event.user = event.user.id ? { id: event.user.id } : undefined;
    }

    const fb = event.contexts?.feedback;
    if (fb) {
      // Don't link a feedback report to a prior (possibly wellness-context) error.
      delete fb.associated_event_id;
      if (fb.message) fb.message = sanitizeFeedbackMessage(fb.message);
    }

    return event;
  } catch {
    return null; // Fail-safe: drop on any error.
  }
}

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

            // FEAT-284: register the in-app feedback widget (shake-to-report /
            // Profile entry → Sentry's native form + screenshot). Only wired
            // when a DSN is present, so the dev/sim (empty DSN) build never gets
            // it. Screenshot is intentional (a bug reporter needs it) — the
            // wellness-data guardrail is that the whole surface is gated OFF for
            // the public App Store build (bug_reporting flag). Feedback events
            // are still sanitized by scrubFeedbackEvent (registered below).
            integrations: (defaultIntegrations: any[]) => [
              ...defaultIntegrations,
              this.sentryModule.feedbackIntegration({
                enableScreenshot: true,
                enableTakeScreenshot: true,
                showName: false,
                showEmail: false,
                showBranding: false,
                formTitle: 'Report a bug',
                submitButtonLabel: 'Send report',
                messagePlaceholder:
                  "What happened? A screenshot is attached — avoid typing personal wellness details here.",
              }),
            ],

            // INFRA-295 — release-health session tracking.
            //
            // MIND THE OPTION NAME. The SDK reads `enableAutoSessionTracking`.
            // The `autoSessionTracking` key this file used to pass does not
            // exist in @sentry/react-native: unrecognized keys are forwarded
            // verbatim to the native layer, which ignores it and applies its own
            // default of ON. So the "sessions are disabled" posture the previous
            // comment claimed was never real — sessions have been transmitting
            // from every non-__DEV__ build. This makes the actual behaviour
            // explicit and intentional rather than accidental. Dev/sim still
            // no-ops because the DSN is empty there, so no env gate is needed.
            //
            // A session envelope is NOT an event: it never passes through
            // beforeSend, normalizeDepth, or the FEAT-284 event processor. Its
            // schema is fixed (sid/did/started/duration/status/errors + release
            // and environment attrs) and has no field for user content, so there
            // is no wellness-data path — but `did` is a per-install identifier.
            // See docs/legal/dpia-sensitive-wellness-data.md and privacy-policy §5.1.
            enableAutoSessionTracking: true,

            // Performance tracing stays OFF — enabling it is INFRA-297's scope
            // and is deliberately deferred. Transactions bypass beforeSend the
            // same way sessions do, so that work needs its own
            // beforeSendTransaction before any sample rate is raised above zero.
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
      flowType?: PracticeIdentity;
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
   * FEAT-284: Open Sentry's in-app feedback widget (message + screenshot).
   *
   * No-ops safely when reporting is inactive (empty DSN on dev/sim, killed, or
   * the feedback integration never registered), so the shake gesture and Profile
   * entry are harmless in dev. The widget itself requires `Sentry.wrap(App)` —
   * see App.tsx. Feedback events are sanitized by the scrubFeedbackEvent
   * processor registered in initialize().
   */
  showFeedbackForm(): void {
    if (!this.isActive() || !this.sentryModule) return;
    try {
      if (typeof this.sentryModule.showFeedbackWidget === 'function') {
        this.sentryModule.showFeedbackWidget();
      }
    } catch {
      logger.warn(LogCategory.SYSTEM, 'showFeedbackWidget failed');
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
          // INFRA-295: `mechanism` is what the SDK reads to decide whether a JS
          // error is a HARD CRASH (isHardCrash() requires handled === false &&
          // type === 'onerror'), and beforeSend runs BEFORE envelope creation.
          // Dropping it here meant no JS fatal ever marked its session crashed,
          // so crash-free-session-rate silently counted native crashes only.
          // Copy the three named scalars explicitly — never spread — so a richer
          // `mechanism.data` from a future SDK cannot ride along as a smuggling
          // channel. Pinned by __tests__/privacy/releaseHealthSession.contract.test.ts.
          ...(ex.mechanism
            ? {
                mechanism: {
                  // Type-guard each scalar. `mechanism.data` / `.source` /
                  // `.exception_id` / `.parent_id` are deliberately NOT copied —
                  // `data` in particular is an open `{[key: string]: string |
                  // boolean}` bag the SDK documents as "arbitrary data, e.g. the
                  // handler name and the event target", which is not
                  // privacy-neutral.
                  type:
                    typeof ex.mechanism.type === 'string' ? ex.mechanism.type : 'generic',
                  ...(typeof ex.mechanism.handled === 'boolean' && {
                    handled: ex.mechanism.handled,
                  }),
                  ...(typeof ex.mechanism.synthetic === 'boolean' && {
                    synthetic: ex.mechanism.synthetic,
                  }),
                },
              }
            : {}),
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

    // INFRA-295: `level` is on the allowlist above, but the bare copy would pass
    // through whatever it was handed. Sentry's level is a closed six-value enum,
    // so validate against it — a future `captureMessage(msg, someVariable)`
    // must not be able to smuggle a free-text string out through this field.
    if (filtered.level !== undefined && !ALLOWED_LEVELS.includes(filtered.level)) {
      delete filtered.level;
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

    // Runtime clamp — see ALLOWED_FLOW_TYPES. A value outside the closed set is dropped
    // rather than forwarded, so this field can never become a free-text channel.
    if (
      context?.flowType !== undefined &&
      ALLOWED_FLOW_TYPES.includes(context.flowType as PracticeIdentity)
    ) {
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
 * FEAT-284: Open the in-app bug/feedback widget (Sentry). Safe no-op when
 * reporting is inactive (dev/sim empty DSN). Gated at call sites by
 * isFeatureEnabled('bug_reporting').
 */
export const showFeedbackForm = (): void => externalErrorReporter.showFeedbackForm();
