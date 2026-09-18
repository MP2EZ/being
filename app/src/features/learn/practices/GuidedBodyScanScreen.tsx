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
 * - Clear visual feedback for area changes. The current area is also carried in
 *   the accessibility tree — ProgressiveBodyScanList labels each row with its
 *   status ("currently focusing" / "completed" / "upcoming") — so a screen
 *   reader user can find it on traversal. There is no audio: the app ships no
 *   audio playback (no expo-av / expo-audio / expo-speech dependency), and this
 *   screen does not push announcements, since the user drives the pace by tap.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
} from 'react-native';
/**
 * MAINT-437, corrected DEBUG-621 — `edges` applies to all 1 SafeAreaView root(s) in
 * this file.
 *
 * Root-stack `modal` card with `headerShown: false`. The earlier claim that iOS
 * rendering was "unchanged by construction" was false: RN core's SafeAreaView used
 * the view's own position, while react-native-safe-area-context reads the window's
 * insets, so claiming `top` doubled the inset the iOS modal card's margin already
 * supplies. `getModalPracticeEdges` drops `top` on iOS and keeps both on Android.
 *
 * The app is portrait-locked (app.json `orientation: "portrait"`), so left/right
 * are never listed. NOTE: no test in this repo can observe an `edges` value having
 * a layout effect — the jest mock pins all insets to zero. The rendered result is
 * verified by MAINT-437's deferred Android/iOS device pass.
 */
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorSystem, spacing, typography, borderRadius, semantic } from '@/core/theme';
import { BODY_AREAS } from '@/features/practices/shared/components/BodyAreaGrid';
import ProgressiveBodyScanList from '@/features/practices/shared/components/ProgressiveBodyScanList';
import { CRISIS_BUTTON_EXCLUSION_RECT } from '@/features/crisis/constants/crisisButtonGeometry';
import PracticeScreenHeader from '@/features/learn/practices/shared/PracticeScreenHeader';
import { getModalPracticeEdges } from '@/features/learn/practices/shared/practiceSafeAreaEdges';
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
  const { renderCompletion, markStarted, markComplete } = usePracticeCompletion({
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
      // DEBUG-536: this screen's honest start — the first Next, not the mount.
      markStarted();
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
    <SafeAreaView edges={getModalPracticeEdges()} style={styles.container} testID={testID}>
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
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[32],
  },
  instructionsSection: {
    marginBottom: spacing[32],
  },
  instructionsText: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.primary,
    textAlign: 'center',
    lineHeight: spacing[24],
  },
  bodyAreaSection: {
    marginBottom: spacing[32],
  },
  sectionLabel: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.bold,
    color: semantic.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[16],
  },
  nextButton: {
    backgroundColor: colorSystem.navigation.learn,
    borderRadius: borderRadius.large,
    paddingVertical: spacing[24],
    alignItems: 'center',
    marginBottom: spacing[32],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: spacing[4],
    },
    shadowOpacity: 0.1,
    shadowRadius: spacing[4],
    elevation: 2,
    /**
     * DEBUG-631 — clear the crisis FAB's touch band. DERIVED, never measured.
     *
     * `GuidedBodyScan` is in IMMERSIVE_ROUTES and absent from SUPPRESSED_ROUTES, so the
     * FAB is FADED, not gone — `FADED_OPACITY` is an opacity and does not affect hit
     * testing. At `zIndex: 9999` any overlap turns a tap on this button's right edge
     * into CrisisResources: a crisis FALSE POSITIVE, the DEBUG-547 shape.
     *
     * This button is a stretch child of `content` (paddingHorizontal: spacing[24]), so
     * it spans x = 24..W-24, and the rect's `left` is 72. Both are offsets from the same
     * screen-right edge, so W cancels and the overlap is exactly 48pt at EVERY viewport.
     * AX5 scales the label's height, never the x-range of a stretch child in a
     * fixed-padding column. On-device bounds and a corner point-tap are DEBUG-626's.
     *
     * `marginRight`, never `paddingRight`: padding would move only the label and leave
     * the touch frame — the thing that receives the tap — in the contested column.
     *
     * Do NOT reach for DEBUG-628's "last-key-wins" rationale here; it does not apply.
     * That argument is about an ARRAY merge (`style={[styles.button, style]}`, caller
     * last) in PracticeToggleButton, which this host does not use — it passes
     * `style={styles.nextButton}` as a bare object, so there is no array order at all.
     * Within one object, `marginRight` and `marginHorizontal` are distinct keys that
     * Yoga resolves by edge specificity (right > horizontal), independent of declaration
     * order. Adding `marginHorizontal` would not silently defeat this, but it would cost
     * another 48pt of width for nothing.
     */
    marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left,
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
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    gap: spacing[8],
  },
  noteIcon: {
    fontSize: typography.title.size,
  },
  noteText: {
    flex: 1,
    fontSize: typography.caption.size,
    color: semantic.text.secondary,
    lineHeight: spacing[20],
    fontStyle: 'italic',
  },
});

export default GuidedBodyScanScreen;
