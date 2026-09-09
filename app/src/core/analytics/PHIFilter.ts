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
// STATIC import, deliberately. `core/analytics`'s barrel is eager on
// `CrisisResourcesScreen.tsx`, so a lazy require() here would resolve a module
// during a crisis tap. The cost is ten module-scope regexes, which is acceptable
// eagerly and is not acceptable lazily (same rule as the MaterialDesignIcons
// eager-import requirement).
import { containsPHI } from './phiDetection';

/**
 * Result of PHI validation
 */
export interface PHIValidationResult {
  valid: boolean;
  reason?: string;
}

/** Internal: a single scan finding, carried up so `validate` can log once. */
interface PHIViolation {
  reason: string;
  severity: 'medium' | 'high';
}

/**
 * Type-safe event names for analytics
 * Use these constants instead of raw strings
 */
export const AnalyticsEvents = {
  // App lifecycle (INFRA-542 wired these two; session_started/session_ended were
  // deleted by INFRA-552 — they never had a tracker function at all, so the
  // contract test's key enumeration could not see them and no producer existed.)
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',

  // Navigation
  SCREEN_VIEWED: 'screen_viewed',

  // Feature usage (DEBUG-536 restored these six; INFRA-552 had removed them for
  // having zero call sites, which was true then and is not now — every one below
  // is wired to a real emitter in the same PR that restored it.)
  //
  // 🔴 ACCESS, NEVER CONTENT. These say which affordance was reached and how long
  // it took. They must never say what was found, scored, said or selected there.
  // That is the FEAT-457 boundary, and it is the reason these coexist with the
  // published "we never collect any mental health data" promise — the same reason
  // crisis_resources_viewed / crisis_hotline_tapped, bare access signals for a
  // strictly more sensitive affordance, already ship to PostHog today.
  CHECK_IN_STARTED: 'check_in_started',
  CHECK_IN_COMPLETED: 'check_in_completed',
  ASSESSMENT_STARTED: 'assessment_started',
  ASSESSMENT_COMPLETED: 'assessment_completed',
  PRACTICE_STARTED: 'practice_started',
  PRACTICE_COMPLETED: 'practice_completed',

  // Crisis
  CRISIS_RESOURCES_VIEWED: 'crisis_resources_viewed',
  CRISIS_HOTLINE_TAPPED: 'crisis_hotline_tapped',

  // Settings
  SETTINGS_OPENED: 'settings_opened',
  CONSENT_CHANGED: 'consent_changed',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',

  // Learn
  LEARN_CONTENT_VIEWED: 'learn_content_viewed',
  LEARN_MODULE_STARTED: 'learn_module_started',

  // Domain guidance (FEAT-457) — no properties, ever.
  GUIDANCE_OPENED: 'guidance_opened',
} as const;

