/**
 * Body Area Grid Component
 * DRD-compliant interactive body area selection for body scan exercises
 * Clinical: Inclusive language, gentle awareness, evidence-based
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Vibration 
} from 'react-native';
import { colorSystem, spacing, borderRadius, typography } from '../../../constants/colors';

interface BodyAreaGridProps {
  selectedAreas?: string[];
  onAreaSelect?: (area: string) => void;
  currentArea?: string; // For progressive body scan mode
  mode?: 'selection' | 'progressive'; // Selection = tap to select, Progressive = auto-highlight current
  disabled?: boolean;
  theme?: 'morning' | 'midday' | 'evening';
}

// Clinical body areas - inclusive and accessible to all users
// Grouped into 6 areas for single-screen display
export const BODY_AREAS = [
  'Head & Neck',
  'Shoulders & Chest',
  'Upper Back & Lower Back',
  'Abdomen & Hips',
  'Upper Legs & Lower Legs',
  'Feet'
];

const BodyAreaGrid: React.FC<BodyAreaGridProps> = ({
  selectedAreas = [],
  onAreaSelect,
  currentArea,
  mode = 'selection',
  disabled = false,
  theme = 'morning',
}) => {
  const themeColors = colorSystem.themes[theme];

  const handleAreaPress = (area: string) => {
    if (disabled || !onAreaSelect || mode === 'progressive') return;

    // Gentle haptic feedback for selection
    Vibration.vibrate(50);
    onAreaSelect(area);
  };

  const isAreaActive = (area: string) => {
    // Progressive mode: highlight current area
    if (mode === 'progressive') {
      return area === currentArea;
    }
    // Selection mode: highlight selected areas
    return selectedAreas.includes(area);
  };

  const BodyAreaButton: React.FC<{ area: string }> = ({ area }) => {
    const isActive = isAreaActive(area);
    const isProgressive = mode === 'progressive';

    return (
      <Pressable
        style={({ pressed }) => [
          styles.areaButton,
          {
            backgroundColor: isActive
              ? themeColors.primary
              : colorSystem.base.white,
            borderColor: isActive
              ? themeColors.primary
              : colorSystem.gray[300],
            opacity: disabled ? 0.6 : (pressed && !isProgressive ? 0.8 : 1),
            transform: [{ scale: pressed && !disabled && !isProgressive ? 0.95 : 1 }],
          }
        ]}
        onPress={() => handleAreaPress(area)}
        disabled={disabled || isProgressive}
        accessibilityRole="button"
        accessibilityLabel={`${area} body area`}
        accessibilityHint={isProgressive
          ? `Currently focusing on ${area}`
          : `Tap to ${isActive ? 'deselect' : 'select'} ${area} for body awareness`}
        accessibilityState={{ selected: isActive, disabled: disabled || isProgressive }}
      >
        <Text style={[
          styles.areaButtonText,
          {
            color: isActive
              ? colorSystem.base.white
              : colorSystem.base.black
          }
        ]}>
          {area}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Body Area Grid - 2 columns, 5 rows */}
      <View style={styles.gridContainer}>
        {BODY_AREAS.map((area) => (
          <BodyAreaButton key={area} area={area} />
        ))}
      </View>

      {/* Selection Summary - only in selection mode */}
      {mode === 'selection' && selectedAreas.length > 0 && (
        <View style={[
          styles.summarySection,
          { borderLeftColor: themeColors.primary }
        ]}>
          <Text style={styles.summaryTitle}>
            Areas of awareness:
          </Text>
          <Text style={styles.summaryText}>
            {selectedAreas.join(', ')}
          </Text>
        </View>
      )}

      {/* Current Area Display - only in progressive mode */}
      {mode === 'progressive' && currentArea && (
        <View style={[
          styles.summarySection,
          { borderLeftColor: themeColors.primary }
        ]}>
          <Text style={styles.summaryTitle}>
            Current focus:
          </Text>
          <Text style={[styles.summaryText, { fontSize: typography.bodyRegular.size, fontWeight: '600' }]}>
            {currentArea}
          </Text>
        </View>
      )}

      {/* Therapeutic Note */}
      <View style={[
        styles.noteSection,
        { backgroundColor: themeColors.light }
      ]}>
        <Text style={styles.noteText}>
          💡 There's no "right" or "wrong" way to feel. Simply notice what's here with kindness.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  areaButton: {
    width: '48%', // 2 columns with gap
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56, // WCAG AA touch target size (44pt minimum)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  areaButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    textAlign: 'center',
  },
  summarySection: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
    lineHeight: 20,
  },
  noteSection: {
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginTop: spacing.sm,
  },
  noteText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default BodyAreaGrid;