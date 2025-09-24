/**
 * Typography Component - Therapeutic Text System for Being. MBCT App
 *
 * Features:
 * - Time-of-day adaptive theming (morning/midday/evening)
 * - Mindful typography scaling for accessibility
 * - Crisis-aware text sizing for emergency readability
 * - Therapeutic timing considerations for reading pace
 */

import React, { memo, useMemo } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useThemeColors, useAccessibility } from '../../contexts/ThemeContext';

interface TypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'crisis' | 'therapeutic';
  color?: string;
  align?: 'left' | 'center' | 'right';
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
  style?: TextStyle;
  maxLines?: number;
  selectable?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  // Therapeutic UX props
  mindfulPacing?: boolean; // Enables therapeutic reading pace optimizations
  crisisReadable?: boolean; // Enhances readability for crisis situations
  allowScaling?: boolean; // Allows user font size scaling
}

export const Typography: React.FC<TypographyProps> = memo(({
  children,
  variant = 'body',
  color,
  align = 'left',
  weight = 'regular',
  style,
  maxLines,
  selectable = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  mindfulPacing = false,
  crisisReadable = false,
  allowScaling = true,
}) => {
  const themeColors = useThemeColors();
  const { textScale, isLargeText } = useAccessibility();

  // Memoized typography styles with therapeutic considerations
  const typographyStyles = useMemo(() => {
    const baseStyles: TextStyle = {
      color: color || themeColors.text,
      textAlign: align,
      fontWeight: weight,
    };

    // Crisis-aware sizing for emergency readability
    const crisisMultiplier = crisisReadable ? 1.2 : 1;
    const scalingMultiplier = allowScaling ? textScale : 1;
    const finalMultiplier = crisisMultiplier * scalingMultiplier;

    // Therapeutic typography variants with mindful sizing
    switch (variant) {
      case 'h1':
        return {
          ...baseStyles,
          fontSize: 32 * finalMultiplier,
          lineHeight: 40 * finalMultiplier,
          fontWeight: weight === 'regular' ? '700' : weight,
          letterSpacing: mindfulPacing ? 0.5 : 0,
        };

      case 'h2':
        return {
          ...baseStyles,
          fontSize: 28 * finalMultiplier,
          lineHeight: 36 * finalMultiplier,
          fontWeight: weight === 'regular' ? '600' : weight,
          letterSpacing: mindfulPacing ? 0.3 : 0,
        };

      case 'h3':
        return {
          ...baseStyles,
          fontSize: 24 * finalMultiplier,
          lineHeight: 32 * finalMultiplier,
          fontWeight: weight === 'regular' ? '600' : weight,
          letterSpacing: mindfulPacing ? 0.2 : 0,
        };

      case 'h4':
        return {
          ...baseStyles,
          fontSize: 20 * finalMultiplier,
          lineHeight: 28 * finalMultiplier,
          fontWeight: weight === 'regular' ? '500' : weight,
          letterSpacing: mindfulPacing ? 0.1 : 0,
        };

      case 'body':
        return {
          ...baseStyles,
          fontSize: 16 * finalMultiplier,
          lineHeight: mindfulPacing ? 26 * finalMultiplier : 24 * finalMultiplier,
          fontWeight: weight,
          letterSpacing: mindfulPacing ? 0.1 : 0,
        };

      case 'caption':
        return {
          ...baseStyles,
          fontSize: 14 * finalMultiplier,
          lineHeight: 20 * finalMultiplier,
          fontWeight: weight,
          color: color || themeColors.textSecondary,
        };

      case 'crisis':
        return {
          ...baseStyles,
          fontSize: Math.max(18, 18 * finalMultiplier), // Minimum 18px for crisis
          lineHeight: Math.max(26, 26 * finalMultiplier),
          fontWeight: weight === 'regular' ? '600' : weight,
          letterSpacing: 0.2,
          color: color || themeColors.crisis,
        };

      case 'therapeutic':
        return {
          ...baseStyles,
          fontSize: 17 * finalMultiplier,
          lineHeight: 26 * finalMultiplier, // Generous line height for readability
          fontWeight: weight === 'regular' ? '400' : weight,
          letterSpacing: 0.1,
          color: color || themeColors.text,
        };

      default:
        return {
          ...baseStyles,
          fontSize: 16 * finalMultiplier,
          lineHeight: 24 * finalMultiplier,
          fontWeight: weight,
        };
    }
  }, [
    variant,
    color,
    themeColors,
    align,
    weight,
    textScale,
    allowScaling,
    mindfulPacing,
    crisisReadable,
  ]);

  return (
    <Text
      style={[typographyStyles, style]}
      numberOfLines={maxLines}
      selectable={selectable}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      allowFontScaling={allowScaling}
      maxFontSizeMultiplier={allowScaling ? 2.0 : 1.0} // Respect system accessibility
      testID={testID}
    >
      {children}
    </Text>
  );
});

// Export pre-configured variants for common therapeutic use cases
export const TherapeuticHeading: React.FC<Omit<TypographyProps, 'variant'>> = memo((props) => (
  <Typography variant="therapeutic" weight="semibold" mindfulPacing {...props} />
));

export const CrisisText: React.FC<Omit<TypographyProps, 'variant' | 'crisisReadable'>> = memo((props) => (
  <Typography variant="crisis" crisisReadable weight="semibold" {...props} />
));

export const MindfulBody: React.FC<Omit<TypographyProps, 'variant' | 'mindfulPacing'>> = memo((props) => (
  <Typography variant="body" mindfulPacing {...props} />
));

Typography.displayName = 'Typography';
TherapeuticHeading.displayName = 'TherapeuticHeading';
CrisisText.displayName = 'CrisisText';
MindfulBody.displayName = 'MindfulBody';

export default Typography;