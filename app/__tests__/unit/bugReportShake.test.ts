/**
 * FEAT-284 shake-to-report — shake-detection math.
 *
 * Two separable pure pieces, and the split is the point:
 *   • `isShake`      — single-sample magnitude test.
 *   • `isShakeBurst` — the rolling-window crossing counter that turns a
 *                      sequence of crossings into a decision.
 *
 * DEBUG-533 raised the threshold AND added the burst requirement. A
 * single-sample test cannot distinguish a deliberate shake from a pocket-pull:
 * at rest the vector magnitude is already ~1g, so the old 1.8 asked for 0.8g of
 * net acceleration in one instantaneous reading, sampled at 5Hz. Raising the
 * threshold alone is not the fix — a hard enough single jolt clears any
 * threshold you pick — so the consecutive-crossing requirement is the
 * load-bearing half and is tested as such.
 */

import {
  isShake,
  isShakeBurst,
  recentCrossings,
} from '@/core/hooks/useBugReportShake';

describe('isShake — single-sample crossing test', () => {
  it('does not trigger at rest (~1g on a single axis)', () => {
    expect(isShake({ x: 0, y: 0, z: 1 })).toBe(false);
    expect(isShake({ x: 0.1, y: -0.2, z: 0.98 })).toBe(false);
  });

  it('does not trigger on ordinary handling that cleared the old 1.8 bar', () => {
    // DEBUG-533 regression cases. Both are magnitudes a pocket-pull or a
    // phone set down on a hard table reaches; both fired before this change.
    expect(isShake({ x: 1.5, y: 1.5, z: 1.5 })).toBe(false); // ~2.598
    expect(isShake({ x: 2.2, y: 0, z: 0 })).toBe(false); // 2.2
  });

  it('triggers on a hard shake (magnitude well above threshold)', () => {
    expect(isShake({ x: 2, y: 2, z: 1 })).toBe(true); // 3.0
    expect(isShake({ x: 3.2, y: 0, z: 0 })).toBe(true);
  });

  it('respects a custom threshold', () => {
    expect(isShake({ x: 1, y: 1, z: 1 }, 2)).toBe(false); // magnitude ~1.73
    expect(isShake({ x: 1, y: 1, z: 1 }, 1.5)).toBe(true);
  });
});

describe('recentCrossings — rolling-window prune', () => {
  it('keeps crossings inside the window and drops the rest', () => {
    expect(recentCrossings([100, 500, 900], 1000)).toEqual([100, 500, 900]);
    expect(recentCrossings([0, 500, 900], 1500)).toEqual([500, 900]);
  });

  it('is inclusive at exactly the window edge', () => {
    // A burst spanning the full window must still count as one burst.
    expect(recentCrossings([500], 1500)).toEqual([500]);
    expect(recentCrossings([499], 1500)).toEqual([]);
  });

  it('returns a new array rather than mutating its input', () => {
    const input = [0, 900];
    const out = recentCrossings(input, 1000);
    out.push(1000);
    expect(input).toEqual([0, 900]);
  });

  it('honours a custom window', () => {
    expect(recentCrossings([100, 400], 500, 200)).toEqual([400]);
  });
});

describe('isShakeBurst — the discrimination that thresholding cannot do', () => {
  it('does not fire on a single jolt, however hard', () => {
    // The whole point: one crossing is a car bump, a drop, a pocket-pull.
    expect(isShakeBurst([1000], 1000)).toBe(false);
  });

  it('does not fire on two crossings inside the window', () => {
    expect(isShakeBurst([800, 1000], 1000)).toBe(false);
  });

  it('fires on three crossings inside the window', () => {
    expect(isShakeBurst([600, 800, 1000], 1000)).toBe(true);
  });

  it('does not fire when three crossings are spread beyond the window', () => {
    // Same count, spread over 3s — walking, not shaking.
    expect(isShakeBurst([0, 1500, 3000], 3000)).toBe(false);
  });

  it('counts a deliberate shake, which produces many crossings', () => {
    const burst = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    expect(isShakeBurst(burst, 1000)).toBe(true);
  });

  it('honours custom crossing and window parameters', () => {
    expect(isShakeBurst([900, 1000], 1000, 2)).toBe(true);
    expect(isShakeBurst([600, 800, 1000], 1000, 3, 300)).toBe(false);
  });
});
