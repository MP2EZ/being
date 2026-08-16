/**
 * STALE-CONSENT INELIGIBLE NOTICE (DEBUG-418)
 *
 * Shown to a user whose stored consent record predates the current
 * `CONSENT_VERSION` and who cannot be re-consented, because we cannot establish
 * that they are 18 or over.
 *
 * ── WHY THIS SCREEN EXISTS ───────────────────────────────────────────────────
 *
 * `ReConsentScreen` is the renewable path. This cohort must NOT see it: on a
 * v1.0.0 record `ageVerification.isEligible` means "≥13", because that flag was
 * computed under the pre-DEBUG-150 gate, so a 13-17-year-old shown that screen
 * would affirm Art. 9(2)(a) consent and then hit `renewConsent`'s refusal — a
 * dead end after a legally meaningless affirmation.
 *
 * Before DEBUG-418 they were simply left at `Main`, where `canPerformOperation`
 * returns false for every operation, no prompt appears, and nothing explains
 * why. This screen is the explanation, and nothing more.
 *
 * ── WHY IT IS DECLINE-ONLY ───────────────────────────────────────────────────
 *
 * There is exactly ONE control and it cannot grant anything. `declineReConsent`
 * carries no age gate on purpose — the store's own rationale is that "a minor
 * declining is a truthful decision that writes no consent record; refusing to log
 * it would lose the one audit entry that shows they were asked and said no". This
 * screen is what that rationale was missing: a place to refuse from.
 *
 * 🔴 THE ACKNOWLEDGEMENT MUST BE A USER PRESS. Never fire `onAcknowledge` on
 * mount. An auto-fired audit entry fabricates a decision the user did not make,
 * which is the exact inverse of the rationale above.
 *
 * ── COPY CONSTRAINTS, BOTH LOAD-BEARING ──────────────────────────────────────
 *
 * 1. It says we cannot ESTABLISH that the user is 18+, never that they ARE under
 *    18. `isBaseEligibleForRenewal` fails closed on a missing or unparseable
 *    `birthYear`, so this screen also serves a record we simply cannot read. The
 *    weaker claim is true of both sub-cohorts; the stronger one would assert
 *    something we do not know about a real person.
 *
 * 2. It does NOT characterise the lapse window — nothing about what happens if
 *    they never re-consent, or what is restricted meanwhile. `consentStore`
 *    bars consent copy from that; it is open counsel work. Saying the prompt
 *    returns next launch is observable and true, so that much is allowed.
 *
 * The change summary itself is not authored here: it comes from
 * `CONSENT_CHANGELOG`, whose 1.1.0 entry already reads "We raised the minimum age
 * to use Being to 18…". Reusing counsel-vetted copy beats writing new copy about
 * an age restriction.
 *
 * ── CRISIS AFFORDANCE ────────────────────────────────────────────────────────
 *
 * This screen mounts NO crisis section of its own. `ReConsent` is deliberately
 * absent from `RootCrisisButton`'s `SUPPRESSED_ROUTES`, so the root overlay
 * renders over this `transparentModal` in `standard` mode — the same affordance,
 * on the same testID, as `Main`. Adding a second in-screen block to a route that
 * already has one was reverted once before as making things worse, so the
 * reachability here is byte-identical to the surface these users are coming from.
 *
 * Purely presentational: no store import, no navigation import — same contract as
 * `ReConsentScreen`, so the route container owns every side effect.
 */

import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  semantic,
  colorSystem,
  spacing,
  borderRadius,
  typography,
  TOUCH_TARGETS,
} from '@/core/theme';
import type { ConsentDelta } from '@/core/stores/consentStore';

/**
 * Horizontal room reserved for the root crisis button.
 *
 * Same reasoning as `ReConsentScreen`'s constant of the same name, and it applies
 * for the same reason: `CollapsibleCrisisButton` sits at `right: 0` with a 44pt
 * target and 12pt `hitSlop`, and its `bottom: 100` is commented "Above tab bar" —
 * correct on a tabbed screen, but this is a root modal with no tab bar, so the
 * band lands on the pinned action footer. The FAB wins both z-order and
 * hit-testing, so without this clearance it would silently eat touches on the
 * right-hand end of the acknowledge button.
 */
