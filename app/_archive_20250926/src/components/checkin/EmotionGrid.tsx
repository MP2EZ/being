/**
 * EmotionGrid Component - Emotion selection for all check-in types
 * Reusable grid with emoji support and theme awareness
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate
} from '../../utils/ReanimatedMock';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { useTherapeuticAccessibility } from '../accessibility/TherapeuticAccessibilityProvider';
import { AccessibleCrisisButton } from '../accessibility/AccessibleCrisisButton';

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

// Crisis-indicating emotions that may require intervention
const CRISIS_EMOTIONS = [
  'suicidal', 'hopeless', 'overwhelmed', 'desperate', 'empty', 'numb', 'worthless'
];

// High-concern emotions that warrant additional support
const HIGH_CONCERN_EMOTIONS = [
  'anxious', 'stressed', 'frustrated', 'sad', 'confused'
];

// Positive emotions that deserve celebration in depression support
const POSITIVE_EMOTIONS = [
  'happy', 'calm', 'grateful', 'hopeful', 'content', 'excited'
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
      <Pressable
        style={({ pressed }) => [
          styles.emotionItem,
          {
            backgroundColor: isSelected ? themeColors.background : colorSystem.gray[100],
            borderColor: isSelected ? themeColors.primary : colorSystem.gray[200],
            borderWidth: isSelected ? 2 : 1,
            minHeight: anxietyAware ? 80 : 72, // Larger touch targets for anxiety
            opacity: pressed ? 0.8 : 1,
          }
        ]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${emotion.label} emotion ${isSelected ? 'selected' : 'not selected'}`}
        accessibilityHint={`Double tap to ${isSelected ? 'deselect' : 'select'} ${emotion.label}.`}
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
      </Pressable>
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
  const [crisisDetected, setCrisisDetected] = useState(false);
  const [showCrisisSupport, setShowCrisisSupport] = useState(false);

  // Therapeutic Accessibility Context
  const {
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    crisisEmergencyMode,
    isScreenReaderEnabled,
    announceForTherapy,
    provideTharapeuticFeedback,
    activateEmergencyCrisisAccess,
    announceEmergencyInstructions,
  } = useTherapeuticAccessibility();

  // Memoized theme colors for performance
  const themeColors = useMemo(() => colorSystem.themes[theme], [theme]);

  // Crisis detection for concerning emotion selections
  const handleCrisisDetection = useCallback(async (emotionId: string) => {
    // Check for direct crisis indicators
    if (CRISIS_EMOTIONS.includes(emotionId)) {
      setCrisisDetected(true);
      setShowCrisisSupport(true);

      await activateEmergencyCrisisAccess('emotion_selection_crisis');
      await announceEmergencyInstructions(
        `Crisis support activated. You selected ${emotionId} which indicates you may need immediate help. Professional support is available now.`
      );
      return true;
    }

    // Check for patterns of high-concern emotions
    const concerningCount = selected.filter(emotion =>
      HIGH_CONCERN_EMOTIONS.includes(emotion) || CRISIS_EMOTIONS.includes(emotion)
    ).length;

    if (concerningCount >= 3 && !crisisDetected) {
      setShowCrisisSupport(true);
      await announceForTherapy(
        'I notice you\'re experiencing several challenging emotions. Crisis support is available if you need immediate help.',
        'assertive'
      );
      return false; // Not immediate crisis, but increased support
    }

    return false;
  }, [selected, crisisDetected, activateEmergencyCrisisAccess, announceEmergencyInstructions, announceForTherapy]);

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

    // Determine selection state
    const wasSelected = selected.includes(emotionId);

    // PRIORITY: Crisis detection for new selections
    if (!wasSelected) {
      const isCrisis = await handleCrisisDetection(emotionId);
      if (isCrisis) {
        // Crisis detected - do not proceed with normal selection
        // Crisis intervention will handle the flow
        return;
      }
    }

    // Therapeutic haptic feedback (gentler for crisis/anxiety states)
    const shouldUseHaptic = !anxietyAware && !anxietyAdaptationsEnabled && !crisisDetected;
    if (shouldUseHaptic) {
      await onSelect();
    }

    let newSelected: string[];

    if (multiSelect) {
      newSelected = wasSelected
        ? selected.filter(e => e !== emotionId)
        : [...selected, emotionId];
    } else {
      newSelected = wasSelected ? [] : [emotionId];
    }

    // Announce selection with enhanced therapeutic context
    await announceEmotionSelection(emotionId, !wasSelected);

    // Enhanced therapeutic feedback based on emotion type
    if (!wasSelected) {
      if (depressionSupportMode && POSITIVE_EMOTIONS.includes(emotionId)) {
        setTimeout(() => {
          provideTharapeuticFeedback('celebrating');
        }, 500);
      } else if (HIGH_CONCERN_EMOTIONS.includes(emotionId)) {
        setTimeout(async () => {
          await announceForTherapy(
            'Experiencing difficult emotions is part of being human. You\'re being honest about your feelings, which takes courage.',
            'polite'
          );
        }, 1000);
      }
    }

    onSelectionChange(newSelected);
  }, [
    mindfulPacing,
    anxietyAware,
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    crisisDetected,
    onSelect,
    multiSelect,
    selected,
    onSelectionChange,
    handleCrisisDetection,
    announceEmotionSelection,
    provideTharapeuticFeedback,
    announceForTherapy
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
      accessibilityLabel={`Emotion selection grid with ${EMOTIONS.length} emotions${crisisDetected ? ' - Crisis support active' : ''}`}
      accessibilityHint={
        crisisDetected
          ? 'Crisis support is now available. Professional help is immediately accessible.'
          : multiSelect
            ? 'Select one or more emotions that describe how you\'re feeling. Say "emergency help" if you need crisis support.'
            : 'Select one emotion that best describes how you\'re feeling. Say "emergency help" if you need crisis support.'
      }
    >
      {/* Crisis Support Button - Conditionally Displayed */}
      {(showCrisisSupport || crisisEmergencyMode) && (
        <View style={styles.crisisContainer}>
          <AccessibleCrisisButton
            variant="embedded"
            emergencyMode={crisisDetected}
            anxietyAdaptations={anxietyAdaptationsEnabled}
            traumaInformed={true}
            voiceActivated={true}
            size={crisisDetected ? 'emergency' : 'large'}
            style={styles.crisisButton}
            onCrisisStart={() => {
              // Additional crisis handling if needed
              console.log('Crisis support activated from EmotionGrid');
            }}
          />
          <Text
            style={[
              styles.crisisText,
              crisisDetected && styles.emergencyCrisisText
            ]}
            accessible={true}
            accessibilityRole="text"
            accessibilityLiveRegion="assertive"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.5}
          >
            {crisisDetected
              ? '🚨 Crisis support is active. Professional help is available now.'
              : '💙 Need extra support? Crisis counselors are available 24/7.'
            }
          </Text>
        </View>
      )}

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

      {/* Therapeutic Instructions for Screen Readers */}
      {isScreenReaderEnabled && (
        <View style={styles.instructionsContainer}>
          <Text
            style={styles.hiddenInstructions}
            accessible={true}
            accessibilityLiveRegion="polite"
            accessibilityHint="Additional guidance for emotion selection"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            {anxietyAdaptationsEnabled
              ? 'Take your time selecting emotions. There\'s no pressure to choose quickly. Voice commands available: "emergency help" for crisis support.'
              : depressionSupportMode
                ? 'You\'re taking a positive step by identifying your emotions. Every feeling is valid and deserves acknowledgment.'
                : 'Select emotions that match how you\'re feeling. Voice commands: "emergency help" for immediate crisis support.'
            }
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  // Crisis Support Styles
  crisisContainer: {
    backgroundColor: colorSystem.status.errorBackground,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.error,
    alignItems: 'center',
  },
  crisisButton: {
    marginBottom: spacing.sm,
  },
  crisisText: {
    fontSize: 14,
    color: colorSystem.status.error,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  emergencyCrisisText: {
    fontSize: 16,
    color: colorSystem.status.critical,
    fontWeight: '700',
  },
  // Accessibility Instructions
  instructionsContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.small,
  },
  hiddenInstructions: {
    fontSize: 13,
    color: colorSystem.gray[700],
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Grid Styles
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