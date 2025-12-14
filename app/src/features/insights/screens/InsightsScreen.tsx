/**
 * UNIFIED INSIGHTS DASHBOARD - Being. Stoic Mindfulness
 *
 * Single consolidated screen for all insights (merged VirtueDashboard + ProgressInsights).
 *
 * DESIGN PRINCIPLES (Multi-Agent Validated):
 * - Product: User-centered, no gamification, invitation-based
 * - Philosopher: Prohairesis (user moral agency), classical Stoic framing
 * - UX: Interconnected visualization, self-selection, visual hierarchy
 *
 * PHILOSOPHICAL NON-NEGOTIABLES:
 * 1. NO gamification (no streaks, badges, points, levels, achievements)
 * 2. User prohairesis - user SELECTS their stage, not algorithm
 * 3. Effort-focused (what's in control) NOT outcomes
 * 4. Language: "Development" NOT "Achievement"
 * 5. Clinical data visually separated (gray100 background)
 * 6. No correlation claims between practice and clinical outcomes
 *
 * STRUCTURE:
 * 1. Hero: "This Week's Invitation" - user-chosen virtue focus
 * 2. Practice Patterns: Virtue balance + check-in rhythm + notable observation
 * 3. Developmental Stage: Horizontal spectrum, user self-selects
 * 4. Clinical Context: Assessment history (PHQ/GAD) with wellness framing
 *
 * @see FEAT-28: Progress Insights Dashboard
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { useInsightsStore } from '@/features/insights/stores/insightsStore';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import type { CardinalVirtue, DevelopmentalStage } from '@/features/practices/types/stoic';
import type { AssessmentType } from '@/features/assessment/types';
import { colorSystem, spacing, borderRadius, typography, semantic } from '@/core/theme';

type NavigationProp = StackNavigationProp<RootStackParamList>;

// ──────────────────────────────────────────────────────────────────────────────
// COLORS (from design system)
// ──────────────────────────────────────────────────────────────────────────────

const colors = {
  white: colorSystem.base.white,
  black: colorSystem.base.black,
  gray100: colorSystem.gray[100],
  gray200: colorSystem.gray[200],
  gray300: colorSystem.gray[300],
  gray400: colorSystem.gray[400],
  gray500: colorSystem.gray[500],
  gray600: colorSystem.gray[600],
  gray700: colorSystem.gray[700],
  midnightBlue: colorSystem.base.midnightBlue,
  eveningPrimary: '#4A7C59', // Stoic green
};

// Virtue colors - distinct but harmonious
const VIRTUE_COLORS: Record<CardinalVirtue, string> = {
  wisdom: '#6366F1', // Indigo
  courage: '#F59E0B', // Amber
  justice: '#10B981', // Emerald
  temperance: '#8B5CF6', // Purple
};

// Stage colors
const STAGE_COLORS: Record<DevelopmentalStage, string> = {
  fragmented: '#9CA3AF',
  effortful: '#F59E0B',
  fluid: '#10B981',
  integrated: '#6366F1',
};

// ──────────────────────────────────────────────────────────────────────────────
// VIRTUE DISPLAY HELPERS
// ──────────────────────────────────────────────────────────────────────────────

const VIRTUE_LABELS: Record<CardinalVirtue, string> = {
  wisdom: 'Wisdom',
  courage: 'Courage',
  justice: 'Justice',
  temperance: 'Temperance',
};

const VIRTUE_DESCRIPTIONS: Record<CardinalVirtue, string> = {
  wisdom: 'Sound judgment and practical wisdom (sophia/phronesis)',
  courage: 'Acting rightly despite fear (andreia)',
  justice: 'Fairness and contributing to common good (dikaiosyne)',
  temperance: 'Self-control and moderation (sophrosyne)',
};

const STAGE_LABELS: Record<DevelopmentalStage, string> = {
  fragmented: 'Fragmented',
  effortful: 'Effortful',
  fluid: 'Fluid',
  integrated: 'Integrated',
};

const STAGE_DESCRIPTIONS: Record<DevelopmentalStage, string> = {
  fragmented: 'Building awareness. Practice is becoming intentional.',
  effortful: 'Building consistency. Principles require conscious effort.',
  fluid: 'Principles arise naturally. Embodying Stoic practice.',
  integrated: 'Virtue flows from character. Lifelong practice continues.',
};

// ──────────────────────────────────────────────────────────────────────────────
// HERO SECTION: This Week's Invitation
// ──────────────────────────────────────────────────────────────────────────────

interface HeroInvitationProps {
  currentFocus: CardinalVirtue | null;
  onSelectFocus: () => void;
}

const HeroInvitation: React.FC<HeroInvitationProps> = ({ currentFocus, onSelectFocus }) => {
  return (
    <View style={styles.heroContainer}>
      <Text style={styles.heroLabel}>This Week's Invitation</Text>
      {currentFocus ? (
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Current focus: ${VIRTUE_LABELS[currentFocus]}. ${VIRTUE_DESCRIPTIONS[currentFocus]}. Double tap to change.`}
          accessibilityHint="Opens virtue selection"
          style={({ pressed }) => [
            styles.heroCard,
            { borderLeftColor: VIRTUE_COLORS[currentFocus] },
            pressed && styles.cardPressed,
          ]}
          onPress={onSelectFocus}
        >
          <View style={styles.heroContent}>
            <Text style={[styles.heroVirtue, { color: VIRTUE_COLORS[currentFocus] }]}>
              {VIRTUE_LABELS[currentFocus]}
            </Text>
            <Text style={styles.heroDescription}>{VIRTUE_DESCRIPTIONS[currentFocus]}</Text>
          </View>
          <Text style={styles.heroChangeText}>Change</Text>
        </Pressable>
      ) : (
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Choose a virtue to focus on this week"
          accessibilityHint="Opens virtue selection"
          style={({ pressed }) => [styles.heroEmptyCard, pressed && styles.cardPressed]}
          onPress={onSelectFocus}
        >
          <Text style={styles.heroEmptyTitle}>Choose Your Focus</Text>
          <Text style={styles.heroEmptyDescription}>
            Select a virtue to hold in awareness this week. This is an invitation, not a requirement.
          </Text>
        </Pressable>
      )}
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// VIRTUE BALANCE: Interconnected circles visualization
// ──────────────────────────────────────────────────────────────────────────────

interface VirtueBalanceProps {
  virtueInstances: { virtue: CardinalVirtue }[];
  currentFocus: CardinalVirtue | null;
}

const VirtueBalance: React.FC<VirtueBalanceProps> = ({ virtueInstances, currentFocus }) => {
  // Count instances per virtue
  const counts = virtueInstances.reduce(
    (acc, instance) => {
      acc[instance.virtue] = (acc[instance.virtue] || 0) + 1;
      return acc;
    },
    {} as Record<CardinalVirtue, number>
  );

  const virtues: CardinalVirtue[] = ['wisdom', 'courage', 'justice', 'temperance'];
  const maxCount = Math.max(...Object.values(counts), 1);

  return (
    <View style={styles.virtueBalanceContainer}>
      <Text style={styles.sectionTitle}>Virtue Balance</Text>
      <Text style={styles.sectionSubtitle}>
        The four cardinal virtues working together
      </Text>

      <View style={styles.virtueCirclesContainer}>
        {virtues.map((virtue) => {
          const count = counts[virtue] || 0;
          const size = 48 + (count / maxCount) * 32; // 48-80px based on relative count
          const isFocused = currentFocus === virtue;

          return (
            <View
              key={virtue}
              accessible
              accessibilityLabel={`${VIRTUE_LABELS[virtue]}: ${count} observations${isFocused ? ', currently focused' : ''}`}
              style={[
                styles.virtueCircle,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: VIRTUE_COLORS[virtue],
                  opacity: isFocused ? 1 : 0.7,
                },
                isFocused && styles.virtueCircleFocused,
              ]}
            >
              <Text style={styles.virtueCircleLabel}>
                {VIRTUE_LABELS[virtue].charAt(0)}
              </Text>
            </View>
          );
        })}
      </View>

      {Object.keys(counts).length === 0 && (
        <Text style={styles.emptyHint}>
          Observations from your check-ins will appear here
        </Text>
      )}
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// CHECK-IN RHYTHM: Dots visualization (not streaks)
// ──────────────────────────────────────────────────────────────────────────────

interface CheckInRhythmProps {
  recentDaysWithPractice: number;
}

const CheckInRhythm: React.FC<CheckInRhythmProps> = ({ recentDaysWithPractice }) => {
  // Show last 14 days as dots
  const days = Array.from({ length: 14 }, (_, i) => i < recentDaysWithPractice);

  return (
    <View style={styles.rhythmContainer}>
      <Text style={styles.sectionTitle}>Practice Rhythm</Text>
      <Text style={styles.sectionSubtitle}>
        Recent days with mindfulness practice
      </Text>

      <View style={styles.dotsContainer}>
        {days.map((hasPractice, index) => (
          <View
            key={index}
            accessible
            accessibilityLabel={hasPractice ? 'Day with practice' : 'Day without practice'}
            style={[
              styles.dot,
              hasPractice ? styles.dotFilled : styles.dotEmpty,
            ]}
          />
        ))}
      </View>

      <Text style={styles.rhythmHelper}>
        {recentDaysWithPractice} of the last 14 days
      </Text>
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// DEVELOPMENTAL STAGE: Horizontal spectrum with user selection
// ──────────────────────────────────────────────────────────────────────────────

interface DevelopmentalStageProps {
  userSelectedStage: DevelopmentalStage | null;
  onSelectStage: () => void;
}

const DevelopmentalStageSection: React.FC<DevelopmentalStageProps> = ({
  userSelectedStage,
  onSelectStage,
}) => {
  const stages: DevelopmentalStage[] = ['fragmented', 'effortful', 'fluid', 'integrated'];
  const selectedIndex = userSelectedStage ? stages.indexOf(userSelectedStage) : -1;

  return (
    <View style={styles.stageContainer}>
      <Text style={styles.sectionTitle}>Your Character Development</Text>
      <Text style={styles.sectionSubtitle}>
        Where you see yourself on the path (you decide)
      </Text>

      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          userSelectedStage
            ? `Current stage: ${STAGE_LABELS[userSelectedStage]}. ${STAGE_DESCRIPTIONS[userSelectedStage]}. Double tap to change.`
            : 'No stage selected. Double tap to choose.'
        }
        style={({ pressed }) => [styles.stageCard, pressed && styles.cardPressed]}
        onPress={onSelectStage}
      >
        {/* Spectrum line */}
        <View style={styles.spectrumContainer}>
          <View style={styles.spectrumLine} />
          {stages.map((stage, index) => {
            const isSelected = stage === userSelectedStage;
            return (
              <View
                key={stage}
                style={[
                  styles.spectrumDot,
                  {
                    left: `${(index / (stages.length - 1)) * 100}%`,
                    backgroundColor: isSelected ? STAGE_COLORS[stage] : colors.gray300,
                  },
                  isSelected && styles.spectrumDotSelected,
                ]}
              />
            );
          })}
        </View>

        {/* Stage labels */}
        <View style={styles.stageLabelsContainer}>
          {stages.map((stage) => (
            <Text
              key={stage}
              style={[
                styles.stageLabel,
                stage === userSelectedStage && {
                  color: STAGE_COLORS[stage],
                  fontWeight: typography.fontWeight.semibold,
                },
              ]}
            >
              {STAGE_LABELS[stage]}
            </Text>
          ))}
        </View>

        {/* Selected stage description */}
        {userSelectedStage ? (
          <View style={styles.stageDescriptionContainer}>
            <Text style={[styles.stageDescription, { color: STAGE_COLORS[userSelectedStage] }]}>
              {STAGE_DESCRIPTIONS[userSelectedStage]}
            </Text>
          </View>
        ) : (
          <View style={styles.stageDescriptionContainer}>
            <Text style={styles.stagePromptText}>
              Tap to select where you see yourself
            </Text>
          </View>
        )}
      </Pressable>

      {/* Classical quote */}
      <View style={styles.quoteContainer}>
        <Text style={styles.quoteText}>
          "Such as are your habitual thoughts, such also will be the character of your mind"
        </Text>
        <Text style={styles.quoteAttribution}>— Marcus Aurelius, Meditations 5.16</Text>
      </View>
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// CLINICAL CONTEXT: Assessment history (visually separated)
// ──────────────────────────────────────────────────────────────────────────────

