/**
 * JournalHistoryScreen — the list half of re-read (FEAT-287 Slice B).
 *
 * Slice A was write-only: `listEntryMetadata` and `getEntry` existed with no
 * consumers, so the Senecan evening review it cites had nothing to review.
 *
 * CRISIS CONTRACT (planning pass, FEAT-287)
 *
 * - No 988 control on this screen. `RootCrisisButton` already paints here, and
 *   adding a second one is a REVERTED mistake, not an untried improvement: see
 *   crisis-zero-988-windows.test.tsx, where duplicating gave one screen two
 *   differently-labelled Call-988 buttons — worse for a screen reader user than
 *   the gap it was meant to close.
 * - No `journal-crisis-banner` here. That testID belongs to the capture flow and
 *   reusing it would make the Maestro assertions ambiguous about which surface
 *   fired.
 * - Rows are IDENTICAL regardless of what an entry contains. No crisis marking,
 *   no exclusion, no different treatment. A row that looked different on the
 *   distressed entries would turn this list into a map of the user's worst days,
 *   readable by anyone holding the phone — a harm this screen would be
 *   introducing, not inheriting.
 *
 * PLAINTEXT DISCIPLINE
 *
 * `JournalEntryMeta` carries no text, so the index renders without decrypting
 * anything. Previews need plaintext, so each row decrypts ITSELF on mount and
 * drops it on unmount — FlatList mounts roughly the visible window, so the
 * number of live plaintexts tracks what is on screen rather than what is
 * stored. Deliberately not a prefetch-all: that would hold every entry in
 * memory at once and put several entries' hardest lines on one screen.
 *
 * Plaintext lives in component state only. Never a module cache, never a
 * Zustand slice — a slice invites `persist`, and persisted plaintext is the
 * unencrypted-and-unswept failure the store header warns about.
 *
 * DATE RANGE (FEAT-288 Slice C)
 *
 * The filter is a navigational control over `JournalEntryMeta` only — no extra
 * decrypt, no new storage, and the selection lives in component state for the
 * same reason plaintext does: a persisted filter is a record of which spans the
 * reader returns to, which is the app noticing something about them.
 *
 * It narrows what the FlatList mounts, so it can only REDUCE the number of live
 * plaintexts, never raise it. Rows stay identical under every preset — the row
 * contract above is not relaxed by filtering.
 *
 * SEARCH (FEAT-858, FEAT-530 slice B)
 *
 * A membership filter, never a ranking. Slice A answers a submitted query with an
 * unordered Set of ids; the list is `filterByRange` of the store's newest-first
 * metadata, then `matchedIds.has(id)` — no sort, so a row's place is the date it
 * was written, never how well it "matched". Rows are the unchanged `EntryRow`: no
 * highlight, snippet or match context, and no count anywhere, announcements
 * included.
 *
 * - Submit only. Changing the preset recombines the last answer without a query.
 *   What is shown always belongs to the last SUBMITTED query, whatever the field
 *   now says. The field is uncontrolled, so the query string lives only in the
 *   submit's own closure: never state, a ref, route params, a store or a cache.
 * - Never a partial answer. Focus starts slice A's build/reconcile (resume on a
 *   built index) without awaiting it in render; a submit waits for it. A
 *   `needs-build` answer runs it once more and re-queries once; anything else
 *   that is not an answer is "unavailable". Never a fallback to per-entry
 *   `getEntry` decrypts.
 * - Last submit wins. Submit, Clear and unmount bump a sequence, and every
 *   continuation checks it and `mountedRef` before writing state.
 * - The field is a `CrisisTextInput`, so the keyboard-up crisis accessory comes
 *   with it. The query is never scanned for crisis language: the index holds
 *   words, never a verdict, and this screen imports no scanner.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import type { NativeSyntheticEvent, TextInputSubmitEditingEventData } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  colorSystem,
  spacing,
  borderRadius,
  typography,
  semantic,
  TOUCH_TARGETS,
} from '@/core/theme';

import { CrisisTextInput } from '@/features/crisis/components/CrisisTextInput';

import { getEntry, journalIndexSource, listEntryMetadata } from '../services/journalEntryStore';
import type { JournalEntryMeta } from '../services/journalEntryStore';
import { previewOf } from '../services/journalPreview';
import { filterByRange, JOURNAL_RANGE_PRESETS } from '../services/journalDateRange';
import type { JournalRangePreset } from '../services/journalDateRange';
import { buildSearchIndex, querySearchIndex } from '../services/journalSearchIndex';
import type { BackfillOutcome, SearchQueryResult } from '../services/journalSearchIndex';
import { queryPrefixes } from '../services/journalSearchTerms';

type Nav = StackNavigationProp<
  { JournalEntryDetail: { entryId: string } },
  'JournalEntryDetail'
>;

/**
 * The search state machine. `matchedIds` is A's answer for the last submitted
 * query; `shown` on the two waiting states is the set the list was already
 * filtered by (null: no search applied), so a running query keeps the last
 * rendered list instead of flashing to the unfiltered one. "No match" is not a
 * state: it is `results` whose composed list is empty.
 */
