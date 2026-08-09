/**
 * Consent Store regression tests (TEST-11, extended for DEBUG-150)
 *
 * Validates the GDPR / CCPA / VCDPA invariants documented in
 * consentStore.ts:
 *   1. All consent categories default to false (opt-out)
 *   2. Crisis access is NEVER gated by consent (vital interests exception)
 *   3. Age verification: <18 marks ineligible; year validation rejects garbage
 *      (gate flipped from 13+ → 18+ to match ToS §4 / Privacy §8; DEBUG-150)
 *   4. fail-safe defaults: missing key → 'missing'; corrupted → 'invalid'
 *   5. Round-trip persistence: grant → reload (fresh store) → preferences survive
 *   6. Update propagates to cache synchronously
 *   7. Revoke clears the cache and marks status invalid
 *   8. History persists across reload
 *   9. Reset wipes all keys cleanly
 *  10. GDPR Art. 9(2)(a) explicit consent persists in ConsentRecord (DEBUG-150)
 *  11. Legal-gate consents record persists across screens (DEBUG-150)
 */

// In-memory SecureStore + AsyncStorage mocks — pattern from T2.2.
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

// INFRA-144: consent_history now flows through SecureStorageService.storeWellnessBlob
// (AES-256-GCM ciphertext in AsyncStorage). Mock with a passthrough that stores
// the plaintext under the same WELLNESS_ASYNC_PREFIX key shape so existing
// state-based assertions (consentHistory.length, action values) still hold
// without exercising real crypto.
const mockWellnessBlobs: Record<string, unknown> = {};
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
      mockWellnessBlobs[key] = data;
      return { success: true, operationType: 'store', storageKey: `wellness_async_${key}`, operationTimeMs: 0, dataSize: 0 };
    }),
    retrieveWellnessBlob: jest.fn(async (key: string) => mockWellnessBlobs[key] ?? null),
    deleteWellnessBlob: jest.fn(async (key: string) => {
      delete mockWellnessBlobs[key];
    }),
  },
}));

import {
  useConsentStore,
  canPerformCrisisIntervention,
  recordLegalGateConsents,
  getLegalGateConsents,
  CONSENT_VERSION,
  type ConsentPreferences,
  type AgeVerification,
} from '../consentStore';

const ELIGIBLE_AGE: AgeVerification = {
  verified: true,
  birthYear: 1990,
  ageAtVerification: 36,
  verifiedAt: Date.now(),
  isEligible: true,
};

const ALL_OPT_IN: ConsentPreferences = {
  analyticsEnabled: true,
  crashReportsEnabled: true,
  cloudSyncEnabled: true,
  researchEnabled: true,
  mentalHealthProcessingConsent: true,
};

const ALL_OPT_OUT: ConsentPreferences = {
  analyticsEnabled: false,
  crashReportsEnabled: false,
  cloudSyncEnabled: false,
  researchEnabled: false,
  mentalHealthProcessingConsent: false,
};

// Fresh-snapshot accessor (avoids stale-closure issues in tests)
const state = () => useConsentStore.getState();

