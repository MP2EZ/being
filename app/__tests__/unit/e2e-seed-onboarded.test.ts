/**
 * Unit tests for the e2e-sim onboarding seed gate (INFRA-217).
 *
 * `maybeSeedE2EOnboardedState()` writes a real post-onboarding state (onboarding
 * flag + legal-gate consents + age verification + full consent record) at launch
 * so the Maestro safety flows start at the Main tab instead of traversing the
 * 16-question onboarding preamble on the slow e2e-sim Release build.
 *
 * Compliance boundary (INFRA-217 AC, `compliance` agent review):
 *   - The seed is a strict no-op unless `env.EXPO_PUBLIC_E2E_SEED_ONBOARDED === 'true'`
 *     — that var is set ONLY in the e2e-sim EAS profile. These tests pin both branches.
 *   - The seed uses the REAL store APIs (grantConsent / verifyAge / recordLegalGateConsents);
 *     it does NOT weaken `canPerformOperation(...)`. The eas.json profile scoping is pinned
 *     separately in `__tests__/safety/e2eSeedGate.config.test.ts`.
 */

const SEED_MODULE = '@/core/config/e2eSeed';

interface SeedMocks {
  loadSettings: jest.Mock;
  markOnboardingComplete: jest.Mock;
  grantConsent: jest.Mock;
  verifyAge: jest.Mock;
  recordLegalGateConsents: jest.Mock;
  logSystem: jest.Mock;
  logError: jest.Mock;
}

/**
 * Re-require the seed module with the env flag set to `flag` and all store /
 * logging dependencies mocked. Returns the loaded module plus the mock fns so a
 * test can assert which store APIs were (or were not) called.
 */
function loadSeed(flag: string | undefined): { run: () => Promise<void>; mocks: SeedMocks } {
  jest.resetModules();

  const mocks: SeedMocks = {
    loadSettings: jest.fn().mockResolvedValue(null),
    markOnboardingComplete: jest.fn().mockResolvedValue(undefined),
    grantConsent: jest.fn().mockResolvedValue(undefined),
    verifyAge: jest.fn().mockResolvedValue({ eligible: true, age: 36 }),
    recordLegalGateConsents: jest.fn().mockResolvedValue(undefined),
    logSystem: jest.fn(),
    logError: jest.fn(),
  };

  jest.doMock('@/core/config/env', () => ({
    env: { EXPO_PUBLIC_E2E_SEED_ONBOARDED: flag },
  }));
  jest.doMock('@/core/stores/settingsStore', () => ({
    useSettingsStore: {
      getState: () => ({
        loadSettings: mocks.loadSettings,
        markOnboardingComplete: mocks.markOnboardingComplete,
      }),
    },
  }));
  jest.doMock('@/core/stores/consentStore', () => ({
    useConsentStore: {
      getState: () => ({ verifyAge: mocks.verifyAge, grantConsent: mocks.grantConsent }),
    },
    recordLegalGateConsents: mocks.recordLegalGateConsents,
  }));
  jest.doMock('@/core/services/logging', () => ({
    logSystem: mocks.logSystem,
    logError: mocks.logError,
    LogCategory: { SYSTEM: 'system' },
  }));

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(SEED_MODULE) as { maybeSeedE2EOnboardedState: () => Promise<void> };
  return { run: mod.maybeSeedE2EOnboardedState, mocks };
}

describe('maybeSeedE2EOnboardedState — gate (INFRA-217)', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('is a no-op when the flag is unset (real builds)', async () => {
    const { run, mocks } = loadSeed(undefined);
    await run();
    expect(mocks.markOnboardingComplete).not.toHaveBeenCalled();
    expect(mocks.grantConsent).not.toHaveBeenCalled();
    expect(mocks.recordLegalGateConsents).not.toHaveBeenCalled();
    expect(mocks.verifyAge).not.toHaveBeenCalled();
  });

  it("is a no-op when the flag is the string 'false'", async () => {
    const { run, mocks } = loadSeed('false');
    await run();
    expect(mocks.markOnboardingComplete).not.toHaveBeenCalled();
    expect(mocks.grantConsent).not.toHaveBeenCalled();
  });

  it("does not treat a non-'true' truthy value ('1') as enabled", async () => {
    const { run, mocks } = loadSeed('1');
    await run();
    expect(mocks.markOnboardingComplete).not.toHaveBeenCalled();
    expect(mocks.grantConsent).not.toHaveBeenCalled();
  });

  describe("when the flag is exactly 'true' (e2e-sim profile)", () => {
    it('marks onboarding complete (routing checks this first)', async () => {
      const { run, mocks } = loadSeed('true');
      await run();
      expect(mocks.markOnboardingComplete).toHaveBeenCalledTimes(1);
    });

    it('records legal-gate consents with mental-health processing consent', async () => {
      const { run, mocks } = loadSeed('true');
      await run();
      expect(mocks.recordLegalGateConsents).toHaveBeenCalledWith(
        expect.objectContaining({
          tosAccepted: true,
          privacyAccepted: true,
          wellnessDisclaimerAcknowledged: true,
          mentalHealthProcessingConsent: true,
        }),
      );
    });

    it('grants a full consent record with an eligible (18+) age verification', async () => {
      const { run, mocks } = loadSeed('true');
      await run();
      expect(mocks.verifyAge).toHaveBeenCalledTimes(1);
      expect(mocks.grantConsent).toHaveBeenCalledTimes(1);

      const [prefs, ageVerification] = mocks.grantConsent.mock.calls[0];
      // mentalHealthProcessingConsent unlocks the assessment / check-in screens
      // the safety flows exercise (GDPR Art. 9(2)(a)).
      expect(prefs.mentalHealthProcessingConsent).toBe(true);
      expect(ageVerification.verified).toBe(true);
      expect(ageVerification.isEligible).toBe(true);
    });

    it('is non-blocking: a store failure is swallowed, not thrown', async () => {
      const { run, mocks } = loadSeed('true');
      mocks.grantConsent.mockRejectedValueOnce(new Error('SecureStore unavailable'));
      await expect(run()).resolves.toBeUndefined();
      expect(mocks.logError).toHaveBeenCalled();
    });
  });
});
