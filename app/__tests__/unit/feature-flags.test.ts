/**
 * featureFlags.test.ts — unit coverage for the build-time flag parser (MAINT-173).
 *
 * Pure + fast: exercises parse logic via the `__parseFlagsForTest` seam and
 * pins the dark-ship default (`cloud_sync` off) against the real env blob.
 */
import { isFeatureEnabled, __parseFlagsForTest } from '@/core/services/featureFlags';

describe('featureFlags — parseFlags', () => {
  it('parses key:value pairs into booleans', () => {
    const flags = __parseFlagsForTest('cloud_sync:false,widget_support:true');
    expect(flags.cloud_sync).toBe(false);
    expect(flags.widget_support).toBe(true);
  });

  it('treats only the literal "true" as enabled', () => {
    const flags = __parseFlagsForTest('a:true,b:false,c:TRUE,d:1,e:yes');
    expect(flags.a).toBe(true);
    expect(flags.b).toBe(false);
    expect(flags.c).toBe(false); // case-sensitive: "TRUE" !== "true"
    expect(flags.d).toBe(false);
    expect(flags.e).toBe(false);
  });

  it('tolerates surrounding whitespace in keys and values', () => {
    const flags = __parseFlagsForTest(' cloud_sync : true , widget_support:false ');
    expect(flags.cloud_sync).toBe(true);
    expect(flags.widget_support).toBe(false);
  });

  it('skips malformed segments without throwing', () => {
    expect(() => __parseFlagsForTest('cloud_sync,:,widget_support:true,,')).not.toThrow();
    const flags = __parseFlagsForTest('cloud_sync,:,widget_support:true,,');
    expect(flags.cloud_sync).toBeUndefined(); // no colon → skipped
    expect(flags.widget_support).toBe(true);
  });
});

describe('featureFlags — isFeatureEnabled', () => {
  it('returns false for unknown flags', () => {
    expect(isFeatureEnabled('definitely_not_a_flag')).toBe(false);
  });

  it('pins the dark-ship default: cloud_sync is OFF in the current env', () => {
    // Guards against accidentally enabling cloud backup before it is productized.
    expect(isFeatureEnabled('cloud_sync')).toBe(false);
    expect(isFeatureEnabled('emergency_sync')).toBe(false);
    expect(isFeatureEnabled('cross_device_sync')).toBe(false);
  });
});
