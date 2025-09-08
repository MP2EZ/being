import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { borderRadius } from '../../constants/colors';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'success';
  onPress?: () => void;
  disabled?: boolean;
  theme?: 'morning' | 'midday' | 'evening' | null;
  fullWidth?: boolean;
  loading?: boolean;
  haptic?: boolean;
  style?: any;
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
  style
}) => {
  const { colorSystem } = useTheme();
  const { onPress: hapticPress } = useCommonHaptics();
  
  const handlePress = async () => {
    if (disabled || loading) return;
    
    if (haptic) {
      await hapticPress();
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
    
    return (variant === 'primary' || variant === 'success') 
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
        style
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{children}</Text>
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
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
});