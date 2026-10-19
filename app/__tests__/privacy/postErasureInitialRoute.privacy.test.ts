/**
 * A launch after account erasure never resolves to Main on the deleted account's state
 * (DEBUG-755, AC2/AC3/AC5-routing/AC8).
 *
 * `CleanRootNavigator.checkInitialRoute` tests `settings.onboardingCompleted` FIRST and
 * routes to Main — deliberately (DEBUG-418/451): onboarded users in version_mismatch,
 * revoked, under_age and integrity_error must still land on Main, where the re-consent
 * and consent-blocked surfaces serve them. So the fix is NOT a reorder. It is one extra
 * input: a launch whose consent record does not post-date the deletion attestation is
 * "retired", and a retired launch goes to LegalGate (its 988 footer is unconditional).
 *
 * The routing decision is a pure function (`resolveInitialRoute`) so its whole table can
 * be pinned here; the navigator is pinned to actually use it by a comment-stripped source
 * check (DEBUG-390) with a firing control.
 *
 * Storage state comes from running the REAL `deleteAccountAndWipe` (or its first steps,
 * for the interrupted case), never from a hand-built fixture. `.privacy.` → INFRA-368.
 */

import fs from 'fs';
import path from 'path';

const mockAsync = new Map<string, string>();
const mockSecure = new Map<string, string>();
/** When set, an AsyncStorage write to this key is held open until `release()`. */
const mockHold: { key: string | null; release: (() => void) | null } = { key: null, release: null };

jest.mock('@react-native-async-storage/async-storage', () => {
  const api = {
    getItem: jest.fn(async (k: string) => mockAsync.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      if (mockHold.key === k) {
        mockHold.key = null;
        await new Promise<void>((resolve) => {
          mockHold.release = resolve;
        });
      }
      mockAsync.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      mockAsync.delete(k);
    }),
    getAllKeys: jest.fn(async () => [...mockAsync.keys()]),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => mockAsync.delete(k));
    }),
  };
  return { __esModule: true, default: api, ...api };
});
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockSecure.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockSecure.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecure.delete(k);
  }),
}));
jest.mock('react-native-aes-crypto', () => require('../helpers/mockEncryption').createAesCryptoMock());
jest.mock('expo-crypto', () => require('../helpers/mockEncryption').createExpoCryptoMock());
jest.mock('@/core/services/supabase/SupabaseService', () => ({
  __esModule: true,
  default: { deleteAccount: jest.fn(async () => true) },
}));
jest.mock('@/core/analytics/analyticsIdentityReset', () => ({ resetAnalyticsIdentity: jest.fn() }));
jest.mock('@/core/services/privacy/exportArtifactSweeper', () => ({ sweepExportArtifacts: jest.fn(() => 0) }));
jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => ({
    isReady: () => false,
    getCurrentRoute: () => undefined,
    getRootState: () => undefined,
  }),
}));

import { deleteAccountAndWipe } from '@/core/services/privacy/AccountDeletionService';
import { registeredErasureResetOwners } from '@/core/services/privacy/erasureResetRegistry';
import {
  readErasureRetirement,
  recordLegalGateConsents,
  useConsentStore,
} from '@/core/stores/consentStore';
import { useSettingsStore } from '@/core/stores/settingsStore';
import { resolveInitialRoute } from '@/core/navigation/resolveInitialRoute';

let now = 1_790_000_000_000;

async function seedOnboardedAccount(): Promise<void> {
  const consent = useConsentStore.getState();
  await consent.verifyAge(1990);
  await recordLegalGateConsents({
    tosAccepted: true,
    privacyAccepted: true,
    wellnessDisclaimerAcknowledged: true,
    mentalHealthProcessingConsent: true,
  });
  const age = await consent.getStoredAgeVerification();
  await consent.grantConsent(
    {
      analyticsEnabled: false,
      crashReportsEnabled: false,
      cloudSyncEnabled: true,
      researchEnabled: false,
      mentalHealthProcessingConsent: true,
    },
    age!,
  );
  await useConsentStore.getState().loadConsent();
  await useSettingsStore.getState().loadSettings();
  await useSettingsStore.getState().markOnboardingComplete();
}

