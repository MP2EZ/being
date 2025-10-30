/**
 * INTENTION SCREEN - DRD v2.0.0
 *
 * Morning intention with mindful awareness and optional Stoic wisdom.
 * MINDFULNESS-FIRST: "How do you want to show up today?"
 *
 * Classical Stoic Framework:
 * - Marcus Aurelius: "At dawn, when you have trouble getting out of bed, tell yourself:
 *   'I have to go to work—as a human being.'" (Meditations 5:1)
 * - Epictetus: "Some things are in our control and others not." (Enchiridion 1)
 *
 * Philosophy:
 * - Virtues are integrated, not modular (philosopher-validated critique)
 * - You don't "pick courage for work" - you show up fully, integrating ALL virtues
 * - Mindfulness question first: "How will I show up?"
 * - Optional virtue awareness: recognize where virtue is alive in your intention
 * - Dichotomy of control: grounding in what you can influence
 *
 * @see /docs/product/Being. DRD.md (DRD-FLOW-002: Morning Flow, Screen 2)
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
import type { MorningFlowParamList, IntentionData } from '../../../types/flows';

type Props = NativeStackScreenProps<MorningFlowParamList, 'Intention'> & {
  onSave?: (data: IntentionData) => void;
};

const IntentionScreen: React.FC<Props> = ({ navigation, onSave }) => {
  const [intentionStatement, setIntentionStatement] = useState('');
  const [whatIControl, setWhatIControl] = useState('');
  const [virtueAwareness, setVirtueAwareness] = useState('');
  const [showEducation, setShowEducation] = useState(false);

  // Validation: Core fields only (mindfulness-first)
  const isValid =
    intentionStatement.trim().length > 0 &&
    whatIControl.trim().length > 0;

  const handleContinue = () => {
    if (!isValid) {
      return;
    }

    const intentionData: IntentionData = {
      intentionStatement: intentionStatement.trim(),
      whatIControl: whatIControl.trim(),
      virtueAwareness: virtueAwareness.trim() || undefined,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(intentionData);
    }

    navigation.navigate('Preparation');
  };

  return (
    <ScrollView style={styles.container} testID="intention-screen">
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
        <Text style={styles.title}>Daily Intention</Text>
        <Text style={styles.subtitle}>How Will You Show Up Today?</Text>
        <Text style={styles.helperText}>
          Notice your current state, then set your intention
        </Text>
      </View>

      {/* Educational Note (Collapsible) */}
      <TouchableOpacity
        style={styles.educationToggle}
        onPress={() => setShowEducation(!showEducation)}
        testID="education-toggle"
        accessibilityLabel={showEducation ? "Hide educational note" : "Show educational note"}
        accessibilityRole="button"
      >
        <Text style={styles.educationToggleText}>
          {showEducation ? '▼' : '▶'} Stoic wisdom on intentions
        </Text>
      </TouchableOpacity>

      {showEducation && (
        <View style={styles.educationCard}>
          <Text style={styles.educationText}>
            Stoic intentions focus on HOW you show up, not outcomes. Marcus Aurelius
            reminds us: "I have to go to work—as a human being." The virtues (wisdom,
            courage, justice, temperance) aren't separate modules to pick from - they're
            integrated aspects of showing up well in any situation.
          </Text>
        </View>
      )}

      {/* Intention Statement */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldLabel}>Today I will...</Text>
        <Text style={styles.fieldHelper}>
          How do you want to show up? (Not outcome-focused)
        </Text>
        <TextInput
          style={styles.textInput}
          value={intentionStatement}
          onChangeText={setIntentionStatement}
          placeholder="e.g., Practice patience, listen deeply, stay present..."
          placeholderTextColor="#999"
          testID="intention-input"
          accessibilityLabel="Daily intention statement"
          multiline
        />
      </View>

      {/* Dichotomy of Control */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldLabel}>What's in your control?</Text>
        <Text style={styles.fieldHelper}>
          Ground yourself in what you can actually influence today
        </Text>
        <TextInput
          style={styles.textInput}
          value={whatIControl}
          onChangeText={setWhatIControl}
          placeholder="e.g., My effort, my response, my attitude, my preparation..."
          placeholderTextColor="#999"
          testID="control-input"
          accessibilityLabel="What you control today"
          multiline
        />
      </View>

      {/* Optional Virtue Awareness */}
      <View style={styles.virtueAwarenessSection}>
        <Text style={styles.virtueAwarenessLabel}>
          Optional: Virtue Awareness
        </Text>
        <Text style={styles.virtueAwarenessHelper}>
          Where do you notice virtue alive in your intention?
        </Text>
        <Text style={styles.virtueHint}>
          (Wisdom, Courage, Justice, Temperance - integrated, not separate)
        </Text>
        <TextInput
          style={styles.textInput}
          value={virtueAwareness}
          onChangeText={setVirtueAwareness}
          placeholder="e.g., Patience involves temperance and wisdom together..."
          placeholderTextColor="#999"
          testID="virtue-awareness-input"
          accessibilityLabel="Virtue awareness reflection"
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
        accessibilityHint={
          isValid
            ? 'Intention and control fields filled. Ready to continue'
            : 'Fill intention and control fields to continue'
        }
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>

      {/* Stoic Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "At dawn, when you have trouble getting out of bed, tell yourself:
          'I have to go to work—as a human being.'" — Marcus Aurelius
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
    color: '#FF9F43',
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
  educationToggle: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  educationToggleText: {
    fontSize: 14,
    color: '#FF9F43',
    fontWeight: '500',
  },
  educationCard: {
    padding: 16,
    backgroundColor: '#FFF8F0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9F43',
    marginBottom: 24,
  },
  educationText: {
    fontSize: 14,
    color: '#666',
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
  virtueAwarenessSection: {
    marginTop: 8,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  virtueAwarenessLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666',
  },
  virtueAwarenessHelper: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  virtueHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  continueButton: {
    backgroundColor: '#FF9F43',
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
    borderLeftColor: '#FF9F43',
    marginBottom: 40,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    lineHeight: 20,
  },
});

export default IntentionScreen;
