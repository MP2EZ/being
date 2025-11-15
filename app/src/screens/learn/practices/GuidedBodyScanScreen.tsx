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
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '../../../constants/colors';
import { BODY_AREAS } from '../../../flows/shared/components/BodyAreaGrid';
import ProgressiveBodyScanList from '../../../flows/shared/components/ProgressiveBodyScanList';
import PracticeCompletionScreen, {
  PRACTICE_QUOTES,
} from './PracticeCompletionScreen';
import { useEducationStore } from '../../../stores/educationStore';
import type { ModuleId } from '../../../types/education';

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
  const [isComplete, setIsComplete] = useState(false);

  // Store actions
  const incrementPracticeCount = useEducationStore(
    (state) => state.incrementPracticeCount
  );

  const currentArea = BODY_AREAS[currentAreaIndex] ?? 'Head & Neck';
  const currentGuidance = RESISTANCE_GUIDANCE[currentArea] || 'Notice the sensations in this area.';
  const areaCount = BODY_AREAS.length;
  const isLastArea = currentAreaIndex === areaCount - 1;

  /**
   * Handle advancing to next area or completing
   */
  const handleNext = () => {
    if (isLastArea) {
      // Complete the practice
      setIsComplete(true);
      incrementPracticeCount(moduleId);
    } else {
      // Move to next area
      setCurrentAreaIndex(currentAreaIndex + 1);
    }
  };

  /**
   * Handle completion screen done
   */
  const handleCompletionDone = () => {
    onComplete?.();
  };

  /**
   * Handle back button
   */
  const handleBack = () => {
    onBack?.();
  };

  // Show completion screen after all areas checked
  if (isComplete) {
    const quote = PRACTICE_QUOTES[practiceId] || PRACTICE_QUOTES['body-scan'];
    if (!quote) {
      throw new Error(`Missing quote for practiceId: ${practiceId}`);
    }
    return (
      <PracticeCompletionScreen
        practiceTitle={title}
        quote={quote}
        moduleId={moduleId}
        onContinue={handleCompletionDone}
        onReturn={handleBack}
        testID={`${testID}-completion`}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} testID={testID}>
      <StatusBar barStyle="dark-content" backgroundColor={colorSystem.base.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Return to previous screen"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content - Scrollable */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Practice Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsText}>
            Take your time with each area. Notice sensations without trying to change them.
            Tap "Next" when you're ready to continue.
          </Text>
        </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 24,
    color: colorSystem.navigation.learn,
  },
  headerTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.base.black,
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
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
    lineHeight: 24,
  },
  bodyAreaSection: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: typography.caption.size,
    fontWeight: '700',
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
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  nextButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
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
    fontSize: 20,
  },
  noteText: {
    flex: 1,
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default GuidedBodyScanScreen;
