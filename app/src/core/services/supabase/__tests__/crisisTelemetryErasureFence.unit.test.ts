/**
 * DEBUG-763 — boot crisis-queue fence. After an interrupted erasure the persisted
 * crisis_analytics_queue still holds the DELETED account's `crisis_detected` rows, and
 * `initializeCrisisTelemetry` runs before the navigator mounts — so without the fence
 * they are re-created under a fresh anonymous user before the resume can sweep them.
 * A detection made in the current session still enqueues and flushes normally.
 *
 * Only the wire is mocked (same harness as crisisTelemetryBoot.unit.test.ts).
 */
import { jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage');

const fetchCalls: Array<{ url: string; body: any }> = [];
jest.mock('@/core/services/security/pinned-fetch', () => ({
  validatePinningConfiguration: () => ({ valid: true, errors: [] }),
  createSupabasePinnedFetch: () => async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? String(input);
    fetchCalls.push({ url, body: init?.body ? JSON.parse(init.body) : null });
    if (url.includes('/auth/v1/signup') || url.includes('/auth/v1/token')) {
      return new Response(
        JSON.stringify({
          access_token: 'a', token_type: 'bearer', expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
          user: { id: 'fresh-anon-uuid', aud: 'authenticated', role: 'authenticated' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify([]), { status: 201, headers: { 'Content-Type': 'application/json' } });
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseService, { PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS } from '@/core/services/supabase/SupabaseService';

const payload = {
  trigger_type: 'phq9_suicidal_ideation',
  severity_bucket: 'critical',
  intervention_surfaced: true,
  assessment_type: 'PHQ-9',
};
const preErasureRow = {
  event_type: 'crisis_detected',
  properties: payload,
  session_id: 'session_pre_erasure',
  enqueued_at: PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS + 1,
};
const disk = new Map<string, string>();
const inserts = () => fetchCalls.filter((c) => c.url.includes('/rest/v1/analytics_events'));
const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
};

describe('DEBUG-763 — crisis queue fence at boot', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchCalls.length = 0;
    disk.clear();
    disk.set('@being/supabase/crisis_analytics_queue', JSON.stringify([preErasureRow]));
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (k: any) => disk.get(k) ?? null);
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (k: any, v: any) => {
      disk.set(k, v);
    });
    service = new (supabaseService as any).constructor();
  });

  it('control: with no marker the persisted backlog is recovered and flushed (unchanged)', async () => {
    await service.initializeCrisisTelemetry();
    await settle();
    expect(inserts()[0]!.body[0]).toMatchObject({ session_id: 'session_pre_erasure' });
  });

  it('with the marker present the pre-erasure rows are never inserted, and no session is opened for them', async () => {
    disk.set('@being/erasure_pending', String(PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS + 10_000));
    await service.initializeCrisisTelemetry();
    await settle();
    expect(inserts()).toHaveLength(0);
    expect(service.client).toBeNull();
    expect(JSON.parse(disk.get('@being/supabase/crisis_analytics_queue')!)).toEqual([]);
  });

  it('a detection in the same session still flushes — alone', async () => {
    disk.set('@being/erasure_pending', String(PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS + 10_000));
    await service.initializeCrisisTelemetry();
    service.trackCrisisDetection(payload);
    await settle();
    const rows = inserts().flatMap((c) => c.body);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ event_type: 'crisis_detected', user_id: 'fresh-anon-uuid' });
    expect(rows[0].session_id).not.toBe('session_pre_erasure');
  });

  it('a corrupt marker is not a marker: the backlog is recovered', async () => {
    disk.set('@being/erasure_pending', 'not-a-time');
    await service.initializeCrisisTelemetry();
    await settle();
    expect(inserts()[0]!.body[0]).toMatchObject({ session_id: 'session_pre_erasure' });
  });
});
