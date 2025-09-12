/**
 * ThoughtBubbles Component - Animated thought acknowledgment for morning check-in
 * Floating bubbles that can be tapped to acknowledge thoughts
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colorSystem, spacing } from '../../constants/colors';

interface ThoughtBubblesProps {
  thoughts: string[];
  acknowledgedThoughts: string[];
  onAcknowledge: (thought: string) => void;
  theme?: 'morning' | 'midday' | 'evening';
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

// Predefined positions for bubbles to avoid overlap
const BUBBLE_POSITIONS = [
  { x: 0.15, y: 0.2 },
  { x: 0.7, y: 0.15 },
  { x: 0.35, y: 0.5 },
  { x: 0.8, y: 0.45 },
  { x: 0.2, y: 0.75 },
  { x: 0.6, y: 0.7 },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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
    <AnimatedTouchable
      style={[
        styles.bubble,
        animatedStyle,
        {
          left: (position?.x ?? 0.5) * (screenWidth - 160), // Account for bubble width
          top: (position?.y ?? 0.5) * CONTAINER_HEIGHT,
          borderColor: isAcknowledged 
            ? colorSystem.gray[400] 
            : colorSystem.themes[theme].light,
          borderStyle: isAcknowledged ? 'dashed' : 'solid',
        }
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
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
    </AnimatedTouchable>
  );
};

export const ThoughtBubbles: React.FC<ThoughtBubblesProps> = ({
  thoughts,
  acknowledgedThoughts = [],
  onAcknowledge,
  theme = 'morning'
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notice your thoughts without judgment</Text>
      <Text style={styles.subtitle}>
        Tap each thought to acknowledge it and let it pass
      </Text>
      
      <View style={styles.thoughtContainer}>
        {thoughts.map((thought, index) => (
          <ThoughtBubble
            key={thought}
            thought={thought}
            isAcknowledged={acknowledgedThoughts.includes(thought)}
            onPress={() => onAcknowledge(thought)}
            index={index}
            theme={theme}
          />
        ))}
      </View>
      
      <Text style={styles.progress}>
        {acknowledgedThoughts.length} of {thoughts.length} thoughts acknowledged
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  thoughtContainer: {
    position: 'relative',
    height: CONTAINER_HEIGHT,
    marginVertical: spacing.md,
    overflow: 'hidden',
  },
  bubble: {
    position: 'absolute',
    backgroundColor: colorSystem.base.white,
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    maxWidth: 150,
    // Shadow for iOS
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
  },
  progress: {
    fontSize: 14,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default ThoughtBubbles;