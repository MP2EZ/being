/**
 * AFFIRMATION SCREEN
 *
 * Self-compassion + grounded Stoic affirmation for midday reset completion.
 * DRD v2.0.0 compliant - mindfulness-first with Stoic wisdom.
 *
 * Classical Stoic Self-Compassion (Oikeiôsis):
 * - Marcus Aurelius: "Be tolerant with others and strict with yourself" (Meditations 10:4)
 *   BUT ALSO: "Nowhere can man find a quieter or more untroubled retreat than in
 *   his own soul." (Meditations 4:3) - Self-care as foundation
 * - Epictetus: "First learn the meaning of what you say, and then speak" (Discourses 3:23)
 *   - Self-understanding before self-judgment
 * - Seneca: "Be kind to yourself... you have within you something better than the
 *   obstacles" (Letters 16:3) - Recognition of inner capacity
 *
 * Design Philosophy:
 * - NOT toxic positivity ("everything is awesome!")
 * - NOT generic cheerleading ("you can do anything!")
 * - Grounded affirmation of ACTUAL capacity within your control
 * - "I can choose my response" = TRUE (dichotomy of control)
 * - "I have what I need" = Stoic sufficiency (autarkeia)
 *
 * @see /docs/product/Being. DRD.md (DRD-FLOW-003: Midday Flow, Screen 4)
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
import type { MiddayFlowParamList, AffirmationData } from '@/features/practices/types/flows';

type Props = StackScreenProps<MiddayFlowParamList, 'Affirmation'> & {
  onSave?: (data: AffirmationData) => void;
};

const AFFIRMATIONS = [
  {
    id: 'response',
    text: 'I can choose my response',
    description: 'Your reactions are in your control'
  },
  {
    id: 'enough',
    text: 'I have what I need right now',
    description: 'Stoic sufficiency in the present'
  },
  {
    id: 'capable',
    text: 'I am capable of facing this',
    description: 'Recognition of inner strength'
  },
  {
    id: 'learning',
    text: 'I am learning and growing',
    description: 'Progress over perfection'
  },
  {
    id: 'worthy',
    text: 'I am worthy of my own compassion',
    description: 'Oikeiôsis - self-care as foundation'
  },
];

const AffirmationScreen: React.FC<Props> = ({ navigation, onSave }) => {
  const [selectedAffirmation, setSelectedAffirmation] = useState<string | null>(null);
  const [expandedAffirmation, setExpandedAffirmation] = useState<string | null>(null);
  const [selfCompassionNote, setSelfCompassionNote] = useState('');
  const [personalAffirmation, setPersonalAffirmation] = useState('');

  const isValid = selectedAffirmation !== null || personalAffirmation.trim().length > 0;

  const handleContinue = () => {
    if (!isValid) {
      return;
    }

    const affirmationData: AffirmationData = {
      selectedAffirmation: selectedAffirmation || undefined,
      personalAffirmation: personalAffirmation.trim() || undefined,
      selfCompassionNote: selfCompassionNote.trim() || undefined,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(affirmationData);
    }

    // Navigate to completion
    navigation.navigate('MiddayCompletion');
  };

  return (
    <View style={styles.screenContainer}>
      <ScrollView style={styles.container} testID="affirmation-screen">
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
        <Text style={styles.title}>Self-Compassion & Return</Text>
        <Text style={styles.subtitle}>Complete Your Midday Reset</Text>
        <Text style={styles.helperText}>
          You're doing your best
        </Text>
      </View>

      {/* Self-Compassion Pause */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldLabel}>Mindful Self-Compassion</Text>
        <Text style={styles.fieldHelper}>
          What would you say to a friend in your situation? (Optional)
        </Text>
        <TextInput
          style={styles.textInput}
          value={selfCompassionNote}
          onChangeText={setSelfCompassionNote}
          placeholder="e.g., It's okay to struggle, I'm learning, this is hard..."
          placeholderTextColor="#999"
          testID="self-compassion-input"
          accessibilityLabel="Self-compassion note"
          multiline
        />
      </View>

      {/* Grounded Affirmations */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldLabel}>Choose a Grounded Affirmation</Text>
        <Text style={styles.fieldHelper}>
          Select an affirmation that resonates (based on what you control)
        </Text>
        <View style={styles.affirmationList}>
          {AFFIRMATIONS.map((affirmation) => {
            const isExpanded = expandedAffirmation === affirmation.id;
            const isSelected = selectedAffirmation === affirmation.id;

            return (
              <View key={affirmation.id}>
                <TouchableOpacity
                  style={[
                    styles.affirmationCard,
                    isSelected && styles.affirmationCardSelected,
                  ]}
                  onPress={() => {
                    setSelectedAffirmation(affirmation.id);
                    setExpandedAffirmation(isExpanded ? null : affirmation.id);
                  }}
                  testID={`affirmation-${affirmation.id}`}
                  accessibilityLabel={affirmation.text}
                  accessibilityHint={isExpanded ? affirmation.description : 'Tap to expand description'}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: isSelected,
                    expanded: isExpanded
                  }}
                >
                  <View style={styles.affirmationHeader}>
                    <Text
                      style={[
                        styles.affirmationText,
                        isSelected && styles.affirmationTextSelected,
                      ]}
                    >
                      {affirmation.text}
                    </Text>
                    <Text style={styles.expandIndicator}>
                      {isExpanded ? '▼' : '▶'}
                    </Text>
                  </View>
                  {isExpanded && (
                    <Text style={styles.affirmationDescription}>
                      {affirmation.description}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      {/* Personal Affirmation (Optional Alternative) */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldLabel}>Or Write Your Own</Text>
        <Text style={styles.fieldHelper}>
          Create a personal affirmation grounded in what you control
        </Text>
        <TextInput
          style={styles.textInput}
          value={personalAffirmation}
          onChangeText={setPersonalAffirmation}
          placeholder="e.g., I can be patient with myself today..."
          placeholderTextColor="#999"
          testID="personal-affirmation-input"
          accessibilityLabel="Personal affirmation"
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
        <Text style={styles.continueButtonText}>Complete Midday Reset</Text>
      </TouchableOpacity>

      {/* Stoic Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "You have power over your mind—not outside events. Realize this, and you will find strength." — Marcus Aurelius
        </Text>
      </View>
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
    padding: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#40B5AD',
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
    marginBottom: 4,
  },
  helperText: {
    fontSize: 14,
    color: '#40B5AD',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  fieldSection: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
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
  affirmationList: {
    gap: 12,
  },
  affirmationCard: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  affirmationCardSelected: {
    borderColor: '#40B5AD',
    backgroundColor: '#e0f5f4',
  },
  affirmationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  affirmationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  affirmationTextSelected: {
    color: '#40B5AD',
  },
  expandIndicator: {
    fontSize: 14,
    color: '#40B5AD',
    marginLeft: 8,
  },
  affirmationDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  continueButton: {
    backgroundColor: '#40B5AD',
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
    borderLeftColor: '#40B5AD',
    marginBottom: 40,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    lineHeight: 20,
  },
});

export default AffirmationScreen;
