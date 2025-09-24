/**
 * EmotionGrid Component - PRESSABLE PERFORMANCE OPTIMIZATION
 * Enhanced for therapeutic interactions with 150ms anxiety adaptation timing
 *
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Pressable replaces TouchableOpacity for New Architecture compatibility
 * 2. Worklet-based therapeutic animations for 60fps gesture handling
 * 3. Memory-efficient animation cleanup for extended sessions
 * 4. Anxiety-adaptive timing with precise haptic feedback coordination
 * 5. Optimized rendering with React.memo and useMemo strategies
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, AccessibilityInfo, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
  interpolate,
  cancelAnimation,
  useDerivedValue,
  useAnimatedReaction,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { useTherapeuticAccessibility } from '../accessibility/TherapeuticAccessibilityProvider';
import { usePerformanceTracking } from '../../utils/PerformanceMonitor';

interface EmotionGridProps {
  selected: string[];
  onSelectionChange: (emotions: string[]) => void;
  theme?: 'morning' | 'midday' | 'evening';
  multiSelect?: boolean;
  columns?: number;
  anxietyAware?: boolean;
  mindfulPacing?: boolean;
  performanceMode?: 'standard' | 'high-performance' | 'battery-optimized';
}

interface Emotion {
  id: string;
  label: string;
}

const EMOTIONS: Emotion[] = [
  { id: 'happy', label: 'Happy' },
  { id: 'calm', label: 'Calm' },
  { id: 'excited', label: 'Excited' },
  { id: 'grateful', label: 'Grateful' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'sad', label: 'Sad' },
  { id: 'frustrated', label: 'Frustrated' },
  { id: 'tired', label: 'Tired' },
  { id: 'confused', label: 'Confused' },
  { id: 'hopeful', label: 'Hopeful' },
  { id: 'content', label: 'Content' },
  { id: 'stressed', label: 'Stressed' },
];

// Performance constants for therapeutic interactions
const ANIMATION_CONFIG = {
  ANXIETY_SPRING: {
    damping: 20,
    stiffness: 200,
    mass: 1.2,
    velocity: 0.5
  },
  STANDARD_SPRING: {
    damping: 15,
    stiffness: 300,
    mass: 0.8,
    velocity: 1
  },
  THERAPEUTIC_TIMING: {
    ANXIETY_DELAY: 150, // 150ms for anxiety adaptation
    STANDARD_DELAY: 100,
    MINDFUL_DELAY: 200,
    HAPTIC_OFFSET: 50 // 50ms before haptic for better coordination
  }
} as const;

// Optimized animated emotion item with Pressable integration
const AnimatedEmotionItem: React.FC<{
  emotion: Emotion;
  isSelected: boolean;
  onPress: () => void;
  themeColors: any;
  anxietyAware: boolean;
  columns: number;
  performanceMode: 'standard' | 'high-performance' | 'battery-optimized';
  isReducedMotionEnabled: boolean;
}> = React.memo(({
  emotion,
  isSelected,
  onPress,
  themeColors,
  anxietyAware,
  columns,
  performanceMode,
  isReducedMotionEnabled
}) => {
  // Worklet-controlled animation values
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(1);
  const pressProgress = useSharedValue(0);
  const selectionProgress = useSharedValue(isSelected ? 1 : 0);

  // Performance tracking
  const { trackCrisisResponse } = usePerformanceTracking();
  const interactionStartTime = useRef<number>(0);

  // Animation cleanup ref
  const animationCleanupRef = useRef<(() => void)[]>([]);

  // Update selection animation when prop changes
  useEffect(() => {
    if (isReducedMotionEnabled) {
      selectionProgress.value = isSelected ? 1 : 0;
      return;
    }

    const springConfig = anxietyAware
      ? ANIMATION_CONFIG.ANXIETY_SPRING
      : ANIMATION_CONFIG.STANDARD_SPRING;

    selectionProgress.value = withSpring(isSelected ? 1 : 0, springConfig);

    // Register cleanup
    const cleanup = () => cancelAnimation(selectionProgress);
    animationCleanupRef.current.push(cleanup);

    return () => {
      animationCleanupRef.current.forEach(fn => fn());
      animationCleanupRef.current = [];
    };
  }, [isSelected, anxietyAware, selectionProgress, isReducedMotionEnabled]);

  // Worklet-based press animation for therapeutic feedback
  const createTherapeuticPressAnimation = useCallback(() => {
    'worklet';

    if (isReducedMotionEnabled) {
      pressProgress.value = 1;
      return;
    }

    const springConfig = anxietyAware
      ? ANIMATION_CONFIG.ANXIETY_SPRING
      : ANIMATION_CONFIG.STANDARD_SPRING;

    // Therapeutic press sequence: press -> hold -> release
    pressProgress.value = withSequence(
      withTiming(1, {
        duration: anxietyAware ? 200 : 150,
        easing: Easing.bezier(0.4, 0.0, 0.6, 1.0)
      }),
      withDelay(
        anxietyAware ? ANIMATION_CONFIG.THERAPEUTIC_TIMING.ANXIETY_DELAY :
                     ANIMATION_CONFIG.THERAPEUTIC_TIMING.STANDARD_DELAY,
        withSpring(0, springConfig)
      )
    );

    // Coordinated scale animation for visual feedback
    scaleValue.value = withSequence(
      withSpring(0.92, springConfig),
      withSpring(1.0, springConfig)
    );

    // Therapeutic opacity feedback
    opacityValue.value = withSequence(
      withTiming(0.7, { duration: 100 }),
      withTiming(1.0, { duration: 200 })
    );
  }, [anxietyAware, pressProgress, scaleValue, opacityValue, isReducedMotionEnabled]);

  // Enhanced press handler with performance tracking
  const handlePress = useCallback(() => {
    interactionStartTime.current = performance.now();

    // Execute therapeutic animation
    createTherapeuticPressAnimation();

    // Coordinate timing for anxiety adaptation
    const delay = anxietyAware
      ? ANIMATION_CONFIG.THERAPEUTIC_TIMING.ANXIETY_DELAY
      : ANIMATION_CONFIG.THERAPEUTIC_TIMING.STANDARD_DELAY;

    setTimeout(() => {
      // Track therapeutic response time
      const responseTime = performance.now() - interactionStartTime.current;
      trackCrisisResponse(interactionStartTime.current, `emotion_selection_${emotion.id}`);

      onPress();
    }, delay);
  }, [onPress, emotion.id, anxietyAware, createTherapeuticPressAnimation, trackCrisisResponse]);

  // Optimized animated styles with performance considerations
  const animatedStyle = useAnimatedStyle(() => {
    // Battery optimization: reduce complex interpolations
    if (performanceMode === 'battery-optimized') {
      return {
        transform: [{ scale: scaleValue.value }],
        opacity: opacityValue.value,
      };
    }

    // High-performance mode: full animation suite
    const scale = interpolate(
      pressProgress.value,
      [0, 1],
      [scaleValue.value, scaleValue.value * 0.96]
    );

    const borderOpacity = interpolate(
      selectionProgress.value,
      [0, 1],
      [0.3, 1.0]
    );

    return {
      transform: [{ scale }],
      opacity: opacityValue.value,
      borderColor: `rgba(${isSelected ? '59, 130, 246' : '156, 163, 175'}, ${borderOpacity})`,
    };
  }, [performanceMode, isSelected]);

  // Pressable style function for enhanced feedback
  const pressableStyle = useCallback(({ pressed }: { pressed: boolean }) => [
    styles.emotionItem,
    {
      backgroundColor: isSelected ? themeColors.background : colorSystem.gray[100],
      borderColor: isSelected ? themeColors.primary : colorSystem.gray[200],
      borderWidth: isSelected ? 2 : 1,
      minHeight: anxietyAware ? 80 : 72,
      // Enhanced Pressable feedback
      opacity: pressed ? 0.9 : 1.0,
      transform: pressed && !isReducedMotionEnabled ? [{ scale: 0.98 }] : [{ scale: 1.0 }],
    },
    {
      flex: 1 / columns - 0.02,
      marginHorizontal: spacing.xs / 2,
      marginBottom: spacing.sm,
    }
  ], [isSelected, themeColors, anxietyAware, columns, isReducedMotionEnabled]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={pressableStyle}
        onPress={handlePress}
        accessible={true}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${emotion.label} emotion ${isSelected ? 'selected' : 'not selected'}`}
        accessibilityHint={`Double tap to ${isSelected ? 'deselect' : 'select'} ${emotion.label}`}
        // Enhanced hit area for therapeutic interactions
        hitSlop={anxietyAware ? { top: 8, left: 8, bottom: 8, right: 8 } : undefined}
        // Android ripple configuration for New Architecture
        android_ripple={{
          color: themeColors.primary ? `${themeColors.primary}40` : 'rgba(59, 130, 246, 0.25)',
          borderless: false,
          radius: anxietyAware ? 50 : 40,
          foreground: false,
        }}
        // iOS feedback enhancement
        {...(Platform.OS === 'ios' && {
          onPressIn: () => {
            // Immediate visual feedback for iOS
            if (!isReducedMotionEnabled) {
              scaleValue.value = withSpring(0.95, ANIMATION_CONFIG.STANDARD_SPRING);
            }
          },
          onPressOut: () => {
            // Reset scale on release
            if (!isReducedMotionEnabled) {
              scaleValue.value = withSpring(1.0, ANIMATION_CONFIG.STANDARD_SPRING);
            }
          }
        })}
      >
        <Text
          style={[
            styles.emotionLabel,
            {
              color: isSelected ? themeColors.primary : colorSystem.gray[700],
              fontWeight: isSelected ? '600' : '400',
              fontSize: anxietyAware ? 14 : 12,
            }
          ]}
          allowFontScaling={true}
          maxFontSizeMultiplier={2.0}
        >
          {emotion.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

AnimatedEmotionItem.displayName = 'AnimatedEmotionItem';

export const EmotionGrid: React.FC<EmotionGridProps> = React.memo(({
  selected = [],
  onSelectionChange,
  theme = 'morning',
  multiSelect = true,
  columns = 3,
  anxietyAware = false,
  mindfulPacing = false,
  performanceMode = 'standard'
}) => {
  const { onSelect } = useCommonHaptics();
  const [isReducedMotionEnabled, setIsReducedMotionEnabled] = useState(false);

  // Therapeutic Accessibility Context
  const {
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    isScreenReaderEnabled,
    announceForTherapy,
    provideTharapeuticFeedback,
  } = useTherapeuticAccessibility();

  // Performance tracking
  const { trackCrisisResponse } = usePerformanceTracking();

  // Accessibility preferences detection
  useEffect(() => {
    const checkReducedMotion = async () => {
      try {
        const reducedMotion = await AccessibilityInfo.isReduceMotionEnabled();
        setIsReducedMotionEnabled(reducedMotion);
      } catch (error) {
        console.warn('Reduced motion detection failed:', error);
      }
    };

    checkReducedMotion();

    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReducedMotionEnabled
    );

    return () => listener?.remove();
  }, []);

  // Memoized theme colors for performance
  const themeColors = useMemo(() => colorSystem.themes[theme], [theme]);

  // Enhanced emotion selection with therapeutic feedback
  const announceEmotionSelection = useCallback(async (emotionId: string, isSelected: boolean) => {
    if (!isScreenReaderEnabled) return;

    const emotion = EMOTIONS.find(e => e.id === emotionId);
    if (!emotion) return;

    const action = isSelected ? 'selected' : 'deselected';
    let message = `${emotion.label} ${action}`;

    // Add therapeutic context for depression support
    if (depressionSupportMode && isSelected) {
      const encouragingMessages: Record<string, string> = {
        happy: 'It\'s wonderful that you\'re experiencing happiness.',
        calm: 'Noticing calm is a positive step for your wellbeing.',
        grateful: 'Gratitude is a powerful emotion for mental health.',
        hopeful: 'Hope is a beautiful feeling to acknowledge.',
        content: 'Contentment is a peaceful state to recognize.',
        sad: 'It\'s okay to acknowledge sadness. You\'re being honest with yourself.',
        anxious: 'Recognizing anxiety shows self-awareness. You\'re taking care of yourself.',
        frustrated: 'It\'s normal to feel frustrated sometimes. You\'re being true to your emotions.',
        tired: 'Acknowledging tiredness is important for self-care.',
        confused: 'It\'s okay to feel confused. Emotions can be complex.',
        stressed: 'Recognizing stress is the first step in managing it.',
      };

      if (encouragingMessages[emotionId]) {
        message += `. ${encouragingMessages[emotionId]}`;
      }
    }

    await announceForTherapy(message, 'polite');
  }, [isScreenReaderEnabled, depressionSupportMode, announceForTherapy]);

  // Enhanced emotion press handler with performance tracking
  const handleEmotionPress = useCallback(async (emotionId: string) => {
    const interactionStart = performance.now();

    // Mindful pacing with anxiety adaptations
    const pacingDelay = mindfulPacing || anxietyAdaptationsEnabled
      ? anxietyAdaptationsEnabled
        ? ANIMATION_CONFIG.THERAPEUTIC_TIMING.ANXIETY_DELAY
        : ANIMATION_CONFIG.THERAPEUTIC_TIMING.MINDFUL_DELAY
      : ANIMATION_CONFIG.THERAPEUTIC_TIMING.STANDARD_DELAY;

    // Non-blocking delay for therapeutic interaction
    await new Promise(resolve => setTimeout(resolve, pacingDelay));

    // Coordinated haptic feedback (50ms before interaction completes)
    const shouldUseHaptic = !anxietyAware && !anxietyAdaptationsEnabled;
    if (shouldUseHaptic) {
      setTimeout(() => {
        onSelect().catch(() => {}); // Non-blocking haptic
      }, Math.max(0, pacingDelay - ANIMATION_CONFIG.THERAPEUTIC_TIMING.HAPTIC_OFFSET));
    }

    // Determine selection state
    const wasSelected = selected.includes(emotionId);
    let newSelected: string[];

    if (multiSelect) {
      newSelected = wasSelected
        ? selected.filter(e => e !== emotionId)
        : [...selected, emotionId];
    } else {
      newSelected = wasSelected ? [] : [emotionId];
    }

    // Announce selection with therapeutic context
    await announceEmotionSelection(emotionId, !wasSelected);

    // Provide therapeutic feedback for meaningful emotions
    if (!wasSelected && depressionSupportMode) {
      const positiveMoods = ['happy', 'calm', 'grateful', 'hopeful', 'content'];
      if (positiveMoods.includes(emotionId)) {
        setTimeout(() => {
          provideTharapeuticFeedback('celebrating').catch(() => {});
        }, 500);
      }
    }

    // Track performance metrics
    trackCrisisResponse(interactionStart, `emotion_grid_selection_${emotionId}`);

    onSelectionChange(newSelected);
  }, [
    mindfulPacing,
    anxietyAware,
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    onSelect,
    multiSelect,
    selected,
    onSelectionChange,
    announceEmotionSelection,
    provideTharapeuticFeedback,
    trackCrisisResponse
  ]);

  // Optimized render item with performance considerations
  const renderEmotion = useCallback(({ item }: { item: Emotion }) => {
    const isSelected = selected.includes(item.id);

    return (
      <AnimatedEmotionItem
        emotion={item}
        isSelected={isSelected}
        onPress={() => handleEmotionPress(item.id)}
        themeColors={themeColors}
        anxietyAware={anxietyAware}
        columns={columns}
        performanceMode={performanceMode}
        isReducedMotionEnabled={isReducedMotionEnabled}
      />
    );
  }, [selected, handleEmotionPress, themeColors, anxietyAware, columns, performanceMode, isReducedMotionEnabled]);

  // Memoized key extractor for FlatList performance
  const keyExtractor = useCallback((item: Emotion) => item.id, []);

  // Optimized FlatList configuration
  const flatListConfig = useMemo(() => ({
    data: EMOTIONS,
    renderItem: renderEmotion,
    numColumns: columns,
    key: `emotion-grid-${columns}-${performanceMode}`,
    keyExtractor,
    contentContainerStyle: styles.grid,
    scrollEnabled: false,
    columnWrapperStyle: columns > 1 ? styles.row : undefined,
    removeClippedSubviews: performanceMode === 'high-performance',
    maxToRenderPerBatch: performanceMode === 'battery-optimized' ? 6 : 12,
    windowSize: performanceMode === 'battery-optimized' ? 3 : 5,
    getItemLayout: performanceMode === 'high-performance' ? (data, index) => ({
      length: anxietyAware ? 88 : 80, // item height + margin
      offset: (anxietyAware ? 88 : 80) * Math.floor(index / columns),
      index,
    }) : undefined,
  }), [renderEmotion, columns, performanceMode, keyExtractor, anxietyAware]);

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="group"
      accessibilityLabel={`Emotion selection grid with ${EMOTIONS.length} emotions`}
      accessibilityHint={multiSelect
        ? 'Select one or more emotions that describe how you\'re feeling'
        : 'Select one emotion that best describes how you\'re feeling'}
    >
      <FlatList
        {...flatListConfig}
        accessible={false} // Let individual items be accessible
        accessibilityElementsHidden={false}
      />
    </View>
  );
});

EmotionGrid.displayName = 'EmotionGrid.PressableOptimized';

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  grid: {
    paddingVertical: spacing.xs,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  emotionItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
    // Enhanced therapeutic shadows
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  emotionLabel: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 0.2,
  },
});

export default EmotionGrid;