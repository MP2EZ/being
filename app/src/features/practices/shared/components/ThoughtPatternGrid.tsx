/**
 * Thought Pattern Grid Component
 * CLINICAL SAFETY: Educational, non-pathologizing approach to thought pattern awareness
 * 
 * SAFETY FEATURES:
 * - Educational tone (normalize vs pathologize)
 * - Overflow detection for 3+ patterns
 * - Gentle language throughout
 * - Support options for overwhelm
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  Pressable,
  ScrollView 
} from 'react-native';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme/colors';

export interface ThoughtPattern {
  id: string;
  title: string;
  description: string;
  example: string;
}

interface ThoughtPatternGridProps {
  onPatternsSelected: (patterns: ThoughtPattern[]) => void;
  onOverflowDetected?: (selectedCount: number) => void;
  theme?: 'morning' | 'midday' | 'evening';
  disabled?: boolean;
}

const THOUGHT_PATTERNS: ThoughtPattern[] = [
  {
    id: 'all-nothing',
    title: 'All-or-Nothing',
    description: 'Seeing things as perfect or disaster',
    example: '"I messed up one thing, so the whole day was ruined"'
  },
  {
    id: 'catastrophizing',
    title: 'Catastrophizing',
    description: 'Imagining worst outcomes',
    example: '"If this goes wrong, everything will fall apart"'
  },
  {
    id: 'mind-reading',
    title: 'Mind Reading',
    description: 'Assuming others\' thoughts',
    example: '"They think I\'m not good enough"'
  },
  {
    id: 'should-statements',
    title: 'Should Statements',
    description: 'Harsh self-expectations',
    example: '"I should be handling this better"'
  },
  {
    id: 'personalization',
    title: 'Personalization',
    description: 'Taking blame for everything',
    example: '"It\'s my fault this didn\'t work out"'
  },
  {
    id: 'overgeneralization',
    title: 'Overgeneralization',
    description: 'One event means always',
    example: '"This always happens to me"'
  }
];

const ThoughtPatternGrid: React.FC<ThoughtPatternGridProps> = ({
  onPatternsSelected,
  onOverflowDetected,
  theme = 'evening',
  disabled = false,
}) => {
  const [selectedPatterns, setSelectedPatterns] = useState<ThoughtPattern[]>([]);
  const themeColors = colorSystem.themes[theme];

  const handlePatternToggle = (pattern: ThoughtPattern) => {
    if (disabled) return;

    let newSelection: ThoughtPattern[];
    
    if (selectedPatterns.find(p => p.id === pattern.id)) {
      // Remove pattern
      newSelection = selectedPatterns.filter(p => p.id !== pattern.id);
    } else {
      // Add pattern
      newSelection = [...selectedPatterns, pattern];
    }

    setSelectedPatterns(newSelection);
    onPatternsSelected(newSelection);

    // CRITICAL: Overflow detection for 3+ patterns
    if (newSelection.length >= 3) {
      onOverflowDetected?.(newSelection.length);
    }
  };

  const isSelected = (patternId: string) => {
    return selectedPatterns.some(p => p.id === patternId);
  };

  return (
    <View style={styles.container}>
      {/* Gentle Introduction */}
      <View style={[
        styles.introSection,
        { backgroundColor: themeColors.background }
      ]}>
        <Text style={styles.introTitle}>
          Did you notice any of these common thinking styles today?
        </Text>
        <Text style={styles.introText}>
          These are normal ways minds work - noticing them is wisdom, not a problem
        </Text>
      </View>

      {/* Pattern Grid */}
      <ScrollView 
        style={styles.gridScrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {THOUGHT_PATTERNS.map((pattern) => {
            const selected = isSelected(pattern.id);
            
            return (
              <Pressable
                key={pattern.id}
                style={[
                  styles.patternCard,
                  selected && {
                    backgroundColor: themeColors.light,
                    borderColor: themeColors.primary,
                    borderWidth: 2,
                  },
                  !selected && {
                    backgroundColor: colorSystem.base.white,
                    borderColor: colorSystem.gray[300],
                    borderWidth: 1,
                  }
                ]}
                onPress={() => handlePatternToggle(pattern)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`${pattern.title}: ${pattern.description}`}
                accessibilityState={{ selected }}
              >
                <View style={styles.patternHeader}>
                  <Text style={[
                    styles.patternTitle,
                    { color: selected ? themeColors.primary : colorSystem.base.black }
                  ]}>
                    {pattern.title}
                  </Text>
                  {selected && (
                    <View style={[
                      styles.checkmark,
                      { backgroundColor: themeColors.primary }
                    ]}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.patternDescription}>
                  {pattern.description}
                </Text>
                
                <Text style={styles.patternExample}>
                  {pattern.example}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Selection Feedback */}
      {selectedPatterns.length > 0 && (
        <View style={[
          styles.feedbackSection,
          { 
            backgroundColor: selectedPatterns.length >= 3 
              ? colorSystem.status.warningBackground 
              : themeColors.background 
          }
        ]}>
          <Text style={styles.feedbackText}>
            {selectedPatterns.length >= 3
              ? "You're noticing many patterns - this awareness itself is a strength. Would you like some support with this?"
              : "Whatever patterns you noticed, you're developing the skill of awareness. This is exactly how mindfulness grows."
            }
          </Text>
        </View>
      )}

      {/* Educational Note */}
      <View style={styles.educationalNote}>
        <Text style={styles.educationalText}>
          💡 Thought patterns are like weather - they come and go. Noticing them without judgment is the practice.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  introSection: {
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colorSystem.themes.evening.primary,
  },
  introTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  introText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  gridScrollView: {
    flex: 1,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  patternCard: {
    width: '48%',
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.md,
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: borderRadius.xs,
    elevation: 1,
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  patternTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    flex: 1,
    lineHeight: typography.title.size,
  },
  checkmark: {
    width: spacing[5],
    height: spacing[5],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  checkmarkText: {
    color: colorSystem.base.white,
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.semibold,
  },
  patternDescription: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    marginBottom: spacing.xs,
    lineHeight: typography.bodyLarge.size,
  },
  patternExample: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    fontStyle: 'italic',
    lineHeight: typography.bodyRegular.size,
  },
  feedbackSection: {
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colorSystem.themes.evening.primary,
  },
  feedbackText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 22,
  },
  educationalNote: {
    padding: spacing.sm,
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.small,
  },
  educationalText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: typography.bodyLarge.size,
  },
});

export default ThoughtPatternGrid;