/**
 * DELETE ACCOUNT SCREEN (FEAT-267)
 *
 * Data-subject right to erasure (CCPA / TDPSA / VCDPA / CPA / CTDPA / GDPR
 * Art. 17). Irreversibility is made unmistakable via a typed-DELETE gate before
 * the destructive action enables.
 *
 * CRISIS-PATH SAFETY: this is a pushed route INSIDE ProfileStackNavigator, and
 * the single RootCrisisButton overlay (MAINT-290) covers it, so 988 stays <3 taps
 * / <3s reachable throughout — including while the deletion spinner runs. The
 * confirmation gate is in-tree React — NOT a blocking Alert.alert — precisely so
 * the zIndex:9999 crisis overlay is never covered by a native alert window. On
 * success we reset to LegalGate (DEBUG-755): the next person must pass the age gate
 * and give consent themselves, and LegalGate's 988 footer is unconditional.
 *
 * DEBUG-703: the user can open CrisisResources (root button, or the keyboard
 * crisis accessory) while the erasure is in flight. If a crisis destination is
 * focused when it succeeds, the whole reset is DEFERRED until the user leaves it
 * (crisisDestinationGuard) — never applied over the crisis screen, never
 * dropped. The screen meanwhile sits in a terminal "deleted" state: a successful
 * erasure never re-enables the Delete button. A FAILED erasure never navigates,
 * and its error is not announced over a focused crisis screen; it stays visible
 * for the user's return.
 *
 * ORDERING: AccountDeletionService.deleteAccountAndWipe() erases the server
 * account FIRST; a failed server delete surfaces a retryable error and leaves
 * local data intact (no wipe). DEBUG-539 inserted the analytics-identity reset
 * between that erasure and the local wipe. See AccountDeletionService for the
 * invariant.
 *
 * FEAT-710 (compliance ruling 2026-10-06): store billing outlives this erasure, so
 * the screen says so before the confirmation field, in the device platform's copy
 * only. Rendered for EVERYONE — the "If you pay" hinge is in the words, never a
 * subscriptionStore read, because local subscription state cannot tell a billed user
 * from an unbilled one (reinstall loses it). Text-only by ruling: a link or StoreKit
 * sheet would background the app (DEBUG-577) and add a pressable in the FAB band, so
 * one needs a new crisis presenter-class ruling first.
 */

import React, { useState, useCallback } from 'react';
import { usePostHog } from 'posthog-react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, spacing, borderRadius, typography, semantic } from '@/core/theme';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import type { AnalyticsIdentityResetTarget } from '@/core/analytics/analyticsIdentityReset';
import { deleteAccountAndWipe } from '@/core/services/privacy/AccountDeletionService';
import {
  isCrisisDestinationFocused,
  runWhenNoCrisisDestinationFocused,
} from '@/core/navigation/crisisDestinationGuard';
import { navigationRef } from '@/core/navigation/navigationRef';
import { CrisisTextInput } from '@/features/crisis/components/CrisisTextInput';
import { CRISIS_BUTTON_EXCLUSION_RECT } from '@/features/crisis/constants/crisisButtonGeometry';
import { useCrisisExclusionAssertion } from '@/core/hooks/useCrisisExclusionAssertion';

const CONFIRM_WORD = 'DELETE';

const ERASED_ITEMS = [
  'Your check-ins, reflections, and practice history',
  'Your PHQ-9 and GAD-7 wellness screening results',
  // FEAT-710 ruling (c): "details" read as if the subscription itself ended. Matches
  // privacy policy §7.4's "subscription records".
  'Your anonymous account and subscription records on our servers',
];

// FEAT-710 ruling (b). Plain text, steps in words not glyphs (VoiceOver reads "→" badly),
// about 30 words, and nothing about restoring, resubscribing or refunds.
const SUBSCRIPTION_NOTICE = {
  ios:
    'If you pay for Being through the App Store, deleting your account does not cancel ' +
    'billing. To cancel, open Settings, tap your name, then Subscriptions.',
  android:
    'If you pay for Being through Google Play, deleting your account does not cancel ' +
    'billing. To cancel, open Play Store, then Payments & subscriptions, then Subscriptions.',
} as const;

const PRESERVED_NOTE =
  'For legal compliance, a minimal record of your consent and age verification is ' +
  'kept on this device. It contains no wellness data.';

