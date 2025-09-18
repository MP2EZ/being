/**
 * BodyAreaGrid Component - Body awareness selector for morning check-in
 * 2-column grid with 12 body areas for tension/sensation awareness
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';
import { useCommonHaptics } from '../../hooks/useHaptics';

interface BodyAreaGridProps {
  selected: string[];
  onSelectionChange: (areas: string[]) => void;
  theme?: 'morning' | 'midday' | 'evening';
}

const BODY_AREAS = [
  'Head',
  'Neck',
  'Shoulders',
  'Chest',
  'Upper Back',
  'Lower Back',
  'Arms',
  'Hands',
  'Stomach',
  'Hips',
  'Legs',
  'Feet'
];

export const BodyAreaGrid: React.FC<BodyAreaGridProps> = ({
  selected = [],
  onSelectionChange,
  theme = 'morning'
}) => {
  const { onSelect } = useCommonHaptics();
  
  const handleAreaPress = async (area: string) => {
    // Haptic feedback on selection
    await onSelect();
    
    const newSelected = selected.includes(area)
      ? selected.filter(a => a !== area)
      : [...selected, area];
    
    onSelectionChange(newSelected);
  };

  const renderBodyArea = ({ item }: { item: string }) => {
    const isSelected = selected.includes(item);
    const themeColors = colorSystem.themes[theme];
    
    return (
      <TouchableOpacity
        style={[
          styles.bodyArea,
          {
            backgroundColor: isSelected ? themeColors.background : colorSystem.base.white,
            borderColor: isSelected ? themeColors.primary : colorSystem.gray[300],
            borderWidth: isSelected ? 2 : 1,
          }
        ]}
        onPress={() => handleAreaPress(item)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.bodyAreaText,
            {
              color: isSelected ? themeColors.primary : colorSystem.base.black,
              fontWeight: isSelected ? '600' : '400',
            }
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where do you notice sensations in your body?</Text>
      <Text style={styles.subtitle}>Tap areas where you feel tension, relaxation, or other sensations</Text>
      
      <FlatList
        data={BODY_AREAS}
        renderItem={renderBodyArea}
        numColumns={2}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.grid}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  grid: {
    paddingVertical: spacing.sm,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  bodyArea: {
    flex: 0.48,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  bodyAreaText: {
    fontSize: 15,
    textAlign: 'center',
  },
});

export default BodyAreaGrid;