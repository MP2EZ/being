/**
 * Clean Home Screen
 *
 * FEAT-298 slice 5: ONE daily practice card. The three time-of-day check-in cards and the
 * `daily_loop` / `daily_loop_only` preview flags are retired — the single loop is the
 * default and only daily ritual, and its tense is inferred from the clock rather than
 * chosen by the user.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, semantic, getTheme, spacing, borderRadius, typography } from '@/core/theme';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { useSettingsStore, useAccessibilitySettings } from '@/core/stores/settingsStore';
import AssessmentStatusBadge from '@/features/assessment/components/AssessmentStatusBadge';
import { IntroOverlay } from '../components/IntroOverlay';
import { useAnalytics } from '@/core/analytics';
import { themeKeyFor } from '@/core/types/practice-identity';
import { getGreeting } from '@/core/utils/timeOfDay';
import type { PracticeIdentity } from '@/core/types/practice-identity';

// 30 minutes in milliseconds
const INTRO_THRESHOLD_MS = 30 * 60 * 1000;

type CleanHomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;
// FEAT-298 slice 1: this local 4-member union is now the canonical `PracticeIdentity`.
// The three legacy members remain reachable via deep link until slice 6 retires the flows.
type FlowType = PracticeIdentity;

// PERF-04: hoisted out of CleanHomeScreen's render — defining components inside
// a function component creates a NEW component type on every render, forcing
// React to unmount/remount the entire subtree (loses state, fires effects).
interface CheckInCardProps {
  type: FlowType;
  title: string;
  description: string;
  duration: string;
  isCurrent: boolean;
  isCompleted: boolean;
  onPress: (type: FlowType) => void;
}

const CheckInCard: React.FC<CheckInCardProps> = ({
  type,
  title,
  description,
  duration,
  isCurrent,
  isCompleted,
  onPress,
}) => {
  const themeColors = getTheme(themeKeyFor(type));
  const handlePress = useCallback(() => onPress(type), [onPress, type]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.checkInCard,
        {
          backgroundColor: themeColors.background,
          // WCAG AA: gray[400] for 3:1 contrast ratio on borders
          borderColor: isCurrent ? themeColors.primary : colorSystem.gray[400],
          borderWidth: isCurrent ? 2 : 1,
          opacity: pressed ? 0.9 : isCompleted ? 0.5 : 1,
        }
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${title} check-in, ${duration}${isCompleted ? ', completed today' : ''}`}
      accessibilityHint={
        isCompleted
          ? 'Tap to start this check-in again'
          : `Start your ${type} mindfulness check-in`
      }
    >
      <View>
        <View style={styles.cardHeader}>
          <Text
            style={[styles.cardTitle, { color: themeColors.primary }]}
            accessibilityRole="header"
            accessibilityLevel={3}
          >
            {title}
          </Text>
          <Text style={styles.durationBadge} importantForAccessibility="no">
            {duration}
          </Text>
        </View>
        <Text style={styles.cardDescription} numberOfLines={2}>{description}</Text>
      </View>

      <View style={[styles.startButton, { backgroundColor: themeColors.primary }]}>
        <Text style={styles.startButtonText}>{isCompleted ? 'Complete' : 'Start'}</Text>
      </View>
    </Pressable>
  );
};

const CleanHomeScreen: React.FC = () => {
  const navigation = useNavigation<CleanHomeScreenNavigationProp>();
  // PERF-03: selector instead of whole-store destructure — subscribe only to
  // this single function reference.
  const isCheckInCompletedToday = useStoicPracticeStore((s) => s.isCheckInCompletedToday);
  const accessibilitySettings = useAccessibilitySettings();
  const getLastActiveTimestamp = useSettingsStore((state) => state.getLastActiveTimestamp);
  const { trackScreenView } = useAnalytics();

  // Track screen view for analytics (FEAT-40)
  // useFocusEffect tracks on every focus, not just mount (handles consent timing)
  useFocusEffect(
    useCallback(() => {
      trackScreenView('HomeScreen');
    }, [trackScreenView])
  );

  // Determine if intro animation should show
  const shouldShowIntroInitially = useMemo(() => {
    // Skip animation if reduced motion is enabled
    if (accessibilitySettings?.reducedMotion) {
      return false;
    }

    const lastActive = getLastActiveTimestamp();

    // First launch (no timestamp) - show intro
    if (lastActive === null) {
      return true;
    }

    // Check if 30+ minutes have passed
    const timeSinceActive = Date.now() - lastActive;
    return timeSinceActive > INTRO_THRESHOLD_MS;
  }, [accessibilitySettings?.reducedMotion, getLastActiveTimestamp]);

  const [showIntro, setShowIntro] = useState(shouldShowIntroInitially);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  // FEAT-298 slice 5: the greeting reads the SHARED time helper. It used to inline the
  // same <12 / <17 thresholds that getCurrentPeriod also inlined — two copies of one
  // boundary, which is how the greeting and the loop's tense would have drifted apart.

  const handleCheckInPress = useCallback((type: FlowType) => {
    switch (type) {
      case 'daily-loop':
        // FEAT-298 slice 5: no mode param, and no picker to fall through to any more —
        // the loop infers its tense from the clock (getDailyLoopTense).
        navigation.navigate('DailyLoop');
        break;
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} testID="home-screen">
      <View style={styles.content}>
        {/* Header — MAINT-257: Home is the SOLE intentional exception to the
            shared BodyHeader idiom. The centered display2 "Being" wordmark is the
            brand/landing treatment; Learn/Insights/Profile use the left-aligned
            BodyHeader. Only the appTitle is the screen heading (h1); the greeting
            is a plain text line (not a heading), so each screen has exactly one h1. */}
        <View style={styles.header}>
          <Text
            style={styles.appTitle}
            accessibilityRole="header"
            accessibilityLevel={1}
          >
            Being
          </Text>
          <Text style={styles.greeting}>
            {getGreeting()}
          </Text>
          <Text style={styles.subtitle}>
            Take a moment for mindful awareness
          </Text>
        </View>

        {/* Assessment Status Badge */}
        <AssessmentStatusBadge />

        {/* Check-in Cards - flex to fill remaining space */}
        <View style={styles.checkInSection}>
          {/* FEAT-298 slice 5: ONE indistinguishable daily practice. The three time-of-day
              flows and the `daily_loop` / `daily_loop_only` flags are gone; the loop is the
              default and only daily ritual. Its TENSE is inferred from the clock inside
              DailyLoopNavigator (getDailyLoopTense) — never chosen here and never shown to
              the user, so this card is one button, not a menu. `isCurrent` is always true:
              there is nothing for it to be current *against* any more. */}
          <CheckInCard
            type="daily-loop"
            title="Daily Practice"
            description="One loop through the Five Principles: Aware Presence, Radical Acceptance, Sphere Sovereignty, Virtuous Response, Interconnected Living."
            duration="5-6 min"
            isCurrent
            isCompleted={isCheckInCompletedToday('daily')}
            onPress={handleCheckInPress}
          />
        </View>

        {/* FEAT-293: standalone-practice discoverability.
            Deliberately a FIXED-HEIGHT row BELOW checkInSection, not a fifth
            CheckInCard: checkInSection is flex:1 and every card inside it is
            also flex:1 with no ScrollView, so an extra card would squeeze all
            of them. A fixed row keeps the cards equal to each other and reflows
            cleanly if the three time-of-day cards are later retired. */}
        <Pressable
          style={styles.practicesEntry}
          onPress={() => navigation.navigate('PracticeLibrary')}
          accessibilityRole="button"
          accessibilityLabel="Practices"
          accessibilityHint="Opens breathing, body scan, and Stoic practices"
          testID="home-practices-entry"
        >
          <Text style={styles.practicesEntryLabel}>Practices</Text>
          <Text style={styles.practicesEntryAction}>Explore ›</Text>
        </Pressable>
      </View>

      {/* Intro Animation Overlay */}
      {showIntro && (
        <IntroOverlay
          onComplete={handleIntroComplete}
          greeting={getGreeting()}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // MAINT-263: shared tab-screen surface token (value unchanged: white).
    backgroundColor: semantic.background.screen,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[24],
  },
  header: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  appTitle: {
    fontSize: typography.display2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.midnightBlue,
    marginBottom: spacing[4],
  },
  greeting: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: borderRadius.xs,
  },
  subtitle: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[12],
  },
  checkInSection: {
    flex: 1,
    marginTop: spacing[12],
  },
  // FEAT-293: fixed height, so it never competes with the flex:1 check-in cards.
  practicesEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[12],
    marginTop: spacing[8],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
  practicesEntryLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.black,
  },
  practicesEntryAction: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
  },
  checkInCard: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[20], // Extra to optically balance with title line-height
    borderRadius: borderRadius.xl,
    marginBottom: spacing[16],
    // MAINT-222: border-preferred elevation (DS guidance), replacing the
    // hand-rolled black-shadow recipe. Matches the unified card system.
    borderWidth: 1,
    borderColor: colorSystem.gray[400],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  cardTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
  },
  durationBadge: {
    fontSize: typography.micro.size,
    color: semantic.text.secondary,
    backgroundColor: colorSystem.gray[100],
    // MAINT-222: use spacing tokens for padding (was borderRadius.medium/.xs misuse)
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.medium,
    fontWeight: typography.fontWeight.medium,
  },
  cardDescription: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    lineHeight: typography.title.size,
    marginBottom: spacing[12], // Space before button
  },
  startButton: {
    paddingVertical: spacing[12],
    // MAINT-222: use a borderRadius token (was spacing[12] misuse); same 12px value
    borderRadius: borderRadius.large,
    alignItems: 'center',
  },
  startButtonText: {
    color: colorSystem.base.white,
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default CleanHomeScreen;