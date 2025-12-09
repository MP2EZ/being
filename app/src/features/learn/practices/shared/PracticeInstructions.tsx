import React from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { sharedPracticeStyles } from './sharedPracticeStyles';
import { useInstructionsFade } from './useInstructionsFade';
import { colorSystem, spacing, typography } from '@/core/theme';

interface PracticeInstructionsProps {
  text: string | string[]; // Single string or array of instruction steps
  isActive: boolean; // Practice active state (triggers fade)
  variant?: 'simple' | 'numbered'; // Simple text or numbered list (default: 'simple')
  fadeOptions?: {
    fadeDelay?: number;
    fadeDuration?: number;
    fadeInDuration?: number;
  };
  testID?: string;
}

const PracticeInstructions: React.FC<PracticeInstructionsProps> = ({
  text,
  isActive,
  variant = 'simple',
  fadeOptions,
  testID = 'practice-instructions',
}) => {
  const { opacity, showInstructions } = useInstructionsFade(isActive, fadeOptions);

  const renderSimpleVariant = () => {
    const displayText = Array.isArray(text) ? text[0] : text;
    return (
      <Text style={sharedPracticeStyles.instructionsText}>
        {displayText}
      </Text>
    );
  };

  const renderNumberedVariant = () => {
    const instructions = Array.isArray(text) ? text : [text];
    return (
      <>
        <Text style={styles.instructionsLabel}>Instructions:</Text>
        {instructions.map((instruction, index) => (
          <View key={index} style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>{index + 1}.</Text>
            <Text style={styles.instructionText}>{instruction}</Text>
          </View>
        ))}
      </>
    );
  };

  return (
    <Animated.View
      style={[sharedPracticeStyles.instructionsSection, { opacity }]}
      pointerEvents={showInstructions ? 'auto' : 'none'}
      testID={testID}
    >
      {variant === 'simple' ? renderSimpleVariant() : renderNumberedVariant()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  instructionsLabel: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.navigation.learn,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  instructionItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: spacing.sm,
  },
  instructionNumber: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.navigation.learn,
    marginRight: spacing.xs,
    minWidth: spacing[5],
  },
  instructionText: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[800],
    lineHeight: spacing[5] + spacing.xs,
  },
});

export default PracticeInstructions;
