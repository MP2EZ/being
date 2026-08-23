/**
 * journalPreview — unit specs (FEAT-287 Slice B).
 *
 * The history list shows a short locator line per entry. Crisis constraint, in
 * its own words: short enough to be a locator, not a reading surface. The
 * concern is narrow and specific — a preview long enough to hold a complete
 * disclosure sentence makes the list a screen where several entries' worst
 * lines are simultaneously visible to a shoulder-surfer.
 *
 * Two design points that are rulings, not preferences:
 *  - first N CHARACTERS, never the first line. People lead with the hardest
 *    sentence, so a first-line preview maximises exposure by construction.
 *  - the cut is a hard slice, not a word boundary. Rounding out to a whole word
 *    lengthens the preview to make it read better, which is the wrong direction
 *    for a control whose purpose is to reveal less.
 */

import { PREVIEW_MAX_CHARS, previewOf } from '../journalPreview';

describe('previewOf — bounds', () => {
  it('never exceeds the cap, including the ellipsis', () => {
    const long = 'a'.repeat(PREVIEW_MAX_CHARS * 4);
    expect(previewOf(long).length).toBeLessThanOrEqual(PREVIEW_MAX_CHARS + 1);
  });

  it('returns a short entry unchanged and adds no ellipsis', () => {
    expect(previewOf('a quiet day')).toBe('a quiet day');
  });

  it('marks truncation so a clipped preview is not read as the whole entry', () => {
    const long = 'x'.repeat(PREVIEW_MAX_CHARS + 10);
    expect(previewOf(long).endsWith('…')).toBe(true);
  });

  it('drops content past the cap rather than reflowing it', () => {
    const text = `${'y'.repeat(PREVIEW_MAX_CHARS)} SECRET`;
    expect(previewOf(text)).not.toContain('SECRET');
  });
});

describe('previewOf — collapsing', () => {
  it('collapses newlines so the preview cannot become a multi-line block', () => {
    expect(previewOf('first line\nsecond line')).toBe('first line second line');
  });

  it('collapses runs of whitespace and trims the edges', () => {
    expect(previewOf('  spaced   out \n\t words  ')).toBe('spaced out words');
  });

  it('takes the opening characters, not the opening line', () => {
    // A short hard first line followed by benign text: a first-line preview
    // would surface the hard line alone and nothing else.
    const text = `${'z'.repeat(10)}\n${'b'.repeat(PREVIEW_MAX_CHARS)}`;
    const preview = previewOf(text);
    expect(preview.startsWith('z'.repeat(10))).toBe(true);
    expect(preview).toContain('b');
  });
});

describe('previewOf — degenerate input', () => {
  it.each([
    ['empty string', ''],
    ['whitespace only', '   \n\t  '],
    ['null', null],
    ['undefined', undefined],
  ])('returns an empty string for %s', (_label, value) => {
    expect(previewOf(value as unknown as string)).toBe('');
  });

  it('returns an empty string for a non-string, never "[object Object]"', () => {
    // Mirrors normalizeForCrisisScan's non-string guard: a coerced object is a
    // silent wrong answer, and here it would render as a row label.
    expect(previewOf({ text: 'nope' } as unknown as string)).toBe('');
  });
});
