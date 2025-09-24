/**
 * MoodSelector Component - Enhanced therapeutic mood selection interface
 *
 * Features:
 * - Smooth animations for mindful mood selection
 * - Time-of-day adaptive theming
 * - Anxiety-aware larger touch targets
 * - Breathing rhythm animations for calming effect
 * - Therapeutic haptic feedback patterns
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  Easing,
  withRepeat
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

interface MoodOption {
  id: string;
  label: string;
  emoji: string;
  value: number; // 1-5 scale for mood intensity
  color: string;
}

interface MoodSelectorProps {
  selectedMood: string | null;
  onMoodSelect: (moodId: string, moodValue: number) => void;
  theme?: 'morning' | 'midday' | 'evening';
  anxietyAware?: boolean;
  breathingEffect?: boolean;
  mindfulPacing?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const MOOD_OPTIONS: MoodOption[] = [
  { id: 'very-low', label: 'Very Low', emoji: '😔', value: 1, color: '#E74C3C' },
  { id: 'low', label: 'Low', emoji: '😟', value: 2, color: '#E67E22' },
  { id: 'neutral', label: 'Neutral', emoji: '😐', value: 3, color: '#F39C12' },
  { id: 'good', label: 'Good', emoji: '🙂', value: 4, color: '#27AE60' },
  { id: 'great', label: 'Great', emoji: '😊', value: 5, color: '#2ECC71' },
];

// Animated mood item with therapeutic interactions
const AnimatedMoodItem: React.FC<{
  mood: MoodOption;
  isSelected: boolean;
  onPress: () => void;
  theme: 'morning' | 'midday' | 'evening';
  anxietyAware: boolean;
  breathingEffect: boolean;
  size: 'small' | 'medium' | 'large';
  index: number;
}> = React.memo(({ mood, isSelected, onPress, theme, anxietyAware, breathingEffect, size, index }) => {
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(1);
  const breathingScale = useSharedValue(1);
  const rotationValue = useSharedValue(0);

  const themeColors = useThemeColors();

  // Size configurations
  const sizeConfig = useMemo(() => {
    const baseSize = size === 'large' ? 80 : size === 'medium' ? 64 : 48;
    const anxietyMultiplier = anxietyAware ? 1.2 : 1;

    return {
      size: baseSize * anxietyMultiplier,
      fontSize: (size === 'large' ? 32 : size === 'medium' ? 24 : 20) * anxietyMultiplier,
      labelSize: (size === 'large' ? 14 : size === 'medium' ? 12 : 10) * (anxietyAware ? 1.1 : 1),
    };
  }, [size, anxietyAware]);

  // Entrance animation with staggered timing
  useEffect(() => {
    const delay = index * 100; // Stagger entrance animations

    setTimeout(() => {
      scaleValue.value = withSpring(1, {
        damping: 12,
        stiffness: 100,
        mass: 1
      });

      opacityValue.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.cubic)
      });
    }, delay);
  }, [index]);

  // Breathing effect for calming
  useEffect(() => {
    if (breathingEffect && isSelected) {
      const breathDuration = theme === 'evening' ? 4000 : 3000;

      breathingScale.value = withRepeat(
        withSequence(
          withTiming(1.05, {
            duration: breathDuration,
            easing: Easing.inOut(Easing.sine)
          }),
          withTiming(1.0, {
            duration: breathDuration,
            easing: Easing.inOut(Easing.sine)
          })
        ),
        -1, // Infinite repeat
        false
      );
    } else {
      breathingScale.value = withTiming(1, { duration: 300 });
    }
  }, [breathingEffect, isSelected, theme]);

  const handlePress = useCallback(() => {
    // Therapeutic selection animation
    scaleValue.value = withSequence(
      withSpring(0.9, {
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

    // Gentle rotation for playful feedback
    rotationValue.value = withSequence(
      withTiming(5, { duration: 150 }),
      withTiming(0, { duration: 150 })
    );

    // Opacity pulse for confirmation
    opacityValue.value = withSequence(
      withTiming(0.7, { duration: 100 }),
      withTiming(1, { duration: 200 })
    );

    onPress();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleValue.value * breathingScale.value },
      { rotate: `${rotationValue.value}deg` }
    ],
    opacity: opacityValue.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: isSelected ? mood.color : colorSystem.gray[300],
    borderWidth: isSelected ? 3 : 1,
    backgroundColor: isSelected ? `${mood.color}15` : colorSystem.base.white,
    shadowOpacity: isSelected ? 0.2 : 0.05,
  }));

  return (
    <Animated.View style={[animatedStyle, { marginHorizontal: spacing.xs }]}>
      <Animated.View
        style={[
          styles.moodItem,
          {
            width: sizeConfig.size,
            height: sizeConfig.size,
          },
          containerStyle
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.moodTouchable,
            pressed && styles.moodTouchablePressed
          ]}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={`${mood.label} mood, ${mood.value} out of 5`}
          accessibilityState={{ selected: isSelected }}
          accessibilityHint={`Select ${mood.label} mood level`}
          android_ripple={{
            color: '#ffffff30',
            borderless: true,
            radius: 40
          }}
        >
          <Text style={[styles.moodEmoji, { fontSize: sizeConfig.fontSize }]}>
            {mood.emoji}
          </Text>
          <Text
            style={[
              styles.moodLabel,
              {
                fontSize: sizeConfig.labelSize,
                color: isSelected ? mood.color : colorSystem.gray[600],
                fontWeight: isSelected ? '600' : '400',
              }
            ]}
          >
            {mood.label}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  selectedMood,
  onMoodSelect,
  theme = 'midday',
  anxietyAware = false,
  breathingEffect = false,
  mindfulPacing = false,
  size = 'medium'
}) => {
  const { onSelect } = useCommonHaptics();

  const handleMoodPress = useCallback(async (mood: MoodOption) => {
    // Mindful pacing for therapeutic interaction
    if (mindfulPacing) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // Gentle haptic feedback (skip for anxiety mode)
    if (!anxietyAware) {
      await onSelect();
    }

    onMoodSelect(mood.id, mood.value);
  }, [mindfulPacing, anxietyAware, onSelect, onMoodSelect]);

  const renderMoodOption = useCallback((mood: MoodOption, index: number) => (
    <AnimatedMoodItem
      key={mood.id}
      mood={mood}
      isSelected={selectedMood === mood.id}
      onPress={() => handleMoodPress(mood)}
      theme={theme}
      anxietyAware={anxietyAware}
      breathingEffect={breathingEffect}
      size={size}
      index={index}
    />
  ), [selectedMood, handleMoodPress, theme, anxietyAware, breathingEffect, size]);

  return (
    <View style={styles.container}>
      <View style={styles.moodGrid}>
        {MOOD_OPTIONS.map((mood, index) => renderMoodOption(mood, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  moodItem: {
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    // Enhanced therapeutic shadows
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  moodTouchable: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  moodTouchablePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  moodEmoji: {
    marginBottom: spacing.xs / 2,
  },
  moodLabel: {
    textAlign: 'center',
    lineHeight: 14,
    letterSpacing: 0.1,
  },
});

MoodSelector.displayName = 'MoodSelector';
AnimatedMoodItem.displayName = 'AnimatedMoodItem';

export default MoodSelector;