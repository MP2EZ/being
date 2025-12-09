/**
 * PracticeCompletionScreen Component
 * Reusable completion screen for all practice types
 *
 * PHILOSOPHER VALIDATION:
 * - Uses exact Stoic quotes from Notion validation
 * - Educational tone (no gamification)
 * - Acknowledges effort without scoring
 *
 * PERFORMANCE:
 * - <500ms launch time
 * - Minimal re-renders
 * - Optimized animations
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  AccessibilityInfo,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme/colors';
import type { ModuleId } from '@/features/learn/types/education';

interface ClassicalQuote {
  text: string;
  author: 'Marcus Aurelius' | 'Epictetus' | 'Seneca';
  source: string;
}

interface PracticeCompletionScreenProps {
  practiceTitle: string;
  quote: ClassicalQuote;
  moduleId: ModuleId;
  onContinue: () => void;
  testID?: string;
}

/**
 * Stoic quotes validated by philosopher
 * MUST use exactly as provided - no paraphrasing
 */
export const PRACTICE_QUOTES: Record<string, ClassicalQuote> = {
  'breathing-space': {
    text: 'Confine yourself to the present.',
    author: 'Marcus Aurelius',
    source: 'Meditations 8.36',
  },
  'acceptance-shift': {
    text: 'The universe is change; our life is what our thoughts make it.',
    author: 'Marcus Aurelius',
    source: 'Meditations 4.3',
  },
  'resistance-check': {
    text: 'Do not let the body\'s reflexes control the soul.',
    author: 'Marcus Aurelius',
    source: 'Meditations 6.16',
  },
  'control-sorting': {
    text: 'Some things are up to us and some things are not up to us.',
    author: 'Epictetus',
    source: 'Enchiridion 1',
  },
  'reserve-clause': {
    text: 'Nothing happens to any man that he is not formed by nature to bear.',
    author: 'Marcus Aurelius',
    source: 'Meditations 5.18',
  },
  'virtue-check': {
    text: 'Waste no more time arguing what a good person should be. Be one.',
    author: 'Marcus Aurelius',
    source: 'Meditations 10.16',
  },
  'virtuous-reframing': {
    text: 'The impediment to action advances action. What stands in the way becomes the way.',
    author: 'Marcus Aurelius',
    source: 'Meditations 5.20',
  },
  'gratitude-reflection': {
    text: 'Receive without conceit, release without struggle.',
    author: 'Marcus Aurelius',
    source: 'Meditations 8.33',
  },
  'body-scan': {
    text: 'You have power over your mind - not outside events. Realize this, and you will find strength.',
    author: 'Marcus Aurelius',
    source: 'Meditations 5.9',
  },
};

const PracticeCompletionScreen: React.FC<PracticeCompletionScreenProps> = ({
  practiceTitle,
  quote,
  moduleId,
  onContinue,
  testID = 'practice-completion-screen',
}) => {
  // Announce completion for screen readers
  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      `Practice complete: ${practiceTitle}. ${quote.text}`
    );
  }, [practiceTitle, quote]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      testID={testID}
      accessible
      accessibilityLabel="Practice completion screen"
    >
      {/* Completion Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.completionIcon} accessibilityLabel="Checkmark icon">
          ✓
        </Text>
      </View>

      {/* Title */}
      <Text
        style={styles.title}
        accessibilityRole="header"
      >
        Practice Complete
      </Text>

      {/* Practice Name */}
      <Text style={styles.practiceName}>{practiceTitle}</Text>

      {/* Stoic Quote - Philosopher Validated */}
      <View style={styles.quoteContainer}>
        <Text
          style={styles.quoteText}
          accessibilityLabel={`Quote from ${quote.author}: ${quote.text}`}
        >
          "{quote.text}"
        </Text>
        <Text style={styles.quoteAttribution}>
          — {quote.author}, {quote.source}
        </Text>
      </View>

      {/* Educational Message - No Gamification */}
      <Text style={styles.educationalMessage}>
        Each time you practice, you strengthen awareness. The benefits unfold
        gradually, through regular engagement with these principles.
      </Text>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          accessibilityHint="Continue from practice completion"
          testID={`${testID}-continue-button`}
        >
          {({ pressed }) => (
            <Text
              style={[
                styles.primaryButtonText,
                pressed && styles.primaryButtonTextPressed,
              ]}
            >
              Continue
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: spacing[20],
    height: spacing[20],
    borderRadius: borderRadius.xxxl,
    backgroundColor: colorSystem.status.successBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  completionIcon: {
    fontSize: spacing.xxl,
    color: colorSystem.status.success,
    fontWeight: typography.fontWeight.bold,
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  practiceName: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.gray[700],
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  quoteContainer: {
    backgroundColor: colorSystem.navigation.learn + '10', // 10% opacity
    borderLeftWidth: spacing.xs,
    borderLeftColor: colorSystem.navigation.learn,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.medium,
    width: '100%',
  },
  quoteText: {
    fontSize: typography.bodyLarge.size,
    fontStyle: 'italic',
    color: colorSystem.base.black,
    lineHeight: typography.bodyLarge.size * (typography.bodyLarge.lineHeight || 1.5),
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  quoteAttribution: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    textAlign: 'right',
    fontWeight: typography.fontWeight.medium,
  },
  educationalMessage: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: typography.bodyRegular.size * (typography.bodyRegular.lineHeight || 1.5),
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colorSystem.navigation.learn,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    minHeight: 48, // WCAG touch target
  },
  primaryButtonPressed: {
    backgroundColor: colorSystem.navigation.learn + 'DD', // Slightly darker
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  primaryButtonTextPressed: {
    opacity: 0.9,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colorSystem.gray[400],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    minHeight: 48, // WCAG touch target
  },
  secondaryButtonPressed: {
    backgroundColor: colorSystem.gray[100],
    borderColor: colorSystem.gray[500],
  },
  secondaryButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
  },
  secondaryButtonTextPressed: {
    color: colorSystem.gray[700],
  },
});

export default PracticeCompletionScreen;
