/**
 * REAPPRAISAL SCREEN
 *
 * Stoic cognitive reframing - transforming obstacles into opportunities.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "The impediment to action advances action. What stands in the
 *   way becomes the way." (Meditations 5:20) - Core reframing principle
 * - Epictetus: "It's not what happens to you, but how you react to it that matters."
 *   (Enchiridion 5) - Cognitive control over interpretation
 * - Seneca: "Difficulties strengthen the mind, as labor does the body." (Letters 13)
 *   - Growth through challenge
 * - Marcus Aurelius: "Choose not to be harmed—and you won't feel harmed. Don't feel
 *   harmed—and you haven't been." (Meditations 4:7) - Power of perspective
 *
 * Purpose: Transform adversity from threat into training ground for character.
 * This is cognitive reappraisal grounded in Stoic philosophy.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MiddayFlowParamList, ReappraisalData } from '../../../types/flows';

type Props = NativeStackScreenProps<MiddayFlowParamList, 'Reappraisal'> & {
  onSave?: (data: ReappraisalData) => void;
};

const ReappraisalScreen: React.FC<Props> = ({ navigation, onSave }) => {
  const [obstacle, setObstacle] = useState('');
  const [virtueOpportunity, setVirtueOpportunity] = useState('');
  const [reframedPerspective, setReframedPerspective] = useState('');
  const [principleApplied, setPrincipleApplied] = useState('');

  const isValid =
    obstacle.trim().length > 0 &&
    virtueOpportunity.trim().length > 0 &&
    reframedPerspective.trim().length > 0;

  const handleContinue = () => {
    if (!isValid) {
      return;
    }

    const reappraisalData: ReappraisalData = {
      obstacle: obstacle.trim(),
      virtueOpportunity: virtueOpportunity.trim(),
      reframedPerspective: reframedPerspective.trim(),
      principleApplied: principleApplied.trim() || undefined,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(reappraisalData);
    }

    navigation.navigate('Affirmation');
  };

  return (
    <ScrollView style={styles.container} testID="reappraisal-screen">
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
        <Text style={styles.title}>Reappraisal</Text>
        <Text style={styles.subtitle}>Reframe Obstacles as Opportunities</Text>
        <Text style={styles.helperText}>
          "The impediment to action advances action. What stands in the way becomes the way."
        </Text>
      </View>

      {/* Obstacle Input */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldLabel}>What obstacle are you facing?</Text>
        <Text style={styles.fieldHelper}>
          Describe the challenge objectively, without judgment
        </Text>
        <TextInput
          style={styles.textInput}
          value={obstacle}
          onChangeText={setObstacle}
          placeholder="e.g., Unexpected project delay, difficult feedback..."
          placeholderTextColor="#999"
          testID="obstacle-input"
          accessibilityLabel="Obstacle description"
          multiline
        />
      </View>

      {/* Virtue Opportunity Input */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldLabel}>What virtue can you practice?</Text>
        <Text style={styles.fieldHelper}>
          Which virtue does this obstacle invite you to develop?
        </Text>
        <TextInput
          style={styles.textInput}
          value={virtueOpportunity}
          onChangeText={setVirtueOpportunity}
          placeholder="e.g., Practice patience and wisdom, develop courage..."
          placeholderTextColor="#999"
          testID="virtue-opportunity-input"
          accessibilityLabel="Virtue opportunity"
          multiline
        />
      </View>

      {/* Reframed Perspective Input */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldLabel}>How can you reframe this?</Text>
        <Text style={styles.fieldHelper}>
          What's a more constructive way to view this situation?
        </Text>
        <TextInput
          style={styles.textInput}
          value={reframedPerspective}
          onChangeText={setReframedPerspective}
          placeholder="e.g., This is training for resilience, a chance to grow..."
          placeholderTextColor="#999"
          testID="reframed-perspective-input"
          accessibilityLabel="Reframed perspective"
          multiline
        />
      </View>

      {/* Principle Applied (Optional) */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldLabel}>Stoic Principle (Optional)</Text>
        <Text style={styles.fieldHelper}>
          Which Stoic principle helps with this reframe?
        </Text>
        <TextInput
          style={styles.textInput}
          value={principleApplied}
          onChangeText={setPrincipleApplied}
          placeholder="e.g., The obstacle is the way, dichotomy of control..."
          placeholderTextColor="#999"
          testID="principle-input"
          accessibilityLabel="Stoic principle applied"
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
          "Choose not to be harmed—and you won't feel harmed. Don't feel harmed—and you
          haven't been." — Marcus Aurelius
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
    color: '#007AFF',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    lineHeight: 20,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  continueButton: {
    backgroundColor: '#007AFF',
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
    borderLeftColor: '#007AFF',
    marginBottom: 40,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    lineHeight: 20,
  },
});

export default ReappraisalScreen;
