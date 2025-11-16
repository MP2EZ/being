/**
 * RadioGroup Component - WCAG AA Compliant
 * 
 * ACCESSIBILITY SPECIFICATIONS:
 * - Proper radio group semantics with ARIA attributes
 * - Arrow key navigation within radio group
 * - Tab key navigation between groups
 * - Visible focus indicators meeting WCAG contrast requirements (4.5:1 minimum)
 * - Screen reader announcements for state changes
 * - Support for clinical assessment contexts (PHQ-9/GAD-7)
 */


import { logSecurity, logPerformance, logError, LogCategory } from '@/core/services/logging';
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { colorSystem, spacing, typography } from '@/core/theme/colors';

export interface RadioOption {
  value: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value?: (string | number) | undefined;
  onValueChange: (value: string | number) => void;
  label: string;
  description?: string | undefined;
  orientation?: ('vertical' | 'horizontal') | undefined;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
  error?: string | undefined;
  testID?: string | undefined;
  // Clinical-specific props
  clinicalContext?: ('phq9' | 'gad7' | 'general') | undefined;
  showScores?: boolean | undefined;
  theme?: ('morning' | 'midday' | 'evening' | 'neutral') | undefined;
  // Visual customization
  showRadioIndicator?: boolean | undefined; // Show visual radio button circle (default: true)
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  onValueChange,
  label,
  description,
  orientation = 'vertical',
  disabled = false,
  required = false,
  error,
  testID,
  clinicalContext = 'general',
  showScores = false,
  theme = 'neutral',
  showRadioIndicator = true, // Default true for backward compatibility
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const radioRefs = useRef<(View | null)[]>([]);
  const groupRef = useRef<View>(null);

  // Theme-based styling
  const themeColors = useMemo(() => {
    if (theme === 'neutral') {
      return {
        primary: colorSystem.base.midnightBlue,
        light: colorSystem.gray[200],
        background: colorSystem.base.white,
      };
    }
    return colorSystem.themes[theme];
  }, [theme]);

  // Generate unique group ID for ARIA
  const groupId = useMemo(() => `radio-group-${Math.random().toString(36).substr(2, 9)}`, []);
  
  // Find current selected index
  const selectedIndex = useMemo(() => {
    return options.findIndex(option => option.value === value);
  }, [options, value]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: any, index: number) => {
    if (disabled) return;

    const key = event.nativeEvent?.key;
    if (!key) return;

    let newIndex = index;
    
    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        newIndex = (index + 1) % options.length;
        // Skip disabled options
        while (options[newIndex]?.disabled && newIndex !== index) {
          newIndex = (newIndex + 1) % options.length;
        }
        break;
      
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = index === 0 ? options.length - 1 : index - 1;
        // Skip disabled options
        while (options[newIndex]?.disabled && newIndex !== index) {
          newIndex = newIndex === 0 ? options.length - 1 : newIndex - 1;
        }
        break;
      
      case 'Space':
      case 'Enter':
        event.preventDefault();
        if (!options[index]?.disabled) {
          handleOptionSelect(options[index]!.value, index);
        }
        return;
      
      default:
        return;
    }

