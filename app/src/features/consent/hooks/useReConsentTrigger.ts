/**
 * RE-CONSENT TRIGGER (FEAT-417 slice C2)
 *
 * The thing that makes FEAT-376's `ReConsentScreen` appear. Without it the
 * screen is unreachable dead code and the recovery path from a CONSENT_VERSION
 * bump does not exist.
 *
 * Six conditions, ALL of which must hold. Five come from the work item; the
 * sixth (crisis deferral) was added by the `crisis` planning pass.
 *
 * ── WHY EACH CONDITION EXISTS ────────────────────────────────────────────────
 *
 * (1) `RECONSENT_TRIGGER_STATUSES.has(consentStatus)` — an explicit ALLOWLIST,
 *     mandated by `consentStore.ts:315-322`. Deliberately NARROWER than the
 *     store's `RE_CONSENT_ELIGIBLE_STATUSES`, which also admits `'expired'`.
 *     `expired` is descoped: unreachable until ~2027-05, and a single-affirm
 *     carry-forward on a pure expiry is the dark pattern DEBUG-150 removed.
 *     🚫 Do NOT "align the two lists" — widening this one arms that path.
 *
 * (2) 🔴 THE AGE PREDICATE, AND IT IS NOT `isEligible === true`. DEBUG-150
 *     flipped the gate 13→18 in the same commit that bumped CONSENT_VERSION
 *     1.0.0→1.1.0, so on a v1.0.0 record — the ONLY cohort `version_mismatch`
 *     can serve — `isEligible: true` means "≥13". A 13-17-year-old shown this
 *     prompt would affirm Art. 9(2)(a) consent and then hit `renewConsent`'s
 *     refusal at `consentStore.ts:1174-1180`, which does `set({ error })` with no
 *     throw, no return value and no forward path: a dead end after a legally
 *     meaningless affirmation.
 *
 *     `isBaseEligibleForRenewal` re-derives from `birthYear` and is imported
 *     rather than reimplemented, so screen and store share ONE definition of the
 *     18+ boundary. It fails closed on a missing `birthYear`
 *     (`consentStore.ts:738`), which means the trigger goes permanently silent
 *     for such a user. Deliberate.
 *
 *     Under-18 holders of a stale record are excluded from the prompt and left
 *     at Main, fail-closed, with no under-age route (founder decision D2). The
 *     cohort is currently empty: `loadConsent` tests `version` before age
 *     (`consentStore.ts:901` before `:918`), so a v1.0.0 record always resolves
 *     `version_mismatch` and never `under_age` — and every grant post-dates the
 *     18+ rule, so no record written under it can be v1.0.0.
 *
 * (3) `onboardingCompleted === true` — re-consent must not land on top of the
 *     onboarding flow, which collects consent itself.
 *
 * (4) `!shownThisLaunch` — see the flag's own comment below.
 *
 * (5) `navigationRef.isReady()` — an early navigate would throw.
 *
 * (6) 🔴 CRISIS DEFERRAL. See `RECONSENT_DEFERRAL_ROUTES`.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT DO ───────────────────────────────────────
 *
 * 🚫 NO TELEMETRY, of any kind, on any branch. Not merely forbidden —
 * structurally pointless: `PostHogProvider` gates mounting on
 * `currentConsent?.preferences?.analyticsEnabled`, and `loadConsent` nulls
 * `currentConsent` for the entire `version_mismatch` window, so no client exists
 * to receive an event. Any event here would also describe an interaction that
 * happened BEFORE consent existed.
 *
 * 🚫 NO RE-ARMING — no interval, no `AppState` re-check, no retry loop. The
 * trigger is launch-scoped, and that is what makes condition (6) sound: this
 * guard reads the ROOT route via `getActiveRootRouteName()`, so it is BLIND to
 * nested leaf surfaces. The journal crisis banner lives on `VoiceReflection`
 * under `Main`, which reads here as `'Main'`. That blindness is tolerable only
 * because `consentStatus` resolves during launch and never returns to
 * `version_mismatch` afterwards. ⚠️ A future slice that re-arms mid-session
 * makes the blindness LIVE and must move to a leaf-route-aware read first.
 *
 * 🚫 NO PERSISTENCE. See the flag.
 */

