/**
 * INFRA-861 — crisis telemetry leaves the device with no account or session identifier.
 *
 * The server de-links every crisis_detected row (trigger + CHECK, migration
 * 20261024000000), so these pins are about the REQUEST: what the gateway, its logs and
 * the identity system see. Before INFRA-861 the first crisis on an install minted the
 * anonymous identity (auth.users.created_at lined up with it) and every crisis POST
 * carried the user JWT. Server-side nulling cannot undo either.
 *
 * WHAT IS MOCKED: only the wire (`createSupabasePinnedFetch`), as in
 * crisisTelemetryBoot. supabase-js runs for real, so the headers asserted here are the
 * ones the library actually builds.
 */
import { jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('@react-native-async-storage/async-storage');

// A working Keychain, so a minted session really persists and the shared client really
// attaches its token — the condition the no-JWT pin has to hold under.
const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  getItemAsync: async (k: string) => (mockKeychain.has(k) ? mockKeychain.get(k)! : null),
  setItemAsync: async (k: string, v: string) => {
    mockKeychain.set(k, v);
  },
  deleteItemAsync: async (k: string) => {
    mockKeychain.delete(k);
  },
}));

type Call = { url: string; headers: Record<string, string>; body: any };
const mockFetchCalls: Call[] = [];
let mockInsertResponder: (call: Call) => Response = () => new Response(null, { status: 201 });

const mockSessionToken = 'user-session-access-token';

