/**
 * Parity guard: the legacy premeditation crisis vocabulary must stay a strict
 * subset of the shared free-text detector (FEAT-283 Slice A).
 *
 * WHY THIS READS SOURCE INSTEAD OF IMPORTING
 * `CRISIS_KEYWORDS` in `premeditationSafetyService.ts` is a module-private const
 * consumed by a private method on a session-scoped class, so there is nothing to
 * import and no way to exercise it without constructing a full premeditation
 * session. Parsing the array literal is the cheap honest pin available today.
 *
 * WHAT IT PROTECTS
 * Two crisis vocabularies now exist in the codebase. The end state is one:
 * `premeditationSafetyService` should consume `CRISIS_TEXT_PATTERN_SOURCES`
 * directly. Until that refactor lands, this test fails the moment someone adds
 * a phrase to the legacy list without adding it to the shared set — which would
 * otherwise mean a phrase that triggers support during premeditation silently
 * does not trigger it on a voice journal entry.
 *
 * DELETE THIS FILE when the refactor lands and the two sets are one.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { detectCrisisInText } from '../textCrisisDetection';

const PREMEDITATION_SERVICE_PATH = join(
  __dirname,
  '../../../../core/services/premeditationSafetyService.ts'
);

function extractLegacyCrisisKeywords(): string[] {
  const source = readFileSync(PREMEDITATION_SERVICE_PATH, 'utf8');
  const block = source.match(/const CRISIS_KEYWORDS\s*=\s*\[([\s\S]*?)\]/);

  if (!block) {
    throw new Error(
      'Could not locate the CRISIS_KEYWORDS literal in premeditationSafetyService.ts. ' +
        'If it was renamed, exported, or removed, update or delete this parity guard ' +
        'deliberately — do not let it silently stop guarding anything.'
    );
  }

  return [...block[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map((match) => match[1]);
}

describe('premeditation crisis vocabulary parity', () => {
  const legacyKeywords = extractLegacyCrisisKeywords();

  it('finds a non-empty legacy keyword list to compare against', () => {
    // Guards the guard: a regex that silently matches nothing would make every
    // assertion below vacuously pass.
    expect(legacyKeywords.length).toBeGreaterThanOrEqual(6);
  });

  it.each(legacyKeywords)(
    'legacy phrase %p is also detected by the shared free-text detector',
    (phrase) => {
      expect(detectCrisisInText(phrase)?.isTriggered).toBe(true);
    }
  );
});
