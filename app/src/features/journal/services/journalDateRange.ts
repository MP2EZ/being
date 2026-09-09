/**
 * Date-range filtering for journal re-read (FEAT-288, Slice C).
 *
 * THE APP DOES THE RETRIEVAL; THE USER DOES THE EXAMINING. That boundary is the
 * whole design constraint, stated at VoiceReflectionScreen.tsx: "the censor must
 * be the self, so the app must not become the examiner." Everything below is a
 * navigational control the reader operates. Nothing here ranks, scores, groups,
 * or says anything about what the entries contain.
 *
 * WHY THIS IS CHEAP, AND WHY THAT DECIDED THE SCOPE.
 * Filtering reads `createdAt` off `JournalEntryMeta`, which `listEntryMetadata()`
 * already returns from ONE decrypt of the single index record. Zero per-entry
 * `getEntry` calls, zero new storage. Full-text search cannot be built this way:
 * `EncryptionService` disables derived-key caching because each record carries
 * its own salt, so every `getEntry` is a fresh 100k-iteration PBKDF2 and search
 * is O(N) derivations with no amortisation. That is why search is its own item
 * and this one is a date range.
 *
 * ORDERING IS INHERITED, NEVER RECOMPUTED.
 * `Array.prototype.filter` preserves input order, and `listEntryMetadata()`
 * already returns newest-first. There is deliberately no sort here. Recurrence
 * is perceived ACROSS TIME, so reverse-chronological is the axis the pattern
 * lives on and any relevance ordering would destroy it — and a sort call is
 * exactly where such an ordering would enter. Its absence is load-bearing and is
 * pinned by a source-shape guard.
 */

import type { JournalEntryMeta } from './journalEntryStore';

/**
 * Preset vocabulary, deliberately identical to `features/data-export`'s
 * `ExportRangePreset`. The NAMES are reused so the two surfaces agree; the code
 * is not imported, on purpose. `journalAnalyticsBoundary.contract.test.ts` scans
 * the journal feature directory recursively, so a shared module living outside
 * it would be invisible to the egress check that guards this feature.
 */
export type JournalRangePreset = 'last7' | 'last30' | 'last90' | 'all';

/**
 * LABELLED BY RANGE, NEVER BY REASON. "Last 30 days" states what the control
 * does. A preset labelled for an occasion — "a year ago today", "around your
 * last check-in" — asserts that some span deserves re-examination, which is the
 * reader's judgement to make and not the app's. Same reason there is no
 * on-open resurfacing and no notification: presets are controls, not surfacings.
 */
export const JOURNAL_RANGE_PRESETS: readonly {
  readonly preset: JournalRangePreset;
  readonly label: string;
}[] = [
  { preset: 'all', label: 'All time' },
  { preset: 'last7', label: 'Last 7 days' },
  { preset: 'last30', label: 'Last 30 days' },
  { preset: 'last90', label: 'Last 90 days' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const PRESET_DAYS: Record<Exclude<JournalRangePreset, 'all'>, number> = {
  last7: 7,
  last30: 30,
  last90: 90,
};

/**
 * Metadata whose `createdAt` falls inside the preset's window, in input order.
 *
 * `now` is a parameter rather than a `Date.now()` call so the boundary is
 * testable at the exact millisecond. Inclusive at the lower bound: an entry
 * written exactly N days ago is inside "last N days" — the alternative silently
 * drops an entry on the edge, and a reader who cannot find yesterday's entry in
 * "last 7 days" has been told something false about their own record.
 */
export function filterByRange(
  metas: readonly JournalEntryMeta[],
  preset: JournalRangePreset,
  now: number
): JournalEntryMeta[] {
  if (preset === 'all') return [...metas];
  const from = now - PRESET_DAYS[preset] * DAY_MS;
  return metas.filter((meta) => meta.createdAt >= from);
}
