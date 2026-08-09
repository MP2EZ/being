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
function loadSeed(
  flag: string | undefined,
  /**
   * INFRA-317: the raw launch URL `Linking.getInitialURL()` resolves to. `null`
   * (the default) is the no-deep-link launch every existing test assumes, and
   * keeps their behaviour identical.
   */
  initialUrl: string | null = null,
  /** INFRA-317: make `getInitialURL()` reject, to pin the fail-safe direction. */
  rejectInitialUrl = false,
): { run: () => Promise<void>; mocks: SeedMocks } {
  jest.resetModules();

  jest.doMock('expo-linking', () => ({
    getInitialURL: rejectInitialUrl
      ? jest.fn().mockRejectedValue(new Error('no window yet'))
      : jest.fn().mockResolvedValue(initialUrl),
  }));

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

/**
 * INFRA-317 — ungranted-consent boot variant.
 *
 * The switch exists so one binary can boot BOTH seeded (every existing safety
 * flow) and unseeded (the INFRA-308 deep-link consent-gate flows, which can only
 * be exercised with consent ungranted). It is a pure SUPPRESSOR: its only power
 * is to skip the writes above.
 *
 * The first test in this block is the compliance-critical one. The switch must be
 * strictly weaker than the build-time gate it lives inside — able to decline a
 * grant, never to cause one — so that the boundary INFRA-217 established (eas.json
 * profile scoping, pinned by e2eSeedGate.config.test.ts) is entirely unchanged by
 * this item.
 */
describe('maybeSeedE2EOnboardedState — ungranted boot variant (INFRA-317)', () => {
  const UNGRANTED_URL = 'being://crisis?e2eSeed=ungranted';

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('COMPLIANCE: the marker cannot enable anything when the build flag is off', async () => {
    // The whole path lives inside the SEED_ACTIVE branch, so with the build var
    // at its 'false' default this is unreachable dead code. A marker URL must
    // therefore be as inert as no URL at all — it can never be the thing that
    // turns the seed on.
    for (const flag of [undefined, 'false', '1']) {
      const { run, mocks } = loadSeed(flag, UNGRANTED_URL);
      await run();
      expect(mocks.markOnboardingComplete).not.toHaveBeenCalled();
      expect(mocks.grantConsent).not.toHaveBeenCalled();
      expect(mocks.recordLegalGateConsents).not.toHaveBeenCalled();
      expect(mocks.verifyAge).not.toHaveBeenCalled();
      jest.resetModules();
    }
  });

  it('writes NOTHING when the marker is present (suppressor, not a mutator)', async () => {
    const { run, mocks } = loadSeed('true', UNGRANTED_URL);
    await run();

    // No writes at all — the ungranted state comes from Maestro's clearState +
    // clearKeychain, never from this code revoking or clearing a consent record.
    expect(mocks.markOnboardingComplete).not.toHaveBeenCalled();
    expect(mocks.recordLegalGateConsents).not.toHaveBeenCalled();
    expect(mocks.verifyAge).not.toHaveBeenCalled();
    expect(mocks.grantConsent).not.toHaveBeenCalled();
  });

  it('still resolves (the navigator gate must be released, or the app hangs)', async () => {
    const { run } = loadSeed('true', UNGRANTED_URL);
    await expect(run()).resolves.toBeUndefined();
  });

  it('seeds as usual when the launch URL carries no marker', async () => {
    const { run, mocks } = loadSeed('true', 'being://daily');
    await run();
    expect(mocks.markOnboardingComplete).toHaveBeenCalledTimes(1);
    expect(mocks.grantConsent).toHaveBeenCalledTimes(1);
  });

  it('seeds as usual on a plain launch with no deep link (the 7 existing flows)', async () => {
    const { run, mocks } = loadSeed('true', null);
    await run();
    expect(mocks.markOnboardingComplete).toHaveBeenCalledTimes(1);
    expect(mocks.grantConsent).toHaveBeenCalledTimes(1);
  });

  it('fails SAFE toward seeding when getInitialURL rejects', async () => {
    // The failure direction matters: degrading to "seed as usual" costs nothing,
    // whereas degrading to "skip the seed" would strand all 7 existing flows on
    // LegalGate and read as a mass regression.
    const { run, mocks } = loadSeed('true', null, true);
    await run();
    expect(mocks.markOnboardingComplete).toHaveBeenCalledTimes(1);
    expect(mocks.grantConsent).toHaveBeenCalledTimes(1);
  });
});
