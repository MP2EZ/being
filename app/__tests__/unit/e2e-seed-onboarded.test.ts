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
  seedStaleConsentRecord: jest.Mock;
  logSystem: jest.Mock;
  logError: jest.Mock;
  /** FEAT-570: the bug-report visibility flag the `e2eOpen=bugreport` marker raises. */
  openBugReport: jest.Mock;
  /** INFRA-532: the weekly-reflection precondition's store seam. */
  loadPersistedState: jest.Mock;
  markCheckInComplete: jest.Mock;
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
  /**
   * MAINT-748: pin the system clock BEFORE the module is required. The ineligible
   * cohort's birth year is computed from `new Date()` at module load, so it can
   * only be controlled by setting the time first. Installs fake timers; a caller
   * that passes this must restore real timers (the blocks below do, in afterEach).
   */
  systemTime?: Date,
): {
  run: () => Promise<void>;
  whenE2ESeedComplete: () => Promise<void>;
  mocks: SeedMocks;
} {
  jest.resetModules();
  if (systemTime) jest.useFakeTimers({ now: systemTime });

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
    seedStaleConsentRecord: jest.fn().mockResolvedValue(true),
    logSystem: jest.fn(),
    logError: jest.fn(),
    openBugReport: jest.fn(),
    loadPersistedState: jest.fn().mockResolvedValue(undefined),
    markCheckInComplete: jest.fn().mockResolvedValue(undefined),
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
    __seedStaleConsentRecordForE2E: mocks.seedStaleConsentRecord,
  }));
  jest.doMock('@/core/stores/bugReportStore', () => ({
    openBugReport: mocks.openBugReport,
  }));
  jest.doMock('@/features/practices/stores/stoicPracticeStore', () => ({
    useStoicPracticeStore: {
      getState: () => ({
        loadPersistedState: mocks.loadPersistedState,
        markCheckInComplete: mocks.markCheckInComplete,
      }),
    },
  }));
  jest.doMock('@/core/services/logging', () => ({
    logSystem: mocks.logSystem,
    logError: mocks.logError,
    LogCategory: { SYSTEM: 'system' },
  }));

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(SEED_MODULE) as {
    maybeSeedE2EOnboardedState: () => Promise<void>;
    whenE2ESeedComplete: () => Promise<void>;
  };
  return {
    run: mod.maybeSeedE2EOnboardedState,
    whenE2ESeedComplete: mod.whenE2ESeedComplete,
    mocks,
  };
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

/**
 * INFRA-377 — stale-consent boot variant.
 *
 * Rides the same launch-URL channel as INFRA-317's marker, but is a WRITER
 * rather than a suppressor: no real store API can produce a version-mismatched
 * record, so the Maestro re-consent flow has no other way to reach that state.
 *
 * Its posture is the ORIGINAL seed's — gated solely by SEED_ACTIVE — not
 * INFRA-317's stricter suppressor rule. The first test here is what holds that
 * boundary in place. The shape of the record the seam actually persists is
 * pinned separately, against the real store, in
 * `src/core/stores/__tests__/consentStaleSeed.privacy.test.ts`.
 */
