/**
 * CONSENT-BLOCKED NOTICE (DEBUG-451)
 *
 * The explanation for the three fail-closed consent statuses. Before this
 * screen, an onboarded user in `integrity_error`, `revoked` or `under_age`
 * landed at `Main` with `canPerformOperation` returning false for every
 * operation, no prompt, and nothing saying why — because
 * `CleanRootNavigator.checkInitialRoute` tests `settings?.onboardingCompleted`
 * first and unconditionally, so the resolved status never reached routing.
 *
 * ── ONE SCREEN, THREE VARIANTS — NOT THREE SCREENS ───────────────────────────
 *
 * Deliberate, and the reason is safety rather than tidiness. Every new root
 * route is a fresh membership decision against `RootCrisisButton`'s
 * `SUPPRESSED_ROUTES`, and a name a later author could add there "for
 * consistency" — silently switching the root 988 overlay off for this cohort.
 * One route, one screen, three copies.
 *
 * ── WHAT EACH VARIANT MAY SAY ────────────────────────────────────────────────
 *
 * 1. `integrity_error` — the record could not be read. Copy may assert ONLY
 *    that: never that no prior consent existed, never that the user is new,
 *    never that age is unverified (as opposed to unknown). We cannot rule out
 *    that the unreadable record was a withdrawal, which is exactly why
 *    `loadConsent` checks integrity FIRST (`consentStore.ts:862-874`) — an
 *    unparseable record cannot be trusted to report its own `revoked` field.
 *    This is the only variant that is RECOVERABLE, so it is the only one with a
 *    retry.
 *
 * 2. `revoked` — a GDPR Art. 7(3) withdrawal. Purely informational: a
 *    confirmation of what the user themselves chose, which Art. 12 transparency
 *    favours. 🔴 NO ACCEPT, RENEW OR RE-ENABLE CONTROL, EVER. Anything that
 *    could re-collect consent here re-litigates a withdrawal, which is the harm
 *    `RE_CONSENT_ELIGIBLE_STATUSES` exists to prevent.
 *
 * 3. `under_age` — says we cannot ESTABLISH 18+, never that the user IS under
 *    18. Same constraint, and the same wording, as `StaleConsentIneligibleScreen`:
 *    the weaker claim is the only one true of every record that lands here,
 *    including one whose age evidence we simply cannot read.
 *
 * 🚫 NO copy on any variant characterises what the user loses by not acting, or
 * what is restricted meanwhile. That is open counsel work, barred for consent
 * copy by `consentStore.ts`. Naming a feature that is currently off is
 * observable and true; predicting consequences is not.
 *
 * 🚫 NO TELEMETRY on any branch. `PostHogProvider` gates mounting on
 * `currentConsent?.preferences?.analyticsEnabled`, and `currentConsent` is null
 * for all three statuses, so no client exists — and for `revoked` an event would
 * describe a user who told us to stop.
 *
 * ── CRISIS AFFORDANCE ────────────────────────────────────────────────────────
 *
 * This screen mounts NO crisis section of its own. `ConsentBlocked` is
 * deliberately absent from `RootCrisisButton`'s `SUPPRESSED_ROUTES` and
 * `IMMERSIVE_ROUTES`, so the root overlay renders over this `transparentModal`
 * in `standard` mode — the same affordance, on the same testID, as the `Main`
 * these users come from. Adding a second in-screen block to a route that already
 * has one was reverted once before as making things worse. Pinned by
 * `__tests__/safety/consentBlockedCrisisReachability.test.tsx`.
 *
 * Purely presentational: no store import, no navigation import — same contract
 * as `ReConsentScreen` and `StaleConsentIneligibleScreen`, so the route
 * container owns every side effect.
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

/**
 * Horizontal room reserved for the root crisis button.
 *
 * Same constant, and the same reason, as `StaleConsentIneligibleScreen`:
 * `CollapsibleCrisisButton` sits at `right: 0` with a 44pt target and 12pt
 * `hitSlop`, and its `bottom: 100` is commented "Above tab bar" — correct on a
 * tabbed screen, but this is a root modal with no tab bar, so the band lands on
 * the pinned footer. The FAB wins both z-order and hit-testing, so without this
 * clearance it would silently eat touches on the right-hand end of the button.
 */
const CRISIS_FAB_CLEARANCE = spacing[72];

/** Youth mental-health referrals — the pair LegalGate's under-age branch carries. */
const CHILD_MIND_URL = 'https://www.childmind.org';
const TEEN_MENTAL_HEALTH_URL = 'https://teenmentalhealth.org';

/** The three fail-closed statuses, as a closed set the screen can switch on. */
export type ConsentBlockedVariant = 'integrity_error' | 'revoked' | 'under_age';

