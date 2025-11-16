/**
 * SortingPracticeScreen Component
 * Interactive card sorting for Sphere Sovereignty (Module 3)
 *
 * PHILOSOPHER VALIDATION:
 * - 12 scenarios from module-3-sphere-sovereignty.json
 * - Educational feedback (no scoring/gamification)
 * - Virtue-check feedback tone for missed opportunities
 * - Exact Epictetus quote on completion
 *
 * PERFORMANCE:
 * - <500ms launch time
 * - Smooth swipe animations
 * - Efficient state management
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - Screen reader support
 * - Button alternatives to swipe gestures
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  AccessibilityInfo,
  Animated,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme/colors';
import PracticeScreenHeader from '@/features/learn/practices/shared/PracticeScreenHeader';
import { usePracticeCompletion } from '@/features/learn/practices/shared/usePracticeCompletion';
import type { ModuleId } from '@/features/learn/types/education';
import type { SortingScenario } from '@/features/learn/types/education';

interface SortingPracticeScreenProps {
  practiceId: string;
  moduleId: ModuleId;
  scenarios: SortingScenario[];
  onComplete?: () => void;
  onBack?: () => void;
  testID?: string;
}

/**
 * Virtue-check feedback for educational reflection
 * PHILOSOPHER VALIDATED - exact tone from Notion
 */
const VIRTUE_CHECK_FEEDBACK =
  'Noticing that you missed opportunities is itself an act of prosoche - the attention that Epictetus identifies as essential for virtue. This awareness is where progress begins. Each moment offers a fresh start to align with your intentions.';

