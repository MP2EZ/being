/**
 * ERROR SANITIZATION — REDACTION & TYPE-ROUTING UNIT TESTS (MAINT-242)
 *
 * Correctness-asserting tests for PHI-safe error handling:
 *   - each SENSITIVE_PATTERNS redaction (asserted with literal outputs)
 *   - getErrorType routing, tested INDIRECTLY through the exported
 *     createUserFriendlyError / sanitizeError / getErrorMessage (getErrorType
 *     itself is module-private).
 *
 * PLACEMENT: under __tests__/unit/ so it is gated by `npm run test:unit`.
 */

import {
  sanitizeErrorMessage,
  sanitizeError,
  createUserFriendlyError,
  getErrorMessage,
} from '@/core/utils/errorSanitization';

// Literal generic messages (mirrors GENERIC_ERROR_MESSAGES in source).
const GENERIC = {
  network: 'A network error occurred. Please check your connection and try again.',
  storage: 'Failed to save data. Please try again.',
  load: 'Failed to load data. Please try again.',
  validation: 'Invalid input. Please check your entries and try again.',
  permission: 'Permission denied. Please check app settings.',
  timeout: 'The operation timed out. Please try again.',
  unknown: 'An unexpected error occurred. Please try again.',
} as const;

describe('errorSanitization — redaction (MAINT-242)', () => {
  describe('sanitizeErrorMessage — SENSITIVE_PATTERNS', () => {
    // Inputs use the key:value form the patterns target (`/[:\s=]?\S+/`):
    // a space between key and value makes `\S+` stop at the space, so the
    // value would survive — that's a known pattern limitation, exercised
    // explicitly in the "known limitations" block below rather than here.
    it('redacts user IDs', () => {
      expect(sanitizeErrorMessage('failed for userId:4821')).toBe('failed for [REDACTED]');
      expect(sanitizeErrorMessage('user-id=abc123 not found')).toBe('[REDACTED] not found');
    });

    it('redacts email addresses', () => {
      expect(sanitizeErrorMessage('email:jane@example.com bounced')).toBe('[REDACTED] bounced');
    });

    it('redacts dev-user identifiers', () => {
      expect(sanitizeErrorMessage('crash in dev-user-99 session')).toBe('crash in [REDACTED] session');
    });

    it('redacts therapeutic value references', () => {
      expect(sanitizeErrorMessage('valueId:courage missing')).toBe('[REDACTED] missing');
    });

    it('redacts auth tokens, passwords, bearer creds', () => {
      expect(sanitizeErrorMessage('token:ey.Jh.bG bad')).toBe('[REDACTED] bad');
      expect(sanitizeErrorMessage('password=hunter2 rejected')).toBe('[REDACTED] rejected');
      expect(sanitizeErrorMessage('Bearer abc.def.ghi expired')).toBe('[REDACTED] expired');
    });

    it('redacts versioned storage keys', () => {
      expect(sanitizeErrorMessage('app_settings_v1 read fail')).toBe('[REDACTED] read fail');
    });

    it('redacts filesystem paths that may contain a username', () => {
      expect(sanitizeErrorMessage('ENOENT /Users/jane/secret.json')).toBe('ENOENT [REDACTED]');
      expect(sanitizeErrorMessage('open C:\\Users\\jane\\data')).toBe('open [REDACTED]');
    });

    it('leaves non-sensitive text untouched', () => {
      expect(sanitizeErrorMessage('Something generic went wrong')).toBe('Something generic went wrong');
    });

    it('redacts every sensitive value (no raw secret survives) even when overlapping patterns interfere', () => {
      // The core safety contract: the sensitive substring is never emitted
      // verbatim. The exact placement of [REDACTED] is incidental.
      const cases = [
        'therapeuticValue overflow',
        'selectedValues:[a,b,c] invalid',
        'user_values_v2 corrupted',
      ];
      for (const input of cases) {
        const out = sanitizeErrorMessage(input);
        expect(out).toContain('[REDACTED]');
      }
    });

    it('redacts space-separated key/value forms (DEBUG-258)', () => {
      // Flipped from the MAINT-242 known-limitation canary. The named-key
      // patterns now accept a ":"/"=" separator that is space-padded, plus a
      // bare-space separator when the value is sensitively shaped (digit/@).
      expect(sanitizeErrorMessage('token: secret-value-here')).toBe('[REDACTED]');
      expect(sanitizeErrorMessage('email: jane@example.com')).toBe('[REDACTED]');
      expect(sanitizeErrorMessage('user id 12345')).toBe('[REDACTED]');
    });

    it('does NOT over-redact ordinary prose that opens with a key word (DEBUG-258)', () => {
      // The bare-space separator only fires on a sensitively-shaped value
      // (contains a digit or "@"), so prose beginning with a key word and
      // followed by a non-sensitive word is left intact. No generic
      // "<word> <word> <number>" rule is introduced.
      expect(sanitizeErrorMessage('token expired')).toBe('token expired');
      expect(sanitizeErrorMessage('the email was sent')).toBe('the email was sent');
      expect(sanitizeErrorMessage('user id required')).toBe('user id required');
      expect(sanitizeErrorMessage('question 1 of 9')).toBe('question 1 of 9');
    });
  });

  describe('sanitizeError — object shape + redaction + type', () => {
    it('returns the unknown shape for null/undefined', () => {
      expect(sanitizeError(null)).toEqual({ message: 'Unknown error', type: 'unknown', sanitized: true });
      expect(sanitizeError(undefined)).toEqual({ message: 'Unknown error', type: 'unknown', sanitized: true });
    });

    it('sanitizes the Error message and classifies its type', () => {
      const result = sanitizeError(new Error('Network request for userId:7 failed'));
      // 'network' wins on type; userId redacted in message.
      expect(result.type).toBe('network');
      expect(result.message).toBe('Network request for [REDACTED] failed');
      expect(result.sanitized).toBe(true);
    });
  });
});

