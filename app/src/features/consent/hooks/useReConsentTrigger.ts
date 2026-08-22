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
 *     (`consentStore.ts:738`), so a record without one resolves `'ineligible'`
 *     alongside the genuinely under-18 — which is why the destination's copy says
 *     we cannot establish 18+, never that the user is under 18. That sentence is
 *     true of both sub-cohorts and asserts nothing we do not know.
 *
 *     🔄 DEBUG-418 CHANGED THIS BRANCH'S OUTCOME, NOT ITS PREDICATE. It used to
 *     return a bare `false`, leaving under-18 holders of a stale record at Main —
 *     fail-closed, with `canPerformOperation` false for every operation, no
 *     re-consent prompt, and nothing explaining why (founder decision D2). The
 *     age check still excludes them from `ReConsentScreen`; it now routes them to
 *     a decline-only destination instead of nowhere.
 *
 *     Two things this deliberately does NOT do, because the item's own ACs got
 *     them backwards. It does not reorder `loadConsent` — version is tested
 *     before age to stop an Art. 7(3) withdrawal being re-prompted, and reordering
 *     would not help anyway: a 13-17-year-old on a v1.0.0 record carries
 *     `isEligible: TRUE`, because that flag was computed under the old 13+ gate,
 *     so they pass the age check and still resolve `version_mismatch`. And it does
 *     not touch `initialRoute`: `checkInitialRoute` tests `onboardingCompleted`
 *     FIRST and unconditionally, so a resolved-status change cannot move the route
 *     for anyone who has onboarded. The trigger layer is the only layer that can
 *     see this cohort, which is what `renewConsent`'s own comment says —
 *     "suppression belongs to the trigger layer".
 *
 *     The v1.0.0 cohort is currently EMPTY and this is a latent trap, not a live
 *     defect: `loadConsent` tests `version` before age (`consentStore.ts:901`
 *     before `:918`), and every grant post-dates the 18+ rule, so no record
 *     written under it can be v1.0.0. The LIVE superset — every onboarded user in
 *     `under_age`, `revoked` or `integrity_error` strands at Main for the same
 *     `onboardingCompleted`-first reason — is DEBUG-451 and is NOT fixed here.
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
 * The fail-closed statuses that get an EXPLANATION rather than a re-consent
 * prompt (DEBUG-451).
 *
 * 🔴 A SECOND, DISJOINT ALLOWLIST — never merged into the one above. Membership
 * here means "tell the user why the app is fail-closed"; membership there means
 * "offer a re-grant". Collapsing them would arm `ReConsentScreen` — the only
 * component that can produce an Art. 9(2)(a) affirmation — for a user who
 * withdrew consent (Art. 7(3)) or whose record we could not read at all. The
 * disjointness is pinned in `__tests__/useReConsentTrigger.privacy.test.ts`.
 *
 * All three are resolved from STATUS ALONE. `loadConsent` nulls both
 * `currentConsent` and `staleConsent` for `integrity_error` (`consentStore.ts:875-885`
 * and the catch at `:978-995`) and for `revoked` (`:887-897`), so a record-driven
 * read — which is what DEBUG-418 shipped — resolves `'none'` for two of the
 * three and strands them exactly as before.
 */
