/**
 * NewArchButton - New Architecture Optimized Button Component
 *
 * Designed specifically for React Native New Architecture compatibility
 * with therapeutic timing requirements and clinical safety features.
 */

import React, { memo } from 'react';
import { Pressable, Text, StyleSheet, PlatformColor } from 'react-native';

interface NewArchButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'crisis' | 'therapeutic';
  disabled?: boolean;
  emergency?: boolean;
  style?: any;
  accessibilityLabel?: string;
}

export const NewArchButton: React.FC<NewArchButtonProps> = memo(({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  emergency = false,
  style,
  accessibilityLabel,
}) => {
  // Direct color definitions (no context dependencies)
  const getButtonStyle = (pressed: boolean) => {
    const baseStyle = [styles.button];

    // Variant styles
    switch (variant) {
      case 'crisis':
        baseStyle.push(styles.crisis);
        if (emergency) baseStyle.push(styles.emergency);
        break;
      case 'therapeutic':
        baseStyle.push(styles.therapeutic);
        break;
      case 'secondary':
        baseStyle.push(styles.secondary);
        break;
      default:
        baseStyle.push(styles.primary);
    }

    // Pressed state (platform-native handling)
    if (pressed) {
      baseStyle.push(styles.pressed);
    }

    // Disabled state
    if (disabled) {
      baseStyle.push(styles.disabled);
    }

    // Custom style override
    if (style) {
      baseStyle.push(style);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text];

    switch (variant) {
      case 'crisis':
        baseStyle.push(styles.crisisText);
        break;
      case 'therapeutic':
        baseStyle.push(styles.therapeuticText);
        break;
      case 'secondary':
        baseStyle.push(styles.secondaryText);
        break;
      default:
        baseStyle.push(styles.primaryText);
    }

    if (disabled) {
      baseStyle.push(styles.disabledText);
    }

    return baseStyle;
  };

  return (
    <Pressable
      style={({ pressed }) => getButtonStyle(pressed)}
      onPress={onPress}
      disabled={disabled}
      // Accessibility optimized for clinical use
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : 'Button')}
      accessibilityState={{ disabled }}
      // Therapeutic timing optimization
      delayPressIn={0}
      delayPressOut={0}
      // Platform-native feedback
      android_ripple={variant === 'crisis' ? {
        color: '#fff',
        radius: 32,
        borderless: false
      } : {
        color: 'rgba(0,0,0,0.1)',
        radius: 28,
        borderless: false
      }}
    >
      <Text style={getTextStyle()}>
        {children}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    // Clinical accessibility - larger touch targets
    minHeight: 52,
    minWidth: 120,
  },
  // Variant styles
  primary: {
    backgroundColor: '#4A7C59',
  },
  secondary: {
    backgroundColor: '#6BA6CD',
  },
  crisis: {
    backgroundColor: '#E53E3E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  therapeutic: {
    backgroundColor: '#38B2AC',
  },
  emergency: {
    backgroundColor: '#C53030',
    borderWidth: 3,
    borderColor: '#fff',
  },
  // State styles
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    backgroundColor: '#A0AEC0',
    opacity: 0.6,
  },
  // Text styles
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#FFFFFF',
  },
  crisisText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  therapeuticText: {
    color: '#FFFFFF',
  },
  disabledText: {
    color: '#718096',
  },
});

NewArchButton.displayName = 'NewArchButton';