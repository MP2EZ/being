/**
 * TextInput Component - MBCT-Compliant Form Input
 * Provides accessible, therapeutic-grade text input with proper validation
 */

import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  Platform
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing } from '../../constants/colors';

interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  theme?: 'morning' | 'midday' | 'evening' | null;
  variant?: 'default' | 'outline' | 'filled';
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  style?: any;
  inputStyle?: any;
  containerStyle?: any;
  required?: boolean;
  // Accessibility props
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(({
  label,
  error,
  helperText,
  disabled = false,
  theme = null,
  variant = 'outline',
  leftElement,
  rightElement,
  style,
  inputStyle,
  containerStyle,
  required = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  ...textInputProps
}, ref) => {
  const { colorSystem } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    textInputProps.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    textInputProps.onBlur?.(e);
  };

  const getContainerStyle = () => {
    const baseStyle = {
      borderColor: colorSystem.gray[300],
      backgroundColor: 'transparent',
    };

    if (disabled) {
      return {
        ...baseStyle,
        borderColor: colorSystem.gray[200],
        backgroundColor: colorSystem.gray[50],
      };
    }

    if (error) {
      return {
        ...baseStyle,
        borderColor: colorSystem.status.error,
        backgroundColor: colorSystem.status.error + '10',
      };
    }

    if (isFocused) {
      const focusColor = theme
        ? colorSystem.themes[theme].primary
        : colorSystem.accessibility.focus.primary;
      return {
        ...baseStyle,
        borderColor: focusColor,
        backgroundColor: focusColor + '05',
      };
    }

    if (variant === 'filled') {
      return {
        ...baseStyle,
        backgroundColor: colorSystem.gray[50],
        borderColor: 'transparent',
      };
    }

    return baseStyle;
  };

  const getTextColor = () => {
    if (disabled) {
      return colorSystem.gray[400];
    }
    return colorSystem.base.black;
  };

  const getPlaceholderColor = () => {
    if (disabled) {
      return colorSystem.gray[300];
    }
    return colorSystem.gray[500];
  };

  const containerStyleComputed = getContainerStyle();
  const textColor = getTextColor();
  const placeholderColor = getPlaceholderColor();

  const inputAccessibilityLabel = accessibilityLabel || label;
  const inputAccessibilityHint = accessibilityHint || (
    error
      ? `${helperText || ''} Error: ${error}`.trim()
      : helperText
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <Text style={[styles.label, { color: textColor }]}>
          {label}
          {required && <Text style={styles.requiredIndicator}> *</Text>}
        </Text>
      )}

      {/* Input Container */}
      <View style={[
        styles.inputContainer,
        containerStyleComputed,
        style
      ]}>
        {/* Left Element */}
        {leftElement && (
          <View style={styles.leftElement}>
            {leftElement}
          </View>
        )}

        {/* Text Input */}
        <RNTextInput
          ref={ref}
          style={[
            styles.input,
            { color: textColor },
            leftElement && styles.inputWithLeftElement,
            rightElement && styles.inputWithRightElement,
            inputStyle
          ]}
          placeholderTextColor={placeholderColor}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessible={true}
          accessibilityLabel={inputAccessibilityLabel}
          accessibilityHint={inputAccessibilityHint}
          accessibilityState={{
            disabled
          }}
          // Note: 'invalid' and 'required' are not valid React Native accessibilityState properties
          // We handle these through accessibilityHint and aria-describedby pattern
          testID={testID}
          // iOS specific accessibility
          {...(Platform.OS === 'ios' && {
            accessibilityRole: 'none', // Let TextInput handle its own role
          })}
          {...textInputProps}
        />

        {/* Right Element */}
        {rightElement && (
          <View style={styles.rightElement}>
            {rightElement}
          </View>
        )}
      </View>

      {/* Helper Text / Error */}
      {(error || helperText) && (
        <View style={styles.helperContainer}>
          <Text
            style={[
              styles.helperText,
              error ? styles.errorText : { color: colorSystem.gray[600] }
            ]}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={error ? `Error: ${error}` : `Helper text: ${helperText}`}
          >
            {error || helperText}
          </Text>
        </View>
      )}
    </View>
  );
});

TextInput.displayName = 'TextInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  requiredIndicator: {
    color: '#DC2626', // Red-600
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.medium,
    minHeight: 48, // WCAG AA compliant touch target
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    // Remove default padding on Android to maintain consistent height
    ...(Platform.OS === 'android' && {
      paddingTop: 0,
      paddingBottom: 0,
      textAlignVertical: 'center',
    }),
  },
  inputWithLeftElement: {
    marginLeft: spacing.sm,
  },
  inputWithRightElement: {
    marginRight: spacing.sm,
  },
  leftElement: {
    flexShrink: 0,
  },
  rightElement: {
    flexShrink: 0,
  },
  helperContainer: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 16,
  },
  errorText: {
    color: '#DC2626', // Red-600
  },
});

export default TextInput;