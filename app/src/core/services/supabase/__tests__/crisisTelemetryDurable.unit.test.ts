/**
 * Crisis-detection telemetry — durable Supabase landing (INFRA-214 T6) — UNIT
 *
 * The verifiable "crisis-landing" test for AC6: a crisis-detection event is durably
 * enqueued at fire-time and lands in analytics_events once a user is provisioned, with
 * ZERO silent drops on the first-run/offline path (the gap the architect flagged — moving
 * the sink to Supabase only helps if the event survives the lazy network-provisioned userId).
 *
 * Uses the clean harness (NO local expo-crypto mock — the global jest.setup mock provides
 * getRandomBytes; a local shadow breaks the import-time singleton construction).
 */
import { jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({})) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseService from '@/core/services/supabase/SupabaseService';

const CRISIS_KEY = '@being/supabase/crisis_analytics_queue';
const payload = {
  trigger_type: 'phq9_suicidal_ideation',
  severity_bucket: 'critical',
  intervention_surfaced: true,
  assessment_type: 'PHQ-9',
};

describe('SupabaseService.trackCrisisDetection — durable vital-interest landing (INFRA-214 T6)', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    service = new (supabaseService as any).constructor();
  });

  it('durably enqueues a first-run/offline crisis with NO user provisioned (no silent drop)', () => {
    expect(service.userId).toBeNull();

    service.trackCrisisDetection(payload);

    // Held in the durable crisis queue and persisted at fire-time — unlike trackEvent,
    // which early-returns (drops) when there is no userId.
    expect(service.crisisAnalyticsQueue).toHaveLength(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(CRISIS_KEY, expect.any(String));
  });

  it('carries only bucketed, PII-free fields — never a raw score/triggerValue', () => {
    service.trackCrisisDetection(payload);
    const e = service.crisisAnalyticsQueue[0];

    expect(e.event_type).toBe('crisis_detected');
    expect(e.properties).toEqual(payload);
    expect(JSON.stringify(e)).not.toMatch(/triggerValue|totalScore/);
    Object.values(e.properties).forEach((v) => expect(typeof v).not.toBe('number'));
  });

  it('never throws into the crisis flow even if persistence fails', () => {
    (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    expect(() => service.trackCrisisDetection(payload)).not.toThrow();
  });

  it('reconciles user_id and lands the event in analytics_events once provisioned', async () => {
    // Enqueue while offline/unprovisioned (internal flush no-ops), then reconcile.
    service.trackCrisisDetection(payload);
    expect(service.crisisAnalyticsQueue).toHaveLength(1);

    const insertMock = jest.fn(() => Promise.resolve({ data: [{}], error: null }));
    service.client = { from: jest.fn(() => ({ insert: insertMock })) };
    service.userId = 'user_t6';

    await service.flushCrisisAnalytics();

    expect(insertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ event_type: 'crisis_detected', user_id: 'user_t6' }),
      ])
    );
    expect(service.crisisAnalyticsQueue).toHaveLength(0);
  });

  it('retains the event for retry when the insert fails (no silent loss)', async () => {
    jest.spyOn(service, 'sleep').mockResolvedValue(undefined);
    service.trackCrisisDetection(payload);

    service.client = {
      from: jest.fn(() => ({
        insert: jest.fn(() => Promise.resolve({ data: null, error: { message: 'net' } })),
      })),
    };
    service.userId = 'user_t6';

    await service.flushCrisisAnalytics();

    expect(service.crisisAnalyticsQueue).toHaveLength(1);
  });
});
