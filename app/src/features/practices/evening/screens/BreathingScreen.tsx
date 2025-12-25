/**
 * BREATHING SCREEN - FEAT-134 Evening Flow Redesign
 *
 * Screen 1 of 6: Pure settling breath (no decisions)
 * Uses shared BreathingCircle (60fps) and Timer components
 *
 * Design Philosophy:
 * - NO cognitive load - just breathe
 * - Calming entry point to evening practice
 * - Continue button appears only after 60s
 * - Evening theme (dark, sleep-compatible)
 *
 * Stoic Philosophy:
 * - "First, stillness" - grounding before reflection
 * - Seneca: The mind must be prepared before examination
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { EveningFlowParamList, EveningBreathingData } from '@/features/practices/types/flows';
import BreathingCircle from '../../shared/components/BreathingCircle';
import Timer from '../../shared/components/Timer';
import { AccessibleButton } from '@/core/components/accessibility/AccessibleButton';
import { spacing, typography, colorSystem } from '@/core/theme';

type Props = StackScreenProps<EveningFlowParamList, 'Breathing'> & {
  onSave?: (data: EveningBreathingData) => void;
};

const BREATHING_DURATION_MS = 60000; // 60 seconds

const BreathingScreen: React.FC<Props> = ({ navigation, onSave }) => {
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const buttonOpacity = useRef(new Animated.Value(0)).current;

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
    const breathingData: EveningBreathingData = {
      completed: true,
      durationSeconds: 60,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(breathingData);
    }

    navigation.navigate('Gratitude');
  };

  return (
    <View style={styles.container} testID="evening-breathing-screen">
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressDots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.progressText}>1/6</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Let's settle into evening</Text>
      </View>

      {/* Breathing Circle - uses shared 60fps component */}
      <View style={styles.breathingContainer}>
        <BreathingCircle
          isActive={isTimerActive}
          pattern={{ inhale: 4000, hold: 4000, exhale: 6000 }}
          showCountdown={false}
          phaseText={{
            inhale: 'Breathe in...',
            hold: 'Hold...',
            exhale: 'Release...',
          }}
          testID="evening-breathing-circle"
        />

        {/* Timer - dim display, evening theme */}
        {!isComplete && (
          <View style={styles.timerWrapper}>
            <Timer
              duration={BREATHING_DURATION_MS}
              isActive={isTimerActive}
              onComplete={handleTimerComplete}
              showProgress={false}
              showControls={false}
              showSkip={false}
              theme="evening"
              testID="evening-breathing-timer"
            />
          </View>
        )}
      </View>

      {/* Continue button - fades in after 60s */}
      <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity }]}>
        {isComplete && (
          <AccessibleButton
            onPress={handleContinue}
            label="Continue"
            variant="primary"
            size="large"
            testID="continue-button"
            accessibilityHint="Continue to gratitude reflection"
          />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.themes.evening.background,
    paddingHorizontal: spacing[20],
    paddingTop: spacing[48],
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[32],
  },
  progressDots: {
    flexDirection: 'row',
    gap: spacing[8],
    marginRight: spacing[12],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colorSystem.gray[500],
  },
  dotActive: {
    backgroundColor: colorSystem.themes.evening.primary,
  },
  progressText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[400],
  },
  header: {
    marginBottom: spacing[32],
    alignItems: 'center',
  },
  title: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.white,
    textAlign: 'center',
  },
  breathingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerWrapper: {
    marginTop: spacing[16],
    opacity: 0.6, // Dim timer - not the focus
  },
  buttonContainer: {
    width: '100%',
    paddingBottom: spacing[48],
  },
});

export default BreathingScreen;
