/**
 * Standalone BreathingScreen - 3-minute breathing exercises with 60fps animations
 * Designed for standalone use with session persistence and therapeutic timing
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, AppState, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
// FIXED: Import from ReanimatedMock to prevent property descriptor conflicts
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  runOnJS,
} from '../../utils/ReanimatedMock';
import { Button, CrisisButton } from '../../components/core';
import { colorSystem, spacing } from '../../constants/colors';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { resumableSessionService } from '../../services/ResumableSessionService';
import { ResumableSession, SessionProgress } from '../../types/ResumableSession';

interface BreathingScreenParams {
  BreathingScreen: {
    theme?: 'morning' | 'midday' | 'evening';
    autoStart?: boolean;
  };
}

type BreathingScreenRouteProp = RouteProp<BreathingScreenParams, 'BreathingScreen'>;

// CRITICAL TIMING CONSTANTS - 60fps and 180s total
const BREATH_CYCLE_DURATION = 8000; // 8 seconds per cycle (4s in, 4s out)
const CYCLES_PER_MINUTE = 7.5; // 60s / 8s = 7.5 cycles
const TOTAL_DURATION = 180000; // 3 minutes in milliseconds
const TOTAL_CYCLES = Math.floor(TOTAL_DURATION / BREATH_CYCLE_DURATION); // 22.5 cycles

interface BreathingState {
  isActive: boolean;
  isPaused: boolean;
  timeRemaining: number; // in seconds
  currentCycle: number;
  phase: 'inhale' | 'exhale';
  sessionId: string | null;
}

export const BreathingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<BreathingScreenRouteProp>();
  const { theme = 'midday', autoStart = false } = route.params || {};

  const themeColors = useThemeColors();
  const { onFlowComplete } = useCommonHaptics();

  // Animation values for 60fps performance
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(0.8);

  // Session state
  const [breathingState, setBreathingState] = useState<BreathingState>({
    isActive: autoStart,
    isPaused: false,
    timeRemaining: 180, // 3 minutes
    currentCycle: 0,
    phase: 'inhale',
    sessionId: null,
  });

  // Intervals for timing management
  const animationInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const phaseInterval = useRef<NodeJS.Timeout | null>(null);

  // App state management for background/foreground handling
  const appState = useRef(AppState.currentState);
  const pausedTime = useRef<number | null>(null);

  // Theme-specific colors
  const themeColor = themeColors?.primary || colorSystem.themes[theme].primary;
  const successColor = themeColors?.success || colorSystem.themes[theme].success;

  // Initialize or resume session on mount
  useEffect(() => {
    initializeSession();

    // App state listener for background handling
    const handleAppStateChange = (nextAppState: string) => {
      if (breathingState.isActive) {
        if (appState.current.match(/active/) && nextAppState === 'background') {
          // App going to background - pause and save
          pausedTime.current = Date.now();
          handlePause();
        } else if (appState.current.match(/background/) && nextAppState === 'active') {
          // App returning to foreground - resume if needed
          if (pausedTime.current) {
            const backgroundDuration = Date.now() - pausedTime.current;
            // If less than 30 seconds in background, offer to resume
            if (backgroundDuration < 30000) {
              Alert.alert(
                'Continue Breathing Exercise?',
                'You were in the middle of a breathing session. Would you like to continue?',
                [
                  { text: 'Start Over', onPress: handleReset },
                  { text: 'Continue', onPress: handleResume, style: 'default' }
                ]
              );
            }
          }
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      clearAllIntervals();
    };
  }, []);

  // Initialize or resume breathing session
  const initializeSession = async () => {
    try {
      // Check for existing breathing session
      const existingSession = await resumableSessionService.getSession('breathing', theme);

      if (existingSession && resumableSessionService.canResumeSession(existingSession)) {
        // Resume existing session
        const progressData = existingSession.progress;
        const remainingTime = Math.max(0, 180 - (progressData.completedSteps.length * 8)); // Estimate based on cycles

        setBreathingState(prev => ({
          ...prev,
          sessionId: existingSession.id,
          timeRemaining: remainingTime,
          currentCycle: progressData.completedSteps.length,
          isActive: false, // Let user choose to resume
        }));

        // Show resume prompt
        Alert.alert(
          'Resume Breathing Session?',
          `You have a breathing session in progress (${Math.floor(remainingTime / 60)}:${(remainingTime % 60).toString().padStart(2, '0')} remaining). Would you like to continue?`,
          [
            { text: 'Start Fresh', onPress: () => createNewSession() },
            { text: 'Resume', onPress: () => resumeSession(existingSession), style: 'default' }
          ]
        );
      } else {
        // Create new session
        await createNewSession();
      }
    } catch (error) {
      console.error('Failed to initialize breathing session:', error);
      await createNewSession();
    }
  };

  // Create new breathing session
  const createNewSession = async () => {
    try {
      const sessionId = `breathing_${theme}_${Date.now()}`;
      const newSession: Partial<ResumableSession> = {
        id: sessionId,
        type: 'breathing',
        subType: theme,
        startedAt: new Date().toISOString(),
        progress: {
          currentStep: 0,
          totalSteps: TOTAL_CYCLES,
          completedSteps: [],
          percentComplete: 0,
          estimatedTimeRemaining: 180,
        },
        data: {
          theme,
          totalDuration: TOTAL_DURATION,
          cycleLength: BREATH_CYCLE_DURATION,
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 0,
          lastScreen: 'breathing-main',
          navigationStack: ['breathing-main'],
        },
      };

      await resumableSessionService.saveSession(newSession);

      setBreathingState(prev => ({
        ...prev,
        sessionId,
        timeRemaining: 180,
        currentCycle: 0,
        isActive: autoStart,
      }));
    } catch (error) {
      console.error('Failed to create breathing session:', error);
    }
  };

  // Resume existing session
  const resumeSession = async (session: ResumableSession) => {
    const progressData = session.progress;
    const remainingTime = Math.max(0, 180 - (progressData.completedSteps.length * 8));

    setBreathingState(prev => ({
      ...prev,
      sessionId: session.id,
      timeRemaining: remainingTime,
      currentCycle: progressData.completedSteps.length,
      isActive: true,
    }));

    startBreathingAnimation();
  };

  // Clear all intervals
  const clearAllIntervals = useCallback(() => {
    if (animationInterval.current) {
      clearInterval(animationInterval.current);
      animationInterval.current = null;
    }
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    if (phaseInterval.current) {
      clearInterval(phaseInterval.current);
      phaseInterval.current = null;
    }
  }, []);

  // Start breathing animation and timing
  const startBreathingAnimation = useCallback(() => {
    clearAllIntervals();

    // Main breathing animation - 60fps smooth scaling
    scaleValue.value = withRepeat(
      withSequence(
        withTiming(1.4, {
          duration: BREATH_CYCLE_DURATION / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: BREATH_CYCLE_DURATION / 2,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );

    // Opacity animation for calming effect
    opacityValue.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: BREATH_CYCLE_DURATION / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.6, {
          duration: BREATH_CYCLE_DURATION / 2,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );

    // Timer for countdown (1 second intervals)
    timerInterval.current = setInterval(() => {
      setBreathingState(prev => {
        const newTime = prev.timeRemaining - 1;
        if (newTime <= 0) {
          runOnJS(handleComplete)();
          return { ...prev, timeRemaining: 0, isActive: false };
        }
        return { ...prev, timeRemaining: newTime };
      });
    }, 1000);

    // Phase tracking for instruction text
    phaseInterval.current = setInterval(() => {
      setBreathingState(prev => ({
        ...prev,
        phase: prev.phase === 'inhale' ? 'exhale' : 'inhale',
        currentCycle: prev.phase === 'exhale' ? prev.currentCycle + 1 : prev.currentCycle,
      }));
    }, BREATH_CYCLE_DURATION / 2);

  }, [scaleValue, opacityValue]);

  // Handle start/resume
  const handleStart = useCallback(() => {
    setBreathingState(prev => ({ ...prev, isActive: true, isPaused: false }));
    startBreathingAnimation();
  }, [startBreathingAnimation]);

  // Handle pause
  const handlePause = useCallback(async () => {
    setBreathingState(prev => ({ ...prev, isActive: false, isPaused: true }));
    clearAllIntervals();

    // Save progress
    if (breathingState.sessionId) {
      try {
        const progressUpdate: Partial<SessionProgress> = {
          currentStep: breathingState.currentCycle,
          completedSteps: Array.from({ length: breathingState.currentCycle }, (_, i) => `cycle_${i + 1}`),
          percentComplete: Math.round(((180 - breathingState.timeRemaining) / 180) * 100),
          estimatedTimeRemaining: breathingState.timeRemaining,
        };

        await resumableSessionService.updateProgress(breathingState.sessionId, progressUpdate);
      } catch (error) {
        console.error('Failed to save breathing progress:', error);
      }
    }
  }, [breathingState, clearAllIntervals]);

  // Handle reset
  const handleReset = useCallback(() => {
    clearAllIntervals();
    setBreathingState(prev => ({
      ...prev,
      isActive: false,
      isPaused: false,
      timeRemaining: 180,
      currentCycle: 0,
      phase: 'inhale',
    }));
    scaleValue.value = 1;
    opacityValue.value = 0.8;
  }, [clearAllIntervals, scaleValue, opacityValue]);

  // Handle completion
  const handleComplete = useCallback(async () => {
    clearAllIntervals();

    // Clean up session
    if (breathingState.sessionId) {
      try {
        await resumableSessionService.deleteSession(breathingState.sessionId);
      } catch (error) {
        console.error('Failed to clean up breathing session:', error);
      }
    }

    setBreathingState(prev => ({
      ...prev,
      isActive: false,
      isPaused: false,
      timeRemaining: 0,
    }));

    await onFlowComplete();

    // Show completion message
    Alert.alert(
      'Breathing Exercise Complete!',
      'Well done! You\'ve completed your 3-minute breathing exercise. Take a moment to notice how you feel.',
      [{ text: 'Continue', onPress: () => navigation.goBack() }]
    );
  }, [clearAllIntervals, breathingState.sessionId, onFlowComplete, navigation]);

  // Handle resume button
  const handleResume = useCallback(() => {
    setBreathingState(prev => ({ ...prev, isActive: true, isPaused: false }));
    startBreathingAnimation();
  }, [startBreathingAnimation]);

  // Animated styles
  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    opacity: opacityValue.value,
  }));

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get instruction text
  const getInstructionText = () => {
    if (!breathingState.isActive) {
      return breathingState.isPaused ? 'Paused' : 'Ready to begin';
    }
    return breathingState.phase === 'inhale' ? 'Breathe In' : 'Breathe Out';
  };

  // Get phase description
  const getPhaseDescription = () => {
    if (!breathingState.isActive) {
      return breathingState.isPaused
        ? 'Your breathing session is paused. Tap Resume to continue.'
        : 'Find a comfortable position and follow the breathing circle for 3 minutes.';
    }
    return 'Follow the circle as it expands and contracts. Breathe slowly and naturally.';
  };

  const circleSize = 200;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorSystem.themes[theme].background }]}>
      {/* Crisis Button */}
      <CrisisButton variant="floating" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Breathing Exercise</Text>
        <Text style={styles.subtitle}>3-Minute Mindful Breathing</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Progress Info */}
        <View style={styles.progressInfo}>
          <Text style={styles.timeText}>{formatTime(breathingState.timeRemaining)}</Text>
          <Text style={styles.cycleText}>
            Cycle {breathingState.currentCycle} of {TOTAL_CYCLES}
          </Text>
        </View>

        {/* Breathing Circle */}
        <View style={styles.circleContainer}>
          <Animated.View
            style={[
              styles.breathingCircle,
              circleAnimatedStyle,
              {
                backgroundColor: breathingState.isActive ? themeColor : colorSystem.gray[300],
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
              }
            ]}
          >
            <Text style={styles.instructionText}>{getInstructionText()}</Text>
          </Animated.View>
        </View>

        {/* Phase Description */}
        <Text style={styles.phaseDescription}>{getPhaseDescription()}</Text>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: themeColor,
                  width: `${((180 - breathingState.timeRemaining) / 180) * 100}%`,
                }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(((180 - breathingState.timeRemaining) / 180) * 100)}% Complete
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!breathingState.isActive && !breathingState.isPaused && (
          <Button theme={theme} onPress={handleStart}>
            Start Breathing Exercise
          </Button>
        )}

        {breathingState.isActive && (
          <Button variant="outline" onPress={handlePause}>
            Pause
          </Button>
        )}

        {breathingState.isPaused && (
          <View style={styles.pausedControls}>
            <Button theme={theme} onPress={handleResume} style={styles.resumeButton}>
              Resume
            </Button>
            <Button variant="outline" onPress={handleReset} style={styles.resetButton}>
              Start Over
            </Button>
          </View>
        )}

        {(breathingState.isActive || breathingState.isPaused) && (
          <Button
            variant="outline"
            onPress={() => navigation.goBack()}
            style={styles.exitButton}
          >
            Exit
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colorSystem.gray[600],
    textAlign: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  progressInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  timeText: {
    fontSize: 48,
    fontWeight: '300',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  cycleText: {
    fontSize: 14,
    color: colorSystem.gray[600],
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
  },
  breathingCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  instructionText: {
    fontSize: 20,
    fontWeight: '600',
    color: colorSystem.base.white,
    textAlign: 'center',
  },
  phaseDescription: {
    fontSize: 16,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  progressBarTrack: {
    width: '80%',
    height: 4,
    backgroundColor: colorSystem.gray[200],
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: colorSystem.gray[600],
  },
  controls: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  pausedControls: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  resumeButton: {
    flex: 1,
  },
  resetButton: {
    flex: 1,
  },
  exitButton: {
    marginTop: spacing.md,
  },
});

export default BreathingScreen;