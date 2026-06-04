/**
 * SupabaseService analytics_events gate + sanitizer (INFRA-214 T4) — UNIT
 *
 * Pins two privacy invariants for the operational-telemetry path (trackEvent):
 *  - nothing reaches analytics_events without analytics consent (honors universal opt-out)
 *  - any clinically-named numeric is severity-bucketed (no raw PHQ/GAD integer), while
 *    operational numerics pass through.
 *
 * NOTE: deliberately does NOT mock expo-crypto — the global jest.setup mock provides
 * getRandomBytes (a local mock would shadow it incompletely and break import).
 */
import { jest } from '@jest/globals';

const mockCanPerform = jest.fn(() => true);
jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: { getState: () => ({ canPerformOperation: mockCanPerform }) },
}));
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => Promise.resolve({ data: [{}], error: null })),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      eq: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),
  })),
}));

import supabaseService from '@/core/services/supabase/SupabaseService';

describe('SupabaseService analytics_events gate + sanitizer (INFRA-214 T4)', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanPerform.mockReturnValue(true);
    service = new (supabaseService as any).constructor();
    service.userId = 'user_t4';
  });

  it('drops ops telemetry when analytics consent is absent', async () => {
    mockCanPerform.mockReturnValue(false);
    await service.trackEvent('backup_completed', { size_mb: 5 });
    expect(service.analyticsQueue).toHaveLength(0);
  });

  it('records ops telemetry when analytics consent is present', async () => {
    await service.trackEvent('backup_completed', { size_mb: 5 });
    expect(service.analyticsQueue).toHaveLength(1);
  });

  it('buckets a clinically-named numeric under a non-score key; passes operational numerics', async () => {
    await service.trackEvent('some_event', { phq9_total: 18, size_mb: 5, duration_ms: 12 });
    const props = service.analyticsQueue[0].properties;

    // Clinical numeric is bucketed, never stored raw.
    expect(props.phq9_total_bucket).toBe('moderate_severe');
    expect('phq9_total' in props).toBe(false);
    // Operational numerics pass through unchanged.
    expect(props.size_mb).toBe(5);
    expect(props.duration_ms).toBe(12);
  });
});
