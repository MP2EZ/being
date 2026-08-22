/**
 * DEBUG-409 — crisis telemetry reaches Supabase on the DEFAULT boot path — UNIT
 *
 * `public.analytics_events` on the live project held exactly ONE row, of any event
 * type, ever. Mechanism: `flushCrisisAnalytics` early-returns on `!this.client`;
 * `this.client` is assigned only inside `initialize()`; `initialize()`'s callers all
 * sit inside `initializeCloudServices()`, whose module-scope eager call is gated on
 * `canPerformOperation('cloud_sync')` — evaluated at module-load time when
 * `consentStatus` is still `'loading'`, so the predicate is necessarily false and
 * never re-runs. A client existed only for a user who had opened Profile → Cloud
 * Backup.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM crisisTelemetryDurable.unit.test.ts:
 * that suite hand-injects `service.client` (:72, :89), which is exactly why it was
 * green against a system that wrote nothing. AC5 forbids that shape. Here NOTHING
 * assigns `service.client` — the production path must construct it, or these fail.
 *
 * WHAT IS MOCKED: only the WIRE (`createSupabasePinnedFetch`). `@supabase/supabase-js`
 * is deliberately NOT mocked — it is not globally mocked either (the mock in
 * crisisTelemetryDurable is file-local), so the real client, the real GoTrue
 * anonymous-session handshake and the real PostgREST insert path all execute. The
 * fetch stub is the network boundary and nothing above it is faked.
 *
 * WHAT THIS CANNOT PROVE: that a row actually lands in the live project. No jest
 * test can — CI is 100% ubuntu-latest and the Maestro gate wipes state on every
 * launch. That measurement is INFRA-412, attended.
 */
import { jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage');

// The ONLY mock: the network boundary. Everything above it is the real thing.
const fetchCalls: Array<{ url: string; body: any }> = [];
jest.mock('@/core/services/security/pinned-fetch', () => ({
  validatePinningConfiguration: () => ({ valid: true, errors: [] }),
  createSupabasePinnedFetch: () => async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? String(input);
    let body: any = null;
    try {
      body = init?.body ? JSON.parse(init.body) : null;
    } catch {
      body = init?.body ?? null;
    }
    fetchCalls.push({ url, body });

    // GoTrue anonymous sign-in.
    if (url.includes('/auth/v1/signup') || url.includes('/auth/v1/token')) {
      return new Response(
        JSON.stringify({
          access_token: 'test-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'test-refresh-token',
          user: { id: 'anon-user-uuid', aud: 'authenticated', role: 'authenticated' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // PostgREST insert.
    return new Response(JSON.stringify([]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseService, {
  PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS,
} from '@/core/services/supabase/SupabaseService';
import { useConsentStore } from '@/core/stores/consentStore';

const payload = {
  trigger_type: 'phq9_suicidal_ideation',
  severity_bucket: 'critical',
  intervention_surfaced: true,
  assessment_type: 'PHQ-9',
};

/**
 * Drains microtasks AND macrotasks. `trackCrisisDetection` is fire-and-forget by
 * design (AC4), so the whole chain — construct client → GoTrue handshake → PostgREST
 * insert — runs detached behind several real `await`s in supabase-js. A microtask-only
 * drain settles ensureClient but not the insert.
 */
const settle = async () => {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
};

describe('DEBUG-409 — crisis telemetry on the default boot path (no consent, no Cloud Backup)', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchCalls.length = 0;
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    service = new (supabaseService as any).constructor();
  });

  it('AC2 — the default configuration really is consent-denied (fixture guard)', () => {
    // If this ever goes green by consent being granted, the suite below stops
    // testing what it claims to. Pin the precondition rather than assuming it.
    const canSync = useConsentStore.getState().canPerformOperation('cloud_sync');
    expect(canSync).toBe(false);
  });

  it('AC5 — trackCrisisDetection provisions a client with NO consent and NO Cloud Backup visit', async () => {
    expect(service.client).toBeNull();

    service.trackCrisisDetection(payload);
    await settle();

    // Nothing in this test assigned service.client. The production path did.
    expect(service.client).not.toBeNull();
  });

  it('AC1 (unit-level) — the crisis event is actually POSTed to analytics_events', async () => {
    service.trackCrisisDetection(payload);
    await settle();

    const insert = fetchCalls.find((c) => c.url.includes('/rest/v1/analytics_events'));
    expect(insert).toBeDefined();
    expect(insert!.body).toEqual([
      expect.objectContaining({
        event_type: 'crisis_detected',
        user_id: 'anon-user-uuid',
        properties: expect.objectContaining({
          trigger_type: 'phq9_suicidal_ideation',
          severity_bucket: 'critical',
          intervention_surfaced: true,
          assessment_type: 'PHQ-9',
        }),
      }),
    ]);
  });

  it('AC2 — provisioning does NOT flip isInitialized, so backups/sync/trackEvent stay consent-gated', async () => {
    service.trackCrisisDetection(payload);
    await settle();

    // The vital-interest lane provisions a client and NOTHING else. If this flips,
    // processOfflineQueue and the cloud lifecycle handlers silently come alive for
    // users who never consented to cloud sync — a far wider reversal of MAINT-173
    // than the compliance ruling covers.
    expect(service.isInitialized).toBe(false);
  });

  it('proportionality — an empty queue provisions NO client and opens NO session', async () => {
    // A user who never crosses a crisis threshold must never get a backend identity.
    // This is the whole compliance argument for lazy-over-eager; if it regresses,
    // every install opens a Supabase session at boot.
    await service.initializeCrisisTelemetry();
    await settle();

    expect(service.client).toBeNull();
    expect(fetchCalls).toHaveLength(0);
  });

  it('AC6 — a backlog persisted by a previous install is recovered at boot', async () => {
    // DEBUG-413 narrowed what "a backlog" means here, and the narrowing IS this item's
    // resolution of AC6. AC6 asked what should happen to queues already accumulated on
    // shipped devices; the answer was: a POST-fix backlog is recovered and flushed (what
    // this test asserts), while a PRE-fix one is suppressed at load rather than delivered
    // with a NOW() timestamp — see crisisBacklogSuppression.unit.test.ts.
    //
    // The fixture was `enqueued_at: 1_753_000_000_000` (2025-07-20), which is now before
    // PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS and is exactly the class DEBUG-413 drops, so it
    // would have failed here for the right reason in the wrong test. Dated post-cutoff
    // and derived from the constant so it cannot drift back.
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (k: string) =>
      k === '@being/supabase/crisis_analytics_queue'
        ? JSON.stringify([
            {
              event_type: 'crisis_detected',
              properties: payload,
              session_id: 'session_2026-07-25_oldsession',
              enqueued_at: PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS + 1,
            },
          ])
        : null
    );

    await service.initializeCrisisTelemetry();
    await settle();

    const insert = fetchCalls.find((c) => c.url.includes('/rest/v1/analytics_events'));
    expect(insert).toBeDefined();
    expect(insert!.body[0]).toMatchObject({ session_id: 'session_2026-07-25_oldsession' });
  });

  it('AC4 — trackCrisisDetection stays synchronous and returns undefined (never awaitable)', () => {
    // handleCrisisDetection is awaited by answerQuestion/completeAssessment under a
    // STRICT <200ms CI gate, and journalCrisisScan `await`s this call — harmless only
    // while it returns void. If it ever returns a promise, that await silently becomes
    // a blocking one on the journal crisis path.
    const returned = service.trackCrisisDetection(payload);
    expect(returned).toBeUndefined();
    // No client was constructed inside the synchronous frame.
    expect(service.client).toBeNull();
  });

  it('re-entrancy — overlapping flushes insert each event once and drop nothing', async () => {
    service.client = null;
    service.crisisAnalyticsQueue = [
      { event_type: 'crisis_detected', properties: payload, session_id: 's1', enqueued_at: 1 },
      { event_type: 'crisis_detected', properties: payload, session_id: 's2', enqueued_at: 2 },
    ];

    // Three concurrent flushes is the real shape after this fix: initialize()'s,
    // the per-detection one, and the AppState-active one. Without a guard they
    // each snapshot `pending` and then truncate with slice(pending.length),
    // producing duplicate rows AND discarding anything enqueued mid-flight.
    await Promise.all([
      service.flushCrisisAnalytics(),
      service.flushCrisisAnalytics(),
      service.flushCrisisAnalytics(),
    ]);
    await settle();

    const inserts = fetchCalls.filter((c) => c.url.includes('/rest/v1/analytics_events'));
    const sent = inserts.flatMap((c) => c.body.map((r: any) => r.session_id)).sort();
    expect(sent).toEqual(['s1', 's2']);
    expect(service.crisisAnalyticsQueue).toHaveLength(0);
  });
});