interface ClinicalContextProps {
  phqHistory: { score: number; date: Date }[];
  gadHistory: { score: number; date: Date }[];
  onTakeAssessment: (type: AssessmentType) => void;
}

const ClinicalContext: React.FC<ClinicalContextProps> = ({
  phqHistory,
  gadHistory,
  onTakeAssessment,
}) => {
  const hasHistory = phqHistory.length > 0 || gadHistory.length > 0;

  return (
    <View style={styles.clinicalContainer}>
      <View style={styles.clinicalHeader}>
        <Text style={styles.clinicalTitle}>Wellness Check-Ins</Text>
        <Text style={styles.clinicalSubtitle}>
          Optional assessments to track your wellbeing over time
        </Text>
      </View>

      {hasHistory ? (
        <View style={styles.assessmentHistoryContainer}>
          {phqHistory.length > 0 && (
            <View style={styles.assessmentCard}>
              <Text style={styles.assessmentLabel}>PHQ-9 (Mood)</Text>
              <Text style={styles.assessmentScore}>
                Last: {phqHistory[phqHistory.length - 1]?.score}
              </Text>
              <Text style={styles.assessmentDate}>
                {phqHistory[phqHistory.length - 1]?.date.toLocaleDateString()}
              </Text>
            </View>
          )}
          {gadHistory.length > 0 && (
            <View style={styles.assessmentCard}>
              <Text style={styles.assessmentLabel}>GAD-7 (Anxiety)</Text>
              <Text style={styles.assessmentScore}>
                Last: {gadHistory[gadHistory.length - 1]?.score}
              </Text>
              <Text style={styles.assessmentDate}>
                {gadHistory[gadHistory.length - 1]?.date.toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.clinicalEmptyState}>
          <Text style={styles.clinicalEmptyText}>
            No assessments yet. These optional check-ins help you notice patterns in your wellbeing.
          </Text>
        </View>
      )}

      <View style={styles.assessmentButtonsContainer}>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Take PHQ-9 mood assessment"
          style={({ pressed }) => [styles.assessmentButton, pressed && styles.cardPressed]}
          onPress={() => onTakeAssessment('phq9')}
        >
          <Text style={styles.assessmentButtonText}>PHQ-9</Text>
        </Pressable>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Take GAD-7 anxiety assessment"
          style={({ pressed }) => [styles.assessmentButton, pressed && styles.cardPressed]}
          onPress={() => onTakeAssessment('gad7')}
        >
          <Text style={styles.assessmentButtonText}>GAD-7</Text>
        </Pressable>
      </View>

      {/* Compliance note - no correlation claims */}
      <Text style={styles.clinicalDisclaimer}>
        Assessments and mindfulness practice are tracked separately. Results are for personal
        awareness only and do not constitute medical advice.
      </Text>
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// SELECTION MODALS
// ──────────────────────────────────────────────────────────────────────────────

interface VirtueSelectionModalProps {
  visible: boolean;
  currentFocus: CardinalVirtue | null;
  onSelect: (virtue: CardinalVirtue | null) => void;
  onClose: () => void;
}

const VirtueSelectionModal: React.FC<VirtueSelectionModalProps> = ({
  visible,
  currentFocus,
  onSelect,
  onClose,
}) => {
  const virtues: CardinalVirtue[] = ['wisdom', 'courage', 'justice', 'temperance'];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Choose Your Focus</Text>
          <Text style={styles.modalSubtitle}>
            This is an invitation to hold a virtue in awareness, not a requirement.
          </Text>

          {virtues.map((virtue) => (
            <Pressable
              key={virtue}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${VIRTUE_LABELS[virtue]}. ${VIRTUE_DESCRIPTIONS[virtue]}`}
              accessibilityState={{ selected: virtue === currentFocus }}
              style={({ pressed }) => [
                styles.modalOption,
                virtue === currentFocus && styles.modalOptionSelected,
                pressed && styles.cardPressed,
              ]}
              onPress={() => onSelect(virtue)}
            >
              <View
                style={[styles.modalOptionDot, { backgroundColor: VIRTUE_COLORS[virtue] }]}
              />
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionTitle}>{VIRTUE_LABELS[virtue]}</Text>
                <Text style={styles.modalOptionDescription}>
                  {VIRTUE_DESCRIPTIONS[virtue]}
                </Text>
              </View>
            </Pressable>
          ))}

          {currentFocus && (
            <Pressable
              accessible
              accessibilityRole="button"
              accessibilityLabel="Clear focus"
              style={({ pressed }) => [styles.modalClearButton, pressed && styles.cardPressed]}
              onPress={() => onSelect(null)}
            >
              <Text style={styles.modalClearText}>Clear Focus</Text>
            </Pressable>
          )}

          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.modalCloseButton, pressed && styles.cardPressed]}
            onPress={onClose}
          >
            <Text style={styles.modalCloseText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

interface StageSelectionModalProps {
  visible: boolean;
  currentStage: DevelopmentalStage | null;
  onSelect: (stage: DevelopmentalStage) => void;
  onClose: () => void;
}

const StageSelectionModal: React.FC<StageSelectionModalProps> = ({
  visible,
  currentStage,
  onSelect,
  onClose,
}) => {
  const stages: DevelopmentalStage[] = ['fragmented', 'effortful', 'fluid', 'integrated'];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Where Do You See Yourself?</Text>
          <Text style={styles.modalSubtitle}>
            This is your self-assessment. There's no right or wrong answer — only honest reflection.
          </Text>

          {stages.map((stage) => (
            <Pressable
              key={stage}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${STAGE_LABELS[stage]}. ${STAGE_DESCRIPTIONS[stage]}`}
              accessibilityState={{ selected: stage === currentStage }}
              style={({ pressed }) => [
                styles.modalOption,
                stage === currentStage && styles.modalOptionSelected,
                pressed && styles.cardPressed,
              ]}
              onPress={() => onSelect(stage)}
            >
              <View
                style={[styles.modalOptionDot, { backgroundColor: STAGE_COLORS[stage] }]}
              />
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionTitle}>{STAGE_LABELS[stage]}</Text>
                <Text style={styles.modalOptionDescription}>
                  {STAGE_DESCRIPTIONS[stage]}
                </Text>
              </View>
            </Pressable>
          ))}

          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.modalCloseButton, pressed && styles.cardPressed]}
            onPress={onClose}
          >
            <Text style={styles.modalCloseText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ──────────────────────────────────────────────────────────────────────────────

const InsightsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  // Stores
  const {
    isLoading: practiceLoading,
    virtueInstances,
    getRecentVirtueInstances,
    loadPersistedState: loadPracticeState,
  } = useStoicPracticeStore();

  const {
    isLoading: insightsLoading,
    currentFocus,
    userSelectedStage,
    setCurrentFocus,
    setUserSelectedStage,
    loadPersistedState: loadInsightsState,
  } = useInsightsStore();

  const { getAssessmentHistory } = useAssessmentStore();

  // Modal state
  const [virtueModalVisible, setVirtueModalVisible] = useState(false);
  const [stageModalVisible, setStageModalVisible] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadPracticeState();
    loadInsightsState();
  }, []);

  // Get recent practice data
  const recentInstances = getRecentVirtueInstances(30);
  const recentDaysWithPractice = new Set(
    recentInstances.map((i) => i.timestamp.toDateString())
  ).size;

  // Get assessment history
  const phqHistory = getAssessmentHistory('phq9')
    .filter((session) => session.result)
    .map((session) => ({
      score: session.result!.totalScore,
      date: new Date(session.result!.completedAt),
    }));

  const gadHistory = getAssessmentHistory('gad7')
    .filter((session) => session.result)
    .map((session) => ({
      score: session.result!.totalScore,
      date: new Date(session.result!.completedAt),
    }));

  // Handlers
  const handleSelectFocus = useCallback(
    async (virtue: CardinalVirtue | null) => {
      await setCurrentFocus(virtue);
      setVirtueModalVisible(false);
    },
    [setCurrentFocus]
  );

  const handleSelectStage = useCallback(
    async (stage: DevelopmentalStage) => {
      await setUserSelectedStage(stage);
      setStageModalVisible(false);
    },
    [setUserSelectedStage]
  );

  const handleTakeAssessment = useCallback(
    (type: AssessmentType) => {
      navigation.navigate('AssessmentFlow', {
        assessmentType: type,
        context: 'standalone',
        allowSkip: true,
      });
    },
    [navigation]
  );

  // Loading state
  if (practiceLoading || insightsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.eveningPrimary} />
          <Text style={styles.loadingText}>Loading your insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="insights-screen">
      <CollapsibleCrisisButton
        mode="standard"
        onNavigate={() => navigation.navigate('CrisisResources')}
        testID="crisis-insights"
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Your Insights
          </Text>
          <Text style={styles.subtitle}>
            Reflect on your mindfulness journey
          </Text>
        </View>

        {/* Hero: This Week's Invitation */}
        <HeroInvitation
          currentFocus={currentFocus}
          onSelectFocus={() => setVirtueModalVisible(true)}
        />

        {/* Practice Patterns Section */}
        <View style={styles.practiceSection}>
          <VirtueBalance
            virtueInstances={virtueInstances}
            currentFocus={currentFocus}
          />

          <CheckInRhythm recentDaysWithPractice={recentDaysWithPractice} />
        </View>

        {/* Developmental Stage */}
        <DevelopmentalStageSection
          userSelectedStage={userSelectedStage}
          onSelectStage={() => setStageModalVisible(true)}
        />

        {/* Visual Separator */}
        <View style={styles.sectionSeparator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>Wellness Context</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* Clinical Context (gray background) */}
        <ClinicalContext
          phqHistory={phqHistory}
          gadHistory={gadHistory}
          onTakeAssessment={handleTakeAssessment}
        />
      </ScrollView>

      {/* Selection Modals */}
      <VirtueSelectionModal
        visible={virtueModalVisible}
        currentFocus={currentFocus}
        onSelect={handleSelectFocus}
        onClose={() => setVirtueModalVisible(false)}
      />

      <StageSelectionModal
        visible={stageModalVisible}
        currentStage={userSelectedStage}
        onSelect={handleSelectStage}
        onClose={() => setStageModalVisible(false)}
      />
    </SafeAreaView>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[24],
    paddingBottom: spacing[48],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[32],
  },
  loadingText: {
    fontSize: typography.bodyRegular.size,
    color: colors.gray600,
    marginTop: spacing[16],
  },

  // Header
  header: {
    marginBottom: spacing[32],
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colors.midnightBlue,
    marginBottom: spacing[8],
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: colors.gray600,
    lineHeight: typography.headline4.size,
  },

  // Card pressed state
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  // Hero Section
  heroContainer: {
    marginBottom: spacing[32],
  },
  heroLabel: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[12],
  },
  heroCard: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing[24],
    borderLeftWidth: spacing[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroContent: {
    flex: 1,
  },
  heroVirtue: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing[4],
  },
  heroDescription: {
    fontSize: typography.bodySmall.size,
    color: colors.gray600,
    lineHeight: typography.title.size,
  },
  heroChangeText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colors.eveningPrimary,
  },
  heroEmptyCard: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing[32],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray300,
    borderStyle: 'dashed',
  },
  heroEmptyTitle: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
    marginBottom: spacing[8],
  },
  heroEmptyDescription: {
    fontSize: typography.bodySmall.size,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: typography.title.size,
  },

  // Practice Section
  practiceSection: {
    marginBottom: spacing[32],
  },

  // Section titles
  sectionTitle: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
    marginBottom: spacing[4],
  },
  sectionSubtitle: {
    fontSize: typography.bodySmall.size,
    color: colors.gray500,
    marginBottom: spacing[16],
  },

  // Virtue Balance
  virtueBalanceContainer: {
    marginBottom: spacing[32],
  },
  virtueCirclesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  virtueCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  virtueCircleFocused: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  virtueCircleLabel: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  emptyHint: {
    fontSize: typography.bodySmall.size,
    color: colors.gray500,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Check-in Rhythm
  rhythmContainer: {
    marginBottom: spacing[16],
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[12],
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotFilled: {
    backgroundColor: colors.eveningPrimary,
  },
  dotEmpty: {
    backgroundColor: colors.gray200,
  },
  rhythmHelper: {
    fontSize: typography.caption.size,
    color: colors.gray500,
    textAlign: 'center',
  },

  // Developmental Stage
  stageContainer: {
    marginBottom: spacing[32],
  },
  stageCard: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginBottom: spacing[16],
  },
  spectrumContainer: {
    height: spacing[24],
    position: 'relative',
    marginBottom: spacing[8],
  },
  spectrumLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 10,
    height: 4,
    backgroundColor: colors.gray300,
    borderRadius: 2,
  },
  spectrumDot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
  },
  spectrumDotSelected: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: -14,
    marginTop: -2,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  stageLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stageLabel: {
    fontSize: typography.micro.size,
    color: colors.gray500,
    flex: 1,
    textAlign: 'center',
  },
  stageDescriptionContainer: {
    marginTop: spacing[16],
    paddingTop: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  stageDescription: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
    lineHeight: typography.headline4.size,
  },
  stagePromptText: {
    fontSize: typography.bodySmall.size,
    color: colors.gray500,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Quote
  quoteContainer: {
    padding: spacing[20],
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.medium,
    borderLeftWidth: spacing[4],
    borderLeftColor: colors.eveningPrimary,
  },
  quoteText: {
    fontSize: typography.bodySmall.size,
    fontStyle: 'italic',
    color: colors.gray600,
    lineHeight: typography.title.size,
    marginBottom: spacing[8],
  },
  quoteAttribution: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray500,
    textAlign: 'right',
  },

  // Section Separator
  sectionSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[32],
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray300,
  },
  separatorText: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray500,
    paddingHorizontal: spacing[16],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Clinical Context
  clinicalContainer: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginBottom: spacing[24],
  },
  clinicalHeader: {
    marginBottom: spacing[16],
  },
  clinicalTitle: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
    marginBottom: spacing[4],
  },
  clinicalSubtitle: {
    fontSize: typography.bodySmall.size,
    color: colors.gray600,
  },
  assessmentHistoryContainer: {
    flexDirection: 'row',
    gap: spacing[12],
    marginBottom: spacing[16],
  },
  assessmentCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
  },
  assessmentLabel: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray500,
    marginBottom: spacing[4],
  },
  assessmentScore: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
  assessmentDate: {
    fontSize: typography.micro.size,
    color: colors.gray500,
    marginTop: spacing[4],
  },
  clinicalEmptyState: {
    paddingVertical: spacing[16],
  },
  clinicalEmptyText: {
    fontSize: typography.bodySmall.size,
    color: colors.gray600,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  assessmentButtonsContainer: {
    flexDirection: 'row',
    gap: spacing[12],
    marginBottom: spacing[16],
  },
  assessmentButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.medium,
    padding: spacing[12],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  assessmentButtonText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colors.eveningPrimary,
  },
  clinicalDisclaimer: {
    fontSize: typography.micro.size,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: typography.caption.size,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing[24],
    paddingBottom: spacing[48],
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: typography.bodySmall.size,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: spacing[24],
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[16],
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.medium,
    marginBottom: spacing[12],
  },
  modalOptionSelected: {
    borderWidth: 2,
    borderColor: colors.eveningPrimary,
  },
  modalOptionDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: spacing[16],
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
    marginBottom: spacing[4],
  },
  modalOptionDescription: {
    fontSize: typography.caption.size,
    color: colors.gray600,
  },
  modalClearButton: {
    padding: spacing[16],
    alignItems: 'center',
    marginBottom: spacing[12],
  },
  modalClearText: {
    fontSize: typography.bodySmall.size,
    color: colors.gray500,
  },
  modalCloseButton: {
    backgroundColor: colors.eveningPrimary,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
});

export default InsightsScreen;
