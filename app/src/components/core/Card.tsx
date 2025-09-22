import React, { memo, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  withSequence,
  interpolateColor,
  Easing
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { useThemeColors } from '../../contexts/ThemeContext';
import { borderRadius, spacing } from '../../constants/colors';

interface CardProps {
  children: React.ReactNode;
  padding?: number;
  theme?: 'morning' | 'midday' | 'evening' | null;
  clickable?: boolean;
  onPress?: () => void;
  style?: any;
  moodResponsive?: boolean; // Enable mood-responsive animations
  breathingEffect?: boolean; // Enable subtle breathing animation
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = spacing.md,
  theme = null,
  clickable = false,
  onPress,
  style,
  moodResponsive = false,
  breathingEffect = false
}) => {
  const { colorSystem } = useTheme();

  // Therapeutic animation values
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(1);
  const breathingScale = useSharedValue(1);
  const shadowValue = useSharedValue(0);

  // Time-of-day adaptive entrance animation
  useEffect(() => {
    // Gentle entrance animation based on theme
    const animationDuration = theme === 'evening' ? 800 : theme === 'morning' ? 400 : 600;

    scaleValue.value = withSpring(1, {
      damping: 12,
      stiffness: 100,
      mass: 1
    });

    opacityValue.value = withTiming(1, {
      duration: animationDuration,
      easing: Easing.out(Easing.cubic)
    });

    shadowValue.value = withTiming(1, {
      duration: animationDuration * 1.2,
      easing: Easing.out(Easing.quad)
    });
  }, [theme]);

  // Breathing effect for therapeutic calming
  useEffect(() => {
    if (breathingEffect) {
      const breathDuration = theme === 'evening' ? 4000 : 3000; // Slower for evening

      breathingScale.value = withSequence(
        withTiming(1.01, {
          duration: breathDuration,
          easing: Easing.inOut(Easing.sine)
        }),
        withTiming(1.0, {
          duration: breathDuration,
          easing: Easing.inOut(Easing.sine)
        })
      );
    }
  }, [breathingEffect, theme]);
  
  const getBackgroundColor = () => {
    if (theme) {
      return colorSystem.themes[theme].background;
    }
    return colorSystem.base.white;
  };

  const getBorderColor = () => {
    if (theme) {
      return colorSystem.themes[theme].light;
    }
    return colorSystem.gray[300];
  };

  // Press handler with therapeutic timing
  const handlePress = useCallback(() => {
    if (!onPress) return;

    // Mindful press animation - encourages slower, more intentional interactions
    scaleValue.value = withSequence(
      withSpring(0.98, {
        damping: 15,
        stiffness: 400,
        mass: 0.8
      }),
      withSpring(1, {
        damping: 15,
        stiffness: 400,
        mass: 0.8
      })
    );

    onPress();
  }, [onPress, scaleValue]);

  // Animated styles for therapeutic UX
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleValue.value * breathingScale.value }
    ],
    opacity: opacityValue.value,
    shadowOpacity: 0.05 * shadowValue.value,
    elevation: 2 * shadowValue.value,
  }));

  const baseCardStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    padding,
  };

  if (clickable && onPress) {
    return (
      <Animated.View style={[styles.card, baseCardStyle, animatedStyle, style]}>
        <TouchableOpacity
          style={styles.touchableContent}
          onPress={handlePress}
          activeOpacity={0.9} // Slightly higher opacity for therapeutic feel
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.card, baseCardStyle, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.large,
    borderWidth: 1,
    marginBottom: 16,
    // Enhanced therapeutic shadows for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08, // Slightly more prominent for visual comfort
    shadowRadius: 6,
    // Android shadow
    elevation: 3,
  },
  touchableContent: {
    // Ensure touchable area covers entire card
    flex: 1,
    minHeight: 44, // WCAG AA compliant touch target
  },
});