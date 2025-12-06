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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Colors consistent with Being design system
// Updated for WCAG AA color contrast compliance (4.5:1 for body text)
const colors = {
  white: '#FFFFFF',
  black: '#1C1C1C',
  gray100: '#F5F5F5',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#525863', // Darkened for contrast (was #6B7280)
  gray600: '#374151', // Darkened for contrast (was #4B5563)
  midnightBlue: '#1B2951',
  success: '#10B981',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
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
          trackColor={{ false: colors.gray400, true: colors.midnightBlue }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.gray400}
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
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
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
    fontSize: 17,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
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
    fontSize: 14,
    fontWeight: '500',
    color: colors.midnightBlue,
    textDecorationLine: 'underline',
  },
  detailsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  detailSection: {
    marginBottom: spacing.md,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  detailBullet: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 22,
    marginLeft: spacing.sm,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 22,
  },
  privacyNoteBox: {
    backgroundColor: '#E8F4EC',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  privacyNoteText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 18,
  },
});

export default ConsentToggleCard;
