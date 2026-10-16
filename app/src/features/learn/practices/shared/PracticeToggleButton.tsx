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
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';
import { practiceHeaderStacksTitle } from './practiceScreenHeaderLayout';

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
  /** Forwarded to the touchable; carries a host's DEBUG-643 __DEV__ exclusion check. */
  onLayout?: ((event: LayoutChangeEvent) => void) | undefined;
}

const PracticeToggleButton: React.FC<PracticeToggleButtonProps> = ({
  isActive,
  elapsedTime,
  onToggle,
  labels = {},
  style,
  testID = 'practice-toggle-button',
  onLayout,
}) => {
  // DEBUG-677: from the AX threshold the label box is too narrow for one AX5 word at
  // spacing[32] on 375-390pt iPhones ("Resum / e"). Narrowing the padding widens the
  // box instead of capping the text.
  const axPadding = practiceHeaderStacksTitle(useWindowDimensions().fontScale);

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
      style={[styles.button, axPadding && styles.buttonAx, style]}
      onLayout={onLayout}
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
    paddingVertical: spacing[24],
    paddingHorizontal: spacing[32],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: spacing[48], // WCAG AA minimum
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: spacing[4],
    },
    shadowOpacity: 0.1,
    shadowRadius: borderRadius.small,
    elevation: 2,
  },
  // Crisis ruling (DEBUG-677): symmetric padding keys only, and merged BEFORE the host
  // `style`, which carries the three hosts' FAB-clearance marginRight. Padding sits inside
  // the frame, so the frame's x-range is unchanged. Never paddingLeft/Right (DEBUG-622).
  buttonAx: {
    paddingHorizontal: spacing[12],
  },
  buttonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
    textAlign: 'center',
  },
});

export default PracticeToggleButton;
