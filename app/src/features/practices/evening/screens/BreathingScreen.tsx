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
 * - Evening theme with proper contrast
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

const BreathingScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session or returning via back button
  const initialData = (route.params as { initialData?: any } | undefined)?.initialData;
  const wasCompleted = !!initialData?.completed;

  const [isTimerActive, setIsTimerActive] = useState(!wasCompleted);
  const [isComplete, setIsComplete] = useState(wasCompleted);
  // Start at 1 if already completed, otherwise fade in later
  const buttonOpacity = useRef(new Animated.Value(wasCompleted ? 1 : 0)).current;

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
      {/* Header - minimal, breathing circle has instructions */}
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
  breathingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[24], // Balance visual weight
  },
  timerWrapper: {
    marginTop: spacing[24],
    opacity: 0.6, // Dim timer - not the focus
  },
  buttonContainer: {
    width: '100%',
    paddingBottom: spacing[48],
  },
});

export default BreathingScreen;
