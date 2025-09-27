/**
 * BreathingExerciseVisual Component
 *
 * Animated breathing circle demonstration for MBCT practices.
 * Shows 3-minute breathing exercise with proper timing.
 */

import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated
} from 'react-native';

interface BreathingExerciseVisualProps {
  isActive: boolean;
  accessibilityLabel?: string;
}

const BreathingExerciseVisual: React.FC<BreathingExerciseVisualProps> = memo(({
  isActive,
  accessibilityLabel
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0.7)).current;
  const currentPhase = useRef<'inhale' | 'hold' | 'exhale'>('inhale');

  useEffect(() => {
    if (!isActive) return;

    const createBreathingCycle = () => {
      // Inhale (4 seconds)
      currentPhase.current = 'inhale';
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 4000,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true
        })
      ]).start(() => {
        // Hold (2 seconds)
        currentPhase.current = 'hold';
        setTimeout(() => {
          // Exhale (6 seconds)
          currentPhase.current = 'exhale';
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 6000,
              useNativeDriver: true
            }),
            Animated.timing(fadeAnim, {
              toValue: 0.7,
              duration: 6000,
              useNativeDriver: true
            })
          ]).start(() => {
            // Brief pause before next cycle
            setTimeout(createBreathingCycle, 1000);
          });
        }, 2000);
      });
    };

    createBreathingCycle();

    return () => {
      scaleAnim.stopAnimation();
      fadeAnim.stopAnimation();
    };
  }, [isActive, scaleAnim, fadeAnim]);

  const getInstructionText = () => {
    switch (currentPhase.current) {
      case 'inhale': return 'Breathe In';
      case 'hold': return 'Hold';
      case 'exhale': return 'Breathe Out';
      default: return 'Breathe';
    }
  };

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel || 'Breathing exercise demonstration'}
      accessibilityLiveRegion="polite"
    >
      {/* Breathing Circle */}
      <View style={styles.breathingContainer}>
        <Animated.View
          style={[
            styles.breathingCircle,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim
            }
          ]}
        >
          <View style={styles.innerCircle}>
            <Text style={styles.breathingText}>
              {getInstructionText()}
            </Text>
          </View>
        </Animated.View>

        {/* Outer ring */}
        <View style={styles.outerRing} />
      </View>

      {/* Exercise Info */}
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseTitle}>3-Minute Breathing Space</Text>
        <Text style={styles.exerciseDescription}>
          A core MBCT practice for mindful awareness
        </Text>

        <View style={styles.timingInfo}>
          <View style={styles.timingStep}>
            <Text style={styles.stepNumber}>4s</Text>
            <Text style={styles.stepLabel}>Inhale</Text>
          </View>
          <View style={styles.timingSeparator} />
          <View style={styles.timingStep}>
            <Text style={styles.stepNumber}>2s</Text>
            <Text style={styles.stepLabel}>Hold</Text>
          </View>
          <View style={styles.timingSeparator} />
          <View style={styles.timingStep}>
            <Text style={styles.stepNumber}>6s</Text>
            <Text style={styles.stepLabel}>Exhale</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20
  },
  breathingContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20
  },
  breathingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E6FFFA',
    borderWidth: 2,
    borderColor: '#38B2AC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute'
  },
  innerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  outerRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: '#B2F5EA',
    position: 'absolute'
  },
  breathingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C7A7B',
    textAlign: 'center'
  },
  exerciseInfo: {
    alignItems: 'center',
    maxWidth: 280
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A365D',
    marginBottom: 4
  },
  exerciseDescription: {
    fontSize: 12,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 16
  },
  timingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  timingStep: {
    alignItems: 'center'
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C7A7B',
    marginBottom: 2
  },
  stepLabel: {
    fontSize: 10,
    color: '#4A5568',
    fontWeight: '500'
  },
  timingSeparator: {
    width: 20,
    height: 1,
    backgroundColor: '#CBD5E0'
  }
});

BreathingExerciseVisual.displayName = 'BreathingExerciseVisual';

export { BreathingExerciseVisual };