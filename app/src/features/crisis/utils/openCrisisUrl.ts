/**
 * openCrisisUrl — the single guarded entry point for crisis-path deeplinks
 * (tel:/sms:). DEBUG-230 / SEC-W5.
 *
 * Every crisis dial in the app (988, 741741, 911, emergency contacts) must
 * go through this helper so the safety contract is enforced in one place:
 *   1. `canOpenURL` guard before `openURL`,
 *   2. a manual-dial fallback Alert + `logError(CRISIS)` when the URL is
 *      unsupported or `openURL` rejects — never a silent failure mid-crisis,
 *   3. an optional injected `onTap` analytics callback (class components such
 *      as CrisisErrorBoundary cannot use the `useAnalytics` hook, so the tap
 *      is injected rather than fired internally).
 *
 * Pattern lifted from the original gold standard in CrisisResourcesScreen.
 */

import { Alert, Linking } from 'react-native';
import { logError, LogCategory } from '@/core/services/logging';
// Eager, per the crisis-path no-lazy-import rule. Every function in this module
// is internally guarded and cannot throw into the dial path.
import { endCrisisTap } from '@/features/crisis/services/crisisTapTrace';

export interface OpenCrisisUrlOptions {
  /** Human-readable target shown in the manual-fallback Alert, e.g. "988". */
  manualLabel?: string;
  /** Override the fallback Alert title (default: "Unable to Call"). */
  fallbackTitle?: string;
  /** Override the fallback Alert body. */
  fallbackMessage?: string;
  /**
   * Analytics tap callback, fired once when the dial is invoked. Injected
   * because class components can't call the useAnalytics hook directly.
   */
  onTap?: () => void;
}

export function openCrisisUrl(
  url: string,
  options: OpenCrisisUrlOptions = {}
): Promise<void> {
  const { manualLabel, fallbackTitle, fallbackMessage, onTap } = options;

  onTap?.();

  const showManualFallback = (error: unknown): void => {
    // Close the crisis-tap measurement with a distinct outcome (INFRA-297). This
    // is a legitimate non-success terminal, NOT a dropped tap: the user still
    // gets the manual-dial Alert below, so it must not be classified as the
    // watchdog's 'deadline_exceeded'. No-op if no mark is open.
    endCrisisTap('manual_fallback');
    logError(
      LogCategory.CRISIS,
      'Failed to open crisis URL',
      error instanceof Error ? error : new Error(String(error))
    );
    Alert.alert(
      fallbackTitle ?? 'Unable to Call',
      fallbackMessage ??
        (manualLabel
          ? `Please manually dial ${manualLabel} for support.`
          : 'Please reach out for support manually.'),
      [{ text: 'OK', style: 'default' }]
    );
  };

  return Linking.canOpenURL(url)
    .then((supported) => {
      if (supported) {
        return Linking.openURL(url).then(() => {
          // Success terminal for the crisis-tap measurement (INFRA-297): the OS
          // has taken the dial. Needed because the CrisisErrorBoundary path dials
          // without ever rendering CrisisResourcesScreen, so the screen-commit
          // terminal would never fire for it.
          //
          // Tagged distinctly from 'screen_commit' on purpose — tap→OS-handoff
          // and tap→render are different physical quantities and must never be
          // aggregated into one p95.
          //
          // A no-op when no mark is open, which is the common case: a "Call Now"
          // tap inside CrisisResourcesScreen arrives after the commit already
          // closed the mark. openCrisisUrl's other callers are unaffected.
          endCrisisTap('url_open');
          return undefined;
        });
      }
      throw new Error(`Crisis URL not supported: ${url}`);
    })
    .catch(showManualFallback);
}
