/**
 * Crisis-detection telemetry emit contract (INFRA-214 T3) — UNIT
 *
 * Pins the SAFETY-CRITICAL contract for emitting vital-interest crisis-detection
 * telemetry from `handleCrisisDetection`:
 *  - emits a PII-free, bucketed event AFTER the dedup guard + emergency response
 *  - never forwards the raw triggerValue / score
 *  - emits exactly once per intervention episode (no double-count on dedup)
 *  - is fire-and-forget: a telemetry failure never throws into the crisis flow
 *
 * The whole Supabase module is mocked so this exercises the emit contract only
 * (the durable-queue internals live in SupabaseService + the T6 landing test).
 */
import { jest } from '@jest/globals';

// Replace the Supabase singleton entirely (also avoids its import-time construction).
// The jest.fn() is created INSIDE the factory (jest.mock is hoisted above module-scope
// consts, so a captured outer const would be in the TDZ → undefined at factory time).
jest.mock('@/core/services/supabase/SupabaseService', () => {
  const fn = jest.fn();
  return {
    __esModule: true,
    default: { trackCrisisDetection: fn },
    supabaseService: { trackCrisisDetection: fn },
  };
});

import { useAssessmentStore } from '../assessmentStore';
import supabaseService from '@/core/services/supabase/SupabaseService';

// Same reference assessmentStore calls (default import → default.trackCrisisDetection).
const mockTrackCrisisDetection = (supabaseService as any).trackCrisisDetection as jest.Mock;

const baseDetection = {
  id: 'detect_1',
  isTriggered: true,
  primaryTrigger: 'phq9_suicidal_ideation',
  secondaryTriggers: [],
  severityLevel: 'critical',
  triggerValue: 3, // raw Q9 value present on the detection object — MUST NOT be emitted
  assessmentType: 'PHQ-9',
  timestamp: Date.now(),
  assessmentId: 'assess_1',
} as any;

describe('handleCrisisDetection → crisis telemetry emit (INFRA-214 T3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAssessmentStore.setState({ crisisDetection: null, crisisIntervention: null } as any);
  });

  it('emits a PII-free, bucketed crisis-detection event', async () => {
    await useAssessmentStore.getState().handleCrisisDetection({ ...baseDetection });

    expect(mockTrackCrisisDetection).toHaveBeenCalledTimes(1);
    const payload = mockTrackCrisisDetection.mock.calls[0][0];
    expect(payload).toEqual({
      trigger_type: 'phq9_suicidal_ideation',
      severity_bucket: 'critical',
      intervention_surfaced: true,
      assessment_type: 'PHQ-9',
    });
    // The raw clinical value must never be forwarded.
    expect('triggerValue' in payload).toBe(false);
    expect(JSON.stringify(payload)).not.toContain('triggerValue');
  });

  it('emits once per intervention episode (no double-count on the dedup path)', async () => {
    await useAssessmentStore.getState().handleCrisisDetection({ ...baseDetection });
    // Second detection for the SAME assessment (e.g. score-threshold after inline Q9):
    // dedup suppresses it, so no second telemetry event.
    await useAssessmentStore.getState().handleCrisisDetection({
      ...baseDetection,
      id: 'detect_2',
      primaryTrigger: 'phq9_moderate_severe_score',
    });

    expect(mockTrackCrisisDetection).toHaveBeenCalledTimes(1);
    // The clinically-specific first trigger is the one reported.
    expect(mockTrackCrisisDetection.mock.calls[0][0].trigger_type).toBe('phq9_suicidal_ideation');
  });

  it('is fire-and-forget — a telemetry failure never throws into the crisis flow', async () => {
    mockTrackCrisisDetection.mockImplementationOnce(() => {
      throw new Error('telemetry down');
    });
    await expect(
      useAssessmentStore.getState().handleCrisisDetection({ ...baseDetection })
    ).resolves.not.toThrow();
  });
});
