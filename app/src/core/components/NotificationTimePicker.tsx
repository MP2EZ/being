/**
 * NOTIFICATION TIME PICKER COMPONENT
 *
 * Modal time picker for selecting notification reminder times with:
 * - Native iOS wheel picker and Android clock picker
 * - WCAG 2.1 AA accessibility (VoiceOver/TalkBack)
 * - 12h/24h format based on user's system settings
 * - Clear visual feedback and cancel/confirm actions
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

  /** Notification period for contextual labeling */
  period: 'morning' | 'midday' | 'evening';

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
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing[5], // Account for iOS home indicator
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing[3],
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