describe('maybeSeedE2EOnboardedState — stale-consent boot variant (INFRA-377)', () => {
  const STALE_URL = 'being://daily?e2eSeed=stale';

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('COMPLIANCE: the marker forges nothing when the build flag is off', async () => {
    // The strongest assertion in this block. The forge lives inside the
    // SEED_ACTIVE branch, so with the build var at its 'false' default a marker
    // URL arriving at a shipping build must do exactly nothing.
    for (const flag of [undefined, 'false', '1']) {
      const { run, mocks } = loadSeed(flag, STALE_URL);
      await run();
      expect(mocks.seedStaleConsentRecord).not.toHaveBeenCalled();
      expect(mocks.grantConsent).not.toHaveBeenCalled();
      expect(mocks.markOnboardingComplete).not.toHaveBeenCalled();
      jest.clearAllMocks();
    }
  });

  it('forges a stale record instead of granting a current one', async () => {
    const { run, mocks } = loadSeed('true', STALE_URL);
    await run();

    expect(mocks.seedStaleConsentRecord).toHaveBeenCalledTimes(1);
    // The distinguishing property: `grantConsent` stamps CONSENT_VERSION, so
    // calling it here would produce 'valid' and the re-consent screen would
    // never present.
    expect(mocks.grantConsent).not.toHaveBeenCalled();
  });

  it('seeds the prior policy version, parseable and older', async () => {
    // `computeConsentDelta` falls back to the generic "something changed" copy
    // for anything unparseable or newer, so a typo'd version renders a PASSING
    // screen showing the wrong text — a silent wrong-fixture failure.
    const { run, mocks } = loadSeed('true', STALE_URL);
    await run();

    const [seedVariant] = mocks.seedStaleConsentRecord.mock.calls[0];
    expect(seedVariant.version).toBe('1.0.0');
  });

  it('marks onboarding complete, or the navigator routes to LegalGate instead', async () => {
    // CleanRootNavigator checks `onboardingCompleted` BEFORE consent. Without
    // this the app never reaches Main, so ReConsent has nothing to present over
    // and the flow times out opaquely at 90s.
    const { run, mocks } = loadSeed('true', STALE_URL);
    await run();
    expect(mocks.markOnboardingComplete).toHaveBeenCalledTimes(1);
  });

  it('carries an eligible age verification through to the forged record', async () => {
    // `isBaseEligibleForRenewal` fails closed on a missing or non-finite
    // birthYear, which would route the device flow to
    // StaleConsentIneligibleScreen instead of ReConsentScreen.
    const { run, mocks } = loadSeed('true', STALE_URL);
    await run();

    const [seedVariant] = mocks.seedStaleConsentRecord.mock.calls[0];
    expect(seedVariant.ageVerification.verified).toBe(true);
    expect(seedVariant.ageVerification.isEligible).toBe(true);
    expect(Number.isFinite(seedVariant.ageVerification.birthYear)).toBe(true);
  });

  it('does not write a legal-gate record (its version stamp would be incoherent)', async () => {
    // `recordLegalGateConsents` stamps CONSENT_VERSION, which would leave a
    // v1.1.0 legal-gate record beside a v1.0.0 consent record — a state no real
    // user could occupy. The screen's own dual-write creates it on submit, which
    // is the behaviour under test.
    const { run, mocks } = loadSeed('true', STALE_URL);
    await run();
    expect(mocks.recordLegalGateConsents).not.toHaveBeenCalled();
  });

  it('is mutually exclusive with the ungranted marker, which wins', async () => {
    // Both markers on one URL is a flow-authoring error. The suppressor is
    // checked first, so the failure direction is "write nothing" rather than
    // "write something the flow did not ask for".
    const { run, mocks } = loadSeed('true', 'being://daily?e2eSeed=ungranted&e2eSeed=stale');
    await run();
    expect(mocks.seedStaleConsentRecord).not.toHaveBeenCalled();
    expect(mocks.grantConsent).not.toHaveBeenCalled();
  });

  it('is non-blocking: a forge failure is swallowed, not thrown', async () => {
    const { run, mocks } = loadSeed('true', STALE_URL);
    mocks.seedStaleConsentRecord.mockRejectedValueOnce(new Error('SecureStore unavailable'));
    await expect(run()).resolves.toBeUndefined();
    expect(mocks.logError).toHaveBeenCalled();
  });
});


/**
 * INFRA-481 — the INELIGIBLE stale-consent cohort (MAINT-748).
 *
 * `isEligible: true` ON AN INELIGIBLE RECORD IS INTENTIONAL, not a typo: every
 * v1.0.0 record was written under the pre-DEBUG-150 13+ gate, so a real
 * 14-year-old's record legitimately carries `isEligible: true`, and only the age
 * re-derivation downstream catches it. Seeding `false` would bail at the first
 * arm of `isBaseEligibleForRenewal` and exercise none of that. This block pins
 * the literal as-is; do not "fix" it to `false`.
 *
 * `verifyAge` is deliberately NOT called here (unlike the renewable stale
 * branch): it recomputes eligibility against today's MINIMUM_CONSENT_AGE and
 * side-writes a contradictory pair no real prior-policy install can hold.
 */
