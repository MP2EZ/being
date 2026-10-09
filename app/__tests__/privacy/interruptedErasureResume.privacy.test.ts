/**
 * An erasure interrupted after the server confirmed it is finished at the next launch
 * (DEBUG-763, AC1 + AC2).
 *
 * Two windows used to leave an onboarded user on Main with the deleted account's data on
 * disk: the process killed before the attestation write (A), and the attestation write
 * failing before a kill (B). The erasure marker, written once the server confirms, makes
 * the launch retired (LegalGate, consent 'missing') and lets `resumeInterruptedErasure`
 * finish the local half with no server call.
 *
 * Each "process" is a fresh module registry over the same disks, and every storage state
 * comes from a REAL partial `deleteAccountAndWipe` run that a kill switch stops: from the
 * kill on, no write lands. `.privacy.` → INFRA-368.
 */

import fs from 'fs';
import path from 'path';

type Pred = (op: string, key: string) => boolean;
const mockAsync = new Map<string, string>();
const mockSecure = new Map<string, string>();
const mockDisk: { dead: boolean; kill: Pred | null; reject: Pred | null; hold: Pred | null; release: (() => void) | null } =
  { dead: false, kill: null, reject: null, hold: null, release: null };

function mockGate(op: string, key: string): Promise<void> | undefined {
  if (mockDisk.dead) return new Promise(() => undefined);
  if (mockDisk.kill?.(op, key)) {
    mockDisk.dead = true;
    return new Promise(() => undefined);
  }
  if (mockDisk.reject?.(op, key)) return Promise.reject(new Error('keychain unavailable'));
  if (mockDisk.hold?.(op, key)) {
    mockDisk.hold = null;
    return new Promise((resolve) => {
      mockDisk.release = resolve;
    });
  }
  return undefined;
}

jest.mock('@react-native-async-storage/async-storage', () => {
  const api = {
    getItem: jest.fn(async (k: string) => mockAsync.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      await mockGate('async.set', k);
      mockAsync.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      await mockGate('async.remove', k);
      mockAsync.delete(k);
    }),
    getAllKeys: jest.fn(async () => [...mockAsync.keys()]),
    multiRemove: jest.fn(async (keys: string[]) => {
      await mockGate('async.multiRemove', keys.join(','));
      keys.forEach((k) => mockAsync.delete(k));
    }),
  };
  return { __esModule: true, default: api, ...api };
});
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockSecure.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    await mockGate('secure.set', k);
    mockSecure.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    await mockGate('secure.delete', k);
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
const mockNav = { navigate: jest.fn(), dispatch: jest.fn(), reset: jest.fn(), resetRoot: jest.fn(), goBack: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => ({
    ...mockNav,
    isReady: () => true,
    getCurrentRoute: () => ({ name: 'CrisisResources' }),
    getRootState: () => ({ index: 0, routes: [{ name: 'CrisisResources' }] }),
  }),
}));

const MARKER = '@being/erasure_pending';
const ACCOUNT_KEYS = ['consent_record_v1', 'legal_gate_consents_v1', 'age_verification_v1', 'auth_device_id'];
const ATTESTATION_KEYS = ['consent_history_v1', 'account_deletion_attestation_v1'];
let now = 1_790_000_000_000;

function newProcess() {
  let p: any;
  jest.isolateModules(() => {
    p = {
      consent: require('@/core/stores/consentStore'),
      settings: require('@/core/stores/settingsStore'),
      route: require('@/core/navigation/resolveInitialRoute'),
      deletion: require('@/core/services/privacy/AccountDeletionService'),
      supabase: require('@/core/services/supabase/SupabaseService').default,
      storage: require('@/core/services/security/SecureStorageService').default,
    };
  });
  return p;
}

async function seedOnboarded(p: any): Promise<void> {
  const consent = p.consent.useConsentStore.getState();
  await consent.verifyAge(1990);
  await p.consent.recordLegalGateConsents({
    tosAccepted: true, privacyAccepted: true, wellnessDisclaimerAcknowledged: true, mentalHealthProcessingConsent: true,
  });
  const age = await consent.getStoredAgeVerification();
  await consent.grantConsent(
    { analyticsEnabled: false, crashReportsEnabled: false, cloudSyncEnabled: true, researchEnabled: false, mentalHealthProcessingConsent: true },
    age,
  );
  await p.consent.useConsentStore.getState().loadConsent();
  await p.settings.useSettingsStore.getState().loadSettings();
  await p.settings.useSettingsStore.getState().markOnboardingComplete();
  mockSecure.set('auth_device_id', 'legacy-anchor');
  mockSecure.set('stoic_practice_state', 'practice-cipher');
  expect(mockSecure.get('mental_health_master_key')).toBeDefined(); // non-vacuous master-key check
  mockAsync.set('wellness_async_journal_entry', 'ciphertext');
}

/** What checkInitialRoute computes in process `p`. */
async function launch(p: any): Promise<{ route: string; status: string }> {
  const [settings, consent, retired] = await Promise.all([
    p.settings.useSettingsStore.getState().loadSettings(),
    p.consent.useConsentStore.getState().loadConsent(),
    p.consent.readErasureRetirement(),
  ]);
  return {
    route: p.route.resolveInitialRoute({ settings, consent, consentStatus: 'loading', retired }),
    status: p.consent.useConsentStore.getState().consentStatus,
  };
}

