/**
 * Practice Screen Header - Shared DRY Component
 * Used across all practice screens for consistent navigation
 *
 * WCAG AA compliant:
 * - 44×44 minimum touch target (back button)
 * - Proper accessibility labels and hints
 * - Screen reader support
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme/colors';

interface PracticeScreenHeaderProps {
  title: string;
  onBack: () => void;
  progress?: { current: number; total: number }; // Optional for SortingPracticeScreen
  testID?: string;
}

const PracticeScreenHeader: React.FC<PracticeScreenHeaderProps> = ({
  title,
  onBack,
  progress,
  testID = 'practice-screen-header',
}) => {
  return (
    <View style={styles.header} testID={testID}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityHint="Return to previous screen"
        testID={`${testID}-back-button`}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>

      {/* Right Side: Spacer or Progress Counter */}
      <View style={styles.headerRight}>
        {progress && (
          <Text
            style={styles.progressText}
            accessibilityLabel={`${progress.current} of ${progress.total}`}
          >
            {progress.current}/{progress.total}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xxl,
    // WCAG AA touch target: 44×44
  },
  backButtonText: {
    fontSize: typography.headline4.size,
    color: colorSystem.navigation.learn,
  },
  headerTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight as any,
    color: colorSystem.base.black,
    textAlign: 'center',
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  headerRight: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[600],
  },
});

export default PracticeScreenHeader;
