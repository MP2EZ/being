/**
 * CLASSICAL LIBRARY SCREEN - Browsable primary-source passage library
 * FEAT-54: Classical Resources Library (Phase 2)
 *
 * Standalone browse view reachable from LearnScreen. Lists every curated
 * passage, filterable by principle and author (MVP filters — no search).
 * Rows open the PassageReader detail screen.
 *
 * Non-negotiables: all passages unlocked; public-domain translator shown;
 * crisis button reachable (Learn-area screen).
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';
import { CollapsibleCrisisButton } from '@/features/crisis/components';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import type { ModuleId } from '@/features/learn/types/education';
import type { PassageAuthor } from '@/features/library/types/library';
import { PRINCIPLE_LABELS } from '@/features/library/types/library';
import {
  loadAllPassages,
  getAuthorsPresent,
  getPrincipleIds,
} from '@/core/services/passagesContent';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type LibraryRouteProp = RouteProp<RootStackParamList, 'ClassicalLibrary'>;

type PrincipleFilter = ModuleId | 'all';
type AuthorFilter = PassageAuthor | 'all';

const ClassicalLibraryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LibraryRouteProp>();

  const allPassages = useMemo(() => {
    try {
      return loadAllPassages();
    } catch (error) {
      console.error('[ClassicalLibrary] Failed to load passages:', error);
      return [];
    }
  }, []);

  const principleIds = useMemo(() => getPrincipleIds(), []);
  const authors = useMemo(() => getAuthorsPresent(), []);

  const [principleFilter, setPrincipleFilter] = useState<PrincipleFilter>(
    route.params?.principle ?? 'all'
  );
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter>(
    route.params?.author ?? 'all'
  );

  const filtered = useMemo(
    () =>
      allPassages.filter(
        (p) =>
          (principleFilter === 'all' || p.principle === principleFilter) &&
          (authorFilter === 'all' || p.author === authorFilter)
      ),
    [allPassages, principleFilter, authorFilter]
  );

  return (
    <SafeAreaView style={styles.safeArea} testID="classical-library-screen">
      <View style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title} accessibilityRole="header">
              Classical Library
            </Text>
            <Text style={styles.subtitle}>Primary sources, curated by principle</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Principle filter */}
            <Text style={styles.filterLabel}>Principle</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <FilterChip
                label="All"
                selected={principleFilter === 'all'}
                onPress={() => setPrincipleFilter('all')}
              />
              {principleIds.map((id) => (
                <FilterChip
                  key={id}
                  label={PRINCIPLE_LABELS[id]}
                  selected={principleFilter === id}
                  onPress={() => setPrincipleFilter(id)}
                />
              ))}
            </ScrollView>

            {/* Author filter */}
            <Text style={[styles.filterLabel, styles.filterLabelSpaced]}>Author</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <FilterChip
                label="All"
                selected={authorFilter === 'all'}
                onPress={() => setAuthorFilter('all')}
              />
              {authors.map((a) => (
                <FilterChip
                  key={a}
                  label={a}
                  selected={authorFilter === a}
                  onPress={() => setAuthorFilter(a)}
                />
              ))}
            </ScrollView>

            {/* Passage list */}
            <View style={styles.list}>
              {filtered.length === 0 ? (
                <Text style={styles.empty}>No passages match these filters.</Text>
              ) : (
                filtered.map((passage) => (
                  <Pressable
                    key={passage.id}
                    style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                    onPress={() => navigation.navigate('PassageReader', { passageId: passage.id })}
                    accessibilityRole="button"
                    accessibilityLabel={`${passage.author}, ${passage.citation}. ${PRINCIPLE_LABELS[passage.principle]}.`}
                    accessibilityHint="Opens the full passage"
                  >
                    <View style={styles.rowMain}>
                      <Text style={styles.rowCitation}>
                        {passage.author} · {passage.citation}
                      </Text>
                      <Text style={styles.rowText} numberOfLines={2}>
                        "{passage.text}"
                      </Text>
                      <Text style={styles.rowPrinciple}>
                        {PRINCIPLE_LABELS[passage.principle]}
                      </Text>
                    </View>
                    <Text style={styles.rowArrow} importantForAccessibility="no">
                      ›
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          </ScrollView>
        </View>
        <CollapsibleCrisisButton
          mode="standard"
          onNavigate={() => navigation.navigate('CrisisResources')}
          testID="crisis-library"
        />
      </View>
    </SafeAreaView>
  );
};

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, selected, onPress }) => (
  <Pressable
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={`Filter: ${label}`}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[16],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  backButton: {
    paddingVertical: spacing[8],
    marginBottom: spacing[8],
  },
  backButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.navigation.learn,
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.midnightBlue,
    marginBottom: spacing[4],
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[24],
    paddingBottom: spacing[48],
  },
  filterLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[8],
  },
  filterLabelSpaced: {
    marginTop: spacing[16],
  },
  chipRow: {
    gap: spacing[8],
    paddingRight: spacing[8],
  },
  chip: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colorSystem.gray[400],
    backgroundColor: colorSystem.base.white,
  },
  chipSelected: {
    backgroundColor: colorSystem.navigation.learn,
    borderColor: colorSystem.navigation.learn,
  },
  chipText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.gray[700],
  },
  chipTextSelected: {
    color: colorSystem.base.white,
  },
  list: {
    marginTop: spacing[24],
    gap: spacing[12],
  },
  empty: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    paddingVertical: spacing[32],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.large,
    padding: spacing[16],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    minHeight: 76,
  },
  rowMain: {
    flex: 1,
    marginRight: spacing[12],
    gap: spacing[4],
  },
  rowCitation: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[700],
  },
  rowText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    lineHeight: 22,
  },
  rowPrinciple: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.navigation.learn,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowArrow: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.midnightBlue,
  },
});

export default ClassicalLibraryScreen;
