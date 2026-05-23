/**
 * CENTRALIZED PHI PATTERNS - INFRA-61
 *
 * Single source of truth for PHI (Protected Health Information) detection patterns.
 * All logging services MUST import from here to ensure consistent sanitization.
 *
 * PATTERN CATEGORIES:
 * 1. User Identifiers (8 patterns)
 * 2. Assessment Data (10 patterns)
 * 3. Session/Auth (8 patterns)
 * 4. Personal Information (12 patterns)
 * 5. Storage/System Paths (4 patterns)
 * 6. Device Fingerprinting (6 patterns)
 * 7. Crisis-Specific Data (6 patterns)
 * 8. Stoic Mindfulness Data (8 patterns) - Per philosopher domain recommendation
 *
 * TOTAL: 62 patterns (up from 14 in original implementation)
 *
 * MAINTENANCE:
 * - Add new patterns here when new PHI types are identified
 * - Run tests after adding patterns to verify no false positives
 * - Update pattern count in this header when modified
 */

/**
 * COMPREHENSIVE PHI PATTERNS
 * These patterns are applied to all log messages before storage or transmission
 */
export const SENSITIVE_DATA_PATTERNS: RegExp[] = [
  // ============================================
  // 1. USER IDENTIFIERS (8 patterns)
  // ============================================
  /user[_-]?id[:\s=]?\S+/gi,
  /userId[:\s]*[a-zA-Z0-9-]+/gi,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, // UUIDs
  /dev-user-\d+/gi,
  /account[_-]?id[:\s=]?\S+/gi,
  /patient[_-]?id[:\s=]?\S+/gi,
  /member[_-]?id[:\s=]?\S+/gi,
  /subscriber[_-]?id[:\s=]?\S+/gi,

  // ============================================
  // 2. ASSESSMENT DATA (10 patterns)
  // ============================================
  /phq[_-]?9?[:\s]*[0-9]+/gi,
  /gad[_-]?7?[:\s]*[0-9]+/gi,
  /score[:\s]*[0-9]+/gi,
  /assessment[_-]?result[:\s]*[^,}]+/gi,
  /crisis[_-]?data[:\s]*[^,}]+/gi,
  /response[s]?[:\s]*\[[0-9,\s]+\]/gi, // Array of responses
  /question[_-]?\d+[:\s]*[0-9]+/gi, // Individual question responses
  /total[_-]?score[:\s]*[0-9]+/gi,
  /severity[_-]?level[:\s]*[a-z]+/gi,
  /diagnosis[:\s]*[^,}]+/gi,

  // ============================================
  // 3. SESSION/AUTH (8 patterns)
  // ============================================
  /token[:\s=]?\S+/gi,
  /session[_-]?id[:\s]*[a-zA-Z0-9-]+/gi,
  /password[:\s]*[^\s,}]+/gi,
  /auth[_-]?key[:\s]*[a-zA-Z0-9.\-_]+/gi,
  /bearer\s+\S+/gi,
  /refresh[_-]?token[:\s]*[a-zA-Z0-9.\-_]+/gi,
  /access[_-]?token[:\s]*[a-zA-Z0-9.\-_]+/gi,
  /api[_-]?key[:\s]*[a-zA-Z0-9.\-_]+/gi,

  // ============================================
  // 4. PERSONAL INFORMATION (12 patterns)
  // ============================================
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, // Email
  /\b\d{3}-?\d{2}-?\d{4}\b/gi, // SSN
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
  /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/gi, // UK postcodes
  /\b\d{5}(-\d{4})?\b/gi, // US ZIP codes
  /\b(?:19|20)\d{2}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/gi, // Birth dates YYYY-MM-DD
  /\b(0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/gi, // Birth dates MM/DD/YYYY
  /medical[_-]?record[_-]?number[:\s]*\S+/gi,
  /insurance[_-]?id[:\s]*\S+/gi,
  /policy[_-]?number[:\s]*\S+/gi,
  /contact[_-]?name[:\s]*[^,}]+/gi,
  /emergency[_-]?contact[:\s]*[^,}]+/gi,

  // ============================================
  // 5. STORAGE/SYSTEM PATHS (4 patterns)
  // ============================================
  /\/Users\/[^/\s]+/gi, // macOS usernames
  /C:\\Users\\[^\\\s]+/gi, // Windows usernames
  /user_values_v\d+/gi,
  /app_settings_v\d+/gi,

  // ============================================
  // 6. DEVICE FINGERPRINTING (6 patterns)
  // ============================================
  /device[_-]?id[:\s]*[a-zA-Z0-9-]+/gi,
  /user[_-]?agent[:\s]*[^,}]+/gi,
  /fingerprint[:\s]*[a-zA-Z0-9]+/gi,
  /mac[_-]?address[:\s]*[a-fA-F0-9:]+/gi,
  /imei[:\s]*\d{15}/gi,
  /android[_-]?id[:\s]*[a-zA-Z0-9]+/gi,

  // ============================================
  // 7. CRISIS-SPECIFIC DATA (6 patterns)
  // ============================================
  /suicidal[_-]?ideation[:\s]*[^,}]+/gi,
  /self[_-]?harm[:\s]*[^,}]+/gi,
  /crisis[_-]?contact[:\s]*[^,}]+/gi,
  /intervention[_-]?details[:\s]*[^,}]+/gi,
  /safety[_-]?plan[:\s]*[^,}]+/gi,
  /988[_-]?call[:\s]*[^,}]+/gi,

  // ============================================
  // 8. STOIC MINDFULNESS DATA (8 patterns)
  // Per philosopher domain recommendation
  // ============================================
  /virtue[:\s]*[^,}]+/gi,
  /reflection[:\s]*[^,}]+/gi,
  /gratitude[:\s]*[^,}]+/gi,
  /practice[_-]?data[:\s]*[^,}]+/gi,
  /mood[:\s]*[^,}]+/gi,
  /mental[_-]?state[:\s]*[^,}]+/gi,
  /check[_-]?in[_-]?data[:\s]*[^,}]+/gi,
  /thought[_-]?content[:\s]*[^,}]+/gi,
];

