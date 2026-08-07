import React from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { sharedPracticeStyles } from './sharedPracticeStyles';
import { useInstructionsFade } from './useInstructionsFade';
import { borderRadius, colorSystem, spacing, typography } from '@/core/theme';

interface PracticeInstructionsProps {
  text: string | string[]; // Single string or array of instruction steps
  isActive: boolean; // Practice active state (triggers fade)
  /**
   * 'simple'   — one line, fades out shortly after the practice starts.
   * 'numbered' — the whole list, always rendered.
   * 'stepped'  — DEBUG-353: ONE step at a time, advanced by the caller via
   *   `activeStep`, with a "step N of M" label and progress dots. Used for
   *   loving-kindness, where the nine metta steps run across an 8-minute
   *   session and the practitioner holds one person in mind at a time.
   */
  variant?: 'simple' | 'numbered' | 'stepped';
  /** Zero-based index of the visible step. Only meaningful for 'stepped'. */
  activeStep?: number;
  /**
   * DEBUG-353: keep instructions visible for the whole session instead of
   * fading them 2s after start. Guidance that disappears is fine when the
   * BreathingCircle carries the practice afterwards; it is not fine when the
   * instructions ARE the practice and there is no circle.
   */
  persistent?: boolean;
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
  activeStep = 0,
  persistent = false,
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

  const renderSteppedVariant = () => {
    const steps = Array.isArray(text) ? text : [text];
    // Clamp rather than throw: this renders above RootCrisisButton with no
    // error boundary anywhere in between, so a bad index must degrade, never
    // white-screen the 988 affordance (DEBUG-344).
    const index = Math.min(Math.max(activeStep, 0), steps.length - 1);

    return (
      <>
        <Text style={styles.stepLabel} testID={`${testID}-step-label`}>
          {`Step ${index + 1} of ${steps.length}`}
        </Text>
        <Text style={sharedPracticeStyles.instructionsText} testID={`${testID}-step-text`}>
          {steps[index]}
        </Text>
        <View
          style={styles.stepDots}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: steps.length, now: index + 1 }}
          testID={`${testID}-step-dots`}
        >
          {steps.map((_, i) => (
            <View
              key={i}
              style={[styles.stepDot, i <= index && styles.stepDotFilled]}
            />
          ))}
        </View>
      </>
    );
  };

  const renderVariant = () => {
    if (variant === 'stepped') return renderSteppedVariant();
    if (variant === 'numbered') return renderNumberedVariant();
    return renderSimpleVariant();
  };

  return (
    <Animated.View
      style={[
        sharedPracticeStyles.instructionsSection,
        // `persistent` opts out of the fade entirely rather than tweaking its
        // timing, so the instructions cannot disappear mid-session.
        persistent ? { opacity: 1 } : { opacity },
      ]}
      pointerEvents={persistent || showInstructions ? 'auto' : 'none'}
      testID={testID}
    >
      {renderVariant()}
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
    marginBottom: spacing[8],
  },
  instructionItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: spacing[8],
  },
  instructionNumber: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.navigation.learn,
    marginRight: spacing[4],
    minWidth: spacing[20],
  },
  instructionText: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[800],
    lineHeight: spacing[20] + spacing[4],
  },
  // DEBUG-353 — 'stepped' variant
  stepLabel: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.navigation.learn,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: spacing[8],
    textAlign: 'center' as const,
  },
  stepDots: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: spacing[12],
  },
  stepDot: {
    width: spacing[8],
    height: spacing[8],
    borderRadius: borderRadius.full,
    backgroundColor: colorSystem.gray[300],
    marginHorizontal: spacing[4],
  },
  stepDotFilled: {
    backgroundColor: colorSystem.navigation.learn,
  },
});

export default PracticeInstructions;