    // Focus the new option
    if (newIndex !== index && radioRefs.current[newIndex]) {
      setFocusedIndex(newIndex);
      // In React Native, we announce the focus change
      AccessibilityInfo.announceForAccessibility(
        `${options[newIndex]!.label}${showScores ? `, score ${options[newIndex]!.value}` : ''}`
      );
    }
  }, [disabled, options, showScores]);

  // Handle option selection
  const handleOptionSelect = useCallback((optionValue: string | number, index: number) => {
    if (disabled || options[index]?.disabled) return;

    const startTime = performance.now();
    onValueChange(optionValue);

    // Announce selection to screen readers
    const option = options[index];
    if (!option) return;

    AccessibilityInfo.announceForAccessibility(
      `Selected: ${option.label}${showScores ? `, score ${optionValue}` : ''}`
    );
    
    // Performance monitoring for clinical contexts
    const responseTime = performance.now() - startTime;
    if (clinicalContext !== 'general' && responseTime > 100) {
      logSecurity('Radio selection response time exceeded', 'medium', {
        responseTime,
        threshold: 100,
        context: 'clinical'
      });
    }
  }, [disabled, options, onValueChange, showScores, clinicalContext]);

  // Handle focus management
  const handleFocus = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  // Render individual radio option
  const renderRadioOption = useCallback((option: RadioOption, index: number) => {
    const isSelected = option.value === value;
    const isFocused = focusedIndex === index;
    const isDisabled = disabled || option.disabled;
    
    return (
      <Pressable
        key={`${option.value}-${index}`}
        ref={(ref) => { radioRefs.current[index] = ref; }}
        style={({ pressed }) => [
          styles.radioOption,
          orientation === 'horizontal' && styles.radioOptionHorizontal,
          isSelected && [styles.radioOptionSelected, { 
            backgroundColor: themeColors.primary + '10', // 10% opacity
            borderColor: themeColors.primary,
          }],
          isFocused && [styles.radioOptionFocused, {
            borderColor: colorSystem.accessibility.focus.primary,
            shadowColor: colorSystem.accessibility.focus.primary,
          }],
          isDisabled && styles.radioOptionDisabled,
          pressed && !isDisabled && styles.radioOptionPressed,
          error && styles.radioOptionError,
        ]}
        onPress={() => handleOptionSelect(option.value, index)}
        onFocus={() => handleFocus(index)}
        onBlur={handleBlur}
        {...{ onKeyPress: (event: any) => handleKeyDown(event, index) } as any}
        accessibilityRole="radio"
        accessibilityState={{ 
          selected: isSelected, 
          disabled: isDisabled 
        }}
        accessibilityLabel={`${option.label}${showScores ? `, score ${option.value}` : ''}${option.description ? `, ${option.description}` : ''}`}
        accessibilityHint={isSelected ? 'Currently selected' : 'Tap to select this option'}
        testID={`${testID}-option-${option.value}`}
        disabled={isDisabled}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        // React Native doesn't support onKeyDown directly, but we can use accessible props
        accessible={true}
        importantForAccessibility="yes"
      >
        <View style={[
          styles.radioOptionContent,
          !showRadioIndicator && styles.radioOptionContentCentered
        ]}>
          {/* Radio button visual indicator (optional) */}
          {showRadioIndicator && (
            <View style={[
              styles.radioButton,
              isSelected && [styles.radioButtonSelected, {
                backgroundColor: themeColors.primary,
                borderColor: themeColors.primary,
              }],
              isFocused && [styles.radioButtonFocused, {
                borderColor: colorSystem.accessibility.focus.primary,
              }],
              isDisabled && styles.radioButtonDisabled,
              error && styles.radioButtonError,
            ]}>
              {isSelected && (
                <View style={[
                  styles.radioButtonInner,
                  { backgroundColor: colorSystem.base.white }
                ]} />
              )}
            </View>
          )}

          {/* Option content */}
          <View style={[
            styles.radioContent,
            !showRadioIndicator && styles.radioContentCentered
          ]}>
            <Text style={[
              styles.radioLabel,
              !showRadioIndicator && styles.radioLabelCentered,
              isSelected && styles.radioLabelSelected,
              isDisabled && styles.radioLabelDisabled,
            ]}>
              {option.label}
            </Text>
            
            {option.description && (
              <Text style={[
                styles.radioDescription,
                isDisabled && styles.radioDescriptionDisabled,
              ]}>
                {option.description}
              </Text>
            )}
            
            {showScores && (
              <Text style={[
                styles.radioScore,
                isSelected && styles.radioScoreSelected,
                isDisabled && styles.radioScoreDisabled,
              ]}>
                ({option.value})
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  }, [
    value, 
    focusedIndex, 
    disabled, 
    orientation, 
    themeColors.primary, 
    error, 
    handleOptionSelect, 
    handleFocus, 
    handleBlur, 
    handleKeyDown, 
    showScores, 
    testID
  ]);

  return (
    <View 
      ref={groupRef}
      style={[
        styles.container,
        orientation === 'horizontal' && styles.containerHorizontal,
        disabled && styles.containerDisabled,
      ]}
      testID={testID}
    >
      {/* Group label */}
      {label && (
        <Text
          style={[
            styles.groupLabel,
            required && styles.groupLabelRequired,
            disabled && styles.groupLabelDisabled,
            error && styles.groupLabelError,
          ]}
          accessibilityRole="header"
          nativeID={`${groupId}-label`}
        >
          {label}
          {required && <Text style={styles.requiredIndicator}> *</Text>}
        </Text>
      )}
      
      {/* Group description */}
      {description && (
        <Text 
          style={[
            styles.groupDescription,
            disabled && styles.groupDescriptionDisabled,
          ]}
          nativeID={`${groupId}-description`}
        >
          {description}
        </Text>
      )}
      
      {/* Radio options */}
      <View 
        style={[
          styles.optionsContainer,
          orientation === 'horizontal' && styles.optionsContainerHorizontal,
        ]}
        accessibilityRole="radiogroup"
      >
        {options.map(renderRadioOption)}
      </View>
      
      {/* Error message */}
      {error && (
        <Text 
          style={styles.errorText}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={`${testID}-error`}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  containerHorizontal: {
    // Horizontal container adjustments if needed
  },
  containerDisabled: {
    opacity: 0.6,
  },
  
  // Group styling
  groupLabel: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyLarge.size * 1.3,
  },
  groupLabelRequired: {
    // Required styling handled by requiredIndicator
  },
  groupLabelDisabled: {
    color: colorSystem.accessibility.text.tertiary,
  },
  groupLabelError: {
    color: colorSystem.status.error,
  },
  requiredIndicator: {
    color: colorSystem.status.error,
    fontWeight: '700',
  },
  groupDescription: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyRegular.size * 1.4,
    marginTop: -spacing.xs, // Reduce gap after label
  },
  groupDescriptionDisabled: {
    color: colorSystem.accessibility.text.tertiary,
  },
  
  // Options container
  optionsContainer: {
    gap: spacing.sm,
  },
  optionsContainerHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  
  // Individual radio options
  radioOption: {
    backgroundColor: colorSystem.base.white,
    borderWidth: 2,
    borderColor: colorSystem.gray[300],
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 64, // WCAG touch target requirement
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  radioOptionHorizontal: {
    flex: 1,
    marginRight: spacing.sm,
  },
  radioOptionSelected: {
    borderWidth: 2,
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  radioOptionFocused: {
    borderWidth: 3, // Thicker border for focus
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    // Focus ring effect
    transform: [{ scale: 1.02 }],
  },
  radioOptionDisabled: {
    backgroundColor: colorSystem.gray[100],
    borderColor: colorSystem.gray[200],
  },
  radioOptionPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  radioOptionError: {
    borderColor: colorSystem.status.error,
    backgroundColor: colorSystem.status.errorBackground,
  },
  
  // Option content layout
  radioOptionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  radioOptionContentCentered: {
    justifyContent: 'center',
  },
  
  // Radio button visual
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colorSystem.gray[400],
    backgroundColor: colorSystem.base.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2, // Align with text baseline
  },
  radioButtonSelected: {
    borderWidth: 2,
  },
  radioButtonFocused: {
    borderWidth: 3, // Thicker border for focus
  },
  radioButtonDisabled: {
    borderColor: colorSystem.gray[300],
    backgroundColor: colorSystem.gray[100],
  },
  radioButtonError: {
    borderColor: colorSystem.status.error,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  
  // Text content
  radioContent: {
    flex: 1,
    gap: spacing.xs,
  },
  radioContentCentered: {
    alignItems: 'center',
  },
  radioLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyRegular.size * 1.3,
  },
  radioLabelCentered: {
    textAlign: 'center',
  },
  radioLabelSelected: {
    fontWeight: '600',
  },
  radioLabelDisabled: {
    color: colorSystem.accessibility.text.tertiary,
  },
  radioDescription: {
    fontSize: typography.caption.size,
    fontWeight: typography.caption.weight,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.caption.size * 1.4,
  },
  radioDescriptionDisabled: {
    color: colorSystem.accessibility.text.tertiary,
  },
  radioScore: {
    fontSize: typography.caption.size,
    fontWeight: typography.caption.weight,
    color: colorSystem.accessibility.text.tertiary,
  },
  radioScoreSelected: {
    color: colorSystem.accessibility.text.secondary,
    fontWeight: '600',
  },
  radioScoreDisabled: {
    color: colorSystem.gray[400],
  },
  
  // Error styling
  errorText: {
    fontSize: typography.caption.size,
    fontWeight: typography.caption.weight,
    color: colorSystem.status.error,
    lineHeight: typography.caption.size * 1.4,
    marginTop: -spacing.xs, // Reduce gap
  },
});

export default RadioGroup;