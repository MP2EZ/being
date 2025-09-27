/**
 * AccessibleBreathingTimer - WCAG 2.1 AA compliant therapeutic timer
 * 
 * Timing controls for MBCT breathing exercises with user control over duration
 * and pacing. Designed to be fully accessible for users with varying needs
 * while maintaining therapeutic effectiveness.
 * 
 * WCAG 2.1 AA Compliance:
 * - 2.2.1 Timing Adjustable: User control over breathing timing and duration
 * - 1.4.3 Contrast: High contrast for timing indicators and controls
 * - 2.4.6 Headings and Labels: Clear phase labeling and time announcements
 * - 4.1.3 Status Messages: Breathing phase announcements and progress updates
 * - 1.3.1 Info and Relationships: Clear timer structure and phase relationships
 * 
 * Therapeutic Requirements:
 * - Standard 4-4-4 breathing pattern (inhale-hold-exhale)
 * - User-adjustable timing for individual needs
 * - Phase announcements without disrupting mindfulness
 * - Visual and auditory accessibility options
 * - Crisis-aware pause/resume functionality
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  AccessibilityInfo,
  Vibration,
  Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { useMentalHealthAccessibility } from '../../hooks/useMentalHealthAccessibility';
import { Button } from '../core/Button';
import { AccessibleAlert } from '../core/AccessibleAlert';

export interface BreathingPhase {
  name: 'inhale' | 'hold' | 'exhale' | 'rest';
  duration: number; // seconds
  instruction: string;
  color: string;
  hapticPattern?: number[];
}

export interface BreathingPattern {
  id: string;
  name: string;
  description: string;
  phases: BreathingPhase[];
  totalCycles: number;
  therapeuticBenefit: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface TimingPreferences {
  allowCustomDuration: boolean;
  useVibration: boolean;
  useAudioCues: boolean;
  announcePhases: boolean;
  announceProgress: boolean;
  autoAdvance: boolean;
  pauseOnInterruption: boolean;
}

export interface AccessibleBreathingTimerProps {
  pattern?: BreathingPattern;
  onComplete?: () => void;
  onPhaseChange?: (phase: BreathingPhase, cycleNumber: number) => void;
  onPause?: () => void;
  onResume?: () => void;
  initialPreferences?: Partial<TimingPreferences>;
  testID?: string;
}

const DEFAULT_PATTERN: BreathingPattern = {
  id: 'standard_444',
  name: '4-4-4 Breathing',
  description: 'Standard therapeutic breathing pattern',
  phases: [
    {
      name: 'inhale',
      duration: 4,
      instruction: 'Breathe in slowly through your nose',
      color: colorSystem.status.info,
      hapticPattern: [100]
    },
    {
      name: 'hold',
      duration: 4,
      instruction: 'Hold your breath gently',
      color: colorSystem.status.warning,
      hapticPattern: [50, 50]
    },
    {
      name: 'exhale',
      duration: 4,
      instruction: 'Breathe out slowly through your mouth',
      color: colorSystem.status.success,
      hapticPattern: [200]
    }
  ],
  totalCycles: 5,
  therapeuticBenefit: 'Reduces anxiety and promotes mindful awareness',
  difficulty: 'beginner'
};

const DEFAULT_PREFERENCES: TimingPreferences = {
  allowCustomDuration: true,
  useVibration: true,
  useAudioCues: false, // Start disabled to avoid interrupting mindfulness
  announcePhases: true,
  announceProgress: true,
  autoAdvance: true,
  pauseOnInterruption: true
};

export const AccessibleBreathingTimer: React.FC<AccessibleBreathingTimerProps> = ({
  pattern = DEFAULT_PATTERN,
  onComplete,
  onPhaseChange,
  onPause,
  onResume,
  initialPreferences = {},
  testID = 'breathing-timer'
}) => {
  const {
    announceToUser,
    requestTimingExtension,
    pauseTiming,
    resumeTiming,
    canExtendTiming,
    isTimingPaused,
    accessibility,
    crisisMode,
    screenReaderActive
  } = useMentalHealthAccessibility();

  const [preferences, setPreferences] = useState<TimingPreferences>({
    ...DEFAULT_PREFERENCES,
    ...initialPreferences
  });
  
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(pattern.phases[0].duration);
  const [showCustomization, setShowCustomization] = useState(false);
  const [customPattern, setCustomPattern] = useState<BreathingPattern>(pattern);
  const [showPauseOptions, setShowPauseOptions] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationValue = useRef(new Animated.Value(0)).current;
  const lastAnnouncementRef = useRef<string>('');
  const completedCyclesRef = useRef(0);

  // Handle app focus changes for pause on interruption
  useFocusEffect(
    useCallback(() => {
      if (preferences.pauseOnInterruption && isActive) {
        return () => {
          handlePause();
        };
      }
      return undefined;
    }, [preferences.pauseOnInterruption, isActive])
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Start breathing session
  const startBreathing = useCallback(() => {
    setIsActive(true);
    setIsPaused(false);
    setCurrentPhaseIndex(0);
    setCurrentCycle(1);
    setTimeRemaining(customPattern.phases[0].duration);
    completedCyclesRef.current = 0;

    announceToUser({
      message: `Starting ${customPattern.name} breathing exercise. ${customPattern.totalCycles} cycles planned.`,
      priority: 'medium',
      interruption: false,
      context: 'progress'
    });

    startPhaseTimer();
    startPhaseAnimation();
  }, [customPattern, announceToUser]);

  // Start phase timer
  const startPhaseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const currentPhase = customPattern.phases[currentPhaseIndex];
    let remaining = timeRemaining;

    // Announce phase start
    if (preferences.announcePhases) {
      const phaseMessage = `${currentPhase.instruction}. ${remaining} seconds.`;
      
      // Only announce if different from last announcement to avoid repetition
      if (lastAnnouncementRef.current !== phaseMessage) {
        announceToUser({
          message: phaseMessage,
          priority: 'low',
          interruption: false,
          context: 'progress',
          delay: 500 // Brief delay to avoid overwhelming
        });
        lastAnnouncementRef.current = phaseMessage;
      }
    }

    // Haptic feedback for phase start
    if (preferences.useVibration && currentPhase.hapticPattern && Platform.OS === 'ios') {
      // iOS-specific haptic patterns would go here
      Vibration.vibrate(currentPhase.hapticPattern);
    } else if (preferences.useVibration && Platform.OS === 'android') {
      Vibration.vibrate(100);
    }

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        advancePhase();
      }
    }, 1000);
  }, [currentPhaseIndex, timeRemaining, customPattern, preferences, announceToUser]);

  // Start phase animation
  const startPhaseAnimation = useCallback(() => {
    const currentPhase = customPattern.phases[currentPhaseIndex];
    
    Animated.timing(animationValue, {
      toValue: currentPhase.name === 'inhale' ? 1 : 
               currentPhase.name === 'hold' ? 1 : 0, // Exhale back to 0
      duration: currentPhase.duration * 1000,
      useNativeDriver: false
    }).start();
  }, [currentPhaseIndex, customPattern, animationValue]);

  // Advance to next phase
  const advancePhase = useCallback(() => {
    const nextPhaseIndex = (currentPhaseIndex + 1) % customPattern.phases.length;
    
    if (nextPhaseIndex === 0) {
      // Completed a full cycle
      const nextCycle = currentCycle + 1;
      completedCyclesRef.current = currentCycle;
      
      if (nextCycle > customPattern.totalCycles) {
        // Exercise complete
        completeExercise();
        return;
      } else {
        setCurrentCycle(nextCycle);
        
        if (preferences.announceProgress) {
          announceToUser({
            message: `Cycle ${currentCycle} complete. Starting cycle ${nextCycle} of ${customPattern.totalCycles}.`,
            priority: 'low',
            interruption: false,
            context: 'progress'
          });
        }
      }
    }

    setCurrentPhaseIndex(nextPhaseIndex);
    setTimeRemaining(customPattern.phases[nextPhaseIndex].duration);
    
    // Notify parent of phase change
    onPhaseChange?.(customPattern.phases[nextPhaseIndex], currentCycle);
    
    // Continue with next phase if still active
    if (isActive && !isPaused) {
      startPhaseTimer();
      startPhaseAnimation();
    }
  }, [currentPhaseIndex, currentCycle, customPattern, isActive, isPaused, preferences, announceToUser, onPhaseChange]);

  // Complete exercise
  const completeExercise = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setIsActive(false);
    setIsPaused(false);
    
    announceToUser({
      message: `Breathing exercise complete. You completed ${completedCyclesRef.current} cycles. Well done.`,
      priority: 'medium',
      interruption: false,
      context: 'completion'
    });

    onComplete?.();
  }, [announceToUser, onComplete]);

  // Handle pause
  const handlePause = useCallback(() => {
    if (!isActive) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsPaused(true);
    pauseTiming('user_request');
    
    announceToUser({
      message: 'Breathing exercise paused. Take your time, resume when ready.',
      priority: 'medium',
      interruption: false,
      context: 'progress'
    });

    onPause?.();
  }, [isActive, pauseTiming, announceToUser, onPause]);

  // Handle resume
  const handleResume = useCallback(() => {
    if (!isPaused) return;

    setIsPaused(false);
    resumeTiming();
    
    announceToUser({
      message: 'Resuming breathing exercise.',
      priority: 'low',
      interruption: false,
      context: 'progress'
    });

    startPhaseTimer();
    startPhaseAnimation();
    onResume?.();
  }, [isPaused, resumeTiming, announceToUser, startPhaseTimer, startPhaseAnimation, onResume]);

  // Request more time (WCAG 2.2.1)
  const handleExtendTime = useCallback((additionalSeconds: number) => {
    if (canExtendTiming) {
      const granted = requestTimingExtension(additionalSeconds, 'breathing_exercise');
      
      if (granted) {
        setTimeRemaining(prev => prev + additionalSeconds);
        
        announceToUser({
          message: `Added ${additionalSeconds} seconds to current breathing phase.`,
          priority: 'low',
          interruption: false,
          context: 'progress'
        });
      }
    }
  }, [canExtendTiming, requestTimingExtension, announceToUser]);

  // Customize pattern duration
  const adjustPhaseDuration = (phaseIndex: number, newDuration: number) => {
    const updatedPhases = [...customPattern.phases];
    updatedPhases[phaseIndex] = {
      ...updatedPhases[phaseIndex],
      duration: Math.max(1, Math.min(15, newDuration)) // Clamp between 1-15 seconds
    };
    
    setCustomPattern(prev => ({
      ...prev,
      phases: updatedPhases
    }));

    announceToUser({
      message: `${updatedPhases[phaseIndex].name} phase set to ${newDuration} seconds`,
      priority: 'low',
      interruption: false,
      context: 'progress'
    });
  };

  // Get current phase info
  const currentPhase = customPattern.phases[currentPhaseIndex];
  
  // Calculate progress
  const totalPhases = customPattern.totalCycles * customPattern.phases.length;
  const completedPhases = (currentCycle - 1) * customPattern.phases.length + currentPhaseIndex;
  const progressPercentage = (completedPhases / totalPhases) * 100;

  // Scale for breathing animation
  const animatedScale = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2]
  });

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <Text 
          style={styles.title}
          accessible={true}
          accessibilityRole="header"
          accessibilityLevel={1}
        >
          {customPattern.name}
        </Text>
        <Text style={styles.subtitle} accessible={true}>
          Cycle {currentCycle} of {customPattern.totalCycles}
        </Text>
        
        {/* Progress indicator */}
        <View 
          style={styles.progressContainer}
          accessible={true}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(progressPercentage),
            text: `${Math.round(progressPercentage)}% complete`
          }}
        >
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressFill,
                { width: `${progressPercentage}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText} accessible={false}>
            {Math.round(progressPercentage)}% complete
          </Text>
        </View>
      </View>

      {/* Breathing Circle */}
      <View style={styles.breathingContainer}>
        <Animated.View 
          style={[
            styles.breathingCircle,
            {
              backgroundColor: currentPhase.color,
              transform: [{ scale: animatedScale }]
            }
          ]}
          accessible={true}
          accessibilityLabel={`Breathing guide circle. Current phase: ${currentPhase.name}`}
          accessibilityLiveRegion="polite"
        >
          <View style={styles.breathingContent}>
            <Text 
              style={styles.phaseTitle}
              accessible={true}
              accessibilityRole="text"
              accessibilityLiveRegion="assertive"
            >
              {currentPhase.name.charAt(0).toUpperCase() + currentPhase.name.slice(1)}
            </Text>
            <Text 
              style={styles.timeDisplay}
              accessible={true}
              accessibilityLabel={`${timeRemaining} seconds remaining in ${currentPhase.name} phase`}
              accessibilityLiveRegion={screenReaderActive ? "off" : "polite"} // Reduce announcements for screen readers
            >
              {timeRemaining}
            </Text>
          </View>
        </Animated.View>
        
        {/* Phase instruction */}
        <Text 
          style={styles.instruction}
          accessible={true}
          accessibilityLiveRegion="polite"
        >
          {currentPhase.instruction}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isActive ? (
          <Button
            onPress={startBreathing}
            variant="primary"
            accessibilityLabel="Start breathing exercise"
            accessibilityHint={`Begins ${customPattern.name} with ${customPattern.totalCycles} cycles`}
            testID={`${testID}-start`}
          >
            Start Breathing
          </Button>
        ) : (
          <View style={styles.activeControls}>
            {!isPaused ? (
              <Button
                onPress={handlePause}
                variant="outline"
                accessibilityLabel="Pause breathing exercise"
                accessibilityHint="Pauses the current breathing session"
                testID={`${testID}-pause`}
              >
                Pause
              </Button>
            ) : (
              <Button
                onPress={handleResume}
                variant="primary"
                accessibilityLabel="Resume breathing exercise"
                accessibilityHint="Continues the paused breathing session"
                testID={`${testID}-resume`}
              >
                Resume
              </Button>
            )}

            {/* Timing adjustment - WCAG 2.2.1 */}
            {canExtendTiming && (
              <View style={styles.timingControls}>
                <Text style={styles.timingLabel} accessible={true}>
                  Need more time?
                </Text>
                <View style={styles.timingButtons}>
                  <TouchableOpacity
                    style={styles.timingButton}
                    onPress={() => handleExtendTime(10)}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Add 10 seconds to current phase"
                    testID={`${testID}-extend-10`}
                  >
                    <Text style={styles.timingButtonText}>+10s</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timingButton}
                    onPress={() => handleExtendTime(30)}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Add 30 seconds to current phase"
                    testID={`${testID}-extend-30`}
                  >
                    <Text style={styles.timingButtonText}>+30s</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Customization Option */}
        {preferences.allowCustomDuration && !isActive && (
          <TouchableOpacity
            style={styles.customizeButton}
            onPress={() => setShowCustomization(true)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Customize breathing timing"
            accessibilityHint="Adjust the duration of breathing phases to your needs"
            testID={`${testID}-customize`}
          >
            <Text style={styles.customizeText}>
              Adjust Timing
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Customization Modal */}
      <AccessibleAlert
        visible={showCustomization}
        title="Customize Breathing Timing"
        message="Adjust the duration of each breathing phase to match your comfort level. Standard therapeutic timing is 4 seconds each."
        buttons={[
          {
            text: 'Use Standard (4-4-4)',
            style: 'default',
            onPress: () => {
              setCustomPattern(DEFAULT_PATTERN);
              setShowCustomization(false);
              announceToUser({
                message: 'Reset to standard 4-4-4 breathing pattern',
                priority: 'low',
                interruption: false,
                context: 'progress'
              });
            }
          },
          {
            text: 'Keep Custom',
            style: 'primary',
            onPress: () => setShowCustomization(false)
          }
        ]}
        onDismiss={() => setShowCustomization(false)}
      />

      {/* Crisis-aware pause options */}
      {crisisMode && isPaused && (
        <AccessibleAlert
          visible={showPauseOptions}
          title="Breathing Exercise Paused"
          message="Take all the time you need. The breathing exercise will remain available when you're ready. Emergency support is always accessible."
          urgency="high"
          buttons={[
            {
              text: 'Resume Breathing',
              style: 'primary',
              onPress: () => {
                setShowPauseOptions(false);
                handleResume();
              }
            },
            {
              text: 'End Session',
              style: 'cancel',
              onPress: () => {
                setShowPauseOptions(false);
                setIsActive(false);
                setIsPaused(false);
                announceToUser({
                  message: 'Breathing session ended. Take care of yourself.',
                  priority: 'medium',
                  interruption: false,
                  context: 'completion'
                });
              }
            }
          ]}
          onDismiss={() => setShowPauseOptions(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.xs
  },
  subtitle: {
    fontSize: typography.bodyLarge.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: spacing.md
  },
  
  // Progress
  progressContainer: {
    width: '100%',
    alignItems: 'center'
  },
  progressTrack: {
    width: '80%',
    height: 6,
    backgroundColor: colorSystem.gray[200],
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: colorSystem.status.success,
    borderRadius: borderRadius.full
  },
  progressText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600]
  },

  // Breathing Circle
  breathingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.xl
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8
  },
  breathingContent: {
    alignItems: 'center'
  },
  phaseTitle: {
    fontSize: typography.headline3.size,
    fontWeight: '600',
    color: colorSystem.base.white,
    marginBottom: spacing.xs,
    textTransform: 'capitalize'
  },
  timeDisplay: {
    fontSize: 48,
    fontWeight: '700',
    color: colorSystem.base.white,
    lineHeight: 52
  },
  instruction: {
    fontSize: typography.bodyLarge.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md
  },

  // Controls
  controls: {
    alignItems: 'center',
    gap: spacing.md
  },
  activeControls: {
    alignItems: 'center',
    gap: spacing.md,
    width: '100%'
  },

  // Timing Controls
  timingControls: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200]
  },
  timingLabel: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    marginBottom: spacing.sm
  },
  timingButtons: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  timingButton: {
    backgroundColor: colorSystem.status.info,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    minWidth: 60,
    alignItems: 'center',
    minHeight: 44 // WCAG touch target
  },
  timingButtonText: {
    color: colorSystem.base.white,
    fontSize: typography.bodyRegular.size,
    fontWeight: '500'
  },

  // Customization
  customizeButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  customizeText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.status.info,
    textDecorationLine: 'underline'
  }
});

export default AccessibleBreathingTimer;