/**
 * PRINCIPLE FOCUS SCREEN
 *
 * Daily Stoic principle selection for focused practice.
 * Philosopher-validated (9.7/10) - aligns with Architecture v1.1 (LOCKED).
 *
 * FEAT-45: Migrated to 5-principle framework (2025-10-29)
 * Philosopher verdict: "philosophically elegant, not reductive"
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "Begin the morning by saying to thyself, I shall meet with the
 *   busy-body, the ungrateful..." (Meditations 2:1) - Daily preparation through principles
 * - Epictetus: "Keep before your eyes, day by day, death and exile and all things which
 *   seem terrible." (Enchiridion 21) - Regular contemplation
 * - Seneca: "Begin at once to live, and count each separate day as a separate life."
 *   (Letters 101) - Daily renewal through principle focus
 *
 * 5 Stoic Mindfulness Principles (Consolidated Framework):
 * 1. Aware Presence - Present-moment attention (cognitive + metacognitive + somatic)
 * 2. Radical Acceptance - Amor fati, loving one's fate
 * 3. Sphere Sovereignty - Prohairesis, moral agency, dichotomy of control
 * 4. Virtuous Response - Virtue ethics in action (reappraisal + premeditatio + character)
 * 5. Interconnected Living - Relational ethics, oikeiosis, common good
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md (v1.1 LOCKED)
 * @see /docs/product/stoic-mindfulness/principles/ for detailed principle documentation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { MorningFlowParamList, PrincipleFocusData } from '@/types/flows';
import type { StoicPrinciple } from '@/types/stoic';

type Props = StackScreenProps<MorningFlowParamList, 'PrincipleFocus'> & {
  onSave?: (data: PrincipleFocusData) => void;
};

interface PrincipleInfo {
  key: StoicPrinciple;
  title: string;
  description: string;
  integrates: string; // Which legacy principles this consolidates
  source: string;
}

/**
 * 5 Stoic Mindfulness Principles (Philosopher-Validated 9.7/10)
 *
 * FEAT-45: Consolidated from 12 principles to 5 integrative principles.
 * Each principle now integrates multiple legacy practices into a cohesive whole.
 *
 * @see /docs/product/stoic-mindfulness/principles/ for full documentation
 */
const PRINCIPLES: PrincipleInfo[] = [
  {
    key: 'aware_presence',
    title: 'Aware Presence',
    description: 'Be fully here now, observing thoughts as mental events rather than truth, and feeling what\'s happening in your body.',
    integrates: 'Present Perception + Metacognitive Space + Embodied Awareness',
    source: 'Marcus Aurelius, Meditations 2:1',
  },
  {
    key: 'radical_acceptance',
    title: 'Radical Acceptance',
    description: 'This is what\'s happening right now. I may not like it, prefer it, or want it, but it is the reality I face. What do I do from here?',
    integrates: 'Amor Fati (standalone principle)',
    source: 'Marcus Aurelius, Meditations 10:6',
  },
  {
    key: 'sphere_sovereignty',
    title: 'Sphere Sovereignty',
    description: 'Distinguish what you control (your intentions, judgments, character, responses) from what you don\'t (outcomes, others\' choices, externals). Focus energy only within your sphere.',
    integrates: 'Dichotomy of Control + Intention Over Outcome',
    source: 'Epictetus, Enchiridion 1',
  },
  {
    key: 'virtuous_response',
    title: 'Virtuous Response',
    description: 'In every situation, ask "What does wisdom, courage, justice, or temperance require here?" View obstacles as opportunities for practicing virtue.',
    integrates: 'Virtuous Reappraisal + Negative Visualization + Character Cultivation',
    source: 'Marcus Aurelius, Meditations 5:20',
  },
  {
    key: 'interconnected_living',
    title: 'Interconnected Living',
    description: 'Bring full presence to others. Recognize that we\'re all members of one human community. Act for the common good, not just personal benefit.',
    integrates: 'Relational Presence + Interconnected Action + Contemplative Praxis',
    source: 'Marcus Aurelius, Meditations 8:59',
  },
];

const PrincipleFocusScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as PrincipleFocusData | undefined;

  // Debug logging
  if (initialData) {
    console.log('[PrincipleFocusScreen] Restoring data:', {
      principle: initialData.principleKey,
      hasInterpretation: !!initialData.personalInterpretation,
      hasReminder: !!initialData.reminderTime
    });
  }

  const [selectedPrinciple, setSelectedPrinciple] = useState<StoicPrinciple | null>(
    (initialData?.principleKey as StoicPrinciple) || null
  );
  const [personalInterpretation, setPersonalInterpretation] = useState(
    initialData?.personalInterpretation || ''
  );
  const [reminderEnabled, setReminderEnabled] = useState(!!initialData?.reminderTime);
  const [reminderTime, setReminderTime] = useState(initialData?.reminderTime || '12:00');

  const selectedPrincipleInfo = PRINCIPLES.find(p => p.key === selectedPrinciple);

  const handleContinue = () => {
    if (!selectedPrinciple) {
      return;
    }

    const principleFocusData: PrincipleFocusData = {
      principleKey: selectedPrinciple,
      personalInterpretation: personalInterpretation.trim() || undefined,
      reminderTime: reminderEnabled ? reminderTime : undefined,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(principleFocusData);
    }

    navigation.navigate('PhysicalGrounding' as never);
  };

  return (
    <ScrollView style={styles.container} testID="principle-focus-screen">
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
        <Text style={styles.title}>Principle Focus</Text>
        <Text style={styles.subtitle}>
          Choose one principle to guide your day
        </Text>
      </View>

      {/* Principles List (Flat - Option A) */}
      <View style={styles.principlesSection}>
        <Text style={styles.principlesHeader}>Choose a Principle to Focus On Today</Text>
        {PRINCIPLES.map((principle, index) => (
          <TouchableOpacity
            key={principle.key}
            style={[
              styles.principleCard,
              selectedPrinciple === principle.key && styles.principleCardSelected,
            ]}
            onPress={() => setSelectedPrinciple(principle.key)}
            testID={`principle-${principle.key}`}
            accessibilityLabel={`Select ${principle.title}`}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedPrinciple === principle.key }}
          >
            <View style={styles.principleHeader}>
              <Text style={styles.principleNumber}>{index + 1}</Text>
              <Text
                style={[
                  styles.principleTitle,
                  selectedPrinciple === principle.key && styles.principleTitleSelected,
                ]}
              >
                {principle.title}
              </Text>
            </View>
            <Text style={styles.principleDescription}>{principle.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Selected Principle Details */}
      {selectedPrincipleInfo && (
        <View style={styles.selectedSection}>
          <Text style={styles.selectedTitle}>Selected Principle</Text>
          <View style={styles.selectedCard}>
            <Text style={styles.selectedPrincipleTitle}>{selectedPrincipleInfo.title}</Text>
            <Text style={styles.selectedPrincipleDescription}>
              {selectedPrincipleInfo.description}
            </Text>
            <Text style={styles.selectedPrincipleSource}>{selectedPrincipleInfo.source}</Text>

            {/* Personal Interpretation */}
            <View style={styles.interpretationSection}>
              <Text style={styles.interpretationLabel}>Personal Interpretation (Optional)</Text>
              <TextInput
                style={styles.interpretationInput}
                value={personalInterpretation}
                onChangeText={setPersonalInterpretation}
                placeholder="How will you apply this principle today?"
                placeholderTextColor="#999"
                testID="personal-interpretation"
                accessibilityLabel="Personal interpretation of principle"
                multiline
              />
            </View>

            {/* Reminder Toggle */}
            <View style={styles.reminderSection}>
              <View style={styles.reminderRow}>
                <Text style={styles.reminderLabel}>Remind me later today</Text>
                <Switch
                  value={reminderEnabled}
                  onValueChange={setReminderEnabled}
                  testID="reminder-toggle"
                  accessibilityLabel="Toggle reminder"
                />
              </View>
              {reminderEnabled && (
                <TextInput
                  style={styles.timeInput}
                  value={reminderTime}
                  onChangeText={setReminderTime}
                  placeholder="12:00"
                  testID="reminder-time-input"
                  accessibilityLabel="Select reminder time"
                />
              )}
            </View>
          </View>
        </View>
      )}

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, !selectedPrinciple && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={!selectedPrinciple}
        accessibilityRole="button"
        accessibilityState={{ disabled: !selectedPrinciple }}
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
    marginBottom: 20,
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
  principlesSection: {
    marginBottom: 24,
  },
  principlesHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  principleCard: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  principleCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  principleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  principleNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 12,
    width: 28,
  },
  principleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  principleTitleSelected: {
    color: '#007AFF',
  },
  principleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  selectedSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  selectedTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectedCard: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  selectedPrincipleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#007AFF',
  },
  selectedPrincipleDescription: {
    fontSize: 15,
    marginBottom: 8,
    color: '#333',
  },
  selectedPrincipleSource: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 16,
  },
  interpretationSection: {
    marginTop: 16,
  },
  interpretationLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  interpretationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    minHeight: 60,
  },
  reminderSection: {
    marginTop: 16,
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderLabel: {
    fontSize: 14,
    color: '#333',
  },
  timeInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
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

export default PrincipleFocusScreen;
