/**
 * DELETE ACCOUNT SCREEN (FEAT-267)
 *
 * Data-subject right to erasure (CCPA / TDPSA / VCDPA / CPA / CTDPA / GDPR
 * Art. 17). Irreversibility is made unmistakable via a typed-DELETE gate before
 * the destructive action enables.
 *
 * CRISIS-PATH SAFETY: this is a pushed route INSIDE ProfileStackNavigator, so it
 * inherits the sibling CollapsibleCrisisButton overlay (988 stays <3 taps / <3s
 * reachable throughout). The confirmation gate is in-tree React — NOT a blocking
 * Alert.alert — precisely so the zIndex:9999 crisis overlay is never covered by
 * a native alert window. On success we reset to Onboarding, itself a
 * crisis-bearing clean state.
 *
 * ORDERING: AccountDeletionService.deleteAccountAndWipe() erases the server
 * account FIRST; a failed server delete surfaces a retryable error and leaves
 * local data intact (no wipe). DEBUG-539 inserted the analytics-identity reset
 * between that erasure and the local wipe. See AccountDeletionService for the
 * invariant.
 */

import React, { useState, useCallback } from 'react';
import { usePostHog } from 'posthog-react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, spacing, borderRadius, typography, semantic } from '@/core/theme';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import type { AnalyticsIdentityResetTarget } from '@/core/analytics/analyticsIdentityReset';
import { deleteAccountAndWipe } from '@/core/services/privacy/AccountDeletionService';
import { crisisAccessoryProps } from '@/features/crisis/constants/crisisInputAccessory';

const CONFIRM_WORD = 'DELETE';

const ERASED_ITEMS = [
  'Your check-ins, reflections, and practice history',
  'Your PHQ-9 and GAD-7 wellness screening results',
  'Your subscription details and account on our servers',
];

const PRESERVED_NOTE =
  'For legal compliance, a minimal record of your consent and age verification is ' +
  'kept on this device. It contains no wellness data.';

const DeleteAccountScreen: React.FC = () => {
  // Root navigation: Onboarding is a root-stack route (the post-erasure clean
  // state), not reachable from the local Profile stack.
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canDelete = confirmText === CONFIRM_WORD && !isDeleting;

  // DEBUG-539: the package types LIE here — `usePostHog` is declared
  // `() => PostHog`, but PostHogContext's default value is `{client: undefined}`
  // and the hook only warns before returning it. So this is genuinely
  // `PostHog | undefined` on the very path that matters (analytics is opt-in and
  // default OFF, so no provider is mounted for most users), and `undefined` is
  // not `null`. Normalise once, here.
  const posthog = usePostHog() as AnalyticsIdentityResetTarget | undefined;

  const handleDelete = useCallback(async () => {
    if (confirmText !== CONFIRM_WORD) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const result = await deleteAccountAndWipe({ posthog: posthog ?? null });
      if (result.ok) {
        // Reset to the clean onboarding state in the same tick the wipe
        // completes — Onboarding mounts its own crisis button + 988 line.
        rootNavigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
        return;
      }
      // Server erasure failed — local data is intact; allow retry.
      setErrorMessage(
        'Account deletion failed. Your data is intact. Please check your connection ' +
          'and try again, or contact privacy@being.fyi.',
      );
    } catch {
      setErrorMessage(
        'Something went wrong while deleting your account. Please try again, or ' +
          'contact privacy@being.fyi.',
      );
    } finally {
      setIsDeleting(false);
    }
  }, [confirmText, rootNavigation, posthog]);

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type {CONFIRM_WORD} to confirm</Text>
          <TextInput
            {...crisisAccessoryProps()} /* DEBUG-450 */
            style={styles.input}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isDeleting}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={colorSystem.gray[400]}
            accessibilityLabel={`Type ${CONFIRM_WORD} to confirm permanent account deletion`}
            accessibilityHint="The delete button stays disabled until you type the confirmation word"
            testID="delete-confirm-input"
          />
        </View>

        {errorMessage && (
          <Text style={styles.errorText} accessibilityLiveRegion="assertive" testID="delete-error">
            {errorMessage}
          </Text>
        )}

        <Pressable
          style={[styles.deleteButton, !canDelete && styles.deleteButtonDisabled]}
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
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
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
