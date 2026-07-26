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
 * The original method also called `logCrisisIntervention`, which serializes the
 * whole `CrisisDetection` — including `context.triggeringAnswers`, i.e. the raw
 * Q9 self-harm response — as plaintext JSON to a bare `crisis_intervention_*`
 * AsyncStorage key that matches no erasure prefix and survives account deletion
 * (DEBUG-305). That call stays behind at its existing call site rather than
 * being promoted into shared code where new callers would inherit it. Voice
 * journal must not write transcript-derived data through that path.
 *
 * CONTRACT (pinned by `__tests__/crisisAlert.unit.test.ts`)
 * - Exactly three actions, in order: 988, 741741, 911.
 * - Not cancelable — dismissing by tapping away is not an exit.
 * - No network. The dial paths are local `Linking` calls, which is what keeps
 *   this usable offline and inside the <3s budget.
 */

import { Alert, Linking } from 'react-native';

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
          onPress: (): void => {
            void Linking.openURL('tel:988');
          },
          style: 'default',
        },
        {
          text: CRISIS_ACTION_TEXT_LINE,
          onPress: (): void => {
            void Linking.openURL('sms:741741');
          },
          style: 'default',
        },
        {
          text: CRISIS_ACTION_911,
          onPress: (): void => {
            void Linking.openURL('tel:911');
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  } catch {
    Linking.openURL('tel:988');
  }
}
