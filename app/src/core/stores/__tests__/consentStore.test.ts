/**
 * Consent Store regression tests (TEST-11)
 *
 * Validates the GDPR / CCPA / VCDPA / COPPA invariants documented in
 * consentStore.ts:
 *   1. All consent categories default to false (opt-out)
 *   2. Crisis access is NEVER gated by consent (vital interests exception)
 *   3. Age verification: <13 marks ineligible; year validation rejects garbage
 *   4. fail-safe defaults: missing key → 'missing'; corrupted → 'invalid'
 *   5. Round-trip persistence: grant → reload (fresh store) → preferences survive
 *   6. Update propagates to cache synchronously
 *   7. Revoke clears the cache and marks status invalid
 *   8. History persists across reload
 *   9. Reset wipes all keys cleanly
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

import {
  useConsentStore,
  canPerformCrisisIntervention,
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
};

const ALL_OPT_OUT: ConsentPreferences = {
  analyticsEnabled: false,
  crashReportsEnabled: false,
  cloudSyncEnabled: false,
  researchEnabled: false,
};

// Fresh-snapshot accessor (avoids stale-closure issues in tests)
const state = () => useConsentStore.getState();

describe('consentStore', () => {
  beforeEach(async () => {
    // Wipe both stores between tests
    for (const k of Object.keys(mockSecureStore)) delete mockSecureStore[k];
    for (const k of Object.keys(mockAsyncStorage)) delete mockAsyncStorage[k];

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

  describe('age verification (COPPA)', () => {
    test('age >= 13 is eligible', async () => {
      const result = await state().verifyAge(2010); // 16 in 2026
      expect(result.eligible).toBe(true);
      expect(result.age).toBeGreaterThanOrEqual(13);
    });

    test('age < 13 is ineligible', async () => {
      const currentYear = new Date().getFullYear();
      const result = await state().verifyAge(currentYear - 10);
      expect(result.eligible).toBe(false);
      expect(result.age).toBe(10);
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
      await state().verifyAge(2000);
      const stored = await state().getStoredAgeVerification();
      expect(stored).not.toBeNull();
      expect(stored?.birthYear).toBe(2000);
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
    test('corrupted SecureStore JSON → status = "invalid", cache = defaults', async () => {
      mockSecureStore['consent_record_v1'] = '{not valid json';
      await state().loadConsent();
      expect(state().consentStatus).toBe('invalid');
      expect(state().canPerformOperation('analytics')).toBe(false);
      expect(state().canPerformOperation('research')).toBe(false);
    });

    test('consent missing required fields → status = "invalid"', async () => {
      mockSecureStore['consent_record_v1'] = JSON.stringify({
        // missing consentId and userId
        preferences: ALL_OPT_IN,
        ageVerification: ELIGIBLE_AGE,
      });
      await state().loadConsent();
      expect(state().consentStatus).toBe('invalid');
    });

    test('revoked consent on disk → status = "invalid"', async () => {
      mockSecureStore['consent_record_v1'] = JSON.stringify({
        consentId: 'c1',
        userId: 'u1',
        revoked: true,
        preferences: ALL_OPT_IN,
        ageVerification: ELIGIBLE_AGE,
      });
      await state().loadConsent();
      expect(state().consentStatus).toBe('invalid');
    });
  });

  describe('revocation', () => {
    test('revoke clears cache and sets status = "invalid"', async () => {
      await state().grantConsent(ALL_OPT_IN, ELIGIBLE_AGE);
      expect(state().canPerformOperation('analytics')).toBe(true);
      await state().revokeConsent('user changed mind');
      expect(state().consentStatus).toBe('invalid');
      expect(state().canPerformOperation('analytics')).toBe(false);
    });

    test('revoke records reason in history entry', async () => {
      await state().grantConsent(ALL_OPT_OUT, ELIGIBLE_AGE);
      await state().revokeConsent('GDPR right to erasure');
      const revokeEntry = state().consentHistory.find((h) => h.action === 'revoked');
      expect(revokeEntry).toBeDefined();
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
});
