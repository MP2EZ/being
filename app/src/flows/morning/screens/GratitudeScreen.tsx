/**
 * GRATITUDE SCREEN
 *
 * Stoic gratitude practice with optional impermanence reflection.
 * Philosopher-validated (9.5/10) - integrates memento mori with gratitude.
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "When you arise in the morning, think of what a precious
 *   privilege it is to be alive" (Meditations 2:1)
 * - Epictetus: "He is a wise man who does not grieve for the things which he has not,
 *   but rejoices for those which he has" (Enchiridion)
 *
 * Impermanence Pathway (Optional):
 * 1. Acknowledge: "This is impermanent" (memento mori)
 * 2. Awareness: Custom reflection on impermanence
 * 3. Appreciation shift: How impermanence makes it precious
 * 4. Present action: How you'll engage fully today
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MorningFlowParamList } from '../../../types/flows';
import type { GratitudeData, GratitudeItem } from '../../../types/flows';

type Props = NativeStackScreenProps<MorningFlowParamList, 'Gratitude'> & {
  onSave?: (data: GratitudeData) => void;
};

interface ImpermanenceState {
  showPathway: boolean;
  acknowledged: boolean;
  awareness: string;
  appreciationShift: string;
  presentAction: string;
}

const GratitudeScreen: React.FC<Props> = ({ navigation, onSave }) => {
  const [gratitudeItems, setGratitudeItems] = useState<string[]>(['', '', '']);
  const [impermanenceStates, setImpermanenceStates] = useState<ImpermanenceState[]>([
    { showPathway: false, acknowledged: false, awareness: '', appreciationShift: '', presentAction: '' },
    { showPathway: false, acknowledged: false, awareness: '', appreciationShift: '', presentAction: '' },
    { showPathway: false, acknowledged: false, awareness: '', appreciationShift: '', presentAction: '' },
  ]);

  // Validate all items filled
  const allItemsFilled = gratitudeItems.every(item => item.trim().length > 0);

  const updateGratitudeItem = (index: number, value: string) => {
    const newItems = [...gratitudeItems];
    newItems[index] = value;
    setGratitudeItems(newItems);
  };

  const toggleImpermanencePathway = (index: number, show: boolean) => {
    const newStates = [...impermanenceStates];
    newStates[index].showPathway = show;
    setImpermanenceStates(newStates);
  };

  const updateImpermanenceField = (
    index: number,
    field: keyof Omit<ImpermanenceState, 'showPathway'>,
    value: string | boolean
  ) => {
    const newStates = [...impermanenceStates];
    (newStates[index][field] as any) = value;
    setImpermanenceStates(newStates);
  };

  const handleContinue = () => {
    // Build gratitude data
    const items: GratitudeItem[] = gratitudeItems.map((item, index) => {
      const state = impermanenceStates[index];
      const gratitudeItem: GratitudeItem = {
        what: item.trim(),
      };

      // Add impermanence reflection if opted in
      if (state.showPathway && state.acknowledged) {
        gratitudeItem.impermanenceReflection = {
          acknowledged: true,
          awareness: state.awareness || undefined,
          appreciationShift: state.appreciationShift || undefined,
          presentAction: state.presentAction || undefined,
        };
      } else if (state.showPathway) {
        gratitudeItem.impermanenceReflection = {
          acknowledged: false,
        };
      }

      return gratitudeItem;
    });

    const gratitudeData: GratitudeData = {
      items,
      timestamp: new Date(),
    };

    // Call onSave if provided (for testing)
    if (onSave) {
      onSave(gratitudeData);
    }

    // Navigate to next screen
    navigation.navigate('Intention');
  };

  return (
    <ScrollView style={styles.container} testID="gratitude-screen">
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
        <Text style={styles.title}>Morning Gratitude</Text>
        <Text style={styles.subtitle}>
          Name 3 things you're grateful for today
        </Text>
      </View>

      {/* Gratitude Items */}
      {gratitudeItems.map((item, index) => (
        <View key={index} style={styles.itemContainer}>
          <Text style={styles.itemLabel}>{index + 1}. What are you grateful for?</Text>
          <TextInput
            style={styles.input}
            value={item}
            onChangeText={(value) => updateGratitudeItem(index, value)}
            placeholder="What are you grateful for today?"
            placeholderTextColor="#999"
            testID={`gratitude-input-${index}`}
            accessibilityLabel={`Gratitude item ${index + 1}`}
            multiline
          />

          {/* Impermanence Reflection Option */}
          {item.trim().length > 0 && !impermanenceStates[index].showPathway && (
            <View style={styles.impermanenceOption}>
              <Text style={styles.impermanencePrompt}>
                Reflect on impermanence? (Optional)
              </Text>
              <View style={styles.impermanenceButtons}>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => toggleImpermanencePathway(index, true)}
                  testID={`impermanence-reflect-${index}`}
                  accessibilityLabel="Reflect on impermanence"
                >
                  <Text style={styles.optionButtonText}>Yes, reflect</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, styles.optionButtonSecondary]}
                  onPress={() => toggleImpermanencePathway(index, false)}
                  testID={`impermanence-skip-${index}`}
                  accessibilityLabel="Skip impermanence reflection"
                >
                  <Text style={styles.optionButtonTextSecondary}>Skip</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Impermanence 3-Step Pathway */}
          {impermanenceStates[index].showPathway && (
            <View style={styles.impermanencePathway}>
              <Text style={styles.pathwayTitle}>Impermanence Reflection</Text>

              {/* Step 1: Acknowledge */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() =>
                  updateImpermanenceField(
                    index,
                    'acknowledged',
                    !impermanenceStates[index].acknowledged
                  )
                }
                testID={`impermanence-acknowledge-${index}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: impermanenceStates[index].acknowledged }}
              >
                <View
                  style={[
                    styles.checkbox,
                    impermanenceStates[index].acknowledged && styles.checkboxChecked,
                  ]}
                >
                  {impermanenceStates[index].acknowledged && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>This is impermanent</Text>
              </TouchableOpacity>

              {/* Step 2: Awareness */}
              <View style={styles.pathwayStep}>
                <Text style={styles.stepLabel}>How does impermanence show up?</Text>
                <TextInput
                  style={styles.pathwayInput}
                  value={impermanenceStates[index].awareness}
                  onChangeText={(value) =>
                    updateImpermanenceField(index, 'awareness', value)
                  }
                  placeholder="e.g., Coffee beans are fleeting, moments pass..."
                  placeholderTextColor="#999"
                  testID={`impermanence-awareness-${index}`}
                  multiline
                />
              </View>

              {/* Step 3: Appreciation Shift */}
              <View style={styles.pathwayStep}>
                <Text style={styles.stepLabel}>This makes it precious because...</Text>
                <TextInput
                  style={styles.pathwayInput}
                  value={impermanenceStates[index].appreciationShift}
                  onChangeText={(value) =>
                    updateImpermanenceField(index, 'appreciationShift', value)
                  }
                  placeholder="e.g., This makes morning sacred, not routine..."
                  placeholderTextColor="#999"
                  testID={`impermanence-appreciation-${index}`}
                  multiline
                />
              </View>

              {/* Step 4: Present Action */}
              <View style={styles.pathwayStep}>
                <Text style={styles.stepLabel}>I'll engage fully by...</Text>
                <TextInput
                  style={styles.pathwayInput}
                  value={impermanenceStates[index].presentAction}
                  onChangeText={(value) =>
                    updateImpermanenceField(index, 'presentAction', value)
                  }
                  placeholder="e.g., I will savor each sip, be fully present..."
                  placeholderTextColor="#999"
                  testID={`impermanence-action-${index}`}
                  multiline
                />
              </View>
            </View>
          )}
        </View>
      ))}

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, !allItemsFilled && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={!allItemsFilled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !allItemsFilled }}
        accessibilityHint={
          allItemsFilled
            ? 'All items filled. Ready to continue to next screen'
            : 'Fill all 3 items to continue'
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
  itemContainer: {
    marginBottom: 30,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 60,
  },
  impermanenceOption: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  impermanencePrompt: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  impermanenceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    alignItems: 'center',
  },
  optionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  optionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  optionButtonTextSecondary: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  impermanencePathway: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  pathwayTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 15,
    fontStyle: 'italic',
  },
  pathwayStep: {
    marginBottom: 16,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  pathwayInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    minHeight: 50,
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

export default GratitudeScreen;
