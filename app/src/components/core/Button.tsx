import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics, useHaptics } from '../../hooks/useHaptics';
import { borderRadius } from '../../constants/colors';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'emergency' | 'crisis';
  onPress?: () => void;
  disabled?: boolean;
  theme?: 'morning' | 'midday' | 'evening' | null;
  fullWidth?: boolean;
  loading?: boolean;
  haptic?: boolean;
  style?: any;
  // Accessibility props
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  testID?: string;
  emergency?: boolean; // Flag for crisis/emergency buttons
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  onPress,
  disabled = false,
  theme = null,
  fullWidth = true,
  loading = false,
  haptic = true,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  testID,
  emergency = false
}) => {
  const { colorSystem } = useTheme();
  const { onPress: hapticPress } = useCommonHaptics();
  const { triggerHaptic } = useHaptics();
  
  const handlePress = async () => {
    if (disabled || loading) return;
    
    if (haptic) {
      // Use stronger haptic feedback for emergency buttons
      if (emergency || variant === 'emergency' || variant === 'crisis') {
        await triggerHaptic('heavy');
      } else {
        await hapticPress();
      }
    }
    
    onPress?.();
  };

  const getBackgroundColor = () => {
    if (disabled) {
      return colorSystem.gray[300];
    }
    
    if (theme) {
      return variant === 'success' 
        ? colorSystem.themes[theme].success 
        : colorSystem.themes[theme].primary;
    }
    
    switch (variant) {
      case 'primary':
        return colorSystem.status.info;
      case 'secondary':
        return colorSystem.gray[200];
      case 'outline':
        return 'transparent';
      case 'success':
        return colorSystem.status.success;
      case 'emergency':
        return colorSystem.status.critical;
      case 'crisis':
        return colorSystem.status.error;
      default:
        return colorSystem.status.info;
    }
  };

  const getTextColor = () => {
    if (disabled) {
      return colorSystem.gray[500];
    }
    
    if (theme) {
      return 'white';
    }
    
    return (variant === 'primary' || variant === 'success' || variant === 'emergency' || variant === 'crisis') 
      ? 'white' 
      : colorSystem.base.black;
  };

  const backgroundColor = getBackgroundColor();
  const textColor = getTextColor();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor: variant === 'outline' ? colorSystem.gray[300] : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
        },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        (emergency || variant === 'emergency' || variant === 'crisis') && styles.emergencyButton,
        style
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled || loading}
      accessible={true}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
      accessibilityHint={accessibilityHint}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text 
          style={[
            styles.text, 
            { color: textColor },
            (emergency || variant === 'emergency' || variant === 'crisis') && styles.emergencyText
          ]}
          allowFontScaling={true}
          maxFontSizeMultiplier={2.0}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 48, // WCAG AA compliant touch target
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  emergencyButton: {
    minHeight: 52, // Larger touch target for crisis situations
    paddingVertical: 18,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
  emergencyText: {
    fontSize: 18,
    fontWeight: '700',
  },
});