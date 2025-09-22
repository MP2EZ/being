/**
 * Screen Component - Therapeutic screen wrapper with adaptive theming
 *
 * Features:
 * - Time-of-day gradient backgrounds
 * - Breathing rhythm background animations
 * - Safe area handling for therapeutic focus
 * - Anxiety-aware color schemes
 * - Mindful spacing and layout
 */

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  interpolateColor,
  Easing
} from 'react-native-reanimated';
// Note: expo-linear-gradient is optional - falls back to solid colors
let LinearGradient: any = null;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch (e) {
  // Fallback to View for solid colors
  LinearGradient = null;
}
import { useTheme } from '../../hooks/useTheme';
import { useThemeColors } from '../../contexts/ThemeContext';
import { colorSystem, spacing } from '../../constants/colors';

interface ScreenProps {
  children: React.ReactNode;
  theme?: 'morning' | 'midday' | 'evening' | 'auto';
  variant?: 'default' | 'therapeutic' | 'crisis' | 'breathing';
  safeArea?: boolean;
  padding?: boolean;
  breathingEffect?: boolean;
  anxietyAware?: boolean;
  scrollable?: boolean;
  statusBarStyle?: 'auto' | 'light' | 'dark';
}

// Time-of-day gradient configurations
const THEME_GRADIENTS = {
  morning: {
    colors: ['#FFF8E1', '#F3E5AB', '#E8D780'],
    positions: [0, 0.5, 1],
    anxietyColors: ['#FAFAFA', '#F5F5F5', '#EEEEEE'], // Calmer for anxiety
  },
  midday: {
    colors: ['#E3F2FD', '#BBDEFB', '#90CAF9'],
    positions: [0, 0.5, 1],
    anxietyColors: ['#F8F9FA', '#F1F3F4', '#E8EAED'],
  },
  evening: {
    colors: ['#E8F5E8', '#C8E6C9', '#A5D6A7'],
    positions: [0, 0.5, 1],
    anxietyColors: ['#F1F8E9', '#DCEDC8', '#C5E1A5'],
  },
} as const;

// Crisis-specific backgrounds
const CRISIS_GRADIENTS = {
  colors: ['#FFEBEE', '#FFCDD2', '#EF9A9A'],
  positions: [0, 0.5, 1],
  anxietyColors: ['#FFF3E0', '#FFE0B2', '#FFCC80'], // Warmer, less alarming
};

// Breathing exercise backgrounds
const BREATHING_GRADIENTS = {
  colors: ['#F3E5F5', '#E1BEE7', '#CE93D8'],
  positions: [0, 0.5, 1],
  anxietyColors: ['#F8F9FA', '#F1F3F4', '#E8EAED'], // Neutral for anxiety
};

export const Screen: React.FC<ScreenProps> = ({
  children,
  theme = 'auto',
  variant = 'default',
  safeArea = true,
  padding = true,
  breathingEffect = false,
  anxietyAware = false,
  scrollable = false,
  statusBarStyle = 'auto'
}) => {
  const insets = useSafeAreaInsets();
  const { colorSystem, currentTheme } = useTheme();
  const themeColors = useThemeColors();

  // Animation values for breathing effect
  const breathingValue = useSharedValue(1);
  const gradientOpacity = useSharedValue(1);

  // Auto-detect theme if not specified
  const resolvedTheme = theme === 'auto' ? currentTheme : theme;

  // Breathing animation effect
  useEffect(() => {
    if (breathingEffect) {
      const breathDuration = resolvedTheme === 'evening' ? 4000 : 3000;

      const breathingAnimation = () => {
        breathingValue.value = withSequence(
          withTiming(1.02, {
            duration: breathDuration,
            easing: Easing.inOut(Easing.sine)
          }),
          withTiming(1.0, {
            duration: breathDuration,
            easing: Easing.inOut(Easing.sine)
          })
        );
      };

      breathingAnimation();
      const interval = setInterval(breathingAnimation, breathDuration * 2);

      return () => clearInterval(interval);
    }
  }, [breathingEffect, resolvedTheme]);

  // Gradient configuration based on variant and theme
  const gradientConfig = useMemo(() => {
    switch (variant) {
      case 'crisis':
        return anxietyAware ?
          { colors: CRISIS_GRADIENTS.anxietyColors, positions: CRISIS_GRADIENTS.positions } :
          { colors: CRISIS_GRADIENTS.colors, positions: CRISIS_GRADIENTS.positions };

      case 'breathing':
        return anxietyAware ?
          { colors: BREATHING_GRADIENTS.anxietyColors, positions: BREATHING_GRADIENTS.positions } :
          { colors: BREATHING_GRADIENTS.colors, positions: BREATHING_GRADIENTS.positions };

      case 'therapeutic':
      case 'default':
      default:
        const themeGradient = THEME_GRADIENTS[resolvedTheme];
        return anxietyAware ?
          { colors: themeGradient.anxietyColors, positions: themeGradient.positions } :
          { colors: themeGradient.colors, positions: themeGradient.positions };
    }
  }, [variant, resolvedTheme, anxietyAware]);

  // Status bar style based on theme and variant
  const statusBarConfig = useMemo(() => {
    if (statusBarStyle !== 'auto') return statusBarStyle;

    switch (variant) {
      case 'crisis':
        return 'dark';
      case 'breathing':
        return resolvedTheme === 'evening' ? 'light' : 'dark';
      default:
        return resolvedTheme === 'evening' ? 'light' : 'dark';
    }
  }, [statusBarStyle, variant, resolvedTheme]);

  // Breathing animation style
  const breathingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingValue.value }],
    opacity: gradientOpacity.value,
  }));

  // Container style with safe areas
  const containerStyle = useMemo(() => ({
    paddingTop: safeArea ? insets.top : 0,
    paddingBottom: safeArea ? insets.bottom : 0,
    paddingLeft: safeArea ? insets.left : 0,
    paddingRight: safeArea ? insets.right : 0,
    paddingHorizontal: padding ? spacing.lg : 0,
  }), [safeArea, padding, insets]);

  // Background fallback color
  const backgroundColor = useMemo(() => {
    switch (variant) {
      case 'crisis':
        return anxietyAware ? '#FFF3E0' : '#FFEBEE';
      case 'breathing':
        return anxietyAware ? '#F8F9FA' : '#F3E5F5';
      default:
        return themeColors.background || colorSystem.base.white;
    }
  }, [variant, anxietyAware, themeColors.background]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar
        barStyle={statusBarConfig === 'light' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Background gradient or solid color fallback */}
      <Animated.View style={[styles.backgroundGradient, breathingStyle]}>
        {LinearGradient ? (
          <LinearGradient
            colors={gradientConfig.colors}
            locations={gradientConfig.positions}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        ) : (
          <View
            style={[
              styles.gradient,
              { backgroundColor: gradientConfig.colors[0] } // Use first gradient color as fallback
            ]}
          />
        )}
      </Animated.View>

      {/* Content container */}
      <View style={[styles.content, containerStyle]}>
        {scrollable ? (
          <Animated.ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={!anxietyAware} // Disable bounce for anxiety-aware mode
          >
            {children}
          </Animated.ScrollView>
        ) : (
          children
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: spacing.md,
  },
});

Screen.displayName = 'Screen';

export default Screen;