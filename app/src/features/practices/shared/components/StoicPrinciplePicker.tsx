/**
 * Stoic Principle Picker Component
 *
 * MAINT-65: Collapsible single-select principle picker for flow screens.
 * Used in midday (VirtueResponse) and evening (VirtueReflection) screens.
 *
 * Features:
 * - Collapsible accordion design (starts collapsed, per wireframes)
 * - Single-select (radio-style) - feeds Insights dashboard
 * - Shows principle title + truncated description
 * - Accessibility: proper ARIA roles, focus management
 *
 * 5 Stoic Mindfulness Principles (Philosopher-Validated 9.7/10):
 * 1. Aware Presence - Present-moment attention
 * 2. Radical Acceptance - Amor fati
 * 3. Sphere Sovereignty - Dichotomy of control
 * 4. Virtuous Response - Virtue ethics in action
 * 5. Interconnected Living - Relational ethics
 *
 * @see /docs/design/midday-flow-wireframes-v2.md
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { colorSystem, spacing, borderRadius, typography, getTheme } from '@/core/theme';
import type { StoicPrinciple } from '@/features/practices/types/stoic';
import { PRINCIPLES, getPrincipleByKey } from '@/features/practices/shared/constants/principles';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type FlowTheme = 'morning' | 'midday' | 'evening';

interface StoicPrinciplePickerProps {
  /** Currently selected principle (null if none) */
  value: StoicPrinciple | null;
  /** Callback when selection changes */
  onChange: (value: StoicPrinciple) => void;
  /** Flow theme for styling */
  theme?: FlowTheme;
  /** Label text shown above picker */
  label?: string;
  /** Whether picker starts expanded */
  initiallyExpanded?: boolean;
  /** Whether the picker is required (shows asterisk) */
  required?: boolean;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * StoicPrinciplePicker - Collapsible principle selector
 *
 * @example
 * <StoicPrinciplePicker
 *   value={selectedPrinciple}
 *   onChange={setSelectedPrinciple}
 *   theme="midday"
 *   label="Which principle guided you?"
 *   required
 * />
 */
export const StoicPrinciplePicker: React.FC<StoicPrinciplePickerProps> = ({
  value,
  onChange,
  theme = 'midday',
  label = 'Which principle is guiding you?',
  initiallyExpanded = false,
  required = false,
  disabled = false,
  testID = 'stoic-principle-picker',
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const themeColors = getTheme(theme);
  const selectedPrinciple = value ? getPrincipleByKey(value) : null;

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleSelect = useCallback((principleKey: StoicPrinciple) => {
    onChange(principleKey);
    // Auto-collapse after selection
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(false);
  }, [onChange]);

  return (
    <View style={styles.container} testID={testID}>
      {/* Label */}
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {/* Collapsible Header */}
      <Pressable
        style={({ pressed }) => [
          styles.header,
          {
            borderColor: value ? themeColors.primary : colorSystem.gray[300],
            backgroundColor: value ? themeColors.background : colorSystem.base.white,
          },
          pressed && !disabled && styles.headerPressed,
          disabled && styles.headerDisabled,
        ]}
        onPress={toggleExpanded}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded, disabled }}
        accessibilityLabel={`${label} ${selectedPrinciple ? `Selected: ${selectedPrinciple.title}` : 'None selected'}. Tap to ${isExpanded ? 'collapse' : 'expand'}`}
        testID={`${testID}-header`}
      >
        <View style={styles.headerContent}>
          {selectedPrinciple ? (
            <Text
              style={[styles.selectedText, { color: themeColors.primary }]}
              numberOfLines={1}
            >
              {selectedPrinciple.title}
            </Text>
          ) : (
            <Text style={styles.placeholderText}>Select a principle...</Text>
          )}
        </View>
        <Text style={[styles.chevron, { color: themeColors.primary }]}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </Pressable>

      {/* Expandable Options */}
      {isExpanded && (
        <View style={styles.optionsContainer}>
          {PRINCIPLES.map((principle, index) => {
            const isSelected = value === principle.key;

            return (
              <Pressable
                key={principle.key}
                style={({ pressed }) => [
                  styles.optionButton,
                  isSelected && [
                    styles.optionButtonSelected,
                    { borderColor: themeColors.primary, backgroundColor: themeColors.background },
                  ],
                  index === PRINCIPLES.length - 1 && styles.optionButtonLast,
                  pressed && !disabled && styles.optionButtonPressed,
                ]}
                onPress={() => handleSelect(principle.key)}
                disabled={disabled}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${principle.title}. ${principle.description}`}
                testID={`${testID}-option-${principle.key}`}
              >
                {/* Radio indicator */}
                <View
                  style={[
                    styles.radioOuter,
                    isSelected && { borderColor: themeColors.primary },
                  ]}
                >
                  {isSelected && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: themeColors.primary },
                      ]}
                    />
                  )}
                </View>

                {/* Principle info */}
                <View style={styles.optionTextContainer}>
                  <Text
                    style={[
                      styles.optionTitle,
                      isSelected && { color: themeColors.primary },
                    ]}
                  >
                    {principle.title}
                  </Text>
                  <Text
                    style={styles.optionDescription}
                    numberOfLines={2}
                  >
                    {principle.description}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Selected principle detail (shown when collapsed with selection) */}
      {!isExpanded && selectedPrinciple && (
        <View style={[styles.selectedDetail, { backgroundColor: themeColors.background }]}>
          <Text style={styles.selectedDetailText} numberOfLines={2}>
            {selectedPrinciple.description}
          </Text>
          <Text style={[styles.selectedDetailSource, { color: themeColors.primary }]}>
            — {selectedPrinciple.source}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[16],
  },
  label: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.gray[700],
    marginBottom: spacing[8],
  },
  required: {
    color: colorSystem.status.error,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    minHeight: 56, // Accessible touch target
  },
  headerPressed: {
    opacity: 0.8,
  },
  headerDisabled: {
    opacity: 0.5,
  },
  headerContent: {
    flex: 1,
    marginRight: spacing[8],
  },
  selectedText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
  },
  placeholderText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[500],
  },
  chevron: {
    fontSize: typography.caption.size,
  },
  optionsContainer: {
    marginTop: spacing[8],
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    overflow: 'hidden',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[12],
    backgroundColor: colorSystem.base.white,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  optionButtonSelected: {
    borderBottomColor: 'transparent',
  },
  optionButtonLast: {
    borderBottomWidth: 0,
  },
  optionButtonPressed: {
    backgroundColor: colorSystem.gray[100],
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colorSystem.gray[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[12],
    marginTop: spacing[4],
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[4],
  },
  optionDescription: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    lineHeight: typography.caption.size * 1.3,
  },
  selectedDetail: {
    marginTop: spacing[8],
    padding: spacing[12],
    borderRadius: borderRadius.small,
  },
  selectedDetailText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
    lineHeight: typography.caption.size * 1.4,
    marginBottom: spacing[4],
  },
  selectedDetailSource: {
    fontSize: typography.micro.size,
    fontStyle: 'italic',
  },
});

export default StoicPrinciplePicker;
