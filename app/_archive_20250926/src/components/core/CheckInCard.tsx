/**
 * CheckInCard Component - Therapeutic check-in interface with mindful pacing
 *
 * Features:
 * - Step-by-step mindful check-in flow
 * - Smooth transitions between check-in steps
 * - Time-of-day adaptive visual theming
 * - Progress indicator with breathing rhythm
 * - Therapeutic timing for reflection
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
// FIXED: Import from ReanimatedMock to prevent property descriptor conflicts
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor as interpolate,
} from '../../utils/ReanimatedMock';
import { Easing } from 'react-native';
const runOnJS = (fn: Function) => fn;
import { Card } from './Card';
import { Button } from './Button';
import { Typography } from './Typography';
import { MoodSelector } from './MoodSelector';
import { EmotionGrid } from '../checkin/EmotionGrid';
import { useTheme } from '../../hooks/useTheme';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius } from '../../constants/colors';
import {
  ValidatedTherapeuticCheckIn,
  ValidatedMoodEntry,
  ClinicalValidationState,
  TherapeuticTimingValidation,
  RequireValidatedData
} from '../../types/clinical-type-safety';
import { MoodScale } from '../../types/therapeutic-components';
import {
  createClinicalValidationState,
  createTherapeuticTimingCertified,
  validateClinicalData,
  validateTherapeuticTiming
} from '../../utils/clinical-type-guards';
import { ISODateString } from '../../types/clinical';

interface CheckInStep {
  id: string;
  title: string;
  subtitle?: string;
  type: 'mood' | 'emotions' | 'reflection' | 'summary';
}

interface CheckInData {
  mood?: { id: string; value: number };
  emotions?: string[];
  reflection?: string;
  timestamp: Date;
}

// Enhanced validated check-in data with clinical type safety
interface ValidatedCheckInData extends RequireValidatedData<CheckInData> {
  mood?: ValidatedMoodEntry;
  emotions?: string[];
  reflection?: string;
  timestamp: ISODateString;
  validationState: ClinicalValidationState;
  timingValidation: TherapeuticTimingValidation;
}

interface CheckInCardProps {
  onComplete: (data: CheckInData) => void;
  onSkip?: () => void;
  theme?: 'morning' | 'midday' | 'evening';
  anxietyAware?: boolean;
  mindfulPacing?: boolean;
  showProgress?: boolean;
  clinicalValidation?: boolean; // Enable clinical type safety
  strictTiming?: boolean; // Enable therapeutic timing validation
}

const CHECK_IN_STEPS: CheckInStep[] = [
  {
    id: 'mood',
    title: 'How are you feeling right now?',
    subtitle: 'Take a moment to notice your overall mood',
    type: 'mood'
  },
  {
    id: 'emotions',
    title: 'What emotions are present?',
    subtitle: 'You can select multiple emotions',
    type: 'emotions'
  },
  {
    id: 'reflection',
    title: 'Any thoughts to note?',
    subtitle: 'Optional reflection space',
    type: 'reflection'
  },
  {
    id: 'summary',
    title: 'Check-in Complete',
    subtitle: 'Thank you for taking time to check in',
    type: 'summary'
  }
];

// Animated progress indicator with breathing effect
const ProgressIndicator: React.FC<{
  currentStep: number;
  totalSteps: number;
  theme: 'morning' | 'midday' | 'evening';
}> = React.memo(({ currentStep, totalSteps, theme }) => {
  const progressValue = useSharedValue(0);
  const breathingValue = useSharedValue(1);
  const themeColors = useThemeColors();

  useEffect(() => {
    const progress = currentStep / totalSteps;

    progressValue.value = withTiming(progress, {
      duration: 600,
      easing: Easing.out(Easing.cubic)
    });

    // Breathing effect for the active indicator
    breathingValue.value = withSequence(
      withTiming(1.1, { duration: 1500 }),
      withTiming(1.0, { duration: 1500 })
    );
  }, [currentStep, totalSteps]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
    transform: [{ scaleY: breathingValue.value }]
  }));

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressBar,
            { backgroundColor: themeColors.primary },
            progressStyle
          ]}
        />
      </View>
      <Typography variant="caption" style={styles.progressText}>
        Step {currentStep} of {totalSteps}
      </Typography>
    </View>
  );
});

export const CheckInCard: React.FC<CheckInCardProps> = ({
  onComplete,
  onSkip,
  theme = 'midday',
  anxietyAware = false,
  mindfulPacing = true,
  showProgress = true,
  clinicalValidation = false,
  strictTiming = false
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [checkInData, setCheckInData] = useState<Partial<CheckInData>>({
    timestamp: new Date()
  });

  const { colorSystem } = useTheme();
  const themeColors = useThemeColors();

  // Clinical validation setup
  const validationState = useMemo(() =>
    clinicalValidation ? createClinicalValidationState('check-in-card-v1.0') : null,
    [clinicalValidation]
  );

  const timingValidator = useMemo(() =>
    strictTiming ? createTherapeuticTimingCertified() : null,
    [strictTiming]
  );

  // Session timing for therapeutic validation
  const [sessionStartTime] = useState<ISODateString>(
    new Date().toISOString() as ISODateString
  );

  // Animation values for smooth transitions
  const slideValue = useSharedValue(0);
  const opacityValue = useSharedValue(1);
  const scaleValue = useSharedValue(1);

  const currentStep = CHECK_IN_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === CHECK_IN_STEPS.length - 1;

  // Mindful transition timing based on theme
  const transitionDuration = useMemo(() => {
    if (!mindfulPacing) return 300;
    return theme === 'evening' ? 600 : theme === 'morning' ? 400 : 500;
  }, [mindfulPacing, theme]);

  // Smooth step transition animation
  const animateStepTransition = useCallback((nextIndex: number) => {
    // Slide out current step
    slideValue.value = withTiming(-50, {
      duration: transitionDuration / 2,
      easing: Easing.in(Easing.cubic)
    });

    opacityValue.value = withTiming(0, {
      duration: transitionDuration / 2,
      easing: Easing.in(Easing.cubic)
    });

    // Change step and slide in new content
    setTimeout(() => {
      setCurrentStepIndex(nextIndex);

      slideValue.value = 50;
      slideValue.value = withTiming(0, {
        duration: transitionDuration / 2,
        easing: Easing.out(Easing.cubic)
      });

      opacityValue.value = withTiming(1, {
        duration: transitionDuration / 2,
        easing: Easing.out(Easing.cubic)
      });
    }, transitionDuration / 2);
  }, [transitionDuration]);

  // Handle mood selection with clinical validation
  const handleMoodSelect = useCallback((moodId: string, moodValue: number) => {
    if (clinicalValidation && validationState) {
      // Validate mood data is within therapeutic range (1-10)
      if (moodValue < 1 || moodValue > 10) {
        console.error('Mood value outside therapeutic range:', moodValue);
        return;
      }

      // Create validated mood entry
      const validatedMood: ValidatedMoodEntry = {
        scale: moodValue as MoodScale,
        timestamp: new Date().toISOString() as ISODateString,
        intensity: moodValue <= 3 ? 'low' : moodValue <= 6 ? 'moderate' : moodValue <= 8 ? 'high' : 'severe',
        context: theme || 'midday',
        validatedAt: new Date().toISOString() as ISODateString,
        clinicallyRelevant: moodValue <= 4 || moodValue >= 8, // Low or high mood scores
      };

      setCheckInData(prev => ({
        ...prev,
        mood: validatedMood as any // Type assertion for backward compatibility
      }));
    } else {
      // Standard mood selection without validation
      setCheckInData(prev => ({
        ...prev,
        mood: { id: moodId, value: moodValue }
      }));
    }
  }, [clinicalValidation, validationState, theme]);

  // Handle emotion selection
  const handleEmotionSelect = useCallback((emotions: string[]) => {
    setCheckInData(prev => ({
      ...prev,
      emotions
    }));
  }, []);

  // Handle next step with clinical validation
  const handleNext = useCallback(async () => {
    if (mindfulPacing) {
      // Brief pause for mindful transition
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (isLastStep) {
      // Validate data before completion if clinical validation is enabled
      if (clinicalValidation && validationState && timingValidator) {
        try {
          const currentTime = new Date().toISOString() as ISODateString;
          const sessionDuration = new Date(currentTime).getTime() - new Date(sessionStartTime).getTime();

          // Create timing validation
          const timingValidation: TherapeuticTimingValidation = {
            sessionStarted: sessionStartTime,
            expectedDuration: timingValidator.validateTotalSession(180000), // 3 minutes expected
            actualDuration: sessionDuration,
            withinTherapeuticWindow: Math.abs(sessionDuration - 180000) <= 60000, // Within 1 minute tolerance
            timingAccuracy: sessionDuration <= 120000 ? 'precise' :
                            sessionDuration <= 240000 ? 'acceptable' : 'concerning'
          };

          // Create validated check-in data
          const validatedData: ValidatedCheckInData = {
            ...checkInData,
            timestamp: currentTime,
            validationState,
            timingValidation,
            __clinicallyValidated: true,
            __therapeuticallyTimed: true,
            __validatedAt: currentTime
          };

          // Validate the complete data structure
          const clinicallyValidatedData = validateClinicalData(validatedData, {} as any);
          const therapeuticallyTimedData = validateTherapeuticTiming(clinicallyValidatedData, timingValidator);

          console.log('Check-in completed with clinical validation:', {
            duration: sessionDuration,
            accuracy: timingValidation.timingAccuracy,
            clinicallyRelevant: checkInData.mood && 'clinicallyRelevant' in checkInData.mood ? checkInData.mood.clinicallyRelevant : false
          });

          // Call completion with validated data (cast for backward compatibility)
          onComplete(therapeuticallyTimedData as CheckInData);
        } catch (error) {
          console.error('Clinical validation failed:', error);
          // Fall back to standard completion
          onComplete(checkInData as CheckInData);
        }
      } else {
        // Standard completion without validation
        onComplete(checkInData as CheckInData);
      }
    } else {
      animateStepTransition(currentStepIndex + 1);
    }
  }, [
    mindfulPacing,
    isLastStep,
    currentStepIndex,
    checkInData,
    onComplete,
    animateStepTransition,
    clinicalValidation,
    validationState,
    timingValidator,
    sessionStartTime
  ]);

  // Handle back step
  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      animateStepTransition(currentStepIndex - 1);
    }
  }, [currentStepIndex, animateStepTransition]);

  // Animated content styles
  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: slideValue.value },
      { scale: scaleValue.value }
    ],
    opacity: opacityValue.value,
  }));

  // Check if current step can proceed
  const canProceed = useMemo(() => {
    switch (currentStep.type) {
      case 'mood':
        return !!checkInData.mood;
      case 'emotions':
        return true; // Emotions are optional
      case 'reflection':
        return true; // Reflection is optional
      case 'summary':
        return true;
      default:
        return false;
    }
  }, [currentStep.type, checkInData]);

  // Render step content
  const renderStepContent = useCallback(() => {
    switch (currentStep.type) {
      case 'mood':
        return (
          <MoodSelector
            selectedMood={checkInData.mood?.id || null}
            onMoodSelect={handleMoodSelect}
            theme={theme}
            anxietyAware={anxietyAware}
            breathingEffect={true}
            mindfulPacing={mindfulPacing}
            size="large"
          />
        );

      case 'emotions':
        return (
          <EmotionGrid
            selected={checkInData.emotions || []}
            onSelectionChange={handleEmotionSelect}
            theme={theme}
            anxietyAware={anxietyAware}
            mindfulPacing={mindfulPacing}
            multiSelect={true}
            columns={3}
          />
        );

      case 'reflection':
        return (
          <View style={styles.reflectionContainer}>
            <Typography
              variant="body"
              style={styles.reflectionPrompt}
              align="center"
              mindfulPacing={mindfulPacing}
            >
              Take a moment to notice any thoughts or patterns.
              This space is optional.
            </Typography>
          </View>
        );

      case 'summary':
        return (
          <View style={styles.summaryContainer}>
            <Typography
              variant="h3"
              align="center"
              color={themeColors.success}
              style={styles.summaryTitle}
            >
              ✓ Check-in Complete
            </Typography>
            <Typography
              variant="body"
              align="center"
              style={styles.summaryText}
              mindfulPacing={mindfulPacing}
            >
              Thank you for taking time to check in with yourself.
              Your awareness is the first step toward wellbeing.
            </Typography>
          </View>
        );

      default:
        return null;
    }
  }, [currentStep.type, checkInData, handleMoodSelect, handleEmotionSelect, theme, anxietyAware, mindfulPacing, themeColors]);

  return (
    <Card
      theme={theme}
      breathingEffect={currentStep.type === 'summary'}
      style={styles.container}
    >
      {showProgress && (
        <ProgressIndicator
          currentStep={currentStepIndex + 1}
          totalSteps={CHECK_IN_STEPS.length}
          theme={theme}
        />
      )}

      <Animated.View style={[styles.content, contentStyle]}>
        <View style={styles.header}>
          <Typography
            variant="h2"
            align="center"
            style={styles.title}
            mindfulPacing={mindfulPacing}
          >
            {currentStep.title}
          </Typography>
          {currentStep.subtitle && (
            <Typography
              variant="body"
              align="center"
              color={colorSystem.gray[600]}
              style={styles.subtitle}
              mindfulPacing={mindfulPacing}
            >
              {currentStep.subtitle}
            </Typography>
          )}
        </View>

        <View style={styles.stepContent}>
          {renderStepContent()}
        </View>

        <View style={styles.actions}>
          {currentStepIndex > 0 && currentStep.type !== 'summary' && (
            <Button
              variant="outline"
              onPress={handleBack}
              style={styles.backButton}
              fullWidth={false}
              haptic={!anxietyAware}
            >
              Back
            </Button>
          )}

          {currentStep.type !== 'summary' ? (
            <Button
              variant="primary"
              onPress={handleNext}
              disabled={!canProceed}
              theme={theme}
              style={styles.nextButton}
              haptic={!anxietyAware}
            >
              {isLastStep ? 'Complete' : 'Next'}
            </Button>
          ) : (
            <Button
              variant="success"
              onPress={handleNext}
              theme={theme}
              style={styles.completeButton}
              haptic={!anxietyAware}
            >
              Continue
            </Button>
          )}

          {onSkip && currentStep.type !== 'summary' && (
            <Button
              variant="outline"
              onPress={onSkip}
              style={styles.skipButton}
              fullWidth={false}
              haptic={false}
            >
              Skip Check-in
            </Button>
          )}
        </View>
      </Animated.View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 400,
    marginVertical: spacing.lg,
  },
  progressContainer: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    lineHeight: 22,
  },
  stepContent: {
    flex: 1,
    marginVertical: spacing.lg,
    minHeight: 200,
  },
  reflectionContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  reflectionPrompt: {
    lineHeight: 24,
    opacity: 0.8,
  },
  summaryContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  summaryTitle: {
    marginBottom: spacing.lg,
  },
  summaryText: {
    lineHeight: 24,
    opacity: 0.9,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  backButton: {
    flex: 0,
    minWidth: 80,
    marginRight: spacing.sm,
  },
  nextButton: {
    flex: 1,
  },
  completeButton: {
    flex: 1,
  },
  skipButton: {
    flex: 0,
    minWidth: 100,
    marginLeft: spacing.sm,
    opacity: 0.7,
  },
});

CheckInCard.displayName = 'CheckInCard';
ProgressIndicator.displayName = 'ProgressIndicator';

export default CheckInCard;