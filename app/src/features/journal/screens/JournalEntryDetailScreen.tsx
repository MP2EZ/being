/**
 * JournalEntryDetailScreen — the re-read half (FEAT-287 Slice B).
 *
 * RE-READ IS NOT A DETECTION EVENT. This is the ruling this screen exists to
 * honour, and the reason it imports nothing from `journalCrisisScan`.
 *
 * Nothing new is disclosed when someone re-reads: the app already responded at
 * the moment of writing. Re-scanning here would double-count one episode —
 * the same family journalCrisisScan guards against with "positive at both scan
 * points is one episode, not two" — fire an iOS Alert on every list-to-detail
 * navigation (trained dismissal, on a surface built for calm re-reading), and
 * give `trigger_type: 'journal_text_match'` a second meaning, destroying the
 * ability to count distinct episodes. A `journal_reread` trigger value is
 * equally forbidden: a categorical value that infers content.
 *
 * The absence of the import is the enforcement. There is no scanner call to
 * accidentally leave behind.
 *
 * NO CONDITIONAL SUPPORT SURFACE
 *
 * This screen does not decide whether the entry is distressing and does not
 * change appearance based on its content. It cannot: the crisis verdict is not
 * persisted (JournalEntry is `{id, text, createdAt, updatedAt}`), and crisis
 * review forbade persisting it. That constraint turned out to be the right
 * design rather than a limitation — a support banner appearing on exactly the
 * distressed entries would be Being telling a user, months later, how it once
 * classified their private writing, and would make the entries legible as a
 * group to anyone holding the phone.
 *
 * What answers the real exposure — re-reading distressed writing IS a moment of
 * exposure — is `RootCrisisButton`, already painting here. Present on every
 * entry, identical on all of them, therefore carrying zero information about
 * any entry, and still one tap away.
 *
 * PLAINTEXT DISCIPLINE
 *
 * One entry's text, in component state, cleared on unmount. The previous entry
 * is dropped before the next is requested, so two entries' plaintext are never
 * live at once.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { spacing, typography, semantic } from '@/core/theme';

import { getEntry } from '../services/journalEntryStore';
import type { JournalEntry } from '../services/journalEntryStore';

type DetailRoute = RouteProp<{ JournalEntryDetail: { entryId: string } }, 'JournalEntryDetail'>;

function formatEntryDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function JournalEntryDetailScreen() {
  const route = useRoute<DetailRoute>();
  const entryId = route.params?.entryId;

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Drop the outgoing entry's plaintext BEFORE requesting the next one, so a
    // slow decrypt cannot leave two entries live at the same time.
    setEntry(null);
    setMissing(false);

    void (async () => {
      const loaded = await getEntry(entryId);
      if (cancelled) return;
      if (loaded) setEntry(loaded);
      else setMissing(true);
    })();

    return () => {
      cancelled = true;
      setEntry(null);
    };
  }, [entryId]);

  if (missing) {
    return (
      <View testID="journal-entry-detail-screen" style={[styles.container, styles.centered]}>
        <Text testID="journal-entry-missing" style={styles.missingText}>
          That reflection is no longer available.
        </Text>
      </View>
    );
  }

  if (!entry) {
    return (
      <View testID="journal-entry-detail-screen" style={[styles.container, styles.centered]}>
        <ActivityIndicator accessibilityLabel="Opening your reflection" />
      </View>
    );
  }

  return (
    <View testID="journal-entry-detail-screen" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text testID="journal-entry-date" style={styles.date}>
          {formatEntryDate(entry.createdAt)}
        </Text>
        <Text testID="journal-entry-text" style={styles.body}>
          {entry.text}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: semantic.background.screen },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing[24] },
  content: { padding: spacing[24], gap: spacing[16] },
  date: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
  },
  body: {
    fontSize: typography.bodyLarge.size,
    color: semantic.text.primary,
    lineHeight: typography.bodyLarge.size * 1.5,
  },
  missingText: {
    fontSize: typography.bodyLarge.size,
    color: semantic.text.secondary,
    textAlign: 'center',
  },
});
