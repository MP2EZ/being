/**
 * FEAT-285 — DEFAULT_PATTERN is a shared contract, not a coincidence.
 *
 * `PracticeTimerScreen` renders BreathingCircle with no `pattern` prop and
 * builds its haptic schedule from the same exported constant. If someone later
 * changes the component's default without thinking about cues — or reverts the
 * export and leaves a copied literal behind at the call site — the vibrations
 * would keep firing on the old rhythm while the circle animated on the new one.
 * Nothing else in the suite would notice, because both halves would still be
 * internally consistent.
 */

import { DEFAULT_PATTERN } from '@/features/practices/shared/breathingPatterns';
import {
  cycleDurationMs,
  boundariesWithin,
} from '@/features/practices/shared/haptics/phaseAtElapsed';

describe('DEFAULT_PATTERN', () => {
  it('is exported so cue schedules can be built from it', () => {
    expect(DEFAULT_PATTERN).toBeDefined();
    expect(typeof DEFAULT_PATTERN.inhale).toBe('number');
    expect(typeof DEFAULT_PATTERN.exhale).toBe('number');
  });

  it('is the 4-4 pattern the engine assumes', () => {
    expect(DEFAULT_PATTERN).toEqual({ inhale: 4000, exhale: 4000 });
  });

  it('has an 8-second cue cycle', () => {
    // MAINT-391 deleted the hold engine and its 100 ms inter-cycle gap, so the
    // pair of assertions that used to live here — "no hold phase" and "cycle is
    // NOT 8000 + gap" — are now enforced by the type rather than at runtime.
    // `BreathingPattern` has no `hold` to set and `phaseAtElapsed` has no gap to
    // add, so both are unwritable, not merely unnecessary.
    expect(cycleDurationMs(DEFAULT_PATTERN)).toBe(8000);
  });
});

describe('cue schedule built from the default', () => {
  it('alternates inhale and exhale every 4 seconds', () => {
    const cues = boundariesWithin(DEFAULT_PATTERN, 20_000);

    expect(cues.map((c) => c.atMs)).toEqual([0, 4000, 8000, 12_000, 16_000]);
    expect(cues.map((c) => c.phase)).toEqual([
      'inhale', 'exhale', 'inhale', 'exhale', 'inhale',
    ]);
  });

  it('stays comfortably inside the throttle floor for a 5-minute session', () => {
    // 4000ms between boundaries against a 500ms floor — no legitimate cue is
    // ever at risk of being throttled on this pattern.
    const cues = boundariesWithin(DEFAULT_PATTERN, 300_000);
    for (let i = 1; i < cues.length; i += 1) {
      expect(cues[i].atMs - cues[i - 1].atMs).toBe(4000);
    }
  });
});
