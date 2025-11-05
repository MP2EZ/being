/**
 * OVERVIEW TAB - Module Overview Content
 * FEAT-49: Educational Modules
 *
 * Displays:
 * - Classical quote (Stoic source)
 * - What It Is (expandable concepts)
 * - Why It Matters
 * - Practical Example (callout)
 * - Developmental Stages timeline
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colorSystem, spacing } from '../../../constants/colors';
import { useEducationStore } from '../../../stores/educationStore';
import type { ModuleContent, ModuleId } from '../../../types/education';

interface OverviewTabProps {
  moduleContent: ModuleContent;
  moduleId: ModuleId;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  moduleContent,
  moduleId,
}) => {
  const [expandedConcepts, setExpandedConcepts] = useState<Set<number>>(
    new Set([0]) // First concept expanded by default
  );
  const { completeSection } = useEducationStore();

  const toggleConcept = (index: number) => {
    setExpandedConcepts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
        // Mark this concept section as "viewed" (optional analytics)
        completeSection(moduleId, `concept-${index}`);
      }
      return newSet;
    });
  };

  const isMostEssential = moduleId === 'sphere-sovereignty';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Classical Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "{moduleContent.classicalQuote.text}"
        </Text>
        <Text style={styles.quoteAuthor}>
          — {moduleContent.classicalQuote.author}
        </Text>
      </View>

      {/* What It Is - Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What It Is</Text>
        <Text style={styles.summaryText}>
          {moduleContent.whatItIs.summary}
        </Text>
      </View>

      {/* What It Is - Expandable Concepts */}
      <View style={styles.conceptsSection}>
        {moduleContent.whatItIs.concepts.map((concept, index) => {
          const isExpanded = expandedConcepts.has(index);

          return (
            <View key={index} style={styles.conceptCard}>
              <TouchableOpacity
                style={styles.conceptHeader}
                onPress={() => toggleConcept(index)}
                activeOpacity={0.7}
              >
                <Text style={styles.conceptTitle}>{concept.title}</Text>
                <Text style={styles.conceptIcon}>
                  {isExpanded ? '−' : '+'}
                </Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.conceptContent}>
                  <Text style={styles.conceptText}>{concept.content}</Text>
                  {concept.learnMore && (
                    <View style={styles.learnMoreSection}>
                      <Text style={styles.learnMoreLabel}>Learn More</Text>
                      <Text style={styles.learnMoreText}>
                        {concept.learnMore}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Why It Matters */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why It Matters</Text>
        <Text style={styles.bodyText}>{moduleContent.whyItMatters}</Text>
      </View>

      {/* Practical Example (if present) */}
      {moduleContent.practicalExample && (
        <View
          style={[
            styles.exampleCard,
            isMostEssential && styles.exampleCardEssential,
          ]}
        >
          <View style={styles.exampleHeader}>
            <Text style={styles.exampleIcon}>
              {moduleContent.practicalExample.icon || '💡'}
            </Text>
            <Text style={styles.exampleLabel}>Practical Example</Text>
          </View>
          <Text style={styles.exampleText}>
            {moduleContent.practicalExample.content}
          </Text>
        </View>
      )}

      {/* Developmental Stages Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developmental Stages</Text>
        <Text style={styles.stagesIntro}>
          These stages span years of practice, not weeks. Progress happens
          gradually through consistent engagement.
        </Text>

        <View style={styles.stagesTimeline}>
          {moduleContent.developmentalStages.map((stage, index) => (
            <View key={stage.stage} style={styles.stageCard}>
              {/* Timeline connector */}
              {index < moduleContent.developmentalStages.length - 1 && (
                <View style={styles.timelineConnector} />
              )}

              {/* Stage number bubble */}
              <View style={styles.stageBubble}>
                <Text style={styles.stageBubbleText}>{index + 1}</Text>
              </View>

              {/* Stage content */}
              <View style={styles.stageContent}>
                <Text style={styles.stageTitle}>{stage.title}</Text>
                <Text style={styles.stageDescription}>
                  {stage.description}
                </Text>

                {/* Stage indicators */}
                <View style={styles.indicatorsSection}>
                  <Text style={styles.indicatorsLabel}>Indicators:</Text>
                  {stage.indicators.map((indicator, i) => (
                    <View key={i} style={styles.indicatorRow}>
                      <Text style={styles.indicatorBullet}>•</Text>
                      <Text style={styles.indicatorText}>{indicator}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Bottom Padding */}
      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  quoteSection: {
    backgroundColor: colorSystem.gray[50],
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.navigation.learn,
    padding: spacing.lg,
    borderRadius: 8,
    marginBottom: spacing.xl,
  },
  quoteText: {
    fontSize: 17,
    fontStyle: 'italic',
    color: colorSystem.gray[800],
    lineHeight: 26,
    marginBottom: spacing.md,
  },
  quoteAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: colorSystem.gray[700],
    textAlign: 'right',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
  },
  summaryText: {
    fontSize: 16,
    color: colorSystem.gray[700],
    lineHeight: 24,
  },
  bodyText: {
    fontSize: 16,
    color: colorSystem.gray[700],
    lineHeight: 24,
  },
  conceptsSection: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  conceptCard: {
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colorSystem.base.white,
  },
  conceptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colorSystem.gray[50],
  },
  conceptTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colorSystem.base.black,
    flex: 1,
  },
  conceptIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: colorSystem.navigation.learn,
    marginLeft: spacing.sm,
  },
  conceptContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  conceptText: {
    fontSize: 15,
    color: colorSystem.gray[700],
    lineHeight: 22,
  },
  learnMoreSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
  learnMoreLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colorSystem.navigation.learn,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  learnMoreText: {
    fontSize: 14,
    color: colorSystem.gray[600],
    lineHeight: 21,
  },
  exampleCard: {
    backgroundColor: '#FFF9E6', // Light yellow
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#FFE066',
  },
  exampleCardEssential: {
    backgroundColor: '#F8F5FF', // Light purple for Module 3
    borderColor: colorSystem.navigation.learn,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  exampleIcon: {
    fontSize: 20,
  },
  exampleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colorSystem.gray[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exampleText: {
    fontSize: 15,
    color: colorSystem.gray[800],
    lineHeight: 22,
  },
  stagesIntro: {
    fontSize: 14,
    color: colorSystem.gray[600],
    lineHeight: 20,
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  stagesTimeline: {
    gap: spacing.lg,
  },
  stageCard: {
    flexDirection: 'row',
    gap: spacing.md,
    position: 'relative',
  },
  timelineConnector: {
    position: 'absolute',
    left: 19, // Center of bubble (40/2)
    top: 40, // Start below bubble
    bottom: -spacing.lg, // Extend to next card
    width: 2,
    backgroundColor: colorSystem.gray[300],
  },
  stageBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colorSystem.navigation.learn,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stageBubbleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colorSystem.base.white,
  },
  stageContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  stageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  stageDescription: {
    fontSize: 14,
    color: colorSystem.gray[600],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  indicatorsSection: {
    gap: spacing.xs,
  },
  indicatorsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colorSystem.gray[700],
    marginBottom: spacing.xs,
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  indicatorBullet: {
    fontSize: 14,
    color: colorSystem.navigation.learn,
    fontWeight: '700',
  },
  indicatorText: {
    flex: 1,
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
  },
});

export default OverviewTab;
