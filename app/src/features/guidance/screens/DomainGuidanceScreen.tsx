/**
 * Domain-specific guidance (FEAT-433, slice 3a).
 *
 * Renders Tier 0 and Tier 1 for a named hardship, or routes out to crisis
 * resources when the gate says philosophy is not the right answer right now.
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
 *   5. ready      → Tier 0 then Tier 1. Nothing else in this slice.
 *
 * 1 and 2 both preceding the load is what makes slice 2's "a suppressed reader is
 * routed BEFORE any of this content is loaded" true. The lazy loader defers the
 * content; this ordering defers the DECISION to load at all.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Slice 3a renders Tier 0/1 ONLY, even at access level `full`. `protocol`,
 * `obstacles` and `classicalAnchor` are Tier 2/3 and belong to FEAT-457 — and
 * there is deliberately no teaser, disabled control or "coming soon" row for them
 * either. An affordance visible to one access level and not another converts the
 * gate's currently-inert GAD-7 gap into a visible one before it has been ruled on.
 *
 * NO ANALYTICS HERE, DELIBERATELY. `core/utils/sensitiveScreens.ts` has no
 * `guidance` keyword, so an automatic `screen_viewed` would ship the hardship
 * domain to PostHog uncoarsened — and the domain IS the sensitive inference.
 * Instrumentation is FEAT-457's, together with the policy call.
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
        <Tier1 practice={content.microPractice} />
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
