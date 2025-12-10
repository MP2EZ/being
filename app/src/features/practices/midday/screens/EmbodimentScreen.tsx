/**
 * EMBODIMENT SCREEN
 *
 * 60-second breathing practice for midday embodiment (evidence-based practice).
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * Clinical Foundation:
 * - This practice is retained from original evidence-based breathing protocol
 * - 60-second breathing space combines mindfulness with Stoic reflection
 * - Bridges cognitive practices with embodied awareness
 *
 * Performance Critical:
 * - BreathingCircle must run at 60fps for therapeutic smoothness
 * - Timer must be precise (exactly 60 seconds)
 * - React Native Reanimated for high-performance animations
 *
 * Classical Stoic Connection:
 * - Marcus Aurelius: "You have power over your mind—not outside events" (Meditations 12:8)
 * - Epictetus: "First, know what you are" (Discourses 1:2) - Self-awareness
 * - Seneca: "The body is not a permanent dwelling, but a sort of inn with a brief sojourn"
 *   (Letters 120:14) - But we must care for it while we inhabit it
 *
 * Purpose: Embodied awareness grounds Stoic philosophy in present-moment experience.
 * The breath connects mind and body, creating foundation for virtue practice.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Slider from '@react-native-community/slider';
import type { StackScreenProps } from '@react-navigation/stack';
import type { MiddayFlowParamList, EmbodimentData } from '@/features/practices/types/flows';
import BreathingCircle from '../../shared/components/BreathingCircle';
import { spacing, borderRadius, typography } from '@/core/theme';

type Props = StackScreenProps<MiddayFlowParamList, 'Embodiment'> & {
  onSave?: (data: EmbodimentData) => void;
};

const BREATHING_DURATION = 60; // EXACTLY 60 seconds

const EmbodimentScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as EmbodimentData | undefined;

  // Debug logging
  if (initialData) {
    console.log('[EmbodimentScreen] Restoring data:', {
      breathingQuality: initialData.breathingQuality,
      hasBodyAwareness: !!initialData.bodyAwareness
    });
  }

  // Timer state always starts fresh (not restored)
  const [breathingActive, setBreathingActive] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState(BREATHING_DURATION);

  // User input state restored from session
  const [breathingQuality, setBreathingQuality] = useState(initialData?.breathingQuality || 5);
  const [bodyAwareness, setBodyAwareness] = useState(initialData?.bodyAwareness || '');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 60-second breathing timer
  useEffect(() => {
    if (breathingActive && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setBreathingActive(false);
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
    return undefined;
  }, [breathingActive, secondsRemaining]);

  const isValid = !breathingActive && bodyAwareness.trim().length > 0;

  const handleContinue = () => {
    if (!isValid) {
      return;
    }

    const embodimentData: EmbodimentData = {
      breathingDuration: 60, // EXACTLY 60 (constant, not variable)
      breathingQuality,
      bodyAwareness: bodyAwareness.trim(),
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(embodimentData);
    }

    navigation.navigate('Reappraisal');
  };

  return (
    <View style={styles.screenContainer}>
      <ScrollView style={styles.container} testID="embodiment-screen">
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        testID="back-button"
        accessibilityLabel="Go back"
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Embodiment</Text>
        <Text style={styles.subtitle}>60-Second Breathing Space</Text>
        {breathingActive && (
          <Text style={styles.helperText}>
            Connect with your breath and body
          </Text>
        )}
      </View>

      {/* Breathing Phase */}
      {breathingActive && (
        <View style={styles.breathingPhase}>
          {/* Timer Display */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{secondsRemaining}s</Text>
            <Text style={styles.timerLabel}>remaining</Text>
          </View>

          {/* BreathingCircle Component */}
          <BreathingCircle
            isActive={breathingActive}
            testID="breathing-circle"
          />

          {/* Breathing Instructions */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              Follow the circle's rhythm
            </Text>
            <Text style={styles.subInstructionText}>
              Let your breath find its natural flow
            </Text>
          </View>
        </View>
      )}

      {/* Reflection Phase - After Breathing Completes */}
      {!breathingActive && (
        <View style={styles.reflectionPhase}>
          {/* Completion Message */}
          <View style={styles.completionMessage}>
            <Text style={styles.completionTitle}>Well done</Text>
            <Text style={styles.completionSubtitle}>
              Take a moment to notice what you experienced
            </Text>
          </View>

          {/* Breathing Quality Rating */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>Breathing Quality</Text>
            <Text style={styles.fieldHelper}>
              How would you rate this breathing practice? (1 = difficult, 10 = effortless)
            </Text>
            <View style={styles.sliderContainer}>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>Difficult</Text>
                <Text style={styles.sliderLabelText}>Effortless</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={breathingQuality}
                onValueChange={setBreathingQuality}
                minimumTrackTintColor="#40B5AD"
                maximumTrackTintColor="#ddd"
                thumbTintColor="#40B5AD"
                testID="quality-slider"
                accessibilityLabel={`Breathing quality: ${breathingQuality} out of 10`}
                accessibilityValue={{ min: 1, max: 10, now: breathingQuality }}
              />
              <Text style={styles.qualityDisplay}>Quality: {breathingQuality}/10</Text>
            </View>
          </View>

          {/* Body Awareness Input */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>Body Awareness</Text>
            <Text style={styles.fieldHelper}>
              What do you notice in your body right now?
            </Text>
            <TextInput
              style={styles.textInput}
              value={bodyAwareness}
              onChangeText={setBodyAwareness}
              placeholder="e.g., Relaxed shoulders, calm breath, tension released..."
              placeholderTextColor="#999"
              testID="body-awareness-input"
              accessibilityLabel="Body awareness description"
              multiline
            />
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!isValid}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isValid }}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>

          {/* Stoic Quote */}
          <View style={styles.quoteSection}>
            <Text style={styles.quoteText}>
              "You have power over your mind—not outside events. Realize this, and you will find strength." — Marcus Aurelius
            </Text>
          </View>
        </View>
      )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: spacing[20],
  },
  backButton: {
    marginBottom: spacing[20],
  },
  backButtonText: {
    fontSize: typography.bodyRegular.size,
    color: '#007AFF',
  },
  header: {
    marginBottom: spacing[24],
    alignItems: 'center',
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: '#666',
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  helperText: {
    fontSize: typography.bodySmall.size,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  breathingPhase: {
    alignItems: 'center',
    paddingVertical: spacing[20],
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: spacing[32],
  },
  timerText: {
    fontSize: 48,
    fontWeight: typography.fontWeight.bold,
    color: '#40B5AD',
  },
  timerLabel: {
    fontSize: typography.bodySmall.size,
    color: '#666',
    marginTop: spacing[4],
  },
  instructionContainer: {
    alignItems: 'center',
    marginTop: spacing[32],
    paddingHorizontal: spacing[20],
  },
  instructionText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: '#333',
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  subInstructionText: {
    fontSize: typography.bodySmall.size,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  reflectionPhase: {
    paddingVertical: spacing[12],
  },
  completionMessage: {
    alignItems: 'center',
    marginBottom: spacing[32],
    paddingVertical: spacing[20],
    paddingHorizontal: spacing[20],
    backgroundColor: '#f0f8ff',
    borderRadius: borderRadius.large,
  },
  completionTitle: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.bold,
    color: '#40B5AD',
    marginBottom: spacing[8],
  },
  completionSubtitle: {
    fontSize: typography.bodyRegular.size,
    color: '#666',
    textAlign: 'center',
  },
  fieldSection: {
    marginBottom: spacing[24],
  },
  fieldLabel: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[8],
    color: '#333',
  },
  fieldHelper: {
    fontSize: typography.bodySmall.size,
    color: '#666',
    marginBottom: spacing[12],
  },
  sliderContainer: {
    paddingVertical: spacing[8],
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[8],
  },
  sliderLabelText: {
    fontSize: typography.micro.size,
    color: '#666',
    fontStyle: 'italic',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  qualityDisplay: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#40B5AD',
    textAlign: 'center',
    marginTop: spacing[8],
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: borderRadius.medium,
    padding: spacing[12],
    fontSize: typography.bodyRegular.size,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  continueButton: {
    backgroundColor: '#40B5AD',
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    marginTop: spacing[12],
    marginBottom: spacing[24],
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
  },
  quoteSection: {
    padding: spacing[16],
    backgroundColor: '#f9f9f9',
    borderRadius: borderRadius.medium,
    borderLeftWidth: spacing[4],
    borderLeftColor: '#40B5AD',
    marginBottom: 40,
  },
  quoteText: {
    fontSize: typography.bodySmall.size,
    fontStyle: 'italic',
    color: '#666',
    lineHeight: spacing[20],
  },
});

export default EmbodimentScreen;