describe('maybeSeedE2EOnboardedState — ineligible stale-consent variant (INFRA-481)', () => {
  const INELIGIBLE_URL = 'being://daily?e2eSeed=ineligible';
  // Deliberately NOT the real current year, so a birth year that ignored the
  // system clock (a hardcoded literal) could not pass by coincidence.
  const FAKE_NOW = new Date('2031-06-15T12:00:00.000Z');

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.useRealTimers();
  });

  it('COMPLIANCE: the marker forges nothing when the build flag is off', async () => {
    for (const flag of [undefined, 'false', '1']) {
      const { run, mocks } = loadSeed(flag, INELIGIBLE_URL);
      await run();
      expect(mocks.seedStaleConsentRecord).not.toHaveBeenCalled();
      expect(mocks.markOnboardingComplete).not.toHaveBeenCalled();
      expect(mocks.grantConsent).not.toHaveBeenCalled();
      jest.clearAllMocks();
    }
  });

  it('forges exactly one v1.0.0 minor record whose isEligible is TRUE (intentional)', async () => {
    const { run, mocks } = loadSeed('true', INELIGIBLE_URL, false, FAKE_NOW);
    await run();

    expect(mocks.markOnboardingComplete).toHaveBeenCalledTimes(1);
    expect(mocks.seedStaleConsentRecord).toHaveBeenCalledTimes(1);

    const currentYear = new Date().getFullYear();
    expect(currentYear).toBe(2031);
    expect(mocks.seedStaleConsentRecord).toHaveBeenCalledWith({
      version: '1.0.0',
      ageVerification: {
        verified: true,
        birthYear: currentYear - 14,
        ageAtVerification: 14,
        verifiedAt: expect.any(Number),
        isEligible: true,
      },
    });
  });

  it('derives the birth year from the clock, never a literal', async () => {
    const later = new Date('2040-02-01T12:00:00.000Z');
    const { run, mocks } = loadSeed('true', INELIGIBLE_URL, false, later);
    await run();

    const [seedVariant] = mocks.seedStaleConsentRecord.mock.calls[0];
    expect(seedVariant.ageVerification.birthYear).toBe(2040 - 14);
    expect(seedVariant.ageVerification.ageAtVerification).toBe(14);
  });

  it('does not route through verifyAge, grantConsent, legal-gate or check-in writes', async () => {
    const { run, mocks } = loadSeed('true', INELIGIBLE_URL, false, FAKE_NOW);
    await run();

    expect(mocks.verifyAge).not.toHaveBeenCalled();
    expect(mocks.grantConsent).not.toHaveBeenCalled();
    expect(mocks.recordLegalGateConsents).not.toHaveBeenCalled();
    expect(mocks.markCheckInComplete).not.toHaveBeenCalled();
  });

  it('is not swallowed by the renewable stale marker (the token is not a prefix collision)', async () => {
    // 'e2eSeed=ineligible' must not contain 'e2eSeed=stale'; if it did, verifyAge
    // would run here because the renewable branch is checked first.
    const { run, mocks } = loadSeed('true', INELIGIBLE_URL, false, FAKE_NOW);
    await run();
    expect(mocks.verifyAge).not.toHaveBeenCalled();
    expect(mocks.seedStaleConsentRecord).toHaveBeenCalledTimes(1);
  });
});

/**
 * FEAT-570 — `e2eOpen=bugreport` raises the bug-report form at boot (MAINT-748).
 *
 * It rides its OWN key, not an `e2eSeed=` value, so it composes with the ungranted
 * marker: the pair boots to LegalGate with a claim already standing, the state a
 * root-armed shake produces for real. It writes nothing; it only sets a
 * visibility flag, and lives inside the same SEED_ACTIVE branch as every marker.
 */
