import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import { useTherapeuticAccessibility } from '../../components/accessibility/TherapeuticAccessibilityProvider';
import { AccessibleCrisisButton } from '../../components/accessibility/AccessibleCrisisButton';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ExerciseCardProps {
  title: string;
  description: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  type: 'breathing' | 'mindfulness' | 'body-scan' | 'grounding';
  onPress: () => void;
  index: number;
}

const AccessibleExerciseCard: React.FC<ExerciseCardProps> = React.memo(({
  title,
  description,
  duration,
  difficulty,
  type,
  onPress,
  index
}) => {
  const cardRef = useRef<TouchableOpacity>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const {
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    traumaInformedMode,
    isScreenReaderEnabled,
    announceForTherapy,
    setTherapeuticFocus,
    provideTharapeuticFeedback,
  } = useTherapeuticAccessibility();

  // Animation values for therapeutic feedback
  const scaleValue = useSharedValue(1);
  const colorValue = useSharedValue(0);

  // Enhanced touch targets for anxiety
  const cardSize = anxietyAdaptationsEnabled ? {
    minHeight: 120,
    padding: 20,
  } : {
    minHeight: 100,
    padding: 16,
  };

  const handlePress = useCallback(async () => {
    try {
      setIsPressed(true);

      // Therapeutic animation feedback
      scaleValue.value = withSequence(
        withSpring(0.98, { damping: 20, stiffness: 400 }),
        withSpring(1, { damping: 20, stiffness: 400 })
      );

      // Announce exercise selection with encouraging feedback
      const encouragingMessage = depressionSupportMode
        ? `Great choice! Starting ${title}. This is a positive step for your wellbeing.`
        : `Starting ${title}. Take your time and be gentle with yourself.`;

      await announceForTherapy(encouragingMessage, 'polite');

      // Provide therapeutic feedback
      await provideTharapeuticFeedback('encouraging');

      onPress();
    } catch (error) {
      console.error('Exercise card press failed:', error);
    } finally {
      setIsPressed(false);
    }
  }, [title, depressionSupportMode, onPress, scaleValue, announceForTherapy, provideTharapeuticFeedback]);

  const handleFocus = useCallback(async () => {
    setIsFocused(true);
    if (isScreenReaderEnabled) {
      await setTherapeuticFocus(cardRef, `${title} exercise`);
    }
  }, [title, isScreenReaderEnabled, setTherapeuticFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Animated styles for accessibility feedback
  const animatedStyle = useAnimatedStyle(() => {
    const borderColor = isFocused ? '#007AFF' : 'transparent';
    return {
      transform: [{ scale: scaleValue.value }],
      borderColor,
    };
  }, [isFocused]);

  // Get difficulty color for visual hierarchy
  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'beginner': return '#22C55E'; // Green
      case 'intermediate': return '#F59E0B'; // Amber
      case 'advanced': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };

  // Get exercise type icon for cognitive assistance
  const getTypeIcon = () => {
    switch (type) {
      case 'breathing': return '🌬️';
      case 'mindfulness': return '🧘';
      case 'body-scan': return '💆';
      case 'grounding': return '🌱';
      default: return '✨';
    }
  };

  // Accessibility label with comprehensive information
  const accessibilityLabel = `${title} exercise. ${description} Duration: ${duration}. Difficulty: ${difficulty}. Type: ${type}.`;

  const accessibilityHint = traumaInformedMode
    ? 'Double tap to start this exercise. This is a safe, guided practice you can stop at any time.'
    : 'Double tap to start this mindfulness exercise.';

  return (
    <Animated.View style={[styles.exerciseCardContainer, animatedStyle]}>
      <TouchableOpacity
        ref={cardRef}
        style={[
          styles.exerciseCard,
          cardSize,
          {
            borderWidth: isFocused ? 3 : 1,
            borderColor: isFocused ? '#007AFF' : '#E5E7EB',
          }
        ]}
        onPress={handlePress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{
          selected: isPressed,
          disabled: false,
        }}
        accessibilityActions={[
          {
            name: 'activate',
            label: `Start ${title} exercise`
          }
        ]}
        testID={`exercise-card-${index}`}
      >
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseIconContainer}>
            <Text style={styles.exerciseIcon} accessible={false}>
              {getTypeIcon()}
            </Text>
          </View>

          <View style={styles.exerciseInfo}>
            <Text
              style={[
                styles.exerciseTitle,
                anxietyAdaptationsEnabled && styles.anxietyFriendlyTitle
              ]}
              accessible={false}
              allowFontScaling={true}
              maxFontSizeMultiplier={2.0}
            >
              {title}
            </Text>

            <View style={styles.exerciseMeta}>
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: getDifficultyColor() }
                ]}
                accessible={false}
              >
                <Text style={styles.difficultyText} accessible={false}>
                  {difficulty.toUpperCase()}
                </Text>
              </View>

              <Text
                style={styles.durationText}
                accessible={false}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.5}
              >
                {duration}
              </Text>
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.exerciseDescription,
            depressionSupportMode && styles.encouragingDescription
          ]}
          accessible={false}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.8}
          numberOfLines={anxietyAdaptationsEnabled ? 3 : 2}
        >
          {description}
        </Text>

        {/* Therapeutic encouragement for depression support */}
        {depressionSupportMode && (
          <Text
            style={styles.encouragementText}
            accessible={false}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.5}
          >
            ✨ You're taking positive steps for your mental health
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

export const ExercisesScreen: React.FC = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const headerRef = useRef<View>(null);

  const {
    isScreenReaderEnabled,
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    traumaInformedMode,
    breathingGuidanceActive,
    announceForTherapy,
    setTherapeuticFocus,
    provideTharapeuticFeedback,
    enableAnxietyAdaptations,
    activateDepressionSupport,
  } = useTherapeuticAccessibility();

  // Sample MBCT exercises with therapeutic descriptions
  const exercises = [
    {
      title: '3-Minute Breathing Space',
      description: 'A gentle pause to reconnect with yourself and the present moment.',
      duration: '3 min',
      difficulty: 'beginner' as const,
      type: 'breathing' as const,
    },
    {
      title: 'Body Scan Meditation',
      description: 'Slowly notice sensations throughout your body with kindness.',
      duration: '10 min',
      difficulty: 'beginner' as const,
      type: 'body-scan' as const,
    },
    {
      title: 'Mindful Movement',
      description: 'Gentle stretches combined with mindful awareness.',
      duration: '15 min',
      difficulty: 'intermediate' as const,
      type: 'mindfulness' as const,
    },
    {
      title: '5-4-3-2-1 Grounding',
      description: 'Use your senses to anchor yourself in the present moment.',
      duration: '5 min',
      difficulty: 'beginner' as const,
      type: 'grounding' as const,
    },
    {
      title: 'Loving-Kindness Practice',
      description: 'Cultivate compassion for yourself and others.',
      duration: '20 min',
      difficulty: 'intermediate' as const,
      type: 'mindfulness' as const,
    },
    {
      title: 'Mountain Meditation',
      description: 'Find stability and strength through visualization.',
      duration: '25 min',
      difficulty: 'advanced' as const,
      type: 'mindfulness' as const,
    },
  ];

  useEffect(() => {
    const initializeExercisesAccessibility = async () => {
      try {
        // Focus on header for screen readers
        if (isScreenReaderEnabled && headerRef.current) {
          await setTherapeuticFocus(headerRef, 'Mindfulness Exercises screen');
        }

        // Welcome announcement with therapeutic context
        const welcomeMessage = traumaInformedMode
          ? 'Welcome to mindfulness exercises. These are safe, guided practices you can do at your own pace.'
          : 'Welcome to mindfulness exercises. Choose a practice that feels right for you today.';

        await announceForTherapy(welcomeMessage, 'polite');

        // Auto-enable adaptations based on context
        if (!anxietyAdaptationsEnabled && !depressionSupportMode) {
          // Proactively enable mild anxiety adaptations for mindfulness context
          await enableAnxietyAdaptations('mild');
        }

      } catch (error) {
        console.error('Failed to initialize exercises accessibility:', error);
      }
    };

    initializeExercisesAccessibility();
  }, [isScreenReaderEnabled, traumaInformedMode, anxietyAdaptationsEnabled, depressionSupportMode]);

  const handleExercisePress = useCallback(async (exercise: typeof exercises[0]) => {
    try {
      // Provide encouraging feedback
      await provideTharapeuticFeedback('encouraging');

      // Navigate to exercise (placeholder implementation)
      const startMessage = `Starting ${exercise.title}. Find a comfortable position and remember you can pause or stop at any time.`;
      await announceForTherapy(startMessage, 'polite');

      console.log('Starting exercise:', exercise.title);
    } catch (error) {
      console.error('Failed to start exercise:', error);
    }
  }, [provideTharapeuticFeedback, announceForTherapy]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header} ref={headerRef}>
        <Text
          style={[
            styles.title,
            depressionSupportMode && styles.encouragingTitle
          ]}
          accessible={true}
          accessibilityRole="header"
          accessibilityLevel={1}
          allowFontScaling={true}
          maxFontSizeMultiplier={2.5}
        >
          Mindfulness Exercises
        </Text>

        <Text
          style={[
            styles.subtitle,
            anxietyAdaptationsEnabled && styles.calmingSubtitle
          ]}
          accessible={true}
          allowFontScaling={true}
          maxFontSizeMultiplier={2.0}
        >
          {traumaInformedMode
            ? 'Safe, gentle practices for your wellbeing'
            : 'Practice mindful awareness at your own pace'
          }
        </Text>

        {/* Therapeutic guidance banner */}
        {(anxietyAdaptationsEnabled || depressionSupportMode) && (
          <View style={styles.guidanceBanner}>
            <Text
              style={styles.guidanceText}
              accessible={true}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.8}
            >
              💙 Remember: There's no perfect way to practice. Be kind to yourself.
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        accessible={false}
        accessibilityElementsHidden={false}
        testID="exercises-scroll-view"
      >
        {exercises.map((exercise, index) => (
          <AccessibleExerciseCard
            key={index}
            {...exercise}
            onPress={() => handleExercisePress(exercise)}
            index={index}
          />
        ))}

        {/* Breathing guidance active indicator */}
        {breathingGuidanceActive && (
          <View style={styles.activeGuidanceIndicator}>
            <Text
              style={styles.activeGuidanceText}
              accessible={true}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.5}
            >
              🌬️ Breathing guidance is active
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Crisis support always accessible */}
      <AccessibleCrisisButton
        variant="floating"
        anxietyAdaptations={anxietyAdaptationsEnabled}
        traumaInformed={traumaInformedMode}
        voiceActivated={true}
        style={{ bottom: 120 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B2951',
    marginBottom: 8,
    textAlign: 'center',
  },
  encouragingTitle: {
    color: '#2563EB', // More encouraging blue
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  calmingSubtitle: {
    color: '#059669', // Calming green for anxiety
    fontWeight: '500',
  },
  guidanceBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  guidanceText: {
    fontSize: 14,
    color: '#1E40AF',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140, // Extra space for floating crisis button
  },
  exerciseCardContainer: {
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    // Minimum WCAG AA touch target
    minHeight: 88,
    minWidth: 44,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  exerciseIcon: {
    fontSize: 24,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 24,
  },
  anxietyFriendlyTitle: {
    fontSize: 20, // Larger for anxiety
    color: '#059669', // Calming green
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minHeight: 24, // Accessibility touch target
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  durationText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  encouragingDescription: {
    color: '#374151', // Darker for better contrast
    fontWeight: '500',
  },
  encouragementText: {
    fontSize: 12,
    color: '#059669',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
  activeGuidanceIndicator: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#3B82F6',
    alignItems: 'center',
  },
  activeGuidanceText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
  },
});