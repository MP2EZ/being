/**
 * DEBUG-541 — `detected_on` is projected at FLUSH from `enqueued_at` — UNIT
 *
 * Crisis rows were dated by `analytics_events.created_at` (NOW() at ingest), so a device
 * that detected offline and flushed days later produced rows attributed to the FLUSH date:
 * a stale backlog read as a same-day spike on a live crisis-monitoring path.
 *
 * This suite pins the client half. The seam is the flush projection, NOT the enqueue, and
 * that choice is load-bearing rather than stylistic — see the comment at the `rows` map.
 * The properties for these assertions:
 *
 *   - the projected day comes from `enqueued_at`, never from a second clock read, so it
 *     cannot disagree with the DEBUG-413 cutoff that reads the same field;
 *   - the persisted queue entry is never mutated, so the DEBUG-335 composite dedup
 *     identity stays byte-stable and a crisis row cannot be inserted twice;
 *   - an unusable value OMITS the property and the event still egresses. Dropping a
 *     crisis event to avoid an imperfect date would be the wrong trade in the only
 *     audit sink this path has.
 */
import { jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({})) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseService, {
  crisisDetectedOn,
  PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS,
} from '@/core/services/supabase/SupabaseService';

/** 2026-09-10T23:30:00Z — deliberately late in the UTC day (see the UTC test). */
const DETECTED_MS = Date.parse('2026-09-10T23:30:00.000Z');

const basePayload = {
  event_type: 'crisis_detected',
  properties: {
    trigger_type: 'phq9_suicidal_ideation',
    severity_bucket: 'critical',
    intervention_surfaced: true,
    assessment_type: 'PHQ-9',
  },
  session_id: 'session_2026-09-10_abc123def',
  enqueued_at: DETECTED_MS,
};

describe('DEBUG-541 · crisisDetectedOn — total, and sourced from enqueued_at', () => {
  it('returns the UTC day of the enqueue instant', () => {
    expect(crisisDetectedOn(DETECTED_MS)).toBe('2026-09-10');
  });

  it('uses the UTC day, not the host-local one', () => {
    // 23:30Z is the previous local day for anyone west of UTC. A device-local boundary
    // would disagree with created_at for every such user, and would pass on UTC CI.
    expect(crisisDetectedOn(Date.parse('2026-09-10T23:30:00.000Z'))).toBe('2026-09-10');
    expect(crisisDetectedOn(Date.parse('2026-09-11T00:30:00.000Z'))).toBe('2026-09-11');
  });

  it('an event exactly AT the DEBUG-413 cutoff projects the cutoff day', () => {
    // The cutoff filter itself lives at queue adoption, not here. This pins the boundary
    // so no event that survives it can project a date earlier than the cutoff day.
    expect(crisisDetectedOn(PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS)).toBe('2026-08-14');
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a string', '2026-09-10'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['an object', { when: 1 }],
    // Finite but beyond the ECMA-262 max time value: `Number.isFinite` passes it and
    // `new Date(n).toISOString()` throws RangeError. A throw here would take out the whole
    // batch insert, so this case is the reason the range guard exists at all.
    ['past the max time value', 1e20],
    ['negative past the max time value', -1e20],
  ])('yields null for %s without throwing', (_label, value) => {
    expect(() => crisisDetectedOn(value)).not.toThrow();
    expect(crisisDetectedOn(value)).toBeNull();
  });

  it('CONTROL — the matcher still fires: a usable value is NOT null', () => {
    // Without this, a helper that returned null unconditionally would satisfy every
    // rejection case above and the suite would prove nothing.
    expect(crisisDetectedOn(DETECTED_MS)).not.toBeNull();
  });
});

describe('DEBUG-541 · the flush projects detected_on into the inserted row', () => {
  let service: any;
  let insert: jest.Mock;
  let from: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    service = new (supabaseService as any).constructor();
    insert = jest.fn(async () => ({ error: null }));
    from = jest.fn(() => ({ insert }));
    service.client = { from };
    service.userId = 'user-uuid-under-test';
  });

  const rowsFromFlush = () => (insert.mock.calls[0][0] as any[]);

  it('stamps the row with the day the event was ENQUEUED, not today', async () => {
    service.crisisAnalyticsQueue = [{ ...basePayload }];

    await service.flushCrisisAnalytics();

    const rows = rowsFromFlush();
    expect(rows).toHaveLength(1);
    expect(rows[0].properties.detected_on).toBe('2026-09-10');
    // The defect being fixed: the row must NOT be dated by when the flush happened.
    expect(rows[0].properties.detected_on).not.toBe(
      new Date().toISOString().slice(0, 10),
    );
  });

  it('keeps all four original properties alongside the new fifth', async () => {
    service.crisisAnalyticsQueue = [{ ...basePayload }];

    await service.flushCrisisAnalytics();

    expect(rowsFromFlush()[0].properties).toEqual({
      trigger_type: 'phq9_suicidal_ideation',
      severity_bucket: 'critical',
      intervention_surfaced: true,
      assessment_type: 'PHQ-9',
      detected_on: '2026-09-10',
    });
  });

  it('does NOT mutate the queued entry — the dedup identity stays byte-stable', async () => {
    // DEBUG-335 keys the merge on `session_id|enqueued_at|event_type|properties`. If the
    // flush mutated the persisted object, an in-memory copy would stop matching its own
    // disk copy and the crisis row would be inserted twice.
    const queued = { ...basePayload, properties: { ...basePayload.properties } };
    const propsRef = queued.properties;
    service.crisisAnalyticsQueue = [queued];

    await service.flushCrisisAnalytics();

    expect(propsRef).not.toHaveProperty('detected_on');
    expect(Object.keys(propsRef).sort()).toEqual(
      ['assessment_type', 'intervention_surfaced', 'severity_bucket', 'trigger_type'].sort(),
    );
  });

  it('an unusable enqueued_at OMITS the property but still EGRESSES the event', async () => {
    // Never drop a crisis event. The server COALESCEs a missing detected_on to the
    // ingest date, which is the pre-fix behaviour — visible, and biased toward a false
    // positive rather than a silent miss.
    service.crisisAnalyticsQueue = [{ ...basePayload, enqueued_at: Number.NaN }];

    await service.flushCrisisAnalytics();

    const rows = rowsFromFlush();
    expect(rows).toHaveLength(1);
    expect(rows[0].properties).not.toHaveProperty('detected_on');
    expect(rows[0].properties.trigger_type).toBe('phq9_suicidal_ideation');
  });

  it('projects per-event, so a mixed batch carries a different day on each row', async () => {
    service.crisisAnalyticsQueue = [
      { ...basePayload, enqueued_at: Date.parse('2026-09-08T10:00:00.000Z') },
      { ...basePayload, enqueued_at: Date.parse('2026-09-10T10:00:00.000Z') },
      { ...basePayload, enqueued_at: Number.NaN },
    ];

    await service.flushCrisisAnalytics();

    const rows = rowsFromFlush();
    expect(rows).toHaveLength(3);
    expect(rows[0].properties.detected_on).toBe('2026-09-08');
    expect(rows[1].properties.detected_on).toBe('2026-09-10');
    expect(rows[2].properties).not.toHaveProperty('detected_on');
  });
});