type SearchState =
  | { kind: 'idle' }
  | { kind: 'preparing'; shown: ReadonlySet<string> | null }
  | { kind: 'searching'; shown: ReadonlySet<string> | null }
  | { kind: 'results'; matchedIds: ReadonlySet<string> }
  | { kind: 'unavailable'; phase: 'prepare' | 'query' };

const IDLE: SearchState = { kind: 'idle' };
const UNAVAILABLE_QUERY: SearchState = { kind: 'unavailable', phase: 'query' };

/** The ids the list is filtered by in this state; null means the range list alone. */
function filterSetOf(state: SearchState): ReadonlySet<string> | null {
  if (state.kind === 'results') return state.matchedIds;
  if (state.kind === 'preparing' || state.kind === 'searching') return state.shown;
  return null;
}

/**
 * The only strings the search path ever shows or announces (AC4). Pure: the
 * same state, preset and emptiness always say the same thing, and none of them
 * can carry a count because none is built from data.
 */
function statusText(
  state: SearchState,
  preset: JournalRangePreset,
  composedEmpty: boolean
): string | null {
  switch (state.kind) {
    case 'idle':
      return null;
    case 'preparing':
      return 'Preparing search…';
    case 'searching':
      return 'Searching your reflections';
    case 'unavailable':
      return "Search isn't available right now.";
    case 'results':
      if (!composedEmpty) return 'Showing matching reflections';
      return preset === 'all'
        ? 'No reflections match this search.'
        : 'No reflections match this search in this range.';
  }
}

function formatEntryDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * One row. Owns its own decrypt so plaintext lifetime is scoped to the row
 * being mounted, and `cancelled` prevents a late resolve writing into a row the
 * user has already scrolled past.
 */
function EntryRow({ meta, onOpen }: { meta: JournalEntryMeta; onOpen: (id: string) => void }) {
  const [preview, setPreview] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const entry = await getEntry(meta.id);
      if (!cancelled) setPreview(previewOf(entry?.text));
    })();
    return () => {
      cancelled = true;
      setPreview('');
    };
  }, [meta.id]);

  return (
    <Pressable
      testID={`journal-history-row-${meta.id}`}
      accessibilityRole="button"
      // The label must not exceed what is visible: a label reading the whole
      // entry while the row shows a clipped preview re-opens the exposure the
      // cap exists to close, through another channel.
      accessibilityLabel={`Reflection from ${formatEntryDate(meta.createdAt)}. ${preview}`}
      style={styles.row}
      onPress={() => onOpen(meta.id)}
    >
      <Text style={styles.rowDate}>{formatEntryDate(meta.createdAt)}</Text>
      <Text style={styles.rowPreview} numberOfLines={1} ellipsizeMode="tail">
        {preview}
      </Text>
    </Pressable>
  );
}

/**
 * The range control. Buttons only: the screen's one text input is the search
 * field, a `CrisisTextInput`, so the keyboard that rises here brings its own
 * crisis accessory and this control needs no occlusion handling of its own. It
 * stays mounted and enabled through every search state, so a search never
 * strands the reader in one span. No RN `<Modal>`;
 * `crisis-zero-988-windows.test.tsx` forbids one on this screen mechanically.
 */
