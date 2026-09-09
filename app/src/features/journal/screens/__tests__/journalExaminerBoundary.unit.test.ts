/**
 * FEAT-288 Slice C — the app-as-examiner boundary, pinned at source shape.
 *
 * The invariant is stated at VoiceReflectionScreen.tsx: "the censor must be the
 * self, so the app must not become the examiner." The user does the examining;
 * the app does the retrieval. Nothing in the re-read path may rank, score,
 * cluster, or assert a pattern about what the reader wrote.
 *
 * WHY A SOURCE-SHAPE TEST AT ALL. There is no rendered output for "the app did
 * not infer anything" — the failure is the ARRIVAL of a mechanism, not a wrong
 * value, so a behavioural test would have to guess which mechanism arrived. This
 * catches the class.
 *
 * DEBUG-390 RAILS, all three, because this file is exactly where that defect
 * recurs: these modules deliberately NAME the forbidden mechanisms in prose to
 * warn the next reader off them, so a bare `toContain` would match the warning
 * and fail on correct code.
 *   1. Comments are stripped before matching.
 *   2. Patterns are identifier-shaped, not bare words.
 *   3. Every matcher is proved to still fire against a known-bad literal, and
 *      the stripped source is proved non-trivial — a narrowed regex over
 *      accidentally-empty input is the silent way this test stops working.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const FEATURE = join(__dirname, '../..');

const GUARDED = [
  ['screens/JournalHistoryScreen.tsx', join(FEATURE, 'screens/JournalHistoryScreen.tsx')],
  ['services/journalDateRange.ts', join(FEATURE, 'services/journalDateRange.ts')],
] as const;

/** Block and line comments removed. Rail 1. */
function strip(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const read = (path: string) => strip(readFileSync(path, 'utf8'));

/**
 * Identifier-shaped, so a word inside a string or a docblock cannot trip them.
 * Each is a mechanism by which the app would start doing the examining.
 */
const FORBIDDEN: ReadonlyArray<readonly [string, RegExp]> = [
  ['embedding', /\bembeddings?\s*[(<[.=:]/i],
  ['cosine/vector similarity', /\b(cosine|vectorSimilarity|similarityScore)\s*[(<[.=:]/i],
  ['clustering', /\b(kmeans|kMeans|cluster(ing)?)\s*[(<[.=:]/i],
  ['tf-idf / term scoring', /\b(tfidf|termFrequency|termScore)\s*[(<[.=:]/i],
  ['relevance ranking', /\b(relevanceScore|rankBy|scoreEntry|rankEntries)\s*[(<[.=:]/i],
  ['sentiment / mood inference', /\b(sentiment|moodScore|inferMood|detectTheme)\s*[(<[.=:]/i],
  ['re-sorting the inherited order', /\.sort\s*\(/],
];

describe('the re-read path does not become the examiner', () => {
  describe.each(GUARDED)('%s', (_label, path) => {
    it.each(FORBIDDEN)('contains no %s', (_name, pattern) => {
      expect(read(path)).not.toMatch(pattern);
    });

    it('renders no resurfacing copy', () => {
      // A control is labelled by its range. Copy naming an occasion asserts that
      // a span deserves re-examination, which is the reader's judgement.
      expect(read(path)).not.toMatch(/a year ago|on this day|this time last|resurfac/i);
    });
  });

  describe('the matchers still fire — this test can go red', () => {
    it.each(FORBIDDEN)('%s matches known-bad source', (_name, pattern) => {
      const bad = [
        'const e = embeddings(entry.text);',
        'const s = cosine(a, b);',
        'const c = cluster(entries);',
        'const t = tfidf(entry);',
        'const r = rankBy(entries, score);',
        'const m = sentiment(entry.text);',
        'const ordered = metas.sort((a, b) => b.createdAt - a.createdAt);',
      ].join('\n');
      expect(bad).toMatch(pattern);
    });

    it('the resurfacing matcher fires', () => {
      expect('A year ago today you wrote').toMatch(/a year ago|on this day|this time last|resurfac/i);
    });

    it('comment stripping is real, and does not empty the file', () => {
      for (const [label, path] of GUARDED) {
        const raw = readFileSync(path, 'utf8');
        const stripped = strip(raw);
        expect(stripped.length).toBeGreaterThan(200);
        expect(stripped.length).toBeLessThan(raw.length);
        // The guarded modules DO name these mechanisms in prose. If that ever
        // stops being true the rail is untested, so assert the collision the
        // stripping exists to resolve is still present somewhere in the set.
        expect(label.length).toBeGreaterThan(0);
      }
      const prose = GUARDED.map(([, p]) => readFileSync(p, 'utf8')).join('\n');
      expect(prose).toMatch(/relevance|similarity|a year ago today/i);
      expect(GUARDED.map(([, p]) => read(p)).join('\n')).not.toMatch(/a year ago today/i);
    });
  });
});
