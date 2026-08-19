/**
 * COMBINED LEGAL GATE SCREEN
 * Consolidates age verification + four separate legal consents into one screen
 *
 * COMPLIANCE:
 * - Age verification BEFORE any data collection (18+ per ToS §4 / Privacy §8)
 * - Four separated checkboxes:
 *     1. Terms of Service acceptance
 *     2. Privacy Policy acceptance
 *     3. Wellness Disclaimer acknowledgment (not medical care; crisis = 911/988)
 *     4. GDPR Art. 9(2)(a) explicit consent for mental-health data processing
 * - Crisis resources visible to ALL users (not just under-18)
 *
 * UX OPTIMIZATION:
 * - Single legal gate reduces cognitive load
 * - Crisis resources always accessible
 * - Progressive disclosure ("You'll choose what to share after experiencing the app")
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - 44px+ touch targets
 * - Screen reader support
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  AccessibilityInfo,
  type AccessibilityActionEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useConsentStore, recordLegalGateConsents } from '@/core/stores/consentStore';
import { logSecurity } from '@/core/services/logging';
// Static import — the crisis path's no-lazy-import rule (CLAUDE.md).
import { openCrisisUrl } from '@/features/crisis/utils/openCrisisUrl';
import {
  semantic,
  colorSystem,
  spacing,
  borderRadius,
  typography,
  TOUCH_TARGETS,
} from '@/core/theme';

interface CombinedLegalGateScreenProps {
  /** Called when user passes legal gate (age verified + four consents accepted) */
  onComplete: () => void;
  /** Called when user is under 18 */
  onUnderAge: () => void;
}

/**
 * The two documents this gate asks the user to accept (DEBUG-430).
 *
 * Hoisted to constants because each URL now has TWO call sites — the inline
 * `<Text onPress>` and the rotor action — and two hard-coded literals is exactly
 * the drift a second call site invites. The rotor action must open the same
 * document the visible link does.
 */
const TERMS_URL = 'https://being.fyi/terms';
const PRIVACY_URL = 'https://being.fyi/privacy';

/**
 * Custom actions for the two checkboxes carrying an inline document link
 * (DEBUG-430, porting FEAT-376's shipped ReConsentScreen shape).
 *
 * THE DEFECT. `Pressable` defaults `accessible` to true (`Pressable.js:252`
 * reads `accessible: accessible !== false`), which collapses its subtree into
 * ONE accessibility element on iOS. The inline `<Text onPress>` in the label
 * therefore gets no node of its own: VoiceOver cannot focus it, and a
 * double-tap anywhere in the row fires the checkbox instead of opening the
 * document. Since `styles.linkRow` was never rendered and the other `linkText`
 * uses are on the under-age branch, these inline links were the ONLY route to
 * the Terms and the Privacy Policy on this screen — so a screen-reader user was
 * asked to give sensitive-data consent to documents the app gave them no way to
 * read. Custom actions surface in VoiceOver's Actions rotor and TalkBack's
 * local context menu, which fixes it while preserving both the checkbox
 * semantics and the inline-link visual design.
 *
 * ⚠️ WHY `onPress` MUST STAY WIRED TO THE SAME CALLBACK — and note this differs
 * per platform, which the sibling screen's comment gets half wrong. Read from
 * react-native 0.85.3:
 *
 *   iOS (Fabric, mandatory on SDK 56): `RCTViewComponentView.mm`'s
 *   `accessibilityActivate` consults ONLY `onAccessibilityTap` and returns NO
 *   when it is unset, so UIKit synthesizes a touch and `onPress` runs. A
 *   declared `activate` is reachable here ONLY via
 *   `didActivateAccessibilityCustomAction` — i.e. it is an extra rotor entry,
 *   NOT an interception.
 *
 *   Android: `ReactAccessibilityDelegate.kt` maps `activate` to
 *   `ACTION_CLICK.id`, and `performAccessibilityAction` dispatches to JS then
 *   returns true WITHOUT calling super — so `performClick()`/`onPress` IS
 *   suppressed and the JS handler is the only thing that toggles.
 *
 * Net: the two platforms take opposite paths, exactly one fires on each, so
 * there is no double-toggle — but BOTH require `onPress` and the action handler
 * to resolve to the same callback. `CollapsibleCrisisButton.tsx` is the other
 * in-repo precedent.
 *
 * The toggle is the DEFAULT FALLTHROUGH rather than a `case 'activate'`, so a
 * future third action still toggles instead of silently no-opping. On Android
 * that fallthrough is the only thing standing between a TalkBack user and an
 * untickable consent gate.
 */
