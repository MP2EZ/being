/**
 * Clean Home Screen
 *
 * FEAT-298 slice 5: ONE daily practice card. The three time-of-day check-in cards and the
 * `daily_loop` / `daily_loop_only` preview flags are retired — the single loop is the
 * default and only daily ritual, and its tense is inferred from the clock rather than
 * chosen by the user.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, semantic, getTheme, spacing, borderRadius, typography } from '@/core/theme';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { useSettingsStore, useAccessibilitySettings } from '@/core/stores/settingsStore';
import AssessmentStatusBadge from '@/features/assessment/components/AssessmentStatusBadge';
// FEAT-457 — direct path, never a features/guidance barrel (FEAT-376). This
// component reaches only DOMAIN_BINDINGS (constants over types), so it adds no
// edge from Home to guidanceGate or the content loader.
import RightNowAffordance from '@/features/guidance/components/RightNowAffordance';
import { isFeatureEnabled } from '@/core/services/featureFlags';
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
      testID={`checkin-card-${type}`}
      style={({ pressed }) => [
        styles.checkInCard,
        {
          backgroundColor: themeColors.background,
          // WCAG AA: gray[400] for 3:1 contrast ratio on borders
          borderColor: isCurrent ? themeColors.primary : colorSystem.gray[400],
          borderWidth: isCurrent ? 2 : 1,
          // DEBUG-527: press feedback ONLY. The `isCompleted ? 0.5` arm that used to
          // sit here composited the whole subtree, halving the contrast of the
          // description (`semantic.text.secondary`) and of the `gray[400]` border
          // chosen three lines above precisely to clear 3:1 — a WCAG AA failure in
          // the state a daily user sees every day after practising. Opacity is not a
          // colour token and cannot be contrast-audited, so completion is expressed
          // structurally instead (see the affordance below).
          opacity: pressed ? 0.9 : 1,
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

      {/* DEBUG-527: completion is a STATE, not an action. A filled, high-contrast,
          full-width bar reading "Complete" parses as an imperative — a call to action
          telling the reader to complete what they have already completed. The done
          state solicits nothing, so it is a quiet status line rather than a button.
          The card itself remains the tap target (accessibilityHint above still offers
          the restart), so no touch target is lost by dropping the bar. */}
      {isCompleted ? (
        <Text style={[styles.completedStatus, { color: themeColors.primary }]}>
          ✓ Done today
        </Text>
      ) : (
        <View style={[styles.startButton, { backgroundColor: themeColors.primary }]}>
          <Text style={styles.startButtonText}>Start</Text>
        </View>
      )}
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

  // MAINT-456: `edges={['top']}`, not the implicit all-four. Home is tab-hosted and
  // React Navigation already reserves the tab bar's height at the bottom, so a bottom
  // inset here is a dead band rather than protection — measured at ~34pt on iPhone
  // 16 Pro when the same change was made to LearnScreen. Matches InsightsScreen's
  // `['top']`; MAINT-437 recorded the divergence and left it for this pass.
  return (
    <SafeAreaView edges={['top']} style={styles.container} testID="home-screen">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        // DEBUG-469: at AX5 the intrinsic-height siblings below consume the whole screen
        // and the card overflows past the fold. Home had NO scroll container, so a swipe
        // had nothing to move and the daily loop could not be entered by any route.
        // `flexGrow: 1` on the content container keeps the default-size layout byte-identical
        // — the content still fills the screen and the card still grows — and engages the
        // scroll only when the content genuinely exceeds the viewport.
        showsVerticalScrollIndicator={false}
      >
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
            // MAINT-528 (philosopher constraint C1): the card must state NO principle
            // COUNT. Quick depth runs THREE beats (QUICK_STEP_KEYS), and FEAT-301 already
            // ruled — as a philosopher blocker — that the count must not be stated for
            // quick, because it re-ranks quick as the deficient version against
            // DepthSelect's pinned "Both are complete practices." A card promising five
            // immediately before that picker pre-attaches "all five" to the practice,
            // which is exactly the inference FEAT-301 blocks at the coda. The old string
            // also named by name the two beats quick omits, and truncated mid-word at
            // 375pt so two of the five never rendered at all.
            description="One loop through the principles."
            duration="5-6 min"
            isCurrent
            isCompleted={isCheckInCompletedToday('daily')}
            onPress={handleCheckInPress}
          />
        </View>

        {/* FEAT-457: the guidance entry point. Ships behind `domain_guidance`,
            build-time and dark in production — the surface it reveals routes a
            suppressed reader to CrisisResources, so its availability must not be
            a function of analytics consent or a network round-trip (INFRA-199).

            SITED HERE, between checkInSection and the Practices row, and inside
            the ScrollView DEBUG-469 added. What it displaces: `checkInSection`
            and `checkInCard` no longer grow at all (MAINT-528), so this row
            displaces NOTHING: every element takes its intrinsic height and this
            row's arrival simply shortens the terminal margin below the Practices
            row. Past the point where that margin reaches zero, the ScrollView
            engages. (This comment has been wrong twice — it first claimed
            `flex: 1` and "nothing below moves", then described a `minHeight: 180`
            floor bounding a squeeze. There is no squeeze now to bound.)

            It must stay INSIDE the ScrollView. Pinned below one, it would share
            screen coordinates with content clipped behind it, and XCUITest scores
            such an element visible — so Maestro would skip `scrollUntilVisible`
            and tap the wrong thing (DEBUG-465).

            It does NOT compete with AssessmentStatusBadge. The badge is a STATE
            indicator that renders above checkInSection at its natural height and
            changes with assessment cadence; this row is a static navigation
            affordance that renders identically every day and never carries a
            badge, count or urgency colour. Different region, different register.

            Subordinate to the daily ritual, never above it. */}
        {isFeatureEnabled('domain_guidance') && <RightNowAffordance />}

        {/* FEAT-293: standalone-practice discoverability.
            Deliberately a FIXED-HEIGHT row BELOW checkInSection, not a fifth
            CheckInCard: an extra growing card would compete with the check-in
            card for surplus space. A fixed row keeps the cards equal to each
            other and reflows cleanly.
            DEBUG-469 corrected this note: it used to justify itself with "no
            ScrollView", which is no longer true and was the defect. */}
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
      </ScrollView>

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
  scroll: {
    flex: 1,
  },
  content: {
    // DEBUG-469: `flexGrow` on a contentContainer, never `flex`. A ScrollView's content
    // container must be free to exceed the viewport; `flex: 1` would clamp it to the
    // viewport height and reinstate exactly the overflow this fixes.
    flexGrow: 1,
    paddingHorizontal: spacing[24],
  },
  header: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  // MAINT-528: the header's intervals were 4pt and 2pt, which made the top of the screen
  // dense while the bottom held a void — the visual signature of an unfinished layout
  // rather than of restraint. Spaciousness is a rhythm property, not a quantity one: it
  // reads as deliberate only when every interval is generous and roughly proportional.
  appTitle: {
    fontSize: typography.display2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.midnightBlue,
    marginBottom: spacing[8],
  },
  greeting: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    // Was `borderRadius.xs` — a RADIUS token used as spacing, and only 2pt of it.
    marginBottom: spacing[8],
  },
  subtitle: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[12],
  },
  checkInSection: {
    // MAINT-528: no `flexGrow`. DEBUG-469 kept the card reachable at AX5 by making this
    // chain grow into surplus with a `minHeight` floor; this removes the growth instead.
    // With nothing in the tree competing for vertical space, the flexBasis-0 collapse
    // cannot recur by construction — every child takes its intrinsic height and the
    // ScrollView engages when they exceed the viewport. The surplus now falls BELOW the
    // last element, out of `justifyContent` defaulting to flex-start, rather than being
    // absorbed into the card.
    marginTop: spacing[48],
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
    color: semantic.text.primary,
  },
  practicesEntryAction: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
  },
  checkInCard: {
    // MAINT-528: the card HUGS its content. It previously carried `flexGrow: 1` plus
    // `justifyContent: 'space-between'`, so it swelled to eat every spare pixel and then
    // pinned its own title block to its top and its button to its bottom — putting ~300pt
    // of dead space INSIDE a bordered container, where it reads as a hole rather than as
    // air. `minHeight: 180` went with them: it existed only to bound a squeeze, and with
    // nothing squeezing it would now just force the card past its own content.
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[20], // Extra to optically balance with title line-height
    borderRadius: borderRadius.xl,
    marginBottom: spacing[40],
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
  // DEBUG-527: the done state's affordance. Colour comes from `themeColors.primary`
  // at the call site (the same token the Start bar fills with), so it inherits the
  // palette rather than minting a second one. No bottom padding — the card already
  // carries `paddingBottom: spacing[20]`.
  completedStatus: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    paddingTop: spacing[12],
  },
});

export default CleanHomeScreen;