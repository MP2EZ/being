/**
 * Privacy regression test (FEAT-30): wellness-screening values must never reach
 * Sentry. This pins the Sentry scrub contract the Assessment Trends feature
 * relies on — raw PHQ-9/GAD-7 scores, score arrays, and free-text notes are
 * blocked at the field level, and inline "phq9: NN" / "score: NN" strings are
 * redacted by pattern.
 *
 * If a future change removes one of these from the scrub config, this test
 * fails before the regression can ship a score to an external service.
 *
 * @see docs/legal/dpia-sensitive-wellness-data.md §2 (analytics: severity
 *      buckets only, never raw scores)
 */

import {
  BLOCKED_FIELDS,
  SENSITIVE_DATA_PATTERNS,
} from '../ExternalErrorReporter';

/** Apply the scrub patterns the way the reporter does (replace → [REDACTED]). */
function applyPatterns(input: string): string {
  let out = input;
  for (const pattern of SENSITIVE_DATA_PATTERNS) {
    out = out.replace(pattern, '[REDACTED]');
  }
  return out;
}

describe('Sentry scrub contract — wellness scores never leave the device', () => {
  it('blocks the assessment-score field names FEAT-30 handles', () => {
    for (const field of ['score', 'scores', 'phq9', 'gad7', 'result', 'results']) {
      expect(BLOCKED_FIELDS).toContain(field);
    }
  });

  it('blocks free-text note/journal fields (annotation phase forward-guard)', () => {
    for (const field of ['note', 'content', 'journal', 'reflection', 'annotation']) {
      expect(BLOCKED_FIELDS).toContain(field);
    }
  });

  it('redacts inline PHQ-9 / GAD-7 / score values from strings', () => {
    expect(applyPatterns('phq9: 18')).not.toMatch(/18/);
    expect(applyPatterns('gad7: 14')).not.toMatch(/14/);
    expect(applyPatterns('score: 22')).not.toMatch(/22/);
  });

  it('redacts a snapshot-shaped payload that leaked into an error string', () => {
    const leaked = 'export failed for phq9: 27 and gad7: 21 (score: 27)';
    const scrubbed = applyPatterns(leaked);
    expect(scrubbed).not.toMatch(/\b27\b/);
    expect(scrubbed).not.toMatch(/\b21\b/);
    expect(scrubbed).toContain('[REDACTED]');
  });
});
