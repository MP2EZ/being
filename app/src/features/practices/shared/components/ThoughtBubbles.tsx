/**
 * Thought Bubbles Component
 * DRD-compliant thought observation and categorization interface
 * Clinical: Positive examples per safety requirements, mindful awareness
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Vibration,
  Animated
} from 'react-native';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme/colors';

interface ThoughtBubblesProps {
  onThoughtAcknowledge?: (thought: string) => void;
  disabled?: boolean;
  theme?: 'morning' | 'midday' | 'evening';
}

// CRITICAL: Positive thought examples per clinical safety feedback
const POSITIVE_THOUGHT_EXAMPLES = [
  "I'm curious about today",
  "I'm feeling prepared", 
  "I have things to do",
  "I wonder what will happen"
];

const ThoughtBubbles: React.FC<ThoughtBubblesProps> = ({
  onThoughtAcknowledge,
  disabled = false,
  theme = 'morning',
}) => {
  const themeColors = colorSystem.themes[theme];
  const [acknowledgedThoughts, setAcknowledgedThoughts] = useState<string[]>([]);
  const [fadeAnimations] = useState(
    POSITIVE_THOUGHT_EXAMPLES.reduce((acc, thought) => {
      acc[thought] = new Animated.Value(1);
      return acc;
    }, {} as Record<string, Animated.Value>)
  );

  const handleThoughtPress = (thought: string) => {
    if (disabled || acknowledgedThoughts.includes(thought)) return;

    // Gentle haptic feedback
    Vibration.vibrate(30);

    // Fade out animation
    const animationValue = fadeAnimations[thought];
    if (animationValue) {
      Animated.timing(animationValue, {
        toValue: 0.3,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }

    // Track acknowledgment
    setAcknowledgedThoughts(prev => [...prev, thought]);

    // Call parent handler
    if (onThoughtAcknowledge) {
      onThoughtAcknowledge(thought);
    }
  };

  const ThoughtBubble: React.FC<{
    thought: string;
    index: number;
  }> = ({ thought, index }) => {
    const isAcknowledged = acknowledgedThoughts.includes(thought);
    const animatedValue = fadeAnimations[thought] || new Animated.Value(1);

    // Staggered positioning for visual appeal
    const leftOffset = (index % 2 === 0) ? '15%' : '55%';
    const topOffset = 40 + (index * 80);
    
    return (
      <Animated.View
        style={[
          styles.thoughtBubble,
          {
            position: 'absolute',
            left: leftOffset,
            top: topOffset,
            opacity: animatedValue,
            backgroundColor: isAcknowledged 
              ? themeColors.light 
              : colorSystem.base.white,
            borderColor: isAcknowledged 
              ? themeColors.primary 
              : colorSystem.gray[300],
          }
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.bubblePressable,
            {
              opacity: pressed && !disabled ? 0.8 : 1,
              transform: [{ scale: pressed && !disabled ? 0.95 : 1 }],
            }
          ]}
          onPress={() => handleThoughtPress(thought)}
          disabled={disabled || isAcknowledged}
          accessibilityRole="button"
          accessibilityLabel={`Thought: ${thought}`}
          accessibilityHint="Tap to acknowledge this thought with mindful awareness"
          accessibilityState={{ disabled: disabled || isAcknowledged }}
        >
          <Text style={[
            styles.thoughtText,
            {
              color: isAcknowledged 
                ? colorSystem.gray[600] 
                : colorSystem.base.black
            }
          ]}>
            {thought}
          </Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Thought Space with floating bubbles */}
      <View style={styles.thoughtSpace}>
        {POSITIVE_THOUGHT_EXAMPLES.map((thought, index) => (
          <ThoughtBubble 
            key={thought} 
            thought={thought} 
            index={index} 
          />
        ))}
      </View>

      {/* Acknowledgment Summary */}
      {acknowledgedThoughts.length > 0 && (
        <View style={[
          styles.summarySection,
          { borderLeftColor: themeColors.primary }
        ]}>
          <Text style={styles.summaryTitle}>
            Thoughts acknowledged:
          </Text>
          <Text style={styles.summaryText}>
            {acknowledgedThoughts.length} of {POSITIVE_THOUGHT_EXAMPLES.length} thoughts observed with mindfulness
          </Text>
        </View>
      )}

      {/* Mindfulness Note */}
      <View style={[
        styles.noteSection,
        { backgroundColor: themeColors.light }
      ]}>
        <Text style={styles.noteText}>
          🌸 Notice thoughts as passing visitors in the mind. You can acknowledge them without being swept away.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  thoughtSpace: {
    height: 320, // Fixed height for bubble positioning
    marginBottom: spacing.lg,
    position: 'relative',
  },
  thoughtBubble: {
    maxWidth: '35%',
    minWidth: 120,
    borderWidth: 2,
    borderRadius: borderRadius.large,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: borderRadius.small,
    elevation: 3,
  },
  bubblePressable: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56, // WCAG AA touch target
  },
  thoughtText: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
    lineHeight: typography.bodyLarge.size,
  },
  summarySection: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
    borderLeftWidth: spacing.xs,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: borderRadius.xs,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
    lineHeight: typography.title.size,
  },
  noteSection: {
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginTop: spacing.sm,
  },
  noteText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
    lineHeight: typography.title.size,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ThoughtBubbles;