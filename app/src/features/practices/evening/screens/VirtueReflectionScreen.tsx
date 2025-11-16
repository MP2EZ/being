/**
 * VIRTUE REFLECTION SCREEN - DRD v2.0.0
 *
 * Evening mindful reflection with Stoic self-examination.
 * NOT harsh judgment - growth-oriented, self-compassionate lens.
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "Look within. Within is the fountain of good, and it will
 *   ever bubble up, if you will ever dig" (Meditations 7:59)
 * - Seneca: "I shall make use of this privilege and shall examine the whole of my day
 *   and shall measure my deeds and words" (On Anger 3.36)
 * - Epictetus: "Don't explain your philosophy. Embody it." (Frag. 21)
 *
 * Philosophy:
 * - Mindfulness-first: Notice your day without judgment
 * - Self-compassionate examination: Where did I show up well? Where can I grow?
 * - NOT perfectionist critique
 * - Virtue-focused (integrated, not modular)
 *
 * @see /docs/product/Being. DRD.md (DRD-FLOW-004: Evening Flow, Screen 1)
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
import type { EveningFlowParamList, VirtueReflectionData } from '@/features/practices/types/flows';
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';

type Props = StackScreenProps<EveningFlowParamList, 'VirtueReflection'> & {
  onSave?: (data: VirtueReflectionData) => void;
};

const VirtueReflectionScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as VirtueReflectionData | undefined;

  // Debug logging
  if (initialData) {
    console.log('[VirtueReflectionScreen] Restoring data:', {
      hasShowedUpWell: !!initialData.showedUpWell,
      hasGrowthArea: !!initialData.growthArea
    });
  }

  const [showedUpWell, setShowedUpWell] = useState(initialData?.showedUpWell || '');
  const [growthArea, setGrowthArea] = useState(initialData?.growthArea || '');

  // Both fields required for balanced reflection (prevents harsh self-criticism OR missing growth)
  const canContinue = showedUpWell.trim().length > 0 && growthArea.trim().length > 0;

  const handleContinue = () => {
    const virtueReflectionData: VirtueReflectionData = {
      showedUpWell: showedUpWell.trim() || undefined,
      growthArea: growthArea.trim() || undefined,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(virtueReflectionData);
    }

    navigation.navigate('Gratitude');
  };

  return (
    <>
      <ScrollView style={styles.container} testID="virtue-reflection-screen">
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
          <Text style={styles.title}>Mindful Reflection</Text>
          <Text style={styles.subtitle}>Settle Into Your Evening Practice</Text>
          <Text style={styles.helperText}>
            Notice your day without judgment
          </Text>
        </View>

        {/* Breathing Prompt */}
        <View style={styles.breathingPrompt}>
          <Text style={styles.breathingText}>
            Take a few mindful breaths to settle into reflection...
          </Text>
        </View>

        {/* Showed Up Well */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Where did you show up well today?</Text>
          <Text style={styles.fieldHelper}>
            Not harsh judgment - genuine acknowledgment
          </Text>
          <TextInput
            style={styles.textInput}
            value={showedUpWell}
            onChangeText={setShowedUpWell}
            placeholder="e.g., I listened fully, stayed patient, made a brave choice..."
            placeholderTextColor="#999"
            testID="showed-up-well-input"
            accessibilityLabel="Where you showed up well today"
            multiline
          />
        </View>

        {/* Growth Area */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Where could you grow?</Text>
          <Text style={styles.fieldHelper}>
            Self-compassionate lens - learning, not failing
          </Text>
          <TextInput
            style={styles.textInput}
            value={growthArea}
            onChangeText={setGrowthArea}
            placeholder="e.g., I could practice more patience, listen deeper..."
            placeholderTextColor="#999"
            testID="growth-area-input"
            accessibilityLabel="Where you could grow"
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
            "Look within. Within is the fountain of good, and it will ever bubble up,
            if you will ever dig." — Marcus Aurelius, Meditations 7:59
          </Text>
        </View>
      </ScrollView>

      {/* Crisis Button Overlay - accessible when keyboard is visible */}
      <CollapsibleCrisisButton testID="crisis-virtue-reflection" />
    </>
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
  breathingPrompt: {
    padding: 16,
    backgroundColor: '#F0F5F1',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4A7C59',
    marginBottom: 24,
  },
  breathingText: {
    fontSize: 14,
    color: '#4A7C59',
    fontStyle: 'italic',
    textAlign: 'center',
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
    minHeight: 100,
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

export default VirtueReflectionScreen;
