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
import { colorSystem, spacing, typography } from '@/core/theme';
import BrainIcon from '@/core/components/shared/BrainIcon';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animation timing constants
const INTRO_PAUSE_DURATION = 2000; // 2 seconds pause before animation
const SCROLL_DURATION = 900; // 900ms for content scroll
const FADE_OUT_DURATION = 400; // 400ms for overlay fade out
const FADE_START_DELAY = SCROLL_DURATION * 0.5; // Start fade halfway through scroll

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
  const contentTranslateY = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  const handleAnimationComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    // Content starts at bottom and scrolls up
    const scrollDistance = SCREEN_HEIGHT * 0.4;

    // Announce to screen readers with context
    AccessibilityInfo.announceForAccessibility(`${greeting}. Being app ready.`);

    // Start animation sequence after pause
    const timer = setTimeout(() => {
      // Animate content upward
      contentTranslateY.value = withTiming(
        -scrollDistance,
        {
          duration: SCROLL_DURATION,
          easing: Easing.out(Easing.cubic),
        }
      );

      // Fade out overlay - start partway through scroll
      overlayOpacity.value = withDelay(
        FADE_START_DELAY,
        withTiming(
          0,
          {
            duration: FADE_OUT_DURATION,
            easing: Easing.inOut(Easing.quad),
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
  }, [contentTranslateY, overlayOpacity, handleAnimationComplete, greeting]);

  // Animated styles
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.overlay,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
        overlayAnimatedStyle,
      ]}
      pointerEvents="none"
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      {/* Logo and text grouped at bottom */}
      <Animated.View style={[styles.textContainer, contentAnimatedStyle]}>
        <BrainIcon size={160} />
        <Text style={styles.logo}>
          Being.
        </Text>
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
  textContainer: {
    position: 'absolute',
    bottom: spacing[10] * 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logo: {
    fontSize: typography.display2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.midnightBlue,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  greeting: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
  },
});

export default IntroOverlay;
