/**
 * DEBUG-686 — withdrawing analytics consent must purge what PostHog already queued.
 *
 * THE DEFECT (verified against @posthog/core 1.29.9 / posthog-react-native 4.45.14)
 * --------------------------------------------------------------------------------
 * `optOut()` only flips the persisted `OptedOut` flag, and that flag gates
 * `enqueue()` — the CAPTURE path. `flush()` checks `disabled` only, and `_flush()`
 * sends whatever is in `Queue` after `await _initPromise`. posthog-react-native
 * calls `flush()` on every AppState change, the queue persists to
 * `.posthog-rn.json`, and the storage preload MERGES that file into the in-memory
 * cache asynchronously. So an event captured while consented transmitted AFTER the
 * user withdrew — on the next background/foreground, the 30 s timer, an explicit
 * flush, or the next launch.
 *
 * WHY THIS DRIVES THE REAL SDK AND THE REAL CONSENT STORE
 * -------------------------------------------------------
 * Same reasoning as `PostHogProvider.networkSilence.privacy.test.ts`: the claim is
 * about the shipped library under the shipped `POSTHOG_OPTIONS`, so the vendor
 * `PostHog` class is constructed for real and `fetch` is spied. Withdrawal goes
 * through the REAL `consentStore` actions (`updateConsent`, `setUniversalOptOut`,
 * `loadConsent`) over in-memory SecureStore/AsyncStorage, so the purge is
 * observed reacting to the store write production performs, not to a hand-set
 * state literal.
 *
 * HOW IT CANNOT GO VACUOUS (DEBUG-390)
 * ------------------------------------
 * "Marker absent from every /batch/ body" is also what a harness that never
 * transmits reports. Every withdrawal arm therefore has an `optOut()`-only
 * CONTROL on the identical harness that must show the marker in a batch, and the
 * re-grant case must show the post-re-grant marker ARRIVE.
 *
 * WHAT THE PER-STATUS COLD-LAUNCH ROWS DO AND DO NOT CLAIM
 * --------------------------------------------------------
 * The table pins the PURGE outcome per `ConsentStatus` against a queue persisted
 * by a previously-consented session: "the persisted queue is not delivered at
 * cold launch". It does NOT claim "nothing transmits" for `expired` and
 * `under_age`: `useAnalyticsConsent` reads only `analyticsEnabled` and
 * `universalOptOut`, not `consentStatus`, so for those two statuses ConsentSync's
 * effect can still `optIn()` the client after the purge (known gap, fixed by
 * DEBUG-690). ConsentSync is deliberately NOT mounted here; this file pins the
 * purge, the wiring file pins that ConsentSync installs it.
 *
 * Accepted residual (compliance ruling 8(a)): a `/batch/` request already IN
 * FLIGHT when the user withdraws is not recalled. Nothing here asserts otherwise.
 */

// ---------------------------------------------------------------------------
// Stateful expo-file-system double — the SDK's `file` persistence backend. The
// global mock in jest.setup.js has no `text()` and no backing store, so a queue
// could never survive a relaunch there. `text()` is deferrable so the preload
// race can be held open; the read happens at RELEASE time (worst case for a
// write issued while the read is pending — the real API's read is async while
// `write()` is synchronous).
// ---------------------------------------------------------------------------
const mockFiles = new Map<string, string>();
const mockReadGate: { held: boolean; waiters: Array<() => void> } = { held: false, waiters: [] };

jest.mock('expo-file-system', () => ({
  __esModule: true,
  Paths: { document: '/doc', cache: '/cache' },
  File: class {
    name: string;
    constructor(_dir: unknown, name: string) {
      this.name = name;
    }
    get exists(): boolean {
      return mockFiles.has(this.name);
    }
    text(): Promise<string> {
      const read = (): string => {
        const v = mockFiles.get(this.name);
        if (v === undefined) throw new Error('ENOENT');
        return v;
      };
      if (!mockReadGate.held) return Promise.resolve().then(read);
      return new Promise<string>((resolve, reject) => {
        mockReadGate.waiters.push(() => {
          try {
            resolve(read());
          } catch (e) {
            reject(e);
          }
        });
      });
    }
    write(value: string): void {
      mockFiles.set(this.name, value);
    }
    delete(): void {
      if (!mockFiles.has(this.name)) throw new Error('ENOENT');
      mockFiles.delete(this.name);
    }
  },
  Directory: jest.fn(),
}));

