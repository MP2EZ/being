/**
 * VIRTUE INSTANCES SCREEN - Stoic Mindfulness
 *
 * Capture moments where user successfully practiced one of the four cardinal virtues.
 * Part of Seneca's balanced examination: acknowledge WHERE you showed up well.
 *
 * Classical Stoic Practice:
 * - Seneca: "I shall examine the whole of my day" (On Anger 3.36)
 * - Marcus Aurelius: Meditations 5.9 - Reflect on your actions with virtue
 * - Epictetus: Enchiridion 51 - Daily self-examination
 *
 * Four Cardinal Virtues (ONLY):
 * - Wisdom (sophia/phronesis): Sound judgment, practical wisdom
 * - Courage (andreia): Acting rightly despite fear, moral fortitude
 * - Justice (dikaiosyne): Fairness, contributing to common good
 * - Temperance (sophrosyne): Self-control, moderation, emotional regulation
 *
 * Philosophy:
 * - Balanced examination: Track successes AND struggles
 * - NOT performative virtue signaling: Genuine self-reflection
 * - Growth-oriented: Celebrate progress, not perfection
 * - Optional: User agency preserved (prohairesis)
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 * @see FEAT-51: Virtue Tracking Dashboard
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { EveningFlowParamList } from '../../../types/flows';
import { useStoicPracticeStore } from '../../../stores/stoicPracticeStore';
import type { CardinalVirtue, PracticeDomain, StoicPrinciple } from '../../../types/stoic';

type Props = NativeStackScreenProps<EveningFlowParamList, 'VirtueInstances'>;

const VirtueInstancesScreen: React.FC<Props> = ({ navigation }) => {
  const { addVirtueInstance } = useStoicPracticeStore();

  // Form state
  const [selectedVirtue, setSelectedVirtue] = useState<CardinalVirtue | null>(null);
  const [context, setContext] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<PracticeDomain | null>(null);
  const [selectedPrinciple, setSelectedPrinciple] = useState<string | null>(null);

  // Validation
  const canSubmit = selectedVirtue && context.trim().length > 0 && selectedDomain;

  const handleSave = async () => {
    if (!canSubmit) {
      Alert.alert(
        'Incomplete Information',
        'Please select a virtue, describe the context, and choose a domain.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await addVirtueInstance({
        virtue: selectedVirtue!,
        context: context.trim(),
        domain: selectedDomain!,
        principleApplied: selectedPrinciple,
      });

      // Reset form
      setSelectedVirtue(null);
      setContext('');
      setSelectedDomain(null);
      setSelectedPrinciple(null);

      // Navigate to next screen
      navigation.navigate('VirtueChallenges');
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to save virtue instance. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSkip = () => {
    navigation.navigate('VirtueChallenges');
  };

  const renderVirtueButton = (virtue: CardinalVirtue, label: string, description: string) => {
    const isSelected = selectedVirtue === virtue;
    return (
      <TouchableOpacity
        key={virtue}
        style={[styles.virtueButton, isSelected && styles.virtueButtonSelected]}
        onPress={() => setSelectedVirtue(virtue)}
        testID={`virtue-button-${virtue}`}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${label}: ${description}`}
      >
        <Text style={[styles.virtueLabel, isSelected && styles.virtueLabelSelected]}>
          {label}
        </Text>
        <Text style={[styles.virtueDescription, isSelected && styles.virtueDescriptionSelected]}>
          {description}
        </Text>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  const renderDomainButton = (domain: PracticeDomain, label: string, description: string) => {
    const isSelected = selectedDomain === domain;
    return (
      <TouchableOpacity
        key={domain}
        style={[styles.domainButton, isSelected && styles.domainButtonSelected]}
        onPress={() => setSelectedDomain(domain)}
        testID={`domain-button-${domain}`}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${label}: ${description}`}
      >
        <Text style={[styles.domainLabel, isSelected && styles.domainLabelSelected]}>
          {label}
        </Text>
        <Text style={[styles.domainDescription, isSelected && styles.domainDescriptionSelected]}>
          {description}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPrincipleButton = (principleId: string, label: string) => {
    const isSelected = selectedPrinciple === principleId;
    return (
      <TouchableOpacity
        key={principleId}
        style={[styles.principleButton, isSelected && styles.principleButtonSelected]}
        onPress={() => setSelectedPrinciple(isSelected ? null : principleId)}
        testID={`principle-button-${principleId}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={label}
      >
        <Text style={[styles.principleLabel, isSelected && styles.principleLabelSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} testID="virtue-instances-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Virtue in Action</Text>
        <Text style={styles.subtitle}>Where Did You Show Up Well?</Text>
        <Text style={styles.helperText}>
          Recognize moments of wisdom, courage, justice, or temperance
        </Text>
      </View>

      {/* Virtue Selection (Required) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Which virtue did you practice? *</Text>
        <Text style={styles.sectionHelper}>
          The four cardinal virtues of Stoic philosophy
        </Text>

        {renderVirtueButton('wisdom', 'Wisdom', 'Sound judgment, understanding what matters')}
        {renderVirtueButton('courage', 'Courage', 'Acting rightly despite fear')}
        {renderVirtueButton('justice', 'Justice', 'Fairness, contributing to common good')}
        {renderVirtueButton('temperance', 'Temperance', 'Self-control, moderation')}
      </View>

      {/* Context Description (Required) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Describe the situation *</Text>
        <Text style={styles.sectionHelper}>
          How did you practice this virtue? (250 characters max)
        </Text>
        <TextInput
          style={styles.textInput}
          value={context}
          onChangeText={(text) => setContext(text.slice(0, 250))}
          placeholder="e.g., Paused before reacting to criticism, asked clarifying questions with genuine curiosity"
          placeholderTextColor="#999"
          multiline
          maxLength={250}
          testID="context-input"
          accessibilityLabel="Describe how you practiced virtue"
        />
        <Text style={styles.characterCount}>{context.length}/250</Text>
      </View>

      {/* Domain Selection (Required) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Where did this happen? *</Text>
        <Text style={styles.sectionHelper}>
          Which area of life?
        </Text>

        {renderDomainButton('work', 'Work', 'Professional context, productivity, collaboration')}
        {renderDomainButton('relationships', 'Relationships', 'Family, friends, personal connections')}
        {renderDomainButton('adversity', 'Adversity', 'Challenges, setbacks, difficult circumstances')}
      </View>

      {/* Principle Connection (Optional) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Which Stoic principle helped? (Optional)</Text>
        <Text style={styles.sectionHelper}>
          Did a specific principle guide your response?
        </Text>

        {renderPrincipleButton('aware_presence', 'Aware Presence')}
        {renderPrincipleButton('radical_acceptance', 'Radical Acceptance')}
        {renderPrincipleButton('sphere_sovereignty', 'Sphere Sovereignty')}
        {renderPrincipleButton('virtuous_response', 'Virtuous Response')}
        {renderPrincipleButton('interconnected_living', 'Interconnected Living')}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.saveButton, !canSubmit && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSubmit}
          testID="save-button"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          accessibilityLabel="Save virtue instance"
        >
          <Text style={styles.saveButtonText}>Save & Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          testID="skip-button"
          accessibilityRole="button"
          accessibilityLabel="Skip virtue tracking"
        >
          <Text style={styles.skipButtonText}>Skip for Now</Text>
        </TouchableOpacity>
      </View>

      {/* Stoic Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "I shall examine the whole of my day and shall measure my deeds and words."
          — Seneca, On Anger 3.36
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
    fontSize: 18,
    color: '#666',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  section: {
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
    marginBottom: 12,
  },
  virtueButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  virtueButtonSelected: {
    borderColor: '#4A7C59',
    backgroundColor: '#F0F5F1',
  },
  virtueLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  virtueLabelSelected: {
    color: '#4A7C59',
  },
  virtueDescription: {
    fontSize: 14,
    color: '#666',
  },
  virtueDescriptionSelected: {
    color: '#4A7C59',
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
    fontSize: 24,
    color: '#4A7C59',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  domainButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  domainButtonSelected: {
    borderColor: '#4A7C59',
    backgroundColor: '#F0F5F1',
  },
  domainLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: '#333',
  },
  domainLabelSelected: {
    color: '#4A7C59',
  },
  domainDescription: {
    fontSize: 13,
    color: '#666',
  },
  domainDescriptionSelected: {
    color: '#4A7C59',
  },
  principleButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  principleButtonSelected: {
    borderColor: '#4A7C59',
    backgroundColor: '#F0F5F1',
  },
  principleLabel: {
    fontSize: 15,
    color: '#333',
  },
  principleLabelSelected: {
    color: '#4A7C59',
    fontWeight: '500',
  },
  actionContainer: {
    marginTop: 12,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#4A7C59',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
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

export default VirtueInstancesScreen;
