/**
 * StepsIndicator Component - Progress dots for multi-step flows
 * Shows current position in check-in flow with smooth transitions
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
} from '../../utils/ReanimatedMock';
import { colorSystem, spacing } from '../../constants/colors';

interface StepsIndicatorProps {
  totalSteps: number;
  currentStep: number;
  theme?: 'morning' | 'midday' | 'evening';
}

interface StepDotProps {
  index: number;
  currentStep: number;
  theme: 'morning' | 'midday' | 'evening';
}

const StepDot: React.FC<StepDotProps> = ({ index, currentStep, theme }) => {
  const isActive = index === currentStep;
  const isPast = index < currentStep;
  const progress = useSharedValue(isActive ? 1 : 0);
  
  const themeColors = colorSystem.themes[theme];

  useEffect(() => {
    progress.value = withTiming(
      isActive ? 1 : 0,
      {
        duration: 200,
        easing: Easing.inOut(Easing.ease),
      }
    );
  }, [isActive, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const width = interpolate(
      progress.value,
      [0, 1],
      [8, 24]
    );
    
    return {
      width,
      backgroundColor: isActive 
        ? themeColors.primary
        : isPast 
          ? themeColors.success
          : colorSystem.gray[300],
      opacity: isActive ? 1 : isPast ? 0.8 : 0.5,
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        animatedStyle,
        {
          borderRadius: isActive ? 4 : 50,
        }
      ]}
    />
  );
};

export const StepsIndicator: React.FC<StepsIndicatorProps> = ({
  totalSteps,
  currentStep,
  theme = 'morning'
}) => {
  // Validate currentStep is within bounds
  const safeCurrentStep = Math.max(0, Math.min(currentStep, totalSteps - 1));

  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <StepDot
          key={index}
          index={index}
          currentStep={safeCurrentStep}
          theme={theme}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  dot: {
    height: 8,
    minWidth: 8,
  },
});

export default StepsIndicator;