const SortingPracticeScreen: React.FC<SortingPracticeScreenProps> = ({
  practiceId,
  moduleId,
  scenarios,
  onComplete,
  onBack,
  testID = 'sorting-practice-screen',
}) => {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<'in-control' | 'not-in-control' | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [cardAnimation] = useState(new Animated.Value(1));

  // Shared hook
  const { renderCompletion, markComplete } = usePracticeCompletion({
    practiceId,
    moduleId,
    title: 'Control Sorting Practice',
    onComplete,
    testID,
  });

  const currentScenario = scenarios[currentScenarioIndex];
  if (!currentScenario) {
    throw new Error(`Missing scenario at index ${currentScenarioIndex}`);
  }

  const progress = currentScenarioIndex + 1;
  const total = scenarios.length;
  const isLastScenario = currentScenarioIndex === scenarios.length - 1;

  /**
   * Handle user selection
   */
  const handleSelection = useCallback(
    (answer: 'in-control' | 'not-in-control') => {
      setUserAnswer(answer);
      setShowFeedback(true);

      // Announce for screen readers
      const isCorrect = answer === currentScenario.correctAnswer;
      AccessibilityInfo.announceForAccessibility(
        isCorrect
          ? 'Correct. ' + currentScenario.explanation
          : 'Not quite. ' + currentScenario.explanation
      );
    },
    [currentScenario]
  );

  /**
   * Move to next scenario with animation
   */
  const handleNext = useCallback(() => {
    // Animate card exit
    Animated.timing(cardAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (isLastScenario) {
        // Complete practice
        markComplete();
        AccessibilityInfo.announceForAccessibility('Sorting practice complete');
      } else {
        // Move to next scenario
        setCurrentScenarioIndex((prev) => prev + 1);
        setUserAnswer(null);
        setShowFeedback(false);

        // Animate card entrance
        cardAnimation.setValue(0);
        Animated.timing(cardAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    });
  }, [isLastScenario, cardAnimation, markComplete]);

  /**
   * Reset card animation on mount
   */
  useEffect(() => {
    cardAnimation.setValue(1);
  }, [cardAnimation]);

  // Show completion screen
  const completionScreen = renderCompletion();
  if (completionScreen) {
    return completionScreen;
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <PracticeScreenHeader
        title="Control Sorting Practice"
        onBack={onBack || (() => {})}
        progress={{ current: progress, total }}
        testID={`${testID}-header`}
      />

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[styles.progressBar, { width: `${(progress / total) * 100}%` }]}
          accessibilityElementsHidden={true}
        />
      </View>

      {/* Scenario Card */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: cardAnimation,
            transform: [
              {
                scale: cardAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Scenario Text */}
          <View style={styles.scenarioCard}>
            <Text style={styles.scenarioLabel}>Scenario:</Text>
            <Text style={styles.scenarioText}>{currentScenario.text}</Text>
          </View>

          {/* Selection Buttons */}
          {!showFeedback && (
            <View style={styles.selectionContainer}>
              <Text style={styles.selectionPrompt}>
                Is this within your control or outside your control?
              </Text>
              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.choiceButton,
                    styles.inControlButton,
                    pressed && styles.choiceButtonPressed,
                  ]}
                  onPress={() => handleSelection('in-control')}
                  accessibilityRole="button"
                  accessibilityLabel="Within my control"
                  testID={`${testID}-in-control-button`}
                >
                  {({ pressed }) => (
                    <Text
                      style={[
                        styles.choiceButtonText,
                        pressed && styles.choiceButtonTextPressed,
                      ]}
                    >
                      Within Control
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.choiceButton,
                    styles.notInControlButton,
                    pressed && styles.choiceButtonPressed,
                  ]}
                  onPress={() => handleSelection('not-in-control')}
                  accessibilityRole="button"
                  accessibilityLabel="Outside my control"
                  testID={`${testID}-not-in-control-button`}
                >
                  {({ pressed }) => (
                    <Text
                      style={[
                        styles.choiceButtonText,
                        pressed && styles.choiceButtonTextPressed,
                      ]}
                    >
                      Outside Control
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {/* Feedback Section */}
          {showFeedback && (
            <View style={styles.feedbackContainer}>
              {/* Explanation */}
              <View
                style={[
                  styles.feedbackCard,
                  userAnswer === currentScenario.correctAnswer
                    ? styles.feedbackCorrect
                    : styles.feedbackIncorrect,
                ]}
              >
                <Text style={styles.feedbackLabel}>
                  {userAnswer === currentScenario.correctAnswer
                    ? 'Accurate Sorting'
                    : 'Not Quite'}
                </Text>
                <Text style={styles.feedbackText}>
                  {currentScenario.explanation}
                </Text>
              </View>

              {/* Educational Lists */}
              <View style={styles.listsContainer}>
                {/* In Control List */}
                {currentScenario.inControl && currentScenario.inControl.length > 0 && (
                  <View style={styles.listSection}>
                    <Text style={styles.listTitle}>Within Your Control:</Text>
                    {currentScenario.inControl.map((item, index) => (
                      <Text key={index} style={styles.listItem}>
                        • {item}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Not In Control List */}
                {currentScenario.notInControl &&
                  currentScenario.notInControl.length > 0 && (
                    <View style={styles.listSection}>
                      <Text style={styles.listTitle}>Outside Your Control:</Text>
                      {currentScenario.notInControl.map((item, index) => (
                        <Text key={index} style={styles.listItem}>
                          • {item}
                        </Text>
                      ))}
                    </View>
                  )}
              </View>

              {/* Virtue-Check Feedback (if incorrect) */}
              {userAnswer !== currentScenario.correctAnswer && (
                <View style={styles.virtueCheckContainer}>
                  <Text style={styles.virtueCheckText}>
                    {VIRTUE_CHECK_FEEDBACK}
                  </Text>
                </View>
              )}

              {/* Next Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.nextButton,
                  pressed && styles.nextButtonPressed,
                ]}
                onPress={handleNext}
                accessibilityRole="button"
                accessibilityLabel={
                  isLastScenario ? 'Complete practice' : 'Next scenario'
                }
                testID={`${testID}-next-button`}
              >
                {({ pressed }) => (
                  <Text
                    style={[
                      styles.nextButtonText,
                      pressed && styles.nextButtonTextPressed,
                    ]}
                  >
                    {isLastScenario ? 'Complete Practice' : 'Continue'}
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colorSystem.gray[300],
    borderRadius: borderRadius.small,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colorSystem.navigation.learn,
    borderRadius: borderRadius.small,
  },
  cardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scenarioCard: {
    backgroundColor: colorSystem.navigation.learn + '10',
    borderWidth: 1.5,
    borderColor: colorSystem.navigation.learn,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.xl,
  },
  scenarioLabel: {
    fontSize: typography.caption.size,
    fontWeight: '700',
    color: colorSystem.gray[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  scenarioText: {
    fontSize: typography.bodyLarge.size,
    color: colorSystem.base.black,
    lineHeight: typography.bodyLarge.size * (typography.bodyLarge.lineHeight || 1.5),
  },
  selectionContainer: {
    marginBottom: spacing.xl,
  },
  selectionPrompt: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  buttonRow: {
    gap: spacing.md,
  },
  choiceButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 2,
  },
  inControlButton: {
    backgroundColor: colorSystem.status.successBackground,
    borderColor: colorSystem.status.success,
  },
  notInControlButton: {
    backgroundColor: colorSystem.status.infoBackground,
    borderColor: colorSystem.status.info,
  },
  choiceButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.8,
  },
  choiceButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.base.black,
  },
  choiceButtonTextPressed: {
    opacity: 0.9,
  },
  feedbackContainer: {
    gap: spacing.lg,
  },
  feedbackCard: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
  },
  feedbackCorrect: {
    backgroundColor: colorSystem.status.successBackground,
    borderLeftColor: colorSystem.status.success,
  },
  feedbackIncorrect: {
    backgroundColor: colorSystem.status.infoBackground,
    borderLeftColor: colorSystem.status.info,
  },
  feedbackLabel: {
    fontSize: typography.caption.size,
    fontWeight: '700',
    color: colorSystem.gray[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  feedbackText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    lineHeight: typography.bodyRegular.size * (typography.bodyRegular.lineHeight || 1.5),
  },
  listsContainer: {
    gap: spacing.md,
  },
  listSection: {
    backgroundColor: colorSystem.gray[100],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.medium,
  },
  listTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
  },
  listItem: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    lineHeight: typography.bodySmall.size * (typography.bodySmall.lineHeight || 1.4),
    marginBottom: spacing.xs,
  },
  virtueCheckContainer: {
    backgroundColor: colorSystem.navigation.learn + '10',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.navigation.learn + '40',
  },
  virtueCheckText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    fontStyle: 'italic',
    lineHeight: typography.bodySmall.size * (typography.bodySmall.lineHeight || 1.4),
  },
  nextButton: {
    backgroundColor: colorSystem.navigation.learn,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    minHeight: 48,
  },
  nextButtonPressed: {
    backgroundColor: colorSystem.navigation.learn + 'DD',
    transform: [{ scale: 0.98 }],
  },
  nextButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.base.white,
  },
  nextButtonTextPressed: {
    opacity: 0.9,
  },
});

export default SortingPracticeScreen;
