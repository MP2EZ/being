/**
 * FEAT-285 — cue catalog totality.
 *
 * The catalog is the single review surface for what each vibration MEANS. The
 * point of these tests is not to pin particular waveforms — it is to make it
 * impossible to ship a cue that is only half-mapped, e.g. one that has an iOS
 * primitive but silently no-ops on Android, or one whose meaning was never
 * written down and so was never reviewed.
 */

import {
  PRACTICE_CUES,
  CUE_CATALOG,
  HAPTIC_PRIMITIVES,
  primitiveFor,
  meaningFor,
  type PracticeCue,
} from '@/features/practices/shared/haptics/cueCatalog';

describe('cue catalog totality', () => {
  it('maps every declared cue', () => {
    for (const cue of PRACTICE_CUES) {
      expect(CUE_CATALOG[cue]).toBeDefined();
    }
  });

  it('declares every mapped cue (no orphan entries the app can never emit)', () => {
    expect(new Set(Object.keys(CUE_CATALOG))).toEqual(new Set(PRACTICE_CUES));
  });

  it('gives every cue BOTH an iOS and an Android primitive', () => {
    for (const cue of PRACTICE_CUES) {
      expect(HAPTIC_PRIMITIVES).toContain(CUE_CATALOG[cue].ios);
      expect(HAPTIC_PRIMITIVES).toContain(CUE_CATALOG[cue].android);
    }
  });

  it('gives every cue a non-empty meaning', () => {
    for (const cue of PRACTICE_CUES) {
      expect(CUE_CATALOG[cue].meaning.trim().length).toBeGreaterThan(0);
    }
  });

  it('reports an IDENTICAL meaning on both platforms', () => {
    for (const cue of PRACTICE_CUES) {
      expect(meaningFor(cue, 'ios')).toBe(meaningFor(cue, 'android'));
    }
  });

  it('has no duplicate cue names', () => {
    expect(new Set(PRACTICE_CUES).size).toBe(PRACTICE_CUES.length);
  });
});

describe('primitiveFor', () => {
  it('selects the platform-appropriate primitive', () => {
    expect(primitiveFor('inhale', 'ios')).toBe(CUE_CATALOG.inhale.ios);
    expect(primitiveFor('inhale', 'android')).toBe(CUE_CATALOG.inhale.android);
  });

  it('resolves a primitive for every cue on every platform', () => {
    for (const cue of PRACTICE_CUES) {
      for (const platform of ['ios', 'android'] as const) {
        expect(primitiveFor(cue, platform)).toBeTruthy();
      }
    }
  });
});

describe('cue semantics required by the work item', () => {
  it('contrasts inhale against exhale rather than repeating one primitive', () => {
    expect(CUE_CATALOG.inhale.ios).not.toBe(CUE_CATALOG.exhale.ios);
    expect(CUE_CATALOG.inhale.android).not.toBe(CUE_CATALOG.exhale.android);
  });

  it('uses ONE identical cue for every body-scan region transition', () => {
    // The item explicitly rejects a per-region signature: a practitioner should
    // not have to decode which region they are in, only that it changed.
    const cues = PRACTICE_CUES.filter((c) => c.startsWith('region'));
    expect(cues).toEqual(['regionTransition']);
  });

  it('uses ONE identical interval cue with no escalation', () => {
    // No distinct halfway / near-end pattern — an escalating cue turns a timer
    // into a countdown, which is the opposite of resting into the practice.
    const cues = PRACTICE_CUES.filter((c) => c.startsWith('interval'));
    expect(cues).toEqual(['intervalTick']);
  });

  it('marks session end distinctly from any in-session cue', () => {
    const inSession = PRACTICE_CUES.filter((c) => c !== 'sessionEnd').map(
      (c) => CUE_CATALOG[c].ios
    );
    expect(inSession).not.toContain(CUE_CATALOG.sessionEnd.ios);
  });
});

describe('catalog shape is frozen against accidental mutation', () => {
  it('does not let a caller rewrite a cue at runtime', () => {
    const before = CUE_CATALOG.inhale;
    try {
      // @ts-expect-error — deliberately violating the readonly contract.
      CUE_CATALOG.inhale = { ios: 'impactHeavy', android: 'impactHeavy', meaning: 'x' };
    } catch {
      // Strict mode throws; sloppy mode silently discards. Either is acceptable
      // — what matters is that the catalog is unchanged afterwards.
    }
    expect(CUE_CATALOG.inhale).toBe(before);
    expect(CUE_CATALOG.inhale.ios).toBe('impactLight');
  });

  it('does not let a caller mutate an individual cue definition', () => {
    try {
      // @ts-expect-error — deliberately violating the readonly contract.
      CUE_CATALOG.exhale.ios = 'impactHeavy';
    } catch {
      /* see above */
    }
    expect(CUE_CATALOG.exhale.ios).toBe('impactMedium');
  });

  it('exposes the cue list as a readonly tuple', () => {
    expect(Object.isFrozen(PRACTICE_CUES)).toBe(true);
  });
});

describe('type surface', () => {
  it('accepts a PracticeCue where one is required', () => {
    const cue: PracticeCue = 'sessionStart';
    expect(PRACTICE_CUES).toContain(cue);
  });
});
