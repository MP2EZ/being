/**
 * Dream Journal Component
 * DRD-compliant dream reflection interface with therapeutic language
 * Clinical: Optional, non-pressured, supportive prompting
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput,
  Pressable
} from 'react-native';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme/colors';

interface DreamJournalProps {
  dreamContent?: string;
  hasDream?: boolean;
  onDreamContentChange?: (content: string) => void;
  onHasDreamChange?: (hasDream: boolean) => void;
  disabled?: boolean;
  theme?: 'morning' | 'midday' | 'evening';
}

const DreamJournal: React.FC<DreamJournalProps> = ({
  dreamContent = '',
  hasDream = false,
  onDreamContentChange,
  onHasDreamChange,
  disabled = false,
  theme = 'morning',
}) => {
  const themeColors = colorSystem.themes[theme];

  const handleDreamToggle = (value: boolean) => {
    if (disabled || !onHasDreamChange) return;
    onHasDreamChange(value);
  };

  const handleContentChange = (text: string) => {
    if (disabled || !onDreamContentChange) return;
    onDreamContentChange(text);
  };

  const ToggleButton: React.FC<{
    selected: boolean;
    onPress: () => void;
    title: string;
    subtitle: string;
  }> = ({ selected, onPress, title, subtitle }) => (
    <Pressable
      style={({ pressed }) => [
        styles.toggleButton,
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
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${subtitle}`}
      accessibilityHint={`Tap to ${selected ? 'deselect' : 'select'} ${title.toLowerCase()}`}
      accessibilityState={{ selected, disabled }}
    >
      <Text style={[
        styles.toggleTitle,
        {
          color: selected 
            ? colorSystem.base.white 
            : colorSystem.base.black
        }
      ]}>
        {title}
      </Text>
      <Text style={[
        styles.toggleSubtitle,
        {
          color: selected 
            ? colorSystem.base.white 
            : colorSystem.gray[600]
        }
      ]}>
        {subtitle}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Dream Toggle Section */}
      <View style={styles.toggleSection}>
        <Text style={styles.questionText}>
          Did you have any dreams you remember?
        </Text>
        
        <View style={styles.toggleContainer}>
          <ToggleButton
            selected={hasDream}
            onPress={() => handleDreamToggle(true)}
            title="Yes"
            subtitle="I remember something"
          />
          
          <ToggleButton
            selected={!hasDream}
            onPress={() => handleDreamToggle(false)}
            title="No"
            subtitle="Nothing comes to mind"
          />
        </View>
      </View>

      {/* Dream Content Section - Only show if they have a dream */}
      {hasDream && (
        <View style={styles.contentSection}>
          <Text style={styles.promptText}>
            What do you remember? Share as much or as little as feels right.
          </Text>
          
          <TextInput
            style={[
              styles.textInput,
              {
                borderColor: colorSystem.gray[300],
                backgroundColor: colorSystem.base.white,
              }
            ]}
            multiline
            numberOfLines={6}
            value={dreamContent}
            onChangeText={handleContentChange}
            placeholder="I dreamed about..."
            placeholderTextColor={colorSystem.gray[500]}
            editable={!disabled}
            textAlignVertical="top"
            maxLength={500}
            accessibilityLabel="Dream journal text area"
            accessibilityHint="Describe your dream in as much detail as you'd like"
          />
          
          <View style={styles.characterCount}>
            <Text style={styles.countText}>
              {dreamContent.length}/500 characters
            </Text>
          </View>
        </View>
      )}

      {/* Insight Section */}
      <View style={[
        styles.insightSection,
        { backgroundColor: themeColors.light }
      ]}>
        <Text style={styles.insightTitle}>
          💭 About Dreams
        </Text>
        <Text style={styles.insightText}>
          Dreams can offer insights into our inner world, but they're not required for a meaningful check-in. 
          Simply noticing what arises is enough.
        </Text>
      </View>

      {/* Summary */}
      {hasDream && dreamContent.length > 0 && (
        <View style={[
          styles.summarySection,
          { borderLeftColor: themeColors.primary }
        ]}>
          <Text style={styles.summaryTitle}>
            Dream reflection captured
          </Text>
          <Text style={styles.summaryText}>
            {dreamContent.length} characters of dream content recorded
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleSection: {
    marginBottom: spacing.xl,
  },
  questionText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toggleButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: borderRadius.xs,
    elevation: 2,
  },
  toggleTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  toggleSubtitle: {
    fontSize: typography.caption.size,
    textAlign: 'center',
  },
  contentSection: {
    marginBottom: spacing.xl,
  },
  promptText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: spacing[6],
  },
  textInput: {
    borderWidth: 1,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    minHeight: 120,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: borderRadius.xs,
    elevation: 1,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  countText: {
    fontSize: typography.micro.size,
    color: colorSystem.gray[500],
  },
  insightSection: {
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
  },
  insightTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  insightText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
    lineHeight: spacing[5],
  },
  summarySection: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    borderLeftWidth: spacing.xs,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: borderRadius.xs,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
  },
});

export default DreamJournal;