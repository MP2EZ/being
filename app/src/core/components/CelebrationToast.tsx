/**
 * CELEBRATION TOAST
 *
 * Reusable auto-dismissing celebration modal for flow completion.
 * Displays brief success message with flow metadata, then auto-navigates home.
 *
 * FEAT-46: Convert flow completion screens to auto-toast
 * - Semi-transparent overlay (rgba(0,0,0,0.7))
 * - Centered card (280-340px)
 * - Auto-dismiss after 2 seconds
 * - Tap-anywhere-to-dismiss
 * - Fade animations (200ms in, 300ms out)
 *
 * UX Pattern:
 * - Celebrates completion without adding friction
 * - Sleep-friendly for evening flows (dark overlay, quick dismiss)
 * - Respects user time (especially midday check-ins)
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
} from 'react-native';
import { spacing, borderRadius, typography } from '@/core/theme';

export interface CelebrationToastProps {
  flowType: 'morning' | 'midday' | 'evening';
  screenCount: number;
  duration: number;
  streak: number;
  onComplete: () => void;
}

const FLOW_CONFIG = {
  morning: {
    title: 'Morning Practice Complete',
    color: '#FF9F43',
    bgColor: '#FFF8F0',
  },
  midday: {
    title: 'Midday Check-In Complete',
    color: '#40B5AD',
    bgColor: '#F0F8FF',
  },
  evening: {
    title: 'Evening Examination Complete',
    color: '#4A7C59',
    bgColor: '#F0F5F1',
  },
};

export const CelebrationToast: React.FC<CelebrationToastProps> = ({
  flowType,
  screenCount,
  duration,
  streak,
  onComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const config = FLOW_CONFIG[flowType];

  useEffect(() => {
    // Fade in: 200ms
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Auto-dismiss after 2 seconds visible
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, 2000);

    return () => {
      clearTimeout(dismissTimer);
    };
  }, []);

  const handleDismiss = () => {
    // Fade out: 300ms
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
    });
  };

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={handleDismiss}
      accessibilityLabel="Practice complete celebration"
    >
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={[
                styles.card,
                { backgroundColor: config.bgColor },
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Completion Icon */}
              <Text style={styles.emoji}>✨</Text>

              {/* Title */}
              <Text style={[styles.title, { color: config.color }]}>
                {config.title}
              </Text>

              {/* Stats */}
              <Text style={styles.stats}>
                {screenCount} practices • {duration}m • Day {streak}
              </Text>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    minWidth: 280,
    maxWidth: 340,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xxl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  emoji: {
    fontSize: typography.display1.size,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  stats: {
    fontSize: typography.bodySmall.size,
    color: '#666',
    textAlign: 'center',
  },
});
