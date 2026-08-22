/**
 * Tier 3 — the classical anchor (FEAT-457, slice 3b).
 *
 * Renders LAST, and that is a philosophical requirement rather than schema order:
 *   · `domainBindings.ts` clause 2 is the surface's founding constraint —
 *     situation-language first, classical revealed after. An epigraph at the top
 *     would make the first thing a person in acute conflict reads an ancient
 *     authority telling them how to feel.
 *   · `types/guidance.ts` defines the ladder shallowest-first and states the gate
 *     "can cap the ladder at Tier 1 without any tier needing to know why". A
 *     Tier 3 element above Tier 1 breaks that property structurally, not visually.
 *   · `learn/tabs/OverviewTab.tsx` leads with its quote because Learn is browsed
 *     by principle by a reader who came for the philosophy. Different reader.
 *
 * NO HEADING. The ladder's internal vocabulary ("Tier 3", "Classical Anchor") is
 * never shown to the reader.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE FRAMING LINE IS LOAD-BEARING, NOT DECORATION.
 *
 * A bare aphorism handed to a distressed person reads as a verdict on their
 * situation. This specific line contains "avenging" — unframed, it can land as an
 * accusation that the reader wants revenge. The frame establishes the passage as
 * a private note-to-self, which the *Meditations* literally is, removing the
 * authority-lecturing-you posture WITHOUT supplying an interpretation.
 *
 * And no gloss AFTER the quote, deliberately. An interpretive sentence would be
 * the app deciding what the passage means for this reader's conflict, substituting
 * its judgment for their prohairesis. Let it sit.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 🔴 THE TRANSLATOR CREDIT IS MANDATORY. It is not a style choice and not
 * droppable for layout. `library/types/library.ts` declares it mandatory,
 * `PassageReaderScreen` renders it, and `learn/__tests__/moduleClassicalQuotes.test.ts`
 * pins the `(trans. X)` suffix per author and blocks in-copyright renderings
 * (Hays, Hard, White) by pattern — DEBUG-343 exists because a module once shipped
 * without it. The credit is also what makes the shipped string auditable as public
 * domain (Long, 1862). `author` and `source` are rendered VERBATIM, never parsed
 * or reformatted, so the provenance travels with the content.
 *
 * NOTE: `OverviewTab.tsx` renders only `— {author}` and drops `source`. That is a
 * defect there, not a precedent to copy here.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ClassicalQuote } from '@/features/learn/types/education';
import { borderRadius, colorSystem, semantic, spacing, typography } from '@/core/theme';

interface Tier3Props {
  readonly quote: ClassicalQuote;
}

/**
 * `source` is optional on `ClassicalQuote`, so the attribution degrades to the
 * author alone rather than rendering a dangling comma. The guidance loader's
 * validator requires `source` to be a string for guidance content specifically,
 * so this branch is unreachable for authored guidance — it exists because the
 * shared type permits it and a crash here would take the whole screen down.
 */
const attribution = (quote: ClassicalQuote): string =>
  quote.source ? `— ${quote.author}, ${quote.source}` : `— ${quote.author}`;

const Tier3: React.FC<Tier3Props> = ({ quote }) => (
  <View style={styles.container} testID="guidance-tier3">
    <Text style={styles.frame}>
      Eighteen centuries ago, Marcus Aurelius wrote this to himself.
    </Text>

    <Text style={styles.quote} testID="guidance-tier3-quote">
      {quote.text}
    </Text>

    <Text style={styles.attribution} testID="guidance-tier3-attribution">
      {attribution(quote)}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[24],
    padding: spacing[16],
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.gray[300],
  },
  frame: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    marginBottom: spacing[12],
  },
  quote: {
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight,
    fontStyle: 'italic',
    color: semantic.text.primary,
  },
  attribution: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    marginTop: spacing[12],
  },
});

export default Tier3;
