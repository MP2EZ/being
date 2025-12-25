/**
 * VIRTUE REFLECTION SCREEN - FEAT-134 Evening Flow Redesign
 *
 * Screen 3 of 6: Reflection + inline principle picker with progressive disclosure
 * Uses shared AccessibleInput and AccessibleButton components
 *
 * Design Philosophy:
 * - Progressive disclosure: principle picker appears after 10+ chars
 * - Quick-tap examples reduce typing friction
 * - Optional principle selection feeds Insights dashboard
 * - Growth area is optional (reduces required fields)
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "Look within. Within is the fountain of good" (Meditations 7:59)
 * - Seneca: "I shall examine the whole of my day and measure my deeds" (On Anger 3.36)
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { EveningFlowParamList, VirtueReflectionData } from '@/features/practices/types/flows';
import type { StoicPrinciple } from '@/features/practices/types/stoic';
import { AccessibleInput } from '@/core/components/accessibility/AccessibleInput';
import { AccessibleButton } from '@/core/components/accessibility/AccessibleButton';
import { spacing, borderRadius, typography, colorSystem } from '@/core/theme';

type Props = StackScreenProps<EveningFlowParamList, 'VirtueReflection'> & {
  onSave?: (data: VirtueReflectionData) => void;
};

const MIN_CHARS_FOR_PICKER = 10;

// Quick-tap examples to reduce typing friction
const QUICK_EXAMPLES = [
  'Stayed calm',
  'Set boundaries',
  'Chose kindness',
  'Listened fully',
];

// Principle options (abbreviated for compact chips)
interface PrincipleOption {
  key: StoicPrinciple;
  label: string;
  shortDescription: string;
}

const PRINCIPLES: PrincipleOption[] = [
  {
    key: 'aware_presence',
    label: 'Aware Presence',
    shortDescription: 'Being fully here now',
  },
  {
    key: 'radical_acceptance',
    label: 'Radical Acceptance',
    shortDescription: 'Accepting what is',
  },
  {
    key: 'sphere_sovereignty',
    label: 'Sphere Sovereignty',
    shortDescription: 'Focus on what you control',
  },
  {
    key: 'virtuous_response',
    label: 'Virtuous Response',
    shortDescription: 'Acting with virtue',
  },
  {
    key: 'interconnected_living',
    label: 'Interconnected Living',
    shortDescription: 'Acting for common good',
  },
];

const VirtueReflectionScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as { initialData?: any } | undefined)?.initialData;

  const [showedUpWell, setShowedUpWell] = useState(initialData?.showedUpWell || '');
  const [growthArea, setGrowthArea] = useState(initialData?.growthArea || '');
  const [selectedPrinciple, setSelectedPrinciple] = useState<StoicPrinciple | null>(
    initialData?.principleReflected || null
  );

  // Show principle picker after 10+ chars (progressive disclosure)
  const showPrinciplePicker = showedUpWell.trim().length >= MIN_CHARS_FOR_PICKER;

  // Only showedUpWell is required (10+ chars)
  const isValid = showedUpWell.trim().length >= MIN_CHARS_FOR_PICKER;

  const handleQuickExample = (example: string) => {
    setShowedUpWell(example);
  };

  const handleSelectPrinciple = (principle: StoicPrinciple) => {
    setSelectedPrinciple(selectedPrinciple === principle ? null : principle);
  };

  const handleContinue = () => {
    if (!isValid) return;

    const virtueReflectionData: VirtueReflectionData = {
      showedUpWell: showedUpWell.trim(),
      growthArea: growthArea.trim() || undefined,
      principleReflected: selectedPrinciple || undefined,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(virtueReflectionData);
    }

    navigation.navigate('SelfCompassion');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        testID="virtue-reflection-screen"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Where did you show up well today?</Text>
        </View>

        {/* Main input */}
        <View style={styles.inputSection}>
          <AccessibleInput
            label=""
            value={showedUpWell}
            onChangeText={setShowedUpWell}
            placeholder="I handled the difficult conversation with..."
            multiline
            numberOfLines={3}
            testID="showed-up-well-input"
            containerStyle={styles.inputContainer}
            inputStyle={styles.input}
          />
        </View>

        {/* Quick-tap examples */}
        {showedUpWell.length < MIN_CHARS_FOR_PICKER && (
          <View style={styles.quickExamplesSection}>
            <Text style={styles.quickExamplesLabel}>Quick examples:</Text>
            <View style={styles.quickExamplesRow}>
              {QUICK_EXAMPLES.map((example) => (
                <TouchableOpacity
                  key={example}
                  style={styles.quickExampleChip}
                  onPress={() => handleQuickExample(example)}
                  accessibilityRole="button"
                  accessibilityLabel={`Use example: ${example}`}
                >
                  <Text style={styles.quickExampleText}>{example}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Principle picker - appears after 10+ chars (progressive disclosure) */}
        {showPrinciplePicker && (
          <View style={styles.principleSection}>
            <Text style={styles.principleLabel}>This sounds like... (optional)</Text>
            <View style={styles.principleGrid}>
              {PRINCIPLES.map((principle) => (
                <TouchableOpacity
                  key={principle.key}
                  style={[
                    styles.principleChip,
                    selectedPrinciple === principle.key && styles.principleChipSelected,
                  ]}
                  onPress={() => handleSelectPrinciple(principle.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${principle.label}`}
                  accessibilityState={{ selected: selectedPrinciple === principle.key }}
                  testID={`principle-${principle.key}`}
                >
                  <Text
                    style={[
                      styles.principleChipText,
                      selectedPrinciple === principle.key && styles.principleChipTextSelected,
                    ]}
                  >
                    {principle.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Optional growth area */}
        <View style={styles.inputSection}>
          <AccessibleInput
            label="Where could you grow?"
            helperText="optional"
            value={growthArea}
            onChangeText={setGrowthArea}
            placeholder="Next time I might..."
            multiline
            numberOfLines={2}
            testID="growth-area-input"
            containerStyle={styles.inputContainer}
            inputStyle={styles.input}
            labelStyle={styles.inputLabel}
          />
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={styles.buttonContainer}>
        <AccessibleButton
          onPress={handleContinue}
          label="Continue"
          variant="primary"
          size="large"
          disabled={!isValid}
          testID="continue-button"
          accessibilityHint="Continue to self-compassion"
        />
        {!isValid && (
          <Text style={styles.validationHint}>
            Describe where you showed up well ({MIN_CHARS_FOR_PICKER}+ characters)
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white, // White content area (matches morning/midday)
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[20],
  },
  header: {
    marginBottom: spacing[24],
  },
  title: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
  },
  inputSection: {
    marginBottom: spacing[16],
  },
  inputContainer: {
    marginBottom: 0,
  },
  input: {
    backgroundColor: colorSystem.base.white,
    borderColor: colorSystem.gray[300],
    color: colorSystem.base.black,
  },
  inputLabel: {
    color: colorSystem.base.black,
  },
  quickExamplesSection: {
    marginBottom: spacing[24],
  },
  quickExamplesLabel: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    marginBottom: spacing[8],
  },
  quickExamplesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  quickExampleChip: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
  },
  quickExampleText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
  },
  principleSection: {
    marginBottom: spacing[24],
    padding: spacing[16],
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
  },
  principleLabel: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[12],
  },
  principleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  principleChip: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    borderColor: colorSystem.gray[300],
  },
  principleChipSelected: {
    borderColor: colorSystem.themes.evening.primary,
    backgroundColor: colorSystem.themes.evening.background,
  },
  principleChipText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    fontWeight: typography.fontWeight.medium,
  },
  principleChipTextSelected: {
    color: colorSystem.themes.evening.primary,
  },
  spacer: {
    height: spacing[96],
  },
  buttonContainer: {
    padding: spacing[20],
    paddingBottom: spacing[32],
    backgroundColor: colorSystem.base.white,
  },
  validationHint: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    textAlign: 'center',
    marginTop: spacing[8],
    fontStyle: 'italic',
  },
});

export default VirtueReflectionScreen;
