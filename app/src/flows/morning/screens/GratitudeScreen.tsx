/**
 * GRATITUDE SCREEN - DRD v2.0.0
 *
 * Morning gratitude practice with optional Stoic grounding.
 * MINDFULNESS-FIRST with Stoic wisdom enrichment.
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "When you arise in the morning, think of what a precious
 *   privilege it is to be alive" (Meditations 2:1)
 * - Epictetus: "He is a wise man who does not grieve for the things which he has not,
 *   but rejoices for those which he has" (Enchiridion)
 *
 * Philosophy:
 * - Simple gratitude (mindfulness core)
 * - Optional Stoic lens: "What's within your control to appreciate?"
 * - Educational enrichment (collapsible)
 * - NOT philosophy-heavy impermanence pathway
 *
 * @see /docs/product/Being. DRD.md (DRD-FLOW-002: Morning Flow, Screen 1)
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
import type { MorningFlowParamList } from '../../../types/flows';
import type { GratitudeData, GratitudeItem } from '../../../types/flows';

type Props = NativeStackScreenProps<MorningFlowParamList, 'Gratitude'> & {
  onSave?: (data: GratitudeData) => void;
};

const GratitudeScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = route.params?.initialData as GratitudeData | undefined;

  // Debug logging
  if (initialData) {
    console.log('[GratitudeScreen] Restoring data:', {
      items: initialData.items?.length,
      hasGrounding: !!initialData.stoicGrounding
    });
  }

  const [gratitudeItems, setGratitudeItems] = useState<string[]>(
    initialData?.items?.map(item => item.what || '') || ['', '', '']
  );
  const [showEducation, setShowEducation] = useState(false);
  const [stoicGrounding, setStoicGrounding] = useState(initialData?.stoicGrounding || '');

  // Validate at least 2 of 3 items filled
  const filledCount = gratitudeItems.filter(item => item.trim().length > 0).length;
  const allItemsFilled = filledCount >= 2;

  const updateGratitudeItem = (index: number, value: string) => {
    const newItems = [...gratitudeItems];
    newItems[index] = value;
    setGratitudeItems(newItems);
  };

  const handleContinue = () => {
    // Build gratitude data
    const items: GratitudeItem[] = gratitudeItems.map((item) => ({
      what: item.trim(),
    }));

    const gratitudeData: GratitudeData = {
      items,
      stoicGrounding: stoicGrounding.trim() || undefined,
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
        <Text style={styles.subtitle}>Start with Mindful Awareness</Text>
        <Text style={styles.helperText}>
          Name 2-3 things you're grateful for today
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
          {showEducation ? '▼' : '▶'} Why Stoic gratitude?
        </Text>
      </TouchableOpacity>

      {showEducation && (
        <View style={styles.educationCard}>
          <Text style={styles.educationText}>
            Stoic gratitude focuses on what's within your control to appreciate.
            Marcus Aurelius practiced morning gratitude as mindful awareness,
            not forced positivity. It grounds us in the present moment while
            recognizing what we can influence.
          </Text>
        </View>
      )}

      {/* Gratitude Items */}
      {gratitudeItems.map((item, index) => (
        <View key={index} style={styles.itemContainer}>
          <Text style={styles.itemLabel}>{index + 1}. What are you grateful for?</Text>
          <TextInput
            style={styles.input}
            value={item}
            onChangeText={(value) => updateGratitudeItem(index, value)}
            placeholder={index === 0 ? "e.g., Morning coffee, time to breathe, a choice..." : ""}
            placeholderTextColor="#999"
            testID={`gratitude-input-${index}`}
            accessibilityLabel={`Gratitude item ${index + 1}`}
            multiline
          />
        </View>
      ))}

      {/* Optional Stoic Grounding */}
      <View style={styles.stoicGroundingSection}>
        <Text style={styles.stoicGroundingLabel}>
          Optional: Stoic Lens
        </Text>
        <Text style={styles.stoicGroundingHelper}>
          What's within your control to appreciate today?
        </Text>
        <TextInput
          style={styles.stoicGroundingInput}
          value={stoicGrounding}
          onChangeText={setStoicGrounding}
          placeholder="e.g., My response, my effort, my presence..."
          placeholderTextColor="#999"
          testID="stoic-grounding-input"
          accessibilityLabel="Stoic grounding reflection"
          multiline
        />
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, !allItemsFilled && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={!allItemsFilled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !allItemsFilled }}
        accessibilityHint={
          allItemsFilled
            ? 'At least 2 items filled. Ready to continue to next screen'
            : 'Fill at least 2 gratitude items to continue'
        }
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>

      {/* Stoic Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "When you arise in the morning, think of what a precious privilege it is
          to be alive." — Marcus Aurelius
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
  itemContainer: {
    marginBottom: 24,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  stoicGroundingSection: {
    marginTop: 8,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  stoicGroundingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666',
  },
  stoicGroundingHelper: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  stoicGroundingInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 60,
    textAlignVertical: 'top',
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

export default GratitudeScreen;
