/**
 * Button Component - PRESSABLE PERFORMANCE OPTIMIZATION
 * New Architecture compatible with therapeutic timing requirements
 *
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Full Reanimated worklet integration for crisis response timing
 * 2. Memory-efficient animation lifecycle management
 * 3. Anxiety-adaptive haptic coordination with precise timing
 * 4. Optimized Android ripple effects for New Architecture
 * 5. Therapeutic accessibility with reduced motion support
 */

import React, { memo, useCallback, useRef, useState, useEffect } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, AccessibilityInfo, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  runOnJS,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics, useHaptics } from '../../hooks/useHaptics';
import { useThemeColors } from '../../contexts/ThemeContext';
import { borderRadius } from '../../constants/colors';
import { useTherapeuticMemoryManagement } from '../../utils/TherapeuticMemoryManager';
import { usePerformanceTracking } from '../../utils/PerformanceMonitor';
import type { ButtonProps } from '../../types/ui';

// Therapeutic animation configurations
const THERAPEUTIC_ANIMATION_CONFIG = {
  CRISIS_SPRING: {
    damping: 20,
    stiffness: 400,
    mass: 0.8,
  },
  STANDARD_SPRING: {
    damping: 15,
    stiffness: 300,
    mass: 0.8,
  },
  ANXIETY_SPRING: {
    damping: 25,
    stiffness: 200,
    mass: 1.2,
  },
  TIMING: {
    CRISIS_RESPONSE_TARGET: 200, // 200ms crisis response target
    HAPTIC_LEAD_TIME: 50, // 50ms haptic lead for coordination
    ANXIETY_ADAPTATION_DELAY: 150, // 150ms for anxiety adaptation
    THERAPEUTIC_HOLD_DURATION: 100, // 100ms therapeutic hold
  }
} as const;

/**
 * High-performance Button component with therapeutic timing optimization
 */
