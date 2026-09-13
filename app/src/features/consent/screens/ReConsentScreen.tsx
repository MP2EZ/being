/**
 * RE-CONSENT SCREEN (FEAT-376 slice C1)
 *
 * Shown when a user's stored consent predates the current policy version. Tells
 * them what changed and re-collects every affirmative act — it does not carry a
 * single tick forward.
 *
 * PURELY PRESENTATIONAL. No navigation import, no store import, no side effects
 * beyond the two callbacks. FEAT-417 owns the trigger, the route registration
 * and the container that supplies `onSubmit` / `onDecline`.
 *
 * ── EIGHT CONTROLS, TWO RECORDS ──────────────────────────────────────────────
 * Being collects consent across two disjoint records and a re-consent must
 * replay both (`consentStore.ts:56-65` and `:91-108`):
 *
 *   Group 1  ToS · Privacy Policy · Wellness Disclaimer · Art. 9(2)(a)
 *            → `LegalGateConsents`, document acceptances, checkbox role
 *   Group 2  analytics · crashReports · cloudSync · research
 *            → `ConsentPreferences`, optional product toggles, switch role
 *
 * `mentalHealthProcessingConsent` is on BOTH interfaces. It is collected exactly
 * once, in Group 1, and propagated into both records — mirroring how
 * `OnboardingScreen.tsx:1006` carries the legal-gate tick into the granted
 * `ConsentRecord`. (DEBUG-419 changed what happens when that record is
 * UNREADABLE — it re-asks now rather than reconstructing a value — but the
 * propagation itself is unchanged, and re-asking is the same posture this
 * screen takes.)
 *
 * 🔴 THE ART. 9 TICK IS NEVER A `ConsentToggleCard`. That component requires
 * `details: { whatWeCollect, whatWeDontCollect, whyItHelps }`
 * (`ConsentToggleCard.tsx:37-57`), which has no truthful value for "I accept the
 * Terms of Service" or for special-category-data consent. Its four call sites
 * are all optional product toggles and always have been.
 *
 * 🔴 ALL EIGHT MOUNT UNCHECKED, UNCONDITIONALLY — including ones whose policy
 * did not change. Pre-checking from the prior record is the dark pattern
 * DEBUG-150 removed, and `consentStore.ts:16` states the rule. `currentPreferences`
 * is read for DISPLAY ONLY (the notice above Group 2); that is not a
 * carry-forward, and `staleConsent`'s doc forbids reading it to *widen
 * permission*, which this does not.
 *
 * ── CRISIS REACHABILITY ──────────────────────────────────────────────────────
 * 🔴 `ReConsent` is deliberately NOT in `RootCrisisButton.SUPPRESSED_ROUTES`, and
 * this screen owns no crisis section of its own (founder decision D1). The root
 * overlay is therefore its ONLY 988 affordance. It survives because
 * `RootCrisisButton` is a later sibling of the whole `Stack.Navigator` inside
 * `<View style={styles.root}>` (`CleanRootNavigator.tsx:693-721`) and the root
 * stack is a JS stack, so a `transparentModal` screen renders beneath it. No
 * `zIndex` written here can cross that stacking context.
 *
 * What CAN defeat it, and is therefore forbidden on this screen — each pinned by
 * `__tests__/ReConsentScreen.accessibility.test.tsx`:
 *   · a React Native `<Modal>` (separate native view hierarchy, renders above
 *     any JS overlay — `RootCrisisButton.tsx:46-50`)
 *   · `Alert.alert` (native, same reason) — including as a Decline confirmation
 *   · `accessibilityViewIsModal` / `accessibilityElementsHidden` /
 *     `importantForAccessibility="no-hide-descendants"`
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  AccessibilityInfo,
  type AccessibilityActionEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  semantic,
  colorSystem,
  spacing,
  borderRadius,
  typography,
  TOUCH_TARGETS,
} from '@/core/theme';
import type { ConsentDelta, ConsentPreferences } from '@/core/stores/consentStore';
import ConsentToggleCard from '../components/ConsentToggleCard';
import { CONSENT_DETAILS } from '../constants/consentDetails';
import type { ReConsentSubmission } from '../services/submitReConsent';

const TERMS_URL = 'https://being.fyi/terms';
const PRIVACY_URL = 'https://being.fyi/privacy';

/**
 * Horizontal room reserved for the root crisis button.
 *
 * `CollapsibleCrisisButton` is 44pt (`:105`) at `right: 0` (`:473`) with
 * `hitSlop` 12 all round (`:456`), so it owns x ∈ [right−56, right]. Its
 * `bottom: 100` (`:471`) is commented "Above tab bar" and is correct on every
 * screen that has one — but `ReConsent` is a root modal with NO tab bar, so that
 * band (y ∈ [88, 156] from the root view's bottom) lands squarely on this
 * screen's pinned action footer. The FAB wins z-order AND hit-testing, so
 * without this clearance it would silently eat touches on the right-hand end of
 * the Decline button.
 *
 * 56 of clearance + a 16 gutter. Reserving horizontal space rather than vertical
 * because clearing the band vertically would cost 156pt of screen.
 */
