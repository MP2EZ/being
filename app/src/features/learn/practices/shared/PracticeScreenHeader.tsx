/**
 * Practice Screen Header - Shared DRY Component
 * Used across all practice screens for consistent navigation
 *
 * WCAG AA compliant:
 * - 44×44 minimum touch target (back button)
 * - Proper accessibility labels and hints
 * - Screen reader support
 * - Text scales with Dynamic Type (DEBUG-619): the slots grow with their text, and at
 *   accessibility sizes the title wraps on its own line instead of truncating
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { colorSystem, spacing, typography, borderRadius, semantic } from '@/core/theme';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';
import {
  PRACTICE_HEADER_CONTROL_MAX_FONT_SCALE,
  practiceHeaderStacksTitle,
} from './practiceScreenHeaderLayout';

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
  const { fontScale } = useWindowDimensions();
  const stacked = practiceHeaderStacksTitle(fontScale);

  return (
    <View style={[styles.header, stacked && styles.headerStacked]} testID={testID}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityHint="Return to previous screen"
        testID={`${testID}-back-button`}
      >
        <Text
          style={styles.backButtonText}
          maxFontSizeMultiplier={PRACTICE_HEADER_CONTROL_MAX_FONT_SCALE}
        >
          ←
        </Text>
      </TouchableOpacity>

      {/* Title. One centred line at standard sizes; at accessibility sizes it wraps
          onto its own full-width line, uncapped, rather than truncating. */}
      <Text
        style={[styles.headerTitle, stacked && styles.headerTitleStacked]}
        {...(!stacked && { numberOfLines: 1 })}
        testID={`${testID}-title`}
      >
        {title}
      </Text>

      {/* Right Side: Spacer or Progress Counter. The empty spacer only balances a
          one-line title; stacked, it would be a blank row, so it is not rendered. */}
      {(!stacked || progress) && (
        <View
          style={[styles.headerRight, stacked && styles.headerRightStacked]}
          testID={`${testID}-right`}
        >
          {progress && (
            <Text
              style={styles.progressText}
              testID={`${testID}-progress`}
              maxFontSizeMultiplier={PRACTICE_HEADER_CONTROL_MAX_FONT_SCALE}
              accessibilityLabel={`${progress.current} of ${progress.total}`}
            >
              {progress.current}/{progress.total}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  headerStacked: {
    flexWrap: 'wrap',
  },
  backButton: {
    // DEBUG-619: minimum, not fixed, so the scaled glyph grows the box instead of
    // clipping inside it. The 44×44 touch target is still guaranteed.
    minWidth: TOUCH_TARGETS.minimum,
    minHeight: TOUCH_TARGETS.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xxl,
  },
  backButtonText: {
    fontSize: typography.headline4.size,
    color: colorSystem.navigation.learn,
  },
  headerTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight as any,
    color: semantic.text.primary,
    textAlign: 'center',
    flex: 1,
    marginHorizontal: spacing[8],
  },
  // Order in the tree stays back, title, progress, so the screen-reader order is the
  // same at every size; flexBasis pushes the title onto the next line.
  headerTitleStacked: {
    flexBasis: '100%',
    flexGrow: 0,
    marginHorizontal: 0,
    marginTop: spacing[4],
  },
  headerRight: {
    // Width only: this is a spacer or a counter, not a touch target, and a minHeight
    // would grow the header row (DEBUG-365).
    minWidth: TOUCH_TARGETS.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightStacked: {
    marginLeft: 'auto',
  },
  progressText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.secondary,
  },
});

export default PracticeScreenHeader;
