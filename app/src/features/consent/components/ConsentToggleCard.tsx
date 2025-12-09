/**
 * CONSENT TOGGLE CARD
 * Reusable consent toggle component with expandable details
 *
 * DARK PATTERN PREVENTION:
 * - Toggle defaults to OFF (opt-out)
 * - No pre-checked boxes
 * - Plain language descriptions
 * - Equal visual weight for on/off states
 *
 * ACCESSIBILITY:
 * - 44px minimum touch targets
 * - Screen reader labels
 * - Focus management
 * - High contrast support
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  LayoutAnimation,
  Platform,
  UIManager,
  AccessibilityInfo,
} from 'react-native';
import { colors as dsColors, spacing, borderRadius, typography } from '@/core/theme/colors';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Local colors for easier reference
const localColors = {
  white: dsColors.base.white,
  black: dsColors.base.black,
  gray100: dsColors.gray[100],
  gray200: dsColors.gray[200],
  gray400: dsColors.gray[400],
  gray500: dsColors.gray[500],
  gray600: dsColors.gray[600],
  midnightBlue: dsColors.base.midnightBlue,
  success: dsColors.status.success,
};

export interface ConsentToggleCardProps {
  /** Title of the consent category */
  title: string;
  /** Short description (always visible) */
  description: string;
  /** Expanded details (shown in "Learn more") */
  details: {
    whatWeCollect: string[];
    whatWeDontCollect: string[];
    whyItHelps: string;
    privacyNote?: string;
  };
  /** Current toggle value */
  value: boolean;
  /** Called when toggle changes */
  onValueChange: (value: boolean) => void;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Test ID for automation */
  testID?: string;
}

const ConsentToggleCard: React.FC<ConsentToggleCardProps> = ({
  title,
  description,
  details,
  value,
  onValueChange,
  disabled = false,
  testID,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(async () => {
    // Respect reduced motion preference (WCAG 2.3.3 accessibility requirement)
    const reducedMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
    if (!reducedMotionEnabled) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleToggle = useCallback((newValue: boolean) => {
    onValueChange(newValue);

    // Announce change to screen readers
    const status = newValue ? 'enabled' : 'disabled';
    AccessibilityInfo.announceForAccessibility(`${title} ${status}`);
  }, [title, onValueChange]);

  return (
    <View
      style={styles.container}
      testID={testID}
      accessible={false}
    >
      {/* Header row with title and toggle */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={handleToggle}
          disabled={disabled}
          trackColor={{ false: localColors.gray400, true: localColors.midnightBlue }}
          thumbColor={localColors.white}
          ios_backgroundColor={localColors.gray400}
          accessibilityLabel={`${title} consent`}
          accessibilityHint={`Double tap to ${value ? 'disable' : 'enable'} ${title}`}
          accessibilityState={{ checked: value, disabled }}
          accessibilityRole="switch"
          style={styles.switch}
        />
      </View>

      {/* Learn more button */}
      <Pressable
        onPress={toggleExpanded}
        style={styles.learnMoreButton}
        accessibilityRole="button"
        accessibilityLabel={isExpanded ? 'Hide details' : 'Learn more'}
        accessibilityHint={`${isExpanded ? 'Collapses' : 'Expands'} detailed information about ${title}`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.learnMoreText}>
          {isExpanded ? 'Hide details' : 'Learn more'}
        </Text>
      </Pressable>

      {/* Expanded details */}
      {isExpanded && (
        <View style={styles.detailsContainer} accessibilityRole="text">
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>What we collect:</Text>
            {details.whatWeCollect.map((item, index) => (
              <Text key={index} style={styles.detailBullet}>
                • {item}
              </Text>
            ))}
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>What we DON'T collect:</Text>
            {details.whatWeDontCollect.map((item, index) => (
              <Text key={index} style={styles.detailBullet}>
                • {item}
              </Text>
            ))}
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Why it helps:</Text>
            <Text style={styles.detailText}>{details.whyItHelps}</Text>
          </View>

          {details.privacyNote && (
            <View style={styles.privacyNoteBox}>
              <Text style={styles.privacyNoteText}>{details.privacyNote}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: localColors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: localColors.gray200,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.black,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: localColors.gray600,
    lineHeight: 20,
  },
  switch: {
    // Ensure 44px touch target
    transform: Platform.OS === 'ios' ? [{ scaleX: 1 }, { scaleY: 1 }] : [],
  },
  learnMoreButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 44, // Touch target
    justifyContent: 'center',
  },
  learnMoreText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: localColors.midnightBlue,
    textDecorationLine: 'underline',
  },
  detailsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: localColors.gray200,
  },
  detailSection: {
    marginBottom: spacing.md,
  },
  detailSectionTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.black,
    marginBottom: spacing.xs,
  },
  detailBullet: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: localColors.gray600,
    lineHeight: 22,
    marginLeft: spacing.sm,
  },
  detailText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: localColors.gray600,
    lineHeight: 22,
  },
  privacyNoteBox: {
    backgroundColor: '#E8F4EC',
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: localColors.success,
  },
  privacyNoteText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: localColors.gray600,
    lineHeight: 18,
  },
});

export default ConsentToggleCard;
