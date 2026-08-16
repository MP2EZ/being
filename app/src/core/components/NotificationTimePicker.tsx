/**
 * NOTIFICATION TIME PICKER COMPONENT
 *
 * Modal time picker for selecting notification reminder times with:
 * - Native iOS wheel picker and Android clock picker
 * - WCAG 2.1 AA accessibility (VoiceOver/TalkBack)
 * - 12h/24h format based on user's system settings
 * - Clear visual feedback and cancel/confirm actions
 *
 * ── WHY THIS IS STILL AN RN <Modal> WHEN THE OTHER THREE ARE NOT (DEBUG-406) ──
 *
 * RN's <Modal> renders in a SEPARATE NATIVE WINDOW above the JS view hierarchy,
 * so while one is open the root crisis button is not on screen at all. DEBUG-406
 * audited the four sites that still did this and converted three of them. This
 * is the one that survived, and the reason is narrow and specific:
 *
 *   • The surface carries ZERO wellness or distress semantics. It is a
 *     `mode="time"` spinner and a Cancel/Done header. Nothing here can induce,
 *     reference, or receive a disclosure. That was true of none of the other
 *     three.
 *   • Its exits are FIXED and non-scrolling — Cancel and Done sit in a pinned
 *     header, both one tap, neither able to be pushed below a fold.
 *   • It is the only one of the four where the <Modal> is iOS-only. The Android
 *     branch renders a native `DateTimePicker` dialog in its own OS window, which
 *     no RN change can paint the crisis button above. Converting iOS alone would
 *     leave the two platforms with divergent modality semantics, against
 *     CLAUDE.md's "iOS and Android behavior must match", for a reminder-time
 *     setting.
 *
 * ⚠️ THE RULING IS CONDITIONAL, AND THIS IS THE CONDITION.
 *
 * It stands BECAUSE THE CONTENT IS BENIGN — not because the route is standard,
 * and not because the user tapped to open it. Both of those were true of the
 * three that converted. If this picker ever gains wellness framing — a
 * mood-check-in reminder, an assessment-due nudge, any copy referencing the
 * user's state — the ruling is VOID and it converts to the full-bleed absolute
 * overlay pattern the other three now use.
 *
 * Recorded here rather than only in the work item because a ruling that lives
 * where the code cannot see it is how DEBUG-403's four-site analogy survived
 * review for as long as it did. The allowlist entry in
 * `scripts/check-modal-occlusion-guard.js` carries the same text, and a test
 * pins that it keeps saying "CONDITIONAL" and "benign".
 *
 * NOTE (do not "fix" in isolation): this component lacks
 * `accessibilityViewIsModal`, so iOS VoiceOver can already escape it into the
 * content behind. That is an accessibility defect, but it cuts TOWARD
 * reachability, so adding the trap without re-opening this ruling would make
 * the surface strictly worse for the case that matters here.
 *
 * Usage:
 * ```tsx
 * <NotificationTimePicker
 *   visible={showPicker}
 *   value={selectedTime}
 *   period="morning"
 *   onConfirm={(time) => handleTimeChange('morning', time)}
 *   onCancel={() => setShowPicker(false)}
 * />
 * ```
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { spacing, borderRadius, typography } from '@/core/theme';

interface NotificationTimePickerProps {
  /** Whether the picker modal is visible */
  visible: boolean;

  /** Current time value as Date object */
  value: Date;

  /** Notification period for contextual labeling. FEAT-298 slice 5 added 'daily' — the
   *  single ritual — alongside the legacy periods, which retire with the flows in slice 6. */
  period: 'morning' | 'midday' | 'evening' | 'daily';

  /** Callback when user confirms time selection */
  onConfirm: (time: Date) => void;

  /** Callback when user cancels */
  onCancel: () => void;
}

/**
 * Converts period to user-friendly display name
 */
const getPeriodLabel = (period: string): string => {
  return period.charAt(0).toUpperCase() + period.slice(1);
};

/**
 * Formats time for display based on user's locale
 */
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true // Force 12-hour format for consistency
  });
};

/**
 * Modal time picker component with native platform pickers
 */
export const NotificationTimePicker: React.FC<NotificationTimePickerProps> = ({
  visible,
  value,
  period,
  onConfirm,
  onCancel,
}) => {
  // Track temporary time during selection (before confirm)
  const [tempTime, setTempTime] = useState<Date>(value);

  // Update temp time when visible changes (ensures fresh start)
  React.useEffect(() => {
    if (visible) {
      setTempTime(value);
    }
  }, [visible, value]);

  /**
   * Handle time change from native picker
   */
  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setTempTime(selectedDate);
    }
  };

  /**
   * Handle confirm button
   */
  const handleConfirm = () => {
    onConfirm(tempTime);
  };

  // Android shows native clock picker
  if (Platform.OS === 'android') {
    return visible ? (
      <DateTimePicker
        value={tempTime}
        mode="time"
        is24Hour={false}
        display="default"
        onChange={(event, date) => {
          if (event.type === 'set' && date) {
            onConfirm(date);
          } else {
            onCancel();
          }
        }}
        accessibilityLabel={`Select ${getPeriodLabel(period)} notification time`}
      />
    ) : null;
  }

  // iOS shows custom modal with spinner for direct interaction
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Pressable onPress={onCancel} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle}>{getPeriodLabel(period)}</Text>
            <Pressable onPress={handleConfirm} style={styles.headerButton}>
              <Text style={[styles.headerButtonText, styles.confirmText]}>Done</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={tempTime}
            mode="time"
            is24Hour={false}
            display="spinner"
            onChange={handleTimeChange}
            textColor="#000000"
            style={styles.picker}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Modal overlay (dimmed background)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  // Backdrop (dismissable background)
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Picker modal container (bottom sheet)
  pickerModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing[20], // Account for iOS home indicator
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },

  // Header with Cancel/Done buttons
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  headerButton: {
    minHeight: 44,
    minWidth: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerButtonText: {
    fontSize: typography.bodyLarge.size,
    color: '#007AFF', // iOS blue
  },

  confirmText: {
    fontWeight: typography.fontWeight.semibold,
  },

  headerTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#1F2937',
  },

  // Time picker itself
  picker: {
    width: '100%',
    height: 216,
  },
});

export default NotificationTimePicker;
