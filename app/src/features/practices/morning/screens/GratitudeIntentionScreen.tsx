/**
 * GRATITUDE + INTENTION SCREEN - FEAT-139 Morning Flow UX Refactor
 *
 * Screen 2: Combined gratitude and intention with impermanence framing
 * and embedded reserve clause ("fate permitting").
 *
 * Time: ~2 minutes | Principles: Aware Presence, Virtuous Response
 * Required inputs: 1 gratitude
 *
 * Key Design Decisions (Philosopher validated 9/10):
 * - Impermanence framing: "This day isn't guaranteed" (Stoic premeditatio integration)
 * - Reserve clause always visible ("fate permitting") - not separate field
 * - Gratitude required (1 minimum) to enable Continue
 * - Intention optional (can proceed without)
 * - "Add more gratitudes" expands to +2 additional inputs (max 3 total)
 *
 * Classical Stoic Foundation:
 * - Marcus Aurelius: "When you arise in the morning, think of what a precious
 *   privilege it is to be alive" (Meditations 2:1)
 * - Seneca: "While we wait for life, life passes" (Letters 1.1)
 *   - Impermanence awareness deepens gratitude
 * - Epictetus: Reserve clause - "If it be the will of the gods" (Discourses 2:6)
 *
 * @see /docs/product/stoic-mindfulness/principles/04-virtuous-response.md
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { MorningFlowParamList, GratitudeIntentionData } from '@/features/practices/types/flows';
import { FlowBackButton, SkipLink } from '../../shared/components';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';

// Re-export for backward compatibility
export type { GratitudeIntentionData } from '@/features/practices/types/flows';

type Props = StackScreenProps<MorningFlowParamList, 'GratitudeIntention'> & {
  onSave?: (data: GratitudeIntentionData) => void;
};

const GratitudeIntentionScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as GratitudeIntentionData | undefined;

  const [primaryGratitude, setPrimaryGratitude] = useState(
    initialData?.gratitudes?.[0] || ''
  );
  const [additionalGratitudes, setAdditionalGratitudes] = useState<string[]>(
    initialData?.gratitudes?.slice(1) || []
  );
  const [showAdditional, setShowAdditional] = useState(
    (initialData?.gratitudes?.length || 0) > 1
  );
  const [intention, setIntention] = useState(initialData?.intention || '');

  // At least 1 gratitude required
  const isValid = primaryGratitude.trim().length > 0;

  const handleAddMore = () => {
    if (!showAdditional) {
      setShowAdditional(true);
      setAdditionalGratitudes(['', '']);
    }
  };

  const updateAdditionalGratitude = (index: number, value: string) => {
    const newItems = [...additionalGratitudes];
    newItems[index] = value;
    setAdditionalGratitudes(newItems);
  };

  const handleContinue = () => {
    if (!isValid) return;

    // Collect all non-empty gratitudes
    const allGratitudes = [
      primaryGratitude.trim(),
      ...additionalGratitudes.filter((g) => g.trim().length > 0).map((g) => g.trim()),
    ];

    const data: GratitudeIntentionData = {
      gratitudes: allGratitudes,
      intention: intention.trim() || null,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(data);
    }

    navigation.navigate('PrincipleFocus' as never);
  };

  const handleSkip = () => {
    const data: GratitudeIntentionData = {
      gratitudes: [],
      intention: null,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(data);
    }

    navigation.navigate('PrincipleFocus' as never);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID="gratitude-intention-screen"
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <FlowBackButton onPress={() => navigation.goBack()} theme="morning" />

        {/* Impermanence Framing Card */}
        <View style={styles.impermanenceCard}>
          <Text style={styles.impermanenceText}>
            This day isn't guaranteed.{'\n'}
            What are you grateful for right now?
          </Text>
        </View>

        {/* Primary Gratitude (Required) */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>I'm grateful for...</Text>
          <Text style={styles.requiredIndicator}>Required</Text>
          <TextInput
            style={styles.textInput}
            value={primaryGratitude}
            onChangeText={setPrimaryGratitude}
            placeholder="Something you appreciate right now..."
            placeholderTextColor={colorSystem.gray[400]}
            testID="primary-gratitude-input"
            accessibilityLabel="Primary gratitude, required"
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Add More Button or Additional Gratitudes */}
        {!showAdditional ? (
          <TouchableOpacity
            style={styles.addMoreButton}
            onPress={handleAddMore}
            accessibilityRole="button"
            accessibilityLabel="Add more gratitudes"
            testID="add-more-button"
          >
            <Text style={styles.addMoreButtonText}>+ Add more gratitudes (optional)</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.additionalSection}>
            {additionalGratitudes.map((gratitude, index) => (
              <View key={index} style={styles.additionalInputWrapper}>
                <TextInput
                  style={styles.additionalInput}
                  value={gratitude}
                  onChangeText={(value) => updateAdditionalGratitude(index, value)}
                  placeholder={`Another gratitude...`}
                  placeholderTextColor={colorSystem.gray[400]}
                  testID={`additional-gratitude-${index}`}
                  accessibilityLabel={`Additional gratitude ${index + 1}, optional`}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            ))}
          </View>
        )}

        {/* Intention Section with Reserve Clause */}
        <View style={styles.intentionSection}>
          <View style={styles.intentionHeader}>
            <Text style={styles.intentionLabel}>Today's Intention</Text>
            <Text style={styles.reserveClause}>(fate permitting)</Text>
          </View>
          <TextInput
            style={styles.intentionInput}
            value={intention}
            onChangeText={setIntention}
            placeholder="Today I will..."
            placeholderTextColor={colorSystem.gray[400]}
            testID="intention-input"
            accessibilityLabel="Today's intention, optional. Fate permitting."
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.optionalText}>Optional</Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValid }}
          accessibilityHint={
            isValid
              ? 'Continue to principle focus'
              : 'Enter at least one gratitude to continue'
          }
          testID="continue-button"
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>

        {/* Skip Link */}
        <SkipLink
          onPress={handleSkip}
          accessibilityLabel="Skip gratitude and intention"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white, // Match other check-in flows
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[20],
    paddingBottom: spacing[40],
  },
  impermanenceCard: {
    // Simple framing card - NOT quote style (no left border)
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
    padding: spacing[20],
    marginBottom: spacing[24],
  },
  impermanenceText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.black,
    lineHeight: 28,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: spacing[20],
  },
  inputLabel: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[4],
  },
  requiredIndicator: {
    fontSize: typography.caption.size,
    color: colorSystem.themes.morning.primary,
    marginBottom: spacing[8],
  },
  textInput: {
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    fontSize: typography.bodyRegular.size,
    backgroundColor: colorSystem.base.white,
    minHeight: 80,
    color: colorSystem.base.black,
  },
  addMoreButton: {
    marginBottom: spacing[24],
    padding: spacing[12],
    alignItems: 'flex-start',
  },
  addMoreButtonText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.themes.morning.primary,
    fontWeight: typography.fontWeight.medium,
  },
  additionalSection: {
    marginBottom: spacing[24],
    gap: spacing[12],
  },
  additionalInputWrapper: {
    marginBottom: spacing[8],
  },
  additionalInput: {
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.medium,
    padding: spacing[12],
    fontSize: typography.bodyRegular.size,
    backgroundColor: colorSystem.base.white,
    minHeight: 60,
    color: colorSystem.base.black,
  },
  intentionSection: {
    marginBottom: spacing[24],
    padding: spacing[16],
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
  },
  intentionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing[8],
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  intentionLabel: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
  },
  reserveClause: {
    fontSize: typography.bodySmall.size,
    fontStyle: 'italic',
    color: colorSystem.gray[500],
  },
  intentionInput: {
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.medium,
    padding: spacing[12],
    fontSize: typography.bodyRegular.size,
    backgroundColor: colorSystem.base.white,
    minHeight: 60,
    color: colorSystem.base.black,
  },
  optionalText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    marginTop: spacing[8],
  },
  continueButton: {
    backgroundColor: colorSystem.themes.morning.primary,
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    marginBottom: spacing[16],
    minHeight: 48,
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colorSystem.gray[300],
  },
  continueButtonText: {
    color: colorSystem.base.white,
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default GratitudeIntentionScreen;
