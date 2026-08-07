/**
 * Loving-kindness presentation + practice deep-link contract (DEBUG-353)
 *
 * TWO DEFECTS, one screen.
 *
 * 1. LOVING-KINDNESS RENDERED BREATHING-SPACE COPY. `PracticeTimerScreen`
 *    hardcoded "Find a comfortable position. Follow the breathing circle and
 *    let your breath find its natural rhythm.", and EVERY `guided-timer`
 *    practice resolves to that screen — so someone selecting Loving-Kindness was
 *    guided through breath work for the whole 8-minute session. The nine metta
 *    steps were already authored in `module-5-interconnected-living.json`;
 *    nothing read them, because `resolvePracticeRoute`'s guided-timer branch
 *    did not forward `instructions` the way its `reflection` branch already did.
 *    `visualMode: 'contemplative'` was likewise authored and read by nothing —
 *    it was absent from the `Practice` interface entirely.
 *
 *    The philosopher ruling is that suppressing the breathing circle is NOT
 *    optional: a breath-paced animation entrains respiration and re-anchors
 *    attention on the breath, which contradicts a directed-intention practice
 *    whose object of attention is a person. Shipping correct metta copy beside
 *    a breathing circle would be a visible contradiction.
 *
 * 2. THE PRACTICE DEEP LINK BUILT A TIMER THAT COULD NEVER COMPLETE.
 *    `linking.ts` already ships sanitisers for `duration` (clamp 10..3600,
 *    default 60) and `title` (strip `<>`, truncate 100) — but
 *    `DEEP_LINK_CONFIG.ALLOWED_PARAMS` stripped both keys BEFORE navigation, so
 *    those sanitisers were unreachable. `being://practice/<anything>` therefore
 *    reached the screen with `duration: undefined`, and `duration * 1000` is
 *    `NaN`: the timer's `remaining <= 0` never became true, so it ran forever
 *    and never completed. Allowing the two keys activates the sanitisers that
 *    were written for exactly this case.
 *
 *    Deliberately the MINIMAL fix. A larger narrowing (a validating launcher
 *    route, removing PracticeTimer from the linking config) was considered and
 *    rejected: the path is already consent-gated by INFRA-308, it hangs rather
 *    than crashes, and it affects exactly one practice.
 *
 * NON-NEGOTIABLE: nothing on this path may throw. `ErrorBoundary.tsx` has zero
 * importers, so there is NO error boundary above the practice screens, and
 * `RootCrisisButton` renders as a sibling in the same tree — a render throw is a
 * remotely-triggerable white-screen that takes the 988 affordance with it
 * (DEBUG-344). Every branch here degrades instead.
 */

import { readFileSync } from 'fs';
import { join, resolve } from 'path';

import { resolvePracticeRoute } from '@/features/practices/catalog/practiceNavigation';
import { DEEP_LINK_CONFIG } from '@/core/services/security/DeepLinkValidationService';
import type { Practice } from '@/features/learn/types/education';

const MODULES_DIR = resolve(__dirname, '../../../assets/modules');

const loadModule = (file: string) =>
  JSON.parse(readFileSync(join(MODULES_DIR, file), 'utf8'));

const findPractice = (file: string, id: string): Practice => {
  const practice = (loadModule(file).practices ?? []).find(
    (p: Practice) => p.id === id
  );
  if (!practice) throw new Error(`practice ${id} not found in ${file}`);
  return practice;
};

