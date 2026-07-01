/**
 * BUG REPORT / FEEDBACK SCREEN (FEAT-284)
 *
 * Internal-only (TestFlight / dev) surface for reporting a bug or sending
 * feedback from inside the app. Routes a user-authored message to Sentry via
 * `submitExternalFeedback` → `Sentry.captureFeedback`.
 *
 * GATING: the entry point (ProfileScreen "About" card) is gated on
 * `isFeatureEnabled('bug_reporting')` — OFF in the App Store production build.
 * This screen is only reachable when that flag is on.
 *
 * PRIVACY (non-negotiable, enforced in ExternalErrorReporter + this screen):
 * - A disclosure names Sentry/US and enumerates the wellness categories users
 *   must NOT include. The message field is never pre-filled with app state.
 * - The message is content-guarded pre-submit: if it mentions wellness/crisis
 *   topics the report is BLOCKED with an inline prompt to rephrase — nothing is
 *   sent. The message is pattern-scrubbed before send as defense-in-depth.
 * - Reporter identity is the anonymous Supabase uid ONLY (never email unless the
 *   user types it into the optional contact field). No screenshots/attachments.
 * - Dev/sim (empty Sentry DSN): submission is a silent no-op; the UI still
 *   confirms success and never throws.
 *
 * CRISIS-PATH SAFETY: pushed route INSIDE ProfileStackNavigator, so it inherits
 * the sibling CollapsibleCrisisButton overlay (988 stays reachable throughout).
 * Confirmation is in-tree React (no blocking Alert) so the crisis overlay is
 * never covered.
 */

import React, { useState, useCallback, useMemo } from 'react';
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
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';
import { submitExternalFeedback } from '@/core/services/logging';
import { supabaseService } from '@/core/services/supabase';

const MAX_MESSAGE = 500;

type ReportType = 'bug' | 'feedback';

const DISCLOSURE =
  'Reports are sent to Sentry (US) with your app version and device type. ' +
  'Do not include personal wellness information — mood ratings, check-in ' +
  'responses, journal or reflection text, screening results, or crisis details.';

const BugReportScreen: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = message.trim().length > 0 && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (message.trim().length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      // Anonymous uid only (null when the session hasn't provisioned yet).
      const userId = supabaseService.getStatus().userId;
      const trimmedEmail = email.trim();
      const result = await submitExternalFeedback({
        message: `[${reportType === 'bug' ? 'Bug' : 'Feedback'}] ${message.trim()}`,
        userId,
        ...(trimmedEmail ? { email: trimmedEmail } : {}),
      });

      if (result === 'submitted' || result === 'noop') {
        // 'noop' = dev/sim empty-DSN silent no-op; UI still confirms per AC.
        setSubmitted(true);
        setMessage('');
        setEmail('');
        return;
      }
      if (result === 'blocked') {
        setErrorMessage(
          'Your report looks like it may include personal wellness or crisis ' +
            'details. Please remove them and describe the issue without those terms.',
        );
        return;
      }
      setErrorMessage('Something went wrong sending your report. Please try again.');
    } catch {
      setErrorMessage('Something went wrong sending your report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [message, email, reportType, isSubmitting]);

  const remaining = useMemo(() => MAX_MESSAGE - message.length, [message.length]);

  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']} testID="bug-report-screen">
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.successBox} accessibilityLiveRegion="polite">
            <Text style={styles.successTitle} testID="bug-report-success">
              Thanks — your report was sent.
            </Text>
            <Text style={styles.successText}>
              We appreciate you helping make Being better. No personal wellness data was included.
            </Text>
          </View>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setSubmitted(false)}
            accessibilityRole="button"
            accessibilityLabel="Send another report"
            testID="bug-report-again"
          >
            <Text style={styles.secondaryButtonText}>Send another report</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']} testID="bug-report-screen">
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>Report a bug or send feedback</Text>
        <Text style={styles.lead}>
          Tell us what happened. This helps us fix issues faster during testing.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{DISCLOSURE}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Type
          </Text>
          <View style={styles.toggleRow}>
            {(['bug', 'feedback'] as const).map((t) => {
              const selected = reportType === t;
              return (
                <Pressable
                  key={t}
                  style={[styles.toggleButton, selected && styles.toggleButtonSelected]}
                  onPress={() => setReportType(t)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t === 'bug' ? 'Report a bug' : 'Send feedback'}
                  testID={`bug-report-type-${t}`}
                >
                  <Text style={[styles.toggleText, selected && styles.toggleTextSelected]}>
                    {t === 'bug' ? 'Bug' : 'Feedback'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            What happened?
          </Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={MAX_MESSAGE}
            editable={!isSubmitting}
            placeholder="Describe the issue or share your feedback…"
            placeholderTextColor={colorSystem.gray[400]}
            accessibilityLabel="Describe the bug or feedback"
            accessibilityHint="Do not include personal wellness information"
            testID="bug-report-message"
          />
          <Text style={styles.counter} accessibilityLabel={`${remaining} characters remaining`}>
            {remaining}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Email (optional)
          </Text>
          <Text style={styles.fieldHint}>Only if you want us to follow up.</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
            placeholder="you@example.com"
            placeholderTextColor={colorSystem.gray[400]}
            accessibilityLabel="Contact email, optional"
            testID="bug-report-email"
          />
        </View>

        {errorMessage && (
          <Text style={styles.errorText} accessibilityLiveRegion="assertive" testID="bug-report-error">
            {errorMessage}
          </Text>
        )}

        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Send report"
          accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
          testID="bug-report-submit"
        >
          {isSubmitting ? (
            <ActivityIndicator color={colorSystem.base.white} />
          ) : (
            <Text style={styles.submitButtonText}>Send report</Text>
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
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  lead: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 22,
    marginBottom: spacing[24],
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
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing[24],
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[12],
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing[12],
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    alignItems: 'center',
  },
  toggleButtonSelected: {
    backgroundColor: colorSystem.base.midnightBlue,
    borderColor: colorSystem.base.midnightBlue,
  },
  toggleText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.gray[600],
  },
  toggleTextSelected: {
    color: colorSystem.base.white,
  },
  messageInput: {
    backgroundColor: colorSystem.base.white,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  input: {
    backgroundColor: colorSystem.base.white,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.medium,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: spacing[8],
    fontSize: typography.micro.size,
    color: colorSystem.gray[400],
  },
  fieldHint: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[500],
    marginBottom: spacing[8],
    marginTop: -spacing[8],
  },
  errorText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.status.error,
    lineHeight: 20,
    marginBottom: spacing[16],
  },
  submitButton: {
    backgroundColor: colorSystem.base.midnightBlue,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    backgroundColor: colorSystem.gray[300],
  },
  submitButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  successBox: {
    backgroundColor: colorSystem.status.infoBackground,
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginBottom: spacing[24],
  },
  successTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  successText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    lineHeight: 22,
  },
  secondaryButton: {
    paddingVertical: spacing[16],
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.midnightBlue,
  },
});

export default BugReportScreen;
