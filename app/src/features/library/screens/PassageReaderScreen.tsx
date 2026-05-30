/**
 * PASSAGE READER SCREEN - Single classical passage, distraction-reduced
 * FEAT-54: Classical Resources Library (Phase 2)
 *
 * Sustained-reading view for one passage. Body is upright (not italic) — italic
 * fatigues over long passages (e.g. Seneca letters). Long passages show an
 * excerpt with a "Read full passage" disclosure. A principle chip deep-links
 * back to the corresponding module, closing the loop to the principle spine.
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
import { PRINCIPLE_LABELS } from '@/features/library/types/library';
import { getPassageById } from '@/core/services/passagesContent';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type ReaderRouteProp = RouteProp<RootStackParamList, 'PassageReader'>;

const PassageReaderScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReaderRouteProp>();
  const { passageId } = route.params;

  const passage = useMemo(() => {
    try {
      return getPassageById(passageId);
    } catch (error) {
      console.error('[PassageReader] Failed to load passage:', error);
      return undefined;
    }
  }, [passageId]);

  const [showFull, setShowFull] = useState(false);

  const renderBody = () => {
    if (!passage) return null;
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1 }}>
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Text style={styles.backButtonText}>‹ Back</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.author} accessibilityRole="header">
                {passage.author}
              </Text>
              <Text style={styles.citation}>
                {passage.citation} · trans. {passage.translation}
              </Text>

              <View style={styles.divider} />

              <Text style={styles.passageText}>
                "{showFull && passage.fullText ? passage.fullText : passage.text}"
              </Text>

              {passage.fullText && (
                <Pressable
                  style={({ pressed }) => [styles.disclosure, pressed && { opacity: 0.6 }]}
                  onPress={() => setShowFull((v) => !v)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showFull }}
                  accessibilityLabel={showFull ? 'Show excerpt' : 'Read full passage'}
                >
                  <Text style={styles.disclosureText}>
                    {showFull ? 'Show excerpt' : 'Read full passage'}
                  </Text>
                  <Text style={styles.disclosureIcon} importantForAccessibility="no">
                    {showFull ? '⌃' : '⌄'}
                  </Text>
                </Pressable>
              )}

              {passage.context && (
                <View style={styles.contextBox}>
                  <Text style={styles.contextLabel}>Context</Text>
                  <Text style={styles.contextText}>{passage.context}</Text>
                </View>
              )}

              <View style={styles.groundsSection}>
                <Text style={styles.groundsLabel}>Grounds</Text>
                <Pressable
                  style={({ pressed }) => [styles.principleChip, pressed && { opacity: 0.7 }]}
                  onPress={() =>
                    navigation.navigate('ModuleDetail', { moduleId: passage.principle })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open the ${PRINCIPLE_LABELS[passage.principle]} module`}
                  accessibilityHint="Returns to the principle this passage grounds"
                >
                  <Text style={styles.principleChipText}>
                    {PRINCIPLE_LABELS[passage.principle]}
                  </Text>
                  <Text style={styles.principleChipArrow} importantForAccessibility="no">
                    ›
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
          <CollapsibleCrisisButton
            mode="standard"
            onNavigate={() => navigation.navigate('CrisisResources')}
            testID="crisis-reader"
          />
        </View>
      </SafeAreaView>
    );
  };

  if (!passage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Passage not found.</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return renderBody();
};

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
    paddingTop: spacing[8],
  },
  backButton: {
    paddingVertical: spacing[8],
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.navigation.learn,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[24],
    paddingBottom: spacing[48],
  },
  author: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[4],
  },
  citation: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
  },
  divider: {
    height: 1,
    backgroundColor: colorSystem.gray[200],
    marginVertical: spacing[24],
  },
  passageText: {
    fontSize: typography.bodyLarge.size,
    color: colorSystem.gray[800],
    lineHeight: 30,
  },
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginTop: spacing[16],
    paddingVertical: spacing[12],
    minHeight: 44,
  },
  disclosureText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.navigation.learn,
  },
  disclosureIcon: {
    fontSize: typography.bodyLarge.size,
    color: colorSystem.navigation.learn,
  },
  contextBox: {
    marginTop: spacing[24],
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    backgroundColor: colorSystem.gray[50],
    borderLeftWidth: spacing[4],
    borderLeftColor: colorSystem.navigation.learn,
  },
  contextLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.gray[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[8],
  },
  contextText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 22,
  },
  groundsSection: {
    marginTop: spacing[32],
  },
  groundsLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[8],
  },
  principleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    minHeight: 44,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colorSystem.navigation.learn,
    backgroundColor: '#F8F5FF',
  },
  principleChipText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.navigation.learn,
  },
  principleChipArrow: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.navigation.learn,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[32],
    gap: spacing[24],
  },
  errorText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: colorSystem.navigation.learn,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.large,
  },
  errorButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
});

export default PassageReaderScreen;
