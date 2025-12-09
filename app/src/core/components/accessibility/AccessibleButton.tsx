/**
 * ACCESSIBLE BUTTON COMPONENT
 * 
 * WCAG 2.1 AA compliant button component with:
 * - Minimum 44x44 touch targets (WCAG 2.5.5 Level AAA)
 * - Proper accessibility roles and states
 * - Focus indicators (WCAG 2.4.7)
 * - Color contrast compliance (WCAG 1.4.3)
 * 
 * Usage:
 * ```tsx
 * <AccessibleButton
 *   onPress={handlePress}
 *   label="Continue"
 *   variant="primary"
 *   disabled={!isValid}
 * />
 * ```
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  AccessibilityState,
  View,
} from 'react-native';
import {
  ACCESSIBLE_COLORS,
  TOUCH_TARGETS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  FOCUS_STYLES,
  A11Y_ROLES,
} from '@/core/theme/accessibility';
import { typography } from '@/core/theme/colors';

export interface AccessibleButtonProps {
  /** Button press handler */
  onPress: () => void;
  
  /** Accessible label (read by screen readers) */
  label: string;
  
  /** Optional hint for screen readers (describes what happens when pressed) */
  accessibilityHint?: string;
  
  /** Whether button is disabled */
  disabled?: boolean;
  
  /** Button visual variant */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'icon' | 'text';
  
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  
  /** Icon text (emoji or symbol) - shown instead of label for icon variant */
  icon?: string;
  
  /** Test ID for testing */
  testID?: string;
  
  /** Custom styles */
  style?: ViewStyle;
  
  /** Custom text styles */
  textStyle?: TextStyle;
  
  /** Loading state */
  loading?: boolean;
}

/**
 * Accessible button component that meets WCAG 2.1 Level AA standards
 */
export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  onPress,
  label,
  accessibilityHint,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  icon,
  testID,
  style,
  textStyle,
  loading = false,
}) => {
  const [focused, setFocused] = useState(false);

  // Build accessibility state
  const accessibilityState: AccessibilityState = {
    disabled: disabled || loading,
    busy: loading,
  };

  // Determine if button should show icon or text
  const isIconButton = variant === 'icon' || !!icon;

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole={A11Y_ROLES.button}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.base,
        styles[`size_${size}`],
        isIconButton ? styles.icon : styles[`variant_${variant}`],
        disabled && styles.disabled,
        focused && styles.focused,
        style,
      ]}
    >
      {loading ? (
        <Text style={[styles.text, styles.loadingText]}>...</Text>
      ) : isIconButton ? (
        <Text style={[styles.iconText, textStyle]}>{icon}</Text>
      ) : (
        <Text
          style={[
            styles.text,
            styles[`text_${variant}`],
            disabled && styles.textDisabled,
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ========================================
  // BASE STYLES
  // ========================================
  
  base: {
    minWidth: TOUCH_TARGETS.minimum,
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  
  // ========================================
  // SIZE VARIANTS
  // ========================================
  
  size_small: {
    minWidth: TOUCH_TARGETS.minimum,
    minHeight: TOUCH_TARGETS.minimum,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  
  size_medium: {
    minWidth: TOUCH_TARGETS.minimum,
    minHeight: TOUCH_TARGETS.recommended,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  
  size_large: {
    minWidth: TOUCH_TARGETS.recommended,
    minHeight: TOUCH_TARGETS.large,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  
  // ========================================
  // BUTTON VARIANTS
  // ========================================
  
  variant_primary: {
    backgroundColor: ACCESSIBLE_COLORS.eveningPrimary,
  },
  
  variant_secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: ACCESSIBLE_COLORS.borderDefault,
  },
  
  variant_tertiary: {
    backgroundColor: ACCESSIBLE_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ACCESSIBLE_COLORS.borderDefault,
  },
  
  variant_text: {
    backgroundColor: 'transparent',
    minWidth: TOUCH_TARGETS.minimum,
    paddingHorizontal: SPACING.xs,
  },
  
  icon: {
    width: TOUCH_TARGETS.minimum,
    height: TOUCH_TARGETS.minimum,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'transparent',
    padding: 0,
  },
  
  // ========================================
  // STATE STYLES
  // ========================================
  
  disabled: {
    backgroundColor: ACCESSIBLE_COLORS.textDisabled,
    opacity: 0.6,
  },
  
  focused: {
    ...FOCUS_STYLES.default,
  },
  
  // ========================================
  // TEXT STYLES
  // ========================================
  
  text: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textAlign: 'center',
  },
  
  text_primary: {
    color: ACCESSIBLE_COLORS.textWhite,
  },
  
  text_secondary: {
    color: ACCESSIBLE_COLORS.textPrimary,
  },
  
  text_tertiary: {
    color: ACCESSIBLE_COLORS.textPrimary,
  },
  
  text_text: {
    color: ACCESSIBLE_COLORS.eveningPrimary,
  },
  
  textDisabled: {
    color: ACCESSIBLE_COLORS.textWhite,
  },
  
  iconText: {
    fontSize: typography.headline4.size,
    color: ACCESSIBLE_COLORS.textPrimary,
  },
  
  loadingText: {
    color: ACCESSIBLE_COLORS.textWhite,
  },
});

export default AccessibleButton;