const tick = async (n = 60) => {
  for (let i = 0; i < n; i += 1) await new Promise<void>((r) => setImmediate(r));
};

/** Run a deletion in a fresh process until the kill switch fires; return the server-erasure time. */
async function interruptedDeletion(window: 'A' | 'B'): Promise<number> {
  const p1 = newProcess();
  await seedOnboarded(p1);
  now += 60_000;
  const erasedAt = now;
  if (window === 'A') {
    mockDisk.kill = (op, key) => op === 'secure.set' && ATTESTATION_KEYS.includes(key);
  } else {
    mockDisk.reject = (op, key) => {
      if (op !== 'secure.set' || key !== 'consent_history_v1') return false;
      mockDisk.kill = () => true; // the attestation write fails, then the process dies
      return true;
    };
  }
  void p1.deletion.deleteAccountAndWipe({ posthog: null });
  await tick(200);
  expect(mockDisk.dead).toBe(true);
  Object.assign(mockDisk, { dead: false, kill: null, reject: null, hold: null, release: null });
  now += 60_000;
  return erasedAt;
}

function expectErased(): void {
  for (const key of [...ACCOUNT_KEYS, 'stoic_practice_state', 'mental_health_master_key']) {
    expect([key, mockSecure.has(key)]).toEqual([key, false]);
  }
  for (const key of ['wellness_async_journal_entry', 'app_settings_v1', MARKER]) {
    expect([key, mockAsync.has(key)]).toEqual([key, false]);
  }
}

