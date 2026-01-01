/**
 * GROUNDED PRESENCE SCREEN - FEAT-139 Morning Flow UX Refactor
 *
 * Screen 1: Physical grounding FIRST per Stoic Mindfulness Aware Presence principle.
 * Body scan or breath anchor to start the day grounded in present-moment awareness.
 *
 * Time: 2-3 minutes | Principle: Aware Presence | Required inputs: None
 *
 * Key Design Decisions (Philosopher validated 9/10):
 * - Physical grounding FIRST (embodied awareness before cognitive work)
 * - No required text input = zero friction start
 * - Continue button appears after 60s minimum (encourages 2-3 min)
 * - Breathing animation at 60fps with haptic feedback (iOS)
 * - prefersReducedMotion: static glow alternative
 *
 * Classical Stoic Foundation:
 * - Marcus Aurelius: "Dwell on the beauty of life" (Meditations 4:3)
 *   - Present-moment attention grounds philosophical practice
 * - Epictetus: "First say to yourself what you would be; then do what you have to do"
 *   - Being precedes doing; grounding precedes intention
 *
 * @see /docs/product/stoic-mindfulness/principles/01-aware-presence.md
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { MorningFlowParamList, GroundedPresenceData } from '@/features/practices/types/flows';
import BreathingCircle from '../../shared/components/BreathingCircle';
import Timer from '../../shared/components/Timer';
import { SkipLink, GuidanceCard } from '../../shared/components';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';

// Re-export for backward compatibility
export type { GroundedPresenceData } from '@/features/practices/types/flows';

// Minimum time before Continue button becomes active (milliseconds)
const MINIMUM_PRESENCE_TIME_MS = 60 * 1000;

// Static glow size for reduced motion accessibility
const STATIC_GLOW_SIZE = 150;

type Props = StackScreenProps<MorningFlowParamList, 'GroundedPresence'> & {
  onSave?: (data: GroundedPresenceData) => void;
};

const GroundedPresenceScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as GroundedPresenceData | undefined;

  const [isTimerActive, setIsTimerActive] = useState(!initialData?.completed);
  const [canContinue, setCanContinue] = useState(initialData?.completed || false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const startTimeRef = useRef<Date>(new Date());

  // Check for reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setReduceMotion(enabled)
    );

    return () => subscription.remove();
  }, []);

  // Handle timer completion
  const handleTimerComplete = () => {
    setIsTimerActive(false);
    setCanContinue(true);
  };

  const handleContinue = () => {
    const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
    const data: GroundedPresenceData = {
      completed: true,
      duration: elapsedSeconds,
      skipped: false,
    };

    if (onSave) {
      onSave(data);
    }

    navigation.navigate('GratitudeIntention' as never);
  };

  const handleSkip = () => {
    const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
    const data: GroundedPresenceData = {
      completed: false,
      duration: elapsedSeconds,
      skipped: true,
    };

    if (onSave) {
      onSave(data);
    }

    navigation.navigate('GratitudeIntention' as never);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID="grounded-presence-screen"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Grounded Presence</Text>
          <Text style={styles.subtitle}>
            Settle into your body. The day hasn't started yet.
          </Text>
        </View>

        {/* Breathing Animation or Static Glow */}
        <View style={styles.breathingSection}>
          {reduceMotion ? (
            <View
              style={styles.staticGlow}
              accessibilityLabel="Breathing guidance circle"
            >
              <Text style={styles.staticGlowText}>Breathe</Text>
            </View>
          ) : (
            <BreathingCircle
              isActive={isTimerActive}
              testID="morning-grounded-breathing"
              phaseText={{
                inhale: 'breathe in... 4 seconds',
                exhale: 'breathe out... 4 seconds',
              }}
            />
          )}

          {/* Timer - below breathing circle, morning themed */}
          {!canContinue && (
            <View style={styles.timerWrapper}>
              <Timer
                duration={MINIMUM_PRESENCE_TIME_MS}
                isActive={isTimerActive}
                onComplete={handleTimerComplete}
                showProgress={false}
                showControls={false}
                showSkip={false}
                theme="morning"
                testID="morning-grounded-timer"
              />
            </View>
          )}
        </View>

        {/* Guidance Card */}
        <View style={styles.guidanceWrapper}>
          <GuidanceCard
            title="Before this day begins, notice:"
            items={[
              'The weight of your body',
              'The rhythm of your breath',
              'The sounds around you',
            ]}
            testID="morning-grounded-guidance"
          />
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            !canContinue && styles.continueButtonWaiting,
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
          accessibilityHint={
            canContinue
              ? 'Continue to gratitude and intention'
              : 'Wait for the timer to complete'
          }
          testID="continue-button"
        >
          <Text style={styles.continueButtonText}>
            {canContinue ? "I'm Present, Continue" : 'Present for 60s...'}
          </Text>
        </TouchableOpacity>

        {/* Skip Link */}
        <SkipLink
          onPress={handleSkip}
          accessibilityLabel="Skip grounded presence"
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white, // Match other check-in flows
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[20],
    paddingBottom: spacing[40],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[32],
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
  },
  breathingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[32],
    minHeight: 200,
  },
  staticGlow: {
    width: STATIC_GLOW_SIZE,
    height: STATIC_GLOW_SIZE,
    borderRadius: STATIC_GLOW_SIZE / 2,
    backgroundColor: colorSystem.themes.morning.primary,
    opacity: 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staticGlowText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.black, // High contrast for reduced motion accessibility
  },
  timerWrapper: {
    marginTop: spacing[24],
    opacity: 0.6, // Dim timer - not the focus
  },
  guidanceWrapper: {
    marginBottom: spacing[32],
  },
  continueButton: {
    backgroundColor: colorSystem.themes.morning.primary,
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    marginBottom: spacing[16],
    // Touch target minimum
    minHeight: 48,
    justifyContent: 'center',
  },
  continueButtonWaiting: {
    backgroundColor: colorSystem.gray[300],
  },
  continueButtonText: {
    color: colorSystem.base.white,
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default GroundedPresenceScreen;
