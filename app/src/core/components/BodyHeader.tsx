/**
 * BodyHeader — shared in-body page header for the content tab screens.
 *
 * MAINT-257: locks the harmonized header idiom — left-aligned `headline2` title,
 * borderless, optional `bodyRegular` subtitle — across Learn / Insights / Profile
 * so the tab landings can't silently re-diverge again. Home stays bespoke: its
 * centered `display2` "Being" wordmark is the one intentional brand exception.
 *
 * The component owns the idiom (typography, left alignment, heading semantics,
 * no border). Each screen passes `containerStyle` for its own outer spacing only
 * (the three screens sit in different padding contexts — Learn is a fixed header
 * with its own horizontal padding; Insights/Profile sit inside scroll content).
 * Colors are explicit theme tokens, never `getTheme()`-derived — headers stay
 * theme-static so the time-of-day flow accents can't bleed into chrome.
 */
import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colorSystem, spacing, typography } from '@/core/theme';

interface BodyHeaderProps {
  title: string;
  subtitle?: string;
  /** Screen-specific outer spacing (padding/margin). The idiom itself is locked. */
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export const BodyHeader: React.FC<BodyHeaderProps> = ({
  title,
  subtitle,
  containerStyle,
  testID,
}) => (
  <View style={containerStyle} testID={testID}>
    <Text style={styles.title} accessibilityRole="header" accessibilityLevel={1}>
      {title}
    </Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.midnightBlue,
    marginBottom: spacing[4],
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    lineHeight: 22,
  },
});

export default BodyHeader;
