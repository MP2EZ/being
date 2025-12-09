/**
 * Progressive Body Scan List Component
 * DRY-compliant single-column visualization for progressive body awareness
 * Clinical: Gentle progression, clear focus, evidence-based
 *
 * Use case: Progressive practices where user focuses on one area at a time
 * vs. BodyAreaGrid: Interactive selection where user chooses multiple areas
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';

interface ProgressiveBodyScanListProps {
  areas: string[];
  currentIndex: number;
  currentGuidance?: string;
  testID?: string;
}

const ProgressiveBodyScanList: React.FC<ProgressiveBodyScanListProps> = ({
  areas,
  currentIndex,
  currentGuidance,
  testID = 'progressive-body-scan-list',
}) => {
  // Use Learn section purple theme
  const learnPurple = colorSystem.navigation.learn;

  const getAreaStatus = (index: number): 'completed' | 'current' | 'upcoming' => {
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Progressive Body Area List */}
      <View style={styles.areaList}>
        {areas.map((area, index) => {
          const status = getAreaStatus(index);

          return (
            <View
              key={area}
              style={[
                styles.areaItem,
                status === 'completed' && styles.areaItemCompleted,
                status === 'current' && [
                  styles.areaItemCurrent,
                  {
                    backgroundColor: learnPurple + '15',
                    borderColor: learnPurple
                  }
                ],
                status === 'upcoming' && styles.areaItemUpcoming,
              ]}
              accessibilityRole="text"
              accessibilityLabel={`${area}${status === 'current' && currentGuidance ? `, currently focusing. ${currentGuidance}` : status === 'current' ? ', currently focusing' : status === 'completed' ? ', completed' : ', upcoming'}`}
            >
              {/* Row: Status Indicator + Area Name */}
              <View style={styles.areaHeader}>
                {/* Status Indicator */}
                <View style={styles.statusIndicator}>
                  {status === 'completed' && (
                    <Text style={styles.statusIcon}>✓</Text>
                  )}
                </View>

                {/* Area Name */}
                <Text
                  style={[
                    styles.areaText,
                    status === 'completed' && styles.areaTextCompleted,
                    status === 'current' && [
                      styles.areaTextCurrent,
                      { color: learnPurple }
                    ],
                    status === 'upcoming' && styles.areaTextUpcoming,
                  ]}
                >
                  {area}
                </Text>
              </View>

              {/* Guidance Text (Current Area Only) */}
              {status === 'current' && currentGuidance && (
                <Text style={styles.guidanceText}>
                  {currentGuidance}
                </Text>
              )}
            </View>
          );
        })}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  areaList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  areaItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 56, // WCAG AA touch target
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  areaItemCompleted: {
    backgroundColor: '#E8F5E9',
    borderColor: '#66BB6A',
    opacity: 0.7,
  },
  areaItemCurrent: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: borderRadius.small,
    elevation: 3,
  },
  areaItemUpcoming: {
    backgroundColor: colorSystem.base.white,
    borderColor: colorSystem.gray[300],
  },
  statusIndicator: {
    width: spacing.xl,
    height: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  statusIcon: {
    fontSize: typography.bodyLarge.size,
    color: '#66BB6A',
    fontWeight: typography.fontWeight.semibold,
  },
  areaText: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
  },
  areaTextCompleted: {
    color: '#4CAF50',
  },
  areaTextCurrent: {
    fontWeight: typography.fontWeight.semibold,
  },
  areaTextUpcoming: {
    color: colorSystem.gray[600],
  },
  guidanceText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    lineHeight: typography.title.size,
    marginTop: spacing.sm,
    paddingLeft: spacing.xl + spacing.md, // Align with area name (status indicator width + margin)
  },
});

export default ProgressiveBodyScanList;
