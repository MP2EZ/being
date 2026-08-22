/**
 * journalPreview — the row label for the history list (FEAT-287 Slice B).
 *
 * Derived at render time and NEVER stored. `JournalEntryMeta` stays
 * `{id, createdAt, updatedAt}`: putting a preview in the index would place
 * plaintext-derived content in the one record that is read on every list
 * render, and would carry it into the FEAT-29 export by way of a type change.
 *
 * WHY SO SHORT
 *
 * A preview is a locator, not a reading surface. The history list can show
 * several rows at once, so a preview long enough to hold a complete sentence
 * makes the list a screen where several entries' most difficult lines are
 * simultaneously legible to anyone glancing at the phone. The user already has
 * a way to read an entry — opening it, deliberately, one at a time.
 *
 * Two consequences that look like rough edges and are not:
 *  - the cut is a hard character slice, not a word boundary. Rounding out to a
 *    whole word lengthens the preview so it reads better, which is the wrong
 *    direction for a control whose job is to reveal less.
 *  - it is the opening CHARACTERS, never the opening line. People lead with the
 *    hardest sentence; a first-line preview would surface exactly that, alone
 *    and unsoftened by whatever followed it.
 */

/** Locator length. Deliberately below one rendered line at the smallest supported width. */
export const PREVIEW_MAX_CHARS = 48;

/** Appended only when content was dropped, so a clipped row is never read as a whole entry. */
const TRUNCATION_MARK = '…';

/**
 * A single-line locator for `text`, capped at {@link PREVIEW_MAX_CHARS}.
 *
 * Returns `''` for anything that is not a non-empty string. The non-string
 * guard mirrors `normalizeForCrisisScan`: coercing would render a row labelled
 * `[object Object]`, which is a silent wrong answer rather than a visible one.
 */
export function previewOf(text: string | null | undefined): string {
  if (typeof text !== 'string') return '';

  const collapsed = text.replace(/\s+/g, ' ').trim();
  if (collapsed.length === 0) return '';
  if (collapsed.length <= PREVIEW_MAX_CHARS) return collapsed;

  return collapsed.slice(0, PREVIEW_MAX_CHARS).trimEnd() + TRUNCATION_MARK;
}
