/**
 * PHI detection for analytics events (MAINT-202).
 *
 * Scans a user-supplied analytics `data` payload for wellness-data and
 * personal-identifier patterns. Extracted from AnalyticsService so the pure
 * detection logic can be unit-tested in isolation (no singleton /
 * native-module graph).
 *
 * STATUS — one production consumer (DEBUG-553). `containsPHI` is imported by
 * `PHIFilter` and called from `PHIFilter.scanValue`, per string property value,
 * skipped when the key is in `SAFE_PROPERTY_KEYS`. That is reached from
 * `PHIFilter.validate` <- `useAnalytics.trackEvent`, so it runs on every tracked
 * event. INFRA-535 armed it; before that it had no production importer at all.
 * Note the predicate does NOT by itself "gate" an event: it is one of several
 * checks inside `scanValue`, and it never sees numeric values or property keys.
 *
 * This docblock previously named two scan sites, `sanitizeEvent` and
 * `AnalyticsPrivacyEngine.validatePrivacyProtection`. Neither exists anywhere in
 * the repo. They were real when this module was written (MAINT-202) and lived
 * only on the custom-API `AnalyticsService` path that INFRA-214 deleted; the
 * prose was orphaned by that deletion rather than being wrong when authored.
 * Recorded so the next reader does not repeat the archaeology.
 *
 * KEEP — do not delete or merge (DEBUG-553, AC5). Deleting this module removes a
 * live analytics gate. Merging it into the security layer's
 * `wellnessDataPatterns.ts` is forbidden by that file's own layering constraint:
 * a security leaf must not import from analytics.
 *
 * The import in `PHIFilter` must stay STATIC — the `core/analytics` barrel is
 * eager on `CrisisResourcesScreen.tsx` (FEAT-376), so a lazy import here would
 * resolve a module during a crisis tap.
 *
 * SCAN SURFACE (non-negotiable): callers pass the event `data` payload ONLY,
 * never the service-injected envelope (`eventType`, `timestamp`, `sessionId`).
 * The envelope is service-controlled and PHI-safe — `timestamp` is a numeric
 * clock value (separately hour-rounded + temporally noised for privacy),
 * `sessionId` is `session_<date>_<random>`, and `eventType` is a fixed enum.
 * Scanning the whole envelope previously false-matched the 13-digit
 * `Date.now()` timestamp against the `\d{10,}` "long numeric sequence" pattern,
 * so every consent-passing event was rejected and silently dropped. The `data`
 * payload — where real PHI would actually enter — is still fully scanned
 * (emails, SSNs, UUIDs, phones, IPs, crisis keywords, and any 10+-digit
 * identifier inside `data` remain blocked). Compliance-reviewed (MAINT-202).
 */

/**
 * WELLNESS-DATA AND IDENTIFIER PATTERNS
 *
 * Block transmission of these identifiers. Being is a consumer-wellness app and
 * NOT a HIPAA-covered entity, so this set is a product commitment rather than a
 * Safe Harbor obligation — the previous "HIPAA Safe Harbor" framing named a rule
 * that does not apply to us (DEBUG-553).
 *
 * AUTHORITATIVE SET (DEBUG-553, AC4). The security layer carries a deliberate
 * near-duplicate, `WELLNESS_DATA_PATTERNS` in
 * `core/services/security/wellnessDataPatterns.ts`. The two have diverged: that
 * copy holds an exact 7-of-10 subset of this one, byte-identical where present,
 * missing exactly these three — international phone, IPv4, and UUID. Named here
 * so nobody has to re-diff them.
 *
 * Decision: LEAVE BOTH, this set authoritative. The duplication exists because a
 * security leaf must not import from analytics, and closing the gap in code has
 * no live effect today — the only consumer of the security copy is
 * `sanitizeWellnessData` <- `SecurityMonitoringService`, which has zero runtime
 * importers. Widening it would also collapse more log payloads to
 * `{sanitized:true}`, a real observability change that deserves its own item.
 * Revisit if `SecurityMonitoringService` ever gains a runtime caller.
 *
 * The `PHI_DETECTION_PATTERNS` / `containsPHI` identifiers are left as-is; the
 * terminology rename is tracked separately.
 */
export const PHI_DETECTION_PATTERNS: RegExp[] = [
  // Assessment scores (PHQ-9/GAD-7) - with Unicode normalization support
  /\b(?:PHQ|GAD)[-\s]?[79]\s*[:=]?\s*\d{1,2}\b/gi,
  // SSN patterns (various formats)
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
  // Long numeric sequences (potential identifiers)
  /\b\d{10,}\b/g,
  // Email addresses
  /\b[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}\b/gi,
  // US phone numbers (various formats)
  /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  // International phone numbers
  /\b\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g,
  // IPv4 addresses (user tracking vector)
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  // UUIDs (device/user identifiers)
  /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
  // Crisis content keywords (mental health PHI)
  /\b(?:suicide|suicidal|kill\s+(?:myself|yourself)|self[- ]?harm|end\s+(?:my|it\s+all))\b/gi,
  // Raw numeric scores in context
  /\b(?:score|total|result)\s*[:=]?\s*\d{1,2}\b/gi,
];

/**
 * Returns true if the user-supplied analytics `data` payload contains any PHI
 * pattern. Pass the event `data` ONLY — never the full event envelope (see the
 * module-level note on scan surface).
 */
export function containsPHI(data: unknown): boolean {
  // Normalize Unicode to prevent bypass attacks (e.g., full-width characters).
  const normalized = JSON.stringify(data ?? {}).normalize('NFKC');

  return PHI_DETECTION_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0; // Reset state for stateful global (/g) patterns.
    return pattern.test(normalized);
  });
}
