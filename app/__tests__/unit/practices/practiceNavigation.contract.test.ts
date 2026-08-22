/**
 * FEAT-293 CONTRACT — standalone practice discoverability.
 *
 * AC3 of FEAT-293 is "no regression to existing Learn-launched entry points",
 * and before this work item that AC had NO mechanical pin whatsoever: zero tests
 * in the repo referenced PracticeTab or the launch switch it owned. Promoting
 * the practices to a second entry point without pinning the first is exactly how
 * the regression would have arrived unnoticed.
 *
 * The launch switch is now the pure `resolvePracticeRoute`, shared by Learn and
 * the new Practice Library. These cases lock its output to what the original
 * inline switch produced, param for param — including the default durations,
 * which were previously magic numbers inside PracticeTab.
 *
 * Also pins two philosopher constraints that would otherwise degrade silently:
 * the drill's citation must resolve to Epictetus (not fall back to the breathing
 * quote), and every catalog entry must be filed under its OWN principle.
 */

import { resolvePracticeRoute } from '@/features/practices/catalog/practiceNavigation';
import {
  STANDALONE_PRACTICES,
  FEATURED_PRACTICE,
} from '@/features/practices/catalog/standalonePractices';
import { PRACTICE_QUOTES } from '@/features/learn/practices/PracticeCompletionScreen';
import type { ModuleId, Practice } from '@/features/learn/types/education';

const MODULE: ModuleId = 'sphere-sovereignty';

const practice = (over: Partial<Practice>): Practice =>
  ({
    id: 'p1',
    title: 'A Practice',
    description: 'A description',
    type: 'guided-timer',
    ...over,
  }) as Practice;

describe('FEAT-293 — Learn launch contract (AC3 regression pin)', () => {
  it('guided-timer → PracticeTimer, preserving the 180s default', () => {
    const { screen, params } = resolvePracticeRoute(
      practice({ id: 'breathing-space', type: 'guided-timer', title: 'Breathing' }),
      MODULE
    );
    expect(screen).toBe('PracticeTimer');
    expect(params).toEqual({
      practiceId: 'breathing-space',
      moduleId: MODULE,
      duration: 180,
      title: 'Breathing',
    });
  });

  it('body-scan → BodyScan, preserving the 300s default', () => {
    const { screen, params } = resolvePracticeRoute(
      practice({ id: 'body-scan', type: 'body-scan' }),
      MODULE
    );
    expect(screen).toBe('BodyScan');
    expect(params).toMatchObject({ duration: 300 });
  });

  it('reflection → ReflectionTimer, mapping description→prompt and passing instructions', () => {
    const { screen, params } = resolvePracticeRoute(
      practice({
        id: 'reserve-clause',
        type: 'reflection',
        description: 'Reflect on this',
        instructions: ['one', 'two'],
        duration: 240,
      }),
      MODULE
    );
    expect(screen).toBe('ReflectionTimer');
    expect(params).toMatchObject({
      prompt: 'Reflect on this',
      instructions: ['one', 'two'],
      duration: 240,
    });
  });

  it('omits `instructions` entirely when the practice has none', () => {
    // exactOptionalPropertyTypes is on; passing `instructions: undefined` is a
    // different thing from omitting it, and the original switch omitted it.
    const { params } = resolvePracticeRoute(
      practice({ type: 'reflection', description: 'x' }),
      MODULE
    );
    expect(params).not.toHaveProperty('instructions');
  });

  it('guided-body-scan → GuidedBodyScan', () => {
    const { screen } = resolvePracticeRoute(
      practice({ type: 'guided-body-scan' }),
      MODULE
    );
    expect(screen).toBe('GuidedBodyScan');
  });

  it('an unknown type still falls back to the timer, as the original switch did', () => {
    const { screen, params } = resolvePracticeRoute(
      practice({ type: 'not-a-real-type' as Practice['type'] }),
      MODULE
    );
    expect(screen).toBe('PracticeTimer');
    expect(params).toMatchObject({ duration: 180 });
  });

  it('honours an authored duration over the default', () => {
    const { params } = resolvePracticeRoute(
      practice({ type: 'guided-timer', duration: 480 }),
      MODULE
    );
    expect(params).toMatchObject({ duration: 480 });
  });
});

describe('FEAT-293 — sorting launches from BOTH entry points', () => {
  it('passes Learn’s already-loaded scenarios straight through', () => {
    const scenarios = [{ id: 's1' }, { id: 's2' }] as never;
    const { screen, params } = resolvePracticeRoute(
      practice({ id: 'control-sorting', type: 'sorting', scenarios }),
      MODULE
    );
    expect(screen).toBe('SortingPractice');
    expect(params).toMatchObject({ scenarios });
  });

  it('OMITS scenarios when the caller has none, so the screen self-loads', () => {
    // The library and the /sorting deep link cannot supply an array. Before
    // FEAT-293 the switch bailed out with a console.warn and navigated nowhere,
    // which is why that deep link never worked.
    const { screen, params } = resolvePracticeRoute(
      practice({ id: 'control-sorting', type: 'sorting' }),
      MODULE
    );
    expect(screen).toBe('SortingPractice');
    expect(params).not.toHaveProperty('scenarios');
    expect(params).toMatchObject({ practiceId: 'control-sorting', moduleId: MODULE });
  });

  it('treats an empty scenarios array as "not supplied"', () => {
    const { params } = resolvePracticeRoute(
      practice({ type: 'sorting', scenarios: [] as never }),
      MODULE
    );
    expect(params).not.toHaveProperty('scenarios');
  });
});

describe('FEAT-293 — philosopher constraints on the promoted surface', () => {
  it('the drill’s citation resolves to Epictetus, NOT the breathing fallback', () => {
    // usePracticeCompletion falls back to PRACTICE_QUOTES['breathing-space'] for
    // an unknown practiceId. On a Stoic drill that silent fallback would be a
    // citation error, so it must fail here rather than degrade quietly.
    const quote = PRACTICE_QUOTES[FEATURED_PRACTICE.practiceId];
    expect(quote).toBeDefined();
    expect(quote?.author).toBe('Epictetus');
    expect(quote?.source).toBe('Enchiridion 1');
    expect(quote).not.toEqual(PRACTICE_QUOTES['breathing-space']);
  });

  it('files every catalog entry under its OWN principle', () => {
    // Breathing and body scan are the Aware Presence limb and must never be
    // presented as classical Stoic technique; the reserve clause is
    // hypexhairesis and belongs to Sphere Sovereignty. Filing a practice under a
    // principle it does not belong to would assert a false principle→practice
    // mapping on a surface users read as canonical — and would propagate into
    // the Insights principle-engagement chart.
    const PRINCIPLE_FOR_MODULE: Record<string, string> = {
      'aware-presence': 'aware_presence',
      'radical-acceptance': 'radical_acceptance',
      'sphere-sovereignty': 'sphere_sovereignty',
      'virtuous-response': 'virtuous_response',
      'interconnected-living': 'interconnected_living',
    };

    for (const ref of STANDALONE_PRACTICES) {
      expect(ref.principleKey).toBe(PRINCIPLE_FOR_MODULE[ref.moduleId]);
    }
  });

  it('features the sorting drill, and features it exactly once', () => {
    expect(FEATURED_PRACTICE.practiceId).toBe('control-sorting');
    const occurrences = STANDALONE_PRACTICES.filter(
      (p) => p.practiceId === FEATURED_PRACTICE.practiceId
    );
    expect(occurrences).toHaveLength(1);
  });
});