/**
 * DEBUG-755 — where a successful erasure lands, on BOTH the immediate and the
 * DEBUG-703 deferred branch (one constant so they cannot drift). It was Onboarding,
 * which skipped the age gate and re-granted from the deleted account's preserved
 * legal-gate and age records. LegalGate is an existing root route, in
 * SUPPRESSED_ROUTES, with an unconditional 988 footer; its onComplete replaces to
 * Onboarding as on any first launch.
 */
const POST_ERASURE_ROUTE = 'LegalGate' as const;

const DeleteAccountScreen: React.FC = () => {
  // Root navigation: LegalGate is a root-stack route (the post-erasure clean
  // state), not reachable from the local Profile stack.
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  // DEBUG-653: __DEV__-only crisis-FAB exclusion checks (DEBUG-643); undefined in Release.
  const deleteButtonExclusionCheck = useCrisisExclusionAssertion('delete-account-button', 'scrolls');
  const confirmInputExclusionCheck = useCrisisExclusionAssertion('delete-confirm-input', 'scrolls');
  const [confirmText, setConfirmText] = useState('');
  // 'deleted' is terminal (DEBUG-703): nothing returns to 'idle' after a successful erasure.
  const [status, setStatus] = useState<'idle' | 'deleting' | 'deleted'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // DEBUG-703: false when the failure resolved under a focused crisis destination.
  const [announceError, setAnnounceError] = useState(true);

  const isDeleting = status === 'deleting';
  const canDelete = confirmText === CONFIRM_WORD && status === 'idle';

  // DEBUG-539: the package types LIE here — `usePostHog` is declared
  // `() => PostHog`, but PostHogContext's default value is `{client: undefined}`
  // and the hook only warns before returning it. So this is genuinely
  // `PostHog | undefined`, and `undefined` is not `null`. Normalise once, here.
  //
  // DEBUG-559 narrowed WHEN it is undefined, in the helpful direction. This used
  // to add "analytics is opt-in and default OFF, so no provider is mounted for
  // most users" — true then, wrong now: the provider was withholding <PHProvider>
  // without consent, which remounted every 988 affordance in the app on a consent
  // tap, so it is now always mounted. In a build with an API key the client is
  // therefore present here regardless of consent, and erasure takes the
  // reset-THROUGH-the-instance branch rather than the unlink fallback — which is
  // the branch DEBUG-539 wants, since a live instance can re-persist the
  // pre-erasure distinct_id. Undefined now means only "no key in this build".
  const posthog = usePostHog() as AnalyticsIdentityResetTarget | undefined;

  const handleDelete = useCallback(async () => {
    if (confirmText !== CONFIRM_WORD || status !== 'idle') return;
    setStatus('deleting');
    setErrorMessage(null);
    try {
      const result = await deleteAccountAndWipe({ posthog: posthog ?? null });
      if (result.ok) {
        setStatus('deleted');
        if (isCrisisDestinationFocused()) {
          // DEBUG-703: the user opened crisis support mid-deletion. Resetting now
          // would destroy that screen, so the same reset runs, at the root, once
          // they leave it. Not cancelled by this screen unmounting.
          runWhenNoCrisisDestinationFocused(() =>
            navigationRef.reset({ index: 0, routes: [{ name: POST_ERASURE_ROUTE }] }),
          );
          return;
        }
        // Reset to the post-erasure root in the same tick the wipe completes.
        rootNavigation.reset({ index: 0, routes: [{ name: POST_ERASURE_ROUTE }] });
        return;
      }
      // Server erasure failed — local data is intact; allow retry. Never announced
      // over a focused crisis screen (DEBUG-703); the text waits for the user's return.
      setAnnounceError(!isCrisisDestinationFocused());
      setErrorMessage(
        'Account deletion failed. Your data is intact. Please check your connection ' +
          'and try again, or contact privacy@being.fyi.',
      );
    } catch {
      setAnnounceError(!isCrisisDestinationFocused());
      setErrorMessage(
        'Something went wrong while deleting your account. Please try again, or ' +
          'contact privacy@being.fyi.',
      );
    } finally {
      // Only a failure returns to 'idle'; a successful erasure stays 'deleted'.
      setStatus((current) => (current === 'deleting' ? 'idle' : current));
    }
  }, [confirmText, status, rootNavigation, posthog]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']} testID="delete-account-screen">
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        testID="delete-account-scroll"
        // DEBUG-480 companion. Same shape as VoiceReflectionScreen: delete-error
        // renders between delete-confirm-input and delete-account-button and
        // pushes the button down, while the keyboard is necessarily up — the user
        // has just typed the confirmation word.
        //
        // This is a DATA-SUBJECT-RIGHT access fix, not polish. This screen's own
        // header cites CCPA / TDPSA / VCDPA / CPA / GDPR Art. 17; a confirm button
        // that is occluded or whose first tap is swallowed is a functional
        // obstruction of the right to erasure.
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.heading}>Delete account & wellness data</Text>
        <Text style={styles.lead}>
          This permanently erases your account and on-device wellness data. It cannot be undone.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is removed</Text>
          <View style={styles.card}>
            {ERASED_ITEMS.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{PRESERVED_NOTE}</Text>
        </View>

        {/* FEAT-710: non-interactive, unconditional, read just before the confirm field. */}
        <View style={styles.infoBox} testID="delete-subscription-notice">
          <Text style={styles.infoText}>
            {Platform.OS === 'android' ? SUBSCRIPTION_NOTICE.android : SUBSCRIPTION_NOTICE.ios}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type {CONFIRM_WORD} to confirm</Text>
          <CrisisTextInput
            style={styles.input}
            onLayout={confirmInputExclusionCheck}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={status === 'idle'}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={colorSystem.gray[400]}
            accessibilityLabel={`Type ${CONFIRM_WORD} to confirm permanent account deletion`}
            accessibilityHint="The delete button stays disabled until you type the confirmation word"
            testID="delete-confirm-input"
          />
        </View>

        {errorMessage && (
          <Text
            style={styles.errorText}
            accessibilityLiveRegion={announceError ? 'assertive' : 'none'}
            testID="delete-error"
          >
            {errorMessage}
          </Text>
        )}

        <Pressable
          style={[styles.deleteButton, !canDelete && styles.deleteButtonDisabled]}
          onLayout={deleteButtonExclusionCheck}
          onPress={handleDelete}
          disabled={!canDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete my account"
          accessibilityHint="Permanently erases your account and wellness data. This cannot be undone."
          accessibilityState={{ disabled: !canDelete, busy: isDeleting }}
          testID="delete-account-button"
        >
          {isDeleting ? (
            <ActivityIndicator color={colorSystem.base.white} />
          ) : (
            <Text style={styles.deleteButtonText}>Delete my account</Text>
          )}
        </Pressable>
      </ScrollView>
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
  heading: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[8],
  },
  lead: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[24],
  },
  section: {
    marginBottom: spacing[24],
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[12],
  },
  card: {
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.large,
    padding: spacing[16],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: spacing[8],
  },
  bulletDot: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.secondary,
    marginRight: spacing[8],
  },
  bulletText: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: colorSystem.status.infoBackground,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[24],
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.base.midnightBlue,
  },
  infoText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colorSystem.base.white,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.medium,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    fontSize: typography.bodyRegular.size,
    color: semantic.text.primary,
    // DEBUG-653: measured [25,460][350,504] vs crisis-button-root [331,523][375,567] (375x667,
    // iOS 18.6). Margin, never padding: padding moves only the text, not the frame under the
    // FAB. Left-aligned field, so right only (founder ruling 2026-09-26).
    marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left,
  },
  errorText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.status.error,
    lineHeight: 20,
    marginBottom: spacing[16],
  },
  deleteButton: {
    backgroundColor: colorSystem.status.error,
    paddingVertical: spacing[16],
    // DEBUG-653: 16, not 32 — inside the FAB margins a 119pt label box wraps "Delete my account".
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    // DEBUG-653: measured [24,529][351,581] vs crisis-button-root [331,523][375,567] (375x667,
    // iOS 18.6). Margin, never padding: padding moves only the label, not the frame under the
    // FAB. marginLeft keeps it centred; deleteButtonDisabled must never set a margin or width.
    marginLeft: CRISIS_BUTTON_EXCLUSION_RECT.left,
    marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left,
  },
  deleteButtonDisabled: {
    backgroundColor: colorSystem.gray[300],
  },
  deleteButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
});

export default DeleteAccountScreen;
