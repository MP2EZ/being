/**
 * PHI detection for analytics events (MAINT-202).
 *
 * Scans a user-supplied analytics `data` payload for Protected Health
 * Information / personal-identifier patterns. Extracted from AnalyticsService
 * so the pure detection logic can be unit-tested in isolation (no singleton /
 * native-module graph) and shared by both scan sites: `sanitizeEvent` and
 * `AnalyticsPrivacyEngine.validatePrivacyProtection`.
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
 * COMPREHENSIVE PHI DETECTION PATTERNS
 * Enhanced patterns with Unicode normalization and broader coverage.
 * HIPAA Safe Harbor: block transmission of these identifiers.
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