/**
 * SENSITIVE KEYS
 * Object keys that should have their values redacted entirely
 */
export const SENSITIVE_KEYS = [
  // User identifiers
  'userId', 'user_id', 'userIdentifier', 'id',
  'accountId', 'patientId', 'memberId', 'subscriberId',

  // Auth tokens
  'token', 'authToken', 'accessToken', 'refreshToken',
  'password', 'secret', 'key', 'apiKey',
  'session', 'sessionId', 'session_id',

  // Assessment data
  'phq9', 'gad7', 'score', 'scores', 'responses',
  'assessment', 'assessmentData', 'result', 'results',
  'answer', 'answers', 'questionResponse',

  // Crisis data
  'crisis', 'crisisData', 'detection', 'intervention',
  'emergencyContact', 'safetyPlan', 'crisisContact',

  // Personal data
  'email', 'phone', 'ssn', 'personal', 'private',
  'data', 'userData', 'profile', 'profileData',
  'therapeutic', 'mood', 'emotion', 'feeling', 'thought',
  'journal', 'reflection', 'note', 'content',

  // Stoic/philosophical content
  'principle', 'virtue', 'practice', 'exercise',
  'gratitude', 'wisdom', 'courage', 'justice', 'temperance',

  // Device/location
  'ipAddress', 'ip', 'location', 'coordinates', 'geoLocation',
  'biometric', 'biometricData', 'notificationToken', 'pushToken',
  'deviceId', 'fingerprint', 'macAddress', 'imei', 'androidId',
] as const;

/**
 * ERROR CATEGORIES THAT MUST NEVER BE SENT EXTERNALLY
 */
export const BLOCKED_ERROR_CATEGORIES = [
  'crisis_detection',
  'authentication',
  'security',
  'data_corruption',
  'assessment',
  'phi_handling',
] as const;

/**
 * SAFE SCREEN NAMES
 * Only these screens can be included in error reports
 */
export const SAFE_SCREEN_NAMES = [
  'Home', 'Settings', 'Profile', 'Learn', 'Practice',
  'Morning', 'Midday', 'Evening', 'CheckIn', 'Progress',
  'About', 'Help', 'Welcome', 'Onboarding',
] as const;

/**
 * Sanitize a string by applying all PHI patterns
 */
export function sanitizeWithSensitiveDataPatterns(input: string): string {
  if (!input || typeof input !== 'string') {
    return String(input ?? '');
  }

  let sanitized = input;
  SENSITIVE_DATA_PATTERNS.forEach((pattern, index) => {
    sanitized = sanitized.replace(pattern, `[SENSITIVE_${index}]`);
  });

  return sanitized;
}

/**
 * Check if a key is sensitive and should have its value redacted
 */
export function isSensitiveKey(key: string): boolean {
  const keyLower = key.toLowerCase();
  return SENSITIVE_KEYS.some(sensitive =>
    keyLower.includes(sensitive.toLowerCase())
  );
}

/**
 * Sanitize an object recursively
 */
export function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return sanitizeWithSensitiveDataPatterns(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: sanitizeWithSensitiveDataPatterns(obj.message),
      stack: obj.stack ? sanitizeStackTrace(obj.stack) : undefined,
    };
  }

  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }

    return sanitized;
  }

  return obj;
}

/**
 * Sanitize a stack trace to remove sensitive file paths
 */
export function sanitizeStackTrace(stack: string): string {
  if (!stack) return '';

  return stack
    .replace(/\/Users\/[^/\s]+/g, '/Users/[REDACTED]')
    .replace(/C:\\Users\\[^\\\s]+/g, 'C:\\Users\\[REDACTED]')
    .split('\n')
    .slice(0, 10) // Limit stack depth
    .join('\n');
}

/**
 * Check if a screen name is safe to include in reports
 */
export function isSafeScreenName(name: string): boolean {
  const genericName = name.replace(/Screen$/, '');
  return SAFE_SCREEN_NAMES.some(safe =>
    genericName.toLowerCase().includes(safe.toLowerCase())
  );
}
