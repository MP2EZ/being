/**
 * FEAT-288 Slice C — the date-range filter's arithmetic and its ordering contract.
 *
 * `now` is injected rather than mocked so every boundary below is asserted at an
 * exact millisecond. The ordering test is not decoration: reverse-chronological
 * is the axis recurrence is perceived on, and it is preserved here by INHERITING
 * the store's order rather than re-sorting. A test that only checked membership
 * would stay green if someone added a sort.
 */

import { filterByRange, JOURNAL_RANGE_PRESETS } from '../journalDateRange';
import type { JournalRangePreset } from '../journalDateRange';
import type { JournalEntryMeta } from '../journalEntryStore';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 23, 12, 0, 0);

const meta = (id: string, createdAt: number): JournalEntryMeta => ({
  id,
  createdAt,
  updatedAt: createdAt,
});

/** Newest-first, as `listEntryMetadata()` returns them. */
const NEWEST_FIRST: JournalEntryMeta[] = [
  meta('d0', NOW),
  meta('d3', NOW - 3 * DAY),
  meta('d7', NOW - 7 * DAY),
  meta('d30', NOW - 30 * DAY),
  meta('d90', NOW - 90 * DAY),
  meta('d200', NOW - 200 * DAY),
];

describe('filterByRange', () => {
  it('returns every entry for `all`, and a copy rather than the input array', () => {
    const out = filterByRange(NEWEST_FIRST, 'all', NOW);
    expect(out.map((m) => m.id)).toEqual(['d0', 'd3', 'd7', 'd30', 'd90', 'd200']);
    expect(out).not.toBe(NEWEST_FIRST);
  });

  it.each([
    ['last7', ['d0', 'd3', 'd7']],
    ['last30', ['d0', 'd3', 'd7', 'd30']],
    ['last90', ['d0', 'd3', 'd7', 'd30', 'd90']],
  ] as [JournalRangePreset, string[]][])('%s selects %p', (preset, expected) => {
    expect(filterByRange(NEWEST_FIRST, preset, NOW).map((m) => m.id)).toEqual(expected);
  });

  describe('the lower bound is INCLUSIVE, at the millisecond', () => {
    // A reader who cannot find an entry in the window it plainly belongs to has
    // been told something false about their own record, so the edge is pinned
    // on both sides rather than assumed.
    it('keeps an entry written exactly 7 days ago', () => {
      const edge = [meta('edge', NOW - 7 * DAY)];
      expect(filterByRange(edge, 'last7', NOW)).toHaveLength(1);
    });

    it('drops one written a single millisecond earlier', () => {
      const justOutside = [meta('edge', NOW - 7 * DAY - 1)];
      expect(filterByRange(justOutside, 'last7', NOW)).toHaveLength(0);
    });
  });

  it('preserves input order and never re-sorts', () => {
    // Deliberately NOT newest-first. If an implementation ever sorted, this
    // would come back reordered — which is how a relevance ordering would
    // first show itself.
    const scrambled = [meta('b', NOW - 5 * DAY), meta('a', NOW), meta('c', NOW - 2 * DAY)];
    expect(filterByRange(scrambled, 'last7', NOW).map((m) => m.id)).toEqual(['b', 'a', 'c']);
  });

  it('handles an empty index without special-casing', () => {
    expect(filterByRange([], 'last30', NOW)).toEqual([]);
    expect(filterByRange([], 'all', NOW)).toEqual([]);
  });

  it('does not mutate its input', () => {
    const input = [...NEWEST_FIRST];
    filterByRange(input, 'last7', NOW);
    expect(input).toHaveLength(NEWEST_FIRST.length);
  });
});

describe('JOURNAL_RANGE_PRESETS', () => {
  it('labels every preset by its RANGE, never by a reason', () => {
    // "Last 30 days" states what the control does. A label naming an occasion
    // asserts that some span deserves re-examination, which is the reader's
    // judgement and not the app's.
    const forbidden = /ago|today|memory|remember|this time|since your|last check|anniversar/i;
    for (const { label } of JOURNAL_RANGE_PRESETS) {
      expect(label).not.toMatch(forbidden);
    }
    // The matcher must be able to fire, or this test proves nothing (DEBUG-390).
    expect('A year ago today').toMatch(forbidden);
  });

  it('offers an unfiltered option so the control is always escapable', () => {
    expect(JOURNAL_RANGE_PRESETS.map((p) => p.preset)).toContain('all');
  });

  it('has a label for every preset the filter accepts', () => {
    expect(JOURNAL_RANGE_PRESETS).toHaveLength(4);
    for (const { preset, label } of JOURNAL_RANGE_PRESETS) {
      expect(label.trim().length).toBeGreaterThan(0);
      expect(filterByRange([], preset, NOW)).toEqual([]);
    }
  });
});
