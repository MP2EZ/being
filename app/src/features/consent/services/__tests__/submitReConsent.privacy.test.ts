/**
 * Re-consent submission path (FEAT-376 slice C1).
 *
 * `ReConsentScreen` collects EIGHT affirmative acts across TWO disjoint records:
 *   - `legal_gate_consents_v1` — ToS / Privacy / Wellness Disclaimer / Art. 9(2)(a),
 *     written by `recordLegalGateConsents` (`consentStore.ts:67-76`)
 *   - the encrypted `ConsentRecord` — the five `ConsentPreferences` booleans,
 *     written by `renewConsent` (`consentStore.ts:1078`)
 *
 * `renewConsent` deliberately does NOT write the first (`consentStore.ts:1143-1154`)
 * because it has no UI and stamping it would manufacture Art. 7(1) evidence. That
 * comment names this slice explicitly: "the screen that re-collects the ticks must
 * call `recordLegalGateConsents` itself to close it." This module is that call, and
 * this file is its contract.
 *
 * WHY THIS FILE AND NOT A `*.test.ts`: `*.privacy.test.ts` is picked up by
 * `npm run test:privacy` (`jest --testPathPattern=privacy`), which runs in precommit
 * AND in the `Safety + privacy gates` CI job inside `ci-pass`. Siting is the gate —
 * inherited from FEAT-375/FEAT-399 and still binding.
 *
 * THE THREE PROPERTIES UNDER TEST, in order of severity:
 *
 *   1. ORDER. The legal-gate record is written FIRST. If the second write then
 *      fails, the intermediate state is `legal_gate_consents_v1` at the current
 *      version (TRUE — the user really did tick those four) while the ConsentRecord
 *      stays stale, so the next launch re-prompts and the retry rewrites both. The
 *      reverse order fails toward `consentStatus: 'valid'` with a permanently
 *      divergent demonstrability artifact that nothing will ever re-prompt to fix.
 *      Order is the difference between "retry later" and "silently wrong forever".
 *
 *   2. FAILURE IS NOT SIGNALLED BY A THROW. `renewConsent` catches its own errors
 *      and does `set({ error }); return` (`consentStore.ts:1193-1199`) — void return,
 *      no throw. An `await` that resolves proves nothing. The only honest success
 *      signal is `consentStatus === 'valid'` read back off the store.
 *
 *   3. ONE ART. 9 DECISION, TWO RECORDS. `mentalHealthProcessingConsent` is the only
 *      field on both interfaces. The screen collects it once, in the document group,
 *      and propagates it — matching how `OnboardingScreen.tsx:1006` carries the
 *      legal-gate tick into the granted record. If the two ever disagree, one of them
 *      is fabricated, so this module refuses to write either rather than pick a winner.
 */

// In-memory SecureStore + AsyncStorage mocks — harness copied verbatim from
// `reConsent.privacy.test.ts:43-92`, which documents why the
// `consentChangelog.privacy.test.ts` mock must NOT be copied instead (wrong
// SecureStorageService method names; `storeWellnessBlob` resolving `undefined`
// would make every history assertion silently vacuous).
const mockSecureStore: Record<string, string> = {};
const mockAsyncStorage: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecureStore[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete mockSecureStore[key];
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockAsyncStorage[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockAsyncStorage[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockAsyncStorage[key];
    }),
  },
}));

jest.mock('@/core/constants/devMode', () => ({
  getCurrentUserId: () => 'test-user-id',
}));

const mockWellnessBlobs: Record<string, unknown> = {};
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
      mockWellnessBlobs[key] = data;
      return {
        success: true,
        operationType: 'store',
        storageKey: `wellness_async_${key}`,
        operationTimeMs: 0,
        dataSize: 0,
      };
    }),
    retrieveWellnessBlob: jest.fn(async (key: string) => mockWellnessBlobs[key] ?? null),
    deleteWellnessBlob: jest.fn(async (key: string) => {
      delete mockWellnessBlobs[key];
    }),
  },
}));

import * as SecureStore from 'expo-secure-store';
import {
  useConsentStore,
  CONSENT_VERSION,
  type ConsentPreferences,
  type ConsentRecord,
  type ConsentStatus,
  type LegalGateConsents,
} from '@/core/stores/consentStore';
import { submitReConsent, type ReConsentSubmission } from '../submitReConsent';

