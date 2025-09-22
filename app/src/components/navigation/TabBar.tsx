/**
 * TabBar Component - Enhanced therapeutic navigation with time-of-day theming
 *
 * Features:
 * - Smooth tab transitions with mindful pacing
 * - Time-of-day adaptive visual theming
 * - Anxiety-aware larger touch targets
 * - Crisis button integration and visibility
 * - Therapeutic haptic feedback patterns
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../core/Typography';
import { useTheme } from '../../hooks/useTheme';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { colorSystem, spacing } from '../../constants/colors';

interface TabItem {
  id: string;
  label: string;
  icon: string; // Emoji or icon name
  route: string;
  accessibilityLabel?: string;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabId: string, route: string) => void;
  theme?: 'morning' | 'midday' | 'evening';
  anxietyAware?: boolean;
  showCrisisAccess?: boolean;
  onCrisisPress?: () => void;
}

// Animated tab item with therapeutic interactions
const AnimatedTabItem: React.FC<{
  tab: TabItem;
  isActive: boolean;
  onPress: () => void;
  theme: 'morning' | 'midday' | 'evening';
  anxietyAware: boolean;
  index: number;
}> = React.memo(({ tab, isActive, onPress, theme, anxietyAware, index }) => {
  const scaleValue = useSharedValue(1);
  const translateY = useSharedValue(0);
  const iconScale = useSharedValue(1);
  const themeColors = useThemeColors();

  // Entrance animation with staggered timing
  useEffect(() => {
    const delay = index * 50;

    setTimeout(() => {
      translateY.value = withSpring(0, {
        damping: 12,
        stiffness: 100,
        mass: 1
      });
    }, delay);
  }, [index]);

  // Active state animation
  useEffect(() => {
    if (isActive) {
      iconScale.value = withSpring(1.1, {
        damping: 15,
        stiffness: 200,
        mass: 0.8
      });

      translateY.value = withSpring(-2, {
        damping: 15,
        stiffness: 200,
        mass: 0.8
      });
    } else {
      iconScale.value = withSpring(1, {
        damping: 15,
        stiffness: 200,
        mass: 0.8
      });

      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 200,
        mass: 0.8
      });
    }
  }, [isActive]);

  const handlePress = useCallback(() => {
    // Therapeutic press animation
    scaleValue.value = withSpring(0.95, {
      damping: 15,
      stiffness: 300,
      mass: 0.6
    });

    setTimeout(() => {
      scaleValue.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
        mass: 0.6
      });
    }, 100);

    onPress();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleValue.value },
      { translateY: translateY.value }
    ],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const minTouchTarget = anxietyAware ? 54 : 44; // WCAG AA+ for anxiety

  return (
    <TouchableOpacity
      style={[
        styles.tabItem,
        {
          minHeight: minTouchTarget,
          minWidth: minTouchTarget,
        }
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab.accessibilityLabel || `${tab.label} tab`}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <Animated.Text
          style={[
            styles.tabIcon,
            {
              color: isActive ? themeColors.primary : colorSystem.gray[500],
              fontSize: anxietyAware ? 26 : 24,
            },
            iconAnimatedStyle
          ]}
        >
          {tab.icon}
        </Animated.Text>
        <Typography
          variant="caption"
          style={[
            styles.tabLabel,
            {
              color: isActive ? themeColors.primary : colorSystem.gray[500],
              fontWeight: isActive ? '600' : '400',
              fontSize: anxietyAware ? 12 : 11,
            }
          ]}
          maxLines={1}
        >
          {tab.label}
        </Typography>
      </Animated.View>
    </TouchableOpacity>
  );
});

// Crisis access button with prominent styling
const CrisisAccessButton: React.FC<{
  onPress: () => void;
  theme: 'morning' | 'midday' | 'evening';
  anxietyAware: boolean;
}> = React.memo(({ onPress, theme, anxietyAware }) => {
  const pulseValue = useSharedValue(1);
  const themeColors = useThemeColors();

  // Subtle pulsing for visibility without being jarring
  useEffect(() => {
    const pulseDuration = theme === 'evening' ? 3000 : 2500;

    pulseValue.value = withTiming(1.05, {
      duration: pulseDuration,
      easing: Easing.inOut(Easing.sine)
    });

    const interval = setInterval(() => {
      pulseValue.value = withTiming(1.05, {
        duration: pulseDuration,
        easing: Easing.inOut(Easing.sine)
      });

      setTimeout(() => {
        pulseValue.value = withTiming(1, {
          duration: pulseDuration,
          easing: Easing.inOut(Easing.sine)
        });
      }, pulseDuration);
    }, pulseDuration * 2);

    return () => clearInterval(interval);
  }, [theme]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  return (
    <Animated.View style={[styles.crisisButton, pulseStyle]}>
      <TouchableOpacity
        style={[
          styles.crisisButtonContent,
          {
            backgroundColor: themeColors.crisis || colorSystem.status.critical,
            minHeight: anxietyAware ? 54 : 48,
            minWidth: anxietyAware ? 54 : 48,
          }
        ]}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Emergency crisis support - tap for immediate help"
        accessibilityHint="Opens crisis intervention and support resources"
      >
        <Typography
          variant="crisis"
          style={styles.crisisButtonText}
          crisisReadable
        >
          🆘
        </Typography>
      </TouchableOpacity>
    </Animated.View>
  );
});

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
  theme = 'midday',
  anxietyAware = false,
  showCrisisAccess = true,
  onCrisisPress
}) => {
  const insets = useSafeAreaInsets();
  const { onPress } = useCommonHaptics();
  const themeColors = useThemeColors();

  // Enhanced tab press with therapeutic timing
  const handleTabPress = useCallback(async (tab: TabItem) => {
    // Gentle haptic feedback (skip for anxiety mode)
    if (!anxietyAware) {
      await onPress();
    }

    onTabPress(tab.id, tab.route);
  }, [anxietyAware, onPress, onTabPress]);

  // Crisis button press with immediate response
  const handleCrisisPress = useCallback(async () => {
    // Immediate heavy haptic for crisis - don't skip for anxiety
    await onPress();
    onCrisisPress?.();
  }, [onPress, onCrisisPress]);

  // Adaptive styling based on theme and time of day
  const tabBarStyle = useMemo(() => ({
    paddingBottom: Math.max(insets.bottom, 16),
    backgroundColor: themeColors.background || colorSystem.base.white,
    borderTopColor: theme === 'evening' ? colorSystem.gray[300] : colorSystem.gray[200],
  }), [insets.bottom, themeColors.background, theme]);

  return (
    <View style={[styles.container, tabBarStyle]}>
      <View style={styles.tabContainer}>
        {tabs.map((tab, index) => (
          <AnimatedTabItem
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onPress={() => handleTabPress(tab)}
            theme={theme}
            anxietyAware={anxietyAware}
            index={index}
          />
        ))}
      </View>

      {showCrisisAccess && onCrisisPress && (
        <CrisisAccessButton
          onPress={handleCrisisPress}
          theme={theme}
          anxietyAware={anxietyAware}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    // Enhanced therapeutic shadows
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  tabContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    marginBottom: spacing.xs / 2,
    textAlign: 'center',
  },
  tabLabel: {
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  crisisButton: {
    marginLeft: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crisisButtonContent: {
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    // Enhanced emergency shadows
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  crisisButtonText: {
    fontSize: 20,
    color: 'white',
  },
});

TabBar.displayName = 'TabBar';
AnimatedTabItem.displayName = 'AnimatedTabItem';
CrisisAccessButton.displayName = 'CrisisAccessButton';

export default TabBar;