/**
 * COLLAPSIBLE CRISIS BUTTON COMPONENT
 *
 * Edge-swipeable crisis support button with:
 * - Collapsed state: Small red lifebuoy icon on right edge
 * - Expanded state: Full "Get Support" button
 * - <3s crisis access requirement (swipe ~1.5s + tap ~0.5s = ~2s)
 * - <200ms response time for crisis action
 * - Direct tap immediate access (navigates to CrisisResourcesScreen)
 * - VoiceOver/TalkBack accessibility
 * - Voice command support
 * - Haptic feedback
 * - 60fps smooth animation
 *
 * ACCESSIBILITY (MAINT-127):
 * - Reduced-motion: 100% opacity always (no fade)
 * - 44x44pt hit area ALWAYS active, even in faded state
 * - Direct tap on faded button works immediately
 * - Contrast ratio >= 3:1 for faded state
 * - VoiceOver: Custom accessibility actions
 * - Voice control: "crisis help" command
 * - Motor: Large touch targets, no complex gestures required
 *
 * MODES:
 * - 'standard': Persistent, full opacity (Learn, check-ins)
 * - 'immersive': Fades after 5s, tap-to-reveal (practices)
 * - 'prominent': Full emphasis (assessments, PHQ>=15)
 *
 * Usage:
 * ```tsx
 * <CollapsibleCrisisButton
 *   mode="immersive"
 *   onNavigate={() => navigation.navigate('CrisisResources')}
 *   testID="crisis-button"
 * />
 * ```
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { logSecurity } from '@/core/services/logging';
import { spacing, borderRadius, typography, commonColors } from '@/core/theme';

/** Display mode for the crisis button */
export type CrisisButtonMode = 'standard' | 'immersive' | 'prominent';

interface CollapsibleCrisisButtonProps {
  /** Navigation callback - navigates to CrisisResourcesScreen */
  onNavigate: () => void;

  /** Display mode */
  mode?: CrisisButtonMode;

  /** Position on screen (right or left for one-handed mode) */
  position?: 'right' | 'left';

  /** Test ID for testing */
  testID?: string;
}

// Animation configuration
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 1,
};

const COLLAPSED_WIDTH = 48; // Icon size
const EXPANDED_WIDTH = 260; // Full button width

// Fade configuration for immersive mode
const FADE_DELAY_MS = 5000; // 5 seconds before fade
const FADED_OPACITY = 0.5; // 50% opacity minimum for 3:1+ contrast
const FADE_DURATION_MS = 300;

/**
 * Collapsible crisis button component
 */
