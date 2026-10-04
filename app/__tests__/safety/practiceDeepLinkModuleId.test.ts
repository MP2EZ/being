/**
 * DEBUG-695 — a practice deep link's moduleId is validated at the parse.
 *
 * `being://practice/<id>?moduleId=…` is externally reachable. The parse used to sanitise
 * moduleId to alphanumerics and hyphens and pass anything through, so `constructor` or
 * `bogus` reached usePracticeCompletion, where it crashed or corrupted the stores. The
 * parse is the single choke point for links; it now returns undefined for anything that
 * is not an authored module id. (An ABSENT key never reaches parse at all, which is why
 * the hook re-checks: practiceCompletionModuleId.contract.test.tsx.)
 *
 * Driven through React Navigation's resolver as linking.ts wires it, against the real
 * `linkingConfig.config`, with consent granted so the link is not held at the legal gate.
 */

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `being://${path.replace(/^\//, '')}`),
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
}));

import { linkingConfig } from '@/core/navigation/linking';
import { seedWellnessWriteConsent } from '../helpers/wellnessWriteConsent';
import { useConsentStore } from '@/core/stores/consentStore';

type NavState = { routes: { name: string; params?: Record<string, unknown>; state?: NavState }[] };

const resolve = (path: string) =>
  (linkingConfig.getStateFromPath as NonNullable<typeof linkingConfig.getStateFromPath>)(
    path,
    linkingConfig.config,
  ) as NavState | undefined;

function practiceParams(path: string): Record<string, unknown> {
  const queue: NavState[] = [];
  const root = resolve(path);
  if (root) queue.push(root);
  while (queue.length) {
    const state = queue.shift()!;
    for (const route of state.routes) {
      if (route.name === 'PracticeTimer') return route.params ?? {};
      if (route.state) queue.push(route.state);
    }
  }
  throw new Error(`no PracticeTimer route for ${path}`);
}

const BASE = 'practice/acceptance-shift?duration=10&title=Acceptance+Shift';
const PROTOTYPE_KEYS = Object.getOwnPropertyNames(Object.prototype).filter((k) => /^[a-zA-Z0-9-]+$/.test(k));
const VALID = [
  'aware-presence',
  'radical-acceptance',
  'sphere-sovereignty',
  'virtuous-response',
  'interconnected-living',
];

beforeEach(() => {
  seedWellnessWriteConsent('granted');
  useConsentStore.setState({
    consentCache: { ...useConsentStore.getState().consentCache, ageVerified: true, isEligible: true },
  });
});

describe('practice/:practiceId moduleId parse (DEBUG-695)', () => {
  it('control: the route resolves and keeps its other params', () => {
    const params = practiceParams(`${BASE}&moduleId=radical-acceptance`);
    expect(params.practiceId).toBe('acceptance-shift');
    expect(params.duration).toBe(10);
  });

  it('an absent moduleId stays absent', () => {
    expect(practiceParams(BASE).moduleId).toBeUndefined();
  });

  it.each(['bogus', 'Aware-Presence', ...PROTOTYPE_KEYS])('%s → undefined', (id) => {
    expect(PROTOTYPE_KEYS.length).toBeGreaterThan(5);
    expect(practiceParams(`${BASE}&moduleId=${id}`).moduleId).toBeUndefined();
  });

  it.each(VALID)('%s passes through', (id) => {
    expect(practiceParams(`${BASE}&moduleId=${id}`).moduleId).toBe(id);
  });
});
