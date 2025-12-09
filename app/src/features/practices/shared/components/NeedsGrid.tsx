/**
 * NeedsGrid Component - Support Needs Selection
 * 
 * CLINICAL SPECIFICATIONS:
 * - Single selection for support needs
 * - Therapeutic need categories
 * - 2x3 grid layout
 * - Clear visual feedback
 * - Self-compassion focus
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme/colors';

export interface Need {
  id: string;
  label: string;
  description: string;
}

const NEEDS: Need[] = [
  { id: 'rest', label: 'Rest', description: 'Time to pause and recharge' },
  { id: 'movement', label: 'Movement', description: 'Physical activity or gentle motion' },
  { id: 'connection', label: 'Connection', description: 'Reach out to others or feel belonging' },
  { id: 'focus', label: 'Focus', description: 'Clarity and concentration' },
  { id: 'compassion', label: 'Compassion', description: 'Kindness toward yourself' },
  { id: 'space', label: 'Space', description: 'Room to breathe and reflect' },
];

interface NeedsGridProps {
  selectedNeed: string | null;
  onSelectionChange: (needId: string | null) => void;
  theme?: 'morning' | 'midday' | 'evening';
  testID?: string;
}

const NeedsGrid: React.FC<NeedsGridProps> = ({
  selectedNeed,
  onSelectionChange,
  theme = 'midday',
  testID = 'needs-grid'
}) => {
  const themeColors = colorSystem.themes[theme];

  const handleNeedPress = (needId: string) => {
    // Toggle selection - single choice
    if (selectedNeed === needId) {
      onSelectionChange(null);
    } else {
      onSelectionChange(needId);
    }
  };

  const getNeedStyle = (needId: string, isSelected: boolean) => {
    const dynamicStyle: ViewStyle = isSelected ? {
      backgroundColor: themeColors.primary,
      borderColor: themeColors.primary,
    } : {
      backgroundColor: themeColors.background,
      borderColor: colorSystem.gray[300],
    };

    return [styles.needButton, dynamicStyle];
  };

  const getNeedTextStyle = (isSelected: boolean) => {
    return [
      styles.needText,
      { color: isSelected ? colorSystem.base.white : colorSystem.base.black }
    ];
  };

  const getNeedDescriptionStyle = (isSelected: boolean) => {
    return [
      styles.needDescription,
      { color: isSelected ? colorSystem.base.white : colorSystem.gray[600] }
    ];
  };

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.instructionText}>
        What might support you right now?
      </Text>
      
      <Text style={styles.selectionHint}>
        Choose what feels most supportive in this moment
      </Text>

      <View style={styles.needsGrid}>
        {NEEDS.map((need) => {
          const isSelected = selectedNeed === need.id;
          
          return (
            <Pressable
              key={need.id}
              style={({ pressed }) => [
                ...getNeedStyle(need.id, isSelected),
                { opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={() => handleNeedPress(need.id)}
              accessibilityRole="button"
              accessibilityLabel={`${need.label}: ${need.description}`}
              accessibilityHint={`${isSelected ? 'Selected' : 'Not selected'}. Tap to ${isSelected ? 'deselect' : 'select'} this support need`}
              accessibilityState={{ selected: isSelected }}
              testID={`need-${need.id}`}
            >
              <Text style={getNeedTextStyle(isSelected)}>
                {need.label}
              </Text>
              <Text style={getNeedDescriptionStyle(isSelected)}>
                {need.description}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedNeed && (
        <View style={styles.selectedContainer}>
          <Text style={[styles.selectedLabel, { color: themeColors.primary }]}>
            Supporting yourself with {NEEDS.find(n => n.id === selectedNeed)?.label.toLowerCase()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
  },
  instructionText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: typography.headline4.size,
  },
  selectionHint: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: typography.title.size,
  },
  needsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  needButton: {
    width: '48%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.large,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    minHeight: 88, // Larger for description text
  },
  needText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  needDescription: {
    fontSize: typography.caption.size,
    textAlign: 'center',
    lineHeight: typography.bodyLarge.size,
  },
  selectedContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  selectedLabel: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default NeedsGrid;