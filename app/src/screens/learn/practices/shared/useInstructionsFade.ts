/**
 * useInstructionsFade Hook - Shared DRY Logic
 * Handles fade-in/fade-out animation for practice instructions
 *
 * Used in timer-based practices to subtly remove visual clutter
 * after practice begins, allowing user to focus on the exercise.
 *
 * Behavior:
 * - When practice starts: Wait fadeDelay ms, then fade out over fadeDuration ms
 * - When practice pauses: Fade back in immediately over fadeInDuration ms
 * - Prevents re-triggering fade if already triggered
 *
 * ACCESSIBILITY:
 * - Uses native driver for smooth 60fps animation
 * - Sets pointerEvents based on visibility state
 * - Does NOT remove content from screen reader (always accessible)
 */

import { useRef, useEffect, useState } from 'react';
import { Animated } from 'react-native';

interface UseInstructionsFadeOptions {
  fadeDelay?: number;        // Delay before starting fade-out (ms)
  fadeDuration?: number;     // Fade-out duration (ms)
  fadeInDuration?: number;   // Fade-in duration (ms)
}

interface UseInstructionsFadeReturn {
  opacity: Animated.Value;
  showInstructions: boolean;
}

export function useInstructionsFade(
  isActive: boolean,
  options: UseInstructionsFadeOptions = {}
): UseInstructionsFadeReturn {
  const {
    fadeDelay = 2000,       // 2 seconds before fade starts
    fadeDuration = 1000,    // 1 second fade-out
    fadeInDuration = 300,   // 300ms fade-in
  } = options;

  const [showInstructions, setShowInstructions] = useState(true);
  const instructionsOpacity = useRef(new Animated.Value(1)).current;
  const fadeTriggeredRef = useRef(false); // Prevent re-triggering

  useEffect(() => {
    if (isActive) {
      // Practice active - trigger fade if not already triggered
      if (!fadeTriggeredRef.current) {
        fadeTriggeredRef.current = true;

        // Wait before fading (allows user to see instructions initially)
        const fadeTimeout = setTimeout(() => {
          Animated.timing(instructionsOpacity, {
            toValue: 0,
            duration: fadeDuration,
            useNativeDriver: true,
          }).start(() => {
            setShowInstructions(false);
          });
        }, fadeDelay);

        return () => clearTimeout(fadeTimeout);
      }
    } else {
      // Practice paused or not started - show instructions
      fadeTriggeredRef.current = false;
      setShowInstructions(true);

      Animated.timing(instructionsOpacity, {
        toValue: 1,
        duration: fadeInDuration,
        useNativeDriver: true,
      }).start();
    }

    return undefined;
  }, [isActive, instructionsOpacity, fadeDelay, fadeDuration, fadeInDuration]);

  return {
    opacity: instructionsOpacity,
    showInstructions,
  };
}
