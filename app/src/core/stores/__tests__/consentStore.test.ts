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

import {
  useConsentStore,
  canPerformCrisisIntervention,
  recordLegalGateConsents,
  getLegalGateConsents,
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

    test('stored version mismatch (legacy 1.0.0 record) → status = "invalid" forces re-grant', async () => {
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
});
