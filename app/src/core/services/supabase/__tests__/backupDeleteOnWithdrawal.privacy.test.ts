/**
 * DEBUG-764 — withdrawing cloud-backup consent deletes the server copy.
 *
 * THE GAP. Turning the Settings Backup switch off (or revoking consent, or re-consenting with
 * backup unticked) stopped FUTURE uploads (MAINT-173, DEBUG-756), but nothing deleted the
 * `encrypted_backups` row already on the server. It stayed until account deletion. The RLS
 * policy `backups_delete` (20260607120000_auth_uid_rls.sql) has always allowed the client to
 * delete its own row; no client path ever did.
 *
 * THE RULING (compliance R1-R5, crisis constraints; b-batch panel, founder-approved).
 *   - Delete on a committed consent transition whose prior record had cloud sync on and was
 *     not revoked, and whose next record is non-null with cloud sync off or revoked.
 *     Never on Universal Opt-Out (suppression only), hydration, erasure reset, expiry,
 *     version_mismatch, 'loading', or the CloudBackupSettings auto-backup toggle.
 *   - Attempted at once with no consent gate. On failure a pending record {uid, requestedAt}
 *     persists in its own AsyncStorage key (not the offline queue, which drops and evicts)
 *     and is retried at consent hydration and on every foreground until the server confirms.
 *   - Never mints an identity to delete. No persisted session and no userId -> nothing to
 *     delete; a uid mismatch at execution -> cleared without deleting.
 *   - saveBackup / getBackup drain the pending delete FIRST; queued pre-withdrawal snapshots
 *     are dropped; after a confirmed delete the change-detection hash is cleared so a re-grant
 *     uploads a fresh backup.
 *   - The delete stays behind the shared circuit breaker and runs after the crisis flush on
 *     'active', so it can never gate crisis delivery.
 *
 * WHY THE REAL SERVICE AND THE REAL CONSENT STORE. The trigger is a store transition, read
 * through a subscription; mocking either side would assert the wiring into existence.
 */

const mockMemoryStore = new Map<string, string>();
const mockSecureStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => {
  const impl = {
    getItem: jest.fn(async (k: string) => mockMemoryStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockMemoryStore.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      mockMemoryStore.delete(k);
    }),
    getAllKeys: jest.fn(async () => [...mockMemoryStore.keys()]),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => mockMemoryStore.delete(k));
    }),
  };
  return { __esModule: true, default: impl, ...impl };
});

jest.mock('expo-secure-store', () => ({
  // Guarded: modules that read the Keychain at import run before this map is initialised.
  getItemAsync: jest.fn(async (k: string) => mockSecureStore?.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockSecureStore?.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecureStore?.delete(k);
  }),
}));

jest.mock('@/core/services/security/pinned-fetch', () => ({
  validatePinningConfiguration: () => ({ valid: true, errors: [] }),
  createSupabasePinnedFetch: () => async () => {
    throw new Error('network is faked at the client in this suite');
  },
}));

// The persisted-session probe is the "is there an identity?" oracle (DEBUG-704).
const mockReadPersistedSession = jest.fn();
jest.mock('@/core/services/supabase/secureStoreSessionAdapter', () => ({
  createSecureStoreSessionAdapter: () => ({}),
  readPersistedSession: (...args: unknown[]) => mockReadPersistedSession(...args),
  removePersistedSession: jest.fn(async () => undefined),
  supabaseAuthStorageKey: () => 'sb-test-auth-token',
}));

const mockCreateClient = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
  isAuthApiError: () => false,
}));

import { AppState } from 'react-native';
import supabaseService from '@/core/services/supabase/SupabaseService';
import { cloudBackupService } from '@/core/services/supabase/CloudBackupService';
import {
  useConsentStore,
  CONSENT_VERSION,
  type ConsentRecord,
  type ConsentPreferences,
} from '@/core/stores/consentStore';
import SecureStorageService, {
  SECURE_STORAGE_CONFIG,
} from '@/core/services/security/SecureStorageService';
import { resetInMemoryStateForErasure } from '@/core/services/privacy/erasureResetRegistry';
import EncryptionService from '@/core/services/security/EncryptionService';

const PENDING_KEY = '@being/supabase/pending_backup_delete';
const OFFLINE_QUEUE_KEY = '@being/supabase/offline_queue';
const LAST_SYNC_KEY = '@being/supabase/last_sync';
const LAST_BACKUP_KEY = '@being/cloud_backup/last_backup';
const UID = 'user-764';
const MARKER = 'PRE_WITHDRAWAL_SNAPSHOT_d764';