export const CONSENT_BLOCK_STATUSES: ReadonlySet<ConsentStatus> = new Set<ConsentStatus>([
  'integrity_error',
  'revoked',
  'under_age',
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
  /**
   * The first non-`'loading'` `consentStatus` of this launch, or `null` before
   * one has resolved. Gates the BLOCKED presentation only — see the latch note
   * on `resolveReConsentPresentation`.
   */
  launchStatus: ConsentStatus | null;
}

/**
 * What, if anything, the `ReConsent` route should present.
 *
 * - `'none'`    — do not navigate at all.
 * - `'renew'`   — present `ReConsentScreen`; the user can re-grant.
 * - `'ineligible'` — present the decline-only destination: they cannot re-grant,
 *                    but they must be told why rather than left at a Main where
 *                    every operation fails closed.
 *
 * 🔴 A THREE-WAY RESULT, NOT A BOOLEAN, AND THAT IS THE FIX. The boolean shape is
 * what encoded DEBUG-418: "not eligible to renew" and "should see nothing" are
 * different facts, and collapsing them into one `false` is what stranded the
 * cohort. Do not reintroduce a boolean wrapper for convenience.
 */
export type ReConsentPresentation = 'none' | 'renew' | 'ineligible' | 'blocked';

/**
 * Pure, total, and the single place the six conditions are evaluated.
 *
 * Extracted from the hook so every condition can be tested at its boundary
 * without a renderer, a navigator or a store — which is what makes the 17/18
 * age cases and the crisis-deferral case cheap enough to actually assert.
 *
 * The five non-age conditions are unchanged by DEBUG-418 and still resolve
 * `'none'`: the allowlist is NOT widened, and the crisis deferral applies to the
 * ineligible cohort exactly as it does to the renewable one — a minor sitting on
 * `CrisisResources` is not yanked onto a consent notice either.
 */
export function resolveReConsentPresentation(
  inputs: ReConsentTriggerInputs,
): ReConsentPresentation {
  const {
    consentStatus,
    base,
    onboardingCompleted,
    activeRootRoute,
    navigationReady,
    shownThisLaunch,
    launchStatus,
  } = inputs;

  const isBlockStatus = CONSENT_BLOCK_STATUSES.has(consentStatus);
  if (!RECONSENT_TRIGGER_STATUSES.has(consentStatus) && !isBlockStatus) return 'none';
  if (onboardingCompleted !== true) return 'none';
  if (shownThisLaunch) return 'none';
  if (!navigationReady) return 'none';

  // An undefined route is NOT a deferral route — condition (5) already covers
  // the pre-ready window, and treating "unknown" as "crisis" would suppress the
  // prompt for the wrong reason.
  //
  // 🔴 STAYS ABOVE THE STATUS BRANCHING BELOW. Every presentation defers on a
  // live crisis surface, on the same set — a user on `CrisisResources` is not
  // yanked onto a consent notice for ANY reason. Moving the DEBUG-451 branch
  // above this would exempt exactly the three statuses that reach it.
  if (activeRootRoute !== undefined && RECONSENT_DEFERRAL_ROUTES.has(activeRootRoute)) {
    return 'none';
  }

  /**
   * 🔴 DEBUG-451 — RESOLVED FROM STATUS, AND DELIBERATELY BEFORE THE `!base`
   * TAIL BELOW. That tail is why DEBUG-418's fix could not be widened to serve
   * these cohorts: `integrity_error` and `revoked` carry no record at all, so
   * they fall out at `'none'` — the stranding itself. Do not "simplify" this
   * branch below it.
   *
   * Reading the status rather than the record is also what keeps `revoked` safe.
   * `revokeConsent` leaves `currentConsent: revokedConsent` in memory —
   * non-null, and `isEligible` still true because it spreads the prior record
   * (`consentStore.ts:1417-1423`) — so a record-driven read would call a
   * withdrawal renewable and re-prompt it, an Art. 7(3) violation. Note the same
   * status has two in-memory shapes: non-null in-session, null after relaunch.
   *
   * THE LAUNCH LATCH. Presented only when this status was already resolved at
   * launch. `PrivacyDataScreen.tsx:183-190` calls `loadConsent()` in a mount
   * effect, so `valid → integrity_error` can flip MID-SESSION — and the deferral
   * above reads the ROOT route only, so it cannot see a nested crisis leaf such
   * as `VoiceReflection`'s journal-crisis banner under `Main`. Latching means a
   * mid-session flip cannot present at all; it surfaces on the next launch,
   * where the pre-route window makes a crisis leaf impossible. The alternative —
   * making the deferral leaf-aware — is larger and fails less safely.
   */
  if (isBlockStatus) {
    return launchStatus === consentStatus ? 'blocked' : 'none';
  }

  // Last, because it is the only condition that reads a record's contents.
  if (!base) return 'none';
  return isBaseEligibleForRenewal(base) ? 'renew' : 'ineligible';
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
 * 🔴 THE LAUNCH LATCH (DEBUG-451) — module scope for the same reason as the flag
 * above: it must die with the JS context so the next launch re-reads the status.
 *
 * Holds the FIRST non-`'loading'` `consentStatus` of this launch. `'loading'` is
 * excluded because it is the pre-resolution placeholder every launch starts in;
 * latching it would mean no status ever matches and nothing could present.
 */
let launchConsentStatus: ConsentStatus | null = null;

export function latchLaunchConsentStatus(status: ConsentStatus): void {
  if (launchConsentStatus === null && status !== 'loading') {
    launchConsentStatus = status;
  }
}

export function getLaunchConsentStatus(): ConsentStatus | null {
  return launchConsentStatus;
}

/**
 * Test-only reset. Exported because both the flag and the latch are module
 * scope: without it the trigger's own suite is order-dependent and can pass for
 * the wrong reason.
 */
export function __resetReConsentTriggerForTests(): void {
  shownThisLaunch = false;
  launchConsentStatus = null;
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
      // Before the predicate: the first non-'loading' status of this launch is
      // what the DEBUG-451 blocked branch is allowed to present from.
      latchLaunchConsentStatus(consentStatus);

      const navigationReady = navigationRef.isReady();
      const presentation = resolveReConsentPresentation({
        consentStatus,
        base: staleConsent ?? currentConsent,
        onboardingCompleted,
        activeRootRoute,
        navigationReady,
        shownThisLaunch,
        launchStatus: launchConsentStatus,
      });
      if (presentation === 'none') {
        return;
      }

      // 'renew' and 'ineligible' navigate to the SAME route. `ReConsentRoute`
      // re-derives which screen to mount from the same `isBaseEligibleForRenewal`
      // this function used, so there is one definition of the 18+ boundary and no
      // param to drift out of sync with the record. It also means the decision
      // cannot be spoofed by a caller constructing the route with a param.
      //
      // 🔴 'blocked' is a SECOND route, and carries no param either — DEBUG-451.
      // `ConsentBlockedRoute` re-reads `consentStatus` from the store to choose
      // its copy, for the same anti-spoofing reason. ONE route serves all three
      // statuses: every new root-route name is a fresh membership decision
      // against `SUPPRESSED_ROUTES`, and one a later author could add there "for
      // tidiness", silently switching the root 988 overlay off.
      const route = presentation === 'blocked' ? 'ConsentBlocked' : 'ReConsent';

      // Order matters. Mark BEFORE navigating: if `navigate` throws, the catch
      // below swallows it and we must not retry into a loop on the next state
      // change. One presentation attempt per launch, whatever its outcome — the
      // flag is SHARED across both routes, never per-status, so a status that
      // oscillates cannot present twice.
      markReConsentShown();
      navigationRef.navigate(route);
    } catch (error) {
      logError(
        LogCategory.SYSTEM,
        'Re-consent trigger failed — not presenting (fail-closed)',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }, [consentStatus, staleConsent, currentConsent, onboardingCompleted, activeRootRoute]);
}
