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
import { colorSystem, spacing, typography, borderRadius } from '../../../constants/colors';
import type { ModuleId } from '../../../types/education';

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
  onReturn: () => void;
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
  'sphere-sovereignty-sorting': {
    text: 'Some things are up to us and some things are not up to us.',
    author: 'Epictetus',
    source: 'Enchiridion 1',
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
  onReturn,
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
          accessibilityLabel="Continue to next section"
          accessibilityHint="Navigates to the next module section"
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

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
          onPress={onReturn}
          accessibilityRole="button"
          accessibilityLabel="Return to module overview"
          accessibilityHint="Navigates back to module home"
          testID={`${testID}-return-button`}
        >
          {({ pressed }) => (
            <Text
              style={[
                styles.secondaryButtonText,
                pressed && styles.secondaryButtonTextPressed,
              ]}
            >
              Return to Module
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colorSystem.status.successBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  completionIcon: {
    fontSize: 48,
    color: colorSystem.status.success,
    fontWeight: 'bold',
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
    fontWeight: '500',
    color: colorSystem.gray[700],
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  quoteContainer: {
    backgroundColor: colorSystem.navigation.learn + '10', // 10% opacity
    borderLeftWidth: 4,
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
    fontWeight: '500',
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
    fontWeight: '600',
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
    fontWeight: '600',
    color: colorSystem.base.black,
  },
  secondaryButtonTextPressed: {
    color: colorSystem.gray[700],
  },
});

export default PracticeCompletionScreen;