type ServiceInternals = {
  offlineQueue: Array<{ operation: string }>;
  isInitialized: boolean;
  client: unknown;
  userId: string | null;
  deletionsInFlight: number;
  backupDeleteInFlight: Promise<boolean> | null;
  crisisAnalyticsQueue: unknown[];
  circuitBreaker: { failures: number; lastFailureTime: number; state: string };
  setupAppStateListener: () => void;
  flushCrisisAnalytics: () => Promise<void>;
  sleep: (ms: number) => Promise<void>;
};
const internals = supabaseService as unknown as ServiceInternals;

// ── Fake client ─────────────────────────────────────────────────────────────
type Resp = { data: unknown; error: unknown };
let deleteImpl: () => Promise<Resp> = async () => ({ data: null, error: null });
const eqDelete = jest.fn((_col: string, _val: unknown) => deleteImpl());
const del = jest.fn(() => ({ eq: eqDelete }));
const upsert = jest.fn(async (_row: unknown, _opts?: unknown) => ({ data: null, error: null }));
const single = jest.fn(async () => ({
  data: { id: 'b1', user_id: UID, encrypted_data: 'x', checksum: 'c', version: 1, created_at: 'now' },
  error: null,
}));
const select = jest.fn(() => {
  const chain: Record<string, unknown> = {};
  chain.eq = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.single = single;
  return chain;
});
const insert = jest.fn(async (_rows: unknown) => ({ data: null, error: null }));
let sessionUid: string | null = UID;
const getSession = jest.fn(async () => ({
  data: { session: sessionUid ? { user: { id: sessionUid }, access_token: 't' } : null },
  error: null,
}));
const signInAnonymously = jest.fn(async () => ({ data: { user: { id: 'minted' } }, error: null }));
const fakeClient = {
  from: jest.fn((table: string) => {
    if (table === 'encrypted_backups') return { upsert, delete: del, select };
    if (table === 'analytics_events') return { insert };
    throw new Error(`unexpected table ${table}`);
  }),
  auth: { getSession, signInAnonymously },
};

const settle = async () => {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
};

// ── Consent fixtures (driven through the REAL store) ────────────────────────
const PREFS_ON: ConsentPreferences = {
  analyticsEnabled: false,
  crashReportsEnabled: false,
  cloudSyncEnabled: true,
  researchEnabled: false,
  mentalHealthProcessingConsent: true,
};

function record(over: Partial<ConsentRecord> = {}): ConsentRecord {
  const now = Date.now();
  return {
    consentId: 'consent-764',
    userId: 'test-user',
    version: CONSENT_VERSION,
    preferences: PREFS_ON,
    universalOptOut: false,
    ageVerification: { verified: true, birthYear: 1990, ageAtVerification: 36, verifiedAt: now - 1000, isEligible: true },
    timestamp: now - 1000,
    updatedAt: now - 1000,
    expiresAt: now + 365 * 24 * 3600 * 1000,
    revoked: false,
    ...over,
  };
}

/** What loadConsent's final set() does for a valid record — a hydration, not a withdrawal. */
function hydrate(rec: ConsentRecord | null, consentStatus = 'valid'): void {
  const sync = !!rec && rec.preferences.cloudSyncEnabled && !rec.universalOptOut;
  useConsentStore.setState({
    currentConsent: rec,
    staleConsent: null,
    consentStatus: consentStatus as never,
    consentCache: {
      ...useConsentStore.getState().consentCache,
      canSyncToCloud: sync,
      honorUniversalOptOut: !!rec?.universalOptOut,
    },
  });
}

function backToLoading(): void {
  useConsentStore.setState({
    currentConsent: null,
    staleConsent: null,
    consentStatus: 'loading',
    consentHistory: [],
    error: null,
  });
}

/** The service's own AppState handler — the retry path that does not depend on the barrel. */
function serviceActiveHandler(): (state: string) => void {
  const spy = jest.spyOn(AppState, 'addEventListener');
  internals.setupAppStateListener();
  const handler = spy.mock.calls[spy.mock.calls.length - 1]![1] as (state: string) => void;
  spy.mockRestore();
  return handler;
}

const pendingOnDisk = () => JSON.parse(mockMemoryStore.get(PENDING_KEY) ?? 'null');

let sleepSpy: jest.SpyInstance;

