/**
 * WELLNESS-DATA DETECTION PATTERNS (MAINT-201)
 *
 * A leaf module owned by the security layer so that SecurityMonitoringService can
 * sanitize the `data` it receives from AnalyticsService WITHOUT importing back from
 * the analytics layer (which would create a security → analytics → security cycle).
 *
 * Terminology: "wellness data" — Being is a consumer-wellness app, not a HIPAA entity.
 *
 * The patterns intentionally overlap with the analytics layer's
 * `PHI_DETECTION_PATTERNS`, which is left untouched. The reason recorded here used to
 * be "it is pinned by passing tests" — true only vacuously when written, because
 * nothing then called the function those tests exercised. It is now genuinely pinned,
 * for a different reason: INFRA-535 wired `containsPHI` into `PHIFilter.scanValue`, so
 * it is a live production identifier on the analytics egress path. The terminology
 * rename remains slated for a separate cleanup ticket (DEBUG-553).
 *
 * DIVERGENCE, DELIBERATE (DEBUG-553, AC4). This set is an exact 7-of-10 subset of the
 * analytics one, byte-identical where present and missing international phone, IPv4
 * and UUID. `PHI_DETECTION_PATTERNS` is authoritative; this copy exists because a
 * security leaf must not import from analytics (see the cycle note above). The gap has
 * no live effect: `sanitizeWellnessData`'s only consumer is `SecurityMonitoringService`,
 * which has zero runtime importers. Reconcile if that ever changes — and note that
 * widening this set collapses more log payloads to `{sanitized:true}`, an observability
 * change rather than a free tightening.
 */

/** Sensitive structured keys stripped from any event-data object before logging. */
const SENSITIVE_KEYS = ['rawText', 'assessmentScores', 'personalInfo', 'userId'] as const;

/**
 * Free-text patterns that indicate wellness data (assessment scores, contact info,
 * crisis content) leaked into a string. Mirrors the analytics-side detector set.
 */
export const WELLNESS_DATA_PATTERNS: RegExp[] = [
  // Assessment scores (PHQ-9 / GAD-7)
  /\b(?:PHQ|GAD)[-\s]?[79]\s*[:=]?\s*\d{1,2}\b/gi,
  // SSN
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
  // Long numeric sequences (potential identifiers)
  /\b\d{10,}\b/g,
  // Email addresses
  /\b[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}\b/gi,
  // US phone numbers
  /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  // Crisis content keywords
  /\b(?:suicide|suicidal|kill\s+(?:myself|yourself)|self[- ]?harm|end\s+(?:my|it\s+all))\b/gi,
  // Raw numeric scores in context
  /\b(?:score|total|result)\s*[:=]?\s*\d{1,2}\b/gi,
];

/**
 * Sanitize an arbitrary event-data value before it is logged or persisted.
 *
 * 1. Drops the sensitive structured keys above.
 * 2. Serializes what remains and scans it for wellness-data patterns; on ANY match
 *    the whole value is collapsed to a non-revealing marker.
 *
 * Always returns a plain object safe to log. Never throws.
 */
export function sanitizeWellnessData(data: unknown): Record<string, unknown> {
  try {
    const base: Record<string, unknown> =
      data && typeof data === 'object' && !Array.isArray(data)
        ? { ...(data as Record<string, unknown>) }
        : { value: data };

    for (const key of SENSITIVE_KEYS) {
      delete base[key];
    }

    const serialized = JSON.stringify(base).normalize('NFKC');
    for (const pattern of WELLNESS_DATA_PATTERNS) {
      pattern.lastIndex = 0; // reset state for global patterns
      if (pattern.test(serialized)) {
        return { sanitized: true, reason: 'wellness_data_detected' };
      }
    }

    return base;
  } catch {
    return { sanitized: true, reason: 'wellness_data_detected' };
  }
}
