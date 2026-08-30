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
 * CAUTION when adding a token (MAINT-401 — the hazard changed shape, it did not go away):
 * `flowType` is copied into the sanitized `extra`, which `collectContentText` DOES walk, so
 * a surface token containing a CRISIS_CONTENT_PATTERNS term ('crisis', 'emergency',
 * 'intervention', 'phq-9', 'gad-7', ...) would drop every event from that surface wholesale.
 * The old over-broad pre-filter this note used to warn about is gone; the narrower content
 * scan remains, and it is the one to check a new token against. 'daily-loop' hits none.
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
 * identifiers, crisis terms, the 988 hotline.
 *
 * DEBUG-338: `'988'` is a REGEX with word boundaries, not a bare substring.
 * As a substring it matched hex digit-runs in the structural identifiers
 * `_prepareEvent` stamps on every event — `event_id`, `contexts.trace.trace_id`
 * and `.span_id`, `sdkProcessingMetadata.dynamicSamplingContext` — plus the
 * 9-10 digit `contexts.device.*` memory figures. P('988' in a 32-char hex run)
 * is ~0.7%, and there are several such fields per event, so roughly 2-4% of ALL
 * error events app-wide were being dropped at random with zero crisis content in
 * them. Nothing in privacy-policy.md or the DPIA promises identifier-entropy
 * drops, so that was a bug, not a contract.
 *
 * Use `\b`, NOT a lookbehind — lookbehind is unreliable on Hermes. The
 * alphabetic patterns stay plain substrings deliberately: hex and decimal noise
 * cannot produce them, and substring matching is what catches `suicidal`,
 * `suicide` and `self-harmed` from one entry.
 */
const CRISIS_CONTENT_PATTERNS: readonly (string | RegExp)[] = [
  'phq-9', 'phq9', 'gad-7', 'gad7',
  'crisis', 'suicid', 'self-harm',
  'emergency', 'intervention', /\b988\b/,
];

/**
 * MAINT-401 — replacement token for a wellness-sensitive stack-frame segment.
 *
 * DEBUG-338 ruled that `stacktrace` is structural metadata and exempted it from
 * the content scan. That exemption is correct — a frame is a path, not prose,
 * and dropping the event over one would destroy the crash triage that is the
 * whole reason for transmitting it. But an exemption is not a control: a raw
 * `features/crisis/...` path recreates, through a slot nothing coarsens, the
 * exact signal `sanitizeScreenName` / `isSensitiveRoute` exist to close.
 *
 * So the segment is coarsened rather than the event dropped. The keyword set is
 * the SHARED `isSensitiveRoute` constant, so it provably cannot drift from the
 * screen-name path.
 *
 * A distinct token, not `GENERIC_SCREEN_BUCKET` ('App'), because this lands
 * inside a path where 'App' reads as a real directory name.
 */