describe('consentStore', () => {
  beforeEach(async () => {
    // Wipe both stores between tests
    for (const k of Object.keys(mockSecureStore)) delete mockSecureStore[k];
    for (const k of Object.keys(mockAsyncStorage)) delete mockAsyncStorage[k];
    for (const k of Object.keys(mockWellnessBlobs)) delete mockWellnessBlobs[k];

    // Reset zustand store to its default in-memory shape
    await state().resetConsent();
  });

  describe('default invariants', () => {
    test('all consent categories default to opt-out (false)', async () => {
      await state().loadConsent();
      expect(state().consentCache.canCollectAnalytics).toBe(false);
      expect(state().consentCache.canCollectCrashReports).toBe(false);
      expect(state().consentCache.canSyncToCloud).toBe(false);
      expect(state().consentCache.canParticipateInResearch).toBe(false);
    });

    test('canPerformOperation returns false when no consent recorded', async () => {
      await state().loadConsent();
      expect(state().canPerformOperation('analytics')).toBe(false);
      expect(state().canPerformOperation('crash_reports')).toBe(false);
      expect(state().canPerformOperation('cloud_sync')).toBe(false);
      expect(state().canPerformOperation('research')).toBe(false);
    });

    test('missing consent → status = "missing", not "valid"', async () => {
      await state().loadConsent();
      expect(state().consentStatus).toBe('missing');
      expect(state().hasValidConsent()).toBe(false);
    });
  });

  describe('crisis access (NEVER gated by consent)', () => {
    test('canPerformCrisisIntervention returns true with no consent', () => {
      expect(canPerformCrisisIntervention()).toBe(true);
    });

    test('canPerformCrisisIntervention returns true with revoked consent', async () => {
      await state().grantConsent(ALL_OPT_OUT, ELIGIBLE_AGE);
      await state().revokeConsent('user opted out');
      expect(canPerformCrisisIntervention()).toBe(true);
    });

    test('canPerformCrisisIntervention returns true even with under-age verification', async () => {
      await state().grantConsent(ALL_OPT_OUT, {
        ...ELIGIBLE_AGE,
        ageAtVerification: 10,
        isEligible: false,
      });
      expect(canPerformCrisisIntervention()).toBe(true);
    });
  });

  describe('age verification (18+ gate per ToS §4 / Privacy §8)', () => {
    test('age >= 18 is eligible', async () => {
      const result = await state().verifyAge(2000); // 26 in 2026
      expect(result.eligible).toBe(true);
      expect(result.age).toBeGreaterThanOrEqual(18);
    });

    test('age < 18 is ineligible', async () => {
      const currentYear = new Date().getFullYear();
      const result = await state().verifyAge(currentYear - 10);
      expect(result.eligible).toBe(false);
      expect(result.age).toBe(10);
    });

    test('age 17 is ineligible (boundary, formerly eligible under 13+ gate)', async () => {
      const currentYear = new Date().getFullYear();
      const result = await state().verifyAge(currentYear - 17);
      expect(result.eligible).toBe(false);
      expect(result.age).toBe(17);
    });

    test('age 18 is eligible (boundary)', async () => {
      const currentYear = new Date().getFullYear();
      const result = await state().verifyAge(currentYear - 18);
      expect(result.eligible).toBe(true);
      expect(result.age).toBe(18);
    });

    test('non-integer birth year throws', async () => {
      await expect(state().verifyAge(1990.5)).rejects.toThrow('integer');
    });

    test('birth year before 1900 throws', async () => {
      await expect(state().verifyAge(1899)).rejects.toThrow('between');
    });

    test('birth year in the future throws', async () => {
      const futureYear = new Date().getFullYear() + 1;
      await expect(state().verifyAge(futureYear)).rejects.toThrow('between');
    });

    test('verifyAge persists to SecureStore for pre-consent re-read', async () => {
      await state().verifyAge(1995); // 31 in 2026 — eligible under 18+ gate
      const stored = await state().getStoredAgeVerification();
      expect(stored).not.toBeNull();
      expect(stored?.birthYear).toBe(1995);
      expect(stored?.isEligible).toBe(true);
    });

    test('under-age consent surfaces status = "under_age"', async () => {
      await state().grantConsent(ALL_OPT_OUT, {
        verified: true,
        birthYear: 2018,
        ageAtVerification: 8,
        verifiedAt: Date.now(),
        isEligible: false,
      });
      // Re-load forces the underAge branch in loadConsent
      await state().loadConsent();
      expect(state().consentStatus).toBe('under_age');
    });
  });

  describe('round-trip persistence', () => {
    test('grant → reload (fresh store snapshot) → preferences survive', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      // Drop in-memory state to force a SecureStore read.
      useConsentStore.setState({
        currentConsent: null,
        consentHistory: [],
        consentStatus: 'loading',
      });
      const reloaded = await state().loadConsent();
      expect(reloaded).not.toBeNull();
      expect(reloaded?.preferences).toEqual(ALL_OPT_IN);
      expect(state().consentStatus).toBe('valid');
    });

    test('history persists across reload (audit trail requirement)', async () => {
      await state().grantConsent(ALL_OPT_OUT, ELIGIBLE_AGE);
      await state().updateConsent({ analyticsEnabled: true });
      // Drop in-memory state
      useConsentStore.setState({ consentHistory: [] });
      await state().loadConsent();
      expect(state().consentHistory.length).toBeGreaterThanOrEqual(2);
      const actions = state().consentHistory.map((h) => h.action);
      expect(actions).toContain('granted');
      expect(actions).toContain('updated');
    });

    test('update propagates to cache synchronously', async () => {
      await state().grantConsent(ALL_OPT_OUT, ELIGIBLE_AGE);
      expect(state().canPerformOperation('analytics')).toBe(false);
      await state().updateConsent({ analyticsEnabled: true });
      expect(state().canPerformOperation('analytics')).toBe(true);
      expect(state().canPerformOperation('cloud_sync')).toBe(false); // unchanged
    });
  });

  describe('fail-safe defaults on corrupted payload', () => {
    test('corrupted SecureStore JSON → status = "integrity_error", cache = defaults', async () => {
      mockSecureStore['consent_record_v1'] = '{not valid json';
      await state().loadConsent();
      expect(state().consentStatus).toBe('integrity_error');
      expect(state().canPerformOperation('analytics')).toBe(false);
      expect(state().canPerformOperation('research')).toBe(false);
    });

    test('consent missing required fields → status = "integrity_error"', async () => {
      mockSecureStore['consent_record_v1'] = JSON.stringify({
        // missing consentId and userId
        preferences: ALL_OPT_IN,
        ageVerification: ELIGIBLE_AGE,
      });
      await state().loadConsent();
      expect(state().consentStatus).toBe('integrity_error');
    });

    test('revoked consent on disk → status = "revoked"', async () => {
      mockSecureStore['consent_record_v1'] = JSON.stringify({
        consentId: 'c1',
        userId: 'u1',
        version: CONSENT_VERSION,
        revoked: true,
        preferences: ALL_OPT_IN,
        ageVerification: ELIGIBLE_AGE,
      });
      await state().loadConsent();
      expect(state().consentStatus).toBe('revoked');
    });

    test('stored version mismatch (legacy 1.0.0 record) → status = "version_mismatch" forces re-grant', async () => {
      mockSecureStore['consent_record_v1'] = JSON.stringify({
        consentId: 'c1',
        userId: 'u1',
        version: '1.0.0',
        revoked: false,
        preferences: {
          analyticsEnabled: false,
          crashReportsEnabled: false,
          cloudSyncEnabled: false,
          researchEnabled: false,
        },
        ageVerification: ELIGIBLE_AGE,
      });
      await state().loadConsent();
      expect(state().consentStatus).toBe('version_mismatch');
    });
  });

  describe('revocation', () => {
    test('revoke clears cache and sets status = "revoked"', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      expect(state().canPerformOperation('analytics')).toBe(true);
      await state().revokeConsent('user changed mind');
      expect(state().consentStatus).toBe('revoked');
      expect(state().canPerformOperation('analytics')).toBe(false);
    });

    test('revoke records reason in history entry', async () => {
      await state().grantConsent(ALL_OPT_OUT, ELIGIBLE_AGE);
      await state().revokeConsent('GDPR right to erasure');
      const revokeEntry = state().consentHistory.find((h) => h.action === 'revoked');
      expect(revokeEntry).toBeDefined();
    });
  });

  /**
   * FEAT-316 slice A — stale-consent status discrimination.
   *
   * Before this slice, five sites in loadConsent() plus revokeConsent() all
   * produced the single status 'invalid', making a deliberately-withdrawn user
   * indistinguishable from a user holding a stale policy version. FEAT-332
   * mounts a re-consent screen keyed off that distinction; keyed off 'invalid'
   * it would nag a user who exercised GDPR Art. 7(3) withdrawal. Compliance
   * ruled that regression worse than not shipping at all, so the split lands
   * first, on its own, with no UI attached.
   */
  describe('stale-consent status discrimination (FEAT-316 slice A)', () => {
    const staleRecord = (overrides: Record<string, unknown> = {}) =>
      JSON.stringify({
        consentId: 'c1',
        userId: 'u1',
        version: '1.0.0',
        revoked: false,
        universalOptOut: false,
        preferences: ALL_OPT_IN,
        ageVerification: ELIGIBLE_AGE,
        timestamp: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
      });

    describe('revoked is never conflated with version_mismatch (GDPR Art. 7(3))', () => {
      test('CRITICAL: a record that is BOTH revoked AND version-stale reads as "revoked"', async () => {
        // The overlap case is the whole reason the split exists. A user who
        // withdrew consent under policy 1.0.0 satisfies both conditions; if
        // version is tested first they read as version_mismatch and FEAT-332
        // re-prompts someone who deliberately said no.
        mockSecureStore['consent_record_v1'] = staleRecord({ revoked: true, version: '1.0.0' });
        await state().loadConsent();
        expect(state().consentStatus).toBe('revoked');
        expect(state().consentStatus).not.toBe('version_mismatch');
      });

      test('revokeConsent() sets "revoked", not a stale status', async () => {
        // The sixth producing site, outside loadConsent entirely.
        await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
        await state().revokeConsent('withdrawal');
        expect(state().consentStatus).toBe('revoked');
      });

      test('an unreadable payload reads as "integrity_error", never a stale status', async () => {
        mockSecureStore['consent_record_v1'] = '{corrupt';
        await state().loadConsent();
        expect(state().consentStatus).toBe('integrity_error');
      });

      test('missing identifiers read as "integrity_error" even when also version-stale', async () => {
        mockSecureStore['consent_record_v1'] = staleRecord({ consentId: undefined, version: '1.0.0' });
        await state().loadConsent();
        expect(state().consentStatus).toBe('integrity_error');
      });
    });

    describe('staleConsent retention', () => {
      test('version_mismatch retains the parsed record in staleConsent', async () => {
        mockSecureStore['consent_record_v1'] = staleRecord();
        await state().loadConsent();
        expect(state().consentStatus).toBe('version_mismatch');
        expect(state().currentConsent).toBeNull();
        expect(state().staleConsent?.version).toBe('1.0.0');
        expect(state().staleConsent?.consentId).toBe('c1');
      });

      test('18+ HAZARD: eligibility stays visible on the retained stale record', async () => {
        // loadConsent checks version BEFORE age, so an ineligible user with a
        // stale record short-circuits to version_mismatch and NEVER resolves to
        // 'under_age'. The ordering does not protect the age gate — it defeats
        // it. FEAT-332's trigger must therefore gate on this field itself, so
        // slice A's obligation is to guarantee it survives.
        mockSecureStore['consent_record_v1'] = staleRecord({
          ageVerification: { ...ELIGIBLE_AGE, isEligible: false, ageAtVerification: 15 },
        });
        await state().loadConsent();
        expect(state().consentStatus).toBe('version_mismatch');
        expect(state().staleConsent?.ageVerification.isEligible).toBe(false);
      });

      test('universalOptOut survives on the stale record (must not be silently dropped)', async () => {
        mockSecureStore['consent_record_v1'] = staleRecord({ universalOptOut: true });
        await state().loadConsent();
        expect(state().staleConsent?.universalOptOut).toBe(true);
      });

      test('expired does NOT set staleConsent — it retains currentConsent instead', async () => {
        // Deliberate asymmetry, and the reason staleConsent exists at all: the
        // version-mismatch branch nulls currentConsent and destroys the record,
        // the expired branch does not. Adding staleConsent to the expired path
        // would duplicate the same record into two fields. FEAT-332's trigger
        // reads `staleConsent ?? currentConsent`.
        await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
        mockSecureStore['consent_record_v1'] = staleRecord({
          version: CONSENT_VERSION,
          expiresAt: Date.now() - 1000,
        });
        await state().loadConsent();
        expect(state().consentStatus).toBe('expired');
        expect(state().staleConsent).toBeNull();
        expect(state().currentConsent?.consentId).toBe('c1');
      });

      test('staleConsent is null for every non-stale outcome', async () => {
        // missing
        await state().loadConsent();
        expect(state().staleConsent).toBeNull();

        // integrity_error
        mockSecureStore['consent_record_v1'] = '{corrupt';
        await state().loadConsent();
        expect(state().staleConsent).toBeNull();

        // revoked
        mockSecureStore['consent_record_v1'] = staleRecord({
          revoked: true,
          version: CONSENT_VERSION,
        });
        await state().loadConsent();
        expect(state().staleConsent).toBeNull();

        // valid
        delete mockSecureStore['consent_record_v1'];
        await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
        await state().loadConsent();
        expect(state().consentStatus).toBe('valid');
        expect(state().staleConsent).toBeNull();
      });
    });

    describe('staleConsent is inert — never widens permission', () => {
      test.each(['analytics', 'crash_reports', 'cloud_sync', 'research', 'mental_health_processing'] as const)(
        'canPerformOperation(%s) === false with a fully opted-in stale record present',
        async (operation) => {
          mockSecureStore['consent_record_v1'] = staleRecord({ preferences: ALL_OPT_IN });
          await state().loadConsent();
          expect(state().staleConsent).not.toBeNull();
          expect(state().canPerformOperation(operation)).toBe(false);
        },
      );

      test('hasValidConsent() and isAgeVerified() stay false despite an eligible stale record', async () => {
        mockSecureStore['consent_record_v1'] = staleRecord({ ageVerification: ELIGIBLE_AGE });
        await state().loadConsent();
        expect(state().staleConsent?.ageVerification.isEligible).toBe(true);
        expect(state().hasValidConsent()).toBe(false);
        expect(state().isAgeVerified()).toBe(false);
      });

      test('the cache builder never reads staleConsent — cache stays at defaults', async () => {
        mockSecureStore['consent_record_v1'] = staleRecord({ preferences: ALL_OPT_IN });
        await state().loadConsent();
        expect(state().consentCache.canCollectAnalytics).toBe(false);
        expect(state().consentCache.canProcessMentalHealthData).toBe(false);
        expect(state().consentCache.ageVerified).toBe(false);
        expect(state().consentCache.isEligible).toBe(false);
      });

      test('SAFETY: crisis intervention remains available under every stale status', async () => {
        for (const record of [
          staleRecord(),
          staleRecord({ revoked: true }),
          '{corrupt',
        ]) {
          mockSecureStore['consent_record_v1'] = record;
          await state().loadConsent();
          expect(canPerformCrisisIntervention()).toBe(true);
        }
      });
    });

    describe('persisted cache hygiene', () => {
      // The consent_cache_v1 AsyncStorage blob is write-only repo-wide (four
      // writers, zero readers), so a stale permissive copy is not a live
      // bypass today — this is data hygiene, not a security fix. Left in place
      // it would become one the moment anything starts reading it back.
      test.each([
        ['version_mismatch', () => staleRecord()],
        ['revoked', () => staleRecord({ revoked: true, version: CONSENT_VERSION })],
        ['integrity_error', () => '{corrupt'],
      ])('%s clears the persisted consent_cache_v1 blob', async (_label, makeRecord) => {
        await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
        expect(mockAsyncStorage['consent_cache_v1']).toBeDefined();

        mockSecureStore['consent_record_v1'] = makeRecord();
        await state().loadConsent();
        expect(mockAsyncStorage['consent_cache_v1']).toBeUndefined();
      });

      test('expired clears the persisted blob too', async () => {
        await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
        mockSecureStore['consent_record_v1'] = staleRecord({
          version: CONSENT_VERSION,
          expiresAt: Date.now() - 1000,
        });
        await state().loadConsent();
        expect(state().consentStatus).toBe('expired');
        expect(mockAsyncStorage['consent_cache_v1']).toBeUndefined();
      });
    });

    test('CONSENT_VERSION is exported so the changelog map cannot drift from it', () => {
      expect(typeof CONSENT_VERSION).toBe('string');
      expect(CONSENT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('reset', () => {
    test('reset wipes consent + age verification + cache keys', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      await state().verifyAge(1990);
      await state().resetConsent();
      expect(mockSecureStore['consent_record_v1']).toBeUndefined();
      expect(mockSecureStore['age_verification_v1']).toBeUndefined();
      expect(mockAsyncStorage['consent_cache_v1']).toBeUndefined();
      expect(state().consentStatus).toBe('missing');
    });
  });

  describe('export (CCPA right of access)', () => {
    test('exportConsentRecords returns current consent + full history + timestamp', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      await state().updateConsent({ analyticsEnabled: false });
      const exported = await state().exportConsentRecords();
      expect(exported.currentConsent).not.toBeNull();
      expect(exported.history.length).toBeGreaterThanOrEqual(2);
      expect(exported.exportedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('GDPR Art. 9(2)(a) explicit mental-health-processing consent', () => {
    test('granted record persists mentalHealthProcessingConsent = true', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      expect(state().currentConsent?.preferences.mentalHealthProcessingConsent).toBe(true);
    });

    test('granted record persists mentalHealthProcessingConsent = false when unticked', async () => {
      await state().grantConsent(ALL_OPT_OUT, ELIGIBLE_AGE);
      expect(state().currentConsent?.preferences.mentalHealthProcessingConsent).toBe(false);
    });

    test('canPerformOperation("mental_health_processing") reflects the granted flag', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      expect(state().canPerformOperation('mental_health_processing')).toBe(true);
      await state().updateConsent({ mentalHealthProcessingConsent: false });
      expect(state().canPerformOperation('mental_health_processing')).toBe(false);
    });

    test('reload round-trip preserves the Art. 9 flag', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      useConsentStore.setState({
        currentConsent: null,
        consentHistory: [],
        consentStatus: 'loading',
      });
      const reloaded = await state().loadConsent();
      expect(reloaded?.preferences.mentalHealthProcessingConsent).toBe(true);
    });

    test('record version is "1.1.0" after grant (GDPR Art. 7(1) policy-version capture)', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      expect(state().currentConsent?.version).toBe('1.1.0');
    });

    test('revoke clears the Art. 9 consent from fast-validation cache', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      expect(state().canPerformOperation('mental_health_processing')).toBe(true);
      await state().revokeConsent('user revoked health-data consent');
      expect(state().canPerformOperation('mental_health_processing')).toBe(false);
    });
  });

  describe('universalOptOut (INFRA-151) — GPC-equivalent universal opt-out', () => {
    test('defaults to false after grantConsent', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      expect(state().currentConsent?.universalOptOut).toBe(false);
      expect(state().consentCache.honorUniversalOptOut).toBe(false);
    });

    test('setUniversalOptOut(true) persists to SecureStore and refreshes cache', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      await state().setUniversalOptOut(true);

      expect(state().currentConsent?.universalOptOut).toBe(true);
      expect(state().consentCache.honorUniversalOptOut).toBe(true);

      // Persisted to SecureStore (read directly, simulating a cold start)
      const stored = JSON.parse(mockSecureStore['consent_record_v1']);
      expect(stored.universalOptOut).toBe(true);

      // AsyncStorage cache also reflects it
      const cached = JSON.parse(mockAsyncStorage['consent_cache_v1']);
      expect(cached.honorUniversalOptOut).toBe(true);
    });

    test('when universalOptOut is true, analytics/crash/sync/research all return false', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      // Confirm baseline: ALL_OPT_IN means every category allowed
      expect(state().canPerformOperation('analytics')).toBe(true);
      expect(state().canPerformOperation('crash_reports')).toBe(true);
      expect(state().canPerformOperation('cloud_sync')).toBe(true);
      expect(state().canPerformOperation('research')).toBe(true);

      // Flip universalOptOut on — every non-essential category must short-circuit
      await state().setUniversalOptOut(true);
      expect(state().canPerformOperation('analytics')).toBe(false);
      expect(state().canPerformOperation('crash_reports')).toBe(false);
      expect(state().canPerformOperation('cloud_sync')).toBe(false);
      expect(state().canPerformOperation('research')).toBe(false);
    });

    test('mental_health_processing is NOT short-circuited by universalOptOut (GDPR Art. 9(2)(a) governs it separately)', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      await state().setUniversalOptOut(true);
      // Art. 9 consent is the user's primary purpose for using Being; universal
      // opt-out targets analytics/tracking, not the wellness data they actively
      // consented to during onboarding.
      expect(state().canPerformOperation('mental_health_processing')).toBe(true);
    });

    test('setUniversalOptOut(false) restores granular preference values to the cache', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      await state().setUniversalOptOut(true);
      expect(state().canPerformOperation('analytics')).toBe(false);

      await state().setUniversalOptOut(false);
      expect(state().canPerformOperation('analytics')).toBe(true);
      expect(state().canPerformOperation('research')).toBe(true);
    });

    test('appends an "updated" ConsentHistoryEntry for audit trail (GDPR Art. 7)', async () => {
      await state().grantConsent(ALL_OPT_OUT, ELIGIBLE_AGE);
      const historyBefore = state().consentHistory.length;
      await state().setUniversalOptOut(true);
      const historyAfter = state().consentHistory.length;
      expect(historyAfter).toBe(historyBefore + 1);
      expect(state().consentHistory[historyAfter - 1].action).toBe('updated');
    });

    test('round-trip persistence: universalOptOut survives a reload', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      await state().setUniversalOptOut(true);

      // Drop in-memory state to force a SecureStore read
      useConsentStore.setState({
        currentConsent: null,
        consentHistory: [],
        consentStatus: 'loading',
      });
      await state().loadConsent();

      expect(state().currentConsent?.universalOptOut).toBe(true);
      expect(state().consentCache.honorUniversalOptOut).toBe(true);
      expect(state().canPerformOperation('analytics')).toBe(false);
    });

    test('legacy record missing universalOptOut field migrates to false (no re-grant required)', async () => {
      // Simulate a pre-INFRA-151 record (no universalOptOut field). The record
      // still uses the current CONSENT_VERSION so it should load valid — only
      // the additive field is missing.
      mockSecureStore['consent_record_v1'] = JSON.stringify({
        consentId: 'legacy-c1',
        userId: 'test-user-id',
        version: '1.1.0',
        revoked: false,
        preferences: ALL_OPT_IN,
        ageVerification: ELIGIBLE_AGE,
        timestamp: Date.now(),
        updatedAt: Date.now(),
        // universalOptOut intentionally absent
      });

      await state().loadConsent();
      expect(state().consentStatus).toBe('valid');
      expect(state().currentConsent?.universalOptOut).toBe(false);
      expect(state().consentCache.honorUniversalOptOut).toBe(false);
      // And the user's existing preferences are honored
      expect(state().canPerformOperation('analytics')).toBe(true);
    });

    test('updateConsent while opt-out is on does NOT allow analytics to slip through the cache', async () => {
      // Regression guard: if a user has universalOptOut on and toggles a
      // granular preference, the cache must still reflect the override.
      await state().grantConsent(ALL_OPT_OUT, ELIGIBLE_AGE);
      await state().setUniversalOptOut(true);
      await state().updateConsent({ analyticsEnabled: true });

      expect(state().consentCache.canCollectAnalytics).toBe(false);
      expect(state().canPerformOperation('analytics')).toBe(false);
      // The underlying preference is still recorded (so toggling opt-out off
      // restores the user's intent)
      expect(state().currentConsent?.preferences.analyticsEnabled).toBe(true);
    });
  });

  describe('legal-gate consents (CombinedLegalGateScreen → OnboardingScreen hand-off)', () => {
    test('record + retrieve round-trip preserves all four flags + version + timestamp', async () => {
      const before = Date.now();
      await recordLegalGateConsents({
        tosAccepted: true,
        privacyAccepted: true,
        wellnessDisclaimerAcknowledged: true,
        mentalHealthProcessingConsent: true,
      });
      const stored = await getLegalGateConsents();
      expect(stored).not.toBeNull();
      expect(stored?.tosAccepted).toBe(true);
      expect(stored?.privacyAccepted).toBe(true);
      expect(stored?.wellnessDisclaimerAcknowledged).toBe(true);
      expect(stored?.mentalHealthProcessingConsent).toBe(true);
      expect(stored?.version).toBe('1.1.0');
      expect(stored?.timestamp).toBeGreaterThanOrEqual(before);
    });

    test('getLegalGateConsents returns null when no record present', async () => {
      expect(await getLegalGateConsents()).toBeNull();
    });

    test('resetConsent wipes legal-gate consents', async () => {
      await recordLegalGateConsents({
        tosAccepted: true,
        privacyAccepted: true,
        wellnessDisclaimerAcknowledged: true,
        mentalHealthProcessingConsent: true,
      });
      await state().resetConsent();
      expect(await getLegalGateConsents()).toBeNull();
    });
  });

  // FEAT-267: the account-deletion audit attestation must land in the plaintext
  // consent_history_v1 SecureStore key so it survives clearAllWellnessData (it is
  // in ERASURE_EXCLUDED and not master-key encrypted). It is minimized to a
  // single terminal record — never the full history chain (Art. 5(1)(e)).
  describe('recordAccountDeletionAttestation (FEAT-267)', () => {
    test('writes a minimized terminal attestation to the preserved plaintext key', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);

      await state().recordAccountDeletionAttestation();

      const raw = mockSecureStore['consent_history_v1'];
      expect(raw).toBeTruthy();
      const entries = JSON.parse(raw);
      expect(Array.isArray(entries)).toBe(true);
      expect(entries).toHaveLength(1); // minimized — terminal record only
      expect(entries[0].action).toBe('revoked');
      expect(entries[0].note).toMatch(/account_deletion_requested/);
      expect(entries[0].timestamp).toEqual(expect.any(Number));
      // Final consent-state snapshot (booleans only — proves lawful basis).
      expect(entries[0].changes.mentalHealthProcessingConsent).toBe(true);
    });

    test('records an attestation even when no consent was ever granted', async () => {
      await state().recordAccountDeletionAttestation();

      const entries = JSON.parse(mockSecureStore['consent_history_v1']);
      expect(entries).toHaveLength(1);
      expect(entries[0].note).toMatch(/prior_entries=0/);
    });
  });
});