// In-memory SecureStore + AsyncStorage — harness from reConsent.privacy.test.ts.
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

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { AppState } from 'react-native';
import { PostHog, PostHogPersistedProperty } from 'posthog-react-native';
import { POSTHOG_OPTIONS } from '../PostHogProvider';
import { installConsentWithdrawalPurge } from '../consentWithdrawalPurge';
import { analyticsConsentOutcome, type AnalyticsConsentOutcome } from '../analyticsConsentOutcome';
import { purgeAnalyticsQueues } from '../analyticsQueuePurge';
import {
  useConsentStore,
  CONSENT_VERSION,
  type ConsentRecord,
  type ConsentStatus,
} from '@/core/stores/consentStore';

const TEST_KEY = 'phc_debug686_withdrawal_purge';
const PRE = 'debug686_pre_withdrawal_marker';
const POST = 'debug686_post_regrant_marker';
const LOG_MARKER = 'debug686_pre_withdrawal_log_marker';
const SEEDED_DISTINCT_ID = 'debug686-seeded-distinct-id';
const EVENTS_FILE = '.posthog-rn.json';
const LOGS_FILE = '.posthog-rn-logs.json';
const CONSENT_SECURE_KEY = 'consent_record_v1';
const CONSENT_HISTORY_MIGRATION_FLAG = 'being.consent_history_migration_v2';
const CRISIS_QUEUE_KEY = '@being/supabase/crisis_analytics_queue';

