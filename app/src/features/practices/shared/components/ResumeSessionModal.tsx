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

import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  View,
  Text,
  StyleSheet,
  Pressable,
  Vibration,
  ScrollView,
  findNodeHandle,
} from 'react-native';
import { semantic, colorSystem, spacing, borderRadius, typography } from '@/core/theme';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';
import { SessionMetadata } from '@/core/types/session';
import { themeKeyFor } from '@/core/types/practice-identity';
import type { PracticeIdentity } from '@/core/types/practice-identity';

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
  const now = new Date();
  const started = new Date(startedAt);
  const hours = Math.floor((now.getTime() - startedAt) / (1000 * 60 * 60));

  // FEAT-298 slice 3b: compare CALENDAR DAYS, not elapsed hours. The old version returned
  // 'earlier today' for anything under 12h, so a 22:00 -> 08:00 resume claimed "today" for
  // work done yesterday. Cosmetic for the legacy flows; materially false for a day-keyed
  // daily ritual, whose records are stamped with the local calendar date.
  const startedOnADifferentDay =
    started.getFullYear() !== now.getFullYear() ||
    started.getMonth() !== now.getMonth() ||
    started.getDate() !== now.getDate();

  if (hours >= 24) {
    return 'earlier this week';
  }
  if (startedOnADifferentDay) {
    return 'yesterday';
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
    // Daily loop (FEAT-291 / FEAT-298). Canonical principle names verbatim — these are a
    // philosopher invariant fixed across every mode. Without them the badge would render
    // the raw camelCase route key ("AwarePresence") to the user.
    AwarePresence: 'Aware Presence',
    RadicalAcceptance: 'Radical Acceptance',
    SphereSovereignty: 'Sphere Sovereignty',
    VirtuousResponse: 'Virtuous Response',
    InterconnectedLiving: 'Interconnected Living',
    // Completed sessions are not resumable, so this should be unreachable — mapped so a
    // bug can never surface a route key to the user.
    DailyLoopComplete: 'Closing',

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
const getFlowInfo = (flowType: PracticeIdentity) => {
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
    // FEAT-298 slice 3b. `practice` must be an act-noun that is NOT mode-specific: this
    // function has no access to DailyLoopMode, so "preparation"/"examination" would be
    // wrong two-thirds of the time. 🌿 keeps the calm register of 🌅 ☀️ 🌙 while carrying
    // no time of day (the loop is time-agnostic in flat mode); 🔄/⏳/🎯 were rejected as
    // redo / time-pressure / outcome cues. Theme goes through the slice-1 seam rather than
    // hardcoding midday, so PracticeIdentity can widen without a design-system release.
    'daily-loop': {
      title: 'Daily Practice',
      practice: 'daily practice',
      emoji: '🌿',
      theme: colorSystem.themes[themeKeyFor('daily-loop')],
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
  const titleRef = useRef<Text>(null);

  // DEBUG-403: <Modal> gave us an OS focus trap for free; a plain overlay does not.
  // Move VoiceOver/TalkBack focus to the question, not to a choice — landing on a
  // button would skip what is being asked.
  useEffect(() => {
    if (!visible || !session) return;

    const focusTitle = (): void => {
      const tag = findNodeHandle(titleRef.current);
      if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
    };

    const raf = requestAnimationFrame(focusTitle);
    // TalkBack silently no-ops setAccessibilityFocus if it has not finished
    // processing the layout change, so retry once (mirrors HapticsOptInPrompt).
    const retry = setTimeout(focusTitle, 350);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(retry);
    };
  }, [visible, session]);

  // DEBUG-403: replaces <Modal onRequestClose={onBeginFresh}>. Android hardware back
  // must still mean "Begin Fresh" — NOT a no-op consume. That distinction is the whole
  // behaviour contract of this prompt: both options are framed as equally virtuous, and
  // silently swallowing back would strand the user in a prompt with no keyboardless exit.
  useEffect(() => {
    if (!visible || !session) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBeginFresh();
      return true;
    });
    return () => subscription.remove();
  }, [visible, session, onBeginFresh]);

  // Guarded INSIDE the component rather than by the caller, so `showTooltip` survives a
  // hide/show cycle exactly as it did under <Modal visible={...}>. Hoisting this to the
  // parent would reset it on every dismiss — a silent behaviour change.
  if (!visible || !session) return null;

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
    <View
      style={styles.overlay}
      // iOS: trap VoiceOver inside the prompt. Android has no equivalent, so
      // DailyLoopNavigator hides the navigator subtree with
      // importantForAccessibility="no-hide-descendants" while this is up.
      accessibilityViewIsModal={true}
      testID="resume-session-overlay"
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.modalContainer}>
          {/* Header with flow emoji and title */}
          <View style={styles.header}>
            <Text style={styles.emoji}>{flowInfo.emoji}</Text>
            <Text style={styles.title} ref={titleRef}>
              Return to Your Practice?
            </Text>
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
                You began your {flowInfo.practice}. Would you like to return to it, or begin fresh with full presence now?
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
                testID="resume-session-button"
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
                // FEAT-298: stable ids on both actions. A text selector is ambiguous here —
                // the modal's BODY COPY also contains "begin fresh", and that <Text> precedes
                // the button, so a text match taps the paragraph and silently no-ops.
                testID="begin-fresh-button"
              >
                <Text style={styles.secondaryButtonText}>Begin Fresh</Text>
              </Pressable>
            </View>
        </View>
      </ScrollView>
    </View>
  );
};

