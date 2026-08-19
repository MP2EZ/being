/**
 * INFRA-377 — the e2e-only stale-consent record forge.
 *
 * `grantConsent` hardcodes `version: CONSENT_VERSION` (`consentStore.ts:1012`)
 * and `renewConsent` does the same (`:1202`), so NO public store API can produce
 * a record that `loadConsent` classifies as `version_mismatch`. The Maestro
 * safety gate needs exactly that state to exercise the re-consent flow on
 * device, so this seam forges one — the single field a real user flow can never
 * write — and lets everything downstream run through the real classification.
 *
 * WHY A NAMED SEAM RATHER THAN A `versionOverride` OPTION ON `grantConsent`
 * ========================================================================
 * `grantConsent` is what `CombinedLegalGateScreen` calls for every real user. An
 * innocuous options parameter there can be reached without the caller noticing
 * they have crossed into test-only territory; an unmistakably-named export
 * cannot be wired into a real screen by accident. Same convention as
 * `__resetReConsentTriggerForTests`.
 *
 * Sited `*.privacy.test.ts`, NOT `consentStore.test.ts` — that file is on
 * `app/scripts/ci-uncovered-tests.json` and matches no CI or precommit
 * `--testPathPattern`, so a spec written there is documentation, not a gate.
 *
 * The build-time gate itself (eas.json profile scoping) is pinned separately in
 * `__tests__/safety/e2eSeedGate.config.test.ts`.
 */

import type { AgeVerification, ConsentRecord } from '../consentStore';

const STORE_MODULE = '../consentStore';

/** The real prior policy version. DEBUG-150 bumped 1.0.0 → 1.1.0. */
const PRIOR_VERSION = '1.0.0';

interface LoadedStore {
  __seedStaleConsentRecordForE2E: (variant: {
    version: string;
    ageVerification: AgeVerification;
  }) => Promise<boolean>;
  CONSENT_VERSION: string;
  setItemAsync: jest.Mock;
}

/**
 * Re-require the store with the build gate set to `flag` and SecureStore mocked,
 * so a test can read the record that was actually persisted.
 */
function loadStore(flag: string | undefined): LoadedStore {
  jest.resetModules();

  const setItemAsync = jest.fn().mockResolvedValue(undefined);
  jest.doMock('expo-secure-store', () => ({
    setItemAsync,
    getItemAsync: jest.fn().mockResolvedValue(null),
    deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  }));
  jest.doMock('@/core/config/env', () => ({
    env: { EXPO_PUBLIC_E2E_SEED_ONBOARDED: flag },
  }));

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(STORE_MODULE);
  return { ...mod, setItemAsync };
}

/**
 * Variant factory. Deliberately parameterized rather than a frozen literal: a
 * follow-up item adds a DEBUG-418 ineligible-cohort variant (a 13–17 birth year
 * or a missing one), and a suite hardcoding one shape would have to be rewritten
 * rather than extended.
 */
const variant = (over: Partial<AgeVerification> = {}) => ({
  version: PRIOR_VERSION,
  ageVerification: {
    verified: true,
    birthYear: 1990,
    ageAtVerification: 36,
    verifiedAt: Date.now(),
    isEligible: true,
    ...over,
  } as AgeVerification,
});

const writtenRecord = (store: LoadedStore): ConsentRecord => {
  expect(store.setItemAsync).toHaveBeenCalledTimes(1);
  const [key, payload] = store.setItemAsync.mock.calls[0];
  expect(key).toBe('consent_record_v1');
  return JSON.parse(payload) as ConsentRecord;
};

afterEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});

describe('__seedStaleConsentRecordForE2E — build-time gate', () => {
  // COMPLIANCE: the forge must be structurally unreachable in every shippable
  // build. `EXPO_PUBLIC_E2E_SEED_ONBOARDED` is set only in the `e2e-sim` EAS
  // profile; every real build resolves it to its 'false' default.
  it.each([
    ['unset', undefined],
    ['the string "false"', 'false'],
    ['a non-"true" truthy value ("1")', '1'],
  ])('writes nothing when the flag is %s', async (_label, flag) => {
    const store = loadStore(flag as string | undefined);
    await expect(store.__seedStaleConsentRecordForE2E(variant())).resolves.toBe(false);
    expect(store.setItemAsync).not.toHaveBeenCalled();
  });

  it("forges the record when the flag is exactly 'true'", async () => {
    const store = loadStore('true');
    await expect(store.__seedStaleConsentRecordForE2E(variant())).resolves.toBe(true);
    expect(store.setItemAsync).toHaveBeenCalledTimes(1);
  });
});

