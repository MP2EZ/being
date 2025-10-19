/**
 * INTENTION SCREEN
 *
 * Stoic morning intention with virtue practice and dichotomy of control.
 * Philosopher-validated (9.5/10) - integrates cardinal virtues + control distinction.
 *
 * Classical Stoic Framework:
 * - Marcus Aurelius: "At dawn, when you have trouble getting out of bed, tell yourself:
 *   'I have to go to work—as a human being.'" (Meditations 5:1)
 * - Epictetus: "Some things are in our control and others not." (Enchiridion 1)
 *
 * Core Components:
 * 1. Cardinal Virtue Selection (wisdom, courage, justice, temperance)
 * 2. Practice Domain (work, relationships, adversity)
 * 3. Intention Statement (specific, actionable)
 * 4. Dichotomy of Control (what I control vs. what I don't)
 * 5. Optional Reserve Clause (Stoic "fate permitting")
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
import type { MorningFlowParamList, IntentionData } from '../../../types/flows';
import type { CardinalVirtue, PracticeDomain } from '../../../types/stoic';

type Props = NativeStackScreenProps<MorningFlowParamList, 'Intention'> & {
  onSave?: (data: IntentionData) => void;
};

const VIRTUES: Array<{ key: CardinalVirtue; label: string; description: string }> = [
  {
    key: 'wisdom',
    label: 'Wisdom',
    description: 'Practical wisdom, good judgment',
  },
  {
    key: 'courage',
    label: 'Courage',
    description: 'Fortitude, facing fear',
  },
  {
    key: 'justice',
    label: 'Justice',
    description: 'Fairness, treating others well',
  },
  {
    key: 'temperance',
    label: 'Temperance',
    description: 'Self-control, moderation',
  },
];

const DOMAINS: Array<{ key: PracticeDomain; label: string; description: string }> = [
  {
    key: 'work',
    label: 'Work',
    description: 'Professional life',
  },
  {
    key: 'relationships',
    label: 'Relationships',
    description: 'Personal connections',
  },
  {
    key: 'adversity',
    label: 'Adversity',
    description: 'Challenges, setbacks',
  },
];

const IntentionScreen: React.FC<Props> = ({ navigation, onSave }) => {
  const [selectedVirtue, setSelectedVirtue] = useState<CardinalVirtue | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<PracticeDomain | null>(null);
  const [intentionStatement, setIntentionStatement] = useState('');
  const [whatIControl, setWhatIControl] = useState('');
  const [whatIDontControl, setWhatIDontControl] = useState('');
  const [reserveClause, setReserveClause] = useState('');

  // Validation: All required fields filled
  const isValid =
    selectedVirtue !== null &&
    selectedDomain !== null &&
    intentionStatement.trim().length > 0 &&
    whatIControl.trim().length > 0 &&
    whatIDontControl.trim().length > 0;

  const handleContinue = () => {
    if (!isValid) {
      return;
    }

    const intentionData: IntentionData = {
      virtue: selectedVirtue!,
      context: selectedDomain!,
      intentionStatement: intentionStatement.trim(),
      whatIControl: whatIControl.trim(),
      whatIDontControl: whatIDontControl.trim(),
      reserveClause: reserveClause.trim() || undefined,
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
        <Text style={styles.title}>Morning Intention</Text>
        <Text style={styles.subtitle}>
          Set your virtue practice for today
        </Text>
      </View>

      {/* Virtue Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Which virtue will you practice?</Text>
        <View style={styles.optionsGrid}>
          {VIRTUES.map((virtue) => (
            <TouchableOpacity
              key={virtue.key}
              style={[
                styles.optionCard,
                selectedVirtue === virtue.key && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedVirtue(virtue.key)}
              testID={`virtue-${virtue.key}`}
              accessibilityLabel={`Select ${virtue.label} as your virtue`}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.optionLabel,
                  selectedVirtue === virtue.key && styles.optionLabelSelected,
                ]}
              >
                {virtue.label}
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  selectedVirtue === virtue.key && styles.optionDescriptionSelected,
                ]}
              >
                {virtue.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Domain Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Where will you apply it?</Text>
        <View style={styles.optionsGrid}>
          {DOMAINS.map((domain) => (
            <TouchableOpacity
              key={domain.key}
              style={[
                styles.optionCard,
                selectedDomain === domain.key && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedDomain(domain.key)}
              testID={`domain-${domain.key}`}
              accessibilityLabel={`Select ${domain.label} as your practice domain`}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.optionLabel,
                  selectedDomain === domain.key && styles.optionLabelSelected,
                ]}
              >
                {domain.label}
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  selectedDomain === domain.key && styles.optionDescriptionSelected,
                ]}
              >
                {domain.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Intention Statement */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What is your intention?</Text>
        <Text style={styles.helperText}>
          Be specific: What will you actually do?
        </Text>
        <TextInput
          style={styles.input}
          value={intentionStatement}
          onChangeText={setIntentionStatement}
          placeholder="e.g., Pause before reacting to criticism"
          placeholderTextColor="#999"
          testID="intention-statement"
          accessibilityLabel="Enter your intention statement"
          multiline
        />
      </View>

      {/* Dichotomy of Control */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dichotomy of Control</Text>
        <Text style={styles.helperText}>
          What is within your control today?
        </Text>

        {/* What I Control */}
        <View style={styles.dichotomyField}>
          <Text style={styles.fieldLabel}>What I control:</Text>
          <TextInput
            style={styles.input}
            value={whatIControl}
            onChangeText={setWhatIControl}
            placeholder="e.g., My response, my tone, my words"
            placeholderTextColor="#999"
            testID="what-i-control"
            accessibilityLabel="What is within your control"
            multiline
          />
        </View>

        {/* What I Don't Control */}
        <View style={styles.dichotomyField}>
          <Text style={styles.fieldLabel}>What I don't control:</Text>
          <TextInput
            style={styles.input}
            value={whatIDontControl}
            onChangeText={setWhatIDontControl}
            placeholder="e.g., Others' reactions, outcomes, circumstances"
            placeholderTextColor="#999"
            testID="what-i-dont-control"
            accessibilityLabel="What is outside your control"
            multiline
          />
        </View>
      </View>

      {/* Reserve Clause (Optional) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reserve Clause (Optional)</Text>
        <Text style={styles.helperText}>
          Stoic "fate permitting" - acknowledging uncertainty
        </Text>
        <TextInput
          style={styles.input}
          value={reserveClause}
          onChangeText={setReserveClause}
          placeholder="e.g., ...if circumstances allow, ...fate permitting"
          placeholderTextColor="#999"
          testID="reserve-clause"
          accessibilityLabel="Optional reserve clause"
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
            ? 'All required fields filled. Ready to continue'
            : 'Fill all required fields to continue'
        }
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
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
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  optionLabelSelected: {
    color: '#007AFF',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  optionDescriptionSelected: {
    color: '#0056B3',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 60,
    backgroundColor: '#fff',
  },
  dichotomyField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default IntentionScreen;
