/**
 * DEBUG-704 — account deletion must reach the server when no client was built that run — UNIT
 *
 * THE DEFECT. `deleteAccount()` began `if (!this.client || !this.userId) return true;`.
 * `this.client` is built only by `ensureClient()`, which the deletion route never reaches
 * (crisis-telemetry boot needs a non-empty queue; `initialize()` runs from Cloud Backup).
 * So a server-account holder who deleted in a run with no pending crisis event and no
 * Cloud Backup visit got "erased" with no network call: their `crisis_detected` rows and
 * `encrypted_backups` stayed, the persisted session survived, and the next client build
 * restored the "deleted" uid.
 *
 * WHY THE OLD SUITE MISSED IT. `SupabaseService.test.ts` called `initialize()` in its
 * deletion `beforeEach`, so a client always existed, and its "no session" case only
 * nulled `userId`. Every case here starts from a FRESH instance that has never been
 * initialised — the shape the real deletion route has.
 *
 * WHAT IS MOCKED: the network boundary (`createSupabasePinnedFetch`) and the Keychain
 * (`expo-secure-store`, as an in-memory map). `@supabase/supabase-js` is the REAL client —
 * `createClient` is only wrapped so a test can count constructions or swap `signOut`.
 * The real GoTrue client restores the session through the real chunking adapter, the real
 * FunctionsClient carries the bearer token, and the real auth-js error parser turns the
 * fake server's 403 body into the `AuthApiError` the reconciliation keys on. The fake
 * server deletes by the bearer token's `sub`, like the edge function's gateway-verified
 * `sub`, so a lost response and a retry are modelled, not asserted into existence.
 */
import { jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage');

// ── Fake Supabase server ────────────────────────────────────────────────────
type FunctionsMode = 'ok' | 'lose-response' | 'down' | 'error500-keep-user';
type UserMode = 'ok' | 'offline' | 'bad-jwt' | 'session-not-found';
const mockServer = {
  users: new Set<string>(),
  minted: 0,
  functionsMode: 'ok' as FunctionsMode,
  userMode: 'ok' as UserMode,
  /** GoTrue answers in the 2024-01-01 shape when true, the legacy shape when false. */
  apiVersion2024: true,
  logoutHangs: false,
  calls: [] as Array<{ url: string; method: string; body: any; bearer: string | null }>,
};

function mockB64url(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}
function mockJwtFor(uid: string, expSec: number): string {
  return `${mockB64url({ alg: 'HS256', typ: 'JWT' })}.${mockB64url({
    sub: uid,
    exp: expSec,
    role: 'authenticated',
    session_id: `sess-${uid}`,
  })}.sig`;
}
function mockSubOf(bearer: string | null): string | null {
  if (!bearer) return null;
  try {
    const payload = bearer.replace(/^Bearer\s+/i, '').split('.')[1]!;
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).sub ?? null;
  } catch {
    return null;
  }
}
function mockSessionFor(uid: string, expiresInSec = 3600) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  return {
    access_token: mockJwtFor(uid, exp),
    refresh_token: `rt-${uid}`,
    token_type: 'bearer',
    expires_in: expiresInSec,
    expires_at: exp,
    user: {
      id: uid,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-06-12T00:00:00Z',
    },
  };
}
const mockJson = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
function mockHeaderOf(init: any, name: string): string | null {
  const h = init?.headers;
  if (!h) return null;
  if (typeof h.get === 'function') return h.get(name);
  const k = Object.keys(h).find((key) => key.toLowerCase() === name.toLowerCase());
  return k ? h[k] : null;
}

