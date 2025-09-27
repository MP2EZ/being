import React, { useState } from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius } from '../../constants/colors';

interface TextAreaProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  minHeight?: number;
  theme?: 'morning' | 'midday' | 'evening' | null;
  style?: any;
}

export const TextArea: React.FC<TextAreaProps> = ({
  value,
  onChangeText,
  placeholder,
  minHeight = 100,
  theme = null,
  style,
  ...props
}) => {
  const { colorSystem } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  
  const accentColor = theme ? colorSystem.themes[theme].primary : colorSystem.status.info;
  const borderColor = isFocused ? accentColor : colorSystem.gray[300];

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline
      textAlignVertical="top"
      style={[
        styles.textArea,
        {
          minHeight,
          backgroundColor: colorSystem.gray[200],
          borderColor,
          color: colorSystem.base.black,
        },
        style
      ]}
      placeholderTextColor={colorSystem.gray[500]}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  textArea: {
    width: '100%',
    padding: 16,
    borderWidth: 1,
    borderRadius: borderRadius.large,
    fontSize: 16,
    fontFamily: 'System',
  },
});