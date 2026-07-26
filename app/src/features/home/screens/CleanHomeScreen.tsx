/**
 * Clean Home Screen - Fresh start implementation
 * Shows three DRD-compliant check-in cards without crypto dependencies
 * Integrated with check-in flow navigation
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
import { isFeatureEnabled } from '@/core/services/featureFlags';
import { themeKeyFor } from '@/core/types/practice-identity';
import type { PracticeIdentity } from '@/core/types/practice-identity';

// 30 minutes in milliseconds
const INTRO_THRESHOLD_MS = 30 * 60 * 1000;

type CleanHomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;
// FEAT-298 slice 1: this local 4-member union is now the canonical `PracticeIdentity`.
// 'daily-loop' is the card type for the flag-gated Daily Practice (Beta) entry; its
// palette comes from `themeKeyFor` rather than an inline ternary.
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
  const currentHour = new Date().getHours();
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

  const getGreeting = () => {
    if (currentHour < 12) return 'Good morning';
    if (currentHour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getCurrentPeriod = (): 'morning' | 'midday' | 'evening' => {
    if (currentHour < 12) return 'morning';
    if (currentHour < 17) return 'midday';
    return 'evening';
  };

  const currentPeriod = getCurrentPeriod();

  // FEAT-291 prototype flags (build-time, dark in production):
  //  - daily_loop: show the Daily Practice card alongside the 3 flows.
  //  - daily_loop_only: preview the eventual single-ritual Home — hide the 3
  //    time-of-day flows, show only the loop (requires daily_loop on).
  const dailyLoopEnabled = isFeatureEnabled('daily_loop');
  const dailyLoopOnly = dailyLoopEnabled && isFeatureEnabled('daily_loop_only');

  const handleCheckInPress = useCallback((type: FlowType) => {
    switch (type) {
      case 'morning':
        navigation.navigate('MorningFlow');
        break;
      case 'midday':
        navigation.navigate('MiddayFlow');
        break;
      case 'evening':
        navigation.navigate('EveningFlow');
        break;
      case 'daily-loop':
        // FEAT-291: no mode param → the loop shows its in-flow mode picker (flat/morning/evening).
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
          {/* The 3 time-of-day flows. Hidden when the daily_loop_only preview is on
              (dark in production) — otherwise the unchanged default Home. */}
          {!dailyLoopOnly && (
            <>
              <CheckInCard
                type="morning"
                title="Morning Awareness"
                description="Start your day with mindful awareness of your body, emotions, and intentions."
                duration="5-7 min"
                isCurrent={currentPeriod === 'morning'}
                isCompleted={isCheckInCompletedToday('morning')}
                onPress={handleCheckInPress}
              />

              <CheckInCard
                type="midday"
                title="Midday Reset"
                description="Take a moment to reconnect with the present through mindful awareness."
                duration="3 min"
                isCurrent={currentPeriod === 'midday'}
                isCompleted={isCheckInCompletedToday('midday')}
                onPress={handleCheckInPress}
              />

              <CheckInCard
                type="evening"
                title="Evening Reflection"
                description="Reflect on your day with gratitude and intention. Release what's done and rest peacefully."
                duration="5-6 min"
                isCurrent={currentPeriod === 'evening'}
                isCompleted={isCheckInCompletedToday('evening')}
                onPress={handleCheckInPress}
              />
            </>
          )}

          {/* FEAT-291: single-loop daily-practice prototype. Flag-gated (build-time
              `daily_loop`, dark in production). When daily_loop_only is also on, this
              is the ONLY card and drops the "(Beta)" tag — a preview of the eventual
              single-ritual Home. */}
          {dailyLoopEnabled && (
            <CheckInCard
              type="daily-loop"
              title={dailyLoopOnly ? 'Daily Practice' : 'Daily Practice (Beta)'}
              description="One loop through the Five Principles: Aware Presence, Radical Acceptance, Sphere Sovereignty, Virtuous Response, Interconnected Living."
              duration="5-6 min"
              isCurrent={dailyLoopOnly}
              // FEAT-298 slice 3: was hardcoded false. The loop now records its own
              // 'daily' check-in, so its card can finally reflect its own completion
              // instead of silently fading the Midday card.
              isCompleted={isCheckInCompletedToday('daily')}
              onPress={handleCheckInPress}
            />
          )}
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
    color: colorSystem.gray[600],
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
    color: colorSystem.gray[600],
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
    color: colorSystem.gray[600],
    backgroundColor: colorSystem.gray[100],
    // MAINT-222: use spacing tokens for padding (was borderRadius.medium/.xs misuse)
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.medium,
    fontWeight: typography.fontWeight.medium,
  },
  cardDescription: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
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