jest.mock('@/core/services/security/pinned-fetch', () => ({
  validatePinningConfiguration: () => ({ valid: true, errors: [] }),
  createSupabasePinnedFetch: () => async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    let body: any = null;
    try {
      body = init?.body ? JSON.parse(init.body) : null;
    } catch {
      body = init?.body ?? null;
    }
    const bearer = mockHeaderOf(init, 'Authorization');
    mockServer.calls.push({ url, method, body, bearer });
    const sub = mockSubOf(bearer);

    if (url.includes('/functions/v1/delete-account')) {
      if (mockServer.functionsMode === 'down') throw new TypeError('Network request failed');
      if (mockServer.functionsMode === 'error500-keep-user') {
        return mockJson(500, { success: false, error: 'Internal server error' });
      }
      const existed = !!sub && mockServer.users.delete(sub);
      if (mockServer.functionsMode === 'lose-response') {
        throw new TypeError('Network request failed'); // erased, but the reply never arrives
      }
      return existed
        ? mockJson(200, { success: true })
        : mockJson(500, { success: false, error: 'Deletion failed' }); // admin.deleteUser on a missing uid
    }

    if (url.includes('/auth/v1/user')) {
      if (mockServer.userMode === 'offline') throw new TypeError('Network request failed');
      if (mockServer.userMode === 'bad-jwt') {
        return mockJson(403, { code: 'bad_jwt', message: 'invalid JWT' }, {
          'X-Supabase-Api-Version': '2024-01-01',
        });
      }
      if (mockServer.userMode === 'session-not-found') {
        return mockJson(403, { code: 'session_not_found', message: 'Session not found' }, {
          'X-Supabase-Api-Version': '2024-01-01',
        });
      }
      if (sub && mockServer.users.has(sub)) return mockJson(200, mockSessionFor(sub).user);
      // GoTrue maybeLoadUserOrSession looks the sub up BEFORE the session: 403 user_not_found.
      return mockServer.apiVersion2024
        ? mockJson(
            403,
            { code: 'user_not_found', message: 'User from sub claim in JWT does not exist' },
            { 'X-Supabase-Api-Version': '2024-01-01' },
          )
        : mockJson(403, {
            code: 403,
            error_code: 'user_not_found',
            msg: 'User from sub claim in JWT does not exist',
          });
    }

    if (url.includes('/auth/v1/signup')) {
      mockServer.minted += 1;
      const uid = `minted-${mockServer.minted}`;
      mockServer.users.add(uid);
      return mockJson(200, mockSessionFor(uid));
    }

    if (url.includes('/auth/v1/logout')) {
      if (mockServer.logoutHangs) return new Promise<Response>(() => {});
      return new Response(null, { status: 204 });
    }

    // PostgREST insert.
    return mockJson(201, []);
  },
}));

// The REAL client, wrapped so a test can count or decorate constructions.
const mockCreateClient = jest.fn();
jest.mock('@supabase/supabase-js', () => {
  const actual = jest.requireActual('@supabase/supabase-js') as any;
  return { ...actual, createClient: (...args: any[]) => mockCreateClient(...args) };
});

// AccountDeletionService collaborators — only the integration case below uses them.
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: { clearAllWellnessData: jest.fn() },
}));
jest.mock('@/core/analytics/analyticsIdentityReset', () => ({ resetAnalyticsIdentity: jest.fn() }));
jest.mock('@/core/services/privacy/exportArtifactSweeper', () => ({
  sweepExportArtifacts: jest.fn(() => 0),
}));
jest.mock('@/core/services/privacy/erasureResetRegistry', () => ({
  resetInMemoryStateForErasure: jest.fn(async () => []),
  registerErasureReset: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseService from '@/core/services/supabase/SupabaseService';
import { createSecureStoreSessionAdapter } from '@/core/services/supabase/secureStoreSessionAdapter';
import SecureStorageService from '@/core/services/security/SecureStorageService';
import { deleteAccountAndWipe } from '@/core/services/privacy/AccountDeletionService';

const actualSupabase = jest.requireActual('@supabase/supabase-js') as any;

/** supabase-js's default storage key for env.mock.js's `https://test.supabase.co`. */
const KEY = 'sb-test-auth-token';
const VICTIM = 'victim-uid';

const payload = {
  trigger_type: 'phq9_suicidal_ideation',
  severity_bucket: 'critical',
  intervention_surfaced: true,
  assessment_type: 'PHQ-9',
};

let keychain: Map<string, string>;
function installKeychain(): void {
  keychain = new Map();
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (k: any, v: any) => {
    keychain.set(k, v);
  });
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (k: any) =>
    keychain.has(k) ? keychain.get(k)! : null,
  );
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (k: any) => {
    keychain.delete(k);
  });
}
const authKeys = () => [...keychain.keys()].filter((k) => k.startsWith(KEY));

/** A device that holds a server account: the session auth-js persisted at sign-up. */
async function seedPersistedSession(uid = VICTIM, expiresInSec = 3600): Promise<void> {
  mockServer.users.add(uid);
  await createSecureStoreSessionAdapter().setItem(KEY, JSON.stringify(mockSessionFor(uid, expiresInSec)));
}

