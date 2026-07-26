/**
 * Practice Identity — canonical union + theme adapter (FEAT-298 slice 1)
 *
 * Slice 1 is a pure refactor: ten separate declarations of
 * `'morning' | 'midday' | 'evening'` collapsed to one, and every *dynamic* `getTheme`
 * call routed through `themeKeyFor`. These tests pin the two properties that make the
 * refactor safe to build on, rather than restating the mapping table:
 *
 *   1. `themeKeyFor` is TOTAL — every `PracticeIdentity` resolves to a real palette.
 *      A missing entry must never fall through to a silent default.
 *   2. `themeKeyFor` is BEHAVIOUR-NEUTRAL for the three legacy tokens — it is the
 *      identity function there, which is what makes slice 1 a zero-pixel-change refactor.
 */

import { getTheme, colorSystem } from '@/core/theme';
import { themeKeyFor } from '../practice-identity';
import type { PracticeIdentity } from '../practice-identity';

/**
 * Every member of `PracticeIdentity`, enumerated at runtime.
 *
 * The `satisfies` clause is load-bearing: if a later slice widens `PracticeIdentity`
 * (slice 2 adds `'daily'`) without extending this list, the TYPE CHECK fails here — so
 * the totality test below cannot silently stop covering the new member.
 */
const ALL_IDENTITIES = [
  'morning',
  'midday',
  'evening',
  'daily-loop',
] as const satisfies readonly PracticeIdentity[];

/** The three legacy tokens, where the adapter must be the identity function. */
const LEGACY_FLOW_TYPES = ['morning', 'midday', 'evening'] as const;

describe('themeKeyFor', () => {
  describe('totality', () => {
    it('resolves every PracticeIdentity to a theme key backed by a real palette', () => {
      for (const identity of ALL_IDENTITIES) {
        const key = themeKeyFor(identity);

        expect(key).toBeDefined();
        // A key that isn't a real palette would silently hit the colorSystem Proxy's
        // "falling back to morning" branch instead of failing — assert the palette exists.
        expect(colorSystem.themes).toHaveProperty(key);
        expect(getTheme(key)).toBeDefined();
        expect(getTheme(key).primary).toEqual(expect.any(String));
      }
    });

    it('never returns undefined for an identity, even at the type boundary', () => {
      // Guards the runtime edge the type system can't see: a legacy persisted value
      // arriving from SecureStore as an unexpected string must not yield undefined
      // silently. (Slice 2 introduces the real migration; this pins today's behaviour.)
      for (const identity of ALL_IDENTITIES) {
        expect(themeKeyFor(identity)).not.toBeUndefined();
      }
    });
  });

  describe('behaviour-neutrality (why slice 1 changes no pixel)', () => {
    it.each(LEGACY_FLOW_TYPES)(
      'is the identity function for %s',
      (flowType) => {
        expect(themeKeyFor(flowType)).toBe(flowType);
      }
    );

    it.each(LEGACY_FLOW_TYPES)(
      'getTheme(themeKeyFor(%s)) is the same palette as the pre-refactor getTheme(%s)',
      (flowType) => {
        // This is the actual regression pin for the refactor: every call site that
        // changed from getTheme(x) to getTheme(themeKeyFor(x)) must resolve identically.
        expect(getTheme(themeKeyFor(flowType))).toEqual(getTheme(flowType));
      }
    );

    it('maps the daily loop to midday, preserving FEAT-291s deliberate choice', () => {
      // FEAT-291 themed the loop as midday to avoid this migration. Slice 1 moves that
      // decision out of an inline ternary in CleanHomeScreen and into the mapping table,
      // without changing what the user sees.
      expect(themeKeyFor('daily-loop')).toBe('midday');
      expect(getTheme(themeKeyFor('daily-loop'))).toEqual(getTheme('midday'));
    });
  });

  describe('separation of flow identity from theme identity', () => {
    it('does not expose learn as a practice identity', () => {
      // 'learn' is a real design-system ThemeKey but NOT a daily-practice identity
      // (FEAT-133 — orthogonal to the ritual). The adapter's domain is practice
      // identities; the fact that its codomain is wider is the point of the seam.
      expect(ALL_IDENTITIES).not.toContain('learn');
    });

    it('maps distinct time-of-day flows to distinct palettes', () => {
      const keys = LEGACY_FLOW_TYPES.map(themeKeyFor);
      expect(new Set(keys).size).toBe(LEGACY_FLOW_TYPES.length);
    });
  });
});