describe('loving-kindness presentation (DEBUG-353)', () => {
  describe('authored content the screen depends on', () => {
    it('loving-kindness declares contemplative visualMode and carries its steps', () => {
      const p = findPractice('module-5-interconnected-living.json', 'loving-kindness');

      expect(p.type).toBe('guided-timer');
      expect(p.visualMode).toBe('contemplative');
      // Nine metta steps across the session. If this shrinks to one, the
      // stepped presentation silently degrades to an unguided timer.
      expect(p.instructions?.length).toBeGreaterThanOrEqual(2);
      expect(p.duration).toBeGreaterThan(0);
    });

    it('breathing-space still declares the breathing visualMode', () => {
      // Guards the "byte-identical for breathing-space" requirement: if this
      // flips or disappears, the circle silently vanishes from breath work.
      const p = findPractice('module-1-aware-presence.json', 'breathing-space');
      expect(p.visualMode).toBe('breathing');
    });

    it('no authored instruction step tells a contemplative practice to follow the breath', () => {
      const p = findPractice('module-5-interconnected-living.json', 'loving-kindness');
      const joined = (p.instructions ?? []).join(' ');
      expect(joined).not.toMatch(/breathing circle/i);
      expect(joined).not.toMatch(/natural rhythm/i);
    });
  });

  describe('resolvePracticeRoute forwards what the screen needs', () => {
    it('guided-timer carries instructions and visualMode through to the route', () => {
      const p = findPractice('module-5-interconnected-living.json', 'loving-kindness');
      const route = resolvePracticeRoute(p, 'interconnected-living');

      expect(route.screen).toBe('PracticeTimer');
      expect(route.params).toMatchObject({
        practiceId: 'loving-kindness',
        visualMode: 'contemplative',
      });
      expect((route.params as { instructions?: string[] }).instructions).toEqual(
        p.instructions
      );
      // The params the route type requires must still be satisfied.
      expect(typeof (route.params as { duration?: number }).duration).toBe('number');
      expect(typeof (route.params as { title?: string }).title).toBe('string');
    });

    it('omits both keys for a practice that authors neither', () => {
      // Absent rather than explicitly undefined — tsconfig sets
      // exactOptionalPropertyTypes, so an explicit undefined is a type error
      // at the call site, not an equivalent.
      const bare: Practice = {
        id: 'x',
        title: 'X',
        description: 'd',
        type: 'guided-timer',
        duration: 120,
      };
      const params = resolvePracticeRoute(bare, 'aware-presence').params as Record<
        string,
        unknown
      >;

      expect('instructions' in params).toBe(false);
      expect('visualMode' in params).toBe(false);
    });

    it('breathing-space resolves without a visualMode override to contemplative', () => {
      const p = findPractice('module-1-aware-presence.json', 'breathing-space');
      const params = resolvePracticeRoute(p, 'aware-presence').params as Record<
        string,
        unknown
      >;
      expect(params.visualMode).not.toBe('contemplative');
    });
  });

  describe('practice deep link can no longer build an unsatisfiable timer', () => {
    it('allows the duration and title params the PracticeTimer route requires', () => {
      const allowed = DEEP_LINK_CONFIG.ALLOWED_PARAMS as readonly string[];
      expect(allowed).toContain('duration');
      expect(allowed).toContain('title');
    });

    it('still allows only the known param set (no blanket passthrough)', () => {
      // The fix widens the allowlist by exactly two keys. If this list grows
      // silently, arbitrary URL params reach a wellness screen.
      expect([...DEEP_LINK_CONFIG.ALLOWED_PARAMS].sort()).toEqual(
        [
          'duration',
          'moduleId',
          'practiceId',
          'source',
          'title',
          'utm_campaign',
          'utm_medium',
          'utm_source',
        ].sort()
      );
    });

    it('linking.ts sanitises both newly-allowed params rather than passing them raw', () => {
      // These sanitisers already existed and were unreachable. Pin that they are
      // still present, so allowing the keys never becomes a raw passthrough.
      const linking = readFileSync(
        resolve(__dirname, '../../../src/core/navigation/linking.ts'),
        'utf8'
      );
      const practiceBlock = linking.slice(
        linking.indexOf('PracticeTimer: {'),
        linking.indexOf('ReflectionTimer')
      );

      expect(practiceBlock).toContain('duration:');
      expect(practiceBlock).toContain('title:');
      // Clamp + default for duration; NaN must not survive.
      expect(practiceBlock).toMatch(/isNaN\(num\)\s*\?\s*60/);
      expect(practiceBlock).toMatch(/Math\.min\(Math\.max\(num/);
      // Title is stripped of angle brackets and truncated.
      expect(practiceBlock).toMatch(/replace\(\/\[<>\]\/g, ''\)/);
    });
  });
});
