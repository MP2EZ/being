/**
 * Graduated Acceptance Selector Component
 *
 * MAINT-65: 3-level acceptance selector for Reality Check screen.
 * Stoic Mindfulness principle: Radical Acceptance (Amor Fati).
 *
 * Levels (Philosopher-validated):
 * - Full: "I can accept this as it is" - Complete acceptance
 * - Aware Resistance: "I notice I'm resisting" - Metacognitive awareness
 * - Struggling: "I'm struggling to accept" - Honest acknowledgment (no shame)
 *
 * Design: Radio-button style vertical list with accessible touch targets.
 * Follows wireframes: /docs/design/midday-flow-wireframes-v2.md
 *
 * @see /docs/design/midday-flow-wireframes-v2.md
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colorSystem, spacing, borderRadius, typography, getTheme } from '@/core/theme';
import type { RealityCheckData } from '@/features/practices/types/flows';

export type AcceptanceLevel = RealityCheckData['acceptanceLevel'];
export type FlowTheme = 'morning' | 'midday' | 'evening';

interface AcceptanceOption {
  value: AcceptanceLevel;
  label: string;
  description: string;
}

const ACCEPTANCE_OPTIONS: AcceptanceOption[] = [
  {
    value: 'full',
    label: 'I can accept this as it is',
    description: 'Accepting reality as it is, ready to respond from clarity',
  },
  {
    value: 'aware_resistance',
    label: 'I notice I\'m resisting',
    description: 'Awareness of resistance without judgment',
  },
  {
    value: 'struggling',
    label: 'I\'m struggling to accept',
    description: 'Honest acknowledgment of difficulty',
  },
];

interface GraduatedAcceptanceSelectorProps {
  /** Currently selected acceptance level */
  value: AcceptanceLevel | null;
  /** Callback when selection changes */
  onChange: (value: AcceptanceLevel) => void;
  /** Flow theme for styling */
  theme?: FlowTheme;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * GraduatedAcceptanceSelector - 3-level acceptance radio selector
 *
 * @example
 * <GraduatedAcceptanceSelector
 *   value={acceptanceLevel}
 *   onChange={setAcceptanceLevel}
 *   theme="midday"
 * />
 */
export const GraduatedAcceptanceSelector: React.FC<GraduatedAcceptanceSelectorProps> = ({
  value,
  onChange,
  theme = 'midday',
  disabled = false,
  testID = 'graduated-acceptance-selector',
}) => {
  const themeColors = getTheme(theme);

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.sectionLabel}>How are you relating to this situation?</Text>
      {ACCEPTANCE_OPTIONS.map((option) => {
        const isSelected = value === option.value;

        return (
          <Pressable
            key={option.value}
            style={({ pressed }) => [
              styles.optionButton,
              isSelected && [
                styles.optionButtonSelected,
                { borderColor: themeColors.primary, backgroundColor: themeColors.background },
              ],
              pressed && !disabled && styles.optionButtonPressed,
              disabled && styles.optionButtonDisabled,
            ]}
            onPress={() => !disabled && onChange(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected, disabled }}
            accessibilityLabel={`${option.label}. ${option.description}`}
            testID={`acceptance-option-${option.value}`}
          >
            {/* Radio indicator */}
            <View
              style={[
                styles.radioOuter,
                isSelected && { borderColor: themeColors.primary },
              ]}
            >
              {isSelected && (
                <View
                  style={[
                    styles.radioInner,
                    { backgroundColor: themeColors.primary },
                  ]}
                />
              )}
            </View>

            {/* Option text */}
            <View style={styles.optionTextContainer}>
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && { color: themeColors.primary },
                ]}
              >
                {option.label}
              </Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[16],
  },
  sectionLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.gray[700],
    marginBottom: spacing[12],
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[16],
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    borderColor: colorSystem.gray[200],
    marginBottom: spacing[8],
    minHeight: 72, // Accessible touch target
  },
  optionButtonSelected: {
    borderWidth: 2,
  },
  optionButtonPressed: {
    opacity: 0.8,
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colorSystem.gray[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[12],
    marginTop: spacing[4],
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[4],
  },
  optionDescription: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    lineHeight: typography.caption.size * 1.4,
  },
});

export default GraduatedAcceptanceSelector;