beforeEach(() => {
  mockAsync.clear();
  mockSecure.clear();
  Object.assign(mockDisk, { dead: false, kill: null, reject: null, hold: null, release: null });
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe.each(['A', 'B'] as const)('window %s: server erased, local erasure interrupted', (window) => {
  it('the next launch is retired (LegalGate, consent missing) — an onboarded user never reaches Main', async () => {
    await interruptedDeletion(window);
    expect(JSON.parse(mockAsync.get('app_settings_v1')!).onboardingCompleted).toBe(true);
    expect(mockSecure.has('consent_record_v1')).toBe(true);
    expect(mockSecure.has('account_deletion_attestation_v1')).toBe(false);
    expect(await launch(newProcess())).toEqual({ route: 'LegalGate', status: 'missing' });
  });

  it('the resume finishes the erasure with no server call and backfills the attestation at the server-erasure time', async () => {
    const erasedAt = await interruptedDeletion(window);
    const p2 = newProcess();
    await launch(p2);
    await expect(p2.deletion.resumeInterruptedErasure()).resolves.toBeUndefined();

    expectErased();
    expect(p2.supabase.deleteAccount).not.toHaveBeenCalled();
    const attestation = JSON.parse(mockSecure.get('account_deletion_attestation_v1')!);
    expect(attestation).toMatchObject({ action: 'revoked', timestamp: erasedAt, changes: { cloudSyncEnabled: true } });
    expect(await launch(newProcess())).toEqual({ route: 'LegalGate', status: 'missing' });
  });
});

describe('resumeInterruptedErasure', () => {
  it('control: an attestation with no marker is a no-op (nothing is wiped)', async () => {
    const p1 = newProcess();
    await seedOnboarded(p1);
    now += 60_000;
    await p1.consent.useConsentStore.getState().recordAccountDeletionAttestation();
    const masterKey = mockSecure.get('mental_health_master_key');
    const p2 = newProcess();
    await launch(p2);
    const wipe = jest.spyOn(p2.storage, 'clearAllWellnessData');
    await p2.deletion.resumeInterruptedErasure();
    expect(wipe).not.toHaveBeenCalled();
    expect(mockAsync.get('wellness_async_journal_entry')).toBe('ciphertext');
    expect(mockSecure.get('mental_health_master_key')).toBe(masterKey);
  });

  it('is single-flight', async () => {
    await interruptedDeletion('A');
    const p2 = newProcess();
    const wipe = jest.spyOn(p2.storage, 'clearAllWellnessData');
    const a = p2.deletion.resumeInterruptedErasure();
    expect(p2.deletion.resumeInterruptedErasure()).toBe(a);
    await a;
    expect(wipe).toHaveBeenCalledTimes(1);
  });

  it('never rejects: a failing wipe keeps the marker for the next launch', async () => {
    const erasedAt = await interruptedDeletion('A');
    const p2 = newProcess();
    mockDisk.reject = (op, key) => op === 'secure.delete' && key === 'consent_record_v1';
    await expect(p2.deletion.resumeInterruptedErasure()).resolves.toBeUndefined();
    expect(mockAsync.get(MARKER)).toBe(String(erasedAt));
    expect((await launch(newProcess())).route).toBe('LegalGate');
  });

  it('dispatches no navigation, even with CrisisResources as the active root route', async () => {
    await interruptedDeletion('A');
    await newProcess().deletion.resumeInterruptedErasure();
    expectErased();
    for (const fn of Object.values(mockNav)) expect(fn).not.toHaveBeenCalled();
  });
});

describe('grant join: a grant made while the resume runs lands after the wipe and survives', () => {
  it('verifyAge, recordLegalGateConsents and grantConsent wait for the resume', async () => {
    const erasedAt = await interruptedDeletion('A');
    const p2 = newProcess();
    await launch(p2);
    mockDisk.hold = (op, key) => op === 'secure.delete' && key === 'consent_record_v1';
    const resume = p2.deletion.resumeInterruptedErasure();
    await tick();
    expect(mockDisk.release).not.toBeNull();

    const store = p2.consent.useConsentStore.getState();
    const gate = (async () => {
      await store.verifyAge(1991);
      await p2.consent.recordLegalGateConsents({
        tosAccepted: true, privacyAccepted: true, wellnessDisclaimerAcknowledged: true, mentalHealthProcessingConsent: false,
      });
    })();
    const grant = store.grantConsent(
      { analyticsEnabled: false, crashReportsEnabled: false, cloudSyncEnabled: false, researchEnabled: false, mentalHealthProcessingConsent: false },
      { verified: true, birthYear: 1991, ageAtVerification: 35, verifiedAt: now, isEligible: true },
    );
    await tick();
    // The wipe already removed these; the waiting writes have not landed.
    expect(mockSecure.has('age_verification_v1')).toBe(false);
    expect(mockSecure.has('legal_gate_consents_v1')).toBe(false);

    mockDisk.release!();
    await Promise.all([resume, gate, grant]);
    for (const key of ['age_verification_v1', 'legal_gate_consents_v1', 'consent_record_v1']) {
      const record = JSON.parse(mockSecure.get(key)!);
      expect([key, (record.timestamp ?? record.verifiedAt) > erasedAt]).toEqual([key, true]);
    }
    expect(await p2.consent.readErasureRetirement()).toBe(false);
  });
});

describe('the erasure marker', () => {
  it('a marker alone retires the launch', async () => {
    const p = newProcess();
    await seedOnboarded(p);
    expect(await p.consent.readErasureRetirement()).toBe(false);
    mockAsync.set(MARKER, String(now));
    expect(await p.consent.readErasureRetirement()).toBe(true);
  });

  it('matches no sweep pattern, so a wipe can never remove it before it is cleared', () => {
    const { SWEPT_ASYNC_PREFIXES, SECURE_STORAGE_CONFIG } = require('@/core/services/security/SecureStorageService');
    const { isLegacyPlaintextRecord } = require('@/core/services/security/legacyPlaintextRecordSweeper');
    const { ERASURE_PENDING_KEY } = require('@/core/services/privacy/erasurePending');
    expect(ERASURE_PENDING_KEY).toBe(MARKER);
    expect(SWEPT_ASYNC_PREFIXES.some((p: string) => MARKER.startsWith(p))).toBe(false);
    expect(SECURE_STORAGE_CONFIG.SWEPT_EXACT_KEYS).not.toContain(MARKER);
    expect(isLegacyPlaintextRecord(MARKER)).toBe(false);
    expect(isLegacyPlaintextRecord('assessment_audit_trail')).toBe(true); // control: the predicate fires
  });
});

describe('source pins (comment-stripped, DEBUG-390)', () => {
  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const read = (rel: string) => strip(fs.readFileSync(path.join(__dirname, '../../src', rel), 'utf8'));
  const navigator = read('core/navigation/CleanRootNavigator.tsx');
  const checkInitialRoute = navigator.slice(
    navigator.indexOf('async function checkInitialRoute'),
    navigator.indexOf('checkInitialRoute();'),
  );
  const success = checkInitialRoute.slice(0, checkInitialRoute.indexOf('} catch'));

  it('control: the slices are the checkInitialRoute body and its success branch', () => {
    expect(success).toMatch(/if \(cancelled\) return;[\s\S]*setInitialRoute\(resolveInitialRoute\(/);
    expect(checkInitialRoute.slice(success.length)).toMatch(/setInitialRoute\('LegalGate'\)/);
  });

  it('the navigator fires the resume once, unawaited, only after the success branch set the route', () => {
    expect(navigator.match(/resumeInterruptedErasure\(\)/g)).toHaveLength(1);
    expect(success).toMatch(
      /setInitialRoute\(resolveInitialRoute\([\s\S]*\)\);\s*if \(!erasureResumeStarted\) \{\s*erasureResumeStarted = true;\s*void resumeInterruptedErasure\(\);/,
    );
    expect(navigator).toMatch(/^let erasureResumeStarted = false;$/m);
    expect(navigator).not.toMatch(/await resumeInterruptedErasure/);
  });

  it('the service shows no UI and dispatches no navigation', () => {
    const service = read('core/services/privacy/AccountDeletionService.ts');
    const forbidden = /navigationRef|\.navigate\(|\.dispatch\(|\bAlert\b|announceForAccessibility|Toast/;
    expect(service).not.toMatch(forbidden);
    expect('Alert.alert("x")').toMatch(forbidden); // control
  });
});