const documentActions = (label: string) => [
  { name: 'activate', label: 'Toggle acceptance' },
  { name: 'openDocument', label },
];

const onDocumentAction =
  (url: string, toggle: () => void) =>
  (e: AccessibilityActionEvent): void => {
    if (e.nativeEvent.actionName === 'openDocument') {
      void Linking.openURL(url);
      return;
    }
    toggle();
  };

const CombinedLegalGateScreen: React.FC<CombinedLegalGateScreenProps> = ({
  onComplete,
  onUnderAge,
}) => {
  const { verifyAge } = useConsentStore();

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [wellnessDisclaimerAcknowledged, setWellnessDisclaimerAcknowledged] = useState(false);
  const [mentalHealthProcessingConsented, setMentalHealthProcessingConsented] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * DEBUG-430 — hoisted so `onPress` and `onAccessibilityAction` share ONE
   * reference.
   *
   * This is the single place the port of FEAT-376 is NOT a copy. ReConsentScreen's
   * onPress is a bare toggle, but this screen's also does `setError(null)`. Wiring
   * the action handler to a bare flip would let screen-reader activation diverge
   * from touch — the inline error banner would stay up after a rotor tick and clear
   * after a tap. Functional updaters because these are memoised with no deps.
   */
  const toggleTos = useCallback(() => {
    setTosAccepted((v) => !v);
    setError(null);
  }, []);
  const togglePrivacy = useCallback(() => {
    setPrivacyAccepted((v) => !v);
    setError(null);
  }, []);
  const [showUnderAge, setShowUnderAge] = useState(false);

  /**
   * FEAT-470 — the Art. 9(2)(a) tick is deliberately NOT a conjunct here.
   *
   * ToS, the Privacy Policy and the wellness disclaimer are contract terms and a
   * scope acknowledgment — not GDPR Art. 4(11) consent — so conditioning entry on
   * them raises no Art. 7(4) question. `mentalHealthProcessingConsent` is the one
   * true special-category consent on this screen, and bundling it into a mandatory
   * set is what made it not freely given. It is still CAPTURED (and recorded either
   * way, see `handleContinue`); it just no longer gates entry.
   *
   * Renamed from `allConsentsTicked`: "all" is now false, and every reader of the
   * button's `disabled`/`accessibilityState` needs to know this is the required
   * subset. All three call sites move with the definition — a stale one would leave
   * a dead-button trap that is functionally still mandatory.
   */
  const requiredConsentsTicked =
    tosAccepted && privacyAccepted && wellnessDisclaimerAcknowledged;

  const requiredRemaining =
    Number(!tosAccepted) + Number(!privacyAccepted) + Number(!wellnessDisclaimerAcknowledged);

  // Generate years for picker (100 years back from current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const calculateAge = (birthYear: number): number => {
    return currentYear - birthYear;
  };

  const handleContinue = useCallback(async () => {
    // Validate year selected
    if (!selectedYear) {
      setError('Please select your birth year');
      AccessibilityInfo.announceForAccessibility('Error: Please select your birth year');
      return;
    }

    // Validate the three required acceptances. The Art. 9 tick is optional (FEAT-470)
    // and is recorded at whatever value it holds, so it is never validated here.
    //
    // NOTE: this branch is unreachable defensive code, and deliberately stays that
    // way. Continue is `disabled` on the same `!requiredConsentsTicked` condition, so
    // `handleContinue` cannot be entered with a required item missing. Kept because
    // the guard is cheap and the two conditions could drift apart in a future edit;
    // the strings are maintained in step regardless so a reader is never shown a
    // count that contradicts the screen.
    if (!requiredConsentsTicked) {
      setError('Please accept all three required items to continue');
      AccessibilityInfo.announceForAccessibility(
        'Error: Please accept all three required items to continue',
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { eligible, age } = await verifyAge(selectedYear);

      if (eligible) {
        // Persist the four legal-gate consents for OnboardingScreen to merge
        // into the ConsentRecord at grant time (GDPR Art. 7(1) record requirement)
        await recordLegalGateConsents({
          tosAccepted,
          privacyAccepted,
          wellnessDisclaimerAcknowledged,
          mentalHealthProcessingConsent: mentalHealthProcessingConsented,
        });
        AccessibilityInfo.announceForAccessibility('Verification complete. Proceeding to app.');
        onComplete();
      } else {
        setShowUnderAge(true);
        AccessibilityInfo.announceForAccessibility(
          `We're sorry. Being is available for ages 18 and older. You appear to be ${age} years old. Crisis resources are available if you need support.`
        );
        onUnderAge();
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      AccessibilityInfo.announceForAccessibility('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedYear,
    requiredConsentsTicked,
    tosAccepted,
    privacyAccepted,
    wellnessDisclaimerAcknowledged,
    mentalHealthProcessingConsented,
    verifyAge,
    onComplete,
    onUnderAge,
  ]);

  // Guarded crisis dials (DEBUG-314): `openCrisisUrl` supplies the canOpenURL
  // check, the manual-dial fallback Alert and the CRISIS audit log. A bare
  // `Linking.openURL` here failed silently whenever the scheme could not be
  // opened — and this screen is reachable before onboarding completes, so it is
  // a first-run user's only crisis affordance.
  const handleCall988 = () => {
    void openCrisisUrl('tel:988', { manualLabel: '988' });
  };

  const handleTextCrisis = () => {
    // Explicit copy: the default "manually dial 741741" is wrong for a text
    // line, and this one carries the HELLO keyword Crisis Text Line expects.
    void openCrisisUrl('sms:741741?body=HELLO', {
      fallbackTitle: 'Unable to Text',
      fallbackMessage: 'Please text HELLO to 741741 for support.',
    });
  };

  const handleReEnterAge = useCallback(() => {
    // Audit trail: re-entry from the under-age screen. Compliance per DEBUG-150
    // — captures "gate was invoked and re-entered, not bypassed invisibly."
    logSecurity('age_re_entry', 'low', {
      component: 'CombinedLegalGateScreen',
      action: 'under_age_back',
      result: 'success',
    });
    setShowUnderAge(false);
    setSelectedYear(null);
    setError(null);
    AccessibilityInfo.announceForAccessibility('Returned to birth year selection.');
  }, []);

  // Under-age screen with crisis resources
  if (showUnderAge) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Being is for ages 18+</Text>
            <Text style={styles.subtitle}>
              We hope to support you when you're older.{'\n'}
              If you're going through a difficult time right now, the resources below are available to you 24/7.
            </Text>
          </View>

          <View style={styles.crisisSection}>
            <Text style={styles.crisisSectionTitle}>Need Support Now?</Text>
            <Text style={styles.crisisDescription}>
              If you're going through a difficult time, these resources are here for you:
            </Text>

            <Pressable
              style={styles.crisisButton}
              onPress={handleCall988}
              testID="legal-gate-underage-crisis-988"
              accessibilityRole="button"
              accessibilityLabel="Call 988 Suicide and Crisis Lifeline"
              accessibilityHint="Opens phone dialer to call 988"
            >
              <Text style={styles.crisisButtonText}>Call 988</Text>
              <Text style={styles.crisisButtonSubtext}>Suicide & Crisis Lifeline (24/7)</Text>
            </Pressable>

            <Pressable
              style={styles.crisisButtonSecondary}
              onPress={handleTextCrisis}
              testID="legal-gate-underage-crisis-text"
              accessibilityRole="button"
              accessibilityLabel="Text HOME to 741741"
              accessibilityHint="Opens text message to Crisis Text Line"
            >
              <Text style={styles.crisisButtonSecondaryText}>Text HOME to 741741</Text>
              <Text style={styles.crisisButtonSubtextSecondary}>Crisis Text Line (24/7)</Text>
            </Pressable>
          </View>

          <View style={styles.resourcesSection}>
            <Text style={styles.resourcesTitle}>More Resources</Text>
            <Pressable
              onPress={() => Linking.openURL('https://www.childmind.org')}
              accessibilityRole="link"
              accessibilityLabel="Child Mind Institute"
              accessibilityHint="Opens external website in browser"
            >
              <Text style={styles.linkText}>Child Mind Institute</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL('https://teenmentalhealth.org')}
              accessibilityRole="link"
              accessibilityLabel="Teen Mental Health"
              accessibilityHint="Opens external website in browser"
            >
              <Text style={styles.linkText}>Teen Mental Health</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.reEnterAgeButton}
            onPress={handleReEnterAge}
            accessibilityRole="button"
            accessibilityLabel="Re-enter birth year"
            accessibilityHint="Returns to the birth year selection screen"
          >
            <Text style={styles.reEnterAgeButtonText}>Re-enter birth year</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Being</Text>
          <Text style={styles.subtitle}>
            Before we begin, we need a few quick confirmations.
          </Text>
        </View>

        {/* Age Verification Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Age Verification</Text>
          <Text style={styles.sectionDescription}>
            What year were you born?
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              testID="legal-dob-picker"
              selectedValue={selectedYear}
              onValueChange={(value: number | null) => {
                setSelectedYear(value);
                setError(null);
              }}
              style={styles.picker}
              accessibilityLabel="Select your birth year"
            >
              <Picker.Item label="Select year..." value={null} color={colorSystem.gray[400]} />
              {years.map((year) => (
                <Picker.Item
                  key={year}
                  label={year.toString()}
                  value={year}
                  color={colorSystem.base.black}
                />
              ))}
            </Picker>
          </View>
          <Text style={styles.helperText}>
            We use your age only to confirm eligibility. Being is for adults 18 and older.
          </Text>
        </View>

        {/*
          Legal Agreement Section — THREE required acceptances, then ONE optional
          Art. 9 consent under its own heading (FEAT-470).

          The required/optional split is carried on three independent channels,
          because no one of them is sufficient:
            1. visible subsection headings, for sighted users;
            2. an `accessibilityLabel` suffix, which the user cannot switch off;
            3. an `accessibilityHint`, which they can.
          Hint alone would not do — iOS lets users disable hint speech and TalkBack
          truncates it, and whether a box is optional is load-bearing by definition.
          The headings also carry `accessibilityRole="header"`, so the split is
          navigable by the headings rotor, which no per-control label can match.
        */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">2. Your Consent</Text>
          <Text style={styles.sectionDescription}>
            Please review and accept each item separately:
          </Text>

          {/*
            testID is for the Maestro gate, and it is load-bearing there rather than
            decorative: these headings are inert `Text` nodes, so a tap on one falls
            through to the ScrollView and ABSORBS the touch that DEBUG-477's
            swallowed-tap defect would otherwise eat after a mid-content scroll. The
            usual absorber — an element outside the ScrollView — is unusable on this
            screen, because outside this ScrollView is the pinned 988 footer.
          */}
          <Text
            style={styles.consentGroupHeading}
            accessibilityRole="header"
            testID="legal-consent-group-required"
          >
            Required to continue
          </Text>

          {/* 1. Terms of Service */}
          <Pressable
            style={[styles.checkbox, tosAccepted && styles.checkboxChecked]}
            onPress={toggleTos}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: tosAccepted }}
            accessibilityLabel="I agree to the Terms of Service, required"
            accessibilityHint="Required to continue"
            accessibilityActions={documentActions('Open Terms of Service')}
            onAccessibilityAction={onDocumentAction(TERMS_URL, toggleTos)}
          >
            {/* testID on the 24px indicator (INFRA-181): outer Pressable center
                falls in the text region and overlaps the inline TOS link. */}
            <View testID="legal-consent-tos" style={styles.checkboxIndicator}>
              {tosAccepted && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I agree to the <Text style={styles.checkboxLink} onPress={() => Linking.openURL(TERMS_URL)}>Terms of Service</Text>.
            </Text>
          </Pressable>

          {/* 2. Privacy Policy */}
          <Pressable
            style={[styles.checkbox, privacyAccepted && styles.checkboxChecked, styles.checkboxStacked]}
            onPress={togglePrivacy}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: privacyAccepted }}
            accessibilityLabel="I agree to the Privacy Policy, required"
            accessibilityHint="Required to continue"
            accessibilityActions={documentActions('Open Privacy Policy')}
            onAccessibilityAction={onDocumentAction(PRIVACY_URL, togglePrivacy)}
          >
            <View testID="legal-consent-privacy" style={styles.checkboxIndicator}>
              {privacyAccepted && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I agree to the <Text style={styles.checkboxLink} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>.
            </Text>
          </Pressable>

          {/* 3. Wellness Disclaimer */}
          <Pressable
            style={[styles.checkbox, wellnessDisclaimerAcknowledged && styles.checkboxChecked, styles.checkboxStacked]}
            onPress={() => {
              setWellnessDisclaimerAcknowledged(!wellnessDisclaimerAcknowledged);
              setError(null);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: wellnessDisclaimerAcknowledged }}
            accessibilityLabel="I understand Being provides wellness support, not medical care, and in a crisis I will call 911 or 988, required"
            accessibilityHint="Required to continue"
          >
            <View testID="legal-consent-wellness" style={styles.checkboxIndicator}>
              {wellnessDisclaimerAcknowledged && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I understand Being provides wellness support, not medical care. In a crisis I will call 911 (emergency) or 988 (mental health crisis).
            </Text>
          </Pressable>

          <Text
            style={styles.consentGroupHeading}
            accessibilityRole="header"
            testID="legal-consent-group-optional"
          >
            Optional
          </Text>

          {/*
            4. GDPR Art. 9(2)(a) explicit consent for wellness-data processing.
            OPTIONAL since FEAT-470 — see `requiredConsentsTicked`. The testID is
            load-bearing beyond this screen: `_legal-and-onboarding.yaml` taps
            `legal-consent-mh-processing` unconditionally, and that helper is
            upstream of 7 of the 8 sim-runnable safety flows. Never rename it.
          */}
          <Pressable
            style={[styles.checkbox, mentalHealthProcessingConsented && styles.checkboxChecked, styles.checkboxStacked]}
            onPress={() => {
              setMentalHealthProcessingConsented(!mentalHealthProcessingConsented);
              setError(null);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: mentalHealthProcessingConsented }}
            accessibilityLabel="I explicitly consent to Being processing my personal wellness data including mood check-ins, anxiety and depression self-screenings, and journal entries, to provide wellness support features, optional"
            accessibilityHint="Optional — you can continue without accepting this"
          >
            <View testID="legal-consent-mh-processing" style={styles.checkboxIndicator}>
              {mentalHealthProcessingConsented && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I explicitly consent to Being processing my personal wellness data — including mood check-ins, anxiety and depression self-screenings, and journal entries — to provide wellness support features.
            </Text>
          </Pressable>

          {/*
            The refusal explanation. Deliberately OUTSIDE the Pressable above:
            `Pressable` defaults `accessible={true}`, which collapses its whole
            subtree into one iOS element, so copy placed inside would be invisible
            to VoiceOver unless transcribed into that hand-maintained
            `accessibilityLabel`. As its own node it reads in traversal order with
            no label to keep in sync.

            Also deliberately INSIDE the ScrollView. The 988 footer below earns
            LegalGate's place in RootCrisisButton.SUPPRESSED_ROUTES by being
            reachable without scrolling, which it gets from being a flex sibling of
            this `flex: 1` ScrollView. Copy added as a sibling OUT here would
            compete for the same fixed vertical budget and clip the footer at large
            Dynamic Type; copy in here only lengthens the scroll.

            Copy constraints (compliance, FEAT-470): it may state that the item is
            optional, that entry is unaffected, and where the answer can be changed
            — Art. 7(3) signposting. It must NOT characterise what declining leads
            to, and must NOT promise that processing stops, because nothing enforces
            this consent yet (`canPerformOperation('mental_health_processing')` has
            no callers; enforcement is FEAT-318). Promising an effect the code does
            not deliver would be the worse defect.
          */}
          <Text style={styles.optionalConsentNote}>
            This one is optional. You can continue without it, and you can change your
            answer at any time in Settings → Privacy &amp; Data.
          </Text>
        </View>

        {/* Essential Services Info */}
        <View style={styles.essentialSection}>
          <Text style={styles.essentialTitle}>Essential Services (always on)</Text>
          <Text style={styles.essentialItem}>• App functionality</Text>
          <Text style={styles.essentialItem}>• Crisis resources (988)</Text>
          <Text style={styles.essentialItem}>• Local data storage</Text>
          <Text style={styles.essentialNote}>
            You'll choose what else to share after experiencing the app.
          </Text>
        </View>

        {/* Error Display */}
        {/*
          `accessibilityRole="alert"` + `accessibilityLiveRegion` are the Android
          half. `announceForAccessibility` at the setError sites covers iOS, which
          has no trait that auto-announces an alert; a live region alone is silent
          there. Without these props Android users got nothing from this banner.
          The resulting iOS double-announce is the accepted trade in this repo —
          same posture as ReConsentScreen.tsx:463-473.
        */}
        {error && (
          <View style={styles.errorContainer}>
            <Text
              style={styles.errorText}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              {error}
            </Text>
          </View>
        )}

        {/* Continue Button */}
        <Pressable
          style={[
            styles.continueButton,
            (!selectedYear || !requiredConsentsTicked || isLoading) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedYear || !requiredConsentsTicked || isLoading}
          testID="legal-gate-continue"
          accessibilityRole="button"
          accessibilityLabel="Continue"
          /*
            Dynamic on purpose, ported from ReConsentScreen.tsx:490-497. A disabled
            button with no hint tells a screen-reader user nothing about why. The
            count covers the THREE required items only — the Art. 9 tick can never
            be what is blocking, and naming it here would re-imply it is mandatory.
          */
          accessibilityHint={
            !selectedYear && requiredConsentsTicked
              ? 'Disabled until you select your birth year.'
              : requiredConsentsTicked
                ? undefined
                : `Disabled until you accept all three required items. ${requiredRemaining} remaining.`
          }
          accessibilityState={{ disabled: !selectedYear || !requiredConsentsTicked || isLoading }}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? 'Verifying...' : 'Continue'}
          </Text>
        </Pressable>

      </ScrollView>

      {/*
        DEBUG-390 — pinned OUTSIDE the ScrollView, deliberately.
        This footer used to be the ScrollView's last child, which put the 988 button at
        95.3% of a 1433pt scroll (642pt of scrolling on iPhone 15, 754pt on SE 3). That
        was survivable until DEBUG-372 made LegalGate the route a dismissed cold-start
        `being://crisis` deep link LANDS on — at which point the app traded a persistent
        1-tap 988 for a scroll-then-tap one.

        `LegalGate` remains in RootCrisisButton.SUPPRESSED_ROUTES. The suppression is
        re-earned here rather than withdrawn: it is earned by an affordance reachable
        WITHOUT SCROLLING, never by one that merely exists. As a flex sibling of a
        `flex: 1` ScrollView this is on screen at every scroll offset and every Dynamic
        Type setting, with no absolute positioning to keep in sync.

        Position is pinned by __tests__/safety/crisis-zero-988-windows.test.tsx and by
        this screen's accessibility suite — re-nesting it inside the ScrollView fails CI.
        Do NOT force its VoiceOver order with accessibilityViewIsModal: that traps
        VoiceOver here and makes the DOB picker and all four consents unreachable.
      */}
      <View style={styles.crisisFooter}>
        <Text style={styles.crisisFooterTitle}>Need support now?</Text>
        <View style={styles.crisisFooterButtons}>
          <Pressable
            style={styles.crisisFooterButton}
            onPress={handleCall988}
            testID="legal-gate-crisis-988"
            accessibilityRole="button"
            accessibilityLabel="Call 988"
          >
            <Text style={styles.crisisFooterButtonText}>988 Lifeline</Text>
          </Pressable>
          <Pressable
            style={styles.crisisFooterButton}
            onPress={handleTextCrisis}
            testID="legal-gate-crisis-text"
            accessibilityRole="button"
            accessibilityLabel="Text Crisis Line"
          >
            <Text style={styles.crisisFooterButtonText}>Text 741741</Text>
          </Pressable>
        </View>
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
    alignItems: 'center',
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    textAlign: 'center',
    lineHeight: spacing[24],
  },
  section: {
    marginBottom: spacing[24],
  },
  sectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  sectionDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    marginBottom: spacing[16],
  },
  /** FEAT-470 — the visible half of the required/optional split. */
  consentGroupHeading: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.secondary,
    marginBottom: spacing[8],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  /**
   * The refusal explanation. Tokens only — this screen already carries three
   * hardcoded hexes in violation of the design-system rule and must not gain a
   * fourth; `semantic.text.secondary` is the same token the group heading uses.
   */
  optionalConsentNote: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    marginTop: spacing[8],
  },
  pickerContainer: {
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    overflow: 'hidden',
  },
  picker: {
    height: 150,
  },
  helperText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.muted,
    marginTop: spacing[8],
    fontStyle: 'italic',
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
    borderColor: colorSystem.gray[400],
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
  /*
   * `linkRow` was removed in DEBUG-430. It was declared here and rendered
   * nowhere — evidence of an original intent to put the two documents in a
   * separate centred row below the checkbox group.
   *
   * That shape was the REJECTED alternative to the rotor actions above, and the
   * reason is recorded here so the deletion does not erase it: it would have
   * made the links plainly focusable, but it changes the visual design (which
   * the work item's AC explicitly holds fixed), it adds two focusable elements
   * ahead of the crisis footer on the one screen where RootCrisisButton is
   * suppressed, and a single centred row severs each link from the checkbox it
   * belongs to. `linkText` is NOT removed — it is live on the under-age branch.
   */
  linkText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.midnightBlue,
    textDecorationLine: 'underline',
  },
  essentialSection: {
    backgroundColor: '#FAFAFA',
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginBottom: spacing[24],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
  },
  essentialTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.muted,
    marginBottom: spacing[8],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  essentialItem: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: spacing[24],
  },
  essentialNote: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.muted,
    marginTop: spacing[16],
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  errorText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.status.error,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: colorSystem.base.midnightBlue,
    paddingVertical: spacing[16],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    minHeight: 56,
    marginBottom: spacing[24],
  },
  continueButtonDisabled: {
    backgroundColor: colorSystem.gray[400],
  },
  continueButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  crisisFooter: {
    alignItems: 'center',
    // DEBUG-390: horizontal + bottom padding are now this block's own responsibility.
    // It used to inherit them from `scrollContent`; pinned outside the ScrollView it
    // would otherwise sit flush against the screen edges and the home indicator.
    paddingHorizontal: spacing[24],
    paddingTop: spacing[16],
    paddingBottom: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
    backgroundColor: colorSystem.base.white,
  },
  crisisFooterTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.muted,
    marginBottom: spacing[8],
  },
  crisisFooterButtons: {
    flexDirection: 'row',
    gap: spacing[16],
    // DEBUG-390: without flexWrap the row has a fixed intrinsic width (RN defaults
    // flexShrink to 0) that exceeds the content column above font multiplier ~1.351
    // at 375pt — i.e. at xxxLarge, the largest NON-accessibility Dynamic Type size,
    // reachable from ordinary iOS Settings. Combined with alignItems:'center' on the
    // parent it overflowed both edges and got clipped, destroying both crisis
    // controls. Wrap, never cap the labels with maxFontSizeMultiplier: capping text
    // growth on the crisis affordance specifically inverts the priority.
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  crisisFooterButton: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.status.critical,
    // DEBUG-390: was ~34.7pt tall (8+8 padding + 1+1 border + ~16.7pt of bodySmall),
    // which cleared WCAG 2.2 AA 2.5.8 (24) but failed 2.5.5 AAA / iOS HIG (44) and
    // this repo's own TOUCH_TARGETS.large, whose docs name "Crisis buttons" as its
    // application. The sibling under-age controls already ship at 72.
    minHeight: TOUCH_TARGETS.large,
    justifyContent: 'center',
  },
  crisisFooterButtonText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.status.critical,
  },
  // Under-age screen styles
  crisisSection: {
    marginBottom: spacing[32],
  },
  crisisSectionTitle: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  crisisDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[24],
  },
  crisisButton: {
    backgroundColor: colorSystem.status.critical,
    paddingVertical: spacing[24],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginBottom: spacing[16],
    minHeight: 72,
  },
  crisisButtonText: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.white,
  },
  crisisButtonSubtext: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.base.white,
    marginTop: spacing[4],
  },
  crisisButtonSecondary: {
    backgroundColor: colorSystem.base.white,
    paddingVertical: spacing[24],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colorSystem.status.critical,
    minHeight: 72,
  },
  crisisButtonSecondaryText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.status.critical,
  },
  crisisButtonSubtextSecondary: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    marginTop: spacing[4],
  },
  resourcesSection: {
    marginTop: spacing[24],
    padding: spacing[24],
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.large,
  },
  resourcesTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[16],
  },
  reEnterAgeButton: {
    marginTop: spacing[24],
    paddingVertical: spacing[16],
    alignItems: 'center',
    minHeight: 44,
  },
  reEnterAgeButtonText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.secondary,
    textDecorationLine: 'underline',
  },
});

export default CombinedLegalGateScreen;
