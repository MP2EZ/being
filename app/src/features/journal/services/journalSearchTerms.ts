/**
 * journalSearchTerms — the term-row builder for the voice journal search index
 * (FEAT-530 slice A, AC #1 / AC #7)
 *
 * Pure: text in, `{ entryId, terms }` out. Nothing here reads or writes storage.
 *
 * WHY THIS IS ITS OWN FILE. `journalExaminerBoundary.unit.test.ts` bans every
 * re-ordering mechanism in the re-read path. Building a row needs ONE sort — the
 * terms are stored sorted so shard bytes are deterministic — and the founder
 * ruled (2026-10-23) that this one sort lives here, in a file that carries every
 * other forbidden-mechanism matcher, rather than being excused inside the
 * query/result module. The sort orders a list of TERMS. It never orders entries,
 * and the result side (`journalSearchIndex.ts`) neither imports it for results
 * nor sorts anything.
 *
 * WHAT A ROW CARRIES. A deduplicated, sorted list of normalised word forms and
 * the entry id. No counts, frequencies, positions, classifications or verdicts:
 * "how often" and "where" are an assessment of the writing, and this index only
 * answers "does the entry contain this word".
 *
 * NORMALISATION. NFKD, lowercase, then strip combining marks, so "CAFÉ", "Café"
 * and "cafe" are one term. Lowercasing runs BEFORE the final mark strip because
 * it can create a mark ("İ" -> "i" + U+0307).
 *
 * TOKENISATION. A term is a maximal run of letters and digits.
 *   - Apostrophes (' and U+2019) are DELETED, so "don't" is "dont" and a search
 *     for "dont" finds it.
 *   - Hyphens and dashes SPLIT, so "well-being" is "well" and "being".
 *   - Anything else that is not a letter or digit splits.
 *   - A term is capped at MAX_TERM_CODEPOINTS; the same cap applies to the typed
 *     search, so a long word still meets its own truncated term.
 *
 * KNOWN LIMITATION. Languages written without spaces (unspaced CJK) form one
 * long term per punctuation-delimited sentence, so search degrades to
 * sentence-prefix matching there.
 */

/** Longest stored term, in code points (not UTF-16 units). */
export const MAX_TERM_CODEPOINTS = 32;

export interface TermRow {
  entryId: string;
  terms: string[];
}

/** NFKD, lowercase, strip combining marks. The ONE normaliser for index and search. */
export function normaliseForSearch(text: string): string {
  return text.normalize('NFKD').toLowerCase().replace(/\p{M}/gu, '');
}

function capTerm(term: string): string {
  const points = Array.from(term);
  return points.length > MAX_TERM_CODEPOINTS
    ? points.slice(0, MAX_TERM_CODEPOINTS).join('')
    : term;
}

/** Normalised, capped words in reading order. May contain duplicates. */
export function tokenise(text: string): string[] {
  return normaliseForSearch(text)
    .replace(/['’]/gu, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0)
    .map(capTerm);
}

/** One row for an entry: unique terms, sorted. An entry with no words gets `terms: []`. */
export function buildTermRow(entryId: string, text: string): TermRow {
  const unique = new Set(tokenise(text));
  return { entryId, terms: [...unique].sort() };
}

/** The typed search as distinct prefixes in typed order. `[]` when nothing searchable was typed. */
export function queryPrefixes(query: string): string[] {
  return [...new Set(tokenise(query))];
}
