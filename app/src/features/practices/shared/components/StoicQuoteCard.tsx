/**
 * STOIC QUOTE CARD COMPONENT
 *
 * Displays classical Stoic quotes with author attribution.
 * Used for philosophical framing in check-in flows.
 *
 * Design (Philosopher validated):
 * - Left border accent indicates quoted material
 * - Italic quote text with author attribution
 * - Supports theming for morning/midday/evening flows
 *
 * Classical Sources:
 * - Marcus Aurelius (Meditations)
 * - Seneca (Letters)
 * - Epictetus (Enchiridion, Discourses)
 *
 * @example
 * <StoicQuoteCard
 *   quote="We were born to work together like feet, hands, and eyes."
 *   author="Marcus Aurelius"
 *   source="Meditations 2:1"
 *   theme="morning"
 * />
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, borderRadius, typography, getTheme } from '@/core/theme';

export type FlowTheme = 'morning' | 'midday' | 'evening';

interface StoicQuoteCardProps {
  /** The quote text */
  quote: string;
  /** Author name (e.g., "Marcus Aurelius") */
  author: string;
  /** Optional source reference (e.g., "Meditations 2:1") */
  source?: string;
  /** Flow theme for accent color */
  theme?: FlowTheme;
  /** Optional test ID */
  testID?: string;
}

/**
 * StoicQuoteCard - Displays classical Stoic quotes with attribution
 */
export const StoicQuoteCard: React.FC<StoicQuoteCardProps> = ({
  quote,
  author,
  source,
  theme = 'morning',
  testID = 'stoic-quote-card',
}) => {
  const themeColors = getTheme(theme);

  return (
    <View
      style={[styles.container, { borderLeftColor: themeColors.primary }]}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`Quote: ${quote}. By ${author}${source ? `, from ${source}` : ''}`}
    >
      <Text style={styles.quoteText}>"{quote}"</Text>
      <Text style={styles.attribution}>
        — {author}
        {source && <Text style={styles.source}>, {source}</Text>}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
    padding: spacing[24],
    marginBottom: spacing[24],
    borderLeftWidth: 4,
  },
  quoteText: {
    fontSize: typography.bodyLarge.size,
    fontStyle: 'italic',
    color: colorSystem.base.black,
    lineHeight: 28,
    marginBottom: spacing[12],
  },
  attribution: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    textAlign: 'right',
  },
  source: {
    fontStyle: 'italic',
  },
});

export default StoicQuoteCard;