beforeAll(() => {
  // Consent history is encrypted in production; this suite is about the transition.
  const blobs = new Map<string, unknown>();
  jest.spyOn(SecureStorageService, 'storeWellnessBlob').mockImplementation(async (key: string, data: unknown) => {
    blobs.set(key, data);
    return { success: true } as never;
  });
  jest
    .spyOn(SecureStorageService, 'retrieveWellnessBlob')
    .mockImplementation(async (key: string) => (blobs.get(key) ?? null) as never);
  jest.spyOn(EncryptionService, 'encryptData').mockResolvedValue({ ciphertext: 'enc' } as never);
});

beforeEach(async () => {
  backToLoading();
  await settle();
  mockMemoryStore.clear();
  mockSecureStore.clear();
  jest.clearAllMocks();
  deleteImpl = async () => ({ data: null, error: null });
  sessionUid = UID;
  mockCreateClient.mockImplementation(() => fakeClient);
  mockReadPersistedSession.mockResolvedValue({ present: true, uid: UID });
  internals.offlineQueue = [];
  internals.isInitialized = true;
  internals.client = fakeClient;
  internals.userId = UID;
  internals.deletionsInFlight = 0;
  internals.backupDeleteInFlight = null; // the 'hangs' case leaves one stuck on the singleton
  internals.crisisAnalyticsQueue = [];
  internals.circuitBreaker = { failures: 0, lastFailureTime: 0, state: 'closed' };
  (cloudBackupService as unknown as { isInitialized: boolean }).isInitialized = true;
  (cloudBackupService as unknown as { lastBackupHash: string | null }).lastBackupHash = null;
  // Clear any pending record left in memory by a previous case.
  await resetInMemoryStateForErasure();
  sleepSpy = jest.spyOn(internals, 'sleep').mockResolvedValue(undefined);
  hydrate(record());
  await settle();
  jest.clearAllMocks();
});

afterEach(() => {
  sleepSpy.mockRestore();
});

afterAll(async () => {
  internals.client = null;
  await supabaseService.cleanup();
});

describe('withdrawal deletes the server backup (R2/R3)', () => {
  it("Settings Backup switch off (updateConsent): deletes the caller's row, exactly once", async () => {
    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: false });
    await settle();

    expect(del).toHaveBeenCalledTimes(1);
    expect(eqDelete).toHaveBeenCalledTimes(1);
    expect(eqDelete).toHaveBeenCalledWith('user_id', UID);
    expect(pendingOnDisk()).toBeNull();
  });

  it('revokeConsent deletes', async () => {
    await useConsentStore.getState().revokeConsent('user_request');
    await settle();

    expect(eqDelete).toHaveBeenCalledTimes(1);
    expect(eqDelete).toHaveBeenCalledWith('user_id', UID);
  });

  it('re-consent from version_mismatch with backup unticked (renewConsent) deletes', async () => {
    backToLoading();
    useConsentStore.setState({
      currentConsent: null,
      staleConsent: record({ version: '1.0.0' }),
      consentStatus: 'version_mismatch',
    });
    await settle();
    jest.clearAllMocks();

    await useConsentStore.getState().renewConsent({ ...PREFS_ON, cloudSyncEnabled: false });
    await settle();

    expect(useConsentStore.getState().consentStatus).toBe('valid');
    expect(eqDelete).toHaveBeenCalledTimes(1);
  });

  it('zero rows deleted is success: the pending record is cleared', async () => {
    deleteImpl = async () => ({ data: [], error: null });
    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: false });
    await settle();

    expect(eqDelete).toHaveBeenCalled();
    expect(mockMemoryStore.has(PENDING_KEY)).toBe(false);
  });

  it('a resolved {error} persists the record; the service\'s own foreground retries until success', async () => {
    deleteImpl = async () => ({ data: null, error: { message: 'offline' } });
    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: false });
    await settle();

    expect(eqDelete).toHaveBeenCalled();
    expect(pendingOnDisk()).toEqual(expect.objectContaining({ uid: UID, requestedAt: expect.any(Number) }));

    const onActive = serviceActiveHandler();
    eqDelete.mockClear();
    onActive('active');
    await settle();
    expect(eqDelete).toHaveBeenCalled(); // still failing
    expect(pendingOnDisk()).not.toBeNull();

    deleteImpl = async () => ({ data: null, error: null });
    eqDelete.mockClear();
    onActive('active');
    await settle();
    expect(eqDelete).toHaveBeenCalledTimes(1);
    expect(eqDelete).toHaveBeenCalledWith('user_id', UID);
    expect(mockMemoryStore.has(PENDING_KEY)).toBe(false);

    eqDelete.mockClear();
    onActive('active');
    await settle();
    expect(eqDelete).not.toHaveBeenCalled(); // confirmed — no more attempts
  });

  it('a thrown network error also persists the record', async () => {
    deleteImpl = async () => {
      throw new TypeError('Network request failed');
    };
    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: false });
    await settle();

    expect(pendingOnDisk()).toEqual(expect.objectContaining({ uid: UID }));
  });

  it('a cold process holding the record deletes once consent hydrates, without minting', async () => {
    mockMemoryStore.set(PENDING_KEY, JSON.stringify({ uid: UID, requestedAt: 1 }));
    let svc: typeof supabaseService;
    let store: typeof useConsentStore;
    jest.isolateModules(() => {
      svc = require('@/core/services/supabase/SupabaseService').default;
      store = require('@/core/stores/consentStore').useConsentStore;
    });
    expect((svc! as unknown as ServiceInternals).client).toBeNull();

    store!.setState({
      currentConsent: record({ preferences: { ...PREFS_ON, cloudSyncEnabled: false } }),
      consentStatus: 'valid',
    });
    await settle();

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(eqDelete).toHaveBeenCalledWith('user_id', UID);
    expect(mockMemoryStore.has(PENDING_KEY)).toBe(false);
  });
});

