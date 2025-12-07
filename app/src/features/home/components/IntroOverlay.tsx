/**
 * IntroOverlay Component
 * Animated intro screen that shows "Being." centered, then scrolls up to reveal home screen.
 * Triggers when app has been inactive for 30+ minutes.
 */

import React, { useEffect, useCallback } from 'react';
import { Text, StyleSheet, Dimensions, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorSystem } from '@/core/theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animation timing constants
const INTRO_PAUSE_DURATION = 2000; // 2 seconds pause before animation
const LOGO_ANIMATION_DURATION = 500; // 500ms for logo translation
const TEXT_ANIMATION_DURATION = 400; // 400ms for text translation
const FADE_OUT_DURATION = 300; // 300ms for overlay fade out

interface IntroOverlayProps {
  /** Callback when animation completes */
  onComplete: () => void;
  /** Current greeting text (e.g., "Good afternoon") */
  greeting: string;
}

export const IntroOverlay: React.FC<IntroOverlayProps> = ({
  onComplete,
  greeting,
}) => {
  const insets = useSafeAreaInsets();

  // Animation shared values
  const logoTranslateY = useSharedValue(0);
  const textTranslateY = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  const handleAnimationComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    // Calculate translation distances inside useEffect to satisfy exhaustive-deps
    // Logo starts at center (50%) and moves to top (~10%)
    const logoStartY = SCREEN_HEIGHT * 0.4; // Offset from natural position to center
    const logoEndY = 0; // Final position at top

    // Text starts at bottom (80%) and moves up to below logo (~15%)
    const textStartY = SCREEN_HEIGHT * 0.5; // Offset from natural position
    const textEndY = 0; // Final position

    // Announce to screen readers
    AccessibilityInfo.announceForAccessibility('Being app loading');

    // Start animation sequence after pause
    const timer = setTimeout(() => {
      // Animate logo upward
      logoTranslateY.value = withTiming(
        logoEndY - logoStartY,
        {
          duration: LOGO_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
        }
      );

      // Animate text upward (slightly delayed)
      textTranslateY.value = withDelay(
        50,
        withTiming(
          textEndY - textStartY,
          {
            duration: TEXT_ANIMATION_DURATION,
            easing: Easing.out(Easing.cubic),
          }
        )
      );

      // Fade out overlay
      overlayOpacity.value = withDelay(
        LOGO_ANIMATION_DURATION - 100,
        withTiming(
          0,
          {
            duration: FADE_OUT_DURATION,
            easing: Easing.out(Easing.quad),
          },
          (finished) => {
            if (finished) {
              runOnJS(handleAnimationComplete)();
            }
          }
        )
      );
    }, INTRO_PAUSE_DURATION);

    return () => clearTimeout(timer);
  }, [logoTranslateY, textTranslateY, overlayOpacity, handleAnimationComplete]);

  // Animated styles
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoTranslateY.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.overlay,
        { paddingTop: insets.top },
        overlayAnimatedStyle,
      ]}
      pointerEvents="none"
      accessibilityRole="none"
    >
      {/* Logo - centered initially */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Text style={styles.logo} accessibilityRole="header">
          Being.
        </Text>
      </Animated.View>

      {/* Greeting text - at bottom initially */}
      <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.subtitle}>Take a moment for mindful awareness</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colorSystem.base.white,
    zIndex: 10,
  },
  logoContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    marginTop: -20, // Offset for text height
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    color: colorSystem.base.black,
  },
  textContainer: {
    position: 'absolute',
    top: '80%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colorSystem.gray[600],
    textAlign: 'center',
  },
});

export default IntroOverlay;
