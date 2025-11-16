/**
 * RESUME SESSION MODAL
 * FEAT-23: Session resumption for interrupted Stoic practice flows
 *
 * PHILOSOPHER-VALIDATED STOIC LANGUAGE:
 * - Emphasizes character over completion (Sphere Sovereignty)
 * - Both options ("Return to Practice" and "Begin Fresh") framed as equally virtuous
 * - No completion pressure or temporal tracking
 * - Focus on intention and presence, not finishing sessions
 *
 * CLASSICAL CITATION:
 * Epictetus, Enchiridion 51: "Showing up to practice NOW (prohairetic) matters
 * more than completing yesterday's session (aprohairetic)."
 *
 * NON-NEGOTIABLES:
 * - Language distinguishes what user controls (showing up, quality) from what they don't (completion, interruptions)
 * - No messaging implying "finishing" is virtuous and abandoning is not
 * - Character over outcome focus
 * - Radical Acceptance: "Begin Fresh" = accepting the interruption
 * - No gamification or completion metrics
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Vibration,
  ScrollView,
} from 'react-native';
import { colorSystem, spacing, borderRadius } from '@/core/theme/colors';
import { FlowType, SessionMetadata } from '@/types/session';

interface ResumeSessionModalProps {
  visible: boolean;
  session: SessionMetadata | null;
  onResume: () => void;
  onBeginFresh: () => void;
}

/**
 * Format time elapsed as contextual reference (not precise tracking)
 * Philosopher validation: Use "Earlier today" instead of "2 hours ago"
 */
const formatTimeElapsed = (startedAt: number): string => {
  const elapsed = Date.now() - startedAt;
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return 'earlier this week';
  }
  if (hours > 12) {
    return 'earlier today';
  }
  if (hours > 4) {
    return 'a few hours ago';
  }
  return 'earlier today';
};

/**
 * Get friendly screen name from technical screen name
 */
const getFriendlyScreenName = (screenName: string): string => {
  const screenNames: Record<string, string> = {
    // Morning
    Gratitude: 'Morning Gratitude',
    Intention: 'Intention Setting',
    Preparation: 'Mental Preparation',
    PrincipleFocus: 'Principle Focus',
    PhysicalGrounding: 'Physical Grounding',
    MorningCompletion: 'Morning Reflection',
    // Midday
    ControlCheck: 'Control Check',
    Embodiment: 'Embodied Awareness',
    Reappraisal: 'Cognitive Reappraisal',
    Affirmation: 'Virtue Affirmation',
    MiddayCompletion: 'Midday Reflection',
    // Evening
    VirtueReflection: 'Virtue Reflection',
    SenecaQuestions: 'Seneca\'s Questions',
    VirtueInstances: 'Virtue Practice',
    VirtueChallenges: 'Virtue Challenges',
    Celebration: 'Celebration',
    Tomorrow: 'Tomorrow\'s Preparation',
    Lessons: 'Today\'s Lessons',
    SelfCompassion: 'Self-Compassion',
    SleepTransition: 'Sleep Preparation',
    EveningCompletion: 'Evening Reflection',
  };

  return screenNames[screenName] || screenName;
};

/**
 * Get flow-specific theme and display text
 */
const getFlowInfo = (flowType: FlowType) => {
  const flowInfo = {
    morning: {
      title: 'Morning Practice',
      practice: 'morning preparation',
      emoji: '🌅',
      theme: colorSystem.themes.morning,
    },
    midday: {
      title: 'Midday Practice',
      practice: 'midday reflection',
      emoji: '☀️',
      theme: colorSystem.themes.midday,
    },
    evening: {
      title: 'Evening Practice',
      practice: 'evening examination',
      emoji: '🌙',
      theme: colorSystem.themes.evening,
    },
  };

  return flowInfo[flowType];
};

