/**
 * PHYSICAL GROUNDING SCREEN - DRD v2.0.0
 *
 * Brief body scan OR mindful breathing to complete morning practice.
 * MINDFULNESS practice, NOT data tracking.
 *
 * Purpose:
 * - Ground awareness in physical present-moment experience
 * - Complete morning practice with embodied presence
 * - 1-2 minutes of simple body awareness
 * - Gentle transition to the day
 *
 * NOT PhysicalMetrics data tracking (sleep hours, exercise minutes, meals count).
 * This is mindful body awareness practice.
 *
 * @see /docs/product/Being. DRD.md (DRD-FLOW-002: Morning Flow, Screen 5)
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
import type { MorningFlowParamList, PhysicalGroundingData } from '../../../types/flows';
import BreathingCircle from '../../shared/components/BreathingCircle';

type Props = NativeStackScreenProps<MorningFlowParamList, 'PhysicalGrounding'> & {
  onSave?: (data: PhysicalGroundingData) => void;
};

type GroundingMethod = 'body_scan' | 'breathing';

const PhysicalGroundingScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = route.params?.initialData as PhysicalGroundingData | undefined;

  // Debug logging
  if (initialData) {
    console.log('[PhysicalGroundingScreen] Restoring data:', {
      method: initialData.method,
      hasBodyAwareness: !!initialData.bodyAwareness
    });
  }

  const [selectedMethod, setSelectedMethod] = useState<GroundingMethod | null>(
    initialData?.method || null
  );
  const [bodyAwareness, setBodyAwareness] = useState(initialData?.bodyAwareness || '');

  const isValid = selectedMethod !== null && bodyAwareness.trim().length > 0;

  const handleContinue = () => {
    if (!isValid) {
      return;
    }

    const physicalGroundingData: PhysicalGroundingData = {
      method: selectedMethod!,
      bodyAwareness: bodyAwareness.trim(),
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(physicalGroundingData);
    }

    navigation.navigate('MorningCompletion');
  };

  return (
    <ScrollView style={styles.container} testID="physical-grounding-screen">
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
        <Text style={styles.title}>Ground in Your Body</Text>
        <Text style={styles.subtitle}>Complete Your Morning Practice</Text>
        <Text style={styles.helperText}>
          1-2 minutes of physical awareness
        </Text>
      </View>

      {/* Method Selection */}
      <View style={styles.methodSection}>
        <Text style={styles.methodLabel}>Choose your grounding practice:</Text>
        <View style={styles.methodOptions}>
          <TouchableOpacity
            style={[
              styles.methodCard,
              selectedMethod === 'body_scan' && styles.methodCardSelected,
            ]}
            onPress={() => setSelectedMethod('body_scan')}
            testID="method-body-scan"
            accessibilityLabel="Brief body scan"
            accessibilityRole="button"
            accessibilityState={{ selected: selectedMethod === 'body_scan' }}
          >
            <Text
              style={[
                styles.methodTitle,
                selectedMethod === 'body_scan' && styles.methodTitleSelected,
              ]}
            >
              Brief Body Scan
            </Text>
            <Text style={styles.methodDescription}>
              Notice sensations from head to toe
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodCard,
              selectedMethod === 'breathing' && styles.methodCardSelected,
            ]}
            onPress={() => setSelectedMethod('breathing')}
            testID="method-breathing"
            accessibilityLabel="Mindful breathing"
            accessibilityRole="button"
            accessibilityState={{ selected: selectedMethod === 'breathing' }}
          >
            <Text
              style={[
                styles.methodTitle,
                selectedMethod === 'breathing' && styles.methodTitleSelected,
              ]}
            >
              Mindful Breathing
            </Text>
            <Text style={styles.methodDescription}>
              Follow your natural breath
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Practice Guidance */}
      {selectedMethod && (
        <View style={styles.guidanceSection}>
          <Text style={styles.guidanceTitle}>
            {selectedMethod === 'body_scan' ? 'Body Scan Guidance' : 'Breathing Guidance'}
          </Text>
          {selectedMethod === 'body_scan' ? (
            <View style={styles.guidanceSteps}>
              <Text style={styles.guidanceStep}>
                1. Notice your head and face - any tension or ease
              </Text>
              <Text style={styles.guidanceStep}>
                2. Shoulders and chest - observe without changing
              </Text>
              <Text style={styles.guidanceStep}>
                3. Arms and hands - whatever sensations arise
              </Text>
              <Text style={styles.guidanceStep}>
                4. Belly and back - gentle awareness
              </Text>
              <Text style={styles.guidanceStep}>
                5. Legs and feet - grounded and present
              </Text>
            </View>
          ) : (
            <View style={styles.breathingContainer}>
              <BreathingCircle
                isActive={true}
                testID="morning-breathing-circle"
                phaseText={{
                  inhale: 'Breathe In',
                  exhale: 'Breathe Out'
                }}
              />
              <Text style={styles.breathingInstructions}>
                Follow the circle's rhythm. When your mind wanders, gently return to the breath.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Body Awareness Reflection */}
      <View style={styles.awarenessSection}>
        <Text style={styles.awarenessLabel}>
          What do you notice in your body?
        </Text>
        <Text style={styles.awarenessHelper}>
          After your practice, briefly note what you experienced
        </Text>
        <TextInput
          style={styles.textInput}
          value={bodyAwareness}
          onChangeText={setBodyAwareness}
          placeholder="e.g., Relaxed shoulders, calm breath, grounded feet..."
          placeholderTextColor="#999"
          testID="body-awareness-input"
          accessibilityLabel="Body awareness notes"
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
        <Text style={styles.continueButtonText}>Complete Morning Practice</Text>
      </TouchableOpacity>

      {/* Transition Message */}
      <View style={styles.transitionSection}>
        <Text style={styles.transitionText}>
          Transition to your day with presence
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
    color: '#B45309',
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
  methodSection: {
    marginBottom: 24,
  },
  methodLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  methodOptions: {
    gap: 12,
  },
  methodCard: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  methodCardSelected: {
    borderColor: '#B45309',
    backgroundColor: '#FFF8F0',
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  methodTitleSelected: {
    color: '#B45309',
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
  },
  guidanceSection: {
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginBottom: 24,
  },
  guidanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#666',
  },
  guidanceSteps: {
    gap: 8,
  },
  guidanceStep: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  awarenessSection: {
    marginBottom: 24,
  },
  awarenessLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  awarenessHelper: {
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
    backgroundColor: '#B45309',
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
  transitionSection: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#B45309',
    marginBottom: 40,
    alignItems: 'center',
  },
  transitionText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
  },
  breathingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  breathingInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default PhysicalGroundingScreen;