jest.mock('@/core/services/security/pinned-fetch', () => ({
  validatePinningConfiguration: () => ({ valid: true, errors: [] }),
  createSupabasePinnedFetch: () => async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? String(input);
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((v, k) => {
      headers[k.toLowerCase()] = v;
    });
    let body: any = null;
    try {
      body = init?.body ? JSON.parse(init.body) : null;
    } catch {
      body = init?.body ?? null;
    }
    const call = { url, headers, body };
    mockFetchCalls.push(call);

    if (url.includes('/auth/v1/')) {
      return new Response(
        JSON.stringify({
          access_token: mockSessionToken,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'refresh',
          user: { id: 'anon-user-uuid', aud: 'authenticated', role: 'authenticated' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url.includes('/rest/v1/analytics_events')) return mockInsertResponder(call);
    return new Response(JSON.stringify([]), { status: 200 });
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseService from '@/core/services/supabase/SupabaseService';
import { env } from '@/core/config/env';
import { useConsentStore } from '@/core/stores/consentStore';

const payload = {
  trigger_type: 'phq9_suicidal_ideation',
  severity_bucket: 'critical',
  intervention_surfaced: true,
  assessment_type: 'phq9',
};

const ALLOWED_PROPERTY_KEYS = [
  'trigger_type',
  'severity_bucket',
  'intervention_surfaced',
  'assessment_type',
  'detected_on',
];

const settle = async () => {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
};

const crisisInserts = () => mockFetchCalls.filter((c) => c.url.includes('/rest/v1/analytics_events'));
const signups = () => mockFetchCalls.filter((c) => c.url.includes('/auth/v1/signup'));

const queued = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    event_type: 'crisis_detected',
    properties: { ...payload },
    session_id: `session_2026-10-24_q${i}`,
    enqueued_at: Date.UTC(2026, 9, 24) + i,
  }));

describe('INFRA-861 — the crisis request carries no identity', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchCalls.length = 0;
    mockKeychain.clear();
    mockInsertResponder = () => new Response(null, { status: 201 });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    service = new (supabaseService as any).constructor();
  });

  it('never mints an anonymous identity: per-detection flush on a fresh install', async () => {
    service.trackCrisisDetection(payload);
    await settle();

    expect(crisisInserts()).toHaveLength(1);
    expect(signups()).toHaveLength(0);
    // The shared (session-bearing) client is never built for a crisis.
    expect(service.client).toBeNull();
    expect(service.userId).toBeNull();
  });

  it('never mints an anonymous identity: boot recovery of a persisted queue', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (k: string) =>
      k === '@being/supabase/crisis_analytics_queue' ? JSON.stringify(queued(2)) : null
    );

    await service.initializeCrisisTelemetry();
    await settle();

    expect(crisisInserts()).toHaveLength(1);
    expect(signups()).toHaveLength(0);
    expect(service.client).toBeNull();
  });

  it('never mints an anonymous identity: AppState-active flush', async () => {
    service.crisisAnalyticsQueue = queued(1);
    await service.flushCrisisAnalytics();
    await settle();

    expect(crisisInserts()).toHaveLength(1);
    expect(signups()).toHaveLength(0);
  });

  it('sends no user JWT even while the shared client holds a session', async () => {
    // A purchase can mint the identity; after that, every request through the shared
    // client carries the session token. The crisis lane must not.
    const auth = await service.getAuthenticatedClient({ mint: true });
    expect(auth.ok).toBe(true);
    // Control: the shared client really does attach the session token. Without this the
    // assertion below could pass against a fixture that never held a session.
    mockFetchCalls.length = 0;
    await auth.client.from('encrypted_backups').select('id');
    const control = mockFetchCalls.find((c) => c.url.includes('/rest/v1/encrypted_backups'));
    expect(control?.headers.authorization).toBe(`Bearer ${mockSessionToken}`);
    mockFetchCalls.length = 0;

    service.trackCrisisDetection(payload);
    await settle();

    const [insert] = crisisInserts();
    expect(insert).toBeDefined();
    expect(insert.headers.apikey).toBe(env.EXPO_PUBLIC_SUPABASE_KEY);
    const authz = insert.headers.authorization;
    expect(authz === undefined || authz === `Bearer ${env.EXPO_PUBLIC_SUPABASE_KEY}`).toBe(true);
    expect(JSON.stringify(insert.headers)).not.toContain(mockSessionToken);
    expect(insert.headers['sentry-trace']).toBeUndefined();
    expect(insert.headers.baggage).toBeUndefined();
    expect(insert.headers.traceparent).toBeUndefined();
  });

  it('each row is exactly {event_type, properties}; properties hold only allowlisted keys', async () => {
    service.trackCrisisDetection(payload);
    await settle();

    const [insert] = crisisInserts();
    expect(insert.body).toHaveLength(1);
    for (const row of insert.body) {
      expect(Object.keys(row).sort()).toEqual(['event_type', 'properties']);
      expect(row.event_type).toBe('crisis_detected');
      for (const k of Object.keys(row.properties)) {
        expect(ALLOWED_PROPERTY_KEYS).toContain(k);
      }
      expect(row.properties.detected_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('does no network work inside the synchronous trackCrisisDetection frame', () => {
    const returned = service.trackCrisisDetection(payload);
    expect(returned).toBeUndefined();
    expect(mockFetchCalls).toHaveLength(0);
  });

  it('reads no consent state on the crisis lane', async () => {
    const getState = jest.spyOn(useConsentStore, 'getState');
    service.trackCrisisDetection(payload);
    await settle();

    expect(crisisInserts()).toHaveLength(1);
    expect(getState).not.toHaveBeenCalled();
    getState.mockRestore();
  });

  it('builds the crisis client once and reuses it', async () => {
    service.trackCrisisDetection(payload);
    await settle();
    const first = service.crisisClient;
    service.trackCrisisDetection(payload);
    await settle();

    expect(first).toBeTruthy();
    expect(service.crisisClient).toBe(first);
    expect(crisisInserts()).toHaveLength(2);
  });
});

describe('INFRA-861 — chunking below the server per-statement cap', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchCalls.length = 0;
    mockInsertResponder = () => new Response(null, { status: 201 });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    service = new (supabaseService as any).constructor();
  });

  it('a backlog of 51 delivers in order, in chunks of at most 25', async () => {
    service.crisisAnalyticsQueue = queued(51);
    await service.flushCrisisAnalytics();
    await settle();

    const sizes = crisisInserts().map((c) => c.body.length);
    expect(sizes).toEqual([25, 25, 1]);
    expect(service.crisisAnalyticsQueue).toHaveLength(0);
  });

  it('a failure on chunk 2 retains chunks 2 and 3 exactly, and stops', async () => {
    const backlog = queued(51);
    service.crisisAnalyticsQueue = backlog.slice();
    let n = 0;
    mockInsertResponder = () => {
      n += 1;
      return n === 1
        ? new Response(null, { status: 201 })
        : new Response(JSON.stringify({ code: '08006', message: 'connection failure' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
    };

    await service.flushCrisisAnalytics();
    await settle();

    expect(service.crisisAnalyticsQueue).toEqual(backlog.slice(25));
    // Chunk 1 once, chunk 2 with its retries, chunk 3 never.
    const bodies = crisisInserts().map((c) => c.body.length);
    expect(bodies[0]).toBe(25);
    expect(bodies.slice(1).every((s) => s === 25)).toBe(true);
  });

  it('an erasure mid-flight stops the loop and keeps post-erasure events', async () => {
    service.crisisAnalyticsQueue = queued(30);
    let n = 0;
    mockInsertResponder = () => {
      n += 1;
      if (n === 1) {
        // What teardownErasedSession does, synchronously, while chunk 1 is in flight.
        service.crisisQueueEpoch += 1;
        service.crisisAnalyticsQueue = queued(1).map((e) => ({ ...e, session_id: 'session_2026-10-24_after' }));
      }
      return new Response(null, { status: 201 });
    };

    await service.flushCrisisAnalytics();
    await settle();

    expect(n).toBe(1);
    expect(service.crisisAnalyticsQueue).toEqual([
      expect.objectContaining({ session_id: 'session_2026-10-24_after' }),
    ]);
  });
});

describe('INFRA-861 — the daily ceiling (SQLSTATE BE862)', () => {
  let service: any;
  const ceiling = () =>
    new Response(JSON.stringify({ code: 'BE862', message: 'crisis ingest ceiling reached' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchCalls.length = 0;
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    service = new (supabaseService as any).constructor();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('short-circuits retries, retains everything, and backs off until the not-before time', async () => {
    const now = Date.UTC(2026, 9, 24, 12, 0, 0);
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    mockInsertResponder = ceiling;
    service.crisisAnalyticsQueue = queued(3);

    await service.flushCrisisAnalytics();
    await settle();

    expect(crisisInserts()).toHaveLength(1); // no retry loop
    expect(service.crisisAnalyticsQueue).toHaveLength(3); // never dropped

    // Inside the back-off: the flight skips the network entirely.
    clock.mockReturnValue(now + 5 * 60 * 1000);
    await service.flushCrisisAnalytics();
    await settle();
    expect(crisisInserts()).toHaveLength(1);

    // After it: the next natural trigger delivers.
    mockInsertResponder = () => new Response(null, { status: 201 });
    clock.mockReturnValue(now + 16 * 60 * 1000);
    await service.flushCrisisAnalytics();
    await settle();
    expect(crisisInserts()).toHaveLength(2);
    expect(service.crisisAnalyticsQueue).toHaveLength(0);
  });

  it('never backs off past the next UTC day boundary', async () => {
    const now = Date.UTC(2026, 9, 24, 23, 55, 0);
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    mockInsertResponder = ceiling;
    service.crisisAnalyticsQueue = queued(1);

    await service.flushCrisisAnalytics();
    await settle();

    mockInsertResponder = () => new Response(null, { status: 201 });
    clock.mockReturnValue(Date.UTC(2026, 9, 25, 0, 0, 1));
    await service.flushCrisisAnalytics();
    await settle();
    expect(crisisInserts()).toHaveLength(2);
  });
});

describe('INFRA-861 — client value domains match the server allowlist', () => {
  // The migration rebuilds properties from fixed sets; a client value outside them is
  // stored as 'unknown'. A new trigger type added in the app without the migration
  // would silently lose its label in the operator views.
  const migrationsDir = path.resolve(__dirname, '../../../../../../supabase/migrations');
  const migration = fs
    .readdirSync(migrationsDir)
    .filter((f) => /infra861_crisis_delink\.sql$/.test(f))
    .map((f) => fs.readFileSync(path.join(migrationsDir, f), 'utf8'))[0];

  const setFor = (key: string): string[] => {
    const block = migration.match(
      new RegExp(`'${key}',\\s*CASE[\\s\\S]*?ANY \\(ARRAY\\[([\\s\\S]*?)\\]\\)`)
    );
    if (!block) throw new Error(`no allowlist for ${key} in the INFRA-861 migration`);
    return Array.from(block[1].matchAll(/'([a-z0-9_]+)'/g)).map((m) => m[1]).sort();
  };

  const unionFrom = (file: string, typeName: string): string[] => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../../../', file), 'utf8');
    const m = src.match(new RegExp(`export type ${typeName}\\s*=([\\s\\S]*?);`));
    if (!m) throw new Error(`no ${typeName} in ${file}`);
    return Array.from(m[1].replace(/\/\/.*$/gm, '').matchAll(/'([a-z0-9_]+)'/g)).map((x) => x[1]);
  };

  it('the migration file is present', () => {
    expect(migration).toBeDefined();
  });

  it('trigger_type covers every CrisisTriggerType plus the journal trigger', () => {
    const client = [
      ...unionFrom('features/crisis/types/safety.ts', 'CrisisTriggerType'),
      'journal_text_match',
    ].sort();
    expect(setFor('trigger_type')).toEqual(client);
  });

  it('severity_bucket covers every CrisisSeverityLevel', () => {
    expect(setFor('severity_bucket')).toEqual(
      unionFrom('features/crisis/types/safety.ts', 'CrisisSeverityLevel').sort()
    );
  });

  it('assessment_type covers every AssessmentType plus the journal surface', () => {
    expect(setFor('assessment_type')).toEqual(
      [...unionFrom('features/assessment/types/index.ts', 'AssessmentType'), 'voice_journal'].sort()
    );
  });

  it('the journal scan still emits the values the parity list assumes', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../../../features/journal/services/journalCrisisScan.ts'),
      'utf8'
    );
    expect(src).toMatch(/const TRIGGER_TYPE = 'journal_text_match';/);
    expect(src).toMatch(/const SURFACE = 'voice_journal';/);
  });
});