const SENSITIVE_PATH_SEGMENT = '[sensitive]';

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

    // MAINT-401: the crisis guarantee is NOT enforced here. It lives at the
    // chokepoint every capture path traverses — `beforeSendHook` ->
    // `containsCrisisContent` -> wholesale drop. A pre-filter on this one method
    // was strictly weaker (it guarded a single entry point) and strictly
    // broader (its keyword list added 'assessment', 'score', 'safety', 'gad',
    // 'phq'), so it advertised a control it did not provide while risking
    // silent suppression of every report from those surfaces. Removed rather
    // than aligned: aligning would have preserved a dead duplicate of a live
    // guarantee in a citable, control-looking form.
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
   *
   * ── ⚠️ THIS OPENS A ZERO-988-AFFORDANCE WINDOW (DEBUG-533 RULING) ──
   *
   * Ruled by `crisis`: this IS a DEBUG-406 conversion site. It fails all three
   * legs of the `NotificationTimePicker` exception, which is the only RN-modal
   * occlusion DEBUG-406 let stand. Recorded here rather than only in the work
   * item, for the reason NotificationTimePicker gives: a ruling that lives where
   * the code cannot see it is how DEBUG-403's four-site analogy survived review.
   *
   * WHAT RENDERS. Not, as first reported, a native window outside our tree.
   * `Sentry.wrap(App)` mounts `FeedbackWidgetProvider` ABOVE
   * `GestureHandlerRootView`, and its render emits our whole app as `children`
   * and THEN, as a later sibling, an `Animated.View` at inset-0 animating to
   * `rgba(0,0,0,0.9)`, and inside that an RN `<Modal transparent>` whose sheet is
   * `flex: 1` below a 64pt spacer. So the occlusion is doubled, and the
   * important half is the FIRST one: a 90%-opaque full-screen backdrop inside
   * our own JS hierarchy. `RootCrisisButton`'s `zIndex: 9999` cannot reach past
   * it — zIndex orders siblings, and that backdrop is a later sibling of the
   * button's ANCESTOR. An RN change that put the crisis button above `<Modal>`
   * would not recover this surface.
   *
   * WHY THE NotificationTimePicker EXCEPTION DOES NOT EXTEND HERE:
   *   • Benign content — FAILS. That ruling's premise is that the picker is
   *     reachable only from Settings by deliberate tap, so it can neither occlude
   *     nor receive a disclosure. This is armed at the app root, so it opens over
   *     `CrisisResources`, over a mid-PHQ-9 `AssessmentFlow`, and over
   *     `VoiceReflectionScreen` right after `scanOnSave`. The wellness-bearing
   *     content is what it OCCLUDES. And the form is a free-text box whose own
   *     placeholder says "avoid typing personal wellness details here", which
   *     concedes it receives them.
   *   • Fixed, non-scrolling, one-tap exits — FAILS, and this is decisive.
   *     Cancel is the LAST CHILD of the widget's `ScrollView`, below the required
   *     textarea and the screenshot controls, with `automaticallyAdjustKeyboard-
   *     Insets` on iOS and `showName`/`showEmail` false so the keyboard is up
   *     whenever the user has engaged at all. There is no backdrop tap (the 64pt
   *     spacer is a bare `View`), `onRequestClose` is Android-back only, and the
   *     pull-down dismiss needs `isScrollAtTop && dy > 200` — dead once scrolled.
   *     Dwell is unbounded.
   *   • iOS-only Modal, Android a native OS dialog — FAILS AND INVERTS. One
   *     `<Modal>` on both platforms, so converting splits nothing; and iOS is the
   *     strictly worse platform here, having no hardware back.
   *
   * WHY IT IS NOT FIXED IN PLACE. The occluder is third-party code we do not
   * render, so we cannot host it in `rootOverlaySlot`, cannot add a backdrop
   * handler, cannot bound the dwell, and cannot inject a 988 control into
   * Sentry's sheet. There is no compensating control available. The structural
   * remedy is our OWN form rendered into `rootOverlaySlot` submitting via
   * `Sentry.captureFeedback()` — a top-level export of @sentry/react-native
   * (`index.d.ts:2`) and exactly what `FeedbackWidget.js:70` itself calls, so the
   * SDK stays the transport and we own the presentation. Tracked separately;
   * doing it must ALSO drop `feedbackIntegration` above, or
   * `FeedbackWidgetProvider` stays mounted and a stray call re-opens this path.
   *
   * MEANWHILE the exposure is bounded by reachability, not by a fix:
   * `bug_reporting` is off in the public App Store build, DEBUG-533 made the
   * shake trigger hard to fire by accident, and the Profile card is a deliberate
   * tap. None of that satisfies the invariant. Do not read the mitigations as
   * closing the ruling.
   *
   * ⚠️ NOTE WHAT NO DETECTOR CAN SEE HERE. `check-modal-occlusion-guard.js`
   * scans `app/src`, so a `<Modal>` in node_modules is invisible to it, and
   * INFRA-531's crisis-constant-import detector matches nothing on this path
   * because nothing here imports from `features/crisis/`. This is a new shape for
   * that family — not "consumes a crisis constant while matching no path
   * pattern", but "mounts a third-party component that occludes the crisis
   * affordance while importing nothing of ours at all". The Protected Paths rows
   * for this file and `ProfileScreen.tsx` are what gate it; a call-site rule in
   * the occlusion guard is tracked separately.
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
   * Concatenate the CONTENT-BEARING surfaces of a Sentry event (DEBUG-338).
   *
   * This used to be `JSON.stringify(event)` — the whole event, structural
   * metadata included. Two problems with that, and one fix for both.
   *
   * SCOPING IS WHAT MAKES PATH-VS-CONTENT EXPRESSIBLE. Once the event is
   * flattened into a single string, a stack frame's `filename` and a free-text
   * `message` are indistinguishable, so "let a crisis-path stack trace through
   * but never crisis prose" cannot be written at all. Walking named surfaces
   * makes `stacktrace.frames[]` structural metadata by construction.
   *
   * WHAT IS DELIBERATELY EXCLUDED, and why each is safe: `event_id`,
   * `contexts.trace`, `sdkProcessingMetadata`, `debug_meta`, `sdk`, `modules`,
   * `release`, `timestamp`, and every `stacktrace.frames[]` entry. All are
   * SDK-generated or build-derived — no code path writes user content into them.
   *
   * WHAT IS DELIBERATELY INCLUDED: `extra`, `tags`, `user`, `breadcrumbs` and
   * `contexts` (minus `trace`). These carry author-supplied data, so anything
   * inside them is content. Scoping down to only `message` + `exception.value`
   * would WEAKEN the privacy contract — do not "simplify" this list.
   *
   * Objects are serialised wholesale rather than walked, so a nested string is
   * still caught. Failure to serialise (a cycle) contributes nothing here, but
   * cannot cause a leak: `beforeSendHook` fails closed on any throw, and
   * `applyAllowlist` runs afterwards and drops these fields anyway.
   */
  private collectContentText(event: any): string {
    const parts: string[] = [];
    const push = (value: unknown): void => {
      if (value === null || value === undefined) return;
      if (typeof value === 'object') {
        try {
          parts.push(JSON.stringify(value));
        } catch {
          // Unserialisable (cyclic) — skip; see the fail-closed note above.
        }
        return;
      }
      parts.push(String(value));
    };

    push(event?.message);
    push(event?.logentry?.message);
    push(event?.logentry?.formatted);
    push(event?.logentry?.params);
    push(event?.transaction);
    push(event?.fingerprint);
    push(event?.request?.url);
    push(event?.extra);
    push(event?.tags);
    push(event?.user);

    // Exception type/value are prose. `stacktrace` is NOT walked — that is the
    // path-vs-content line.
    for (const value of event?.exception?.values ?? []) {
      push(value?.type);
      push(value?.value);
    }

    for (const crumb of event?.breadcrumbs ?? []) {
      push(crumb?.category);
      push(crumb?.message);
      push(crumb?.data);
    }

    // `contexts` minus `trace` — trace holds only SDK-generated hex ids.
    if (event?.contexts && typeof event.contexts === 'object') {
      for (const [key, value] of Object.entries(event.contexts)) {
        if (key === 'trace') continue;
        push(value);
      }
    }

    return parts.join(' ').toLowerCase();
  }

  /**
   * Check if event contains crisis content.
   *
   * A match drops the event WHOLESALE — never a partial scrub. That guarantee
   * predates DEBUG-338 and is pinned by the privacy contract tests; do not
   * soften it into a redaction.
   */
  private containsCrisisContent(event: any): boolean {
    const contentText = this.collectContentText(event);
    return CRISIS_CONTENT_PATTERNS.some(pattern =>
      typeof pattern === 'string'
        ? contentText.includes(pattern)
        : pattern.test(contentText)
    );
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
              function: this.sanitizeFrameFunction(frame.function),
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
   * Sanitize filename to remove potentially sensitive paths.
   *
   * MAINT-401: THIS METHOD IS THE STRUCTURAL SCOPE OF THE FRAMES EXEMPTION.
   * Its only two callers are the `frames[].filename` slot — `applyAllowlist`'s
   * frame map and `sanitizeStack` — so it never sees prose, and the coarsening
   * below therefore cannot reach content. That is deliberate and load-bearing:
   * the same coarsening implemented as a "strip path-shaped substrings before
   * scanning" pre-pass over `collectContentText` would exempt path-SHAPED
   * content wholesale. `crisis_alerts/insert score=21` is the worked example,
   * and `scrubSensitiveData` cannot recover it — `/score[:\s]*[0-9]+/gi`
   * requires `:` or whitespace, and `=` defeats it. Pinned by
   * __tests__/privacy/stackFrameExemption.contract.test.ts.
   */
  private sanitizeFilename(filename: string): string {
    if (!filename) return '';

    // Remove user-specific paths
    return (
      filename
        .replace(/\/Users\/[^/]+\//gi, '/~/')
        .replace(/C:\\Users\\[^\\]+\\/gi, 'C:\\~\\')
        .replace(/node_modules/gi, 'nm')
        // Coarsen SEGMENT-WISE, never the whole path: separators are preserved
        // and non-sensitive segments survive verbatim, so the frame stays
        // triageable. Handles both separators without a split/join.
        .replace(/[^/\\]+/g, (segment) =>
          isSensitiveRoute(segment) ? SENSITIVE_PATH_SEGMENT : segment
        )
    );
  }

  /**
   * MAINT-401: coarsen a stack-frame function name.
   *
   * `frames[].function` is the same side channel in a sibling slot — a
   * symbolicated frame yields `renderCrisisResources` just as readily as the
   * path yields `CrisisResourcesScreen.tsx`, and `createReactNativeRewriteFrames`
   * rewrites only `filename`/`abs_path`/`colno`/`in_app`, never `function`.
   * Coarsening the path alone would be cosmetic.
   *
   * Whole-token test, not segment-wise: a function name is an identifier, not a
   * path. Returns the input unchanged when absent so an anonymous frame keeps
   * its shape.
   */
  private sanitizeFrameFunction(fn?: string): string | undefined {
    if (!fn) return fn;
    return isSensitiveRoute(fn) ? SENSITIVE_PATH_SEGMENT : fn;
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
          // MAINT-401: same coarsening as the applyAllowlist frame map — the two
          // frame paths must not disagree about what a sensitive slot looks like.
          function: this.sanitizeFrameFunction(match[1]) ?? match[1],
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
