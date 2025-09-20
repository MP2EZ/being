/**
 * ClinicalIcon Component
 *
 * Standardized icon system for clinical carousel components.
 * Provides consistent visual language and accessibility support.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Svg, Path } from 'react-native-svg';

interface ClinicalIconProps {
  type: 'assessment' | 'outcomes' | 'patterns' | 'warning' | 'info' | 'share' | 'history' | 'verified' | 'brain' | 'shield' | 'analytics';
  size?: number;
  color?: string;
  accessibilityLabel?: string;
}

const ClinicalIcon: React.FC<ClinicalIconProps> = memo(({
  type,
  size = 24,
  color = '#2C5282',
  accessibilityLabel
}) => {
  const getIconPath = () => {
    switch (type) {
      case 'assessment':
        return "M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M7,7H17V9H7V7M7,11H17V13H7V11M7,15H14V17H7V15Z";

      case 'outcomes':
        return "M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z";

      case 'patterns':
        return "M9,17H7V10H9V17M13,17H11V7H13V17M17,17H15V13H17V17M19.5,19.5A1,1 0 0,1 18.5,20.5H5.5A1,1 0 0,1 4.5,19.5V4.5A1,1 0 0,1 5.5,3.5H18.5A1,1 0 0,1 19.5,4.5V19.5M18.5,2H5.5C4.4,2 3.5,2.9 3.5,4V20C3.5,21.1 4.4,22 5.5,22H18.5C19.6,22 20.5,21.1 20.5,20V4C20.5,2.9 19.6,2 18.5,2Z";

      case 'warning':
        return "M12,2L13.09,8.26L22,9L14.74,15.74L17,22L12,17L7,22L9.26,15.74L2,9L10.91,8.26L12,2Z";

      case 'info':
        return "M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z";

      case 'share':
        return "M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9M10,16V19.08L13.08,16H20V4H4V16H10Z";

      case 'history':
        return "M3,3V21L12,17L21,21V3H3M5,5H19V17.16L12,14.16L5,17.16V5Z";

      case 'verified':
        return "M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z";

      case 'brain':
        return "M12,4A4,4 0 0,1 16,8C16,10.53 14.42,12.65 12.36,12.95L11.75,13.82C11.39,14.46 11.21,15.22 11.21,16H13.21C13.21,15.31 13.34,14.64 13.58,14.04L14.19,13.17C16.45,12.87 18,10.66 18,8A6,6 0 0,0 12,2A6,6 0 0,0 6,8C6,10.66 7.55,12.87 9.81,13.17L10.42,14.04C10.66,14.64 10.79,15.31 10.79,16H12.79C12.79,15.22 12.61,14.46 12.25,13.82L11.64,12.95C9.58,12.65 8,10.53 8,8A4,4 0 0,1 12,4M12,20A2,2 0 0,1 10,18H14A2,2 0 0,1 12,20Z";

      case 'shield':
        return "M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.4 16,13V16C16,16.6 15.6,17 15,17H9C8.4,17 8,16.6 8,16V13C8,12.4 8.4,11.5 9,11.5V10C9,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.2,8.7 10.2,10V11.5H13.8V10C13.8,8.7 12.8,8.2 12,8.2Z";

      case 'analytics':
        return "M22,21H2V3H4V19H6V17H10V19H12V16H16V19H18V17H22V21M16,8H18V15H16V8M12,2H14V15H12V2M8,9H10V15H8V9M4,11H6V15H4V11Z";

      default:
        return "M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z";
    }
  };

  return (
    <View
      style={[styles.iconContainer, { width: size, height: size }]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel || `${type} icon`}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill={color} d={getIconPath()} />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center'
  }
});

ClinicalIcon.displayName = 'ClinicalIcon';

export { ClinicalIcon };