import { useEffect } from 'react';
import {
  isBaseEligibleForRenewal,
  useConsentStore,
  type ConsentRecord,
  type ConsentStatus,
} from '@/core/stores/consentStore';
import { useSettingsStore } from '@/core/stores/settingsStore';
import { navigationRef } from '@/core/navigation/navigationRef';
import { logError, LogCategory } from '@/core/services/logging';

/**
 * The ONLY consent statuses from which re-consent is presented.
 *
 * An allowlist, never "everything except X": a denylist silently admits any
 * status added later. Membership is pinned by a literal snapshot in
 * `__tests__/useReConsentTrigger.privacy.test.ts`, so widening it costs a
 * deliberate test edit a reviewer sees.
 */
export const RECONSENT_TRIGGER_STATUSES: ReadonlySet<ConsentStatus> = new Set<ConsentStatus>([
  'version_mismatch',
]);

/**
 * 🔴 Root routes on which re-consent DEFERS rather than presents.
 *
 * THE HARM. `navigationRef.navigate('ReConsent')` while `CrisisResources` is
 * active does not replace it — it PUSHES the consent form on top
 * (`navigationRef.ts:22-27` reads the top of the root stack). 988 itself
 * survives, because `ReConsent` is not in `SUPPRESSED_ROUTES` and the overlay
 * still renders in `standard` mode. But the user is yanked off the resources
 * list, the safety plan and the text-line option, onto a consent form.
 * `RootCrisisButton.tsx:190-198` names that exact harm — "yanking the user out
 * of the CrisisResources screen they just reached" — when justifying its own
 * single-flight guard. `AssessmentFlow` is worse: a PHQ-9 with Q9 > 0 renders
 * the `prominent` crisis affordance in-flow.
 *
 * REACHABLE, NOT THEORETICAL. A cold-start `being://crisis` lands on
 * `CrisisResources` (DEBUG-372) while `loadConsent()` is still resolving
 * (`CleanRootNavigator.tsx:215-218`), so the consent-status flip and the
 * deep-link landing race each other.
 *
 * 🚫 ITS OWN CONSTANT — NOT a reuse of `RootCrisisButton`'s `SUPPRESSED_ROUTES`.
 * The two overlap today but mean different things: that set means "owns its own
 * crisis affordance", this one means "is a live crisis surface". Reusing it
 * would silently delete this guard the day a route leaves `SUPPRESSED_ROUTES`
 * for an unrelated reason.
 *
 * `LegalGate` is unreachable in combination with `version_mismatch` +
 * `onboardingCompleted` and is listed defensively.
 */
export const RECONSENT_DEFERRAL_ROUTES: ReadonlySet<string> = new Set([
  'CrisisResources',
  'AssessmentFlow',
  'LegalGate',
]);

/** Everything the decision depends on, passed in so the predicate stays pure. */
export interface ReConsentTriggerInputs {
  consentStatus: ConsentStatus;
  /** `staleConsent ?? currentConsent` — see `consentStore.ts:339-355`. */
  base: ConsentRecord | null;
  onboardingCompleted: boolean;
  /** Active ROOT-stack route. `undefined` before the container is ready. */
  activeRootRoute: string | undefined;
  navigationReady: boolean;
  shownThisLaunch: boolean;
}

/**
 * Pure, total, and the single place the six conditions are evaluated.
 *
 * Extracted from the hook so every condition can be tested at its boundary
 * without a renderer, a navigator or a store — which is what makes the 17/18
 * age cases and the crisis-deferral case cheap enough to actually assert.
 */
export function shouldPresentReConsent(inputs: ReConsentTriggerInputs): boolean {
  const {
    consentStatus,
    base,
    onboardingCompleted,
    activeRootRoute,
    navigationReady,
    shownThisLaunch,
  } = inputs;

  if (!RECONSENT_TRIGGER_STATUSES.has(consentStatus)) return false;
  if (onboardingCompleted !== true) return false;
  if (shownThisLaunch) return false;
  if (!navigationReady) return false;

  // An undefined route is NOT a deferral route — condition (5) already covers
  // the pre-ready window, and treating "unknown" as "crisis" would suppress the
  // prompt for the wrong reason.
  if (activeRootRoute !== undefined && RECONSENT_DEFERRAL_ROUTES.has(activeRootRoute)) {
    return false;
  }

  // Last, because it is the only condition that reads a record's contents.
  if (!base) return false;
  return isBaseEligibleForRenewal(base);
}

