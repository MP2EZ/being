/**
 * `educationStore` never writes storage (DEBUG-672; was FEAT-667's Art. 9 write gate).
 *
 * The store wrote `@education:state` as plaintext AsyncStorage and never read it
 * back, so persistence served no user and held `practiceCount` — ruled Art. 9 by
 * FEAT-667 — unencrypted at rest. Compliance ruled it removed outright (data
 * minimisation) rather than moved to encrypted storage. That meets FEAT-667's
 * founder ruling strictly: the count is never written, under any consent state,
 * while memory still counts. The legacy key is purged at launch and on erasure.
 *
 * The dormant-setter pin: crisis ruled `optOutFlags` a protective safety
 * preference that must ALWAYS persist. It has no writer today, so the rule binds
 * a revival — and with no write site left in the store, the ratchet in
 * `wellnessWriteSites.privacy.test.ts` would flag a new one as unlisted. Reviving
 * any of these setters needs a NEW persistence path, ungated for the opt-out, and a
 * fresh crisis/compliance pass.
 *
 * `.privacy.` so the `Safety + privacy gates` CI job runs it (INFRA-368).
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import type { SeededWellnessWriteConsent } from '../helpers/wellnessWriteConsent';

const mockStorage: Record<string, string> = {};
const mockCounts = { writes: 0 };

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockCounts.writes += 1;
      mockStorage[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockStorage[key];
    }),
  },
}));

type EducationModule = typeof import('@/features/learn/stores/educationStore');
let education: EducationModule;
let seed: (state: SeededWellnessWriteConsent) => void;

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  mockCounts.writes = 0;
  jest.resetModules();
  education = require('@/features/learn/stores/educationStore');
  seed = require('../helpers/wellnessWriteConsent').seedWellnessWriteConsent;
});

describe('educationStore never writes storage', () => {
  // Every mutator the store exposes, including the dormant ones: a write from any of
  // them is the defect, whoever calls it.
  const MUTATORS: ReadonlyArray<readonly [name: string, run: () => void]> = [
    ['setModuleStatus', () => education.useEducationStore.getState().setModuleStatus('aware-presence', 'completed')],
    ['completeSection', () => education.useEducationStore.getState().completeSection('aware-presence', 'introduction')],
    ['incrementPracticeCount', () => education.useEducationStore.getState().incrementPracticeCount('aware-presence')],
    ['setDevelopmentalStage', () => education.useEducationStore.getState().setDevelopmentalStage('aware-presence', 'integrated')],
    ['saveReflection', () => education.useEducationStore.getState().saveReflection('aware-presence', 'entry-1')],
    ['addOptOut', () => education.useEducationStore.getState().addOptOut('aware-presence', 'flag')],
    ['removeOptOut', () => education.useEducationStore.getState().removeOptOut('aware-presence', 'flag')],
    ['setCurrentModule', () => education.useEducationStore.getState().setCurrentModule('aware-presence')],
    ['resetModule', () => education.useEducationStore.getState().resetModule('aware-presence')],
    ['dismissInsightTip', () => education.useEducationStore.getState().dismissInsightTip('principle-engagement-beginner')],
  ];
  const STATES: SeededWellnessWriteConsent[] = ['granted', 'refused', 'revoked', 'under_age', 'missing', 'loading'];

  it.each(STATES)('%s: no mutator writes anything', async (state) => {
    seed(state);
    for (const [, run] of MUTATORS) run();
    await flush();
    expect(mockCounts.writes).toBe(0);
    expect(mockStorage).toEqual({});
  });

  it('memory still counts — the store works in-session', async () => {
    seed('granted');
    const store = education.useEducationStore;
    store.getState().incrementPracticeCount('aware-presence');
    store.getState().incrementPracticeCount('aware-presence');
    store.getState().completeSection('aware-presence', 'introduction');
    await flush();
    expect(store.getState().modules['aware-presence'].practiceCount).toBe(2);
    expect(store.getState().modules['aware-presence'].completedSections).toEqual(['introduction']);
    expect(mockCounts.writes).toBe(0);
  });

  it('exposes no persistence entry point to revive', () => {
    const state = education.useEducationStore.getState() as unknown as Record<string, unknown>;
    expect(state.persistState).toBeUndefined();
    expect(state.loadState).toBeUndefined();
    expect((education as unknown as Record<string, unknown>).initializeEducationStore).toBeUndefined();
  });

  it('the write counter still fires (DEBUG-390)', async () => {
    // Prove the mock counts a write, or every zero above is vacuous.
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('probe', 'x');
    expect(mockCounts.writes).toBe(1);
    expect(MUTATORS.length).toBeGreaterThanOrEqual(10);
  });
});

describe('the Art. 9-shaped setters stay dormant', () => {
  const APP = join(__dirname, '../..');
  const DORMANT = /\b(?:addOptOut|removeOptOut|saveReflection|setDevelopmentalStage)\b/;
  // The store defines them and the type file declares them; neither is a caller.
  const OWNERS = new Set([
    'src/features/learn/stores/educationStore.ts',
    'src/features/learn/types/education.ts',
  ]);

  const stripComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        return name === '__tests__' || name === '__mocks__' ? [] : sourceFiles(full);
      }
      return /\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) ? [full] : [];
    });

  it('the matcher fires on the store that defines them', () => {
    const store = join(APP, 'src/features/learn/stores/educationStore.ts');
    expect(stripComments(readFileSync(store, 'utf8'))).toMatch(DORMANT);
  });

  it('no production file reads or calls them', () => {
    const files = [...sourceFiles(join(APP, 'src')), join(APP, 'App.tsx')];
    expect(files.length).toBeGreaterThan(100);
    const callers = files
      .filter((file) => !OWNERS.has(relative(APP, file)))
      .filter((file) => DORMANT.test(stripComments(readFileSync(file, 'utf8'))))
      .map((file) => relative(APP, file));
    expect(callers).toEqual([]);
  });
});