const CONSENT_SECURE_KEY = 'consent_record_v1';
const CONSENT_HISTORY_MIGRATION_FLAG = 'being.consent_history_migration_v2';
const LEGAL_GATE_CONSENTS_KEY = 'legal_gate_consents_v1';

const CURRENT_YEAR = new Date().getFullYear();
const ADULT_BIRTH_YEAR = CURRENT_YEAR - 30;
/** 15 — eligible under the retired 13+ rule, ineligible under the shipped 18+ rule. */
const MINOR_BIRTH_YEAR = CURRENT_YEAR - 15;

/**
 * What the screen hands over when every box is ticked. `mentalHealthProcessingConsent`
 * is deliberately the SAME value on both halves: one tick, two records.
 */
const FULL_SUBMISSION: ReConsentSubmission = {
  legalGate: {
    tosAccepted: true,
    privacyAccepted: true,
    wellnessDisclaimerAcknowledged: true,
    mentalHealthProcessingConsent: true,
  },
  preferences: {
    analyticsEnabled: false,
    crashReportsEnabled: false,
    cloudSyncEnabled: true,
    researchEnabled: false,
    mentalHealthProcessingConsent: true,
  },
};

/**
 * Write a v1.0.0-shaped record straight to storage and park it on `staleConsent`,
 * which is where `version_mismatch` puts it (`consentStore.ts:521`). Deliberately
 * omits `mentalHealthProcessingConsent` — DEBUG-150 added it AT 1.1.0, so a real
 * stale record cannot have it.
 */
function seedStaleRecord(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  const now = Date.now();
  const record = {
    consentId: 'consent_legacy_aaaaaa',
    userId: 'test-user-id',
    version: '1.0.0',
    preferences: {
      analyticsEnabled: true,
      crashReportsEnabled: false,
      cloudSyncEnabled: true,
      researchEnabled: false,
    } as unknown as ConsentPreferences,
    universalOptOut: false,
    ageVerification: {
      verified: true,
      birthYear: ADULT_BIRTH_YEAR,
      ageAtVerification: 30,
      verifiedAt: now - 1000,
      isEligible: true,
    },
    timestamp: now - 100_000,
    updatedAt: now - 100_000,
    expiresAt: now + 100_000,
    revoked: false,
    ...overrides,
  } as ConsentRecord;
  mockSecureStore[CONSENT_SECURE_KEY] = JSON.stringify(record);
  return record;
}

/** Put the store in the state `version_mismatch` actually leaves behind. */
function enterVersionMismatch(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  const stale = seedStaleRecord(overrides);
  useConsentStore.setState({
    currentConsent: null,
    staleConsent: stale,
    consentStatus: 'version_mismatch',
    consentHistory: [],
    error: null,
  });
  return stale;
}

function readLegalGateRecord(): LegalGateConsents | null {
  const raw = mockSecureStore[LEGAL_GATE_CONSENTS_KEY];
  return raw ? (JSON.parse(raw) as LegalGateConsents) : null;
}

function readConsentRecord(): ConsentRecord | null {
  const raw = mockSecureStore[CONSENT_SECURE_KEY];
  return raw ? (JSON.parse(raw) as ConsentRecord) : null;
}

function resetAll(): void {
  for (const k of Object.keys(mockSecureStore)) delete mockSecureStore[k];
  for (const k of Object.keys(mockAsyncStorage)) delete mockAsyncStorage[k];
  for (const k of Object.keys(mockWellnessBlobs)) delete mockWellnessBlobs[k];
  jest.clearAllMocks();
  // Skip the INFRA-144 one-time migration entry so history assertions read only
  // the entries these actions write.
  mockAsyncStorage[CONSENT_HISTORY_MIGRATION_FLAG] = '1';
  useConsentStore.setState({
    currentConsent: null,
    staleConsent: null,
    consentHistory: [],
    consentStatus: 'loading',
    isLoading: false,
    error: null,
  });
}

beforeEach(resetAll);