describe('__seedStaleConsentRecordForE2E — the forged record reaches version_mismatch', () => {
  /**
   * These are the fields that decide WHICH branch `loadConsent` lands on. Its
   * order is integrity → revoked → version → under_age → expired (`:875-935`,
   * commented "THE ORDER OF THESE THREE CHECKS IS SAFETY-CRITICAL"). Get any of
   * them wrong and the seed silently produces a different state, the Maestro
   * flow times out opaquely, and the failure looks like a regression in the
   * screen rather than in the seed.
   */
  it('carries a non-empty consentId and userId (else: integrity_error)', async () => {
    const store = loadStore('true');
    await store.__seedStaleConsentRecordForE2E(variant());
    const record = writtenRecord(store);

    expect(record.consentId).toEqual(expect.any(String));
    expect(record.consentId.length).toBeGreaterThan(0);
    expect(record.userId).toEqual(expect.any(String));
    expect(record.userId.length).toBeGreaterThan(0);
  });

  it('is not revoked (else: revoked, which is terminal and never re-prompted)', async () => {
    const store = loadStore('true');
    await store.__seedStaleConsentRecordForE2E(variant());
    expect(writtenRecord(store).revoked).toBe(false);
  });

  it('carries a version that differs from CONSENT_VERSION', async () => {
    const store = loadStore('true');
    await store.__seedStaleConsentRecordForE2E(variant());
    const record = writtenRecord(store);

    expect(record.version).toBe(PRIOR_VERSION);
    expect(record.version).not.toBe(store.CONSENT_VERSION);
  });

  it('has not expired, so the record is stale for exactly one reason', async () => {
    // `expired` is checked AFTER `version`, so an expired forge would still read
    // as version_mismatch — but a record that is stale for two reasons at once
    // is a worse test fixture than one that is stale for one.
    const store = loadStore('true');
    await store.__seedStaleConsentRecordForE2E(variant());
    const record = writtenRecord(store);

    expect(record.expiresAt).toBeGreaterThan(Date.now());
  });

  it('preserves the caller-supplied ageVerification verbatim', async () => {
    // `isBaseEligibleForRenewal` fails closed on a missing or non-finite
    // birthYear (`consentStore.ts:735-740`), so a value dropped or defaulted
    // here routes the device flow to StaleConsentIneligibleScreen instead of
    // ReConsentScreen — a silent wrong-screen failure.
    const store = loadStore('true');
    await store.__seedStaleConsentRecordForE2E(variant());
    const record = writtenRecord(store);

    expect(record.ageVerification.birthYear).toBe(1990);
    expect(record.ageVerification.isEligible).toBe(true);
    expect(record.ageVerification.verified).toBe(true);
  });

  it('honours an ineligible variant without reinterpreting it', async () => {
    // Proves the seam is variant-driven rather than hardcoded to the renewable
    // cohort — the property the follow-up ineligible-branch item depends on.
    const store = loadStore('true');
    await store.__seedStaleConsentRecordForE2E(
      variant({ birthYear: 2012, ageAtVerification: 14, isEligible: true }),
    );
    const record = writtenRecord(store);

    expect(record.ageVerification.birthYear).toBe(2012);
  });
});

describe('__seedStaleConsentRecordForE2E — writes no audit history', () => {
  it('persists the consent record and nothing else', async () => {
    // A 'granted' history entry timestamped today, for a version that could not
    // be granted today, fabricates an audit event that never happened. It would
    // also mask the reload path `renewConsent` depends on: its own comment flags
    // that the in-memory history array is empty in exactly the states this seam
    // runs in, version_mismatch among them. Write only the record; let the real
    // renewal produce the first true history entry.
    const store = loadStore('true');
    await store.__seedStaleConsentRecordForE2E(variant());

    const keys = store.setItemAsync.mock.calls.map((c: unknown[]) => c[0]);
    expect(keys).toEqual(['consent_record_v1']);
  });
});
