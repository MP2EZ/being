/**
 * VIRTUE CHALLENGES SCREEN - Stoic Mindfulness
 *
 * Capture moments where user struggled to practice virtue. Part of Seneca's
 * balanced examination: acknowledge struggles AND self-compassion.
 *
 * Classical Stoic Practice:
 * - Seneca: "I shall examine the whole of my day" (On Anger 3.36)
 * - Marcus Aurelius: Meditations 9.42 - "When you wake up in the morning..."
 * - Epictetus: Discourses 4.12 - On self-examination without harsh judgment
 *
 * CRITICAL NON-NEGOTIABLE (Philosopher Validation Requirement):
 * - Self-compassion field is REQUIRED (prevents harsh Stoicism)
 * - Growth-oriented language (not shame/guilt)
 * - Learning lens, not performance critique
 * - Optional screen (user agency preserved)
 *
 * Philosophy:
 * - Balanced examination: Track successes AND struggles
 * - NOT harsh self-judgment: Compassionate learning
 * - Growth mindset: "I'm learning" not "I failed"
 * - Self-compassion REQUIRED (philosopher non-negotiable 9.5/10)
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 * @see FEAT-51: Virtue Tracking Dashboard
 * @see Philosopher Agent: Self-compassion requirement for 9.5+ rating
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
import type { StackScreenProps } from '@react-navigation/stack';
import type { EveningFlowParamList } from '../../../types/flows';
import { useStoicPracticeStore } from '../../../stores/stoicPracticeStore';
import type { CardinalVirtue } from '../../../types/stoic';

type Props = StackScreenProps<EveningFlowParamList, 'VirtueChallenges'>;

const VirtueChallengesScreen: React.FC<Props> = ({ navigation }) => {
  const { addVirtueChallenge } = useStoicPracticeStore();

  // Form state
  const [situation, setSituation] = useState('');
  const [virtueViolated, setVirtueViolated] = useState<CardinalVirtue | null>(null);
  const [whatICouldHaveDone, setWhatICouldHaveDone] = useState('');
  const [triggerIdentified, setTriggerIdentified] = useState('');
  const [whatWillIPractice, setWhatWillIPractice] = useState('');
  const [selfCompassion, setSelfCompassion] = useState('');

  // Validation
  const canSubmit =
    situation.trim().length > 0 &&
    virtueViolated !== null &&
    whatICouldHaveDone.trim().length > 0 &&
    whatWillIPractice.trim().length > 0 &&
    selfCompassion.trim().length > 0; // REQUIRED - NON-NEGOTIABLE

  const handleSave = async () => {
    if (!canSubmit) {
      if (selfCompassion.trim().length === 0) {
        Alert.alert(
          'Self-Compassion Required',
          'Self-compassion is essential to Stoic practice. Please take a moment to offer yourself kindness and understanding.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Incomplete Information',
        'Please complete all required fields.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await addVirtueChallenge({
        situation: situation.trim(),
        virtueViolated: virtueViolated!,
        whatICouldHaveDone: whatICouldHaveDone.trim(),
        triggerIdentified: triggerIdentified.trim() || null,
        whatWillIPractice: whatWillIPractice.trim(),
        selfCompassion: selfCompassion.trim(),
      });

      // Reset form
      setSituation('');
      setVirtueViolated(null);
      setWhatICouldHaveDone('');
      setTriggerIdentified('');
      setWhatWillIPractice('');
      setSelfCompassion('');

      // Navigate to next screen
      navigation.navigate('Celebration');
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to save virtue challenge. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSkip = () => {
    navigation.navigate('Celebration');
  };

  const renderVirtueButton = (virtue: CardinalVirtue, label: string, description: string) => {
    const isSelected = virtueViolated === virtue;
    return (
      <TouchableOpacity
        key={virtue}
        style={[styles.virtueButton, isSelected && styles.virtueButtonSelected]}
        onPress={() => setVirtueViolated(virtue)}
        testID={`virtue-button-${virtue}`}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`Could have practiced ${label}: ${description}`}
      >
        <Text style={[styles.virtueLabel, isSelected && styles.virtueLabelSelected]}>
          {label}
        </Text>
        <Text style={[styles.virtueDescription, isSelected && styles.virtueDescriptionSelected]}>
          Could have {description.toLowerCase()}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} testID="virtue-challenges-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Learning from Experience</Text>
        <Text style={styles.subtitle}>Where Could You Have Responded More Virtuously?</Text>
        <Text style={styles.helperText}>
          Not harsh judgment - compassionate learning from experience
        </Text>
      </View>

      {/* Situation Description (Required) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Describe what happened *</Text>
        <Text style={styles.sectionHelper}>
          What situation challenged you today? (250 characters max)
        </Text>
        <TextInput
          style={styles.textInput}
          value={situation}
          onChangeText={(text) => setSituation(text.slice(0, 250))}
          placeholder="e.g., Lost patience with colleague who interrupted me repeatedly"
          placeholderTextColor="#999"
          multiline
          maxLength={250}
          testID="situation-input"
          accessibilityLabel="Describe the situation"
        />
        <Text style={styles.characterCount}>{situation.length}/250</Text>
      </View>

      {/* Virtue Identification (Required) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Which virtue could you have practiced? *</Text>
        <Text style={styles.sectionHelper}>
          Reflect with kindness, not harsh judgment
        </Text>

        {renderVirtueButton('wisdom', 'Wisdom', 'Used better judgment')}
        {renderVirtueButton('courage', 'Courage', 'Acted despite fear')}
        {renderVirtueButton('justice', 'Justice', 'Been more fair')}
        {renderVirtueButton('temperance', 'Temperance', 'Shown more self-control')}
      </View>

      {/* Alternative Response (Required) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>What could you have done differently? *</Text>
        <Text style={styles.sectionHelper}>
          Imagine a virtuous response (250 characters max)
        </Text>
        <TextInput
          style={styles.textInput}
          value={whatICouldHaveDone}
          onChangeText={(text) => setWhatICouldHaveDone(text.slice(0, 250))}
          placeholder="e.g., Paused, took three breaths, calmly named what I needed: 'I'd like to finish my thought before we move on'"
          placeholderTextColor="#999"
          multiline
          maxLength={250}
          testID="alternative-input"
          accessibilityLabel="What you could have done differently"
        />
        <Text style={styles.characterCount}>{whatICouldHaveDone.length}/250</Text>
      </View>

      {/* Trigger Identification (Optional) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>What triggered this response? (Optional)</Text>
        <Text style={styles.sectionHelper}>
          Understanding triggers helps with future practice
        </Text>
        <TextInput
          style={styles.textInput}
          value={triggerIdentified}
          onChangeText={(text) => setTriggerIdentified(text.slice(0, 250))}
          placeholder="e.g., Felt disrespected and unheard, was tired and hungry"
          placeholderTextColor="#999"
          multiline
          maxLength={250}
          testID="trigger-input"
          accessibilityLabel="What triggered your response"
        />
        <Text style={styles.characterCount}>{triggerIdentified.length}/250</Text>
      </View>

      {/* Future Practice (Required) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>What will you practice going forward? *</Text>
        <Text style={styles.sectionHelper}>
          Concrete commitment to future practice (250 characters max)
        </Text>
        <TextInput
          style={styles.textInput}
          value={whatWillIPractice}
          onChangeText={(text) => setWhatWillIPractice(text.slice(0, 250))}
          placeholder="e.g., Notice when I'm tired and need space before engaging in difficult conversations"
          placeholderTextColor="#999"
          multiline
          maxLength={250}
          testID="practice-input"
          accessibilityLabel="What you will practice"
        />
        <Text style={styles.characterCount}>{whatWillIPractice.length}/250</Text>
      </View>

      {/* Self-Compassion (REQUIRED - NON-NEGOTIABLE) */}
      <View style={styles.section}>
        <View style={styles.selfCompassionHeader}>
          <Text style={styles.sectionLabel}>Offer yourself compassion *</Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredText}>REQUIRED</Text>
          </View>
        </View>
        <Text style={styles.sectionHelper}>
          This is a lifelong practice. You're human. Be kind to yourself.
        </Text>
        <View style={styles.compassionPrompt}>
          <Text style={styles.compassionPromptText}>
            Self-compassion is essential to Stoic practice. Without kindness toward yourself,
            practice becomes harsh self-judgment rather than genuine character development.
          </Text>
        </View>
        <TextInput
          style={[styles.textInput, styles.compassionInput]}
          value={selfCompassion}
          onChangeText={(text) => setSelfCompassion(text.slice(0, 250))}
          placeholder="e.g., I'm learning. This is hard. I'm human and practicing virtue is a lifelong journey. I'm doing my best."
          placeholderTextColor="#999"
          multiline
          maxLength={250}
          testID="compassion-input"
          accessibilityLabel="Offer yourself compassion"
        />
        <Text style={styles.characterCount}>{selfCompassion.length}/250</Text>
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
          accessibilityLabel="Save virtue challenge"
        >
          <Text style={styles.saveButtonText}>Save & Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          testID="skip-button"
          accessibilityRole="button"
          accessibilityLabel="Skip virtue challenge reflection"
        >
          <Text style={styles.skipButtonText}>Skip for Now</Text>
        </TouchableOpacity>
      </View>

      {/* Stoic Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "When you wake up in the morning, tell yourself: The people I deal with today will be meddling,
          ungrateful, arrogant, dishonest, jealous, and surly... But I have seen the beauty of good,
          and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own."
          — Marcus Aurelius, Meditations 2:1
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
  selfCompassionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requiredBadge: {
    marginLeft: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  compassionPrompt: {
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  compassionPromptText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
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
  compassionInput: {
    borderColor: '#F59E0B',
    borderWidth: 2,
    backgroundColor: '#FFFBEB',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
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

export default VirtueChallengesScreen;
