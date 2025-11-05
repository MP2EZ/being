/**
 * REFLECT TAB - Module Reflection & Common Obstacles
 * FEAT-49: Educational Modules
 *
 * Displays:
 * - Common obstacles (expandable FAQ style)
 * - Reflection prompt
 * - Journal integration (placeholder for now)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { colorSystem, spacing } from '../../../constants/colors';
import { useEducationStore } from '../../../stores/educationStore';
import type { ModuleContent, ModuleId } from '../../../types/education';

interface ReflectTabProps {
  moduleContent: ModuleContent;
  moduleId: ModuleId;
}

const ReflectTab: React.FC<ReflectTabProps> = ({
  moduleContent,
  moduleId,
}) => {
  const [expandedObstacles, setExpandedObstacles] = useState<Set<number>>(
    new Set()
  );
  const [reflectionText, setReflectionText] = useState('');
  const { saveReflection } = useEducationStore();

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

  const handleSaveReflection = () => {
    if (reflectionText.trim().length === 0) return;

    // TODO: Integrate with journal store when implemented
    // For now, just save a reference
    const journalEntryId = `${moduleId}-reflection-${Date.now()}`;
    saveReflection(moduleId, journalEntryId);

    console.log('[Reflect] Saved reflection:', reflectionText);
    setReflectionText('');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Reflection Prompt */}
      <View style={styles.promptSection}>
        <Text style={styles.sectionTitle}>Reflection Prompt</Text>
        <View style={styles.promptCard}>
          <Text style={styles.promptIcon}>💭</Text>
          <Text style={styles.promptText}>
            {moduleContent.reflectionPrompt}
          </Text>
        </View>
      </View>

      {/* Journal Entry */}
      <View style={styles.journalSection}>
        <Text style={styles.journalLabel}>Your Reflection</Text>
        <Text style={styles.journalHint}>
          Write your thoughts about this module. Your reflections are private
          and encrypted.
        </Text>
        <TextInput
          style={styles.journalInput}
          value={reflectionText}
          onChangeText={setReflectionText}
          placeholder="What insights do you have about this principle? How might you apply it in your life?"
          placeholderTextColor={colorSystem.gray[400]}
          multiline
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={[
            styles.saveButton,
            reflectionText.trim().length === 0 && styles.saveButtonDisabled,
          ]}
          onPress={handleSaveReflection}
          disabled={reflectionText.trim().length === 0}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.saveButtonText,
              reflectionText.trim().length === 0 &&
                styles.saveButtonTextDisabled,
            ]}
          >
            Save Reflection
          </Text>
        </TouchableOpacity>
      </View>

      {/* Common Obstacles */}
      <View style={styles.obstaclesSection}>
        <Text style={styles.sectionTitle}>Common Obstacles</Text>
        <Text style={styles.obstaclesIntro}>
          These are questions and concerns that often arise when learning this
          principle. Tap to expand.
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
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
  },
  promptSection: {
    marginBottom: spacing.xl,
  },
  promptCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#F8F5FF', // Light purple
    borderRadius: 12,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.navigation.learn,
  },
  promptIcon: {
    fontSize: 24,
  },
  promptText: {
    flex: 1,
    fontSize: 16,
    color: colorSystem.gray[800],
    lineHeight: 24,
    fontStyle: 'italic',
  },
  journalSection: {
    marginBottom: spacing.xl,
  },
  journalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  journalHint: {
    fontSize: 13,
    color: colorSystem.gray[600],
    marginBottom: spacing.md,
  },
  journalInput: {
    backgroundColor: colorSystem.base.white,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 15,
    color: colorSystem.base.black,
    minHeight: 120,
    marginBottom: spacing.md,
  },
  saveButton: {
    backgroundColor: colorSystem.navigation.learn,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colorSystem.gray[300],
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.white,
  },
  saveButtonTextDisabled: {
    color: colorSystem.gray[500],
  },
  obstaclesSection: {
    marginBottom: spacing.xl,
  },
  obstaclesIntro: {
    fontSize: 14,
    color: colorSystem.gray[600],
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  obstaclesList: {
    gap: spacing.md,
  },
  obstacleCard: {
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colorSystem.base.white,
  },
  obstacleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colorSystem.gray[50],
  },
  obstacleQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    flex: 1,
    paddingRight: spacing.sm,
  },
  obstacleIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: colorSystem.navigation.learn,
  },
  obstacleContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  obstacleResponse: {
    fontSize: 15,
    color: colorSystem.gray[700],
    lineHeight: 22,
  },
  tipBox: {
    backgroundColor: '#FFF9E6', // Light yellow
    borderRadius: 8,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  tipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colorSystem.gray[700],
    marginBottom: spacing.xs,
  },
  tipText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
  },
});

export default ReflectTab;
