/**
 * SLEEP TRANSITION SCREEN - DRD v2.0.0
 *
 * Mindful breathing for peaceful sleep transition.
 * Progressive relaxation + release day's tensions.
 *
 * Stoic Philosophy:
 * - Seneca: "Receive sleep as you would receive death" (Letters 54)
 *   - Release control of the day
 *   - Trust in tomorrow's renewal
 * - Marcus Aurelius: "At dawn, when you have trouble getting out of bed...
 *   remember that you've been made by nature for the purpose of working with others,
 *   whereas even unthinking animals share sleeping" (Meditations 8:12)
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { EveningFlowParamList, SleepTransitionData } from '../../../types/flows';

type Props = NativeStackScreenProps<EveningFlowParamList, 'SleepTransition'> & {
  onSave?: (data: SleepTransitionData) => void;
};

const SleepTransitionScreen: React.FC<Props> = ({ navigation, onSave }) => {
  const [breathingCompleted, setBreathingCompleted] = useState(false);

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

      {/* Breathing Guidance */}
      <View style={styles.guidanceSection}>
        <Text style={styles.guidanceTitle}>Mindful Breathing for Sleep</Text>
        <Text style={styles.guidanceText}>
          Find a comfortable position...
          {'\n\n'}
          Take a slow, deep breath in through your nose... hold gently...
          {'\n'}
          and release slowly through your mouth.
          {'\n\n'}
          With each exhale, release the day's tensions.
          {'\n\n'}
          Continue breathing naturally, letting your body settle into rest.
        </Text>
      </View>

      {/* Progressive Relaxation */}
      <View style={styles.relaxationSection}>
        <Text style={styles.relaxationTitle}>Progressive Relaxation</Text>
        <Text style={styles.relaxationText}>
          Notice your body from head to toe...
          {'\n\n'}
          Release any tension in your face... your shoulders... your hands...
          {'\n\n'}
          Let your breath be gentle and easy.
          {'\n\n'}
          You've done what you could today. That's enough.
        </Text>
      </View>

      {/* Breathing Completion Toggle */}
      <TouchableOpacity
        style={styles.completionToggle}
        onPress={() => setBreathingCompleted(!breathingCompleted)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: breathingCompleted }}
      >
        <View style={[styles.checkbox, breathingCompleted && styles.checkboxChecked]}>
          {breathingCompleted && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.toggleText}>I completed the breathing practice</Text>
      </TouchableOpacity>

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
          "Receive sleep as you would receive death - with trust in tomorrow's
          renewal." — Adapted from Seneca
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
  completionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#5A7C65',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#5A7C65',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleText: {
    fontSize: 16,
    color: '#B8B8B8',
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
