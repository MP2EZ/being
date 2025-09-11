/**
 * ResumeSessionDialog - Dialog to ask user if they want to resume a partial check-in
 * Shows when a partial session is detected for the current check-in type
 */

import React from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { Button } from '../core/Button';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

interface ResumeSessionDialogProps {
  visible: boolean;
  checkInType: 'morning' | 'midday' | 'evening';
  onResume: () => void;
  onStartFresh: () => void;
  onCancel?: () => void;
}

const getCheckInDisplayName = (type: 'morning' | 'midday' | 'evening'): string => {
  switch (type) {
    case 'morning': return 'Morning Check-in';
    case 'midday': return 'Midday Reset';
    case 'evening': return 'Evening Reflection';
    default: return 'Check-in';
  }
};

const getThemeColors = (type: 'morning' | 'midday' | 'evening') => {
  return colorSystem.themes[type];
};

export const ResumeSessionDialog: React.FC<ResumeSessionDialogProps> = ({
  visible,
  checkInType,
  onResume,
  onStartFresh,
  onCancel
}) => {
  const displayName = getCheckInDisplayName(checkInType);
  const themeColors = getThemeColors(checkInType);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialog, { borderColor: themeColors.primary }]}>
          <View style={[styles.header, { backgroundColor: themeColors.background }]}>
            <Text style={[styles.title, { color: themeColors.primary }]}>
              Continue {displayName}?
            </Text>
          </View>
          
          <View style={styles.content}>
            <Text style={styles.message}>
              We found a {displayName.toLowerCase()} that you started earlier. 
              Would you like to continue where you left off or start fresh?
            </Text>
          </View>
          
          <View style={styles.actions}>
            <Button
              variant="primary"
              theme={checkInType}
              onPress={onResume}
              fullWidth
            >
              Continue Previous Session
            </Button>
            
            <Button
              variant="outline"
              onPress={onStartFresh}
              fullWidth
            >
              Start Fresh
            </Button>
            
            {onCancel && (
              <Button
                variant="secondary"
                onPress={onCancel}
                fullWidth
              >
                Cancel
              </Button>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialog: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.large,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: spacing.lg,
    borderTopLeftRadius: borderRadius.large - 2,
    borderTopRightRadius: borderRadius.large - 2,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingVertical: spacing.xl,
  },
  message: {
    fontSize: 16,
    color: colorSystem.gray[700],
    lineHeight: 24,
    textAlign: 'center',
  },
  actions: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.sm,
  },
});

export default ResumeSessionDialog;