export const Button: React.FC<ButtonProps> = memo<ButtonProps>(({
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

  // Performance and memory management
  const { registerAnimation, cleanupAnimation } = useTherapeuticMemoryManagement();
  const { trackCrisisResponse } = usePerformanceTracking();

  // Accessibility state management
  const [isReducedMotionEnabled, setIsReducedMotionEnabled] = useState(false);
  const [isHighContrastEnabled, setIsHighContrastEnabled] = useState(false);

  // Animation and timing refs
  const interactionStartTime = useRef<number>(0);
  const animationId = useRef<string>(`button_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const hapticTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Worklet-controlled animation values
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(1);
  const pressProgress = useSharedValue(0);
  const breathingScale = useSharedValue(1);
  const rippleProgress = useSharedValue(0);

  // Crisis/emergency button breathing animation
  const isCrisisButton = emergency || variant === 'crisis' || variant === 'emergency';

  // Accessibility preferences detection
  useEffect(() => {
    const checkAccessibilityPreferences = async () => {
      try {
        const reducedMotion = await AccessibilityInfo.isReduceMotionEnabled();
        setIsReducedMotionEnabled(reducedMotion);

        const boldText = await AccessibilityInfo.isBoldTextEnabled();
        setIsHighContrastEnabled(boldText);
      } catch (error) {
        console.warn('Accessibility preferences detection failed:', error);
      }
    };

    checkAccessibilityPreferences();

    const reducedMotionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReducedMotionEnabled
    );
    const boldTextListener = AccessibilityInfo.addEventListener(
      'boldTextChanged',
      setIsHighContrastEnabled
    );

    return () => {
      reducedMotionListener?.remove();
      boldTextListener?.remove();
    };
  }, []);

  // Register animations for memory management
  useEffect(() => {
    const sharedValues = [scaleValue, opacityValue, pressProgress, breathingScale, rippleProgress];
    const context = isCrisisButton ? 'crisis_button' : 'standard_button';
    const priority = isCrisisButton ? 'critical' : 'medium';

    registerAnimation(
      animationId.current,
      sharedValues,
      [
        () => cancelAnimation(scaleValue),
        () => cancelAnimation(opacityValue),
        () => cancelAnimation(pressProgress),
        () => cancelAnimation(breathingScale),
        () => cancelAnimation(rippleProgress),
      ],
      context,
      priority
    );

    return () => {
      cleanupAnimation(animationId.current);
      if (hapticTimeoutRef.current) {
        clearTimeout(hapticTimeoutRef.current);
      }
    };
  }, [isCrisisButton, registerAnimation, cleanupAnimation]);

  // Crisis breathing animation effect
  useEffect(() => {
    if (isCrisisButton && !isReducedMotionEnabled && !loading) {
      // Subtle therapeutic breathing animation for crisis buttons
      const breathingAnimation = () => {
        breathingScale.value = withSequence(
          withTiming(1.02, {
            duration: 2000,
            easing: Easing.bezier(0.4, 0.0, 0.6, 1.0)
          }),
          withTiming(1.0, {
            duration: 2000,
            easing: Easing.bezier(0.4, 0.0, 0.6, 1.0)
          })
        );
      };

      breathingAnimation();
      const breathingInterval = setInterval(breathingAnimation, 4000);

      return () => clearInterval(breathingInterval);
    } else {
      breathingScale.value = 1.0;
    }
  }, [isCrisisButton, isReducedMotionEnabled, loading, breathingScale]);

  // Worklet-based therapeutic press animation
  const createTherapeuticPressAnimation = useCallback(() => {
    'worklet';

    if (isReducedMotionEnabled) {
      pressProgress.value = 1;
      return;
    }

    // Select animation configuration based on button type
    const springConfig = isCrisisButton
      ? THERAPEUTIC_ANIMATION_CONFIG.CRISIS_SPRING
      : THERAPEUTIC_ANIMATION_CONFIG.STANDARD_SPRING;

    // Crisis buttons get immediate response, others have therapeutic timing
    const responseDelay = isCrisisButton ? 0 : THERAPEUTIC_ANIMATION_CONFIG.TIMING.THERAPEUTIC_HOLD_DURATION;

    // Coordinated animation sequence
    pressProgress.value = withSequence(
      withTiming(1, {
        duration: isCrisisButton ? 100 : 150,
        easing: Easing.bezier(0.4, 0.0, 0.6, 1.0)
      }),
      withDelay(
        responseDelay,
        withSpring(0, springConfig)
      )
    );

    // Scale animation for visual feedback
    scaleValue.value = withSequence(
      withSpring(isCrisisButton ? 0.90 : 0.95, springConfig),
      withSpring(1.0, springConfig)
    );

    // Opacity feedback for therapeutic state awareness
    opacityValue.value = withSequence(
      withTiming(0.8, { duration: 80 }),
      withTiming(1.0, { duration: 120 })
    );

    // Ripple effect animation for Android
    if (Platform.OS === 'android') {
      rippleProgress.value = withSequence(
        withTiming(1, {
          duration: isCrisisButton ? 200 : 300,
          easing: Easing.out(Easing.quad)
        }),
        withTiming(0, { duration: 100 })
      );
    }
  }, [isCrisisButton, isReducedMotionEnabled, pressProgress, scaleValue, opacityValue, rippleProgress]);

  // Enhanced therapeutic press handler
  const handlePress = useCallback(async () => {
    if (disabled || loading) return;

    interactionStartTime.current = performance.now();

    // Execute therapeutic animation
    createTherapeuticPressAnimation();

    // Coordinate haptic feedback with precise timing
    if (haptic) {
      const hapticDelay = isCrisisButton
        ? 0 // Immediate haptic for crisis
        : THERAPEUTIC_ANIMATION_CONFIG.TIMING.HAPTIC_LEAD_TIME;

      hapticTimeoutRef.current = setTimeout(async () => {
        try {
          if (isCrisisButton) {
            await triggerHaptic('heavy');
          } else {
            await hapticPress();
          }
        } catch (error) {
          console.warn('Haptic feedback failed:', error);
        }
      }, hapticDelay);
    }

    // Calculate response timing for therapeutic validation
    const responseDelay = isCrisisButton
      ? THERAPEUTIC_ANIMATION_CONFIG.TIMING.CRISIS_RESPONSE_TARGET
      : THERAPEUTIC_ANIMATION_CONFIG.TIMING.ANXIETY_ADAPTATION_DELAY;

    // Execute press with therapeutic timing
    setTimeout(() => {
      const responseTime = performance.now() - interactionStartTime.current;

      // Track performance for crisis response validation
      if (isCrisisButton) {
        trackCrisisResponse(interactionStartTime.current, 'crisis_button_press');
      }

      // Execute the actual press handler
      onPress?.();

      // Log performance if response time is concerning
      if (responseTime > THERAPEUTIC_ANIMATION_CONFIG.TIMING.CRISIS_RESPONSE_TARGET && isCrisisButton) {
        console.warn(`⚠️ Crisis button response time: ${responseTime.toFixed(2)}ms (target: ${THERAPEUTIC_ANIMATION_CONFIG.TIMING.CRISIS_RESPONSE_TARGET}ms)`);
      }
    }, Math.max(0, responseDelay - (performance.now() - interactionStartTime.current)));

  }, [
    disabled,
    loading,
    haptic,
    isCrisisButton,
    triggerHaptic,
    hapticPress,
    trackCrisisResponse,
    onPress,
    createTherapeuticPressAnimation
  ]);

  // Memoized color calculations
  const getBackgroundColor = useCallback((): string => {
    if (disabled) {
      return colorSystem.gray[300];
    }

    if (theme && themeColors) {
      return variant === 'success' ? themeColors.success : themeColors.primary;
    }

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

  const getTextColor = useCallback((): string => {
    if (disabled) {
      return isHighContrastEnabled ? colorSystem.gray[700] : colorSystem.gray[500];
    }

    if (isHighContrastEnabled) {
      if (variant === 'outline') {
        return colorSystem.base.black;
      }
      return variant === 'secondary' ? colorSystem.base.black : 'white';
    }

    if (theme || variant === 'primary' || variant === 'success' || isCrisisButton) {
      return themeColors?.text === '#FFFFFF' ? '#1B2951' : 'white';
    }

    return themeColors?.text || colorSystem.base.black;
  }, [disabled, theme, variant, themeColors, colorSystem, isHighContrastEnabled, isCrisisButton]);

  const backgroundColor = getBackgroundColor();
  const textColor = getTextColor();

  // Optimized animated styles with worklet performance
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      pressProgress.value,
      [0, 1],
      [scaleValue.value * breathingScale.value, scaleValue.value * breathingScale.value * 0.98]
    );

    const opacity = interpolate(
      pressProgress.value,
      [0, 1],
      [opacityValue.value, opacityValue.value * 0.9]
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  }, []);

  // Pressable style function with enhanced feedback
  const pressableStyle = useCallback(({ pressed }: { pressed: boolean }) => [
    styles.button,
    {
      backgroundColor,
      borderColor: variant === 'outline' ? colorSystem.gray[300] : 'transparent',
      borderWidth: variant === 'outline' ? 1 : 0,
      // Enhanced Pressable visual feedback
      opacity: pressed ? 0.9 : 1.0,
      transform: pressed && !isReducedMotionEnabled ? [{ scale: 0.98 }] : [{ scale: 1.0 }],
    },
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    isCrisisButton && styles.emergencyButton,
    ...(Array.isArray(style) ? style : [style])
  ], [backgroundColor, variant, colorSystem, pressed, fullWidth, disabled, isCrisisButton, style, isReducedMotionEnabled]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={pressableStyle}
        onPress={handlePress}
        disabled={disabled || loading}
        accessible={true}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={
          accessibilityLabel ||
          (typeof children === 'string' ? children : undefined) ||
          (isCrisisButton ? 'Emergency assistance button' : 'Button')
        }
        accessibilityHint={
          accessibilityHint ||
          (isCrisisButton
            ? 'Double-tap to access emergency support immediately'
            : loading
              ? 'Please wait, action in progress'
              : 'Double-tap to activate')
        }
        accessibilityState={{
          disabled: disabled || loading,
          busy: loading,
          selected: variant === 'primary' && !disabled
        }}
        accessibilityValue={loading ? { text: "Loading, please wait" } : undefined}
        accessibilityLiveRegion={loading ? 'polite' : undefined}
        accessibilityElementsHidden={disabled}
        importantForAccessibility={disabled ? 'no-hide-descendants' : 'yes'}
        testID={testID}
        // Enhanced hit area for crisis situations
        hitSlop={
          isCrisisButton
            ? { top: 12, left: 12, bottom: 12, right: 12 }
            : { top: 8, left: 8, bottom: 8, right: 8 }
        }
        // Optimized Android ripple for New Architecture
        android_ripple={{
          color: isCrisisButton
            ? 'rgba(255, 255, 255, 0.3)'
            : backgroundColor === 'transparent'
              ? 'rgba(0, 0, 0, 0.1)'
              : 'rgba(255, 255, 255, 0.2)',
          borderless: false,
          radius: isCrisisButton ? 250 : 200,
          foreground: false,
        }}
        // iOS-specific enhancements
        {...(Platform.OS === 'ios' && {
          onPressIn: () => {
            if (!disabled && !loading && !isReducedMotionEnabled) {
              scaleValue.value = withSpring(0.96, THERAPEUTIC_ANIMATION_CONFIG.STANDARD_SPRING);
            }
          },
          onPressOut: () => {
            if (!disabled && !loading && !isReducedMotionEnabled) {
              scaleValue.value = withSpring(1.0, THERAPEUTIC_ANIMATION_CONFIG.STANDARD_SPRING);
            }
          }
        })}
      >
        {loading ? (
          <ActivityIndicator
            color={textColor}
            size={isCrisisButton ? 'large' : 'small'}
            accessibilityLabel="Loading"
          />
        ) : (
          <Text
            style={[
              styles.text,
              { color: textColor },
              isCrisisButton && styles.emergencyText,
              isHighContrastEnabled && styles.highContrastText
            ]}
            allowFontScaling={true}
            maxFontSizeMultiplier={2.5}
            accessible={true}
            accessibilityRole="text"
          >
            {children}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
});

Button.displayName = 'Button.PressableOptimized';

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 48, // WCAG AA compliant
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  emergencyButton: {
    minHeight: 56, // WCAG AAA for crisis situations
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
  emergencyText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    letterSpacing: 0.5,
  },
  highContrastText: {
    fontWeight: '600',
    fontSize: 17,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});

export default Button;