const CRISIS_FAB_CLEARANCE = spacing[72];

export interface ReConsentScreenProps {
  /** What changed since the stored version. Rendered as plain-language paragraphs. */
  delta: ConsentDelta;
  /**
   * The user's CURRENT optional preferences, for the display-only notice above
   * Group 2. Never used to pre-check anything.
   *
   * `null` means genuinely unknown, not "nothing enabled" — the notice then
   * drops its "you currently have" clause rather than assert a state it does not
   * have. In practice FEAT-417 always has this (`staleConsent.preferences` for
   * `version_mismatch`, `currentConsent.preferences` for `expired`).
   */
  currentPreferences: ConsentPreferences | null;
  isSubmitting: boolean;
  /**
   * User-facing copy, rendered verbatim.
   *
   * ⚠️ CONTRACT FOR THE CALLER: the store's own guard-clause strings
   * (`consentStore.ts:1082`, `:1090`, `:1098`) are internal diagnostics, not
   * end-user copy. Translate before passing them here — this screen knows
   * nothing about store internals.
   */
  errorMessage: string | null;
  onSubmit: (submission: ReConsentSubmission) => void;
  onDecline: () => void;
}

/** "Analytics", "Analytics and Cloud Backup", "Analytics, Cloud Backup and Research". */
const joinWithAnd = (items: string[]): string => {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};

