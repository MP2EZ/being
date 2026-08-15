/**
 * useHapticsOptIn — owns the once-ever haptics opt-in decision (FEAT-385).
 *
 * WHY THIS EXISTS. FEAT-285 relied on the invariant being STRUCTURAL: the prompt
 * had exactly one mount site, so "exactly once, ever" needed no enforcement.
 * FEAT-385 re-homes it onto the three live practice screens that actually consume
 * `usePracticeHaptics` — PracticeTimerScreen, ReflectionTimerScreen, BodyScanScreen
 * — and the invariant has to be enforced rather than assumed.
 *
 * THE HAZARD IS THE AWAIT WINDOW, not simultaneous render. `updatePracticeSettings`
 * is async. Between the tap and the persisted `practiceHapticsPrompted: true` there
 * is an interval during which another practice screen can mount, read `false`, and
 * show the unrepeatable prompt a second time. A latch that lives only in the
 * persisted store cannot close that window by construction, so the claim is taken
 * SYNCHRONOUSLY in module scope, before the write is dispatched.
 *
 * The two pieces of module state are deliberate and do different jobs:
 * - `claimHolder` — which mounted screen currently owns the right to show it. Released
 *   on unmount IF unanswered, so backing out of a practice does not permanently
 *   consume the prompt.
 * - `answeredThisSession` — set synchronously on the first choice and NEVER released.
 *   This is the half that survives the await window.
 *
 * Across app restarts the persisted `practiceHapticsPrompted` takes over, which is
 * why `answeredThisSession` needs no rehydration.
 *
 * GATED ON `practice_haptics`. With the flag off no haptic can ever fire, so asking
 * would spend an unrepeatable choice on a capability that cannot exist. This is also
 * why FEAT-385 reaches zero production users until INFRA-395 flips the flag.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { isFeatureEnabled } from '@/core/services/featureFlags';
import { useSettingsStore } from '@/core/stores/settingsStore';

import { hasHapticActuator } from './hapticActuator';

/** The mount that currently owns the right to render the prompt, if any. */
let claimHolder: object | null = null;

/**
 * True once a choice has been made in this app session. Set synchronously, never
 * cleared — clearing it would reopen the await window it exists to close.
 */
let answeredThisSession = false;

/**
 * Test-only latch reset. Module state is session-scoped by design, which is exactly
 * what makes it invisible to jest's module registry between cases in one file.
 */
export function __resetHapticsOptInLatch(): void {
  claimHolder = null;
  answeredThisSession = false;
}

export interface HapticsOptInController {
  /** True only for the single mount that holds the claim. */
  shouldPrompt: boolean;
  /** Records the choice. Idempotent — the first call wins, both choices spend it. */
  onChoose: (enabled: boolean) => void;
}

export function useHapticsOptIn(): HapticsOptInController {
  const settings = useSettingsStore((state) => state.settings);
  const updatePracticeSettings = useSettingsStore((state) => state.updatePracticeSettings);

  // Identity for this mount. `useRef` rather than a counter so two screens can never
  // collide on the same token.
  const token = useRef<object>({}).current;

  const [holdsClaim, setHoldsClaim] = useState(false);
  const [answered, setAnswered] = useState(false);

  // DEBUG-426: the capability term sits INSIDE `eligible`, not as a later guard
  // on `shouldPrompt`, and the placement is load-bearing twice over.
  //
  // It is what makes suppression a PURE READ: `eligible` gates the claim-taking
  // effect below, so false means the claim is never taken, the prompt never
  // mounts, `onChoose` is never reachable, and `updatePracticeSettings` is never
  // called. Nothing is persisted, so the unrepeatable choice survives unspent
  // and a practitioner who later moves to hardware that CAN deliver is still
  // asked.
  //
  // And a late guard would let an incapable mount consume `claimHolder`,
  // starving a capable sibling screen for the rest of the session.
  //
  // Ordered after the flag test, which is the cheapest and most often false.
  const eligible =
    isFeatureEnabled('practice_haptics') &&
    hasHapticActuator() &&
    settings !== null &&
    settings !== undefined &&
    !settings.practices.practiceHapticsPrompted &&
    !answeredThisSession;

  useEffect(() => {
    if (!eligible) return undefined;

    if (claimHolder === null) {
      claimHolder = token;
      setHoldsClaim(true);
    }

    return () => {
      // Release ONLY if this mount never answered. A holder that answered keeps the
      // claim so no later mount can re-ask inside the await window.
      if (claimHolder === token && !answeredThisSession) {
        claimHolder = null;
      }
    };
  }, [eligible, token]);

  const onChoose = useCallback(
    (enabled: boolean) => {
      // Idempotent: two presses in one frame must not produce two writes, the second
      // of which could carry the opposite value.
      if (answeredThisSession) return;

      // SYNCHRONOUS, and before the await. This is the line that closes the window.
      answeredThisSession = true;
      setAnswered(true);

      void updatePracticeSettings({
        practiceHaptics: enabled,
        practiceHapticsPrompted: true,
      });
    },
    [updatePracticeSettings]
  );

  return {
    shouldPrompt: eligible && holdsClaim && !answered,
    onChoose,
  };
}

export default useHapticsOptIn;