export const ResumeSessionModal: React.FC<ResumeSessionModalProps> = ({
  visible,
  session,
  onResume,
  onBeginFresh,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!session) return null;

  const flowInfo = getFlowInfo(session.flowType);
  const timeElapsed = formatTimeElapsed(session.startedAt);
  const friendlyScreenName = getFriendlyScreenName(session.currentScreen);

  const handleResume = () => {
    Vibration.vibrate(50);
    onResume();
  };

  const handleBeginFresh = () => {
    Vibration.vibrate(50);
    onBeginFresh();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onBeginFresh} // Android back button = begin fresh
    >
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.modalContainer}>
            {/* Header with flow emoji and title */}
            <View style={styles.header}>
              <Text style={styles.emoji}>{flowInfo.emoji}</Text>
              <Text style={styles.title}>Return to Your Practice?</Text>
            </View>

            {/* Session info */}
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>You began this practice:</Text>
              <Text style={styles.infoValue}>{timeElapsed}</Text>

              <View style={styles.progressSection}>
                <Text style={styles.progressLabel}>You were at:</Text>
                <View
                  style={[
                    styles.screenBadge,
                    { backgroundColor: flowInfo.theme.light },
                  ]}
                >
                  <Text
                    style={[
                      styles.screenBadgeText,
                      { color: flowInfo.theme.primary },
                    ]}
                  >
                    {friendlyScreenName}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stoic-validated message */}
            <View style={styles.messageSection}>
              <Text style={styles.message}>
                Earlier today, you began your {flowInfo.practice}. Would you like to return to this practice, or begin fresh with full presence now?
              </Text>
              <Text style={styles.submessage}>
                Either choice is an opportunity to practice virtue. What matters is not completing the session, but the quality of your intention and presence in this moment.
              </Text>

              {/* Educational tooltip button */}
              <Pressable
                style={styles.tooltipButton}
                onPress={() => setShowTooltip(!showTooltip)}
                accessibilityRole="button"
                accessibilityLabel="Learn about Sphere Sovereignty"
                accessibilityHint="Explains what you control in this choice"
              >
                <Text style={styles.tooltipButtonText}>
                  {showTooltip ? '▼' : '▶'} What do I control?
                </Text>
              </Pressable>

              {/* Sphere Sovereignty tooltip */}
              {showTooltip && (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipTitle}>Sphere Sovereignty</Text>
                  <Text style={styles.tooltipText}>
                    <Text style={styles.tooltipBold}>What you control:</Text>
                    {'\n'}• Showing up to practice now
                    {'\n'}• Quality of your attention and intention
                    {'\n'}• Choosing to return or begin fresh
                    {'\n\n'}
                    <Text style={styles.tooltipBold}>What you don't control:</Text>
                    {'\n'}• Whether you "completed" the session
                    {'\n'}• External interruptions that paused your practice
                    {'\n'}• How much time has passed
                  </Text>
                  <Text style={styles.tooltipCitation}>
                    — Epictetus, Enchiridion 1
                  </Text>
                </View>
              )}
            </View>

            {/* Action buttons */}
            <View style={styles.buttonSection}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: flowInfo.theme.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={handleResume}
                accessibilityRole="button"
                accessibilityLabel={`Resume ${flowInfo.title} from ${friendlyScreenName}`}
                accessibilityHint="Continue your practice where you left off"
              >
                <Text style={styles.primaryButtonText}>
                  Return to Practice
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderColor: colorSystem.gray[400],
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={handleBeginFresh}
                accessibilityRole="button"
                accessibilityLabel={`Begin fresh ${flowInfo.title}`}
                accessibilityHint="Start a new practice from the beginning"
              >
                <Text style={styles.secondaryButtonText}>Begin Fresh</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.large,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colorSystem.base.black,
    textAlign: 'center',
  },
  infoSection: {
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.medium,
  },
  infoLabel: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
  },
  progressSection: {
    marginTop: spacing.sm,
  },
  progressLabel: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.xs,
  },
  screenBadge: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.small,
    alignSelf: 'flex-start',
  },
  screenBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  messageSection: {
    marginBottom: spacing.xl,
  },
  message: {
    fontSize: 16,
    color: colorSystem.base.black,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  submessage: {
    fontSize: 14,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  tooltipButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tooltipButtonText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    fontWeight: '600',
  },
  tooltip: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.small,
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.gray[400],
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  tooltipText: {
    fontSize: 13,
    color: colorSystem.gray[700],
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  tooltipBold: {
    fontWeight: '600',
    color: colorSystem.base.black,
  },
  tooltipCitation: {
    fontSize: 12,
    color: colorSystem.gray[500],
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  buttonSection: {
    gap: spacing.md,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.white,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 2,
    backgroundColor: colorSystem.base.white,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.gray[700],
  },
});
