import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing } from '../../constants/colors';

interface CardProps {
  children: React.ReactNode;
  padding?: number;
  theme?: 'morning' | 'midday' | 'evening' | null;
  clickable?: boolean;
  onPress?: () => void;
  style?: any;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = spacing.md,
  theme = null,
  clickable = false,
  onPress,
  style
}) => {
  const { colorSystem } = useTheme();
  
  const getBackgroundColor = () => {
    if (theme) {
      return colorSystem.themes[theme].background;
    }
    return colorSystem.base.white;
  };

  const getBorderColor = () => {
    if (theme) {
      return colorSystem.themes[theme].light;
    }
    return colorSystem.gray[300];
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: getBackgroundColor(),
      borderColor: getBorderColor(),
      padding,
    },
    style
  ];

  if (clickable && onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.large,
    borderWidth: 1,
    marginBottom: 16,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    // Android shadow
    elevation: 2,
  },
});