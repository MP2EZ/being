/**
 * SHARED BREATHING SCREEN COMPONENT
 *
 * MAINT-140: Consolidated breathing screen for morning/evening flows.
 * Eliminates code duplication while preserving flow-specific customization.
 *
 * Design Philosophy:
 * - NO cognitive load - just breathe
 * - Calming entry point to practice
 * - Continue button appears only after timer completes
 * - Full theme support (morning/evening)
 *
 * Stoic Philosophy:
 * - "First, stillness" - grounding before cognitive work
 * - Marcus Aurelius: Present-moment awareness precedes virtue
 * - Seneca: The mind must be prepared before examination
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import BreathingCircle from './BreathingCircle';
import Timer from './Timer';
import { SkipLink, GuidanceCard } from './index';
import { AccessibleButton } from '@/core/components/accessibility/AccessibleButton';
import { spacing, typography, colorSystem } from '@/core/theme';

export type FlowThemeType = 'morning' | 'midday' | 'evening';

export interface BreathingPattern {
  /** Inhale duration in milliseconds */
  inhale: number;
  /** Optional hold duration in milliseconds */
  hold?: number;
  /** Exhale duration in milliseconds */
  exhale: number;
}

export interface SharedBreathingScreenProps {
  /** Theme for styling (morning, midday, evening) */
  theme: FlowThemeType;
  /** Screen title text */
  title: string;
  /** Screen subtitle text */
  subtitle: string;
  /** Duration of breathing exercise in milliseconds */
  duration: number;
  /** Breathing pattern (inhale/hold/exhale durations) */
  breathingPattern: BreathingPattern;
  /** Phase text displayed during breathing */
  phaseText: {
    inhale: string;
    hold?: string;
    exhale: string;
  };
  /** Guidance card title */
  guidanceTitle: string;
  /** Guidance card items */
  guidanceItems: string[];
  /** Whether session was already completed (for resume) */
  wasCompleted?: boolean;
  /** Called when breathing completes */
  onComplete: () => void;
  /** Called when user skips */
  onSkip: () => void;
  /** Test ID for the screen */
  testID: string;
}

/**
 * SharedBreathingScreen - Consolidated breathing component
 * Used by morning (GroundedPresence) and evening (Breathing) flows.
 */
export const SharedBreathingScreen: React.FC<SharedBreathingScreenProps> = ({
  theme,
  title,
  subtitle,
  duration,
  breathingPattern,
  phaseText,
  guidanceTitle,
  guidanceItems,
  wasCompleted = false,
  onComplete,
  onSkip,
  testID,
}) => {
  const [isTimerActive, setIsTimerActive] = useState(!wasCompleted);
  const [isComplete, setIsComplete] = useState(wasCompleted);
  const [reduceMotion, setReduceMotion] = useState(false);
  const buttonOpacity = useRef(new Animated.Value(wasCompleted ? 1 : 0)).current;

  // Check for reduced motion preference (accessibility)
  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setReduceMotion(enabled)
    );

    return () => subscription.remove();
  }, []);

  const handleTimerComplete = () => {
    setIsTimerActive(false);
    setIsComplete(true);
    // Fade in the continue button
    Animated.timing(buttonOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const handleContinue = () => {
    onComplete();
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Breathing Circle - uses shared 60fps component */}
      <View style={styles.breathingContainer}>
        {reduceMotion ? (
          <View
            style={[
              styles.staticGlow,
              { backgroundColor: colorSystem.themes[theme].primary },
            ]}
            accessibilityLabel="Breathing guidance circle"
          >
            <Text style={styles.staticGlowText}>Breathe</Text>
          </View>
        ) : (
          <BreathingCircle
            isActive={isTimerActive}
            pattern={breathingPattern}
            showCountdown={false}
            phaseText={phaseText}
            testID={`${testID}-circle`}
          />
        )}

        {/* Timer - dim display */}
        {!isComplete && (
          <View style={styles.timerWrapper}>
            <Timer
              duration={duration}
              isActive={isTimerActive}
              onComplete={handleTimerComplete}
              showProgress={false}
              showControls={false}
              showSkip={false}
              theme={theme}
              testID={`${testID}-timer`}
            />
          </View>
        )}

        {/* Guidance Card */}
        {!isComplete && (
          <View style={styles.guidanceWrapper}>
            <GuidanceCard
              title={guidanceTitle}
              items={guidanceItems}
              testID={`${testID}-guidance`}
            />
          </View>
        )}
      </View>

      {/* Footer - either Continue button or Skip link */}
      <View style={styles.footer}>
        {isComplete ? (
          <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity }]}>
            <AccessibleButton
              onPress={handleContinue}
              label="Continue"
              variant="primary"
              size="large"
              theme={theme}
              testID="continue-button"
              accessibilityHint="Continue to next step"
            />
          </Animated.View>
        ) : (
          <SkipLink
            onPress={handleSkip}
            accessibilityLabel="Skip breathing exercise"
          />
        )}
      </View>
    </View>
  );
};

const STATIC_GLOW_SIZE = 150;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
    paddingHorizontal: spacing[20],
  },
  header: {
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
    alignItems: 'center',
  },
  title: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginTop: spacing[8],
  },
  breathingContainer: {
    alignItems: 'center',
    marginTop: spacing[24],
  },
  staticGlow: {
    width: STATIC_GLOW_SIZE,
    height: STATIC_GLOW_SIZE,
    borderRadius: STATIC_GLOW_SIZE / 2,
    opacity: 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staticGlowText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.black,
  },
  timerWrapper: {
    marginTop: spacing[24],
    opacity: 0.6, // Dim timer - not the focus
  },
  guidanceWrapper: {
    marginTop: spacing[16],
    marginHorizontal: spacing[20],
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: spacing[32],
    paddingTop: spacing[16],
  },
  buttonContainer: {
    width: '100%',
  },
});

export default SharedBreathingScreen;