interface VariantCopy {
  title: string;
  paragraphs: string[];
  /** Label for the sole dismiss control. */
  dismissLabel: string;
}

/**
 * Copy table, kept as data so every variant is legible side by side and a
 * reviewer can see at a glance that no variant carries an accept affordance.
 */
const COPY: Record<ConsentBlockedVariant, VariantCopy> = {
  integrity_error: {
    title: "We couldn't read your saved settings",
    paragraphs: [
      "Something went wrong reading the privacy choices stored on this device, so we don't know what you chose.",
      'You can keep using Being. Features that depend on those choices stay off until we can read them again.',
    ],
    dismissLabel: 'Continue for now',
  },
  revoked: {
    title: 'You withdrew your consent',
    paragraphs: [
      'You asked us to stop using your information, and we have.',
      'Optional features such as cloud backup are off, as you asked.',
    ],
    dismissLabel: 'Close',
  },
  under_age: {
    title: 'Being is now for ages 18 and over',
    paragraphs: [
      "We can't confirm from your saved details that you're 18 or older, so we can't ask you to agree to our terms.",
    ],
    dismissLabel: 'Close',
  },
};

export interface ConsentBlockedScreenProps {
  variant: ConsentBlockedVariant;
  /** Disables controls while a retry read is in flight. */
  isRetrying: boolean;
  /**
   * Re-reads consent from storage. Supplied ONLY for `integrity_error`, the one
   * recoverable variant — a retry on the other two would be a re-consent
   * affordance wearing a different label.
   */
  onRetry?: (() => void) | undefined;
  /** User-initiated dismiss. NEVER call on mount. */
  onDismiss: () => void;
}

const ConsentBlockedScreen: React.FC<ConsentBlockedScreenProps> = ({
  variant,
  isRetrying,
  onRetry,
  onDismiss,
}) => {
  const copy = COPY[variant];
  // Retry is offered only where a re-read can actually resolve the state.
  const showRetry = variant === 'integrity_error' && typeof onRetry === 'function';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']} testID="consent-blocked">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        testID="consent-blocked-scroll"
      >
        <Text style={styles.title} accessibilityRole="header">
          {copy.title}
        </Text>

        {copy.paragraphs.map((paragraph) => (
          <Text key={paragraph} style={styles.body}>
            {paragraph}
          </Text>
        ))}

        {/* Under-18 referrals only. `accessible={false}` on the wrapper is
            deliberate (INFRA-181): `accessible` on an ancestor collapses the
            subtree into one element and hides the links from VoiceOver. */}
        {variant === 'under_age' && (
          <View style={styles.section} accessible={false} testID="consent-blocked-support">
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
              testID="consent-blocked-childmind"
              onPress={() => Linking.openURL(CHILD_MIND_URL)}
            >
              <Text style={styles.linkText}>Child Mind Institute</Text>
            </Pressable>
            <Pressable
              style={styles.link}
              accessibilityRole="link"
              accessibilityLabel="Teen Mental Health, opens in your browser"
              testID="consent-blocked-teenmh"
              onPress={() => Linking.openURL(TEEN_MENTAL_HEALTH_URL)}
            >
              <Text style={styles.linkText}>Teen Mental Health</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Controls grant nothing. There is deliberately no accept, renew or
          re-enable affordance on any variant — see the header. */}
      <View style={styles.footer}>
        {showRetry && (
          <Pressable
            style={({ pressed }) => [
              styles.retry,
              pressed && styles.pressed,
              isRetrying && styles.disabled,
            ]}
            disabled={isRetrying}
            accessibilityRole="button"
            accessibilityState={{ disabled: isRetrying }}
            accessibilityLabel="Try reading your settings again"
            testID="consent-blocked-retry"
            onPress={onRetry}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.dismiss,
            pressed && styles.pressed,
            isRetrying && styles.disabled,
          ]}
          disabled={isRetrying}
          accessibilityRole="button"
          accessibilityState={{ disabled: isRetrying }}
          accessibilityLabel={copy.dismissLabel}
          testID="consent-blocked-dismiss"
          onPress={onDismiss}
        >
          <Text style={styles.dismissText}>{copy.dismissLabel}</Text>
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
    color: semantic.text.primary,
    marginBottom: spacing[8],
  },
  section: {
    marginTop: spacing[24],
  },
  sectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
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
  retry: {
    minHeight: TOUCH_TARGETS.large,
    borderRadius: borderRadius.large,
    backgroundColor: colorSystem.base.midnightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[24],
    marginBottom: spacing[12],
  },
  retryText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  dismiss: {
    minHeight: TOUCH_TARGETS.large,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[24],
  },
  dismissText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.midnightBlue,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    backgroundColor: colorSystem.gray[300],
  },
});

export default ConsentBlockedScreen;
