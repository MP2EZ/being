/**
 * crisisAlert — the single canonical crisis intervention alert (FEAT-283)
 *
 * Domain Authority: crisis (CRITICAL). Copy changes require a crisis pass.
 *
 * WHY THIS IS EXTRACTED
 *
 * This alert previously lived inline in a private static method on
 * `CrisisDetectionService` inside `assessmentStore.ts`, reachable only from the
 * PHQ-9/GAD-7 completion path. Voice journal entries (FEAT-283) need the same
 * intervention, and copy-pasting it would create a second version of the most
 * safety-critical copy in the app — free to drift in wording, button order, or
 * cancelability. MAINT-166 already fixed one double-alert bug of exactly that
 * family, and `.maestro/q9-single-alert.yaml` exists to pin it.
 *
 * So there is one implementation, and every crisis surface calls it.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * The original method also called `logCrisisIntervention`, which serialized the
 * `CrisisDetection` — `primaryTrigger: 'phq9_suicidal_ideation'` plus
 * `triggerValue`, the raw Q9 self-harm response — as plaintext JSON to a bare
 * `crisis_intervention_*` AsyncStorage key that matched no erasure prefix and
 * survived account deletion. That call was kept out of this shared module so
 * new callers could not inherit it; DEBUG-305 has since deleted it outright at
 * its original call site, so no crisis surface persists a local record.
 *
 * Nothing here writes to storage, and nothing added here should. The durable
 * crisis audit trail is the off-device `crisis_detected` event emitted by the
 * caller; the assessment answers are already encrypted under the swept
 * `wellness_async_` prefix. A local record on this path would be a duplicate
 * with a fresh erasure obligation.
 *
 * CONTRACT (pinned by `__tests__/crisisAlert.unit.test.ts`)
 * - Exactly three actions, in order: 988, 741741, 911.
 * - Not cancelable — dismissing by tapping away is not an exit.
 * - No network. The dial issues no network call before the dial, which is what
 *   keeps this usable offline and inside the <3s budget. (`openCrisisUrl` pulls
 *   `logError` and `crisisTapTrace` into the graph, but neither touches the
 *   network on the path to `Linking.openURL`.)
 *
 * GUARDED DIALS (DEBUG-314)
 * The three actions dial through `openCrisisUrl`, not bare `Linking.openURL`,
 * so each gets the `canOpenURL` guard, the manual-dial fallback Alert, and the
 * `LogCategory.CRISIS` audit record. Previously a rejected `openURL` — no
 * telephony, a missing `LSApplicationQueriesSchemes` entry, an OS restriction —
 * rejected into nothing: no dial, no alert, no log, on the PHQ-9/GAD-7
 * threshold path. Import is static per the crisis-path no-lazy-import rule.
 */

import { Alert, Linking } from 'react-native';

import { logError, LogCategory } from '@/core/services/logging';
import { openCrisisUrl } from '@/features/crisis/utils/openCrisisUrl';

/**
 * Copy is exported so tests and any future in-page banner can assert against
 * one source rather than restating the strings.
 */
export const CRISIS_ALERT_TITLE = '🚨 Crisis Support Available';
export const CRISIS_ALERT_MESSAGE =
  "You're not alone. Crisis support is available 24/7.";

export const CRISIS_ACTION_988 = 'Call 988 (Crisis Lifeline)';
export const CRISIS_ACTION_TEXT_LINE = 'Text 741741 (Crisis Text)';
export const CRISIS_ACTION_911 = 'Emergency 911';

/**
 * Show the canonical crisis alert.
 *
 * Synchronous and side-effect-only. It never throws: on any failure it falls
 * straight through to dialing 988, because a broken alert must not become a
 * silent no-op on the one path where silence is most costly.
 */
export function showCrisisAlert(): void {
  try {
    Alert.alert(
      CRISIS_ALERT_TITLE,
      CRISIS_ALERT_MESSAGE,
      [
        {
          text: CRISIS_ACTION_988,
          // `void`, never `await`, and never an `async` handler: openCrisisUrl
          // terminates in `.catch` and cannot reject, so the floating promise is
          // safe by construction, while an async handler would change the
          // Alert's dismissal timing.
          //
          // These handlers reach `endCrisisTap('url_open')` inside the helper.
          // On this path (assessment completion, voice journal) no crisis-tap
          // mark is open, so it no-ops — that is correct, not telemetry noise.
          onPress: (): void => {
            void openCrisisUrl('tel:988', { manualLabel: '988' });
          },
          style: 'default',
        },
        {
          text: CRISIS_ACTION_TEXT_LINE,
          // Explicit copy rather than `manualLabel`: the default fallback reads
          // "Please manually dial 741741 for support", which is wrong for a
          // text line. Matches CrisisErrorBoundary.tsx and CrisisResourcesScreen.
          onPress: (): void => {
            void openCrisisUrl('sms:741741', {
              fallbackTitle: 'Unable to Text',
              fallbackMessage: 'Please text 741741 for support.',
            });
          },
          style: 'default',
        },
        {
          text: CRISIS_ACTION_911,
          onPress: (): void => {
            void openCrisisUrl('tel:911', { manualLabel: '911' });
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  } catch (error) {
    // Deliberately NOT openCrisisUrl (DEBUG-314). We are here because
    // `Alert.alert` threw, and openCrisisUrl's only failure surface IS
    // `Alert.alert` — routing this through the guard would trade a blind dial
    // for a guaranteed-silent one. A bare last-resort dial is the honest
    // fallback when the modal layer is already broken.
    //
    // What WAS the DEBUG-314 defect here is the unhandled rejection: an
    // `openURL` that rejects had nowhere to go. The `.catch` is the fix.
    logError(
      LogCategory.CRISIS,
      'Crisis alert failed to render; falling back to a direct 988 dial',
      error instanceof Error ? error : new Error(String(error))
    );
    void Linking.openURL('tel:988').catch((dialError) =>
      logError(
        LogCategory.CRISIS,
        'Crisis alert fallback dial failed',
        dialError instanceof Error ? dialError : new Error(String(dialError))
      )
    );
  }
}
