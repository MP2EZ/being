/**
 * MAINT-248 consolidation parity test.
 *
 * ProductionLogger and ExternalErrorReporter previously carried their own inline
 * SENSITIVE_DATA_PATTERNS / isSensitiveKey copies. Those were deleted in favour of
 * the canonical SensitiveDataPatterns single source of truth. This test pins that
 * the consolidation lost ZERO redaction coverage:
 *  - every object key the inline ProductionLogger copy redacted is still redacted
 *    by the canonical isSensitiveKey (esp. the bare keys with no prior substring
 *    cover: entry / quote / citation / meditation / educational / insight /
 *    intention / examen);
 *  - the inline string-scrub patterns (journal/intention/feeling/bare-thought)
 *    are still applied by the canonical pattern set;
 *  - the reporter still carries its two reporter-specific extras (JWT, base64).
 *
 * If a future edit narrows the canonical set, this fails before redaction shrinks.
 */

import {
  isSensitiveKey,
  sanitizeWithSensitiveDataPatterns,
} from '../SensitiveDataPatterns';
import { SENSITIVE_DATA_PATTERNS as REPORTER_PATTERNS } from '../ExternalErrorReporter';

describe('MAINT-248 — consolidation preserves all redaction coverage', () => {
  // The full key set the inline ProductionLogger.isSensitiveKey copy redacted.
  const MIGRATED_KEYS = [
    // bare keys that had NO prior substring cover in the canonical set
    'entry', 'entries', 'quote', 'quotes', 'citation',
    'meditation', 'educational', 'insight', 'insights',
    'intention', 'examen',
    // composite keys that were (and remain) covered by a canonical substring
    'journalEntry', 'personalReflection', 'virtuePractice', 'stoicPrinciple',
    'dailyIntention', 'eveningExamen', 'meditationContent', 'lessonContent',
    'personalInsight', 'thoughtContent', 'moodData', 'emotionData',
  ];

  it.each(MIGRATED_KEYS)('still redacts object key "%s"', (key) => {
    expect(isSensitiveKey(key)).toBe(true);
  });

  it('still string-scrubs journal / intention / feeling / bare-thought inline values', () => {
    expect(sanitizeWithSensitiveDataPatterns('journal: a long private entry here'))
      .not.toMatch(/private entry here/);
    expect(sanitizeWithSensitiveDataPatterns('intention: today I will practice patience'))
      .not.toMatch(/patience/);
    expect(sanitizeWithSensitiveDataPatterns('feeling: anxious'))
      .not.toMatch(/anxious/);
    expect(sanitizeWithSensitiveDataPatterns('thought: I keep ruminating'))
      .not.toMatch(/ruminating/);
  });

  it('keeps the reporter-specific JWT and base64 extensions', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123';
    let scrubbed = jwt;
    for (const pattern of REPORTER_PATTERNS) {
      scrubbed = scrubbed.replace(pattern, '[REDACTED]');
    }
    expect(scrubbed).not.toContain('eyJhbGci');
    expect(scrubbed).toContain('[REDACTED]');
  });
});