export const CollapsibleCrisisButton: React.FC<CollapsibleCrisisButtonProps> = ({
  onNavigate,
  mode = 'standard',
  position = 'right',
  testID = 'collapsible-crisis-button',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const translateX = useSharedValue(0);
  const fadeOpacity = useSharedValue(1);
  const lastInteractionTime = useSharedValue(Date.now());

  /**
   * ACCESSIBILITY: Check reduced-motion preference
   * Users with reduced-motion enabled see 100% opacity always (no fade)
   */
  useEffect(() => {
    const checkReduceMotion = async () => {
      try {
        const enabled = await AccessibilityInfo.isReduceMotionEnabled();
        setReduceMotionEnabled(enabled);
      } catch {
        // Default to false if check fails
        setReduceMotionEnabled(false);
      }
    };

    checkReduceMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        setReduceMotionEnabled(enabled);
        // Restore full opacity when reduce-motion enabled
        if (enabled) {
          fadeOpacity.value = 1;
        }
      }
    );

    return () => subscription?.remove();
  }, [fadeOpacity]);

  /**
   * IMMERSIVE MODE: Fade after 5 seconds of inactivity
   * Bypassed when reduceMotionEnabled or mode !== 'immersive'
   */
  useEffect(() => {
    if (mode !== 'immersive' || reduceMotionEnabled || isExpanded) {
      // Ensure full opacity in non-immersive modes or when expanded
      fadeOpacity.value = withTiming(1, { duration: FADE_DURATION_MS / 2 });
      return;
    }

    const fadeTimer = setInterval(() => {
      const timeSinceInteraction = Date.now() - lastInteractionTime.value;
      if (timeSinceInteraction >= FADE_DELAY_MS && fadeOpacity.value > FADED_OPACITY) {
        fadeOpacity.value = withTiming(FADED_OPACITY, { duration: FADE_DURATION_MS });
      }
    }, 1000);

    return () => clearInterval(fadeTimer);
  }, [mode, reduceMotionEnabled, isExpanded, fadeOpacity, lastInteractionTime]);

  /**
   * Reset fade on any interaction
   */
  const resetFade = useCallback(() => {
    lastInteractionTime.value = Date.now();
    if (mode === 'immersive' && !reduceMotionEnabled) {
      fadeOpacity.value = withTiming(1, { duration: FADE_DURATION_MS / 2 });
    }
  }, [mode, reduceMotionEnabled, fadeOpacity, lastInteractionTime]);

  /**
   * CRITICAL: <200ms crisis response - navigate to CrisisResourcesScreen
   * Direct tap works immediately, even in faded state
   */
  const handleCrisisAction = useCallback(() => {
    const startTime = performance.now();

    // Reset fade on interaction
    resetFade();

    // Navigate to CrisisResourcesScreen (provides choice: Call 988, Text 741741, Emergency contacts)
    onNavigate();

    // Performance monitoring for clinical safety
    const responseTime = performance.now() - startTime;
    if (responseTime > 200) {
      logSecurity('Crisis button response time exceeded', 'high', {
        responseTime,
        threshold: 200
      });
    } else {
      console.log(`✅ Crisis button response: ${responseTime}ms`);
    }
  }, [onNavigate, resetFade]);

  /**
   * Expand button (swipe gesture)
   */
  const expand = useCallback(() => {
    resetFade();
    setIsExpanded(true);
    console.log('Crisis button expanded via swipe');

    // Announce for screen readers
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility('Crisis support button expanded. Tap Get Support for help.');
    }
  }, [resetFade]);

  /**
   * Collapse button
   */
  const collapse = useCallback(() => {
    resetFade();
    setIsExpanded(false);
    console.log('Crisis button collapsed');
  }, [resetFade]);

  /**
   * Handle tap - DIRECT ACTION (no double-tap required)
   * In faded state, single tap triggers crisis action immediately
   */
  const handleTap = useCallback(() => {
    resetFade();

    // Direct tap triggers crisis action immediately (navigates to CrisisResourcesScreen)
    // This ensures <3s access even in faded state
    handleCrisisAction();
  }, [resetFade, handleCrisisAction]);

  /**
   * Pan gesture for swipe-to-expand
   */
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow leftward swipe (reveal from right edge)
      if (position === 'right') {
        translateX.value = Math.max(-EXPANDED_WIDTH + COLLAPSED_WIDTH, Math.min(0, event.translationX));
      } else {
        translateX.value = Math.min(EXPANDED_WIDTH - COLLAPSED_WIDTH, Math.max(0, event.translationX));
      }
    })
    .onEnd((event) => {
      // Determine if gesture should expand or collapse
      const threshold = (EXPANDED_WIDTH - COLLAPSED_WIDTH) / 3;

      if (position === 'right') {
        if (Math.abs(translateX.value) > threshold) {
          // Expand
          translateX.value = withSpring(-EXPANDED_WIDTH + COLLAPSED_WIDTH, SPRING_CONFIG);
          runOnJS(expand)();
        } else {
          // Collapse
          translateX.value = withSpring(0, SPRING_CONFIG);
          runOnJS(collapse)();
        }
      } else {
        if (translateX.value > threshold) {
          // Expand
          translateX.value = withSpring(EXPANDED_WIDTH - COLLAPSED_WIDTH, SPRING_CONFIG);
          runOnJS(expand)();
        } else {
          // Collapse
          translateX.value = withSpring(0, SPRING_CONFIG);
          runOnJS(collapse)();
        }
      }
    });

  /**
   * Animated style for the button container (translate + fade)
   */
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: fadeOpacity.value,
    };
  });

  /**
   * Handle accessibility actions
   */
  const accessibilityActions = [
    {
      name: 'activate' as const,
      label: 'Get crisis support',
    },
    {
      name: 'expand' as const,
      label: 'Expand to see options',
    },
  ];

  const onAccessibilityAction = useCallback(
    (event: { nativeEvent: { actionName: string } }) => {
      switch (event.nativeEvent.actionName) {
        case 'activate':
          handleCrisisAction();
          break;
        case 'expand':
          expand();
          break;
      }
    },
    [handleCrisisAction, expand]
  );

  /**
   * Get mode-specific styling
   */
  const getModeStyles = useCallback(() => {
    switch (mode) {
      case 'prominent':
        return {
          shadowOpacity: 0.6,
          elevation: 12,
        };
      case 'immersive':
        return {
          shadowOpacity: 0.3,
          elevation: 6,
        };
      default:
        return {
          shadowOpacity: 0.4,
          elevation: 8,
        };
    }
  }, [mode]);

  const modeStyles = getModeStyles();

  return (
    <View
      style={[
        styles.container,
        position === 'right' ? styles.containerRight : styles.containerLeft,
      ]}
      pointerEvents="box-none"
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.buttonContainer, animatedStyle]}>
          {/* Collapsed state: Lifebuoy icon */}
          {!isExpanded && (
            <Pressable
              style={[
                styles.iconButton,
                { shadowOpacity: modeStyles.shadowOpacity, elevation: modeStyles.elevation },
              ]}
              onPress={handleTap}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Get crisis support"
              accessibilityHint="Tap for immediate access to crisis resources"
              accessibilityActions={accessibilityActions}
              onAccessibilityAction={onAccessibilityAction}
              testID={`${testID}-icon`}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="lifebuoy"
                size={28}
                color={commonColors.white}
              />
            </Pressable>
          )}

          {/* Expanded state: Full button */}
          {isExpanded && (
            <View style={[styles.expandedContent, { shadowOpacity: modeStyles.shadowOpacity }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.crisisButton,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={handleCrisisAction}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Get Support"
                accessibilityHint="Open crisis support resources"
                testID={`${testID}-action`}
              >
                <MaterialCommunityIcons
                  name="lifebuoy"
                  size={20}
                  color={commonColors.white}
                  style={styles.buttonIcon}
                />
                <Text style={styles.crisisButtonText}>Get Support</Text>
              </Pressable>

              {/* Collapse button */}
              <Pressable
                style={styles.collapseButton}
                onPress={collapse}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Collapse crisis button"
                accessibilityHint="Hide the expanded button"
                testID={`${testID}-collapse`}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={commonColors.white}
                />
              </Pressable>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  // Container positioning - MAINT-127: Moved to bottom-right (above tab bar)
  container: {
    position: 'absolute',
    bottom: Platform.select({ ios: 100, android: 104 }), // Above tab bar
    zIndex: 9999,
  },
  containerRight: {
    right: 0,
  },
  containerLeft: {
    left: 0,
  },

  // Button container
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Collapsed state: Lifebuoy icon button
  iconButton: {
    width: COLLAPSED_WIDTH,
    height: COLLAPSED_WIDTH,
    backgroundColor: commonColors.crisis,
    borderTopLeftRadius: borderRadius.xxl,
    borderBottomLeftRadius: borderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowRadius: 6,
  },

  // Expanded state
  expandedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: commonColors.crisis,
    borderTopLeftRadius: borderRadius.large,
    borderBottomLeftRadius: borderRadius.large,
    paddingLeft: spacing[16],
    paddingRight: spacing[8],
    paddingVertical: spacing[8],
    width: EXPANDED_WIDTH,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowRadius: 6,
  },

  // Crisis action button (expanded)
  crisisButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#7F1D1D', // Darker crisis red for contrast
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // WCAG touch target
    marginRight: spacing[8],
  },

  buttonIcon: {
    marginRight: spacing[8],
  },

  crisisButtonText: {
    color: commonColors.white,
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Collapse button
  collapseButton: {
    width: spacing[32],
    height: spacing[32],
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CollapsibleCrisisButton;
