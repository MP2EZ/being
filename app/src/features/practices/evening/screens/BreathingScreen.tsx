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
import EveningProgressBar from '../components/EveningProgressBar';

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

  const handleBack = () => {
    // First screen - exit the flow
    navigation.getParent()?.goBack();
  };

  return (
    <View style={styles.container} testID="evening-breathing-screen">
      {/* Progress bar with back button */}
      <EveningProgressBar
        currentStep={1}
        totalSteps={6}
        onBack={handleBack}
        showBackButton={true}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Let's settle into evening</Text>
        <Text style={styles.subtitle}>Follow the circle as it expands and contracts</Text>
        <Text style={styles.hint}>Let your breath find its natural rhythm</Text>
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
  },
  header: {
    marginBottom: spacing[24],
    alignItems: 'center',
  },
  title: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.themes.evening.primary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  hint: {
    fontSize: typography.bodySmall.size,
    fontStyle: 'italic',
    color: colorSystem.gray[600],
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
