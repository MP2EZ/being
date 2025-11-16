/**
 * Practice Toggle Button - Shared DRY Component
 * Three-state button: Begin → Pause → Resume
 *
 * Used in practices with timer-based progression:
 * - PracticeTimerScreen (breathing)
 * - ReflectionTimerScreen (contemplation)
 * - BodyScanScreen (auto-advancing body scan)
 *
 * WCAG AA compliant:
 * - Minimum 44×44 touch target
 * - Proper accessibility labels for each state
 * - Screen reader support
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme/colors';

interface PracticeToggleButtonProps {
  isActive: boolean;
  elapsedTime: number;
  onToggle: (newState: boolean) => void;
  labels?: {
    begin?: string;
    pause?: string;
    resume?: string;
  };
  style?: ViewStyle;
  testID?: string;
}

const PracticeToggleButton: React.FC<PracticeToggleButtonProps> = ({
  isActive,
  elapsedTime,
  onToggle,
  labels = {},
  style,
  testID = 'practice-toggle-button',
}) => {
  const {
    begin = 'Begin Practice',
    pause = 'Pause',
    resume = 'Resume',
  } = labels;

  /**
   * Determine current state and button label
   */
  const getCurrentState = () => {
    if (elapsedTime === 0) {
      return { label: begin, accessibilityLabel: `${begin}` };
    }
    if (isActive) {
      return { label: pause, accessibilityLabel: `${pause} practice` };
    }
    return { label: resume, accessibilityLabel: `${resume} practice` };
  };

  const { label, accessibilityLabel } = getCurrentState();

  /**
   * Handle button press - toggle state based on current condition
   */
  const handlePress = () => {
    if (elapsedTime === 0) {
      // First press: Begin practice
      onToggle(true);
    } else if (isActive) {
      // Active: Pause
      onToggle(false);
    } else {
      // Paused: Resume
      onToggle(true);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={
        elapsedTime === 0
          ? 'Start the practice session'
          : isActive
          ? 'Pause the practice session'
          : 'Resume the practice session'
      }
      testID={testID}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colorSystem.navigation.learn,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // WCAG AA minimum
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.base.white,
  },
});

export default PracticeToggleButton;