/** What checkInitialRoute computes, over fresh module instances on the same disks. */
async function coldLaunchRoute(): Promise<string> {
  let route = '';
  await new Promise<void>((resolve, reject) => {
    jest.isolateModules(() => {
      const { useConsentStore: c, readErasureRetirement: retire } = require('@/core/stores/consentStore');
      const { useSettingsStore: s } = require('@/core/stores/settingsStore');
      const { resolveInitialRoute: resolve_ } = require('@/core/navigation/resolveInitialRoute');
      (async () => {
        const [settings, consent, retired] = await Promise.all([
          s.getState().loadSettings(),
          c.getState().loadConsent(),
          retire(),
        ]);
        // Both the first-run closure value ('loading') and the loaded status must agree.
        const a = resolve_({ settings, consent, consentStatus: 'loading', retired });
        const b = resolve_({ settings, consent, consentStatus: c.getState().consentStatus, retired });
        if (a !== b) throw new Error(`route depends on the stale closure: ${a} vs ${b}`);
        route = a;
      })().then(resolve, reject);
    });
  });
  return route;
}

beforeEach(() => {
  mockAsync.clear();
  mockSecure.clear();
  mockHold.key = null;
  mockHold.release = null;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  useConsentStore.setState({ consentStatus: 'loading', currentConsent: null, staleConsent: null, consentHistory: [] });
  useSettingsStore.setState({ settings: null, error: null, isLoading: false });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('resolveInitialRoute — the onboarded-first table is unchanged for the cohorts it serves', () => {
  const onboarded = { onboardingCompleted: true } as never;
  const notOnboarded = { onboardingCompleted: false } as never;
  const record = { consentId: 'c' } as never;

  it.each(['valid', 'version_mismatch', 'revoked', 'under_age', 'integrity_error', 'expired', 'loading'])(
    'onboarded + %s + no erasure → Main (DEBUG-418/451)',
    (status) => {
      expect(resolveInitialRoute({ settings: onboarded, consent: record, consentStatus: status as never, retired: false })).toBe('Main');
    },
  );

  it('onboarded but retired by an erasure → LegalGate', () => {
    expect(resolveInitialRoute({ settings: onboarded, consent: record, consentStatus: 'valid', retired: true })).toBe('LegalGate');
  });

  it('not onboarded: no consent → LegalGate; consent → Onboarding (unchanged)', () => {
    expect(resolveInitialRoute({ settings: notOnboarded, consent: null, consentStatus: 'loading', retired: false })).toBe('LegalGate');
    expect(resolveInitialRoute({ settings: null, consent: null, consentStatus: 'missing', retired: false })).toBe('LegalGate');
    expect(resolveInitialRoute({ settings: notOnboarded, consent: record, consentStatus: 'valid', retired: false })).toBe('Onboarding');
    expect(resolveInitialRoute({ settings: notOnboarded, consent: record, consentStatus: 'under_age', retired: false })).toBe('LegalGate');
  });
});

describe('a cold launch after a real erasure (AC2)', () => {
  it('control: before erasure the onboarded account launches to Main', async () => {
    await seedOnboardedAccount();
    expect(await coldLaunchRoute()).toBe('Main');
  });

  it('after a completed erasure → LegalGate', async () => {
    await seedOnboardedAccount();
    now += 60_000;
    await deleteAccountAndWipe({ posthog: null });
    expect(await coldLaunchRoute()).toBe('LegalGate');
  });

  it('killed after the attestation, before any reset or wipe → LegalGate, not Main', async () => {
    await seedOnboardedAccount();
    now += 60_000;
    // Step 2 of deleteAccountAndWipe, then the process dies: settings still say onboarded.
    await useConsentStore.getState().recordAccountDeletionAttestation();
    expect(JSON.parse(mockAsync.get('app_settings_v1')!).onboardingCompleted).toBe(true);
    expect(await coldLaunchRoute()).toBe('LegalGate');
  });

  it('a fresh grant after the erasure launches normally again', async () => {
    await seedOnboardedAccount();
    now += 60_000;
    await deleteAccountAndWipe({ posthog: null });
    now += 60_000;
    await seedOnboardedAccount();
    expect(await readErasureRetirement()).toBe(false);
    expect(await coldLaunchRoute()).toBe('Main');
  });

  it('the retirement read never rejects; a missing attestation is "not retired"', async () => {
    await expect(readErasureRetirement()).resolves.toBe(false);
  });
});

/** Like coldLaunchRoute, but also reports the consent status the fresh store resolved. */
async function coldLaunch(): Promise<{ route: string; status: string }> {
  let out = { route: '', status: '' };
  await new Promise<void>((resolve, reject) => {
    jest.isolateModules(() => {
      const { useConsentStore: c, readErasureRetirement: retire } = require('@/core/stores/consentStore');
      const { useSettingsStore: s } = require('@/core/stores/settingsStore');
      const { resolveInitialRoute: resolve_ } = require('@/core/navigation/resolveInitialRoute');
      (async () => {
        const [settings, consent, retired] = await Promise.all([
          s.getState().loadSettings(),
          c.getState().loadConsent(),
          retire(),
        ]);
        out = {
          route: resolve_({ settings, consent, consentStatus: 'loading', retired }),
          status: c.getState().consentStatus,
        };
      })().then(resolve, reject);
    });
  });
  return out;
}

/** Let the fire-and-forget retireErasedRecords started by loadConsent run to completion. */
async function settleCleanup(): Promise<void> {
  for (let i = 0; i < 40; i += 1) await new Promise<void>((r) => setImmediate(r));
}

describe('DEBUG-762: an erased install whose records are DELETED still never reaches Main', () => {
  const ERASED_KEYS = ['consent_record_v1', 'legal_gate_consents_v1', 'age_verification_v1', 'auth_device_id'];

  it('attestation present, consent record absent, onboardingCompleted:true → retired → LegalGate', async () => {
    await seedOnboardedAccount();
    now += 60_000;
    await useConsentStore.getState().recordAccountDeletionAttestation();
    mockSecure.delete('consent_record_v1');
    expect(JSON.parse(mockAsync.get('app_settings_v1')!).onboardingCompleted).toBe(true);

    expect(await readErasureRetirement()).toBe(true);
    expect((await coldLaunch()).route).toBe('LegalGate');
  });

  it('control: no attestation and no consent record is NOT retired (a first-ever launch)', async () => {
    expect(await readErasureRetirement()).toBe(false);
  });

  it('control: attestation present and a record that POST-dates it is not retired', async () => {
    await seedOnboardedAccount();
    now += 60_000;
    await useConsentStore.getState().recordAccountDeletionAttestation();
    now += 60_000;
    await seedOnboardedAccount();
    expect(await readErasureRetirement()).toBe(false);
  });

  it('AC4 two launches: stale records are deleted after launch 1; launch 2 is still LegalGate, never Main', async () => {
    // The cipher singleton caches its key across tests while mockSecure was just emptied:
    // provision a real master key on disk so the "master key survives" assertion is not vacuous.
    const encryption = require('@/core/services/security/EncryptionService').default;
    await encryption.deleteMasterKey();
    await encryption.initialize();
    await seedOnboardedAccount();
    // Bystanders the cleanup must never touch.
    mockSecure.set('stoic_practice_state', 'seeded-practice-cipher');
    mockSecure.set('auth_device_id', 'legacy-anchor');
    mockAsync.set('wellness_async_journal_entry', 'ciphertext');
    mockAsync.set('crisis_async_episode-1', 'ciphertext');
    mockAsync.set('assessment_async_a1', 'ciphertext');
    const masterKey = mockSecure.get('mental_health_master_key');
    expect(masterKey).toBeDefined();
    now += 60_000;
    // The state a shipped build leaves: attestation written, nothing wiped, settings still onboarded.
    await useConsentStore.getState().recordAccountDeletionAttestation();
    const attestation = mockSecure.get('account_deletion_attestation_v1');
    for (const key of ERASED_KEYS) expect([key, mockSecure.has(key)]).toEqual([key, true]);
    expect(JSON.parse(mockAsync.get('app_settings_v1')!).onboardingCompleted).toBe(true);

    const launch1 = await coldLaunch();
    expect(launch1).toEqual({ route: 'LegalGate', status: 'missing' });
    await settleCleanup();
    for (const key of ERASED_KEYS) expect([key, mockSecure.has(key)]).toEqual([key, false]);

    const launch2 = await coldLaunch();
    expect(launch2.route).toBe('LegalGate');
    expect(launch2.route).not.toBe('Main');
    expect(launch2.status).toBe('missing');
    await settleCleanup();

    // Survivors: the evidence, the user's wellness data, crisis/assessment data and the master key.
    expect(mockSecure.get('account_deletion_attestation_v1')).toBe(attestation);
    expect(mockSecure.get('stoic_practice_state')).toBe('seeded-practice-cipher');
    expect(mockSecure.get('mental_health_master_key')).toBe(masterKey);
    expect(mockAsync.get('wellness_async_journal_entry')).toBe('ciphertext');
    expect(mockAsync.get('crisis_async_episode-1')).toBe('ciphertext');
    expect(mockAsync.get('assessment_async_a1')).toBe('ciphertext');
    // No settings reset on this path.
    expect(JSON.parse(mockAsync.get('app_settings_v1')!).onboardingCompleted).toBe(true);
  });

  it('a completed erasure whose settings removeItem REJECTS still launches to LegalGate', async () => {
    await seedOnboardedAccount();
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const realRemove = AsyncStorage.removeItem.getMockImplementation()!;
    AsyncStorage.removeItem.mockImplementation(async (k: string) => {
      if (k === 'app_settings_v1') throw new Error('disk full');
      return realRemove(k);
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    now += 60_000;
    try {
      await deleteAccountAndWipe({ posthog: null });
    } finally {
      AsyncStorage.removeItem.mockImplementation(realRemove);
    }
    // The onboarded flag survived on disk, and the records are gone — the routing must hold.
    expect(JSON.parse(mockAsync.get('app_settings_v1')!).onboardingCompleted).toBe(true);
    expect(mockSecure.has('consent_record_v1')).toBe(false);
    expect((await coldLaunch()).route).toBe('LegalGate');
    await settleCleanup();
    expect((await coldLaunch()).route).toBe('LegalGate');
  });
});

describe('settings reset at erasure (AC3)', () => {
  it('registers settingsStore and consentStore with the erasure registry', () => {
    const owners = registeredErasureResetOwners();
    expect(owners).toContain('settingsStore');
    expect(owners).toContain('consentStore');
  });

  it('the settings reset never rejects, even when getCurrentUserId throws', async () => {
    await seedOnboardedAccount();
    const devMode = require('@/core/constants/devMode');
    jest.spyOn(devMode, 'getCurrentUserId').mockImplementation(() => {
      throw new Error('no user');
    });
    now += 60_000;
    await expect(deleteAccountAndWipe({ posthog: null })).resolves.toEqual({ ok: true });
    expect(useSettingsStore.getState().settings?.onboardingCompleted).toBe(false);
  });

  it('a background write in flight across the erasure cannot restore onboarding to memory', async () => {
    await seedOnboardedAccount();
    // A 988 dial backgrounds the app mid-deletion: AppLifecycleTracker's write starts
    // from the pre-erasure blob and is still pending when the erasure resets settings.
    mockHold.key = 'app_settings_v1';
    const background = useSettingsStore.getState().setLastActiveTimestamp(now);
    now += 60_000;
    const deletion = deleteAccountAndWipe({ posthog: null });
    await new Promise((r) => setTimeout(r, 20));
    mockHold.release?.();
    await Promise.all([background, deletion]);

    expect(useSettingsStore.getState().settings?.onboardingCompleted).toBe(false);
    const onDisk = mockAsync.get('app_settings_v1');
    expect(onDisk === undefined || JSON.parse(onDisk).onboardingCompleted === false).toBe(true);
  });
});

describe('the navigator routes through resolveInitialRoute (source pin)', () => {
  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const navigator = strip(
    fs.readFileSync(path.join(__dirname, '../../src/core/navigation/CleanRootNavigator.tsx'), 'utf8'),
  );
  const checkInitialRoute = navigator.slice(
    navigator.indexOf('async function checkInitialRoute'),
    navigator.indexOf('checkInitialRoute();'),
  );

  it('control: the slice is the checkInitialRoute body', () => {
    expect(checkInitialRoute.length).toBeGreaterThan(200);
    expect(checkInitialRoute).toMatch(/setInitialRoute\('LegalGate'\)/);
  });

  it('reads the retirement inside the existing allSettled and resolves through the pure function', () => {
    expect(checkInitialRoute).toMatch(/Promise\.allSettled\(\[[\s\S]*readErasureRetirement\(\)[\s\S]*\]\)/);
    expect(checkInitialRoute).toMatch(/resolveInitialRoute\(/);
    // The retirement must reach the decision: derived from the allSettled result and
    // passed through, never replaced by a literal.
    expect(checkInitialRoute).toMatch(/const retired = retiredResult\.status === 'fulfilled' && retiredResult\.value;/);
    expect(checkInitialRoute).toMatch(/resolveInitialRoute\(\{[^}]*\bretired\s*\}\)/);
    // No onboarded-first branch survives outside the pure function.
    expect(checkInitialRoute).not.toMatch(/settings\?\.onboardingCompleted\)\s*\{/);
  });

  it('CONTROL: the matchers fire on the shape they pin', () => {
    expect('resolveInitialRoute({ settings, consent, consentStatus, retired })').toMatch(
      /resolveInitialRoute\(\{[^}]*\bretired\s*\}\)/,
    );
    expect('resolveInitialRoute({ settings, consent, consentStatus, retired: false })').not.toMatch(
      /resolveInitialRoute\(\{[^}]*\bretired\s*\}\)/,
    );
    expect(strip('if (settings?.onboardingCompleted) {')).toMatch(/settings\?\.onboardingCompleted\)\s*\{/);
    expect('Promise.allSettled([loadSettings(), readErasureRetirement()])').toMatch(
      /Promise\.allSettled\(\[[\s\S]*readErasureRetirement\(\)[\s\S]*\]\)/,
    );
  });
});
