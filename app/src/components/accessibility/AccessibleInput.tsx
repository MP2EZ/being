/**
 * ACCESSIBLE INPUT COMPONENT
 * 
 * WCAG 2.1 AA compliant text input component with:
 * - Proper accessibility labels and hints
 * - Color contrast compliance (WCAG 1.4.3)
 * - Focus indicators (WCAG 2.4.7)
 * - Error announcements (WCAG 3.3.1)
 * - Touch target sizing (44x44 minimum)
 * 
 * Usage:
 * ```tsx
 * <AccessibleInput
 *   label="Brief Reflection"
 *   value={reflection}
 *   onChangeText={setReflection}
 *   placeholder="Enter your thoughts..."
 *   required
 *   multiline
 *   error={validationError}
 * />
 * ```
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import {
  ACCESSIBLE_COLORS,
  TOUCH_TARGETS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  FOCUS_STYLES,
  A11Y_ROLES,
  A11Y_LIVE_REGIONS,
} from '../../theme/accessibility';

export interface AccessibleInputProps extends Omit<TextInputProps, 'style'> {
  /** Visible label text */
  label: string;
  
  /** Helper text shown below input */
  helperText?: string;
  
  /** Error message (shows if present) */
  error?: string;
  
  /** Whether field is required */
  required?: boolean;
  
  /** Custom container styles */
  containerStyle?: ViewStyle;
  
  /** Custom input styles */
  inputStyle?: TextStyle;
  
  /** Custom label styles */
  labelStyle?: TextStyle;
}

/**
 * Accessible text input component that meets WCAG 2.1 Level AA standards
 */
export const AccessibleInput: React.FC<AccessibleInputProps> = ({
  label,
  helperText,
  error,
  required = false,
  containerStyle,
  inputStyle,
  labelStyle,
  ...textInputProps
}) => {
  const [focused, setFocused] = useState(false);
  const hasError = !!error;

  // Build accessibility label
  const accessibilityLabel = `${label}${required ? ', required' : ''}`;
  
  // Build accessibility hint
  const accessibilityHint = textInputProps.accessibilityHint || 
    (helperText ? helperText : undefined);

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      <View style={styles.labelContainer}>
        <Text
          style={[styles.label, labelStyle]}
          accessibilityRole={A11Y_ROLES.text}
        >
          {label}
        </Text>
        {required && (
          <Text style={styles.required} accessibilityLabel="required">
            {' '}*
          </Text>
        )}
      </View>

      {/* Helper Text */}
      {helperText && !hasError && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}

      {/* Text Input */}
      <TextInput
        {...textInputProps}
        accessible={true}
        accessibilityRole={A11Y_ROLES.text}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRequired={required}
        accessibilityState={{
          disabled: textInputProps.editable === false,
        }}
        onFocus={(e) => {
          setFocused(true);
          textInputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          textInputProps.onBlur?.(e);
        }}
        style={[
          styles.input,
          textInputProps.multiline && styles.inputMultiline,
          focused && styles.inputFocused,
          hasError && styles.inputError,
          textInputProps.editable === false && styles.inputDisabled,
          inputStyle,
        ]}
        placeholderTextColor={ACCESSIBLE_COLORS.textHelper}
      />

      {/* Error Message */}
      {hasError && (
        <Text
          style={styles.errorText}
          accessibilityRole={A11Y_ROLES.alert}
          accessibilityLiveRegion={A11Y_LIVE_REGIONS.polite}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  
  label: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: ACCESSIBLE_COLORS.textPrimary,
  },
  
  required: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: ACCESSIBLE_COLORS.error,
  },
  
  helperText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: ACCESSIBLE_COLORS.textHelper, // Fixed from #999 to #6B6B6B (5.5:1)
    fontStyle: 'italic',
    marginBottom: SPACING.xs,
  },
  
  input: {
    minHeight: TOUCH_TARGETS.minimum,
    backgroundColor: ACCESSIBLE_COLORS.bgPrimary,
    borderWidth: 2,
    borderColor: ACCESSIBLE_COLORS.borderDefault, // Fixed from #ddd to #B0B0B0 (3.3:1)
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.base,
    color: ACCESSIBLE_COLORS.textPrimary,
  },
  
  inputMultiline: {
    minHeight: 100,
    paddingTop: SPACING.sm,
    textAlignVertical: 'top',
  },
  
  inputFocused: {
    ...FOCUS_STYLES.default,
  },
  
  inputError: {
    borderColor: ACCESSIBLE_COLORS.borderError,
    borderWidth: 2,
  },
  
  inputDisabled: {
    backgroundColor: ACCESSIBLE_COLORS.bgCard,
    color: ACCESSIBLE_COLORS.textDisabled,
  },
  
  errorText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: ACCESSIBLE_COLORS.error, // Fixed from #d64545 to #C92A2A (4.5:1)
    marginTop: SPACING.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});

export default AccessibleInput;