describe('what never deletes (R1/R2)', () => {
  it('Universal Opt-Out alone does not delete (queue still dropped on foreground)', async () => {
    await supabaseService.saveBackup(MARKER, 'chk', 1); // uploads under valid consent
    internals.client = null; // next one cannot send
    await supabaseService.saveBackup(MARKER, 'chk', 1);
    expect(internals.offlineQueue).toHaveLength(1);
    internals.client = fakeClient;

    await useConsentStore.getState().setUniversalOptOut(true);
    await settle();
    expect(eqDelete).not.toHaveBeenCalled();

    serviceActiveHandler()('active');
    await settle();
    expect(eqDelete).not.toHaveBeenCalled();
    expect(internals.offlineQueue).toEqual([]);
    expect(mockMemoryStore.has(PENDING_KEY)).toBe(false);
  });

  it('Universal Opt-Out off again does not delete', async () => {
    await useConsentStore.getState().setUniversalOptOut(true);
    await useConsentStore.getState().setUniversalOptOut(false);
    await settle();
    expect(eqDelete).not.toHaveBeenCalled();
  });

  it('hydration of a cloud-sync-off record does not delete', async () => {
    backToLoading();
    await settle();
    hydrate(record({ preferences: { ...PREFS_ON, cloudSyncEnabled: false } }));
    await settle();
    expect(eqDelete).not.toHaveBeenCalled();
  });

  it('real loadConsent of an EXPIRED record, and of a revoked one, does not delete', async () => {
    backToLoading();
    mockSecureStore.set('consent_record_v1', JSON.stringify(record({ expiresAt: Date.now() - 1000 })));
    await useConsentStore.getState().loadConsent();
    await settle();
    expect(useConsentStore.getState().consentStatus).toBe('expired');

    mockSecureStore.set('consent_record_v1', JSON.stringify(record({ revoked: true })));
    await useConsentStore.getState().loadConsent();
    await settle();
    expect(useConsentStore.getState().consentStatus).toBe('revoked');
    expect(eqDelete).not.toHaveBeenCalled();
  });

  it("valid -> expired re-load, and valid -> 'loading', do not delete", async () => {
    useConsentStore.setState({ consentStatus: 'expired' });
    await settle();
    backToLoading();
    await settle();
    expect(eqDelete).not.toHaveBeenCalled();
  });

  it('erasure reset of consent to null does not delete', async () => {
    useConsentStore.setState({ currentConsent: null, consentStatus: 'missing' });
    await settle();
    expect(eqDelete).not.toHaveBeenCalled();
  });

  it('the CloudBackupSettings auto-backup toggle does not delete', async () => {
    await cloudBackupService.updateConfig({ autoBackupEnabled: false });
    await settle();
    expect(eqDelete).not.toHaveBeenCalled();
  });

  it('a toggle that leaves cloud sync on (analytics off) does not delete', async () => {
    await useConsentStore.getState().updateConsent({ analyticsEnabled: false });
    await settle();
    expect(eqDelete).not.toHaveBeenCalled();
  });
});