describe('FEAT-376 · submitReConsent writes BOTH records', () => {
  it('renews the ConsentRecord and stamps the legal-gate record at the current version', async () => {
    enterVersionMismatch();

    const result = await submitReConsent(FULL_SUBMISSION);

    expect(result).toEqual({ ok: true });
    expect(useConsentStore.getState().consentStatus).toBe('valid');

    // The whole point of the slice: the two version fields agree afterwards.
    expect(readConsentRecord()?.version).toBe(CONSENT_VERSION);
    expect(readLegalGateRecord()?.version).toBe(CONSENT_VERSION);
  });

  it('carries the four document acceptances through verbatim', async () => {
    enterVersionMismatch();

    await submitReConsent(FULL_SUBMISSION);

    expect(readLegalGateRecord()).toMatchObject({
      tosAccepted: true,
      privacyAccepted: true,
      wellnessDisclaimerAcknowledged: true,
      mentalHealthProcessingConsent: true,
    });
  });

  it('does not carry the stale record\'s preferences forward', async () => {
    // The seeded stale record has analytics ON and cloudSync ON. The submission
    // has analytics OFF. Carry-forward — the DEBUG-150 dark pattern — would show
    // up here as `analyticsEnabled: true`.
    enterVersionMismatch();

    await submitReConsent(FULL_SUBMISSION);

    expect(readConsentRecord()?.preferences).toEqual(FULL_SUBMISSION.preferences);
  });
});

describe('FEAT-376 · write ORDER is load-bearing', () => {
  /**
   * The legal-gate write must land BEFORE the renewal. Asserted on the observable
   * ordering of the two SecureStore keys rather than on a spy of the store action,
   * so it stays true if the implementation is refactored to call the store
   * differently.
   */
  it('writes legal_gate_consents_v1 before consent_record_v1', async () => {
    enterVersionMismatch();

    const writeOrder: string[] = [];
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        writeOrder.push(key);
        mockSecureStore[key] = value;
      },
    );

    await submitReConsent(FULL_SUBMISSION);

    expect(writeOrder).toContain(LEGAL_GATE_CONSENTS_KEY);
    expect(writeOrder).toContain(CONSENT_SECURE_KEY);
    expect(writeOrder.indexOf(LEGAL_GATE_CONSENTS_KEY)).toBeLessThan(
      writeOrder.indexOf(CONSENT_SECURE_KEY),
    );
  });
});

describe('FEAT-376 · partial failure leaves a re-promptable state', () => {
  it('reports stage "legal_gate" and renews nothing when the first write fails', async () => {
    enterVersionMismatch();
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (key: string) => {
      if (key === LEGAL_GATE_CONSENTS_KEY) throw new Error('keychain unavailable');
      throw new Error('must not be reached');
    });

    const result = await submitReConsent(FULL_SUBMISSION);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.stage).toBe('legal_gate');
    // Nothing renewed → the record stays stale → the next launch re-prompts.
    expect(useConsentStore.getState().consentStatus).toBe('version_mismatch');
    expect(readConsentRecord()?.version).toBe('1.0.0');
  });

  it('reports stage "renew" — NOT success — when renewConsent silently fails', async () => {
    // `renewConsent` catches its own errors and returns void (consentStore.ts:1193).
    // An implementation that only `await`s it reads this as success and sends the
    // user onward with an unrenewed record. This is the test that catches that.
    enterVersionMismatch();
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        if (key === CONSENT_SECURE_KEY) throw new Error('keychain unavailable');
        mockSecureStore[key] = value;
      },
    );

    const result = await submitReConsent(FULL_SUBMISSION);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.stage).toBe('renew');
    expect(useConsentStore.getState().consentStatus).toBe('version_mismatch');
  });

  it('does NOT roll back the legal-gate record after a failed renewal', async () => {
    // The intermediate state is truthful: the user really did accept those four
    // documents. Deleting it to "stay consistent" would destroy Art. 7(1) evidence
    // of an acceptance that actually happened. It is also harmless — nothing reads
    // `legal_gate_consents_v1` for staleness — and idempotent on retry.
    enterVersionMismatch();
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        if (key === CONSENT_SECURE_KEY) throw new Error('keychain unavailable');
        mockSecureStore[key] = value;
      },
    );

    await submitReConsent(FULL_SUBMISSION);

    expect(readLegalGateRecord()?.version).toBe(CONSENT_VERSION);
  });

  it('a retry after a failed renewal succeeds and leaves one coherent pair', async () => {
    // "Must not leave the user in a state that re-prompts forever."
    enterVersionMismatch();
    (SecureStore.setItemAsync as jest.Mock).mockImplementationOnce(
      async (key: string, value: string) => {
        mockSecureStore[key] = value;
      },
    );
    (SecureStore.setItemAsync as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('transient keychain failure');
    });

    const first = await submitReConsent(FULL_SUBMISSION);
    expect(first.ok).toBe(false);

    (SecureStore.setItemAsync as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        mockSecureStore[key] = value;
      },
    );

    const second = await submitReConsent(FULL_SUBMISSION);

    expect(second).toEqual({ ok: true });
    expect(useConsentStore.getState().consentStatus).toBe('valid');
    expect(readConsentRecord()?.version).toBe(CONSENT_VERSION);
    expect(readLegalGateRecord()?.version).toBe(CONSENT_VERSION);
  });
});