const realFetch = (global as unknown as { fetch: unknown }).fetch;
let fetchSpy: jest.Mock;

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/** Turns the event loop without depending on (possibly faked) setTimeout. */
async function settle(turns = 40): Promise<void> {
  for (let i = 0; i < turns; i += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

function releaseReads(): void {
  mockReadGate.held = false;
  const waiters = mockReadGate.waiters.splice(0);
  for (const w of waiters) w();
}

async function decodeBody(body: unknown): Promise<string> {
  if (typeof body === 'string') return body;
  let bytes: Uint8Array;
  if (body && typeof (body as { arrayBuffer?: unknown }).arrayBuffer === 'function') {
    bytes = new Uint8Array(await (body as Blob).arrayBuffer());
  } else if (body instanceof ArrayBuffer) {
    bytes = new Uint8Array(body);
  } else if (ArrayBuffer.isView(body)) {
    bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  } else {
    return String(body ?? '');
  }
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return zlib.gunzipSync(bytes).toString('utf8');
  return Buffer.from(bytes).toString('utf8');
}

/** Every `/batch/` request body, decoded, in send order. */
async function batchBodies(): Promise<string[]> {
  const out: string[] = [];
  for (const call of fetchSpy.mock.calls) {
    if (!String(call[0]).includes('/batch/')) continue;
    out.push(await decodeBody((call[1] as { body?: unknown } | undefined)?.body));
  }
  return out;
}

async function batchesContaining(marker: string): Promise<number> {
  return (await batchBodies()).filter((b) => b.includes(marker)).length;
}

type Client = InstanceType<typeof PostHog>;

interface Launched {
  client: Client;
  appState: (state: 'active' | 'background' | 'inactive') => void;
}

/** Construct the vendor client exactly as <PHProvider> does: real options, file persistence. */
function launch(): Launched {
  const addListener = AppState.addEventListener as unknown as jest.Mock;
  const before = addListener.mock.calls.length;
  const client = new PostHog(TEST_KEY, POSTHOG_OPTIONS);
  const handlerCall = addListener.mock.calls.slice(before).find((c) => c[0] === 'change');
  if (!handlerCall) throw new Error('harness: PostHog registered no AppState listener');
  const handler = handlerCall[1] as (s: string) => void;
  return { client, appState: (s) => handler(s) };
}

function queueOf(client: Client): unknown[] {
  return (client.getPersistedProperty(PostHogPersistedProperty.Queue) as unknown[] | undefined) ?? [];
}

function logsQueueOf(client: Client): unknown[] {
  return (client.getPersistedProperty(PostHogPersistedProperty.LogsQueue) as unknown[] | undefined) ?? [];
}

function validRecord(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  const now = Date.now();
  return {
    consentId: 'consent_debug686',
    userId: 'test-user-id',
    version: CONSENT_VERSION,
    preferences: {
      analyticsEnabled: true,
      crashReportsEnabled: false,
      cloudSyncEnabled: false,
      researchEnabled: false,
      mentalHealthProcessingConsent: true,
    },
    universalOptOut: false,
    ageVerification: {
      verified: true,
      birthYear: new Date().getFullYear() - 30,
      ageAtVerification: 30,
      verifiedAt: now - 1000,
      isEligible: true,
    },
    timestamp: now - 10_000,
    updatedAt: now - 10_000,
    expiresAt: now + 10_000_000,
    revoked: false,
    ...overrides,
  };
}

function seedConsent(record: ConsentRecord | null): void {
  if (record) mockSecureStore[CONSENT_SECURE_KEY] = JSON.stringify(record);
  else delete mockSecureStore[CONSENT_SECURE_KEY];
}

async function hydrateStore(): Promise<void> {
  await useConsentStore.getState().loadConsent();
}

/** A queue a previously-consented session left on disk. */
function seedPersistedQueue(): void {
  const message = {
    event: PRE,
    distinct_id: SEEDED_DISTINCT_ID,
    properties: { $lib: 'posthog-react-native' },
    type: 'capture',
    timestamp: new Date().toISOString(),
    uuid: '00000000-0000-4000-8000-000000000686',
  };
  mockFiles.set(
    EVENTS_FILE,
    JSON.stringify({
      version: 'v1',
      content: {
        [PostHogPersistedProperty.Queue]: [{ message }],
        [PostHogPersistedProperty.OptedOut]: false,
        [PostHogPersistedProperty.DistinctId]: SEEDED_DISTINCT_ID,
        [PostHogPersistedProperty.AnonymousId]: SEEDED_DISTINCT_ID,
      },
    }),
  );
  mockFiles.set(
    LOGS_FILE,
    JSON.stringify({
      version: 'v1',
      content: { [PostHogPersistedProperty.LogsQueue]: [{ record: { body: LOG_MARKER } }] },
    }),
  );
}

type Withdrawal = 'toggle' | 'universalOptOut';

/** The two user-facing withdrawal controls, through the real store actions. */
async function withdraw(kind: Withdrawal): Promise<void> {
  if (kind === 'toggle') {
    await useConsentStore.getState().updateConsent({ analyticsEnabled: false });
  } else {
    await useConsentStore.getState().setUniversalOptOut(true);
  }
  expect(analyticsConsentOutcomeOfStore()).toBe('purge');
}

function analyticsConsentOutcomeOfStore(): AnalyticsConsentOutcome {
  const { consentStatus, currentConsent } = useConsentStore.getState();
  // Read the store directly rather than through the module under test, so a
  // broken analyticsConsentOutcome cannot make this precondition agree with it.
  if (consentStatus !== 'valid') return consentStatus === 'loading' ? 'hold' : 'purge';
  return currentConsent?.preferences?.analyticsEnabled && !currentConsent?.universalOptOut
    ? 'emit'
    : 'purge';
}

/**
 * A consented session: real store hydrated to `valid` + analytics on, client
 * opted in (as ConsentSync does), marker captured and a pending log record queued.
 */
async function consentedSessionWithMarker(opts: { install: boolean }): Promise<{
  launched: Launched;
  uninstall: () => void;
}> {
  seedConsent(validRecord());
  await hydrateStore();
  expect(useConsentStore.getState().consentStatus).toBe('valid');

  const launched = launch();
  const uninstall = opts.install ? installConsentWithdrawalPurge(launched.client) : () => undefined;
  await launched.client.optIn();
  await launched.client.ready();
  launched.client.capture(PRE, {});
  launched.client.setPersistedProperty(PostHogPersistedProperty.LogsQueue, [
    { record: { body: LOG_MARKER } },
  ]);
  await settle(5);
  // Precondition: the marker really is queued (in memory AND on disk) before withdrawal.
  expect(JSON.stringify(queueOf(launched.client))).toContain(PRE);
  expect(mockFiles.get(EVENTS_FILE) ?? '').toContain(PRE);
  return { launched, uninstall };
}

type Trigger = 'interval' | 'appState' | 'flush' | 'relaunch';

/** Fire one flush trigger, then return the client whose network effect to read. */
async function fireTrigger(trigger: Trigger, launched: Launched): Promise<Client> {
  switch (trigger) {
    case 'interval':
      jest.advanceTimersByTime(POSTHOG_OPTIONS.flushInterval + 1);
      await settle();
      return launched.client;
    case 'appState':
      launched.appState('background');
      await settle();
      launched.appState('active');
      await settle();
      return launched.client;
    case 'flush':
      await launched.client.flush().catch(() => undefined);
      await settle();
      return launched.client;
    case 'relaunch': {
      // A new process: a new instance reading the same on-disk storage. No purge
      // is installed on it, so this observes what the FIRST instance left on disk.
      const next = launch();
      await next.client.ready();
      next.appState('background');
      await settle();
      await next.client.flush().catch(() => undefined);
      await settle();
      return next.client;
    }
    default: {
      const unhandled: never = trigger;
      throw new Error(`unhandled trigger ${String(unhandled)}`);
    }
  }
}

function resetWorld(): void {
  mockFiles.clear();
  mockReadGate.held = false;
  mockReadGate.waiters.splice(0);
  for (const k of Object.keys(mockSecureStore)) delete mockSecureStore[k];
  for (const k of Object.keys(mockAsyncStorage)) delete mockAsyncStorage[k];
  for (const k of Object.keys(mockWellnessBlobs)) delete mockWellnessBlobs[k];
  mockAsyncStorage[CONSENT_HISTORY_MIGRATION_FLAG] = '1';
  useConsentStore.setState({
    currentConsent: null,
    staleConsent: null,
    consentHistory: [],
    consentStatus: 'loading',
    isLoading: false,
    error: null,
  });
  fetchSpy = jest.fn().mockResolvedValue({
    status: 200,
    text: async () => '{}',
    json: async () => ({}),
  });
  (global as unknown as { fetch: unknown }).fetch = fetchSpy;
}

const uninstallers: Array<() => void> = [];

beforeEach(() => {
  resetWorld();
  // Fake only the timer queue: the SDK's 30 s flush interval. Microtasks and
  // setImmediate stay real so promise chains and `settle()` keep running.
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
});

afterEach(() => {
  for (const u of uninstallers.splice(0)) u();
  jest.useRealTimers();
  (global as unknown as { fetch: unknown }).fetch = realFetch;
});

const TRIGGERS: Trigger[] = ['interval', 'appState', 'flush', 'relaunch'];
const WITHDRAWALS: Withdrawal[] = ['toggle', 'universalOptOut'];

// ---------------------------------------------------------------------------
// AC1 — both controls × every flush trigger
// ---------------------------------------------------------------------------

describe('DEBUG-686 AC1 — a pre-withdrawal event reaches 0 /batch/ bodies after withdrawal', () => {
  describe.each(WITHDRAWALS)('withdrawal via %s', (kind) => {
    it.each(TRIGGERS)('trigger: %s', async (trigger) => {
      const { launched, uninstall } = await consentedSessionWithMarker({ install: true });
      uninstallers.push(uninstall);

      await withdraw(kind);
      const observed = await fireTrigger(trigger, launched);

      expect(await batchesContaining(PRE)).toBe(0);
      expect(queueOf(launched.client)).toEqual([]);
      expect(logsQueueOf(launched.client)).toEqual([]);
      expect(queueOf(observed)).toEqual([]);
      expect(logsQueueOf(observed)).toEqual([]);
      expect(mockFiles.get(EVENTS_FILE) ?? '').not.toContain(PRE);
      expect(mockFiles.get(LOGS_FILE) ?? '').not.toContain(LOG_MARKER);
    });
  });

  /**
   * The control that makes every zero above mean something: identical harness,
   * identical withdrawal, but only `optOut()` — what ConsentSync did before this
   * fix. The marker MUST transmit, or the harness cannot see a leak at all.
   */
  describe.each(WITHDRAWALS)('CONTROL — optOut() alone, withdrawal via %s', (kind) => {
    it.each(TRIGGERS)('trigger: %s — the marker transmits', async (trigger) => {
      const { launched } = await consentedSessionWithMarker({ install: false });

      await withdraw(kind);
      await launched.client.optOut();
      await fireTrigger(trigger, launched);

      expect(await batchesContaining(PRE)).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// AC2 — a withdrawal before the client finishes initialising
// ---------------------------------------------------------------------------

describe('DEBUG-686 AC2 — withdrawal while the storage preload is still pending', () => {
  async function preloadRace(opts: { install: boolean }): Promise<Launched> {
    seedConsent(validRecord());
    await hydrateStore();
    seedPersistedQueue();

    mockReadGate.held = true; // the file read is in flight and has not returned
    const launched = launch();
    if (opts.install) uninstallers.push(installConsentWithdrawalPurge(launched.client));
    await launched.client.optIn();

    await withdraw('toggle');
    if (!opts.install) await launched.client.optOut();

    // A trigger that starts AFTER the consent write but BEFORE init completes:
    // flush() awaits _initPromise and then reads Queue.
    launched.appState('background');
    await settle(5);
    expect(mockReadGate.waiters.length).toBeGreaterThan(0); // the race was really held open

    releaseReads();
    await settle();
    launched.appState('active');
    await settle();
    await launched.client.flush().catch(() => undefined);
    await settle();
    return launched;
  }

  it('the preload merge does not restore the purged queue', async () => {
    const { client } = await preloadRace({ install: true });

    expect(await batchesContaining(PRE)).toBe(0);
    expect(queueOf(client)).toEqual([]);
    expect(logsQueueOf(client)).toEqual([]);
    expect(mockFiles.get(EVENTS_FILE) ?? '').not.toContain(PRE);
    expect(mockFiles.get(LOGS_FILE) ?? '').not.toContain(LOG_MARKER);
  });

  it('ruling 8(b) — withdrawal does not reset or clobber the persisted identity', async () => {
    // reset() is NOT called on withdrawal, and a purge must not truncate the
    // file the preload is about to read: that would drop distinct_id and mint a
    // new one as a side effect.
    const { client } = await preloadRace({ install: true });
    expect(client.getDistinctId()).toBe(SEEDED_DISTINCT_ID);
    expect(mockFiles.get(EVENTS_FILE) ?? '').toContain(SEEDED_DISTINCT_ID);
  });

  it('CONTROL — optOut() alone: the restored queue transmits', async () => {
    await preloadRace({ install: false });
    expect(await batchesContaining(PRE)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC3 — withdrawal edge only; re-grant starts empty
// ---------------------------------------------------------------------------

describe('DEBUG-686 AC3 — re-grant starts with nothing queued', () => {
  it.each(WITHDRAWALS)(
    'after withdrawal via %s and re-grant, the first batch carries the post-re-grant marker and not the pre-withdrawal one',
    async (kind) => {
      const { launched, uninstall } = await consentedSessionWithMarker({ install: true });
      uninstallers.push(uninstall);
      const { client } = launched;

      await withdraw(kind);
      if (kind === 'toggle') await useConsentStore.getState().updateConsent({ analyticsEnabled: true });
      else await useConsentStore.getState().setUniversalOptOut(false);
      expect(analyticsConsentOutcomeOfStore()).toBe('emit');
      await client.optIn(); // what ConsentSync's effect does on the grant edge

      client.capture(POST, {});
      await settle(5);
      // A further consent write that stays on the grant side must not purge.
      await useConsentStore.getState().updateConsent({ crashReportsEnabled: true });
      expect(JSON.stringify(queueOf(client))).toContain(POST);

      await client.flush().catch(() => undefined);
      await settle();

      const bodies = await batchBodies();
      expect(bodies.length).toBeGreaterThan(0);
      expect(bodies[0]).toContain(POST);
      expect(bodies[0]).not.toContain(PRE);
      expect(await batchesContaining(PRE)).toBe(0);
      expect(await batchesContaining(POST)).toBe(1);
    },
  );

  it('never purges on the grant edge — the store write that flips to emit leaves the queue alone', async () => {
    seedConsent(validRecord({ preferences: { ...validRecord().preferences, analyticsEnabled: false } }));
    await hydrateStore();
    const { client } = launch();
    uninstallers.push(installConsentWithdrawalPurge(client));
    await client.ready();

    // Subscribed AFTER the purge, so on every withdrawn-side write it runs after
    // the purge has fired and re-seeds the queue. The queue therefore holds an
    // item going INTO the write that flips the outcome to `emit` — the only write
    // that can be the grant edge. If that write purged, the item would be gone.
    const reseed = useConsentStore.subscribe((next) => {
      if (analyticsConsentOutcomeOfStore() === 'purge' && next.consentStatus === 'valid') {
        client.setPersistedProperty(PostHogPersistedProperty.Queue, [{ message: { event: POST } }]);
      }
    });
    uninstallers.push(reseed);

    await useConsentStore.getState().updateConsent({ analyticsEnabled: true });
    await settle(5);

    expect(analyticsConsentOutcomeOfStore()).toBe('emit');
    expect(JSON.stringify(queueOf(client))).toContain(POST);
  });
});

// ---------------------------------------------------------------------------
// AC4 — every ConsentStatus has a pinned cold-launch outcome
// ---------------------------------------------------------------------------

const EXPECTED_OUTCOME: Record<ConsentStatus, AnalyticsConsentOutcome> = {
  loading: 'hold',
  valid: 'emit', // analyticsEnabled && !universalOptOut; the two 'valid' purge rows are below
  revoked: 'purge',
  missing: 'purge',
  integrity_error: 'purge',
  under_age: 'purge',
  version_mismatch: 'purge',
  expired: 'purge',
};

describe('DEBUG-686 AC4 — analyticsConsentOutcome is total over ConsentStatus', () => {
  const consented = validRecord();
  it.each(Object.keys(EXPECTED_OUTCOME) as ConsentStatus[])('%s', (status) => {
    expect(analyticsConsentOutcome({ consentStatus: status, currentConsent: consented })).toBe(
      EXPECTED_OUTCOME[status],
    );
  });

  it('valid purges when analytics is off, when universalOptOut is set, and with no record', () => {
    const off = validRecord({ preferences: { ...consented.preferences, analyticsEnabled: false } });
    const gpc = validRecord({ universalOptOut: true });
    expect(analyticsConsentOutcome({ consentStatus: 'valid', currentConsent: off })).toBe('purge');
    expect(analyticsConsentOutcome({ consentStatus: 'valid', currentConsent: gpc })).toBe('purge');
    expect(analyticsConsentOutcome({ consentStatus: 'valid', currentConsent: null })).toBe('purge');
  });

  it('a non-valid status purges even with a consenting record attached (expired / under_age retain one)', () => {
    for (const status of ['expired', 'under_age', 'revoked'] as ConsentStatus[]) {
      expect(analyticsConsentOutcome({ consentStatus: status, currentConsent: consented })).toBe('purge');
    }
  });

  it('pins one row per ConsentStatus — a new status must be added to this table', () => {
    // The source union, read with comments stripped (DEBUG-390), so this table
    // cannot silently fall behind the type.
    const raw = fs.readFileSync(
      path.join(__dirname, '..', '..', 'stores', 'consentStore.ts'),
      'utf8',
    );
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const union = src.slice(src.indexOf('export type ConsentStatus'), src.indexOf(';', src.indexOf('export type ConsentStatus')));
    const members = [...union.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    expect(members.length).toBeGreaterThanOrEqual(8);
    expect(Object.keys(EXPECTED_OUTCOME).sort()).toEqual(members);
  });
});

interface ColdLaunchRow {
  label: string;
  status: ConsentStatus;
  record: ConsentRecord | null;
  delivered: boolean;
}

const base = validRecord();
const COLD_LAUNCH_ROWS: ColdLaunchRow[] = [
  { label: 'valid + analytics on (emit — CONTROL)', status: 'valid', record: base, delivered: true },
  {
    label: 'valid + analytics off',
    status: 'valid',
    record: validRecord({ preferences: { ...base.preferences, analyticsEnabled: false } }),
    delivered: false,
  },
  { label: 'valid + universalOptOut', status: 'valid', record: validRecord({ universalOptOut: true }), delivered: false },
  { label: 'revoked', status: 'revoked', record: validRecord({ revoked: true, revokedAt: Date.now() }), delivered: false },
  { label: 'missing', status: 'missing', record: null, delivered: false },
  {
    label: 'integrity_error',
    status: 'integrity_error',
    record: validRecord({ consentId: '' }),
    delivered: false,
  },
  {
    label: 'under_age',
    status: 'under_age',
    record: validRecord({ ageVerification: { ...base.ageVerification, isEligible: false } }),
    delivered: false,
  },
  { label: 'version_mismatch', status: 'version_mismatch', record: validRecord({ version: '1.0.0' }), delivered: false },
  { label: 'expired', status: 'expired', record: validRecord({ expiresAt: Date.now() - 1000 }), delivered: false },
];

describe('DEBUG-686 AC4 — cold launch with a queue persisted by a consented session', () => {
  it.each(COLD_LAUNCH_ROWS)('$label', async ({ status, record, delivered }) => {
    seedConsent(record);
    seedPersistedQueue();

    const launched = launch();
    uninstallers.push(installConsentWithdrawalPurge(launched.client));
    await hydrateStore();
    expect(useConsentStore.getState().consentStatus).toBe(status);
    await launched.client.ready();
    await settle(5);

    launched.appState('background');
    await settle();
    launched.appState('active');
    await settle();
    await launched.client.flush().catch(() => undefined);
    await settle();

    if (delivered) {
      expect(await batchesContaining(PRE)).toBeGreaterThan(0);
    } else {
      expect(await batchesContaining(PRE)).toBe(0);
      expect(queueOf(launched.client)).toEqual([]);
      expect(logsQueueOf(launched.client)).toEqual([]);
    }
  });

  it('loading — holds: nothing is purged until the status resolves, then a withdrawn status purges', async () => {
    seedConsent(validRecord({ revoked: true, revokedAt: Date.now() }));
    seedPersistedQueue();

    const launched = launch();
    uninstallers.push(installConsentWithdrawalPurge(launched.client));
    await launched.client.ready();
    await settle(5);
    expect(useConsentStore.getState().consentStatus).toBe('loading');
    // Hold: the queue the preload restored is untouched while consent is unknown.
    expect(JSON.stringify(queueOf(launched.client))).toContain(PRE);

    await hydrateStore();
    expect(useConsentStore.getState().consentStatus).toBe('revoked');
    await launched.client.flush().catch(() => undefined);
    await settle();

    expect(await batchesContaining(PRE)).toBe(0);
    expect(queueOf(launched.client)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// AC6 — the crisis telemetry queue is a different sink and survives
// ---------------------------------------------------------------------------

describe('DEBUG-686 AC6 — a pending crisis_detected survives withdrawal', () => {
  it.each(WITHDRAWALS)('via %s', async (kind) => {
    const crisisQueue = JSON.stringify([{ event: 'crisis_detected', queuedAt: 1 }]);
    const { uninstall } = await consentedSessionWithMarker({ install: true });
    uninstallers.push(uninstall);
    mockAsyncStorage[CRISIS_QUEUE_KEY] = crisisQueue;

    await withdraw(kind);
    await settle();

    expect(mockAsyncStorage[CRISIS_QUEUE_KEY]).toBe(crisisQueue);
  });

  it('the purge modules import nothing from core/services/supabase or features/crisis', () => {
    const files = ['consentWithdrawalPurge.ts', 'analyticsQueuePurge.ts', 'analyticsConsentOutcome.ts'];
    const forbidden = /from\s+['"][^'"]*(core\/services\/supabase|features\/crisis|SupabaseService)[^'"]*['"]|require\(\s*['"][^'"]*(core\/services\/supabase|features\/crisis|SupabaseService)/;
    // Known-bad literal: the matcher can fire.
    expect(forbidden.test("import { x } from '@/core/services/supabase/SupabaseService';")).toBe(true);
    expect(forbidden.test("import { y } from '@/features/crisis/services/foo';")).toBe(true);
    for (const f of files) {
      const raw = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
      const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(src.length).toBeGreaterThan(0);
      expect(/\bimport\b|\bexport\b/.test(src)).toBe(true);
      expect(forbidden.test(src)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Primitive contract: never throws, never flushes, never resets
// ---------------------------------------------------------------------------

describe('DEBUG-686 — purge primitives are non-throwing and never transmit or reset', () => {
  it('purgeAnalyticsQueues nulls both queues and calls neither flush nor reset', () => {
    const client = {
      setPersistedProperty: jest.fn(),
      flush: jest.fn(),
      reset: jest.fn(),
    };
    purgeAnalyticsQueues(client);
    expect(client.setPersistedProperty).toHaveBeenCalledWith(PostHogPersistedProperty.Queue, null);
    expect(client.setPersistedProperty).toHaveBeenCalledWith(PostHogPersistedProperty.LogsQueue, null);
    expect(client.flush).not.toHaveBeenCalled();
    expect(client.reset).not.toHaveBeenCalled();
  });

  it('purgeAnalyticsQueues still nulls LogsQueue when nulling Queue throws, and never throws itself', () => {
    const setPersistedProperty = jest.fn((key: unknown) => {
      if (key === PostHogPersistedProperty.Queue) throw new Error('boom');
    });
    expect(() => purgeAnalyticsQueues({ setPersistedProperty })).not.toThrow();
    expect(setPersistedProperty).toHaveBeenCalledWith(PostHogPersistedProperty.LogsQueue, null);
    expect(() => purgeAnalyticsQueues({} as never)).not.toThrow();
    expect(() => purgeAnalyticsQueues(null as never)).not.toThrow();
  });

  it('installConsentWithdrawalPurge tolerates a client without the queue API and a throwing client', async () => {
    seedConsent(validRecord());
    await hydrateStore();
    const bare = { optIn: jest.fn(), optOut: jest.fn() };
    const u1 = installConsentWithdrawalPurge(bare as never);
    const throwing = {
      optOut: jest.fn(() => {
        throw new Error('boom');
      }),
      setPersistedProperty: jest.fn(),
      flush: jest.fn(),
      reset: jest.fn(),
    };
    const u2 = installConsentWithdrawalPurge(throwing as never);
    uninstallers.push(u1, u2);

    await expect(withdraw('toggle')).resolves.toBeUndefined();
    expect(bare.optOut).not.toHaveBeenCalled();
    expect(throwing.flush).not.toHaveBeenCalled();
    expect(throwing.reset).not.toHaveBeenCalled();
  });

  it('the returned function unsubscribes: a later withdrawal no longer purges', async () => {
    const { launched, uninstall } = await consentedSessionWithMarker({ install: true });
    uninstall();
    await withdraw('toggle');
    expect(JSON.stringify(queueOf(launched.client))).toContain(PRE);
  });
});
