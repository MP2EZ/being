/**
 * Art. 9 write gate on `@education:state` (FEAT-667, FEAT-318 slice C).
 *
 * Founder ruling 2026-09-29: Learn's `practiceCount` records the same fact as a
 * Learn principle engagement, so it shares that engagement's disposition and is
 * withheld while `decideWellnessWrite()` blocks. The blob is never read back
 * (`initializeEducationStore` has no production caller), so it only ever holds
 * this process's state — once a write is withheld, writes stay off for the rest
 * of the process rather than carry a count the user was told would not be kept.
 *
 * The dormant-setter pin: crisis ruled `optOutFlags` a protective safety
 * preference that must ALWAYS persist. It has no writer today, so the rule binds
 * a revival — and nothing else would notice one, because the write site is
 * already classified in the ratchet. Reviving any of these setters needs a fresh
 * crisis/compliance pass and an ungated write path for the opt-out.
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

const practice = () => education.useEducationStore.getState().incrementPracticeCount('aware-presence');
const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  mockCounts.writes = 0;
  jest.resetModules();
  education = require('@/features/learn/stores/educationStore');
  seed = require('../helpers/wellnessWriteConsent').seedWellnessWriteConsent;
});

describe('the write gate', () => {
  it('granted: practiceCount is written', async () => {
    seed('granted');
    practice();
    await flush();
    expect(mockCounts.writes).toBe(1);
  });

  it.each<SeededWellnessWriteConsent>(['refused', 'revoked', 'under_age', 'missing'])(
    'blocked (%s): nothing is written, but memory still counts',
    async (reason) => {
      seed(reason);
      practice();
      await flush();
      expect(mockCounts.writes).toBe(0);
      expect(education.useEducationStore.getState().modules['aware-presence'].practiceCount).toBe(1);
    },
  );

  it('stays off for the rest of the process once a write is withheld', async () => {
    seed('refused');
    practice();
    seed('granted');
    practice();
    await flush();
    expect(mockCounts.writes).toBe(0);
  });

  it('loading skips without latching', async () => {
    seed('loading');
    practice();
    seed('granted');
    practice();
    await flush();
    expect(mockCounts.writes).toBe(1);
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