const CRISIS_FAB_CLEARANCE = spacing[72];

/** Youth mental-health referrals, matching LegalGate's under-age branch. */
const CHILD_MIND_URL = 'https://www.childmind.org';
const TEEN_MENTAL_HEALTH_URL = 'https://teenmentalhealth.org';

export interface StaleConsentIneligibleScreenProps {
  /** What changed since the stored version. Rendered as plain-language paragraphs. */
  delta: ConsentDelta;
  /** Disables the control while the audit write is in flight. */
  isSubmitting: boolean;
  /** User-initiated. Records the refusal and dismisses. NEVER call on mount. */
  onAcknowledge: () => void;
}

const StaleConsentIneligibleScreen: React.FC<StaleConsentIneligibleScreenProps> = ({
  delta,
  isSubmitting,
  onAcknowledge,
}) => {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']} testID="stale-consent-ineligible">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        testID="stale-consent-ineligible-scroll"
      >
        <Text style={styles.title} accessibilityRole="header">
          Being is now for ages 18 and over
        </Text>

        <Text style={styles.body}>
          Our terms changed since you last used Being, and we can&apos;t confirm from your
          saved details that you&apos;re 18 or older. That means we can&apos;t ask you to
          agree to the updated terms.
        </Text>

        {/* The change summary is counsel-vetted copy from CONSENT_CHANGELOG —
            not authored here. `accessible={false}` on the wrapper is deliberate
            (INFRA-181): `accessible` on an ancestor collapses the subtree into a
            single element and hides the paragraphs from VoiceOver. */}
        <View style={styles.section} accessible={false} testID="stale-consent-ineligible-delta">
          <Text style={styles.sectionTitle} accessibilityRole="header">
            What changed
          </Text>
          {delta.changes.map((change) => (
            <Text key={change.version} style={styles.body}>
              {change.summary}
            </Text>
          ))}
        </View>

        <View style={styles.section} accessible={false} testID="stale-consent-ineligible-support">
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Support that is there for you
          </Text>
          <Text style={styles.body}>
            These organisations offer mental-health support for people under 18.
          </Text>
          <Pressable
            style={styles.link}
            accessibilityRole="link"
            accessibilityLabel="Child Mind Institute, opens in your browser"
            testID="stale-consent-ineligible-childmind"
            onPress={() => Linking.openURL(CHILD_MIND_URL)}
          >
            <Text style={styles.linkText}>Child Mind Institute</Text>
          </Pressable>
          <Pressable
            style={styles.link}
            accessibilityRole="link"
            accessibilityLabel="Teen Mental Health, opens in your browser"
            testID="stale-consent-ineligible-teenmh"
            onPress={() => Linking.openURL(TEEN_MENTAL_HEALTH_URL)}
          >
            <Text style={styles.linkText}>Teen Mental Health</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* One control. It records the refusal and dismisses — it grants nothing,
          so there is deliberately no accept affordance anywhere on this screen. */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.acknowledge,
            pressed && styles.acknowledgePressed,
            isSubmitting && styles.acknowledgeDisabled,
          ]}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting }}
          accessibilityLabel="I understand"
          testID="stale-consent-ineligible-acknowledge"
          onPress={onAcknowledge}
        >
          <Text style={styles.acknowledgeText}>I understand</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: semantic.background.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[24],
    paddingBottom: spacing[16],
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  section: {
    marginTop: spacing[24],
  },
  sectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  body: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: spacing[24],
    marginBottom: spacing[12],
  },
  link: {
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  linkText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.midnightBlue,
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[12],
    paddingBottom: spacing[16],
    paddingRight: CRISIS_FAB_CLEARANCE,
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
  acknowledge: {
    minHeight: TOUCH_TARGETS.large,
    borderRadius: borderRadius.large,
    backgroundColor: colorSystem.base.midnightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[24],
  },
  acknowledgePressed: {
    opacity: 0.85,
  },
  acknowledgeDisabled: {
    backgroundColor: colorSystem.gray[300],
  },
  acknowledgeText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
});

export default StaleConsentIneligibleScreen;
