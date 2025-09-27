/**
 * SessionProgressBar - Shows completion percentage for resumable sessions
 * Therapeutic design with smooth animations and calming colors
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing } from '../../constants/colors';

interface SessionProgressBarProps {
  percentage: number; // 0-100
  theme: 'morning' | 'midday' | 'evening';
  showPercentage?: boolean;
  height?: number;
  accessibilityLabel?: string;
  testID?: string;
}

export const SessionProgressBar: React.FC<SessionProgressBarProps> = ({
  percentage,
  theme,
  showPercentage = true,
  height = 8,
  accessibilityLabel,
  testID
}) => {
  const { colorSystem } = useTheme();
  const animatedWidth = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: percentage,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [percentage, animatedWidth]);

  const themeColors = colorSystem.themes[theme];
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <View style={styles.container} testID={testID}>
      <View 
        style={[
          styles.progressTrack,
          { 
            height,
            backgroundColor: themeColors.background,
            borderColor: themeColors.light,
          }
        ]}
        accessible={true}
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel || `${Math.round(clampedPercentage)}% complete`}
        accessibilityValue={{ 
          min: 0, 
          max: 100, 
          now: clampedPercentage 
        }}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              height: height - 2, // Account for border
              backgroundColor: themeColors.primary,
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            }
          ]}
        />
      </View>
      
      {showPercentage && (
        <Text 
          style={[
            styles.percentageText,
            { color: themeColors.primary }
          ]}
          accessibilityElementsHidden={true} // Screen reader uses progressbar accessibility
          allowFontScaling={true}
          maxFontSizeMultiplier={1.5}
        >
          {Math.round(clampedPercentage)}%
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    borderRadius: borderRadius.small,
    position: 'absolute',
    left: 1,
    top: 1,
    // Smooth transition animation handled by Animated.View
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
});