export type AnalyticsEventType = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

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
  /**
   * WHITELIST: only these event types can be transmitted.
   *
   * DERIVED from `AnalyticsEvents`, not hand-maintained (INFRA-552 AC5). A name in
   * one but not the other cannot transmit and fails SILENTLY — `trackEvent` logs the
   * block and returns — so parity is enforced by construction rather than by a check
   * that has to be remembered. Both had 25 entries and zero drift when this was
   * derived; the point is that the next divergence is now unrepresentable.
   *
   * Know what this does NOT do: it cannot tell whether a whitelisted event has a
   * PRODUCTION EMITTER. That is the `no production emitter` condition, which a
   * parity check structurally cannot see — `analyticsTrackerContract.privacy.test.ts`
   * is what detects it.
   */
  private static readonly SAFE_EVENT_TYPES: ReadonlySet<string> = new Set<string>(
    Object.values(AnalyticsEvents)
  );

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

    // Guidance hardship domains (FEAT-457).
    //
    // DEFENCE-IN-DEPTH, AND INERT AGAINST THE EVENT WE ACTUALLY SHIP.
    // `guidance_opened` carries no properties, so none of these tokens can appear
    // in its payload — these exist solely to make a FUTURE reintroduction of a
    // `domain` property fail closed instead of shipping.
    //
    // The gap they close is real and was measured: before this addition, the
    // values 'conflict' / 'career' / 'grief' / 'pain' matched NOTHING in this
    // list, so the filter would have passed a hardship domain straight through.
    // The only thing standing between that value and PostHog was a sentence in
    // `analytics-architecture.md` — "What We NEVER Collect: … Any mental health
    // data" — which is a published FTC-relevant promise with no mechanical
    // enforcement behind it. This is that enforcement.
    'conflict',
    'career',
    'grief',
    'pain',
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
   * Property keys exempt from the KEY scan and from `containsPHI` (INFRA-535).
   *
   * IT EXEMPTS THE NEW CHECKS ONLY. The pre-existing VALUE keyword scan and the
   * numeric check still apply to every key here — otherwise this set would be a
   * loosening rather than a false-positive fix, and `{screen_name:'grief'}` would
   * start shipping.
   *
   * Two entries are load-bearing and must not be removed:
   *
   *  - `screen_name` segments to ['screen','name'] and `name` is an exact
   *    PHI_KEYWORDS hit. Without it, `screen_viewed` becomes a whole-event reject
   *    — and it fires in the same `useFocusEffect` as `trackCrisisResourcesViewed`,
   *    so crisis-screen reach would silently become unmeasurable.
   *
   *  - the SAFE_NUMERIC_KEYS members, because a 13-digit `Date.now()` matches
   *    `containsPHI`'s `\b\d{10,}\b` identifier pattern. Arming the predicate
   *    without this exemption reintroduces the MAINT-202 defect, which silently
   *    dropped every consent-passing event.
   *
   * Every entry is a hole in the key scan. Additions are hand-reviewed, never
   * derived at runtime.
   */
  private static readonly SAFE_PROPERTY_KEYS: ReadonlySet<string> = new Set([
    'screen_name',
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
   * Split a property key into lowercase segments, across `_`, `-`, `.` and
   * camelCase boundaries. `screen_name` -> ['screen','name'];
   * `userEmail` -> ['user','email'].
   */
  private static keySegments(key: string): string[] {
    return key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map((s) => s.toLowerCase());
  }

  /**
   * Match PHI keywords against a property KEY by segment, not by substring.
   *
   * Segment matching is what makes key scanning survivable: substring matching
   * blocks `campaign_id` (contains "pain") and `notation` (contains "note"), and a
   * filter that blocks ordinary keys is one the next person weakens.
   *
   * A single-segment keyword matches a segment that EQUALS it or STARTS WITH it —
   * the prefix arm is required because `suicid` and `harm` are deliberately stems
   * rather than whole words. A multi-segment keyword (`crisis_contact`) must match
   * consecutive segments.
   *
   * Applies to KEYS ONLY. Word-boundary logic must never be applied to VALUES: it
   * would loosen the `suicid` stem, which is exactly what it is a stem to catch.
   */
  private static keywordInKey(key: string): string | null {
    const segments = this.keySegments(key);
    for (const keyword of this.PHI_KEYWORDS) {
      const parts = keyword.split('_');
      if (parts.length > 1) {
        for (let i = 0; i + parts.length <= segments.length; i++) {
          if (parts.every((part, j) => segments[i + j] === part)) return keyword;
        }
      } else if (segments.some((seg) => seg === keyword || seg.startsWith(keyword))) {
        return keyword;
      }
    }
    return null;
  }

  /**
   * Scan a single property value. Recurses into objects AND arrays — the array arm
   * closes a live hole: before INFRA-535 the value branch tested
   * `typeof value === 'string'` and the nested branch excluded arrays, so
   * `{tags:['grief']}` shipped intact.
   *
   * Returns the first violation found, or null. It does NOT log — see `validate`.
   */
  private static scanValue(
    key: string,
    value: unknown,
    keyIsExempt: boolean
  ): PHIViolation | null {
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      for (const keyword of this.PHI_KEYWORDS) {
        if (lowerValue.includes(keyword)) {
          return {
            reason: `PHI keyword detected: "${keyword}" in key "${key}"`,
            severity: 'high',
          };
        }
      }
      if (!keyIsExempt && containsPHI(value)) {
        return { reason: `PHI pattern detected in key "${key}"`, severity: 'high' };
      }
      return null;
    }

    if (typeof value === 'number') {
      return this.SAFE_NUMERIC_KEYS.has(key)
        ? null
        : { reason: `Suspicious numeric value in key: "${key}"`, severity: 'medium' };
    }

    if (Array.isArray(value)) {
      for (const element of value) {
        const violation = this.scanValue(key, element, keyIsExempt);
        if (violation) return violation;
      }
      return null;
    }

    if (value !== null && typeof value === 'object') {
      return this.scanPayload(value as Record<string, unknown>);
    }

    return null;
  }

  /**
   * Scan a whole payload, returning the first violation or null.
   *
   * Deliberately does no logging: the old implementation recursed through
   * `validate()` itself, so a nested violation logged from the inner frame.
   * `logSecurity` reaches `LogLevel.ERROR`, a 1000-entry FIFO audit ring and a
   * production `console.error` synchronously, so the number of calls per event is
   * a crisis-path concern, not a cosmetic one.
   */
  private static scanPayload(eventData: Record<string, unknown>): PHIViolation | null {
    for (const [key, value] of Object.entries(eventData)) {
      const keyIsExempt = this.SAFE_PROPERTY_KEYS.has(key);

      if (!keyIsExempt) {
        const keyword = this.keywordInKey(key);
        if (keyword) {
          return {
            reason: `PHI keyword detected in property key: "${keyword}" in key "${key}"`,
            severity: 'high',
          };
        }
      }

      const violation = this.scanValue(key, value, keyIsExempt);
      if (violation) return violation;
    }
    return null;
  }

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
    // 1. WHITELIST CHECK: Event type must be explicitly allowed.
    //    The event NAME is never keyword-scanned — `crisis_hotline_tapped`
    //    contains the keyword `hotline_number`'s first segment, and scanning the
    //    name (or shortening that keyword to `hotline`) would silently and
    //    permanently self-block the app's 988-reach signal.
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

    // 2. PAYLOAD SCAN: keys, values, numerics, nested objects and arrays.
    //    One aggregated log for the whole invocation, never one per property.
    const violation = this.scanPayload(eventData);
    if (violation) {
      logSecurity(`PHI Filter: Blocked event "${eventType}" — ${violation.reason}`, violation.severity);
      return { valid: false, reason: violation.reason };
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