describe('re-grant cannot resurrect a pre-withdrawal backup (R4)', () => {
  it('a queued pre-withdrawal snapshot never uploads; the delete precedes the next upsert', async () => {
    internals.client = null;
    await supabaseService.saveBackup(MARKER, 'chk', 1); // queued while offline
    expect(internals.offlineQueue).toHaveLength(1);
    internals.client = fakeClient;

    deleteImpl = async () => ({ data: null, error: { message: 'offline' } });
    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: false });
    await settle();
    expect(internals.offlineQueue).toEqual([]);
    expect(mockMemoryStore.get(OFFLINE_QUEUE_KEY) ?? '').not.toContain(MARKER);

    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: true });
    deleteImpl = async () => ({ data: null, error: null });
    eqDelete.mockClear();
    await supabaseService.processOfflineQueue();
    await expect(supabaseService.saveBackup('FRESH', 'chk2', 1)).resolves.toBe(true);

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0]![0]).toEqual(expect.objectContaining({ encrypted_data: 'FRESH' }));
    expect(eqDelete).toHaveBeenCalledTimes(1);
    expect(eqDelete.mock.invocationCallOrder[0]!).toBeLessThan(upsert.mock.invocationCallOrder[0]!);
  });

  it('while the delete keeps failing, saveBackup returns false and enqueues nothing', async () => {
    deleteImpl = async () => ({ data: null, error: { message: 'offline' } });
    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: false });
    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: true });
    await settle();

    await expect(supabaseService.saveBackup('FRESH', 'chk2', 1)).resolves.toBe(false);
    expect(upsert).not.toHaveBeenCalled();
    expect(internals.offlineQueue).toEqual([]);
  });

  it('getBackup drains the pending delete first; a failing drain returns null', async () => {
    deleteImpl = async () => ({ data: null, error: { message: 'offline' } });
    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: false });
    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: true });
    await settle();

    await expect(supabaseService.getBackup()).resolves.toBeNull();
    expect(select).not.toHaveBeenCalled();

    deleteImpl = async () => ({ data: null, error: null });
    eqDelete.mockClear();
    await supabaseService.getBackup();
    expect(eqDelete).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledTimes(1);
    expect(eqDelete.mock.invocationCallOrder[0]!).toBeLessThan(select.mock.invocationCallOrder[0]!);
  });

  it('a re-grant with UNCHANGED data still uploads: the change-detection hash is cleared', async () => {
    expect((await cloudBackupService.createBackup()).success).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(mockMemoryStore.has(LAST_BACKUP_KEY)).toBe(true);
    expect(mockMemoryStore.has(LAST_SYNC_KEY)).toBe(true);

    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: false });
    await settle();
    expect(eqDelete).toHaveBeenCalledTimes(1);
    expect(mockMemoryStore.has(LAST_BACKUP_KEY)).toBe(false);
    expect(mockMemoryStore.has(LAST_SYNC_KEY)).toBe(false);

    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: true });
    await settle();
    expect((await cloudBackupService.createBackup()).success).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(2);
  });
});

describe('identity (R4): never mint to delete', () => {
  it('no persisted session and no userId: no client is built, nothing is minted, the record is cleared', async () => {
    internals.client = null;
    internals.userId = null;
    mockReadPersistedSession.mockResolvedValue({ present: false, uid: null });

    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: false });
    await settle();

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(fakeClient.from).not.toHaveBeenCalled();
    expect(mockMemoryStore.has(PENDING_KEY)).toBe(false);
  });

  it('a persisted session restored without a mint is used for the delete', async () => {
    internals.client = null;
    internals.userId = null;

    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: false });
    await settle();

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(eqDelete).toHaveBeenCalledWith('user_id', UID);
  });

  it('a uid mismatch at execution clears the record without deleting', async () => {
    internals.userId = 'old-uid';
    deleteImpl = async () => ({ data: null, error: { message: 'offline' } });
    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: false });
    await settle();
    expect(pendingOnDisk()).toEqual(expect.objectContaining({ uid: 'old-uid' }));

    internals.userId = 'new-uid';
    deleteImpl = async () => ({ data: null, error: null });
    eqDelete.mockClear();
    serviceActiveHandler()('active');
    await settle();

    expect(eqDelete).not.toHaveBeenCalled();
    expect(mockMemoryStore.has(PENDING_KEY)).toBe(false);
  });

  it('skipped while deleteAccount is in flight; retried once it is not', async () => {
    internals.deletionsInFlight = 1;
    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: false });
    await settle();
    expect(eqDelete).not.toHaveBeenCalled();
    expect(pendingOnDisk()).toEqual(expect.objectContaining({ uid: UID }));

    internals.deletionsInFlight = 0;
    serviceActiveHandler()('active');
    await settle();
    expect(eqDelete).toHaveBeenCalledTimes(1);
  });
});

