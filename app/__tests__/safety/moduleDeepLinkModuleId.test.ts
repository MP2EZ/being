/**
 * DEBUG-719 — a module deep link's moduleId is validated at the parse.
 *
 * `being://module/<id>` is externally reachable. The parse used to sanitise the id to
 * alphanumerics and hyphens and pass anything through, so `constructor` reached
 * ModuleDetailScreen, where moduleContent.ts's plain-object cache answered with `Object`
 * and the screen wrote the junk id into educationStore. The parse is the single choke
 * point for links; it now returns undefined for anything that is not an authored module
 * id, and the screen renders its failed-load state. The `/practice` sibling is DEBUG-695
 * (practiceDeepLinkModuleId.test.ts).
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

type Route = { name: string; params?: Record<string, unknown>; state?: NavState };
type NavState = { routes: Route[] };

const resolve = (path: string) =>
  (linkingConfig.getStateFromPath as NonNullable<typeof linkingConfig.getStateFromPath>)(
    path,
    linkingConfig.config,
  ) as NavState | undefined;

function findRoute(path: string, name: string): Route | undefined {
  const queue: NavState[] = [];
  const root = resolve(path);
  if (root) queue.push(root);
  while (queue.length) {
    const state = queue.shift()!;
    for (const route of state.routes) {
      if (route.name === name) return route;
      if (route.state) queue.push(route.state);
    }
  }
  return undefined;
}

function moduleParams(path: string): Record<string, unknown> {
  const route = findRoute(path, 'ModuleDetail');
  if (!route) throw new Error(`no ModuleDetail route for ${path}`);
  return route.params ?? {};
}

const SANITISER_ALPHABET = /^[a-zA-Z0-9-]+$/;
const PROTOTYPE_KEYS = Object.getOwnPropertyNames(Object.prototype).filter((k) =>
  SANITISER_ALPHABET.test(k),
);
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

describe('module/:moduleId parse (DEBUG-719)', () => {
  it('control: the crisis link still resolves to CrisisResources', () => {
    expect(findRoute('crisis', 'CrisisResources')).toBeDefined();
  });

  it('control: the prototype-key sweep is non-empty and includes constructor', () => {
    expect(PROTOTYPE_KEYS.length).toBeGreaterThan(5);
    expect(PROTOTYPE_KEYS).toContain('constructor');
  });

  it.each(VALID)('%s passes through', (id) => {
    expect(moduleParams(`module/${id}`).moduleId).toBe(id);
  });

  it.each([
    'bogus',
    'Aware-Presence',
    'AWARE-PRESENCE',
    'aware-Presence',
    ...PROTOTYPE_KEYS,
    // Raw keys outside the sanitiser alphabet: the sanitiser strips them to `proto` /
    // `defineGetter`, which must still be refused.
    '__proto__',
    '__defineGetter__',
  ])('%s → ModuleDetail with moduleId undefined, no throw', (id) => {
    let params: Record<string, unknown> = {};
    expect(() => {
      params = moduleParams(`module/${encodeURIComponent(id)}`);
    }).not.toThrow();
    expect(params.moduleId).toBeUndefined();
  });

  it.each(['module', 'module/'])('%s resolves no ModuleDetail route and does not throw', (path) => {
    expect(() => resolve(path)).not.toThrow();
    expect(findRoute(path, 'ModuleDetail')).toBeUndefined();
  });

  it('a query moduleId cannot override a valid path id with a prototype key', () => {
    expect(moduleParams('module/aware-presence?moduleId=constructor').moduleId).toBeUndefined();
  });
});
