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
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
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

import { getEntry, listEntryMetadata } from '../services/journalEntryStore';
import type { JournalEntryMeta } from '../services/journalEntryStore';
import { previewOf } from '../services/journalPreview';

type Nav = StackNavigationProp<
  { JournalEntryDetail: { entryId: string } },
  'JournalEntryDetail'
>;

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

export function JournalHistoryScreen() {
  const navigation = useNavigation<Nav>();
  const [entries, setEntries] = useState<JournalEntryMeta[] | null>(null);

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

  const openEntry = useCallback(
    (entryId: string) => navigation.navigate('JournalEntryDetail', { entryId }),
    [navigation]
  );

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
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <EntryRow meta={item} onOpen={openEntry} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: semantic.background.screen },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing[24] },
  listContent: { padding: spacing[24], gap: spacing[8] },
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
