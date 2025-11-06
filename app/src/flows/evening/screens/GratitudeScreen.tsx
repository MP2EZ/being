/**
 * GRATITUDE SCREEN (Evening)
 *
 * Evening gratitude practice with optional impermanence reflection.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "When you arise in the morning, think of what a precious
 *   privilege it is to be alive - to breathe, to think, to enjoy, to love - then
 *   make that privilege count by being grateful" (Meditations 2:1)
 * - Epictetus: "He is a wise man who does not grieve for the things which he has
 *   not, but rejoices for those which he has" (Discourses)
 * - Marcus Aurelius: "Loss is nothing else but change, and change is Nature's
 *   delight" (Meditations 7:18) - Impermanence as nature's way
 *
 * Purpose: Evening gratitude completes the day with reflection on what was good.
 * Three items (not more, not less) - classical Stoic practice. Optional
 * impermanence reflection deepens appreciation by acknowledging that all things
 * are temporary, making them more precious.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { EveningFlowParamList, GratitudeData, GratitudeItem } from '../../../types/flows';

type Props = StackScreenProps<EveningFlowParamList, 'Gratitude'> & {
  onSave?: (data: GratitudeData) => void;
};

const GratitudeScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = route.params?.initialData as GratitudeData | undefined;

  // Debug logging
  if (initialData) {
    console.log('[GratitudeScreen (evening)] Restoring data:', {
      itemCount: initialData.items?.length,
      items: initialData.items?.map((item, i) => ({
        index: i,
        hasWhat: !!item.what,
        hasImpermanence: !!item.impermanenceReflection
      }))
    });
  }

  // Reconstruct arrays from GratitudeData.items
  const initialGratitudes = initialData?.items
    ? initialData.items.map(item => item.what || '')
    : ['', '', ''];

  const initialImpermanenceEnabled = initialData?.items
    ? initialData.items.map(item => !!item.impermanenceReflection?.acknowledged)
    : [false, false, false];

  const initialImpermanenceAwareness = initialData?.items
    ? initialData.items.map(item => item.impermanenceReflection?.awareness || '')
    : ['', '', ''];

  const [gratitudes, setGratitudes] = useState<string[]>(initialGratitudes);
  const [impermanenceEnabled, setImpermanenceEnabled] = useState<boolean[]>(initialImpermanenceEnabled);
  const [impermanenceAwareness, setImpermanenceAwareness] = useState<string[]>(initialImpermanenceAwareness);

  const isValid = gratitudes.every(g => g.trim().length > 0);

  const handleToggleImpermanence = (index: number) => {
    const newEnabled = [...impermanenceEnabled];
    newEnabled[index] = !newEnabled[index];
    setImpermanenceEnabled(newEnabled);
  };

  const handleGratitudeChange = (index: number, value: string) => {
    const newGratitudes = [...gratitudes];
    newGratitudes[index] = value;
    setGratitudes(newGratitudes);
  };

  const handleImpermanenceChange = (index: number, value: string) => {
    const newImpermanence = [...impermanenceAwareness];
    newImpermanence[index] = value;
    setImpermanenceAwareness(newImpermanence);
  };

  const handleContinue = () => {
    if (!isValid) {
      return;
    }

    const items: GratitudeItem[] = gratitudes.map((gratitude, index) => {
      const item: GratitudeItem = {
        what: gratitude.trim(),
      };

      if (impermanenceEnabled[index] && impermanenceAwareness[index].trim()) {
        item.impermanenceReflection = {
          acknowledged: true,
          awareness: impermanenceAwareness[index].trim(),
        };
      }

      return item;
    });

    const gratitudeData: GratitudeData = {
      items,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(gratitudeData);
    }
    navigation.navigate('Tomorrow');
  };

  return (
    <ScrollView style={styles.container} testID="gratitude-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="back-button"
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Evening Gratitude</Text>
        <Text style={styles.subtitle}>Three things you're grateful for today</Text>
      </View>

      {/* Stoic Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has" — Epictetus
        </Text>
        <Text style={styles.quoteSubtext}>
          End the day with appreciation
        </Text>
      </View>

      {/* Three Gratitude Inputs */}
      {[0, 1, 2].map((index) => (
        <View key={index} style={styles.gratitudeCard}>
          <View style={styles.gratitudeHeader}>
            <Text style={styles.gratitudeNumber}>{index + 1}</Text>
            <Text style={styles.gratitudeLabel}>I'm grateful for...</Text>
          </View>

          <TextInput
            style={styles.textInput}
            value={gratitudes[index]}
            onChangeText={(value) => handleGratitudeChange(index, value)}
            placeholder="What are you grateful for?"
            multiline
            numberOfLines={2}
            testID={`gratitude-${index}`}
            accessibilityLabel={`Gratitude item ${index + 1}`}
          />

          {/* Optional Impermanence Reflection */}
          <View style={styles.impermanenceSection}>
            <View style={styles.impermanenceToggle}>
              <Switch
                value={impermanenceEnabled[index]}
                onValueChange={() => handleToggleImpermanence(index)}
                testID={`impermanence-toggle-${index}`}
                accessibilityLabel={`Enable impermanence reflection for item ${index + 1}`}
                accessibilityRole="switch"
                accessibilityState={{ checked: impermanenceEnabled[index] }}
              />
              <Text style={styles.impermanenceLabel}>
                Reflect on impermanence (optional)
              </Text>
            </View>

            {impermanenceEnabled[index] && (
              <View style={styles.impermanenceFields}>
                <Text style={styles.impermanenceHint}>
                  "This is temporary and precious"
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={impermanenceAwareness[index]}
                  onChangeText={(value) => handleImpermanenceChange(index, value)}
                  placeholder="Knowing this is impermanent makes me appreciate it more because..."
                  multiline
                  numberOfLines={2}
                  testID={`impermanence-awareness-${index}`}
                  accessibilityLabel={`Impermanence awareness for item ${index + 1}`}
                />
              </View>
            )}
          </View>
        </View>
      ))}

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={!isValid}
        accessibilityLabel="Continue to tomorrow intention"
        accessibilityRole="button"
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>

      {/* Validation Message */}
      {!isValid && (
        <Text style={styles.validationText}>
          Please fill all three gratitude items
        </Text>
      )}
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
    marginTop: 40,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 32,
    color: '#4A7C59',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#4A7C59',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  quoteSection: {
    padding: 16,
    backgroundColor: '#F0F5F1',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A7C59',
    marginBottom: 32,
  },
  quoteText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#666',
    lineHeight: 22,
    marginBottom: 4,
  },
  quoteSubtext: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  gratitudeCard: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4A7C59',
  },
  gratitudeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gratitudeNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A7C59',
    marginRight: 12,
    width: 32,
  },
  gratitudeLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  impermanenceSection: {
    marginTop: 8,
  },
  impermanenceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  impermanenceLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  impermanenceFields: {
    marginTop: 12,
  },
  impermanenceHint: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: '#4A7C59',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
    shadowColor: '#4A7C59',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  validationText: {
    fontSize: 14,
    color: '#d64545',
    textAlign: 'center',
    marginBottom: 40,
    fontStyle: 'italic',
  },
});

export default GratitudeScreen;