const settle = async () => {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
};
const callsTo = (fragment: string) => mockServer.calls.filter((c) => c.url.includes(fragment));

/** A fresh service that has NEVER been initialised — the deletion route's real shape. */
const freshService = (): any => new (supabaseService as any).constructor();

beforeEach(() => {
  jest.clearAllMocks();
  installKeychain();
  mockServer.users = new Set();
  mockServer.minted = 0;
  mockServer.functionsMode = 'ok';
  mockServer.userMode = 'ok';
  mockServer.apiVersion2024 = true;
  mockServer.logoutHangs = false;
  mockServer.calls = [];
  // mockReset, not just clearAllMocks: a mockImplementationOnce a test queued but never
  // consumed (the old fast path built no client) must not leak into the next test.
  mockCreateClient.mockReset();
  mockCreateClient.mockImplementation((...args: any[]) => actualSupabase.createClient(...args));
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

describe('DEBUG-704 — persisted session, no client built this run', () => {
  it('reaches the server: functions.invoke("delete-account") is called with the persisted identity', async () => {
    await seedPersistedSession();
    const service = freshService();
    expect(service.client).toBeNull();

    const ok = await service.deleteAccount();

    const invokes = callsTo('/functions/v1/delete-account');
    expect(invokes).toHaveLength(1);
    expect(mockSubOf(invokes[0]!.bearer)).toBe(VICTIM);
    expect(ok).toBe(true);
    expect(mockServer.users.has(VICTIM)).toBe(false);
  });

  it('never mints: no sign-up request on the deletion path', async () => {
    await seedPersistedSession();
    const service = freshService();

    await service.deleteAccount();

    expect(callsTo('/auth/v1/signup')).toHaveLength(0);
  });

  it('after confirmed erasure the session is gone from the Keychain and cannot be restored', async () => {
    await seedPersistedSession();
    const service = freshService();

    expect(await service.deleteAccount()).toBe(true);

    expect(authKeys()).toEqual([]);
    expect(service.userId).toBeNull();
    const { data } = await service.client.auth.getSession();
    expect(data.session).toBeNull();
  });
});

describe('DEBUG-704 — no persisted session (both branches of "never mint")', () => {
  it('no client and no session: reports erased with NO client construction and NO network', async () => {
    const service = freshService();

    const ok = await service.deleteAccount();

    expect(ok).toBe(true);
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(service.client).toBeNull();
    expect(mockServer.calls).toHaveLength(0);
  });

  it('client already built but no session and no userId: erased, no invoke, no mint', async () => {
    const service = freshService();
    service.client = actualSupabase.createClient('https://test.supabase.co', 'k', {
      auth: { persistSession: true, autoRefreshToken: false, storage: createSecureStoreSessionAdapter() },
    });

    const ok = await service.deleteAccount();

    expect(ok).toBe(true);
    expect(callsTo('/functions/v1/delete-account')).toHaveLength(0);
    expect(callsTo('/auth/v1/signup')).toHaveLength(0);
  });
});

describe('DEBUG-704 — persisted but unverifiable session reports UNCONFIRMED, never erased', () => {
  it('offline (invoke and reconciliation both fail): false, session kept, no mint', async () => {
    await seedPersistedSession();
    mockServer.functionsMode = 'down';
    mockServer.userMode = 'offline';
    const service = freshService();

    const ok = await service.deleteAccount();

    expect(ok).toBe(false);
    expect(callsTo('/functions/v1/delete-account')).toHaveLength(1);
    expect(authKeys().length).toBeGreaterThan(0);
    expect(mockServer.users.has(VICTIM)).toBe(true);
    expect(callsTo('/auth/v1/signup')).toHaveLength(0);
  });

  it('getSession errors (expired token, refresh unreachable): false, no invoke', async () => {
    await seedPersistedSession();
    mockCreateClient.mockImplementationOnce((...args: any[]) => {
      const c = actualSupabase.createClient(...args);
      c.auth.getSession = jest.fn(async () => ({
        data: { session: null },
        error: new Error('refresh unreachable'),
      }));
      return c;
    });
    const service = freshService();

    expect(await service.deleteAccount()).toBe(false);
    expect(callsTo('/functions/v1/delete-account')).toHaveLength(0);
    expect(callsTo('/auth/v1/signup')).toHaveLength(0);
    expect(authKeys().length).toBeGreaterThan(0);
  });

  it('the live session belongs to a different uid than the persisted one: false, no invoke', async () => {
    await seedPersistedSession();
    mockCreateClient.mockImplementationOnce((...args: any[]) => {
      const c = actualSupabase.createClient(...args);
      c.auth.getSession = jest.fn(async () => ({ data: { session: mockSessionFor('someone-else') }, error: null }));
      return c;
    });
    const service = freshService();

    expect(await service.deleteAccount()).toBe(false);
    expect(callsTo('/functions/v1/delete-account')).toHaveLength(0);
  });

  it('a corrupt persisted session (manifest present, chunk missing): false, no client built', async () => {
    await seedPersistedSession();
    keychain.delete(`${KEY}.0`);
    const service = freshService();

    expect(await service.deleteAccount()).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockServer.calls).toHaveLength(0);
  });

  it('the Keychain read itself throws: false, no client built', async () => {
    await seedPersistedSession();
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('keychain unavailable'));
    const service = freshService();

    expect(await service.deleteAccount()).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('through AccountDeletionService: unverifiable means NO local wipe', async () => {
    await seedPersistedSession();
    mockServer.functionsMode = 'down';
    mockServer.userMode = 'offline';
    // deleteAccountAndWipe uses the module singleton, which has never been initialised.

    const result = await deleteAccountAndWipe({ posthog: null });

    expect(result).toEqual({ ok: false, retryable: true });
    expect(SecureStorageService.clearAllWellnessData).not.toHaveBeenCalled();
    expect(authKeys().length).toBeGreaterThan(0);
  });
});

describe('DEBUG-704 — reconciliation after a failed invoke', () => {
  it('500 + GoTrue user_not_found (2024-01-01 shape) for the caller\'s own sub: confirmed erased', async () => {
    await seedPersistedSession();
    mockServer.users.delete(VICTIM); // already erased by an earlier, timed-out request
    const service = freshService();

    expect(await service.deleteAccount()).toBe(true);
    expect(callsTo('/functions/v1/delete-account')).toHaveLength(1);
    expect(mockSubOf(callsTo('/auth/v1/user')[0]!.bearer)).toBe(VICTIM);
    expect(authKeys()).toEqual([]);
  });

  it('500 + GoTrue user_not_found (legacy error_code shape): confirmed erased', async () => {
    await seedPersistedSession();
    mockServer.users.delete(VICTIM);
    mockServer.apiVersion2024 = false;
    const service = freshService();

    expect(await service.deleteAccount()).toBe(true);
    expect(authKeys()).toEqual([]);
  });

  it('500 while the user still exists: unconfirmed, session kept', async () => {
    await seedPersistedSession();
    mockServer.functionsMode = 'error500-keep-user';
    const service = freshService();

    expect(await service.deleteAccount()).toBe(false);
    expect(authKeys().length).toBeGreaterThan(0);
    expect(service.userId).toBe(VICTIM);
  });

  it.each([
    ['bad_jwt', 'bad-jwt' as UserMode],
    ['session_not_found', 'session-not-found' as UserMode],
    ['a network failure', 'offline' as UserMode],
  ])('500 + %s from GoTrue: unconfirmed (only user_not_found counts)', async (_label, mode) => {
    await seedPersistedSession();
    mockServer.users.delete(VICTIM);
    mockServer.userMode = mode;
    const service = freshService();

    expect(await service.deleteAccount()).toBe(false);
  });
});

describe('DEBUG-704 — convergent retry after an erasure whose reply was lost', () => {
  it('same session: the retry completes', async () => {
    await seedPersistedSession();
    mockServer.functionsMode = 'lose-response';
    mockServer.userMode = 'offline';
    const service = freshService();

    expect(await service.deleteAccount()).toBe(false);
    expect(mockServer.users.has(VICTIM)).toBe(false); // erased server-side all the same

    mockServer.functionsMode = 'ok';
    mockServer.userMode = 'ok';
    expect(await service.deleteAccount()).toBe(true);
    expect(authKeys()).toEqual([]);
  });

  it('after a relaunch: a fresh instance completes the retry', async () => {
    await seedPersistedSession();
    mockServer.functionsMode = 'lose-response';
    mockServer.userMode = 'offline';
    expect(await freshService().deleteAccount()).toBe(false);

    mockServer.functionsMode = 'ok';
    mockServer.userMode = 'ok';
    const relaunched = freshService();
    expect(await relaunched.deleteAccount()).toBe(true);
    expect(callsTo('/functions/v1/delete-account')).toHaveLength(2);
    expect(authKeys()).toEqual([]);
  });
});

describe('DEBUG-704 — teardown never waits on signOut', () => {
  it('signOut that never settles: deletion still resolves true and the keys are gone', async () => {
    await seedPersistedSession();
    const signOut = jest.fn(() => new Promise(() => {}));
    mockCreateClient.mockImplementationOnce((...args: any[]) => {
      const c = actualSupabase.createClient(...args);
      c.auth.signOut = signOut;
      return c;
    });
    const service = freshService();

    expect(await service.deleteAccount()).toBe(true);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(authKeys()).toEqual([]);
  });

  it('signOut that rejects: deletion still resolves true and the keys are gone', async () => {
    await seedPersistedSession();
    const signOut = jest.fn(() => Promise.reject(new Error('network down')));
    mockCreateClient.mockImplementationOnce((...args: any[]) => {
      const c = actualSupabase.createClient(...args);
      c.auth.signOut = signOut;
      return c;
    });
    const service = freshService();

    expect(await service.deleteAccount()).toBe(true);
    await settle();
    expect(authKeys()).toEqual([]);
  });

  it('the real signOut with a hanging /logout: true, keys gone, and no token is ever sent to /logout', async () => {
    await seedPersistedSession();
    mockServer.logoutHangs = true;
    const service = freshService();

    expect(await service.deleteAccount()).toBe(true);
    expect(authKeys()).toEqual([]);
    // The Keychain removal runs BEFORE signOut, so auth-js finds no session to revoke and
    // makes no network call — which is also why it cannot hold the auth lock open.
    await settle();
    expect(callsTo('/auth/v1/logout')).toHaveLength(0);
  });
});

describe('DEBUG-704 — the deleted identity never comes back', () => {
  it('the next crisis flush mints a FRESH uid and inserts under it, never the deleted one', async () => {
    await seedPersistedSession();
    const service = freshService();
    expect(await service.deleteAccount()).toBe(true);
    await settle();

    service.trackCrisisDetection(payload);
    await settle();

    expect(callsTo('/auth/v1/signup')).toHaveLength(1);
    expect(service.userId).toBe('minted-1');
    const inserted = callsTo('/rest/v1/analytics_events').flatMap((c) => c.body);
    expect(inserted.length).toBeGreaterThan(0);
    expect(inserted.every((r: any) => r.user_id === 'minted-1')).toBe(true);
  });

  it('crisis events queued before confirmation are dropped; the queue is not re-dirtied', async () => {
    await seedPersistedSession();
    const service = freshService();
    service.crisisAnalyticsQueue = [
      { event_type: 'crisis_detected', properties: payload, session_id: 's-old', enqueued_at: Date.now() },
    ];
    service.crisisPersistDirty = true;

    expect(await service.deleteAccount()).toBe(true);

    expect(service.crisisAnalyticsQueue).toEqual([]);
    expect(service.crisisPersistDirty).toBe(false);
  });

  it('a flush in flight across the erasure keeps every event enqueued after it', async () => {
    // A pre-erasure flush snapshots its prefix, the erasure drops the queue, a fresh
    // detection enqueues, then the old insert succeeds. Its slice(pending.length) must
    // not cut the post-erasure event: that event is for the new identity.
    const service = freshService();
    let releaseInsert: (v: unknown) => void = () => undefined;
    service.client = {
      from: () => ({ insert: () => new Promise((resolve) => { releaseInsert = resolve; }) }),
      auth: { signOut: () => Promise.resolve({ error: null }) },
    };
    service.userId = VICTIM;
    service.crisisAnalyticsQueue = [
      { event_type: 'crisis_detected', properties: payload, session_id: 's-old', enqueued_at: Date.now() },
    ];

    const flushing = service.flushCrisisAnalytics();
    await settle();
    await service.teardownErasedSession(service.client);
    service.crisisAnalyticsQueue.push(
      { event_type: 'crisis_detected', properties: payload, session_id: 's-new', enqueued_at: Date.now() },
    );
    releaseInsert({ error: null });
    await flushing;

    expect(service.crisisAnalyticsQueue.map((e: any) => e.session_id)).toEqual(['s-new']);
  });
});
