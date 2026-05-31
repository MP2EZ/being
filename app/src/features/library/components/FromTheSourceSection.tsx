/**
 * FROM THE SOURCE - In-module classical passages section
 * FEAT-54: Classical Resources Library (Phase 1)
 *
 * Appended to each module's Overview tab. Surfaces the curated primary-source
 * passages for that principle as an expandable accordion (same +/− pattern as
 * OverviewTab's concepts/obstacles), plus a link into the standalone library.
 *
 * Non-negotiables (philosopher / UX validated):
 * - All passages unlocked — no gating. Surfacing is contextual, never forced.
 * - Public-domain translator attribution shown on every passage.
 * - `context` is a short literary frame, visually separated from the source text.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import type { ModuleId } from '@/features/learn/types/education';
import { loadPassagesForPrinciple } from '@/core/services/passagesContent';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface FromTheSourceSectionProps {
  principle: ModuleId;
}

const FromTheSourceSection: React.FC<FromTheSourceSectionProps> = ({ principle }) => {
  const navigation = useNavigation<NavigationProp>();
  // Lazy load — passages are only required when a module Overview tab renders.
  const passages = useMemo(() => {
    try {
      return loadPassagesForPrinciple(principle);
    } catch (error) {
      console.error('[FromTheSource] Failed to load passages:', error);
      return [];
    }
  }, [principle]);

  // First passage expanded by default to advertise the content (matches concepts).
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  if (passages.length === 0) {
    return null;
  }

  const toggle = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>From the Source</Text>
      <Text style={styles.intro}>
        Primary passages on this principle, from the classical Stoics.
      </Text>

      <View style={styles.list}>
        {passages.map((passage, index) => {
          const isExpanded = expanded.has(index);
          return (
            <View key={passage.id} style={styles.card}>
              <TouchableOpacity
                style={styles.header}
                onPress={() => toggle(index)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} passage: ${passage.author}, ${passage.citation}`}
                accessibilityState={{ expanded: isExpanded }}
              >
                <Text style={styles.headerText}>
                  {passage.author} · {passage.citation}
                </Text>
                <Text style={styles.icon} importantForAccessibility="no">
                  {isExpanded ? '−' : '+'}
                </Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.body}>
                  <Text style={styles.passageText}>"{passage.text}"</Text>
                  <Text style={styles.attribution}>
                    — trans. {passage.translation}
                  </Text>
                  {passage.context && (
                    <View style={styles.contextBox}>
                      <Text style={styles.contextText}>{passage.context}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [styles.libraryLink, pressed && { opacity: 0.6 }]}
        onPress={() => navigation.navigate('ClassicalLibrary', { principle })}
        accessibilityRole="button"
        accessibilityLabel="Browse the full Classical Library"
        accessibilityHint="Opens all curated classical passages, filterable by principle and author"
      >
        <Text style={styles.libraryLinkText}>Browse the full Classical Library</Text>
        <Text style={styles.libraryLinkArrow} importantForAccessibility="no">
          →
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing[32],
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  intro: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    lineHeight: 20,
    marginBottom: spacing[24],
  },
  list: {
    gap: spacing[16],
  },
  card: {
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    backgroundColor: colorSystem.base.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[16],
    minHeight: 44,
    backgroundColor: colorSystem.gray[50],
  },
  headerText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    flex: 1,
    paddingRight: spacing[8],
  },
  icon: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.light,
    color: colorSystem.navigation.learn,
  },
  body: {
    padding: spacing[16],
    gap: spacing[12],
  },
  passageText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[800],
    lineHeight: 24,
  },
  attribution: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    textAlign: 'right',
  },
  contextBox: {
    paddingTop: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
  contextText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    lineHeight: 21,
    fontStyle: 'italic',
  },
  libraryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[16],
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[16],
    minHeight: 44,
    borderRadius: borderRadius.large,
    backgroundColor: colorSystem.gray[50],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
  },
  libraryLinkText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.navigation.learn,
  },
  libraryLinkArrow: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.navigation.learn,
  },
});

export default FromTheSourceSection;