const ReConsentScreen: React.FC<ReConsentScreenProps> = ({
  delta,
  currentPreferences,
  isSubmitting,
  errorMessage,
  onSubmit,
  onDecline,
}) => {
  // Group 1 — document acceptances. All false on mount, always.
  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [wellnessDisclaimerAcknowledged, setWellnessDisclaimerAcknowledged] = useState(false);
  const [mentalHealthProcessingConsent, setMentalHealthProcessingConsent] = useState(false);

  // Group 2 — optional preferences. All false on mount, always.
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [crashReportsEnabled, setCrashReportsEnabled] = useState(false);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [researchEnabled, setResearchEnabled] = useState(false);

  /**
   * FEAT-475 — the Art. 9(2)(a) tick is deliberately NOT a conjunct here.
   *
   * ToS, the Privacy Policy and the wellness disclaimer are contract terms and a
   * scope acknowledgment, not GDPR Art. 4(11) consent, so requiring them raises no
   * Art. 7(4) question. `mentalHealthProcessingConsent` is the one true
   * special-category consent on this screen, and bundling it into a mandatory set
   * is what made it not freely given. It is still CAPTURED and still written to
   * BOTH records at whatever value it holds (see `handleSubmit`); it just no
   * longer gates Submit. Ported from `CombinedLegalGateScreen.tsx:163-180`, which
   * FEAT-470 unbundled first.
   *
   * 🔴 Written as three named conjuncts, NOT as a relaxed comparator over the old
   * four-term sum. `acceptedCount >= 3` would let a user tick Art. 9 plus any two
   * required items and submit WITHOUT the wellness disclaimer — the screen's only
   * mandatory acknowledgment naming 911/988. A count cannot express WHICH three.
   */
  const requiredConsentsTicked =
    tosAccepted && privacyAccepted && wellnessDisclaimerAcknowledged;

  const requiredRemaining =
    Number(!tosAccepted) + Number(!privacyAccepted) + Number(!wellnessDisclaimerAcknowledged);

  /**
   * iOS has no trait that auto-announces an alert, and `accessibilityLiveRegion`
   * is Android-only — so the marked-up node below is silent on iOS without this.
   * Android consequently gets it twice; that is the accepted trade in this repo
   * (`OnboardingScreen.tsx:671-672` ships both patterns). The "Error: " prefix is
   * load-bearing on iOS, where the announcement carries no role context.
   */
  useEffect(() => {
    if (errorMessage) {
      AccessibilityInfo.announceForAccessibility(`Error: ${errorMessage}`);
    }
  }, [errorMessage]);

  /**
   * Names the optional preferences that are on RIGHT NOW, then states this
   * form's mechanical effect on them.
   *
   * The second sentence describes what THIS SUBMIT does — `renewConsent` takes
   * all five booleans non-optional and carries none forward
   * (`consentStore.ts:323`, `:1124`) — so an unticked box is written `false`.
   * That is deterministic, already-shipped behaviour with no open question
   * attached to it.
   *
   * 🚫 It must NOT describe what happens if the user does not re-consent at all.
   * The lapse window (its duration, its Art. 18 restriction-of-processing
   * characterisation) is open counsel work, and `consentStore.ts:522-527` bars
   * consent copy from characterising it.
   */
  const currentlyOnNotice = useMemo(() => {
    const effect =
      'Any box left unchecked below will be turned off for your account when you submit.';
    if (!currentPreferences) return effect;

    const on = [
      currentPreferences.analyticsEnabled ? CONSENT_DETAILS.analytics.title : null,
      currentPreferences.crashReportsEnabled ? CONSENT_DETAILS.crashReports.title : null,
      currentPreferences.cloudSyncEnabled ? CONSENT_DETAILS.cloudSync.title : null,
      currentPreferences.researchEnabled ? CONSENT_DETAILS.research.title : null,
    ].filter((title): title is string => title !== null);

    if (on.length === 0) {
      return (
        'You don\'t currently have any of these optional preferences on. ' +
        'Checking a box below will turn it on when you submit.'
      );
    }
    return `You currently have ${joinWithAnd(on)} on. ${effect}`;
  }, [currentPreferences]);

  const handleSubmit = useCallback(() => {
    if (!requiredConsentsTicked || isSubmitting) return;
    onSubmit({
      legalGate: {
        tosAccepted,
        privacyAccepted,
        wellnessDisclaimerAcknowledged,
        // One tick, two records.
        mentalHealthProcessingConsent,
      },
      preferences: {
        analyticsEnabled,
        crashReportsEnabled,
        cloudSyncEnabled,
        researchEnabled,
        mentalHealthProcessingConsent,
      },
    });
  }, [
    requiredConsentsTicked,
    isSubmitting,
    onSubmit,
    tosAccepted,
    privacyAccepted,
    wellnessDisclaimerAcknowledged,
    mentalHealthProcessingConsent,
    analyticsEnabled,
    crashReportsEnabled,
    cloudSyncEnabled,
    researchEnabled,
  ]);

  /**
   * Custom actions for the two checkboxes carrying an inline document link.
   *
   * `Pressable` defaults `accessible` to true (`Pressable.js:252`), which
   * collapses its subtree into ONE element on iOS — so an inline `<Text onPress>`
   * inside the label gets no a11y node of its own, and a double-tap fires the
   * checkbox instead of opening the document. That leaves a screen-reader user
   * unable to read what they are consenting to. Custom actions surface in
   * VoiceOver's Actions rotor and TalkBack's local context menu, which fixes it
   * without changing the visual design or the checkbox semantics.
   *
   * ⚠️ `onPress` must stay wired to the same handler as the action — exactly as
   * `CollapsibleCrisisButton.tsx:383-398` does. This comment used to justify that
   * with "declaring an `activate` action routes activation through
   * `onAccessibilityAction`", which is true on Android and FALSE on iOS;
   * corrected in DEBUG-430 after reading react-native 0.85.3:
   *
   *   iOS (Fabric): `accessibilityActivate` consults ONLY `onAccessibilityTap`
   *   and returns NO when unset, so UIKit synthesizes a touch and `onPress`
   *   runs. A declared `activate` is reachable only via the Actions rotor.
   *
   *   Android: `activate` maps to ACTION_CLICK and `performAccessibilityAction`
   *   returns true WITHOUT calling super, so `onPress` IS suppressed.
   *
   * Opposite paths, exactly one per platform, so no double-toggle — but both
   * require the shared callback. The requirement stands; only the reason was
   * wrong.
   *
   * `CombinedLegalGateScreen.tsx` had the same defect and now carries the same
   * shape — DEBUG-430 closed it (2026-08-14). Do not read this as a live defect.
   */
  const documentActions = (label: string) => [
    { name: 'activate', label: 'Toggle acceptance' },
    { name: 'openDocument', label },
  ];

  const onDocumentAction = (url: string, toggle: () => void) => (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'openDocument') {
      void Linking.openURL(url);
      return;
    }
    toggle();
  };

  return (
    <SafeAreaView style={styles.container} testID="reconsent-screen">
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header" accessibilityLevel={1}>
            Our privacy practices have changed
          </Text>
          <Text style={styles.subtitle}>
            Please review what changed and tell us again what you agree to.
          </Text>
        </View>

        {/* What changed. `delta.changes` already carries the generic summary when
            the stored version is unknown, so there is no branch here. */}
        <View style={styles.deltaSection} accessible={false} testID="reconsent-delta">
          <Text style={styles.sectionTitle} accessibilityRole="header" accessibilityLevel={2}>
            What changed
          </Text>
          {delta.changes.map((change) => (
            <Text key={change.version} style={styles.deltaText}>
              {change.summary}
            </Text>
          ))}
        </View>

        {/* ── GROUP 1 — document acceptances ──────────────────────────────────
            `accessible={false}` on the wrapper is NOT decorative (INFRA-181):
            `accessible={true}` on an ancestor collapses the whole subtree into a
            single iOS element and hides all four Pressables from VoiceOver and
            from Maestro. Pinned by the accessibility suite. */}
        <View style={styles.section} accessible={false} testID="reconsent-group-required">
          {/* FEAT-475 — "What you need to accept" was literally false once one of
              this group's four children became optional. */}
          <Text style={styles.sectionTitle} accessibilityRole="header" accessibilityLevel={2}>
            What you agree to
          </Text>
          <Text style={styles.sectionDescription}>
            Please review and accept each item separately.
          </Text>

          <Text style={styles.consentGroupHeading} accessibilityRole="header" accessibilityLevel={3}>
            Required to continue
          </Text>

          <Pressable
            style={[styles.checkbox, tosAccepted && styles.checkboxChecked]}
            onPress={() => setTosAccepted((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: tosAccepted }}
            accessibilityLabel="I agree to the Terms of Service, required"
            accessibilityHint="Required to continue"
            accessibilityActions={documentActions('Open Terms of Service')}
            onAccessibilityAction={onDocumentAction(TERMS_URL, () => setTosAccepted((v) => !v))}
          >
            {/* testID on the 24pt indicator, not the outer Pressable (INFRA-181):
                the Pressable's center falls in the text region and overlaps the
                inline document link. */}
            <View testID="reconsent-consent-tos" style={styles.checkboxIndicator}>
              {tosAccepted && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I agree to the{' '}
              <Text style={styles.checkboxLink} onPress={() => Linking.openURL(TERMS_URL)}>
                Terms of Service
              </Text>
              .
            </Text>
          </Pressable>

          <Pressable
            style={[styles.checkbox, privacyAccepted && styles.checkboxChecked, styles.checkboxStacked]}
            onPress={() => setPrivacyAccepted((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: privacyAccepted }}
            accessibilityLabel="I agree to the Privacy Policy, required"
            accessibilityHint="Required to continue"
            accessibilityActions={documentActions('Open Privacy Policy')}
            onAccessibilityAction={onDocumentAction(PRIVACY_URL, () => setPrivacyAccepted((v) => !v))}
          >
            <View testID="reconsent-consent-privacy" style={styles.checkboxIndicator}>
              {privacyAccepted && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I agree to the{' '}
              <Text style={styles.checkboxLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
                Privacy Policy
              </Text>
              .
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.checkbox,
              wellnessDisclaimerAcknowledged && styles.checkboxChecked,
              styles.checkboxStacked,
            ]}
            onPress={() => setWellnessDisclaimerAcknowledged((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: wellnessDisclaimerAcknowledged }}
            accessibilityLabel="I understand Being provides wellness support, not medical care, and in a crisis I will call 911 or 988, required"
            accessibilityHint="Required to continue"
          >
            <View testID="reconsent-consent-wellness" style={styles.checkboxIndicator}>
              {wellnessDisclaimerAcknowledged && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I understand Being provides wellness support, not medical care. In a crisis I will call
              911 (emergency) or 988 (mental health crisis).
            </Text>
          </Pressable>

          {/*
            FEAT-475 — the optional half of the split, carried on THREE independent
            channels because no one of them is sufficient:
              1. this visible subheading, with `accessibilityRole="header"` so it is
                 reachable by the headings rotor;
              2. a `, optional` suffix on the accessibilityLabel — the only channel
                 the user cannot switch off;
              3. an accessibilityHint leading with "Optional".
            Hint alone would not do: iOS VoiceOver → Verbosity → Speak Hints disables
            hint speech outright, and TalkBack truncates it.

            The heading text is NOT bare "Optional" (which is what the legal gate
            uses) because this screen already ships an "Optional data sharing"
            heading below. Two rotor entries where one is a prefix of the other is a
            navigation ambiguity, and `accessibilityLevel` cannot resolve it — RN
            maps level to AccessibilityNodeInfo on Android only, and iOS has no
            heading-level API at all. Distinct text is the only channel that works
            on both platforms.
          */}
          <Text style={styles.consentGroupHeading} accessibilityRole="header" accessibilityLevel={3}>
            Optional — wellness data processing
          </Text>

          {/* GDPR Art. 9(2)(a). Collected ONCE, here, and written to both records. */}
          <Pressable
            style={[
              styles.checkbox,
              mentalHealthProcessingConsent && styles.checkboxChecked,
              styles.checkboxStacked,
            ]}
            onPress={() => setMentalHealthProcessingConsent((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: mentalHealthProcessingConsent }}
            accessibilityLabel="I explicitly consent to Being processing my personal wellness data including mood check-ins, anxiety and depression self-screenings, and journal entries, to provide wellness support features, optional"
            accessibilityHint="Optional — you can continue without accepting this"
          >
            <View testID="reconsent-consent-mh-processing" style={styles.checkboxIndicator}>
              {mentalHealthProcessingConsent && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I explicitly consent to Being processing my personal wellness data — including mood
              check-ins, anxiety and depression self-screenings, and journal entries — to provide
              wellness support features.
            </Text>
          </Pressable>

          {/*
            Outside the Pressable on purpose: `Pressable` defaults `accessible` to
            true, which collapses its subtree into one element on iOS — a note
            placed inside would be swallowed into the checkbox's accessible name.

            Copy constraints (compliance, ported from FEAT-470): it may state that
            the item is optional, that submission is unaffected, and where the answer
            can be changed — Art. 7(3) signposting. It must NOT characterise what
            declining leads to, and must NOT promise that processing stops, because
            nothing enforces this consent yet (`canPerformOperation('mental_health_processing')`
            has no production callers; enforcement is FEAT-318). Promising an effect
            the code does not deliver would be the worse defect.
          */}
          <Text style={styles.optionalConsentNote}>
            This one is optional. You can submit without it, and you can change your answer
            at any time in Settings → Privacy &amp; Data.
          </Text>
        </View>

        {/* ── GROUP 2 — optional preferences ─────────────────────────────────── */}
        <View style={styles.section} accessible={false} testID="reconsent-group-optional">
          <Text style={styles.sectionTitle} accessibilityRole="header" accessibilityLevel={2}>
            Optional data sharing
          </Text>
          <Text style={styles.noticeText} testID="reconsent-current-preferences-notice">
            {currentlyOnNotice}
          </Text>

          <ConsentToggleCard
            title={CONSENT_DETAILS.analytics.title}
            description={CONSENT_DETAILS.analytics.description}
            details={CONSENT_DETAILS.analytics.details}
            value={analyticsEnabled}
            onValueChange={setAnalyticsEnabled}
            testID="reconsent-analytics"
          />
          <ConsentToggleCard
            title={CONSENT_DETAILS.crashReports.title}
            description={CONSENT_DETAILS.crashReports.description}
            details={CONSENT_DETAILS.crashReports.details}
            value={crashReportsEnabled}
            onValueChange={setCrashReportsEnabled}
            testID="reconsent-crash-reports"
          />
          <ConsentToggleCard
            title={CONSENT_DETAILS.cloudSync.title}
            description={CONSENT_DETAILS.cloudSync.description}
            details={CONSENT_DETAILS.cloudSync.details}
            value={cloudSyncEnabled}
            onValueChange={setCloudSyncEnabled}
            testID="reconsent-cloud-sync"
          />
          <ConsentToggleCard
            title={CONSENT_DETAILS.research.title}
            description={CONSENT_DETAILS.research.description}
            details={CONSENT_DETAILS.research.details}
            value={researchEnabled}
            onValueChange={setResearchEnabled}
            testID="reconsent-research"
          />
        </View>

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text
              style={styles.errorText}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              testID="reconsent-error"
            >
              {errorMessage}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Pinned OUTSIDE the ScrollView, as a flex sibling — the DEBUG-390 shape.
          Decline must be reachable without scrolling past eight controls, and as
          a sibling of a `flex: 1` ScrollView this holds at every scroll offset
          and every Dynamic Type setting with no absolute positioning to keep in
          sync. See CRISIS_FAB_CLEARANCE for why it is inset on the right. */}
      <View style={styles.actionFooter}>
        <Pressable
          style={[styles.submitButton, (!requiredConsentsTicked || isSubmitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!requiredConsentsTicked || isSubmitting}
          testID="reconsent-submit"
          accessibilityRole="button"
          accessibilityLabel="Accept and continue"
          // Dynamic on purpose. A static "accept all four to continue" is also
          // announced when the button is ENABLED, which trains users to ignore
          // hints. The enabled branch restates this form's effect at the moment
          // of action, where FTC §5 "clear and conspicuous" wants it.
          accessibilityHint={
            requiredConsentsTicked
              ? 'Records your updated consent. Optional preferences you left unchecked will be turned off.'
              : `Disabled until you accept all three required items. ${requiredRemaining} remaining.`
          }
          accessibilityState={{ disabled: !requiredConsentsTicked || isSubmitting, busy: isSubmitting }}
        >
          <Text
            style={[
              styles.submitButtonText,
              (!requiredConsentsTicked || isSubmitting) && styles.submitButtonTextDisabled,
            ]}
          >
            {isSubmitting ? 'Saving...' : 'Accept and continue'}
          </Text>
        </Pressable>

        {/* Always visible, never a swipe-dismiss. Presentational only — the store
            write and any navigation belong to the caller. */}
        <Pressable
          style={styles.declineButton}
          onPress={onDecline}
          disabled={isSubmitting}
          testID="reconsent-decline"
          accessibilityRole="button"
          accessibilityLabel="Decline"
          accessibilityHint="Records that you declined. You can decide again later."
          accessibilityState={{ disabled: isSubmitting }}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[24],
    paddingBottom: spacing[32],
  },
  header: {
    marginBottom: spacing[24],
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: semantic.text.primary,
    marginBottom: spacing[8],
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: spacing[24],
  },
  deltaSection: {
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginBottom: spacing[24],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
  },
  deltaText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing[24],
  },
  /** FEAT-475 — the visible half of the required/optional split. */
  consentGroupHeading: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.secondary,
    marginBottom: spacing[8],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  /** The refusal explanation. Tokens only — same token as the group heading. */
  optionalConsentNote: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    marginTop: spacing[8],
  },
  sectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[8],
  },
  sectionDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    marginBottom: spacing[16],
  },
  noticeText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[16],
  },
  checkbox: {
    flexDirection: 'row',
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.large,
    padding: spacing[24],
    borderWidth: 2,
    borderColor: colorSystem.gray[200],
    minHeight: 56,
  },
  checkboxStacked: {
    marginTop: spacing[16],
  },
  checkboxChecked: {
    borderColor: colorSystem.base.midnightBlue,
    backgroundColor: '#F0F4FF',
  },
  checkboxLink: {
    color: colorSystem.base.midnightBlue,
    textDecorationLine: 'underline',
    fontWeight: typography.fontWeight.medium,
  },
  checkboxIndicator: {
    width: spacing[24],
    height: spacing[24],
    borderRadius: borderRadius.small,
    borderWidth: 2,
    // gray[600] (#757575), NOT gray[400] as CombinedLegalGateScreen.tsx:552 uses.
    // gray[400] on this card background is 1.463:1 — a 2px border that is the ONLY
    // visual signal an unchecked box exists, failing WCAG 1.4.11 (3:1) by half.
    // Every control on this screen mounts unchecked, so that is the default state.
    borderColor: colorSystem.gray[600],
    marginRight: spacing[16],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorSystem.base.white,
  },
  checkboxCheck: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.midnightBlue,
  },
  checkboxText: {
    flex: 1,
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: colorSystem.status.errorBackground,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  errorText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    // status.critical on status.errorBackground = 7.597:1. status.error (#DC2626)
    // on #FEE2E2, which CombinedLegalGateScreen.tsx:612-621 uses, is 3.953:1 and
    // fails 1.4.3 at this size and weight.
    color: colorSystem.status.critical,
    textAlign: 'center',
  },
  actionFooter: {
    paddingLeft: spacing[24],
    paddingRight: CRISIS_FAB_CLEARANCE,
    paddingTop: spacing[16],
    paddingBottom: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
    backgroundColor: colorSystem.base.white,
  },
  submitButton: {
    backgroundColor: colorSystem.base.midnightBlue,
    paddingVertical: spacing[16],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGETS.large,
  },
  submitButtonDisabled: {
    // gray[300] rather than gray[400]: white-on-gray[400] is 1.527:1. WCAG exempts
    // inactive controls, but on this screen disabled is the DEFAULT state — all
    // eight controls mount unchecked — so an illegible label is what every user
    // sees first. gray[300] with text.secondary is 8.202:1.
    backgroundColor: colorSystem.gray[300],
  },
  submitButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  submitButtonTextDisabled: {
    color: semantic.text.secondary,
  },
  declineButton: {
    marginTop: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGETS.large,
  },
  declineButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.secondary,
    textDecorationLine: 'underline',
  },
});

export default ReConsentScreen;
