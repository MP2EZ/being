/**
 * E2E onboarding state seed (INFRA-217).
 *
 * The Maestro safety-e2e gate runs against a no-dev-client EAS Release build
 * (`e2e-sim` profile, INFRA-216). That build boots/transitions slowly, and the
 * 16-question LegalGate + onboarding preamble in `_legal-and-onboarding.yaml` is
 * timing-fragile on it (~20 points, 0–1/5 consecutive passes). Rather than tune
 * an unbounded set of flow timeouts, we seed a real post-onboarding state at
 * launch so `CleanRootNavigator` routes straight to the Main tab, and the sim
 * safety flows start at the surface they actually test (`_seeded-home.yaml`).
 *
 * Gate: this is a strict no-op unless `EXPO_PUBLIC_E2E_SEED_ONBOARDED === 'true'`,
 * which is set ONLY in the `e2e-sim` EAS profile (eas.json build.e2e-sim.env).
 * Every real build resolves the var to its 'false' default, so the seed branch
 * never runs in production / preview / production-emergency. The compliance
 * boundary (no consent auto-grant in a shipping build) rests on that profile
 * scoping and is pinned by `__tests__/safety/e2eSeedGate.config.test.ts`.
 *
 * The seed writes REAL state via the same store APIs a user's LegalGate flow
 * uses — it does NOT weaken or bypass `useConsentStore.canPerformOperation(...)`.
 * Must run after `EncryptionService.initialize()` (consent persists to
 * SecureStore, which depends on the encryption keys).
 *
 * INFRA-317 adds a per-flow OPT-OUT (`E2E_SEED_UNGRANTED_MARKER`) so the same
 * binary can also boot with consent ungranted, which is the only state in which
 * the INFRA-308 deep-link consent-gate contracts can be exercised end-to-end. It
 * is a suppressor only — see the block comment on the marker below.
 */

import * as Linking from 'expo-linking';
import { env } from './env';
import { useSettingsStore } from '../stores/settingsStore';
import {
  useConsentStore,
  recordLegalGateConsents,
  type ConsentPreferences,
  type AgeVerification,
} from '../stores/consentStore';
import { logSystem, logError, LogCategory } from '../services/logging';

/**
 * Deterministic eligible birth year for the seeded age verification. Any year
 * giving an age ≥ 18 satisfies the `isEligible` gate that makes consentStatus
 * resolve to 'valid'; 1990 is comfortably clear of the 18+ boundary.
 */
const SEED_BIRTH_YEAR = 1990;

/** Whether the e2e-sim onboarding seed is enabled for this build. */
export const isE2EOnboardingSeedEnabled = (): boolean =>
  env.EXPO_PUBLIC_E2E_SEED_ONBOARDED === 'true';

const SEED_ACTIVE = isE2EOnboardingSeedEnabled();

/**
 * INFRA-317 — per-flow "boot ungranted" switch.
 *
 * The seed is a BUILD-time constant: `EXPO_PUBLIC_E2E_SEED_ONBOARDED` is inlined
 * by Expo's babel transform, so it cannot vary per flow. But the deep-link
 * consent-gate contracts (INFRA-308) can only be exercised from a build that
 * boots with consent UNGRANTED, while every other safety flow needs the seeded
 * boot. One binary, two boot states, chosen at launch.
 *
 * The channel is the initial deep-link URL, because it is the only runtime input
 * this app can already read at launch. iOS launch arguments were the obvious
 * candidate and are not viable: nothing in the app reads them, expo-constants
 * does not surface them to JS, and adding a native bridge would put new code on
 * the launch path of a Release binary that `extends: production` — an
 * unacceptable trade for a test affordance.
 *
 * The marker is invisible to navigation. `DeepLinkValidationService` strips every
 * query param outside its ALLOWED_PARAMS allow-list and rebuilds the URL from the
 * survivors, so `being://crisis?e2eSeed=ungranted` reaches the seed as a raw
 * string here and reaches React Navigation as plain `being://crisis`. The link
 * under test is therefore unmodified by the mechanism that selects the boot state.
 *
 * ── SAFETY / COMPLIANCE BOUNDARY (crisis + compliance review, INFRA-217/317) ──
 * This switch is a pure SUPPRESSOR and must stay one. It may only cause the seed
 * to skip its writes; it may NEVER write, clear, or revoke a consent record. It
 * does not need to: the ungranted state comes from Maestro's existing
 * `clearState` + `clearKeychain`, which is where a fresh install starts anyway.
 * A switch that could mutate a consent record is the one shape capable of zeroing
 * out a real user's consent, and it is not built here.
 *
 * It is also read ONLY inside the `SEED_ACTIVE` branch below, so with the build
 * var at its 'false' default the whole path is unreachable dead code. The
 * compliance boundary therefore remains exactly where INFRA-217 put it — eas.json
 * profile scoping, pinned by `__tests__/safety/e2eSeedGate.config.test.ts` — and
 * this item adds NO new env var and NO new EAS profile. Strictly weaker than the
 * existing mechanism: it can only decline to grant, never grant.
 */
export const E2E_SEED_UNGRANTED_MARKER = 'e2eSeed=ungranted';

/**
 * How long to wait on `getInitialURL()` before falling back to the normal seed.
 * A hung or slow resolution must degrade to today's behaviour, not to a boot that
 * silently skips the seed and strands every other safety flow on LegalGate.
 */
const INITIAL_URL_TIMEOUT_MS = 3000;

