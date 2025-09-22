/**
 * EmotionGrid Component - Emotion selection for all check-in types
 * Reusable grid with emoji support and theme awareness
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { useTherapeuticAccessibility } from '../accessibility/TherapeuticAccessibilityProvider';

interface EmotionGridProps {
  selected: string[];
  onSelectionChange: (emotions: string[]) => void;
  theme?: 'morning' | 'midday' | 'evening';
  multiSelect?: boolean;
  columns?: number;
  anxietyAware?: boolean; // Enable anxiety-adapted interactions
  mindfulPacing?: boolean; // Enable mindful interaction timing
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

// Animated emotion item component for therapeutic interactions
const AnimatedEmotionItem: React.FC<{
  emotion: Emotion;
  isSelected: boolean;
  onPress: () => void;
  themeColors: any;
  anxietyAware: boolean;
  columns: number;
}> = React.memo(({ emotion, isSelected, onPress, themeColors, anxietyAware, columns }) => {
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(1);

  const handlePress = useCallback(() => {
    // Therapeutic selection animation - slower for anxiety awareness
    const springConfig = anxietyAware
      ? { damping: 20, stiffness: 200, mass: 1.2 } // Gentler for anxiety
      : { damping: 15, stiffness: 300, mass: 0.8 }; // Standard responsiveness

    scaleValue.value = withSequence(
      withSpring(0.92, springConfig),
      withSpring(1, springConfig)
    );

    // Gentle opacity feedback
    opacityValue.value = withSequence(
      withTiming(0.7, { duration: 100 }),
      withTiming(1, { duration: 200 })
    );

    onPress();
  }, [onPress, anxietyAware]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    opacity: opacityValue.value,
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          flex: 1 / columns - 0.02,
          marginHorizontal: spacing.xs / 2,
          marginBottom: spacing.sm,
        }
      ]}
    >
      <TouchableOpacity
        style={[
          styles.emotionItem,
          {
            backgroundColor: isSelected ? themeColors.background : colorSystem.gray[100],
            borderColor: isSelected ? themeColors.primary : colorSystem.gray[200],
            borderWidth: isSelected ? 2 : 1,
            minHeight: anxietyAware ? 80 : 72, // Larger touch targets for anxiety
          }
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${emotion.label} emotion ${isSelected ? 'selected' : 'not selected'}`}
        accessibilityHint={`Double tap to ${isSelected ? 'deselect' : 'select'} ${emotion.label}. ${multiSelect ? 'You can select multiple emotions.' : 'This will replace your current selection.'}`}
      >
        <Text
          style={[
            styles.emotionLabel,
            {
              color: isSelected ? themeColors.primary : colorSystem.gray[700],
              fontWeight: isSelected ? '600' : '400',
              fontSize: anxietyAware ? 14 : 12, // Larger text for readability
            }
          ]}
        >
          {emotion.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

export const EmotionGrid: React.FC<EmotionGridProps> = ({
  selected = [],
  onSelectionChange,
  theme = 'morning',
  multiSelect = true,
  columns = 3,
  anxietyAware = false,
  mindfulPacing = false
}) => {
  const { onSelect } = useCommonHaptics();

  // Therapeutic Accessibility Context
  const {
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    isScreenReaderEnabled,
    announceForTherapy,
    provideTharapeuticFeedback,
  } = useTherapeuticAccessibility();

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
    if (depressionSupportMode) {
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

      if (isSelected && encouragingMessages[emotionId]) {
        message += `. ${encouragingMessages[emotionId]}`;
      }
    }

    await announceForTherapy(message, 'polite');
  }, [isScreenReaderEnabled, depressionSupportMode, announceForTherapy]);
  
  const handleEmotionPress = useCallback(async (emotionId: string) => {
    // Mindful pacing - add slight delay for therapeutic interaction
    if (mindfulPacing || anxietyAdaptationsEnabled) {
      // Small delay encourages mindful selection and reduces anxiety pressure
      await new Promise(resolve => setTimeout(resolve, anxietyAdaptationsEnabled ? 150 : 100));
    }

    // Therapeutic haptic feedback
    const shouldUseHaptic = !anxietyAware && !anxietyAdaptationsEnabled;
    if (shouldUseHaptic) {
      await onSelect();
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
          provideTharapeuticFeedback('celebrating');
        }, 500);
      }
    }

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
    provideTharapeuticFeedback
  ]);

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
      />
    );
  }, [selected, handleEmotionPress, themeColors, anxietyAware, columns]);

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="group"
      accessibilityLabel={`Emotion selection grid with ${EMOTIONS.length} emotions`}
      accessibilityHint={multiSelect ? 'Select one or more emotions that describe how you\'re feeling' : 'Select one emotion that best describes how you\'re feeling'}
    >
      <FlatList
        data={EMOTIONS}
        renderItem={renderEmotion}
        numColumns={columns}
        key={`emotion-grid-${columns}`} // Force re-render on column change
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        scrollEnabled={false}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        accessible={false} // Let individual items be accessible instead
        accessibilityElementsHidden={false}
      />
    </View>
  );
};

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
    minHeight: 72, // Base height, overridden by anxietyAware prop
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
  emoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  emotionLabel: {
    fontSize: 12, // Base size, overridden by anxietyAware prop
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 0.2, // Improved readability
  },
});

export default EmotionGrid;