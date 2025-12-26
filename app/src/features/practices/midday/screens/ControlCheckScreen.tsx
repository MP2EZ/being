/**
 * CONTROL CHECK SCREEN
 *
 * Three-tier dichotomy of control for midday reflection.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * Classical Stoic Practice:
 * - Epictetus: "Some things are in our power, others are not. Things in our power are
 *   opinion, pursuit, desire, aversion, and, in a word, whatever are our own actions.
 *   Things not in our power are body, property, reputation, command, and, in one word,
 *   whatever are not our own actions." (Enchiridion 1)
 * - Marcus Aurelius: "You have power over your mind—not outside events. Realize this,
 *   and you will find strength." (Meditations 12:8)
 * - Seneca: "We suffer more often in imagination than in reality" (Letters 13:4)
 *
 * Three-Tier Approach:
 * 1. Fully in control: My actions, attitudes, judgments
 * 2. Can influence: Outcomes through effort (but not guaranteed)
 * 3. Not in control: External events, others' actions
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { MiddayFlowParamList, ControlCheckData } from '@/features/practices/types/flows';
import { spacing, borderRadius, typography } from '@/core/theme';

type Props = StackScreenProps<MiddayFlowParamList, 'ControlCheck'> & {
  onSave?: (data: ControlCheckData) => void;
};

type ControlType = 'fully_in_control' | 'can_influence' | 'not_in_control';

const ControlCheckScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as ControlCheckData | undefined;

  // Debug logging
  if (initialData) {
    console.log('[ControlCheckScreen] Restoring data:', {
      aspect: initialData.aspect,
      controlType: initialData.controlType,
      hasWhatIControl: !!initialData.whatIControl,
      hasActionIfControllable: !!initialData.actionIfControllable
    });
  }

  const [aspect, setAspect] = useState(initialData?.aspect || '');
  const [controlType, setControlType] = useState<ControlType | null>(initialData?.controlType || null);
  const [whatIControl, setWhatIControl] = useState(initialData?.whatIControl || '');
  const [whatICannotControl, setWhatICannotControl] = useState(initialData?.whatICannotControl || '');
  const [actionIfControllable, setActionIfControllable] = useState(initialData?.actionIfControllable || '');
  const [acceptanceIfUncontrollable, setAcceptanceIfUncontrollable] = useState(initialData?.acceptanceIfUncontrollable || '');

  const isValid = (): boolean => {
    if (!aspect.trim() || !controlType) {
      return false;
    }

    if (controlType === 'fully_in_control') {
      return whatIControl.trim().length > 0 && actionIfControllable.trim().length > 0;
    }

    if (controlType === 'can_influence') {
      return (
        whatIControl.trim().length > 0 &&
        whatICannotControl.trim().length > 0 &&
        actionIfControllable.trim().length > 0
      );
    }

    if (controlType === 'not_in_control') {
      return (
        whatICannotControl.trim().length > 0 &&
        acceptanceIfUncontrollable.trim().length > 0
      );
    }

    return false;
  };

  const handleContinue = () => {
    if (!isValid()) {
      return;
    }

    const controlCheckData: ControlCheckData = {
      aspect: aspect.trim(),
      controlType: controlType!,
      whatIControl: whatIControl.trim() || undefined,
      whatICannotControl: whatICannotControl.trim() || undefined,
      actionIfControllable: actionIfControllable.trim() || undefined,
      acceptanceIfUncontrollable: acceptanceIfUncontrollable.trim() || undefined,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(controlCheckData);
    }

    navigation.navigate('Embodiment');
  };

  const handleControlTypeChange = (type: ControlType) => {
    setControlType(type);
    // Reset conditional fields when changing type
    setWhatIControl('');
    setWhatICannotControl('');
    setActionIfControllable('');
    setAcceptanceIfUncontrollable('');
  };

  return (
    <View style={styles.screenContainer}>
      <ScrollView style={styles.container} testID="control-check-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Control Check</Text>
        <Text style={styles.subtitle}>Dichotomy of Control</Text>
        <Text style={styles.helperText}>
          What can you control, influence, or accept?
        </Text>
      </View>

      {/* Aspect Input */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldLabel}>What situation do you want to analyze?</Text>
        <TextInput
          style={styles.textInput}
          value={aspect}
          onChangeText={setAspect}
          placeholder="e.g., Project deadline, difficult conversation..."
          placeholderTextColor="#999"
          testID="aspect-input"
          accessibilityLabel="Situation to analyze"
          multiline
        />
      </View>

      {/* Control Type Selection */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldLabel}>What's your relationship to this?</Text>
        <View style={styles.controlTypeOptions}>
          <TouchableOpacity
            style={[
              styles.controlTypeButton,
              controlType === 'fully_in_control' && styles.controlTypeButtonSelected,
            ]}
            onPress={() => handleControlTypeChange('fully_in_control')}
            testID="control-fully"
            accessibilityLabel="Fully in my control"
            accessibilityRole="button"
            accessibilityState={{ selected: controlType === 'fully_in_control' }}
          >
            <Text
              style={[
                styles.controlTypeTitle,
                controlType === 'fully_in_control' && styles.controlTypeTextSelected,
              ]}
            >
              Fully in My Control
            </Text>
            <Text style={styles.controlTypeDescription}>
              My actions, attitudes, judgments
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlTypeButton,
              controlType === 'can_influence' && styles.controlTypeButtonSelected,
            ]}
            onPress={() => handleControlTypeChange('can_influence')}
            testID="control-influence"
            accessibilityLabel="I can influence this"
            accessibilityRole="button"
            accessibilityState={{ selected: controlType === 'can_influence' }}
          >
            <Text
              style={[
                styles.controlTypeTitle,
                controlType === 'can_influence' && styles.controlTypeTextSelected,
              ]}
            >
              I Can Influence
            </Text>
            <Text style={styles.controlTypeDescription}>
              I can affect outcomes through effort
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlTypeButton,
              controlType === 'not_in_control' && styles.controlTypeButtonSelected,
            ]}
            onPress={() => handleControlTypeChange('not_in_control')}
            testID="control-not"
            accessibilityLabel="Not in my control"
            accessibilityRole="button"
            accessibilityState={{ selected: controlType === 'not_in_control' }}
          >
            <Text
              style={[
                styles.controlTypeTitle,
                controlType === 'not_in_control' && styles.controlTypeTextSelected,
              ]}
            >
              Not in My Control
            </Text>
            <Text style={styles.controlTypeDescription}>
              External events, others' actions
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conditional Fields Based on Control Type */}
      {controlType && (
        <View style={styles.conditionalSection}>
          {/* Fully in Control Fields */}
          {controlType === 'fully_in_control' && (
            <>
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>What do I control?</Text>
                <TextInput
                  style={styles.textInput}
                  value={whatIControl}
                  onChangeText={setWhatIControl}
                  placeholder="e.g., My effort, my response, my preparation..."
                  placeholderTextColor="#999"
                  testID="what-i-control-input"
                  accessibilityLabel="What you control"
                  multiline
                />
              </View>

              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>What action will I take?</Text>
                <TextInput
                  style={styles.textInput}
                  value={actionIfControllable}
                  onChangeText={setActionIfControllable}
                  placeholder="e.g., Work focused for 2 hours, practice response..."
                  placeholderTextColor="#999"
                  testID="action-input"
                  accessibilityLabel="Action to take"
                  multiline
                />
              </View>
            </>
          )}

          {/* Can Influence Fields */}
          {controlType === 'can_influence' && (
            <>
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>What can I control/influence?</Text>
                <TextInput
                  style={styles.textInput}
                  value={whatIControl}
                  onChangeText={setWhatIControl}
                  placeholder="e.g., My effort, my communication, my preparation..."
                  placeholderTextColor="#999"
                  testID="what-i-control-input"
                  accessibilityLabel="What you can control or influence"
                  multiline
                />
              </View>

              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>What can I NOT control?</Text>
                <TextInput
                  style={styles.textInput}
                  value={whatICannotControl}
                  onChangeText={setWhatICannotControl}
                  placeholder="e.g., Others' decisions, final outcome, external factors..."
                  placeholderTextColor="#999"
                  testID="what-i-cannot-control-input"
                  accessibilityLabel="What you cannot control"
                  multiline
                />
              </View>

              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>What action will I take?</Text>
                <TextInput
                  style={styles.textInput}
                  value={actionIfControllable}
                  onChangeText={setActionIfControllable}
                  placeholder="e.g., Present my best case, do thorough research..."
                  placeholderTextColor="#999"
                  testID="action-input"
                  accessibilityLabel="Action to take"
                  multiline
                />
              </View>
            </>
          )}

          {/* Not in Control Fields */}
          {controlType === 'not_in_control' && (
            <>
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>What is beyond my control?</Text>
                <TextInput
                  style={styles.textInput}
                  value={whatICannotControl}
                  onChangeText={setWhatICannotControl}
                  placeholder="e.g., Others' opinions, weather, past events..."
                  placeholderTextColor="#999"
                  testID="what-i-cannot-control-input"
                  accessibilityLabel="What is beyond your control"
                  multiline
                />
              </View>

              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>How will I practice acceptance?</Text>
                <TextInput
                  style={styles.textInput}
                  value={acceptanceIfUncontrollable}
                  onChangeText={setAcceptanceIfUncontrollable}
                  placeholder="e.g., I accept this is beyond me, I let go of this..."
                  placeholderTextColor="#999"
                  testID="acceptance-input"
                  accessibilityLabel="How you will practice acceptance"
                  multiline
                />
              </View>
            </>
          )}
        </View>
      )}

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, !isValid() && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={!isValid()}
        accessibilityRole="button"
        accessibilityState={{ disabled: !isValid() }}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>

      {/* Stoic Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "Make the best use of what is in your power, and take the rest as it happens."
          — Epictetus
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
    padding: spacing[20],
  },
  backButton: {
    marginBottom: spacing[20],
  },
  backButtonText: {
    fontSize: typography.bodyRegular.size,
    color: '#007AFF',
  },
  header: {
    marginBottom: spacing[24],
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing[8],
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: '#666',
    marginBottom: spacing[4],
  },
  helperText: {
    fontSize: typography.bodySmall.size,
    color: '#999',
    fontStyle: 'italic',
  },
  fieldSection: {
    marginBottom: spacing[20],
  },
  fieldLabel: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[8],
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: borderRadius.medium,
    padding: spacing[12],
    fontSize: typography.bodyRegular.size,
    backgroundColor: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  controlTypeOptions: {
    gap: spacing[12],
  },
  controlTypeButton: {
    padding: spacing[16],
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: borderRadius.medium,
    backgroundColor: '#fff',
  },
  controlTypeButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  controlTypeTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[4],
    color: '#333',
  },
  controlTypeTextSelected: {
    color: '#007AFF',
  },
  controlTypeDescription: {
    fontSize: typography.bodySmall.size,
    color: '#666',
  },
  conditionalSection: {
    marginTop: spacing[8],
  },
  continueButton: {
    backgroundColor: '#007AFF',
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    marginTop: spacing[12],
    marginBottom: spacing[24],
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
  },
  quoteSection: {
    padding: spacing[16],
    backgroundColor: '#f9f9f9',
    borderRadius: borderRadius.medium,
    borderLeftWidth: spacing[4],
    borderLeftColor: '#007AFF',
    marginBottom: 40,
  },
  quoteText: {
    fontSize: typography.bodySmall.size,
    fontStyle: 'italic',
    color: '#666',
    lineHeight: spacing[20],
  },
});

export default ControlCheckScreen;
