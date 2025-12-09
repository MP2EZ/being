/**
 * Guided Body Scan Screen - Self-Paced Resistance/Tension Check
 * FEAT-81: Interactive Practice Screens
 *
 * Reuses shared components for DRY compliance:
 * - ProgressiveBodyScanList: Visual progress through body areas
 * - PracticeCompletionScreen: Philosopher-validated completion
 *
 * Use case: Resistance Body Check - manual, self-paced body awareness
 * vs. BodyScanScreen: Timer-based, auto-advancing body scan
 *
 * DESIGN:
 * - User-controlled pace (tap to advance)
 * - Resistance/tension-focused guidance per area
 * - No timer pressure - complete when ready
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - Clear visual and audio feedback for area changes
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';
import { BODY_AREAS } from '@/features/practices/shared/components/BodyAreaGrid';
import ProgressiveBodyScanList from '@/features/practices/shared/components/ProgressiveBodyScanList';
import PracticeScreenHeader from '@/features/learn/practices/shared/PracticeScreenHeader';
import { usePracticeCompletion } from '@/features/learn/practices/shared/usePracticeCompletion';
import { useInstructionsFade } from '@/features/learn/practices/shared/useInstructionsFade';
import type { ModuleId } from '@/features/learn/types/education';

interface GuidedBodyScanScreenProps {
  practiceId: string;
  moduleId: ModuleId;
  title: string;
  onComplete?: () => void;
  onBack?: () => void;
  testID?: string;
}

/**
 * Resistance/tension guidance for each body area
 * Focused on noticing sensation and resistance rather than relaxation
 */
const RESISTANCE_GUIDANCE: Record<string, string> = {
  'Head & Neck': 'Notice any tightness in your forehead, jaw, or neck. Where do you feel tension? What sensations are present?',
  'Shoulders & Chest': 'Scan your shoulders and chest. Are they holding tension? Notice any sensations without trying to change them.',
  'Upper Back & Lower Back': 'Bring awareness to your back. Notice areas of resistance or discomfort. What does the sensation feel like?',
  'Abdomen & Hips': 'Check your core and hips. Notice any tightness or holding. What sensations are you aware of?',
  'Upper Legs & Lower Legs': "Scan through your legs. Where do you notice tension or sensation? Simply observe what's present.",
  'Feet': 'Notice your feet. Are they relaxed or tense? What sensations can you feel?',
};

const GuidedBodyScanScreen: React.FC<GuidedBodyScanScreenProps> = ({
  practiceId,
  moduleId,
  title,
  onComplete,
  onBack,
  testID = 'guided-body-scan-screen',
}) => {
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);
  const [isPracticeStarted, setIsPracticeStarted] = useState(false);

  // Shared hooks
  const { renderCompletion, markComplete } = usePracticeCompletion({
    practiceId,
    moduleId,
    title,
    onComplete,
    testID,
  });

  const { opacity: instructionsOpacity, showInstructions } = useInstructionsFade(isPracticeStarted);

  const currentArea = BODY_AREAS[currentAreaIndex] ?? 'Head & Neck';
  const currentGuidance = RESISTANCE_GUIDANCE[currentArea] || 'Notice the sensations in this area.';
  const areaCount = BODY_AREAS.length;
  const isLastArea = currentAreaIndex === areaCount - 1;

  /**
   * Handle advancing to next area or completing
   */
  const handleNext = () => {
    // Start practice on first Next press
    if (!isPracticeStarted) {
      setIsPracticeStarted(true);
    }

    if (isLastArea) {
      // Complete the practice
      markComplete();
    } else {
      // Move to next area
      setCurrentAreaIndex(currentAreaIndex + 1);
    }
  };

  // Show completion screen after all areas checked
  const completionScreen = renderCompletion();
  if (completionScreen) {
    return completionScreen;
  }

  return (
    <SafeAreaView style={styles.container} testID={testID}>
      <StatusBar barStyle="dark-content" backgroundColor={colorSystem.base.white} />

      {/* Header */}
      <PracticeScreenHeader
        title={title}
        onBack={onBack || (() => {})}
        testID={`${testID}-header`}
      />

      {/* Main Content - Scrollable */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Practice Instructions - Fade out after first Next press */}
        <Animated.View
          style={[
            styles.instructionsSection,
            { opacity: instructionsOpacity }
          ]}
          pointerEvents={showInstructions ? 'auto' : 'none'}
        >
          <Text style={styles.instructionsText}>
            Take your time with each area. Notice sensations without trying to change them.
            Tap "Next" when you're ready to continue.
          </Text>
        </Animated.View>

        {/* Progressive Body Scan List (Shared DRY Component) */}
        <View style={styles.bodyAreaSection}>
          <Text style={styles.sectionLabel}>Progress</Text>
          <ProgressiveBodyScanList
            areas={BODY_AREAS}
            currentIndex={currentAreaIndex}
            currentGuidance={currentGuidance}
            testID={`${testID}-body-scan-list`}
          />
        </View>

        {/* Next/Complete Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={isLastArea ? "Complete practice" : "Move to next area"}
          accessibilityHint={isLastArea ? "Finish the body scan practice" : `Move from ${currentArea} to the next body area`}
          testID={`${testID}-next-button`}
        >
          <Text style={styles.nextButtonText}>
            {isLastArea ? 'Complete Practice' : 'Next Area'}
          </Text>
        </TouchableOpacity>

        {/* Mindfulness Note */}
        <View style={styles.noteSection}>
          <Text style={styles.noteIcon}>💡</Text>
          <Text style={styles.noteText}>
            There's no right or wrong way to feel. Simply notice what's present in each
            area with curiosity and kindness.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  instructionsSection: {
    marginBottom: spacing.xl,
  },
  instructionsText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: spacing.lg,
  },
  bodyAreaSection: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.gray[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  nextButton: {
    backgroundColor: colorSystem.navigation.learn,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: spacing.xs,
    },
    shadowOpacity: 0.1,
    shadowRadius: spacing.xs,
    elevation: 2,
  },
  nextButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colorSystem.navigation.learn + '10',
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    gap: spacing.sm,
  },
  noteIcon: {
    fontSize: typography.title.size,
  },
  noteText: {
    flex: 1,
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
    lineHeight: spacing[5],
    fontStyle: 'italic',
  },
});

export default GuidedBodyScanScreen;
