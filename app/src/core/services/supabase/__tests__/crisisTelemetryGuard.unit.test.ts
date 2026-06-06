/**
 * crisis_detected telemetry defensive guard (DEBUG-218) — UNIT
 *
 * Belt-and-suspenders behind the two upstream field-population fixes: if a future
 * trigger is ever added without a severity/type mapping, `trackCrisisDetection` must
 * degrade VISIBLY — substitute an explicit 'unknown' sentinel (never re-introduce the
 * literal "undefined"), raise a high-severity security log, and STILL emit. A
 * vital-interest crisis event is never dropped on a field-validation failure.
 */
import { jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({})) }));

// Spy on the security logger to prove the "missing field" case is observable.
const mockLogSecurity = jest.fn();
jest.mock('../../logging', () => {
  const actual = jest.requireActual('../../logging') as Record<string, unknown>;
  return { ...actual, logSecurity: (...args: unknown[]) => mockLogSecurity(...args) };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseService from '@/core/services/supabase/SupabaseService';

describe('SupabaseService.trackCrisisDetection — missing-field guard (DEBUG-218)', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    service = new (supabaseService as any).constructor();
  });

  it('substitutes "unknown" (never "undefined") and still emits when a field is missing', () => {
    service.trackCrisisDetection({
      trigger_type: 'phq9_suicidal_ideation',
      severity_bucket: undefined as any,
      intervention_surfaced: true,
      assessment_type: undefined as any,
    });

    // Event still landed in the durable queue (never dropped).
    expect(service.crisisAnalyticsQueue).toHaveLength(1);
    const props = service.crisisAnalyticsQueue[0].properties;
    expect(props.severity_bucket).toBe('unknown');
    expect(props.assessment_type).toBe('unknown');
    expect(JSON.stringify(props)).not.toContain('undefined');
  });

  it('raises a high-severity security log so the degradation is observable', () => {
    service.trackCrisisDetection({
      trigger_type: 'phq9_suicidal_ideation',
      severity_bucket: undefined as any,
      intervention_surfaced: true,
      assessment_type: 'phq9',
    });

    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.stringContaining('crisis telemetry'),
      'high',
      expect.any(Object),
    );
  });

  it('leaves well-formed payloads untouched (no false-positive guard, no log)', () => {
    service.trackCrisisDetection({
      trigger_type: 'gad7_severe_score',
      severity_bucket: 'high',
      intervention_surfaced: true,
      assessment_type: 'gad7',
    });

    const props = service.crisisAnalyticsQueue[0].properties;
    expect(props.severity_bucket).toBe('high');
    expect(props.assessment_type).toBe('gad7');
    expect(mockLogSecurity).not.toHaveBeenCalled();
  });
});
