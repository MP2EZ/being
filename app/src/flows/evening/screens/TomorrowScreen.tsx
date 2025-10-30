/**
 * TOMORROW SCREEN - DRD v2.0.0
 *
 * Mindful visualization + intention + letting go for peaceful transition to rest.
 * NOT anxiety-inducing planning.
 *
 * Stoic Philosophy:
 * - Marcus Aurelius: "Confine yourself to the present" (Meditations 7:29)
 * - Epictetus: "Make the best use of what is in your power, and take the rest
 *   as it happens" (Discourses 1:1)
 * - Seneca: "True happiness is to enjoy the present, without anxious dependence
 *   upon the future" (Letters 23)
 *
 * Design Philosophy:
 * - Calm visualization (1-2 minutes)
 * - Brief intention for what's in your control
 * - Letting go of what's not in your control
 * - Sleep-compatible design (calming, not stimulating)
 *
 * @see /docs/product/Being. DRD.md (DRD-FLOW-004: Evening Flow, Screen 5)
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
import type { EveningFlowParamList, TomorrowData } from '../../../types/flows';

type Props = NativeStackScreenProps<EveningFlowParamList, 'Tomorrow'> & {
  onSave?: (data: TomorrowData) => void;
};

const TomorrowScreen: React.FC<Props> = ({ navigation, onSave }) => {
  const [intention, setIntention] = useState('');
  const [lettingGo, setLettingGo] = useState('');

  // Both fields optional (rest-oriented, not forced)
  const canContinue = intention.trim().length > 0 || lettingGo.trim().length > 0;

  const handleContinue = () => {
    const tomorrowData: TomorrowData = {
      intention: intention.trim() || undefined,
      lettingGo: lettingGo.trim() || undefined,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(tomorrowData);
    }

    navigation.navigate('Lessons');
  };

  return (
    <ScrollView style={styles.container} testID="tomorrow-screen">
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
        <Text style={styles.title}>Prepare for Tomorrow</Text>
        <Text style={styles.subtitle}>Mindful Visualization & Intention</Text>
        <Text style={styles.helperText}>
          Calm preparation for peaceful rest
        </Text>
      </View>

      {/* Visualization Prompt */}
      <View style={styles.visualizationPrompt}>
        <Text style={styles.visualizationTitle}>Mindful Visualization</Text>
        <Text style={styles.visualizationText}>
          Take a moment to picture tomorrow calmly...
          {'\n\n'}
          See yourself moving through the day with presence.
          {'\n'}
          Notice what matters, without anxiety about outcomes.
        </Text>
      </View>

      {/* Intention for Tomorrow */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldLabel}>What's your intention for tomorrow?</Text>
        <Text style={styles.fieldHelper}>
          Brief intention - focus on what's in your control
        </Text>
        <TextInput
          style={styles.textInput}
          value={intention}
          onChangeText={setIntention}
          placeholder="e.g., I'll stay present, practice patience, listen fully..."
          placeholderTextColor="#999"
          testID="intention-input"
          accessibilityLabel="Intention for tomorrow"
          multiline
        />
      </View>

      {/* Letting Go */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldLabel}>What can you let go of tonight?</Text>
        <Text style={styles.fieldHelper}>
          Release what's not in your control - peaceful transition to rest
        </Text>
        <TextInput
          style={styles.textInput}
          value={lettingGo}
          onChangeText={setLettingGo}
          placeholder="e.g., Others' opinions, outcomes I can't control, today's worries..."
          placeholderTextColor="#999"
          testID="letting-go-input"
          accessibilityLabel="What to let go of"
          multiline
        />
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={!canContinue}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canContinue }}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>

      {/* Stoic Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "True happiness is to enjoy the present, without anxious dependence
          upon the future." — Seneca
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
  visualizationPrompt: {
    padding: 16,
    backgroundColor: '#F0F5F1',
    borderRadius: 8,
    marginBottom: 24,
  },
  visualizationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#4A7C59',
  },
  visualizationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
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

export default TomorrowScreen;
