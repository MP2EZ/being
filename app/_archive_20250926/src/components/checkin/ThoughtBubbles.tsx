/**
 * ThoughtBubbles Component - Animated thought acknowledgment for morning check-in
 * Floating bubbles that can be tapped to acknowledge thoughts
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from '../../utils/ReanimatedMock';
import * as Haptics from 'expo-haptics';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';
import { useTherapeuticAccessibility } from '../accessibility/TherapeuticAccessibilityProvider';
import { AccessibleCrisisButton } from '../accessibility/AccessibleCrisisButton';

interface ThoughtBubblesProps {
  thoughts: string[];
  acknowledgedThoughts: string[];
  onAcknowledge: (thought: string) => void;
  theme?: 'morning' | 'midday' | 'evening';
  // Therapeutic accessibility props
  anxietyAware?: boolean;
  depressionSupport?: boolean;
  cognitiveSupport?: boolean;
}

interface BubbleProps {
  thought: string;
  isAcknowledged: boolean;
  onPress: () => void;
  index: number;
  theme: 'morning' | 'midday' | 'evening';
}

const { width: screenWidth } = Dimensions.get('window');
const CONTAINER_HEIGHT = 250;

// Crisis-indicating thought patterns that may require intervention
const CRISIS_THOUGHT_PATTERNS = [
  'hurt myself', 'end it all', 'not worth living', 'better off dead',
  'can\'t go on', 'hopeless', 'no point', 'want to die', 'kill myself'
];

// High-concern thought patterns that warrant additional support
const HIGH_CONCERN_PATTERNS = [
  'worthless', 'failure', 'useless', 'burden', 'hate myself',
  'overwhelmed', 'can\'t cope', 'too much', 'giving up'
];

// Predefined positions for bubbles to avoid overlap
const BUBBLE_POSITIONS = [
  { x: 0.15, y: 0.2 },
  { x: 0.7, y: 0.15 },
  { x: 0.35, y: 0.5 },
  { x: 0.8, y: 0.45 },
  { x: 0.2, y: 0.75 },
  { x: 0.6, y: 0.7 },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ThoughtBubble: React.FC<BubbleProps> = ({ 
  thought, 
  isAcknowledged, 
  onPress, 
  index,
  theme 
}) => {
  const floatAnimation = useSharedValue(0);
  const position = BUBBLE_POSITIONS[index % BUBBLE_POSITIONS.length];
  
  useEffect(() => {
    // Create unique animation for each bubble
    floatAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { 
          duration: 7500 + index * 1000, // Vary duration per bubble
          easing: Easing.inOut(Easing.ease) 
        }),
        withTiming(0, { 
          duration: 7500 + index * 1000,
          easing: Easing.inOut(Easing.ease) 
        })
      ),
      -1, // Infinite repeat
      false
    );
  }, [floatAnimation, index]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      floatAnimation.value,
      [0, 0.5, 1],
      [0, 10 - index * 3, 0]
    );
    const translateY = interpolate(
      floatAnimation.value,
      [0, 0.25, 0.5, 0.75, 1],
      [0, -15, -20, -15, 0]
    );
    
    return {
      transform: [
        { translateX },
        { translateY },
      ],
      opacity: isAcknowledged ? 0.4 : 1,
    };
  });

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      style={({ pressed }) => [
        styles.bubble,
        animatedStyle,
        {
          left: position.x * (screenWidth - 160), // Account for bubble width
          top: position.y * CONTAINER_HEIGHT,
          borderColor: isAcknowledged
            ? colorSystem.gray[400]
            : colorSystem.themes[theme].light,
          borderStyle: isAcknowledged ? 'dashed' : 'solid',
          opacity: pressed ? 0.8 : (isAcknowledged ? 0.4 : 1),
        }
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: isAcknowledged }}
      accessibilityLabel={`Thought: ${thought} ${isAcknowledged ? 'acknowledged' : 'not acknowledged'}`}
      accessibilityHint={`Double tap to ${isAcknowledged ? 'un-acknowledge' : 'acknowledge'} this thought`}
    >
      <Text style={[
        styles.bubbleText,
        {
          color: isAcknowledged
            ? colorSystem.gray[500]
            : colorSystem.base.black,
          textDecorationLine: isAcknowledged ? 'line-through' : 'none',
        }
      ]}>
        {thought}
      </Text>
    </AnimatedPressable>
  );
};

export const ThoughtBubbles: React.FC<ThoughtBubblesProps> = ({
  thoughts,
  acknowledgedThoughts = [],
  onAcknowledge,
  theme = 'morning',
  anxietyAware = false,
  depressionSupport = false,
  cognitiveSupport = false
}) => {
  const [crisisDetected, setCrisisDetected] = useState(false);
  const [showCrisisSupport, setShowCrisisSupport] = useState(false);

  // Therapeutic Accessibility Context
  const {
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    crisisEmergencyMode,
    isScreenReaderEnabled,
    isReduceMotionEnabled,
    announceForTherapy,
    provideTharapeuticFeedback,
    activateEmergencyCrisisAccess,
    announceEmergencyInstructions,
  } = useTherapeuticAccessibility();

  // Crisis detection for concerning thought patterns
  const handleThoughtCrisisDetection = useCallback(async (thought: string) => {
    const lowerThought = thought.toLowerCase();

    // Check for direct crisis indicators
    const isCrisisThought = CRISIS_THOUGHT_PATTERNS.some(pattern =>
      lowerThought.includes(pattern.toLowerCase())
    );

    if (isCrisisThought) {
      setCrisisDetected(true);
      setShowCrisisSupport(true);

      await activateEmergencyCrisisAccess('thought_pattern_crisis');
      await announceEmergencyInstructions(
        `Crisis support activated. Your thought "${thought}" indicates you may need immediate help. Professional support is available now.`
      );
      return true;
    }

    // Check for high-concern patterns
    const isHighConcern = HIGH_CONCERN_PATTERNS.some(pattern =>
      lowerThought.includes(pattern.toLowerCase())
    );

    if (isHighConcern) {
      setShowCrisisSupport(true);
      await announceForTherapy(
        'I notice you\'re having difficult thoughts. Remember, you\'re not alone and support is available.',
        'assertive'
      );
      return false;
    }

    return false;
  }, [activateEmergencyCrisisAccess, announceEmergencyInstructions, announceForTherapy]);

  // Enhanced thought acknowledgment with therapeutic feedback
  const handleThoughtAcknowledge = useCallback(async (thought: string) => {
    // Check for crisis patterns before acknowledgment
    if (!acknowledgedThoughts.includes(thought)) {
      await handleThoughtCrisisDetection(thought);
    }

    // Provide therapeutic guidance for thought acknowledgment
    if (isScreenReaderEnabled) {
      const therapeuticContext = depressionSupport || depressionSupportMode
        ? 'Remember, thoughts are not facts. You\'re practicing mindful awareness.'
        : anxietyAware || anxietyAdaptationsEnabled
          ? 'Good job noticing this thought without getting caught up in it.'
          : 'Acknowledged. Observing thoughts without judgment is a skill.';

      setTimeout(async () => {
        await announceForTherapy(
          `Thought acknowledged: "${thought}". ${therapeuticContext}`,
          'polite'
        );
      }, 300);
    }

    // Provide therapeutic feedback for successful acknowledgment
    if (depressionSupport || depressionSupportMode) {
      setTimeout(() => {
        provideTharapeuticFeedback('encouraging');
      }, 800);
    }

    onAcknowledge(thought);
  }, [
    acknowledgedThoughts,
    handleThoughtCrisisDetection,
    isScreenReaderEnabled,
    depressionSupport,
    depressionSupportMode,
    anxietyAware,
    anxietyAdaptationsEnabled,
    announceForTherapy,
    provideTharapeuticFeedback,
    onAcknowledge
  ]);

  // Dynamic container height for accessibility
  const dynamicHeight = isReduceMotionEnabled ? 180 : CONTAINER_HEIGHT;

  return (
    <View style={styles.container}>
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
              ? '🚨 Crisis support is active. Your thoughts indicate you may need immediate help.'
              : '💙 Difficult thoughts noticed. Professional support is available if needed.'
            }
          </Text>
        </View>
      )}

      <Text
        style={[
          styles.title,
          cognitiveSupport && styles.cognitiveTitle,
          depressionSupport && styles.depressionTitle
        ]}
        accessible={true}
        accessibilityRole="header"
        accessibilityLevel={2}
        allowFontScaling={true}
        maxFontSizeMultiplier={1.4}
      >
        {depressionSupport || depressionSupportMode
          ? 'Notice your thoughts with kindness'
          : anxietyAware || anxietyAdaptationsEnabled
            ? 'Observe thoughts gently, without pressure'
            : 'Notice your thoughts without judgment'
        }
      </Text>

      <Text
        style={[
          styles.subtitle,
          cognitiveSupport && styles.cognitiveSubtitle
        ]}
        accessible={true}
        accessibilityHint="Instructions for the thought acknowledgment exercise"
        allowFontScaling={true}
        maxFontSizeMultiplier={1.3}
      >
        {anxietyAware || anxietyAdaptationsEnabled
          ? 'Tap each thought gently when you feel ready. There\'s no pressure to acknowledge all of them.'
          : 'Tap each thought to acknowledge it and let it pass. This is mindfulness practice.'
        }
      </Text>

      <View
        style={[
          styles.thoughtContainer,
          { height: dynamicHeight },
          isReduceMotionEnabled && styles.reducedMotionContainer
        ]}
        accessible={true}
        accessibilityRole="group"
        accessibilityLabel={`Thought bubbles area with ${thoughts.length} thoughts`}
        accessibilityHint="Floating thoughts to acknowledge mindfully"
      >
        {thoughts.map((thought, index) => (
          <ThoughtBubble
            key={thought}
            thought={thought}
            isAcknowledged={acknowledgedThoughts.includes(thought)}
            onPress={() => handleThoughtAcknowledge(thought)}
            index={index}
            theme={theme}
          />
        ))}
      </View>

      <Text
        style={[
          styles.progress,
          cognitiveSupport && styles.cognitiveProgress
        ]}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`Progress: ${acknowledgedThoughts.length} out of ${thoughts.length} thoughts acknowledged`}
        accessibilityLiveRegion="polite"
        allowFontScaling={true}
        maxFontSizeMultiplier={1.2}
      >
        {acknowledgedThoughts.length} of {thoughts.length} thoughts acknowledged
      </Text>

      {/* Therapeutic Instructions for Screen Readers */}
      {isScreenReaderEnabled && (
        <View style={styles.instructionsContainer}>
          <Text
            style={styles.hiddenInstructions}
            accessible={true}
            accessibilityLiveRegion="polite"
            accessibilityHint="Additional guidance for thought acknowledgment"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            {depressionSupport || depressionSupportMode
              ? 'This is a safe space to observe your thoughts. You\'re practicing self-compassion by acknowledging what comes up. Voice commands: "emergency help" for crisis support.'
              : anxietyAware || anxietyAdaptationsEnabled
                ? 'Take your time with each thought. There\'s no right or wrong way to do this exercise. Voice commands: "emergency help" for immediate support.'
                : 'Mindful thought observation helps create space between you and your thoughts. Voice commands: "emergency help" for crisis support.'
            }
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
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
  // Title Styles with Therapeutic Adaptations
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
    textAlign: 'center',
    lineHeight: 26,
  },
  cognitiveTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '500',
  },
  depressionTitle: {
    fontSize: 19,
    color: colorSystem.status.success,
    fontWeight: '600',
  },
  // Subtitle Styles
  subtitle: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.md,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  cognitiveSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colorSystem.gray[700],
  },
  // Thought Container Styles
  thoughtContainer: {
    position: 'relative',
    height: CONTAINER_HEIGHT,
    marginVertical: spacing.md,
    overflow: 'hidden',
  },
  reducedMotionContainer: {
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
  },
  // Bubble Styles
  bubble: {
    position: 'absolute',
    backgroundColor: colorSystem.base.white,
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    maxWidth: 150,
    minHeight: 44, // WCAG AA compliance
    justifyContent: 'center',
    // Enhanced therapeutic shadows
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Shadow for Android
    elevation: 3,
  },
  bubbleText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.3, // Improved readability
  },
  // Progress Styles
  progress: {
    fontSize: 14,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  cognitiveProgress: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.gray[700],
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
});

export default ThoughtBubbles;