/**
 * 🔴 LAUNCH-SCOPED, IN-MEMORY, NEVER PERSISTED.
 *
 * Module scope is the whole mechanism: it dies with the JS context, so the
 * prompt returns on the next launch. A PERSISTED flag risks permanently
 * suppressing a legally required prompt, and the symptom of that bug is
 * silence — nothing would ever surface it.
 *
 * Set at NAVIGATE time, not dismiss time. That is what makes condition (6) a
 * deferral rather than a suppression: declining to present because a crisis
 * surface is open consumes nothing, so the prompt still appears once the user
 * leaves it.
 */
let shownThisLaunch = false;

export function hasShownReConsentThisLaunch(): boolean {
  return shownThisLaunch;
}

export function markReConsentShown(): void {
  shownThisLaunch = true;
}

/**
 * Test-only reset. Exported because the flag is module scope: without it the
 * trigger's own suite is order-dependent and can pass for the wrong reason.
 */
export function __resetReConsentTriggerForTests(): void {
  shownThisLaunch = false;
}

/**
 * Present `ReConsent` once per launch when the six conditions hold.
 *
 * Called from `CleanRootNavigator`'s body, where `activeRootRoute`,
 * `consentStatus` and the settings store already live — so it adds no new
 * subscriptions and, in particular, no second `navigationRef` listener.
 *
 * ⚠️ RULES OF HOOKS PUT THIS CALL ABOVE `if (!initialRoute) return
 * <LoadingScreen />`, so it DOES run during the pre-route window on every cold
 * launch. Condition (5) is the only thing keeping it inert there. Do not
 * "optimise" by moving the call below the early return — that is a conditional
 * hook call and React will throw.
 *
 * 🔴 FAIL CLOSED, AND NEVER THROW. A throw from this hook escapes
 * `CleanRootNavigator`'s body to `App.tsx`'s boundary and replaces the ENTIRE
 * app with the `Static988Button` fallback. A missing consent prompt is
 * recoverable on the next launch; a blanked navigator is a 988 degradation. So
 * the effect body swallows, logs, and does not present.
 *
 * `activeRootRoute` is a dependency, not just a guard input: it is what
 * re-evaluates the decision when the user leaves a crisis surface, and it is
 * also how the trigger learns the container became ready (`onReady` sets it —
 * `CleanRootNavigator.tsx:320`). That is why no `isReady()` retry loop is
 * needed here, unlike `RootCrisisButton`'s tap path, which has a live user
 * waiting on it.
 */
export function useReConsentTrigger(activeRootRoute: string | undefined): void {
  const consentStatus = useConsentStore((state) => state.consentStatus);
  const staleConsent = useConsentStore((state) => state.staleConsent);
  const currentConsent = useConsentStore((state) => state.currentConsent);
  const onboardingCompleted = useSettingsStore(
    (state) => state.settings?.onboardingCompleted === true,
  );

  useEffect(() => {
    try {
      const navigationReady = navigationRef.isReady();
      if (
        !shouldPresentReConsent({
          consentStatus,
          base: staleConsent ?? currentConsent,
          onboardingCompleted,
          activeRootRoute,
          navigationReady,
          shownThisLaunch,
        })
      ) {
        return;
      }

      // Order matters. Mark BEFORE navigating: if `navigate` throws, the catch
      // below swallows it and we must not retry into a loop on the next state
      // change. One presentation attempt per launch, whatever its outcome.
      markReConsentShown();
      navigationRef.navigate('ReConsent');
    } catch (error) {
      logError(
        LogCategory.SYSTEM,
        'Re-consent trigger failed — not presenting (fail-closed)',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }, [consentStatus, staleConsent, currentConsent, onboardingCompleted, activeRootRoute]);
}
