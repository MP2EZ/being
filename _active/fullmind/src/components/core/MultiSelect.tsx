import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius } from '../../constants/colors';

interface MultiSelectProps {
  items: string[];
  selected?: string[];
  onChange: (selected: string[]) => void;
  columns?: number;
  theme?: 'morning' | 'midday' | 'evening' | null;
  style?: any;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  items,
  selected = [],
  onChange,
  columns = 2,
  theme = null,
  style
}) => {
  const { colorSystem } = useTheme();
  const accentColor = theme ? colorSystem.themes[theme].primary : colorSystem.status.info;
  
  const handleItemPress = (item: string) => {
    const newSelected = selected.includes(item)
      ? selected.filter(s => s !== item)
      : [...selected, item];
    onChange(newSelected);
  };

  const renderItem = ({ item }: { item: string }) => {
    const isSelected = selected.includes(item);
    
    return (
      <TouchableOpacity
        style={[
          styles.item,
          {
            backgroundColor: isSelected ? accentColor : colorSystem.gray[200],
            marginHorizontal: 4,
          }
        ]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.itemText,
            {
              color: isSelected ? 'white' : colorSystem.base.black,
            }
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={items}
        renderItem={renderItem}
        numColumns={columns}
        key={columns} // Force re-render when columns change
        keyExtractor={(item) => item}
        contentContainerStyle={styles.grid}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  grid: {
    justifyContent: 'space-between',
  },
  item: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: borderRadius.medium,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
});