/**
 * SubMenu Header Component
 * Provides consistent header with X close button for profile submenus
 *
 * Pattern matches check-in flow navigation headers for UX consistency
 * 44x44 touch target meets WCAG AA accessibility requirements
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colorSystem, spacing, typography } from '@/core/theme';

interface SubMenuHeaderProps {
  title: string;
  onClose: () => void;
}

const SubMenuHeader: React.FC<SubMenuHeaderProps> = ({ title, onClose }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButton}
        accessibilityLabel={`Close ${title}`}
        accessibilityRole="button"
        accessibilityHint="Returns to profile menu"
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      {/* Spacer to center title */}
      <View style={styles.spacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
    backgroundColor: colorSystem.base.white,
  },
  closeButton: {
    padding: spacing[8],
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: typography.headline4.size,
    color: colorSystem.base.black,
    fontWeight: typography.fontWeight.light,
  },
  title: {
    flex: 1,
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    textAlign: 'center',
  },
  spacer: {
    width: 44, // Match close button width for centering
  },
});

export default SubMenuHeader;
