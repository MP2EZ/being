import React, { memo, useCallback, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, PlatformColor } from 'react-native';
// TEMPORARY FIX: Disable Reanimated to resolve Hermes property 'S' error
// import Animated, {
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
//   withSequence,
//   withTiming,
//   interpolate
// } from 'react-native-reanimated';

// Temporary replacement with standard View
const Animated = { View: require('react-native').View };
const useAnimatedStyle = () => ({});
const useSharedValue = (initial: any) => ({ value: initial });
const withSpring = (value: any) => value;
const withSequence = (...values: any[]) => values[0];
const withTiming = (value: any, config?: any) => value;
const interpolate = (value: any, input: any[], output: any[]) => output[0];
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics, useHaptics } from '../../hooks/useHaptics';
import { useThemeColors } from '../../contexts/ThemeContext';
import { borderRadius } from '../../constants/colors';
import type { ButtonProps } from '../../types/ui';

export const Button: React.FC<ButtonProps> = memo(({
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
  const themeColors = useThemeColors();
  const { onPress: hapticPress } = useCommonHaptics();
  const { triggerHaptic } = useHaptics();

  // Therapeutic animation values for visual feedback
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(1);
  const breathingScale = useSharedValue(1);

  // Therapeutic breathing animation for calming effect
  React.useEffect(() => {
    if (emergency || variant === 'crisis' || variant === 'emergency') {
      // Subtle breathing animation for crisis buttons to reduce anxiety
      breathingScale.value = withSequence(
        withTiming(1.02, { duration: 2000 }),
        withTiming(1.0, { duration: 2000 })
      );
    }
  }, [emergency, variant, breathingScale]);

  // Memoized press handler with therapeutic animations
  const handlePress = useCallback(async () => {
    if (disabled || loading) return;

    // Therapeutic press animation - smooth scaling for mindful interaction
    scaleValue.value = withSequence(
      withSpring(0.95, {
        damping: 15,
        stiffness: 300,
        mass: 0.8
      }),
      withSpring(1, {
        damping: 15,
        stiffness: 300,
        mass: 0.8
      })
    );

    // Optimized haptic feedback for crisis response timing (<200ms)
    if (haptic) {
      if (emergency || variant === 'emergency' || variant === 'crisis') {
        // Heavy haptic for emergency - fire and forget for speed
        triggerHaptic('heavy').catch(() => {}); // Non-blocking
      } else {
        hapticPress().catch(() => {}); // Non-blocking
      }
    }

    // Execute press immediately without waiting for haptic
    onPress?.();
  }, [disabled, loading, haptic, emergency, variant, triggerHaptic, hapticPress, onPress, scaleValue]);

  // Memoized color calculations for React Native performance
  const getBackgroundColor = useCallback(() => {
    if (disabled) {
      return colorSystem.gray[300];
    }

    // Use theme context colors for time-adaptive theming
    if (theme && themeColors) {
      return variant === 'success' ? themeColors.success : themeColors.primary;
    }

    // Enhanced crisis color system for emergency situations
    switch (variant) {
      case 'primary':
        return themeColors?.primary || colorSystem.status.info;
      case 'secondary':
        return colorSystem.gray[200];
      case 'outline':
        return 'transparent';
      case 'success':
        return themeColors?.success || colorSystem.status.success;
      case 'emergency':
      case 'crisis':
        return themeColors?.crisis || colorSystem.status.critical;
      default:
        return themeColors?.primary || colorSystem.status.info;
    }
  }, [disabled, theme, themeColors, variant, colorSystem]);

  const getTextColor = useCallback(() => {
    if (disabled) {
      return colorSystem.gray[500];
    }

    if (theme || variant === 'primary' || variant === 'success' || variant === 'emergency' || variant === 'crisis') {
      return themeColors?.text === '#FFFFFF' ? '#1B2951' : 'white'; // High contrast for accessibility
    }

    return themeColors?.text || colorSystem.base.black;
  }, [disabled, theme, variant, themeColors, colorSystem]);

  const backgroundColor = getBackgroundColor();
  const textColor = getTextColor();

  // Therapeutic animation styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleValue.value * breathingScale.value }
    ],
    opacity: opacityValue.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
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
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading
      }}
      accessibilityValue={loading ? { text: "Loading, please wait" } : undefined}
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
    </Animated.View>
  );
});

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