/**
 * App-lifecycle telemetry helpers — INFRA-542.
 *
 * Two mechanisms, both of which fail SILENTLY in production if wrong:
 *  - `bucketSinceLastActive` must only ever produce one of the six enum
 *    values compliance approved. A raw elapsed value leaking through would
 *    be a disclosure the privacy policy does not make.
 *  - `consumeColdStart` must fail CLOSED. A read error that returned `true`
 *    would report a fresh install on every launch, which is worse than no
 *    first-open marker at all because it looks like data.
 *
 * The last block is the load-bearing one: every emitted payload is asserted
 * against the real `PHIFilter.validate`. `trackEvent` logs and returns on a
 * rejected payload — nothing throws — so an unvalidated property is invisible
 * to every other test in this file and to review.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FIRST_OPEN_MARKER_KEY,
  SINCE_LAST_ACTIVE_BUCKETS,
  bucketSinceLastActive,
  consumeColdStart,
} from '../appLifecycleTelemetry';
import { PHIFilter, AnalyticsEvents } from '../PHIFilter';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const NOW = 1_700_000_000_000;

describe('bucketSinceLastActive (INFRA-542)', () => {
  it('reports cold_start when there is no prior timestamp', () => {
    expect(bucketSinceLastActive(null, NOW)).toBe('cold_start');
    expect(bucketSinceLastActive(undefined, NOW)).toBe('cold_start');
  });

  // Boundaries, not midpoints: an off-by-one here silently reassigns a whole
  // cohort and no consumer of the data could ever notice.
  it.each([
    ['at 0ms elapsed', NOW, 'lt_5m'],
    ['just under 5m', NOW - (5 * MINUTE - 1), 'lt_5m'],
    ['exactly 5m', NOW - 5 * MINUTE, '5m_30m'],
    ['just under 30m', NOW - (30 * MINUTE - 1), '5m_30m'],
    ['exactly 30m', NOW - 30 * MINUTE, '30m_24h'],
    ['just under 24h', NOW - (24 * HOUR - 1), '30m_24h'],
    ['exactly 24h', NOW - 24 * HOUR, 'gt_24h'],
    ['well past 24h', NOW - 400 * HOUR, 'gt_24h'],
  ])('%s', (_label, lastActiveAt, expected) => {
    expect(bucketSinceLastActive(lastActiveAt as number, NOW)).toBe(expected);
  });

  it('fails closed to unknown on a future timestamp (clock skew)', () => {
    expect(bucketSinceLastActive(NOW + 5 * MINUTE, NOW)).toBe('unknown');
  });

  it('fails closed to unknown on a non-finite timestamp', () => {
    expect(bucketSinceLastActive(Number.NaN, NOW)).toBe('unknown');
    expect(bucketSinceLastActive(Number.POSITIVE_INFINITY, NOW)).toBe('unknown');
  });

  it('never returns a value outside the approved enum', () => {
    const probes = [
      null,
      undefined,
      Number.NaN,
      NOW,
      NOW + 1,
      NOW - 1,
      NOW - 7 * MINUTE,
      NOW - 3 * HOUR,
      NOW - 90 * HOUR,
      0,
      -1,
    ];
    for (const probe of probes) {
      expect(SINCE_LAST_ACTIVE_BUCKETS).toContain(
        bucketSinceLastActive(probe as number | null, NOW)
      );
    }
  });
});

describe('consumeColdStart (INFRA-542)', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockReset();
    (AsyncStorage.setItem as jest.Mock).mockReset();
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('reports a first open and persists the marker when absent', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await expect(consumeColdStart()).resolves.toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(FIRST_OPEN_MARKER_KEY, expect.any(String));
  });

  it('reports a return and does not rewrite the marker when present', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1');

    await expect(consumeColdStart()).resolves.toBe(false);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('fails closed to false when the read throws', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('storage unavailable'));

    // false, not true: a broken read must never be reported as a fresh install.
    await expect(consumeColdStart()).resolves.toBe(false);
  });

  it('still reports the first open when the marker WRITE throws', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('disk full'));

    // The read is what decides; a failed write must not throw into app launch.
    await expect(consumeColdStart()).resolves.toBe(true);
  });

  it('is not swept by account erasure — the key carries no swept prefix', () => {
    // compliance ruling (INFRA-542): this marker is a device-level install
    // anchor holding no wellness content, the AsyncStorage analogue of
    // auth_device_id. It must SURVIVE clearAllWellnessData on both branches.
    // Asserted here rather than in the erasure suite so that a future change
    // giving it a swept prefix fails at its definition site.
    const sweptPrefixes = [
      'crisis_async_',
      'assessment_async_',
      'wellness_async_',
      'wellness_migrated:',
      'audit_log_',
    ];
    for (const prefix of sweptPrefixes) {
      expect(FIRST_OPEN_MARKER_KEY.startsWith(prefix)).toBe(false);
    }
  });
});

describe('emitted payloads survive PHIFilter (INFRA-542)', () => {
  // The whole point of the item. PHIFilter drops a violating event WHOLE and
  // only logs, so without this block a wrong key ships as a permanent zero.
  it.each(SINCE_LAST_ACTIVE_BUCKETS.map((b) => [b] as const))(
    'app_opened validates with since_last_active=%s',
    (bucket) => {
      for (const isColdStart of [true, false]) {
        const result = PHIFilter.validate(AnalyticsEvents.APP_OPENED, {
          is_cold_start: isColdStart,
          since_last_active: bucket,
        });
        expect(result).toEqual({ valid: true });
      }
    }
  );

  it('app_backgrounded validates with a raw duration_seconds', () => {
    for (const seconds of [0, 1, 42, 86_400]) {
      expect(
        PHIFilter.validate(AnalyticsEvents.APP_BACKGROUNDED, { duration_seconds: seconds })
      ).toEqual({ valid: true });
    }
  });

  it('the validator still rejects the key this design deliberately avoids', () => {
    // Non-vacuity guard (DEBUG-390): proves the assertions above are passing
    // on real validation rather than on a matcher that fires for anything.
    // `seconds_since_last_active` is absent from SAFE_NUMERIC_KEYS, which is
    // precisely why this item emits a bucketed string instead.
    expect(
      PHIFilter.validate(AnalyticsEvents.APP_OPENED, { seconds_since_last_active: 300 })
    ).not.toEqual({ valid: true });
  });
});