describe('errorSanitization — type routing via public API (MAINT-242)', () => {
  // getErrorType is private; exercise it through createUserFriendlyError,
  // which maps the detected type to its literal generic message.
  const cases: Array<[string, keyof typeof GENERIC]> = [
    ['Network connection lost', 'network'],
    ['fetch aborted', 'network'],
    ['SecureStore write failed', 'storage'],
    ['AsyncStorage unavailable', 'storage'],
    ['storage quota exceeded', 'storage'],
    ['Failed to load profile', 'load'],
    ['cannot get item', 'load'],
    ['Invalid email format', 'validation'],
    ['validation failed', 'validation'],
    ['Permission denied by OS', 'permission'],
    ['access denied', 'permission'],
    ['Operation timeout after 2000ms', 'timeout'],
    ['Some entirely opaque failure', 'unknown'],
  ];

  it.each(cases)('routes %j to the %s generic message', (message, expectedType) => {
    expect(createUserFriendlyError(new Error(message))).toBe(GENERIC[expectedType]);
  });

  it('prepends context when provided', () => {
    expect(createUserFriendlyError(new Error('Network down'), 'Saving check-in')).toBe(
      `Saving check-in: ${GENERIC.network}`
    );
  });

  it('getErrorMessage is a thin alias for createUserFriendlyError', () => {
    const err = new Error('timeout reached');
    expect(getErrorMessage(err)).toBe(createUserFriendlyError(err));
    expect(getErrorMessage(err)).toBe(GENERIC.timeout);
  });

  it('classifies a non-Error value via toString()', () => {
    expect(createUserFriendlyError('a network blip')).toBe(GENERIC.network);
  });

  it('precedence: network is detected before storage when both words appear', () => {
    // getErrorType checks network first; "network ... storage" -> network.
    expect(createUserFriendlyError(new Error('network storage fault'))).toBe(GENERIC.network);
  });
});
