/**
 * PHI Filter for Analytics Events
 *
 * Whitelist-based validation ensuring only explicitly safe events
 * are transmitted to analytics. This is a COMPLIANCE REQUIREMENT.
 *
 * Design principle: If an event type isn't in SAFE_EVENT_TYPES,
 * it doesn't get sent. Period.
 *
 * @see docs/architecture/analytics-architecture.md
 */

import { logSecurity } from '@/core/services/logging';

/**
 * Result of PHI validation
 */
export interface PHIValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * PHI Filter - Whitelist-based analytics event validation
 *
 * CRITICAL: This class is the last line of defense before analytics
 * events are transmitted. Any PHI that gets past this filter is a
 * compliance violation.
 */
export class PHIFilter {
  /**
   * WHITELIST: Only these event types can be transmitted
   * If it's not here, it doesn't get sent.
   */
  private static readonly SAFE_EVENT_TYPES: ReadonlySet<string> = new Set([
    // App lifecycle
    'app_opened',
    'app_backgrounded',
    'session_started',
    'session_ended',

    // Navigation (screen names only, no content)
    'screen_viewed',

    // Feature usage (counts only, no content/values)
    'check_in_started',
    'check_in_completed',
    'assessment_started',
    'assessment_completed',
    'practice_started',
    'practice_completed',
    'breathing_exercise_started',
    'breathing_exercise_completed',

    // Crisis (access tracking only, no contact details)
    'crisis_resources_viewed',
    'crisis_hotline_tapped',

    // Settings
    'settings_opened',
    'consent_changed',

    // Errors (sanitized - no PHI in error messages)
    'error_occurred',

    // Onboarding
    'onboarding_started',
    'onboarding_completed',
    'onboarding_step_completed',

    // Learn tab
    'learn_content_viewed',
    'learn_module_started',
    'learn_module_completed',
  ]);

  /**
   * BLOCKLIST: Keywords that indicate PHI - block if detected in data
   * These patterns catch accidental PHI leakage in event properties
   */
  private static readonly PHI_KEYWORDS: ReadonlyArray<string> = [
    // Assessment scores
    'score',
    'phq',
    'gad',
    'severity',
    'result',

    // Mood/mental health
    'mood',
    'feeling',
    'emotion',
    'anxious',
    'depressed',

    // Crisis content
    'crisis_contact',
    'emergency_contact',
    'hotline_number',
    'suicid',
    'harm',

    // Journal/notes
    'journal',
    'note',
    'entry',
    'reflection',
    'thought',

    // Personal identifiers
    'email',
    'phone',
    'name',
    'address',
  ];

  /**
   * Safe numeric property keys (won't trigger numeric value blocking)
   */
  private static readonly SAFE_NUMERIC_KEYS: ReadonlySet<string> = new Set([
    'duration',
    'duration_ms',
    'duration_seconds',
    'count',
    'timestamp',
    'step',
    'index',
    'page',
    'version',
  ]);

  /**
   * Validate an analytics event before transmission
   *
   * @param eventType - The event name
   * @param eventData - Properties attached to the event
   * @returns Validation result with reason if blocked
   */
  static validate(
    eventType: string,
    eventData: Record<string, unknown>
  ): PHIValidationResult {
    // 1. WHITELIST CHECK: Event type must be explicitly allowed
    if (!this.SAFE_EVENT_TYPES.has(eventType)) {
      logSecurity(
        `PHI Filter: Blocked non-whitelisted event type: ${eventType}`,
        'medium'
      );
      return {
        valid: false,
        reason: `Event type "${eventType}" not in whitelist`,
      };
    }

    // 2. PHI KEYWORD CHECK: Scan VALUES only for PHI indicators
    // (Keys are controlled by us, so we only check the actual data values)
    for (const [key, value] of Object.entries(eventData)) {
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        for (const keyword of this.PHI_KEYWORDS) {
          if (lowerValue.includes(keyword)) {
            logSecurity(
              `PHI Filter: Blocked event with PHI keyword: ${keyword}`,
              'high'
            );
            return {
              valid: false,
              reason: `PHI keyword detected: "${keyword}" in key "${key}"`,
            };
          }
        }
      }
    }

    // 3. NUMERIC VALUE CHECK: Block suspicious numeric values
    // (potential assessment scores, mood values, etc.)
    for (const [key, value] of Object.entries(eventData)) {
      if (typeof value === 'number' && !this.SAFE_NUMERIC_KEYS.has(key)) {
        logSecurity(
          `PHI Filter: Blocked suspicious numeric in key: ${key}`,
          'medium'
        );
        return {
          valid: false,
          reason: `Suspicious numeric value in key: "${key}"`,
        };
      }
    }

    // 4. NESTED OBJECT CHECK: Recursively validate nested data
    for (const [key, value] of Object.entries(eventData)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const nestedResult = this.validate(eventType, value as Record<string, unknown>);
        if (!nestedResult.valid) {
          return nestedResult;
        }
      }
    }

    return { valid: true };
  }

  /**
   * Check if an event type is in the whitelist
   * Useful for compile-time validation
   */
  static isWhitelisted(eventType: string): boolean {
    return this.SAFE_EVENT_TYPES.has(eventType);
  }

  /**
   * Get list of all whitelisted event types
   * Useful for documentation and testing
   */
  static getWhitelistedEvents(): string[] {
    return Array.from(this.SAFE_EVENT_TYPES);
  }
}

/**
 * Type-safe event names for analytics
 * Use these constants instead of raw strings
 */
export const AnalyticsEvents = {
  // App lifecycle
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',

  // Navigation
  SCREEN_VIEWED: 'screen_viewed',

  // Feature usage
  CHECK_IN_STARTED: 'check_in_started',
  CHECK_IN_COMPLETED: 'check_in_completed',
  ASSESSMENT_STARTED: 'assessment_started',
  ASSESSMENT_COMPLETED: 'assessment_completed',
  PRACTICE_STARTED: 'practice_started',
  PRACTICE_COMPLETED: 'practice_completed',
  BREATHING_EXERCISE_STARTED: 'breathing_exercise_started',
  BREATHING_EXERCISE_COMPLETED: 'breathing_exercise_completed',

  // Crisis
  CRISIS_RESOURCES_VIEWED: 'crisis_resources_viewed',
  CRISIS_HOTLINE_TAPPED: 'crisis_hotline_tapped',

  // Settings
  SETTINGS_OPENED: 'settings_opened',
  CONSENT_CHANGED: 'consent_changed',

  // Errors
  ERROR_OCCURRED: 'error_occurred',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',

  // Learn
  LEARN_CONTENT_VIEWED: 'learn_content_viewed',
  LEARN_MODULE_STARTED: 'learn_module_started',
  LEARN_MODULE_COMPLETED: 'learn_module_completed',
} as const;

export type AnalyticsEventType = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];