/**
 * True when this launch carries the ungranted-boot marker. Any failure, timeout,
 * or absent URL answers `false`, so the 7 existing seeded flows keep today's
 * exact behaviour — the failure direction is "seed as usual", never "skip".
 */
async function isUngrantedBootRequested(): Promise<boolean> {
  try {
    const url = await Promise.race([
      Linking.getInitialURL(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), INITIAL_URL_TIMEOUT_MS)),
    ]);
    return typeof url === 'string' && url.includes(E2E_SEED_UNGRANTED_MARKER);
  } catch {
    return false;
  }
}

// Module-level "seed gate" promise. CleanRootNavigator awaits it BEFORE reading
// persisted state, so its FIRST route resolution sees the seeded onboarding +
// consent (rather than racing the seed and resolving to LegalGate — which would
// stick, since `initialRouteName` only applies on first navigator mount).
//
// Why a gate promise instead of conditionally mounting the navigator: a
// `null → <CleanRootNavigator/>` conditional mount silently failed to commit in
// the SDK-56 Release build (the navigator function was never invoked). Mounting
// it unconditionally — exactly as a real build does — and deferring only the
// *route decision* is the robust pattern.
//
// Resolved by `maybeSeedE2EOnboardedState()` (after EncryptionService.initialize),
// so it is created pending at module load and resolved once the seed lands.
let resolveSeedGate: () => void = () => {};
const seedGate: Promise<void> = SEED_ACTIVE
  ? new Promise<void>((resolve) => {
      resolveSeedGate = resolve;
    })
  : Promise.resolve();

/**
 * Awaited by CleanRootNavigator before reading persisted state. Resolves
 * immediately in every real build (seed disabled). In the e2e-sim build it
 * resolves when the seed completes, with a safety timeout so the navigator can
 * never hang on its LoadingScreen if the seed never runs.
 */
export function whenE2ESeedComplete(): Promise<void> {
  if (!SEED_ACTIVE) return Promise.resolve();
  return Promise.race([
    seedGate,
    new Promise<void>((resolve) => setTimeout(resolve, 15000)),
  ]);
}

/**
 * Seed legal consents + age verification + onboarding-complete so the app boots
 * straight to Main. No-op unless the e2e-sim seed flag is set. Non-blocking: any
 * failure is logged and swallowed, and the seed gate is always released so a
 * flaky seed never black-screens the build.
 */
export async function maybeSeedE2EOnboardedState(): Promise<void> {
  if (!SEED_ACTIVE) return;

  try {
    // INFRA-317: ungranted-boot variant. Deliberately the FIRST thing inside the
    // try, and a bare `return` — every write below is skipped, nothing is
    // written, cleared, or revoked. `finally` still releases the seed gate, so
    // CleanRootNavigator proceeds and resolves its route from real (empty) state:
    // onboardingCompleted false + consentStatus 'missing' → LegalGate.
    if (await isUngrantedBootRequested()) {
      logSystem(
        '[E2ESeed] Ungranted-consent boot requested (INFRA-317) — skipping all seed writes',
      );
      return;
    }

    logSystem('[E2ESeed] Seeding post-onboarding state for e2e-sim build (INFRA-217)');

    // 1. Onboarding flag — CleanRootNavigator checks `onboardingCompleted` FIRST,
    //    before consent. loadSettings() creates defaults if none exist yet
    //    (launchApp { clearState } wipes them every run).
    const settings = useSettingsStore.getState();
    await settings.loadSettings();
    await settings.markOnboardingComplete();

    // 2. Legal-gate consents — mirrors what CombinedLegalGateScreen records.
    await recordLegalGateConsents({
      tosAccepted: true,
      privacyAccepted: true,
      wellnessDisclaimerAcknowledged: true,
      mentalHealthProcessingConsent: true,
    });

    // 3. Age verification (≥18) + full consent record via the real store API.
    //    `mentalHealthProcessingConsent` is the GDPR Art. 9(2)(a) explicit consent.
    //    It is seeded true to mirror a fully-consented user, NOT because anything
    //    depends on it: this comment used to claim it "unlocks the assessment /
    //    check-in screens the safety flows exercise," which was never true and is a
    //    trap. Nothing gates on it — `canPerformOperation('mental_health_processing')`
    //    has zero production callers and `consentCache.canProcessMentalHealthData` has
    //    no consumer outside consentStore. A reader who believed the old comment would
    //    conclude that refusing this consent blocks assessments and therefore blocks
    //    crisis detection; it blocks neither. Enforcement is FEAT-318.
    const { verifyAge, grantConsent } = useConsentStore.getState();
    const { age, eligible } = await verifyAge(SEED_BIRTH_YEAR);
    const ageVerification: AgeVerification = {
      verified: true,
      birthYear: SEED_BIRTH_YEAR,
      ageAtVerification: age,
      verifiedAt: Date.now(),
      isEligible: eligible,
    };
    const preferences: ConsentPreferences = {
      analyticsEnabled: true,
      crashReportsEnabled: true,
      cloudSyncEnabled: true,
      researchEnabled: true,
      mentalHealthProcessingConsent: true,
    };
    await grantConsent(preferences, ageVerification);

    logSystem('[E2ESeed] Post-onboarding state seeded; navigator will route to Main');
  } catch (error) {
    logError(
      LogCategory.SYSTEM,
      '[E2ESeed] Failed to seed post-onboarding state (non-blocking)',
      error as Error,
    );
  } finally {
    // Always release the navigator's route-decision gate, even on failure.
    resolveSeedGate();
  }
}