describe('erasure sweeps the pending record (it holds the uid)', () => {
  it('the key is on SWEPT_EXACT_KEYS', () => {
    expect(SECURE_STORAGE_CONFIG.SWEPT_EXACT_KEYS).toContain(PENDING_KEY);
  });

  it('reset + wipe: the record leaves disk and memory, and no later foreground deletes', async () => {
    deleteImpl = async () => ({ data: null, error: { message: 'offline' } });
    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: false });
    await settle();
    expect(mockMemoryStore.has(PENDING_KEY)).toBe(true);

    await resetInMemoryStateForErasure();
    await SecureStorageService.clearAllWellnessData({ deleteMasterKey: true });
    expect(mockMemoryStore.has(PENDING_KEY)).toBe(false);

    deleteImpl = async () => ({ data: null, error: null });
    eqDelete.mockClear();
    serviceActiveHandler()('active');
    await settle();
    expect(eqDelete).not.toHaveBeenCalled();
    expect(mockMemoryStore.has(PENDING_KEY)).toBe(false);
  });
});

describe('crisis pin: the backup delete can never gate crisis delivery', () => {
  const crisisEvent = () => ({
    event_type: 'crisis_detected',
    properties: { trigger_type: 'phq9_q9', severity_bucket: 'high' },
    session_id: 'session_2026-10-09_abc',
    enqueued_at: Date.now(),
  });

  async function withPendingDelete(): Promise<void> {
    deleteImpl = async () => ({ data: null, error: { message: 'offline' } });
    await useConsentStore.getState().updateConsent({ cloudSyncEnabled: false });
    await settle();
    expect(pendingOnDisk()).not.toBeNull();
    jest.clearAllMocks();
  }

  it.each<[string, () => Promise<Resp>]>([
    ['rejects', async () => { throw new Error('boom'); }],
    ['hangs', () => new Promise<Resp>(() => {})],
  ])("'active' still issues the crisis insert, flushed before the retry, when the delete %s", async (_l, impl) => {
    await withPendingDelete();
    deleteImpl = impl;
    internals.crisisAnalyticsQueue = [crisisEvent()];
    const flushSpy = jest.spyOn(internals, 'flushCrisisAnalytics');

    serviceActiveHandler()('active');
    await settle();

    expect(insert).toHaveBeenCalledTimes(1);
    const rows = insert.mock.calls[0]![0] as Array<{ user_id: string }>;
    expect(rows.every((r) => r.user_id === UID)).toBe(true);
    expect(internals.userId).toBe(UID);
    expect(eqDelete).toHaveBeenCalled();
    expect(flushSpy.mock.invocationCallOrder[0]!).toBeLessThan(eqDelete.mock.invocationCallOrder[0]!);
    flushSpy.mockRestore();
  });

  it("'active' still issues the crisis insert when the retry throws synchronously", async () => {
    await withPendingDelete();
    internals.crisisAnalyticsQueue = [crisisEvent()];
    const svc = supabaseService as unknown as { drainPendingBackupDelete: () => Promise<boolean> };
    expect(typeof svc.drainPendingBackupDelete).toBe('function');
    const spy = jest.spyOn(svc, 'drainPendingBackupDelete').mockImplementation(() => {
      throw new Error('sync throw');
    });
    try {
      expect(() => serviceActiveHandler()('active')).not.toThrow();
      await settle();
      expect(spy).toHaveBeenCalled();
      expect(insert).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('the delete never bypasses the breaker: breaker open -> crisis still delivered, no delete sent', async () => {
    await withPendingDelete();
    internals.circuitBreaker = { failures: 5, lastFailureTime: Date.now(), state: 'open' };
    internals.crisisAnalyticsQueue = [crisisEvent()];
    deleteImpl = async () => ({ data: null, error: null });

    serviceActiveHandler()('active');
    await settle();

    expect(insert).toHaveBeenCalledTimes(1);
    expect(eqDelete).not.toHaveBeenCalled();
    expect(pendingOnDisk()).not.toBeNull();
  });
});