/**
 * DEBUG-403 — vertical band at the bottom of the screen that the root crisis button
 * occupies, kept clear so this prompt's choices row can never overlap it.
 *
 * Derived from CollapsibleCrisisButton's geometry: it sits at `bottom` 100 (iOS) / 104
 * (Android), is TOUCH_TARGETS.minimum tall, and carries a 12pt hitSlop, so its hit area
 * reaches ~156pt up from the bottom edge. The larger platform value plus one spacing
 * step is used for both rather than branching — being generous costs nothing and an
 * overlap is unrecoverable: the crisis button renders at zIndex 9999 above this layer
 * and would win the tap, BOTH firing a false crisis entry AND biasing the mis-tap
 * toward one specific choice.
 *
 * This constraint did not exist while this component was an RN <Modal>, because the
 * crisis button was not on screen at all. Mirrors HapticsOptInPrompt's band.
 */
const CRISIS_BUTTON_RESERVED_BAND = 104 + TOUCH_TARGETS.minimum + 12 + spacing[16];

const styles = StyleSheet.create({
  overlay: {
    // DEBUG-403: absolute inset-0, not `flex: 1`. This layer is now a sibling of
    // DailyLoopNavigator's <Stack.Navigator> rather than the root of a separate native
    // window, so it must position itself over that content explicitly.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // ⚠️ WHITE, NOT THE PREVIOUS rgba(0, 0, 0, 0.6) SCRIM — do not revert.
    //
    // The root crisis button now renders ON TOP of this layer (that is the entire point
    // of DEBUG-403), at FADED_OPACITY because DailyLoop is an IMMERSIVE_ROUTE. The old
    // dark scrim was harmless only while the button was invisible; making the button
    // visible turns this backgroundColor into a contrast surface for the first time.
    // HapticsOptInPrompt's header records the measurements: against #171717 the faded
    // button is 1.34:1, against white 2.71:1 — and DEBUG-396's FADED_OPACITY of 0.6
    // clears 3:1 on white. Darkening moves the wrong way; white is the ceiling.
    backgroundColor: colorSystem.base.white,
    justifyContent: 'center',
    alignItems: 'center',
    // Keeps the card clear of the crisis button's hit area.
    paddingBottom: CRISIS_BUTTON_RESERVED_BAND,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[24],
  },
  modalContainer: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.large,
    padding: spacing[32],
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: spacing[4],
    },
    shadowOpacity: 0.3,
    shadowRadius: borderRadius.medium,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[24],
  },
  emoji: {
    fontSize: spacing[48],
    marginBottom: spacing[8],
  },
  title: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    textAlign: 'center',
  },
  infoSection: {
    marginBottom: spacing[24],
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.medium,
  },
  infoLabel: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    marginBottom: spacing[4],
  },
  infoValue: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[16],
  },
  progressSection: {
    marginTop: spacing[8],
  },
  progressLabel: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    marginBottom: spacing[4],
  },
  screenBadge: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.small,
    alignSelf: 'flex-start',
  },
  screenBadgeText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
  },
  messageSection: {
    marginBottom: spacing[32],
  },
  message: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[8],
  },
  submessage: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    textAlign: 'center',
    lineHeight: typography.title.size,
    fontStyle: 'italic',
    marginBottom: spacing[16],
  },
  tooltipButton: {
    paddingVertical: spacing[8],
    alignItems: 'center',
    // DEBUG-365 sweep finding, not named in the ticket — which listed this file
    // as already compliant. That is true of primaryButton / secondaryButton (48)
    // but not of this third control, which was ~33pt on the same padding-only
    // shape as Timer.controlButton.
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
  },
  tooltipButtonText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    fontWeight: typography.fontWeight.semibold,
  },
  tooltip: {
    marginTop: spacing[8],
    padding: spacing[16],
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.small,
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.gray[400],
  },
  tooltipTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[4],
  },
  tooltipText: {
    fontSize: 13,
    color: colorSystem.gray[700],
    lineHeight: typography.bodyLarge.size,
    marginBottom: spacing[4],
  },
  tooltipBold: {
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
  },
  tooltipCitation: {
    fontSize: typography.micro.size,
    color: semantic.text.muted,
    fontStyle: 'italic',
    marginTop: spacing[4],
  },
  buttonSection: {
    gap: spacing[16],
  },
  primaryButton: {
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: spacing[48],
  },
  primaryButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  secondaryButton: {
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: spacing[48],
    borderWidth: 2,
    backgroundColor: colorSystem.base.white,
  },
  secondaryButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[700],
  },
});
