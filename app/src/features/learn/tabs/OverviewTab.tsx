/**
 * OVERVIEW TAB - Module Overview Content
 * FEAT-49: Educational Modules
 * FEAT-80: Added Common Obstacles section (moved from Reflect tab)
 *
 * Displays:
 * - Classical quote (Stoic source)
 * - What It Is (expandable concepts)
 * - Why It Matters
 * - Practical Example (callout)
 * - Developmental Stages timeline
 * - Common Obstacles (expandable FAQ style) [NEW - after stages for context]
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';
import { useEducationStore } from '../stores/educationStore';
import type { ModuleContent, ModuleId } from '@/features/learn/types/education';

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
  const [expandedObstacles, setExpandedObstacles] = useState<Set<number>>(
    new Set()
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

  const toggleObstacle = (index: number) => {
    setExpandedObstacles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
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

      {/* Divider */}
      <View style={styles.divider} />

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

      {/* Common Obstacles */}
      <View style={styles.obstaclesSection}>
        <Text style={styles.sectionTitle}>Common Questions & Challenges</Text>
        <Text style={styles.obstaclesIntro}>
          These questions and challenges arise naturally during practice. Stoic
          practitioners have worked with these same concerns for centuries. Tap
          any question to explore practical responses.
        </Text>

        <View style={styles.obstaclesList}>
          {moduleContent.commonObstacles.map((obstacle, index) => {
            const isExpanded = expandedObstacles.has(index);

            return (
              <View key={index} style={styles.obstacleCard}>
                <TouchableOpacity
                  style={styles.obstacleHeader}
                  onPress={() => toggleObstacle(index)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.obstacleQuestion}>
                    {obstacle.question}
                  </Text>
                  <Text style={styles.obstacleIcon}>
                    {isExpanded ? '−' : '+'}
                  </Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.obstacleContent}>
                    <Text style={styles.obstacleResponse}>
                      {obstacle.response}
                    </Text>

                    {obstacle.tip && (
                      <View style={styles.tipBox}>
                        <Text style={styles.tipLabel}>💡 Tip</Text>
                        <Text style={styles.tipText}>{obstacle.tip}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Bottom Padding */}
      <View style={{ height: spacing[64] }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollContent: {
    padding: spacing[24],
  },
  quoteSection: {
    backgroundColor: colorSystem.gray[50],
    borderLeftWidth: spacing[4],
    borderLeftColor: colorSystem.navigation.learn,
    padding: spacing[24],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[32],
  },
  quoteText: {
    fontSize: typography.bodyLarge.size,
    fontStyle: 'italic',
    color: colorSystem.gray[800],
    lineHeight: 26,
    marginBottom: spacing[16],
  },
  quoteAuthor: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[700],
    textAlign: 'right',
  },
  section: {
    marginBottom: spacing[32],
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[16],
  },
  summaryText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 24,
  },
  bodyText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 24,
  },
  conceptsSection: {
    marginBottom: spacing[32],
    gap: spacing[16],
  },
  conceptCard: {
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    backgroundColor: colorSystem.base.white,
  },
  conceptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[16],
    backgroundColor: colorSystem.gray[50],
  },
  conceptTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    flex: 1,
  },
  conceptIcon: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.light,
    color: colorSystem.navigation.learn,
    marginLeft: spacing[8],
  },
  conceptContent: {
    padding: spacing[16],
    gap: spacing[16],
  },
  conceptText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 22,
  },
  learnMoreSection: {
    paddingTop: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
  learnMoreLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.navigation.learn,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[4],
  },
  learnMoreText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    lineHeight: 21,
  },
  exampleCard: {
    backgroundColor: '#FFF9E6', // Light yellow
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginBottom: spacing[32],
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
    gap: spacing[8],
    marginBottom: spacing[8],
  },
  exampleIcon: {
    fontSize: typography.title.size,
  },
  exampleLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.gray[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exampleText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[800],
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: colorSystem.gray[200],
    marginVertical: spacing[32],
  },
  obstaclesSection: {
    marginBottom: spacing[32],
  },
  obstaclesIntro: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    lineHeight: 20,
    marginBottom: spacing[24],
  },
  obstaclesList: {
    gap: spacing[16],
  },
  obstacleCard: {
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    backgroundColor: colorSystem.base.white,
  },
  obstacleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[16],
    backgroundColor: colorSystem.gray[50],
  },
  obstacleQuestion: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    flex: 1,
    paddingRight: spacing[8],
  },
  obstacleIcon: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.light,
    color: colorSystem.navigation.learn,
  },
  obstacleContent: {
    padding: spacing[16],
    gap: spacing[16],
  },
  obstacleResponse: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 22,
  },
  tipBox: {
    backgroundColor: '#FFF9E6', // Light yellow
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    borderLeftWidth: spacing[12],
    borderLeftColor: '#FFD700',
  },
  tipLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.gray[700],
    marginBottom: spacing[4],
  },
  tipText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    lineHeight: 20,
  },
  stagesIntro: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    lineHeight: 20,
    marginBottom: spacing[24],
    fontStyle: 'italic',
  },
  stagesTimeline: {
    gap: spacing[24],
  },
  stageCard: {
    flexDirection: 'row',
    gap: spacing[16],
    position: 'relative',
  },
  timelineConnector: {
    position: 'absolute',
    left: 19, // Center of bubble (40/2)
    top: spacing[40], // Start below bubble
    bottom: -spacing[24], // Extend to next card
    width: 2,
    backgroundColor: colorSystem.gray[300],
  },
  stageBubble: {
    width: spacing[40],
    height: spacing[40],
    borderRadius: borderRadius.xxxl,
    backgroundColor: colorSystem.navigation.learn,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stageBubbleText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.white,
  },
  stageContent: {
    flex: 1,
    paddingBottom: spacing[16],
  },
  stageTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[4],
  },
  stageDescription: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    lineHeight: 20,
    marginBottom: spacing[16],
  },
  indicatorsSection: {
    gap: spacing[4],
  },
  indicatorsLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[700],
    marginBottom: spacing[4],
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: spacing[8],
    paddingLeft: spacing[8],
  },
  indicatorBullet: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.navigation.learn,
    fontWeight: typography.fontWeight.bold,
  },
  indicatorText: {
    flex: 1,
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    lineHeight: 20,
  },
});

export default OverviewTab;
