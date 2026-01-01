/**
 * GRATITUDE INPUT SECTION COMPONENT
 *
 * MAINT-140: Shared gratitude input section for morning/evening flows.
 * Supports optional validation mode for character minimum requirements.
 *
 * Design Philosophy:
 * - Low friction: 1 required, 2 optional (not 3 required)
 * - Progressive disclosure for additional gratitudes
 * - Optional character validation for deeper reflection (evening)
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "When you arise in the morning, think of what a precious
 *   privilege it is to be alive" (Meditations 2:1)
 * - Epictetus: "He is a wise man who does not grieve for the things which he has
 *   not, but rejoices for those which he has"
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { AccessibleInput } from '@/core/components/accessibility/AccessibleInput';
import { spacing, borderRadius, typography, colorSystem } from '@/core/theme';

export type GratitudeTheme = 'morning' | 'evening';

export interface GratitudeInputSectionProps {
  /** Theme for styling */
  theme: GratitudeTheme;
  /** Primary gratitude value */
  value: string;
  /** Callback when primary gratitude changes */
  onChangeValue: (value: string) => void;
  /** Additional gratitude values */
  additionalValues?: string[];
  /** Callback when additional gratitudes change */
  onChangeAdditionalValues?: (values: string[]) => void;
  /** Whether to show additional gratitude inputs */
  showAdditional?: boolean;
  /** Callback when "Add more" is pressed */
  onShowAdditional?: () => void;
  /** Enable validation mode (character minimum) */
  validationMode?: boolean;
  /** Minimum characters required in validation mode */
  minChars?: number;
  /** Test ID prefix */
  testIDPrefix: string;
}

/**
 * GratitudeInputSection - Shared gratitude input component
 * Used by morning (GratitudeIntentionScreen) and evening (GratitudeScreen) flows.
 */
export const GratitudeInputSection: React.FC<GratitudeInputSectionProps> = ({
  theme,
  value,
  onChangeValue,
  additionalValues = [],
  onChangeAdditionalValues,
  showAdditional = false,
  onShowAdditional,
  validationMode = false,
  minChars = 10,
  testIDPrefix,
}) => {
  const themeColors = colorSystem.themes[theme];

  const handleAdditionalChange = (index: number, newValue: string) => {
    if (onChangeAdditionalValues) {
      const newValues = [...additionalValues];
      newValues[index] = newValue;
      onChangeAdditionalValues(newValues);
    }
  };

  const isValidPrimary = !validationMode || value.trim().length >= minChars;
  const showCharCount = validationMode && value.length > 0 && value.length < minChars;

  return (
    <View style={styles.container}>
      {/* Primary Gratitude Input */}
      <View style={styles.inputSection}>
        {validationMode ? (
          // Evening-style: Uses AccessibleInput with validation
          <>
            <AccessibleInput
              label=""
              value={value}
              onChangeText={onChangeValue}
              placeholder="I'm grateful for..."
              multiline
              numberOfLines={2}
              testID={`${testIDPrefix}-1`}
              containerStyle={styles.inputContainer}
              inputStyle={styles.input}
            />
            {/* Character counter for validation feedback */}
            {showCharCount && (
              <Text style={styles.charCount}>
                {value.length}/{minChars} characters
              </Text>
            )}
          </>
        ) : (
          // Morning-style: Simple TextInput with required label
          <>
            <Text style={styles.inputLabel}>I'm grateful for...</Text>
            <Text style={[styles.requiredIndicator, { color: themeColors.primary }]}>
              Required
            </Text>
            <TextInput
              style={styles.textInput}
              value={value}
              onChangeText={onChangeValue}
              placeholder="Something you appreciate right now..."
              placeholderTextColor={colorSystem.gray[400]}
              testID={`${testIDPrefix}-1`}
              accessibilityLabel="Primary gratitude, required"
              multiline
              textAlignVertical="top"
            />
          </>
        )}
      </View>

      {/* Add More Button or Additional Gratitudes */}
      {!showAdditional && onShowAdditional ? (
        <TouchableOpacity
          style={styles.addMoreButton}
          onPress={onShowAdditional}
          accessibilityRole="button"
          accessibilityLabel="Add more gratitudes"
          testID={`${testIDPrefix}-add-more`}
        >
          <Text style={[styles.addMoreButtonText, { color: themeColors.primary }]}>
            + Add more gratitudes (optional)
          </Text>
        </TouchableOpacity>
      ) : showAdditional && additionalValues.length > 0 ? (
        <View style={styles.additionalSection}>
          {additionalValues.map((gratitude, index) => (
            <View key={index} style={styles.additionalInputWrapper}>
              {validationMode ? (
                <AccessibleInput
                  label={index === 0 ? 'Add another' : 'One more'}
                  helperText="optional"
                  value={gratitude}
                  onChangeText={(newValue) => handleAdditionalChange(index, newValue)}
                  placeholder={index === 0 ? 'Something else...' : 'And one more...'}
                  multiline
                  numberOfLines={2}
                  testID={`${testIDPrefix}-${index + 2}`}
                  containerStyle={styles.inputContainer}
                  inputStyle={styles.input}
                  labelStyle={styles.inputLabelEvening}
                />
              ) : (
                <TextInput
                  style={styles.additionalInput}
                  value={gratitude}
                  onChangeText={(newValue) => handleAdditionalChange(index, newValue)}
                  placeholder="Another gratitude..."
                  placeholderTextColor={colorSystem.gray[400]}
                  testID={`${testIDPrefix}-${index + 2}`}
                  accessibilityLabel={`Additional gratitude ${index + 1}, optional`}
                  multiline
                  textAlignVertical="top"
                />
              )}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container for the entire section
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
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[4],
  },
  inputLabelEvening: {
    color: colorSystem.base.black,
  },
  requiredIndicator: {
    fontSize: typography.caption.size,
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
  charCount: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    textAlign: 'right',
    marginTop: spacing[4],
  },
  addMoreButton: {
    marginBottom: spacing[16],
    padding: spacing[12],
    alignItems: 'flex-start',
  },
  addMoreButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
  },
  additionalSection: {
    marginBottom: spacing[16],
  },
  additionalInputWrapper: {
    marginBottom: spacing[12],
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
});

export default GratitudeInputSection;