describe('FEAT-376 · the Art. 9 tick is one decision', () => {
  /**
   * `mentalHealthProcessingConsent` is the only field on both `LegalGateConsents`
   * and `ConsentPreferences`. The screen collects it ONCE. If a caller ever hands
   * over two different values, one of them was fabricated — so refuse both writes
   * rather than pick a winner. Fail closed, write nothing.
   */
  it.each([
    ['legal gate true, preference false', true, false],
    ['legal gate false, preference true', false, true],
  ])('refuses to write when the two halves disagree (%s)', async (_label, gate, pref) => {
    enterVersionMismatch();

    const result = await submitReConsent({
      legalGate: { ...FULL_SUBMISSION.legalGate, mentalHealthProcessingConsent: gate },
      preferences: { ...FULL_SUBMISSION.preferences, mentalHealthProcessingConsent: pref },
    });

    expect(result.ok).toBe(false);
    expect(readLegalGateRecord()).toBeNull();
    expect(readConsentRecord()?.version).toBe('1.0.0');
    expect(useConsentStore.getState().consentStatus).toBe('version_mismatch');
  });

  it('accepts a matched refusal of the Art. 9 tick without fabricating one', async () => {
    // A user may decline the wellness-data processing consent while accepting the
    // other three. `renewConsent` records that faithfully; nothing here may coerce
    // it to true. DEBUG-419 (`788bf320`) removed the last live path that did —
    // onboarding's `?? true` reconstruction — so all three paths now agree that a
    // derived value must never be written into this field.
    enterVersionMismatch();

    const result = await submitReConsent({
      legalGate: { ...FULL_SUBMISSION.legalGate, mentalHealthProcessingConsent: false },
      preferences: { ...FULL_SUBMISSION.preferences, mentalHealthProcessingConsent: false },
    });

    expect(result).toEqual({ ok: true });
    expect(readLegalGateRecord()?.mentalHealthProcessingConsent).toBe(false);
    expect(readConsentRecord()?.preferences.mentalHealthProcessingConsent).toBe(false);
  });
});

describe('FEAT-376 · pre-flight guards run before ANY write', () => {
  /**
   * `renewConsent` allowlists {version_mismatch, expired} itself — but it is the
   * SECOND write. Without a pre-flight the legal-gate record would already be
   * stamped by the time the store refused, minting a fresh Art. 7(1) attestation
   * on a plaintext, erasure-excluded key for a user who was never re-prompted.
   */
  it.each<ConsentStatus>(['valid', 'revoked', 'under_age', 'missing', 'integrity_error', 'loading'])(
    'refuses status %s without touching either record',
    async (status) => {
      const stale = seedStaleRecord();
      useConsentStore.setState({
        currentConsent: null,
        staleConsent: stale,
        consentStatus: status,
        consentHistory: [],
        error: null,
      });

      const result = await submitReConsent(FULL_SUBMISSION);

      expect(result.ok).toBe(false);
      expect(readLegalGateRecord()).toBeNull();
      expect(readConsentRecord()?.version).toBe('1.0.0');
    },
  );

  it('refuses an under-18 holder of a stale record without stamping the legal gate', async () => {
    // The 13→18 flip (DEBUG-150) shipped in the same commit as the 1.0.0→1.1.0
    // bump, so `isEligible: true` on a v1.0.0 record means "≥13". `renewConsent`
    // re-derives from `birthYear` and hard-refuses (consentStore.ts:1094) — but
    // again, that is the second write. Pre-flight or the minor's ticks get stamped.
    enterVersionMismatch({
      ageVerification: {
        verified: true,
        birthYear: MINOR_BIRTH_YEAR,
        ageAtVerification: 13,
        verifiedAt: Date.now() - 1000,
        isEligible: true,
      },
    });

    const result = await submitReConsent(FULL_SUBMISSION);

    expect(result.ok).toBe(false);
    expect(readLegalGateRecord()).toBeNull();
    expect(useConsentStore.getState().consentStatus).toBe('version_mismatch');
  });
});
