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
 */

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
    //    mentalHealthProcessingConsent unlocks the assessment / check-in screens
    //    the safety flows exercise (GDPR Art. 9(2)(a) explicit consent).
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
