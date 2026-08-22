/**
 * Domain-specific guidance (FEAT-433 slice 3a; Tier 2/3 added by FEAT-457).
 *
 * Renders the guidance ladder for a named hardship — capped at Tier 1 for a
 * reader in the gentle band — or routes out to crisis resources when the gate
 * says philosophy is not the right answer right now.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STATE PRECEDENCE — the order is the safety property, not a style choice:
 *
 *   1. pending    → the assessment store has not rehydrated. Neutral spinner.
 *                   NO content, and critically NO `loadGuidanceContent` call.
 *   2. suppressed → the notice only. Never any domain content, and again no load.
 *   3. loading    → gate cleared, content in flight.
 *   4. error      → the loader threw (it does so BY DESIGN for career/grief/pain,
 *                   which have no authored content in P0).
 *   5. ready      → Tier 0, Tier 1, then Tier 2/3 iff `allowTier2Plus`.
 *
 * 1 and 2 both preceding the load is what makes slice 2's "a suppressed reader is
 * routed BEFORE any of this content is loaded" true. The lazy loader defers the
 * content; this ordering defers the DECISION to load at all.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * FEAT-457 adds Tier 2/3 behind `decision.allowTier2Plus`. Three constraints on
 * that gating, all from the crisis planning pass:
 *
 *   · Gate POSITIVELY on `allowTier2Plus === true`. Never `level !== 'gentle'` and
 *     never `level === 'full'` — a future fourth access level must default to NOT
 *     showing Tier 2/3, and a negative test defaults it to showing them.
 *   · Derive the tier set from `decision` on EVERY render. Never cache it in state
 *     or a ref: the hook subscribes so a live full→gentle or full→suppressed flip
 *     tears content down mid-view, and caching defeats that.
 *   · Still no teaser, disabled row, "coming soon" or lock icon for a `gentle`
 *     reader. The reasoning changed but the answer did not — a differential
 *     affordance is a distress disclosure, since its presence is a direct function
 *     of a PHQ-9/GAD-7 score and a bystander or a second reader can see it. The
 *     suppression notice had to work hard to avoid naming a score; a differential
 *     affordance reintroduces that structurally, where copy cannot fix it.
 *
 * SILENT TRUNCATION IS THE RULE. No "there is more when you're ready" line: the
 * gate declares no staleness window, so readiness is restored only by a new
 * assessment and never by feeling ready — the same promise `GuidanceSuppressionNotice`
 * already refused to make one band down. Tier 0 + Tier 1 is a complete experience;
 * telling a low-mood reader they got the abridged version is an evaluative message
 * aimed at the cohort least able to absorb it neutrally.
 *
 * NO ANALYTICS ON THIS SCREEN, STILL. `guidance` is now in
 * `core/utils/sensitiveScreens.ts`, so a `screen_viewed` here would coarsen to the
 * generic `App` bucket — noise with no signal. Reach is measured by
 * `guidance_opened` at the Home entry point instead, and that event deliberately
 * carries NO `domain` property: the domain is the wellness inference, and
 * `analytics-architecture.md` publishes "What We NEVER Collect: … Any mental
 * health data."
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { loadGuidanceContent } from '@/core/services/guidanceContent';
import { borderRadius, colorSystem, semantic, spacing, typography } from '@/core/theme';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
// Direct paths, never a feature barrel. `features/guidance` is the one feature dir
// without an index.ts, and that is load-bearing: a barrel would pull guidanceGate
// and the content loader into every importer's eager module graph (FEAT-376),
// defeating the lazy `require` the suppression ordering above depends on.
import { DOMAIN_BINDINGS } from '../constants/domainBindings';
import { useGuidanceGate } from '../hooks/useGuidanceGate';
import type { GuidanceContent } from '../types/guidance';
import GuidanceSuppressionNotice from '../components/GuidanceSuppressionNotice';
import Tier0 from '../components/Tier0';
import Tier1 from '../components/Tier1';
import Tier2 from '../components/Tier2';
import Tier3 from '../components/Tier3';

type Nav = StackNavigationProp<RootStackParamList, 'DomainGuidance'>;
type Route = RouteProp<RootStackParamList, 'DomainGuidance'>;

const DomainGuidanceScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const domain = params.domain;

  const gate = useGuidanceGate();
  const [content, setContent] = useState<GuidanceContent | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const decision = gate.status === 'ready' ? gate.decision : null;
  const suppressed = decision?.level === 'suppressed';

  const openCrisisResources = useCallback(() => {
    // Reuse the descriptor the gate already produced rather than re-authoring the
    // literal. `decideGuidanceAccess` builds `crisisRoute` and slice 1's clinical
    // tests pin it, so there is exactly ONE authoring site for this route in the
    // tree. `navigate`, never `replace` — no crisis entry point in this app uses
    // `replace`, and the back-stack behaviour below depends on the push.
    const route = decision?.crisisRoute;
    if (!route) return;
    navigation.navigate(route.screen, route.params);
  }, [decision, navigation]);

  /**
   * NO AUTOMATIC NAVIGATION. The hand-off is user-initiated, always.
   *
   * An earlier draft pushed CrisisResources once per mount from a ref-guarded effect.
   * The `crisis` specialist ruled it out, and the reasoning is worth keeping in the
   * tree because the auto-push looks protective and is not:
   *
   *   · It adds nothing to safety. "A suppressed reader is served zero philosophy" is
   *     delivered entirely by the render precedence below and the load guard beneath
   *     it. Navigating does not strengthen that property.
   *   · Its trigger is a STORED most-recent result, and the gate deliberately declares
   *     no staleness window. So a Q9 > 0 answer from three months ago would force-push
   *     a crisis screen on EVERY fresh mount of this route, indefinitely — the erosion
   *     the gate's own docblock warns about ("hard-routing every new user to crisis
   *     resources on their first tap would erode trust in the crisis route itself").
   *   · The real intervention already fired at DETECTION time, as an alert the reader
   *     chose from. This surface is second-order; re-firing is not a second chance.
   *   · There is no precedent for it. Every CrisisResources navigation in this app is
   *     a user tap. This would have been the app's first auto-traversal into crisis.
   *
   * The app's crisis idiom is OFFER, not move. `openCrisisResources` is wired to the
   * notice's button and to nothing else.
   */

  /**
   * Load content only once the gate has cleared it.
   *
   * The two early returns are the load-bearing half of the suppression ordering:
   * a pending or suppressed reader never reaches `loadGuidanceContent`, so the
   * JSON is never parsed for them.
   */
  useEffect(() => {
    if (gate.status !== 'ready' || suppressed) return undefined;

    let cancelled = false;
    setLoadFailed(false);

    loadGuidanceContent(domain)
      .then((loaded) => {
        if (!cancelled) setContent(loaded);
      })
      .catch(() => {
        // The loader throws a named error for domains with no authored content —
        // a tested contract, not a guard. Reachable today for career/grief/pain.
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [gate.status, suppressed, domain]);

  const renderBody = () => {
    if (gate.status === 'pending') {
      return (
        <View style={styles.centered} testID="guidance-pending">
          <ActivityIndicator accessibilityLabel="Loading" />
        </View>
      );
    }

    if (suppressed) {
      return <GuidanceSuppressionNotice onOpenCrisisResources={openCrisisResources} />;
    }

    if (loadFailed) {
      return (
        <View style={styles.centered} testID="guidance-error">
          <Text style={styles.errorText}>
            This guidance isn't available yet.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backAction}
            accessibilityRole="button"
            testID="guidance-go-back"
          >
            <Text style={styles.backLabel}>Go back</Text>
          </Pressable>
        </View>
      );
    }

    if (!content) {
      return (
        <View style={styles.centered} testID="guidance-loading">
          <ActivityIndicator accessibilityLabel="Loading" />
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scroll}
        testID="guidance-content"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.situation} accessibilityRole="header">
          {DOMAIN_BINDINGS[domain].label}
        </Text>
        <Tier0 validation={content.validation} />
        {/*
          DORMANT BRANCH — `medicalCaveat` (pain domain, no authored content yet).
          Sited immediately after Tier 0's callouts and above Tier 1 so it can
          never push Tier 0 down: Tier 0's `validation[1]` abuse/safety escape
          clause must stay first and above the fold at every access level.
        */}
        {content.medicalCaveat ? (
          <Tier0 validation={[content.medicalCaveat]} />
        ) : null}
        <Tier1 practice={content.microPractice} />
        {/*
          `=== true`, not truthiness and not a negative test — see the docblock.
          Read straight off `decision` each render; never memoised into state.
        */}
        {decision?.allowTier2Plus === true ? (
          <>
            <Tier2
              protocol={content.protocol}
              obstacles={content.obstacles}
              principles={DOMAIN_BINDINGS[domain].principles}
            />
            <Tier3 quote={content.classicalAnchor} />
          </>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container} testID="domain-guidance-screen">
      {renderBody()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.gray[50],
  },
  scroll: {
    padding: spacing[16],
    paddingBottom: spacing[48],
  },
  situation: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[16],
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[24],
  },
  errorText: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.primary,
    textAlign: 'center',
    marginBottom: spacing[16],
  },
  backAction: {
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
  },
  backLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.primary,
  },
});

export default DomainGuidanceScreen;
