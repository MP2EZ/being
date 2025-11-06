/**
 * SLEEP TRANSITION SCREEN - DRD v2.0.0
 *
 * Mindful breathing for peaceful sleep transition.
 * Progressive relaxation + release day's tensions.
 *
 * Stoic Philosophy:
 * - Seneca: "Receive sleep as you would receive death" (Letters 54:1)
 *   - Release control of the day
 *   - Trust in tomorrow's renewal
 * - Marcus Aurelius: Evening reflection prepares the mind for rest
 * - Epictetus: "Don't let the sun set on your anger" (implicit in evening practice)
 *
 * Design Philosophy:
 * - Sleep-compatible (calming, no blue light spikes)
 * - Brief practice (2-3 minutes max)
 * - Progressive relaxation guidance
 * - Peaceful completion
 * - Release day's tensions
 *
 * @see /docs/product/Being. DRD.md (DRD-FLOW-004: Evening Flow, Screen 8)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { EveningFlowParamList, SleepTransitionData } from '../../../types/flows';
import BreathingCircle from '../../shared/components/BreathingCircle';

type Props = StackScreenProps<EveningFlowParamList, 'SleepTransition'> & {
  onSave?: (data: SleepTransitionData) => void;
};

const SleepTransitionScreen: React.FC<Props> = ({ navigation, onSave }) => {
  const [breathingCompleted, setBreathingCompleted] = useState(false);
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingStarted, setBreathingStarted] = useState(false);

  const handleComplete = () => {
    const sleepTransitionData: SleepTransitionData = {
      breathingCompleted,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(sleepTransitionData);
    }

    navigation.navigate('EveningCompletion');
  };

  return (
    <ScrollView
      style={styles.container}
      testID="sleep-transition-screen"
      contentContainerStyle={styles.contentContainer}
    >
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
        <Text style={styles.title}>Transition to Rest</Text>
        <Text style={styles.subtitle}>Complete Your Evening Practice</Text>
        <Text style={styles.helperText}>
          Release the day, prepare for peaceful rest
        </Text>
      </View>

      {/* Sphere Sovereignty Framing */}
      <View style={styles.sovereigntySection}>
        <Text style={styles.sovereigntyTitle}>Sphere Sovereignty: Sleep</Text>
        <Text style={styles.sovereigntyText}>
          You cannot control when sleep comes, but you can create the conditions for rest.
        </Text>
        <Text style={styles.sovereigntyText}>
          This 4-7-8 breathing pattern signals your nervous system that it's safe to release the day.
        </Text>
      </View>

      {/* 4-7-8 Breathing Practice */}
      <View style={styles.breathingSection}>
        <Text style={styles.breathingTitle}>4-7-8 Breathing for Sleep</Text>

        {!breathingStarted ? (
          <>
            <Text style={styles.breathingInstructions}>
              • Inhale through your nose for 4 seconds{'\n'}
              • Hold your breath for 7 seconds{'\n'}
              • Exhale slowly through your mouth for 8 seconds{'\n'}
              {'\n'}
              Repeat 3-4 cycles to prepare for sleep.
            </Text>
            <TouchableOpacity
              style={styles.startBreathingButton}
              onPress={() => {
                setBreathingStarted(true);
                setBreathingActive(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Start 4-7-8 breathing practice"
            >
              <Text style={styles.startBreathingText}>Begin Practice</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <BreathingCircle
              isActive={breathingActive}
              pattern={{ inhale: 4000, hold: 7000, exhale: 8000 }}
              showCountdown={true}
              phaseText={{
                inhale: 'Inhale (nose)',
                hold: 'Hold gently',
                exhale: 'Exhale (mouth)',
              }}
              testID="sleep-breathing-circle"
            />
            {!breathingCompleted && (
              <TouchableOpacity
                style={styles.stopBreathingButton}
                onPress={() => {
                  setBreathingActive(false);
                  setBreathingCompleted(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Complete breathing practice"
              >
                <Text style={styles.stopBreathingText}>Complete Practice</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Progressive Relaxation (shown after breathing) */}
      {breathingCompleted && (
        <View style={styles.relaxationSection}>
          <Text style={styles.relaxationTitle}>Release and Rest</Text>
          <Text style={styles.relaxationText}>
            Notice your body settling...
            {'\n\n'}
            Release any remaining tension...
            {'\n\n'}
            You've done what you could today. That's enough.
          </Text>
        </View>
      )}

      {/* Completion Message */}
      <View style={styles.completionMessage}>
        <Text style={styles.completionText}>
          Rest well. Tomorrow is a new practice.
        </Text>
      </View>

      {/* Complete Button */}
      <TouchableOpacity
        style={styles.completeButton}
        onPress={handleComplete}
        accessibilityRole="button"
        accessibilityLabel="Complete evening practice"
      >
        <Text style={styles.completeButtonText}>Complete Evening Practice</Text>
      </TouchableOpacity>

      {/* Stoic Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "Receive sleep as you would receive death—with serenity, trusting in
          tomorrow's renewal." — Seneca, Letters 54:1
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A', // Dark, sleep-compatible
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#7A9C85', // Muted green, not bright
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#E8E8E8', // Soft white, not harsh
  },
  subtitle: {
    fontSize: 16,
    color: '#B8B8B8',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  guidanceSection: {
    padding: 20,
    backgroundColor: '#252525',
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#5A7C65', // Muted evening green
  },
  guidanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#B8C8B8',
  },
  guidanceText: {
    fontSize: 15,
    color: '#A8A8A8',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  relaxationSection: {
    padding: 20,
    backgroundColor: '#252525',
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#5A7C65',
  },
  relaxationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#B8C8B8',
  },
  relaxationText: {
    fontSize: 15,
    color: '#A8A8A8',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  sovereigntySection: {
    padding: 20,
    backgroundColor: '#2A3A2D',
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#7A9C85',
  },
  sovereigntyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#C8D8C8',
  },
  sovereigntyText: {
    fontSize: 15,
    color: '#B8B8B8',
    lineHeight: 24,
    marginBottom: 12,
  },
  breathingSection: {
    padding: 20,
    backgroundColor: '#252525',
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#5A7C65',
  },
  breathingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#B8C8B8',
    textAlign: 'center',
  },
  breathingInstructions: {
    fontSize: 15,
    color: '#A8A8A8',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'left',
    width: '100%',
  },
  startBreathingButton: {
    backgroundColor: '#5A7C65',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 12,
  },
  startBreathingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E8F0E8',
  },
  stopBreathingButton: {
    backgroundColor: '#2D5016',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 20,
  },
  stopBreathingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E8F0E8',
  },
  completionMessage: {
    padding: 20,
    backgroundColor: '#2A3A2D',
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  completionText: {
    fontSize: 17,
    color: '#C8D8C8',
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  completeButton: {
    backgroundColor: '#2D5016', // Evening success green from DRD
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  completeButtonText: {
    color: '#E8F0E8',
    fontSize: 18,
    fontWeight: '600',
  },
  quoteSection: {
    padding: 16,
    backgroundColor: '#252525',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#5A7C65',
    marginBottom: 20,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#A8A8A8',
    lineHeight: 20,
  },
});

export default SleepTransitionScreen;