function RangeFilter({
  preset,
  onSelect,
}: {
  preset: JournalRangePreset;
  onSelect: (next: JournalRangePreset) => void;
}) {
  return (
    <View
      testID="journal-history-range-filter"
      accessibilityRole="radiogroup"
      accessibilityLabel="Filter reflections by date range"
      style={styles.filterRow}
    >
      {JOURNAL_RANGE_PRESETS.map(({ preset: option, label }) => {
        const selected = option === preset;
        return (
          <Pressable
            key={option}
            testID={`journal-range-${option}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            // The label is the range and only the range. No result count: a
            // count is a fact about the reader's practice, and attaching one to
            // a control turns choosing a span into being told about a span.
            accessibilityLabel={label}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onSelect(option)}
          >
            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function JournalHistoryScreen() {
  const navigation = useNavigation<Nav>();
  const [entries, setEntries] = useState<JournalEntryMeta[] | null>(null);
  const [preset, setPreset] = useState<JournalRangePreset>('all');
  const [search, setSearch] = useState<SearchState>(IDLE);

  const inputRef = useRef<React.ComponentRef<typeof CrisisTextInput> | null>(null);
  const mountedRef = useRef(true);
  // Bumped by submit, Clear and unmount. A continuation whose captured value is
  // no longer current writes nothing (the EntryRow `cancelled` pattern, above).
  const submitSeqRef = useRef(0);
  // The in-flight build/reconcile, shared by focus and any submit that arrives
  // during it. Cleared when it settles, so the next focus or submit retries once
  // and nothing retries on its own.
  const prepareRef = useRef<Promise<BackfillOutcome> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const meta = await listEntryMetadata();
      if (!cancelled) setEntries(meta);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      submitSeqRef.current += 1;
    };
  }, []);

  const openEntry = useCallback(
    (entryId: string) => navigation.navigate('JournalEntryDetail', { entryId }),
    [navigation]
  );

  const prepare = useCallback((): Promise<BackfillOutcome> => {
    if (prepareRef.current) return prepareRef.current;
    const run: Promise<BackfillOutcome> = buildSearchIndex(journalIndexSource, {
      shouldContinue: () => mountedRef.current,
    })
      .catch((): BackfillOutcome => 'failed')
      .then((outcome) => {
        if (prepareRef.current === run) prepareRef.current = null;
        return outcome;
      });
    prepareRef.current = run;
    return run;
  }, []);

  // Focus starts the build/reconcile and never awaits it in render. It only
  // takes over the status line when nothing else is showing there.
  const handleFocus = useCallback(() => {
    if (prepareRef.current) return;
    const seq = submitSeqRef.current;
    setSearch((s) =>
      s.kind === 'idle' || (s.kind === 'unavailable' && s.phase === 'prepare')
        ? { kind: 'preparing', shown: null }
        : s
    );
    void prepare().then((outcome) => {
      if (!mountedRef.current || seq !== submitSeqRef.current) return;
      setSearch((s) => {
        if (s.kind !== 'preparing') return s;
        return outcome === 'failed' ? { kind: 'unavailable', phase: 'prepare' } : IDLE;
      });
    });
  }, [prepare]);

  const clearSearch = useCallback(() => {
    submitSeqRef.current += 1;
    inputRef.current?.clear();
    setSearch(IDLE);
  }, []);

  const handleSubmit = useCallback(
    (event: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
      const text = event.nativeEvent.text;
      if (entries === null) return;
      if (queryPrefixes(text).length === 0) {
        clearSearch();
        return;
      }
      submitSeqRef.current += 1;
      const seq = submitSeqRef.current;
      const current = () => mountedRef.current && seq === submitSeqRef.current;
      const liveIds = entries.map((m) => m.id);
      const pending = prepareRef.current;
      setSearch((s) => ({ kind: pending ? 'preparing' : 'searching', shown: filterSetOf(s) }));

      void (async () => {
        try {
          if (pending) {
            await pending;
            if (!current()) return;
            setSearch((s) => ({ kind: 'searching', shown: filterSetOf(s) }));
          }
          let result: SearchQueryResult = await querySearchIndex(text, liveIds);
          if (!current()) return;
          if (result.status === 'needs-build') {
            const outcome = await prepare();
            if (!current()) return;
            if (outcome !== 'failed') {
              result = await querySearchIndex(text, liveIds);
              if (!current()) return;
            }
          }
          setSearch(
            result.status === 'ok' ? { kind: 'results', matchedIds: result.ids } : UNAVAILABLE_QUERY
          );
        } catch {
          if (current()) setSearch(UNAVAILABLE_QUERY);
        }
      })();
    },
    [entries, clearSearch, prepare]
  );

  // Order is INHERITED from the store's newest-first index, never recomputed
  // here — see journalDateRange.ts. `Date.now()` is read at selection time
  // rather than per render so the window cannot shift under a re-render. A
  // search narrows by membership only: the Set is consulted, never iterated.
  const matchedIds = filterSetOf(search);
  const visible = useMemo(() => {
    if (entries === null) return [];
    const inRange = filterByRange(entries, preset, Date.now());
    return matchedIds === null ? inRange : inRange.filter((m) => matchedIds.has(m.id));
  }, [entries, preset, matchedIds]);

  const status = statusText(search, preset, visible.length === 0);
  // A failed query leaves only its message in the results area, and an empty
  // search result is reported by the status line alone: the no-query
  // "No reflections in this range." would describe the range, not the search.
  const resultsHidden =
    (search.kind === 'unavailable' && search.phase === 'query') ||
    (matchedIds !== null && visible.length === 0);

  // iOS speaks the fixed string; Android announces through the live region on
  // the status line. Idle is null, so clearing a search announces nothing.
  useEffect(() => {
    if (status !== null && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(status);
    }
  }, [status]);

  if (entries === null) {
    return (
      <View testID="journal-history-screen" style={[styles.container, styles.centered]}>
        <ActivityIndicator accessibilityLabel="Loading your reflections" />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View testID="journal-history-screen" style={[styles.container, styles.centered]}>
        <Text testID="journal-history-empty" style={styles.emptyText}>
          Your saved reflections will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View testID="journal-history-screen" style={styles.container}>
      <View style={styles.searchRow}>
        <CrisisTextInput
          ref={inputRef}
          testID="journal-search-input"
          accessibilityLabel="Search your reflections"
          placeholder="Search your reflections"
          placeholderTextColor={semantic.text.secondary}
          style={styles.searchInput}
          autoFocus={false}
          autoCorrect={false}
          spellCheck={false}
          autoCapitalize="none"
          clearButtonMode="never"
          returnKeyType="search"
          submitBehavior="submit"
          onFocus={handleFocus}
          onSubmitEditing={handleSubmit}
        />
        <Pressable
          testID="journal-search-clear"
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.clearButton}
          onPress={clearSearch}
        >
          <Text style={styles.clearLabel}>Clear</Text>
        </Pressable>
      </View>
      <RangeFilter preset={preset} onSelect={setPreset} />
      <Text testID="journal-search-status" accessibilityLiveRegion="polite" style={styles.status}>
        {status ?? ''}
      </Text>
      {resultsHidden ? null : visible.length === 0 ? (
        // NOT the `journal-history-empty` copy above. That one says reflections
        // "will appear here", which is false for a reader who has written some
        // and narrowed past them — and being told your record is empty when it
        // is not is the kind of claim this screen must never make. This one
        // reports the CONTROL's effect and nothing about the reader. The filter
        // stays mounted above it, or the only way out of an empty result would
        // be to leave the screen.
        <View style={styles.centered}>
          <Text testID="journal-history-range-empty" style={styles.emptyText}>
            No reflections in this range.
          </Text>
        </View>
      ) : (
        <FlatList
          testID="journal-history-list"
          data={visible}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <EntryRow meta={item} onOpen={openEntry} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: semantic.background.screen },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing[24] },
  listContent: { padding: spacing[24], gap: spacing[8] },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[24],
    paddingTop: spacing[16],
  },
  searchInput: {
    flex: 1,
    minHeight: TOUCH_TARGETS.minimum,
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: semantic.border.default,
    backgroundColor: colorSystem.base.white,
    fontSize: typography.bodyLarge.size,
    color: semantic.text.primary,
  },
  clearButton: {
    minHeight: TOUCH_TARGETS.minimum,
    minWidth: TOUCH_TARGETS.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  clearLabel: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
  },
  status: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[8],
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    paddingHorizontal: spacing[24],
    paddingTop: spacing[16],
  },
  chip: {
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: semantic.border.default,
    backgroundColor: colorSystem.base.white,
  },
  chipSelected: {
    borderColor: semantic.border.strong,
    backgroundColor: colorSystem.gray[100],
  },
  chipLabel: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
  },
  chipLabelSelected: {
    color: semantic.text.primary,
  },
  row: {
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
    gap: spacing[4],
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    backgroundColor: colorSystem.base.white,
    borderWidth: 1,
    borderColor: semantic.border.default,
  },
  rowDate: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
  },
  rowPreview: {
    fontSize: typography.bodyLarge.size,
    color: semantic.text.primary,
  },
  emptyText: {
    fontSize: typography.bodyLarge.size,
    color: semantic.text.secondary,
    textAlign: 'center',
  },
});
