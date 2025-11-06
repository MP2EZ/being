/**
 * CELEBRATION SCREEN - DRD v2.0.0
 *
 * Celebrate efforts and attempts, not just outcomes.
 * Genuinely uplifting, not forced positivity.
 *
 * Stoic Philosophy:
 * - Focus on what's in your control (effort, attempts, character)
 * - Marcus Aurelius: "The impediment to action advances action" (Meditations 5:20)
 *   - Celebrate trying, even when it's hard
 * - Epictetus: "Don't demand that things happen as you wish, but wish that they
 *   happen as they do happen" (Enchiridion 8) - Gratitude for what you CAN control
 *
 * Design Philosophy:
 * - Acknowledge attempts, learning, showing up
 * - NOT outcome-focused ("I got the promotion")
 * - Process-focused ("I prepared thoroughly, spoke my truth")
 * - Authentic acknowledgment, not toxic positivity
 *
 * @see /docs/product/Being. DRD.md (DRD-FLOW-004: Evening Flow, Screen 3)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { EveningFlowParamList, CelebrationData } from '../../../types/flows';

type Props = StackScreenProps<EveningFlowParamList, 'Celebration'> & {
  onSave?: (data: CelebrationData) => void;
};

const CelebrationScreen: React.FC<Props> = ({ navigation, onSave }) => {
  const [attempts, setAttempts] = useState<string[]>(['', '', '']);
  const [learningCelebration, setLearningCelebration] = useState('');

  // At least one attempt required
  const isValid = attempts.some(attempt => attempt.trim().length > 0);

  const updateAttempt = (index: number, value: string) => {
    const newAttempts = [...attempts];
    newAttempts[index] = value;
    setAttempts(newAttempts);
  };

  const handleContinue = () => {
    if (!isValid) {
      return;
    }

    const celebrationData: CelebrationData = {
      attempts: attempts.filter(a => a.trim().length > 0).map(a => a.trim()),
      learningCelebration: learningCelebration.trim() || undefined,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(celebrationData);
    }

    navigation.navigate('Gratitude');
  };

  return (
    <ScrollView style={styles.container} testID="celebration-screen">
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
        <Text style={styles.title}>Celebrate Your Efforts</Text>
        <Text style={styles.subtitle}>Mindful Acknowledgment</Text>
        <Text style={styles.helperText}>
          Efforts, attempts, and showing up - not just outcomes
        </Text>
      </View>

      {/* Educational Note */}
      <View style={styles.educationCard}>
        <Text style={styles.educationText}>
          Stoic gratitude celebrates what's in your control: your efforts,
          attempts, and character. Not outcomes, which depend on fate.
        </Text>
      </View>

      {/* Attempt Inputs */}
      <View style={styles.attemptsSection}>
        <Text style={styles.sectionLabel}>What did you attempt today?</Text>
        <Text style={styles.sectionHelper}>
          Focus on what you tried, not what you achieved
        </Text>
        {attempts.map((attempt, index) => (
          <View key={index} style={styles.attemptContainer}>
            <Text style={styles.attemptLabel}>{index + 1}. Attempt or effort:</Text>
            <TextInput
              style={styles.textInput}
              value={attempt}
              onChangeText={(value) => updateAttempt(index, value)}
              placeholder="e.g., I spoke up, practiced patience, tried something new..."
              placeholderTextColor="#999"
              testID={`attempt-input-${index}`}
              accessibilityLabel={`Attempt ${index + 1}`}
              multiline
            />
          </View>
        ))}
      </View>

      {/* Learning Celebration (Optional) */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldLabel}>
          Celebrate Learning (Optional)
        </Text>
        <Text style={styles.fieldHelper}>
          What did attempting teach you?
        </Text>
        <TextInput
          style={styles.textInput}
          value={learningCelebration}
          onChangeText={setLearningCelebration}
          placeholder="e.g., I learned I'm braver than I thought, failure is feedback..."
          placeholderTextColor="#999"
          testID="learning-celebration-input"
          accessibilityLabel="Learning celebration"
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
          "The impediment to action advances action. What stands in the way
          becomes the way." — Marcus Aurelius
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4A7C59',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  educationCard: {
    padding: 16,
    backgroundColor: '#F0F5F1',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4A7C59',
    marginBottom: 24,
  },
  educationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  attemptsSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  sectionHelper: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  attemptContainer: {
    marginBottom: 16,
  },
  attemptLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  fieldSection: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  fieldHelper: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  continueButton: {
    backgroundColor: '#4A7C59',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  quoteSection: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4A7C59',
    marginBottom: 40,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    lineHeight: 20,
  },
});

export default CelebrationScreen;
