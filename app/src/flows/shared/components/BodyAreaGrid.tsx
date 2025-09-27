/**
 * Body Area Grid Component
 * DRD-compliant interactive body area selection for body scan exercises
 * Clinical: Inclusive language, gentle awareness, MBCT-compliant
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
  disabled?: boolean;
  theme?: 'morning' | 'midday' | 'evening';
}

// Clinical body areas - inclusive and accessible to all users
const BODY_AREAS = [
  'Head',
  'Neck', 
  'Shoulders',
  'Chest',
  'Upper Back',
  'Lower Back',
  'Stomach',
  'Hips',
  'Legs',
  'Feet'
];

const BodyAreaGrid: React.FC<BodyAreaGridProps> = ({
  selectedAreas = [],
  onAreaSelect,
  disabled = false,
  theme = 'morning',
}) => {
  const themeColors = colorSystem.themes[theme];

  const handleAreaPress = (area: string) => {
    if (disabled || !onAreaSelect) return;
    
    // Gentle haptic feedback for selection
    Vibration.vibrate(50);
    onAreaSelect(area);
  };

  const isAreaSelected = (area: string) => selectedAreas.includes(area);

  const BodyAreaButton: React.FC<{ area: string }> = ({ area }) => {
    const selected = isAreaSelected(area);
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.areaButton,
          {
            backgroundColor: selected 
              ? themeColors.primary
              : colorSystem.base.white,
            borderColor: selected 
              ? themeColors.primary 
              : colorSystem.gray[300],
            opacity: disabled ? 0.6 : (pressed ? 0.8 : 1),
            transform: [{ scale: pressed && !disabled ? 0.95 : 1 }],
          }
        ]}
        onPress={() => handleAreaPress(area)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${area} body area`}
        accessibilityHint={`Tap to ${selected ? 'deselect' : 'select'} ${area} for body awareness`}
        accessibilityState={{ selected, disabled }}
      >
        <Text style={[
          styles.areaButtonText,
          {
            color: selected 
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

      {/* Selection Summary */}
      {selectedAreas.length > 0 && (
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