describe('maybeSeedE2EOnboardedState — bug-report open marker (FEAT-570)', () => {
  const BUGREPORT_URL = 'being://daily?e2eOpen=bugreport';
  const UNGRANTED_AND_BUGREPORT_URL = 'being://crisis?e2eSeed=ungranted&e2eOpen=bugreport';
  // Fake timers, so the launch-URL race's 3s fallback timer is not left dangling.
  const FAKE_NOW = new Date('2031-06-15T12:00:00.000Z');

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.useRealTimers();
  });

  const expectNoSeedWrites = (mocks: SeedMocks): void => {
    expect(mocks.loadSettings).not.toHaveBeenCalled();
    expect(mocks.markOnboardingComplete).not.toHaveBeenCalled();
    expect(mocks.verifyAge).not.toHaveBeenCalled();
    expect(mocks.grantConsent).not.toHaveBeenCalled();
    expect(mocks.recordLegalGateConsents).not.toHaveBeenCalled();
    expect(mocks.seedStaleConsentRecord).not.toHaveBeenCalled();
    expect(mocks.loadPersistedState).not.toHaveBeenCalled();
    expect(mocks.markCheckInComplete).not.toHaveBeenCalled();
  };

  it('with the ungranted marker: opens the form once and writes nothing', async () => {
    const { run, mocks } = loadSeed('true', UNGRANTED_AND_BUGREPORT_URL, false, FAKE_NOW);
    await run();

    expect(mocks.openBugReport).toHaveBeenCalledTimes(1);
    expectNoSeedWrites(mocks);
  });

  it('alone: opens the form once AND still runs the full default seed', async () => {
    const { run, mocks } = loadSeed('true', BUGREPORT_URL, false, FAKE_NOW);
    await run();

    expect(mocks.openBugReport).toHaveBeenCalledTimes(1);
    expect(mocks.markOnboardingComplete).toHaveBeenCalledTimes(1);
    expect(mocks.recordLegalGateConsents).toHaveBeenCalledTimes(1);
    expect(mocks.verifyAge).toHaveBeenCalledTimes(1);
    expect(mocks.grantConsent).toHaveBeenCalledTimes(1);
    expect(mocks.seedStaleConsentRecord).not.toHaveBeenCalled();
    // INFRA-532: four distinct check-in types, and never 'daily'.
    expect(mocks.markCheckInComplete.mock.calls.map(([type]) => type)).toEqual([
      'morning',
      'midday',
      'evening',
      'learn',
    ]);
  });

  it('raises the form BEFORE any seed write, so the claim stands before a route resolves', async () => {
    const { run, mocks } = loadSeed('true', BUGREPORT_URL, false, FAKE_NOW);
    await run();

    const opened = mocks.openBugReport.mock.invocationCallOrder[0];
    const firstWrite = mocks.markOnboardingComplete.mock.invocationCallOrder[0];
    expect(opened).toBeLessThan(firstWrite);
  });

  it('does not open the form when the launch URL carries no marker', async () => {
    const { run, mocks } = loadSeed('true', 'being://daily', false, FAKE_NOW);
    await run();

    expect(mocks.openBugReport).not.toHaveBeenCalled();
    expect(mocks.grantConsent).toHaveBeenCalledTimes(1);
  });

  it('COMPLIANCE: neither opens the form nor seeds when the build flag is off', async () => {
    for (const flag of [undefined, 'false', '1']) {
      const { run, mocks } = loadSeed(flag, BUGREPORT_URL, false, FAKE_NOW);
      await run();
      expect(mocks.openBugReport).not.toHaveBeenCalled();
      expectNoSeedWrites(mocks);
      jest.clearAllMocks();
    }
  });
});

/**
 * The navigator's route-decision gate (MAINT-748).
 *
 * `CleanRootNavigator` awaits `whenE2ESeedComplete()` before reading persisted
 * state. The 15s timeout is the safety net that stops a seed which never runs
 * from black-screening the build on its LoadingScreen, so its boundary is pinned
 * exactly: still pending one millisecond early, resolved on the dot.
 */
describe('whenE2ESeedComplete — the navigator gate', () => {
  const FAKE_NOW = new Date('2031-06-15T12:00:00.000Z');

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.useRealTimers();
  });

  it('stays pending at 14999ms and resolves at 15000ms when the seed never runs', async () => {
    const { whenE2ESeedComplete } = loadSeed('true', null, false, FAKE_NOW);

    let settled = false;
    void whenE2ESeedComplete().then(() => {
      settled = true;
    });

    await jest.advanceTimersByTimeAsync(14999);
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
  });

  it('resolves without waiting for the timeout once the seed has completed', async () => {
    const { run, whenE2ESeedComplete } = loadSeed('true', null, false, FAKE_NOW);
    await run();

    let settled = false;
    void whenE2ESeedComplete().then(() => {
      settled = true;
    });
    // Microtasks only: no timer is advanced.
    await Promise.resolve();
    await Promise.resolve();

    expect(settled).toBe(true);
  });

  it.each([undefined, 'false', '1'])(
    'resolves immediately, scheduling no timer, when the flag is %s',
    async (flag) => {
      const { whenE2ESeedComplete } = loadSeed(flag, null, false, FAKE_NOW);

      await expect(whenE2ESeedComplete()).resolves.toBeUndefined();
      expect(jest.getTimerCount()).toBe(0);
    },
  );
});
