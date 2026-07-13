/**
 * FEAT-284 shake-to-report — pure shake-detection math.
 *
 * At rest the accelerometer vector magnitude is ~1g (gravity); a deliberate
 * shake spikes well past the threshold. This pins that a gentle hold does NOT
 * trigger and a hard shake does.
 */

import { isShake } from '@/core/hooks/useBugReportShake';

describe('isShake', () => {
  it('does not trigger at rest (~1g on a single axis)', () => {
    expect(isShake({ x: 0, y: 0, z: 1 })).toBe(false);
    expect(isShake({ x: 0.1, y: -0.2, z: 0.98 })).toBe(false);
  });

  it('triggers on a hard shake (magnitude well above threshold)', () => {
    expect(isShake({ x: 1.5, y: 1.5, z: 1.5 })).toBe(true);
    expect(isShake({ x: 2.2, y: 0, z: 0 })).toBe(true);
  });

  it('respects a custom threshold', () => {
    expect(isShake({ x: 1, y: 1, z: 1 }, 2)).toBe(false); // magnitude ~1.73
    expect(isShake({ x: 1, y: 1, z: 1 }, 1.5)).toBe(true);
  });
});
