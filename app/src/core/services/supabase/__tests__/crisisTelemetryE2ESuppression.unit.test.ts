/**
 * INFRA-411 — crisis telemetry does not egress from e2e-sim builds — UNIT
 *
 * The Maestro safety gate runs a Release binary that carries REAL Supabase
 * configuration (INFRA-383 grepped the embedded main.jsbundle) and boots with
 * `cloudSyncEnabled: true` from the e2e seed. Once a client exists on the default
 * path (DEBUG-409), four of the eight sim flows -- q9-single-alert,
 * phq9-severe-completion, gad7-severe, journal-crisis-scan -- would deposit REAL
 * `crisis_detected` rows into production `public.analytics_events`: the same table
 * the FEAT-129 operator views read and the INFRA-219 alerter's volume logic
 * depends on. Nothing in the row marks it synthetic.
 *
 * This suite pins the suppression in BOTH directions. The second test is the
 * negative control and is what keeps this suite honest: an unconditional guard --
 * the obvious way to get the first test green -- makes it fail. A one-sided
 * suppression test would pass against a service that never egresses at all.
 */
import { jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({})) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseService from '@/core/services/supabase/SupabaseService';
import { env } from '@/core/config/env';

const payload = {
  event_type: 'crisis_detected',
  properties: {
    trigger_type: 'phq9_suicidal_ideation',
    severity_bucket: 'critical',
    intervention_surfaced: true,
    assessment_type: 'PHQ-9',
  },
  session_id: 'session_2026-08-12_abc123def',
  enqueued_at: 1_760_000_000_000,
};

describe('INFRA-411 — crisis telemetry egress is suppressed in e2e-sim builds', () => {
  let service: any;
  let insert: jest.Mock;
  let from: jest.Mock;
  const originalSeedFlag = env.EXPO_PUBLIC_E2E_SEED_ONBOARDED;

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    service = new (supabaseService as any).constructor();

    // Put the service in the one state where a flush would actually egress:
    // a queued event, a live client, and a provisioned auth.uid(). This suite is
    // about the guard, not about boot wiring -- DEBUG-409 owns that.
    insert = jest.fn(async () => ({ error: null }));
    from = jest.fn(() => ({ insert }));
    service.client = { from };
    service.userId = 'user-uuid-under-test';
    service.crisisAnalyticsQueue = [{ ...payload }];
  });

  afterEach(() => {
    (env as any).EXPO_PUBLIC_E2E_SEED_ONBOARDED = originalSeedFlag;
  });

  it('performs NO insert when the e2e-sim seed flag is set', async () => {
    (env as any).EXPO_PUBLIC_E2E_SEED_ONBOARDED = 'true';

    await service.flushCrisisAnalytics();

    expect(from).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('inserts exactly as before when the flag is absent (NEGATIVE CONTROL — an unconditional guard fails here)', async () => {
    (env as any).EXPO_PUBLIC_E2E_SEED_ONBOARDED = 'false';

    await service.flushCrisisAnalytics();

    expect(from).toHaveBeenCalledWith('analytics_events');
    expect(insert).toHaveBeenCalledTimes(1);

    const rows = insert.mock.calls[0][0] as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: 'user-uuid-under-test',
      event_type: 'crisis_detected',
      session_id: payload.session_id,
    });
  });

  it('only the literal string "true" suppresses — a truthy-but-wrong value still egresses', async () => {
    // The gate must not be a loose truthiness check. env parses this field with a
    // booleanString schema, but the guard is what a production build actually runs
    // through, so pin the comparison rather than trusting the parser upstream.
    (env as any).EXPO_PUBLIC_E2E_SEED_ONBOARDED = '1';

    await service.flushCrisisAnalytics();

    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('retains the queue when suppressed — suppression is not a silent drop', async () => {
    (env as any).EXPO_PUBLIC_E2E_SEED_ONBOARDED = 'true';

    await service.flushCrisisAnalytics();

    expect(service.crisisAnalyticsQueue).toHaveLength(1);
    expect(service.crisisAnalyticsQueue[0]).toMatchObject({
      event_type: 'crisis_detected',
    });
  });

  it('still retries a dirty durable write before suppressing (DEBUG-335 guarantee survives)', async () => {
    (env as any).EXPO_PUBLIC_E2E_SEED_ONBOARDED = 'true';
    service.crisisPersistDirty = true;
    const persist = jest.spyOn(service, 'persistCrisisQueue');

    await service.flushCrisisAnalytics();

    // The dirty-retry sits AHEAD of every early return, including this one --
    // an unprovisioned device returns early on every flush, so a retry placed
    // after the guards would never run at all.
    expect(persist).toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
