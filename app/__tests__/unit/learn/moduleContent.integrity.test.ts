/**
 * MAINT-747 — module content integrity.
 *
 * Every authored module loads through the real loader and satisfies the loader's own
 * contract; bad content is refused and never cached; the three id lists in the codebase
 * (getAllModuleIds, the authored-id table, MODULE_TO_PRINCIPLE_MAP) and the JSON files on
 * disk stay in step.
 *
 * The prototype-key / unauthored-id sweep lives in moduleContentInvalidId.test.ts (DEBUG-719)
 * and is deliberately not repeated here.
 */

import fs from 'fs';
import path from 'path';

import { clearContentCache, getAllModuleIds, loadModuleContent } from '@/core/services/moduleContent';
import { isModuleId, type ModuleContent, type ModuleId } from '@/features/learn/types/education';
import { MODULE_TO_PRINCIPLE_MAP } from '@/features/learn/utils/principleMapping';

const MODULES_DIR = path.resolve(__dirname, '../../../assets/modules');
const EDUCATION_TYPES = path.resolve(__dirname, '../../../src/features/learn/types/education.ts');
// The require path loadModuleFromAssets uses for this module, relative to this file.
const AWARE_PRESENCE_JSON = '../../../assets/modules/module-1-aware-presence.json';

const jsonFiles = fs.readdirSync(MODULES_DIR).filter((f) => f.endsWith('.json'));
const readModuleJson = (file: string): ModuleContent =>
  JSON.parse(fs.readFileSync(path.join(MODULES_DIR, file), 'utf8')) as ModuleContent;

/** Strip block and line comments so prose naming a key cannot satisfy a source match. */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('loadModuleContent — every authored module', () => {
  beforeEach(() => {
    clearContentCache();
  });

  it('control: there is at least one module to sweep', () => {
    expect(getAllModuleIds().length).toBeGreaterThan(0);
  });

  it.each(getAllModuleIds())('%s resolves with its own id and at least one practice', async (id) => {
    const content = await loadModuleContent(id);
    expect(content.id).toBe(id);
    expect(content.practices.length).toBeGreaterThan(0);
  });
});

describe('loadModuleContent — bad content and the cache', () => {
  // ONE stable object: the loader requires the JSON lazily (at call time, after
  // isolateModules has returned), and jest caches the factory's result for the
  // outer registry. A per-test object would be ignored from the second test on.
  const mockContent: Record<string, unknown> = {};
  let loader: typeof import('@/core/services/moduleContent');
  let errorSpy: jest.SpyInstance;

  beforeAll(() => {
    jest.doMock(AWARE_PRESENCE_JSON, () => mockContent);
  });

  beforeEach(() => {
    for (const key of Object.keys(mockContent)) delete mockContent[key];
    Object.assign(mockContent, readModuleJson('module-1-aware-presence.json'));
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // A fresh loader module (empty cache) per test.
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loader = require('@/core/services/moduleContent');
    });
  });

  afterAll(() => {
    jest.dontMock(AWARE_PRESENCE_JSON);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  /** The loader rethrows a generic message; the validator's reason goes to console.error. */
  const loggedReason = (): string =>
    errorSpy.mock.calls
      .map((call) => call.find((arg) => arg instanceof Error))
      .filter((e): e is Error => e instanceof Error)
      .map((e) => e.message)
      .join(' | ');

  it('control: the unmodified mock resolves', async () => {
    await expect(loader.loadModuleContent('aware-presence')).resolves.toMatchObject({ id: 'aware-presence' });
  });

  it('rejects content that is missing a required field', async () => {
    delete mockContent.whyItMatters;
    await expect(loader.loadModuleContent('aware-presence')).rejects.toThrow(Error);
    expect(loggedReason()).toContain('whyItMatters');
  });

  it('rejects content with an empty practices array', async () => {
    mockContent.practices = [];
    await expect(loader.loadModuleContent('aware-presence')).rejects.toThrow(Error);
    expect(loggedReason()).toContain('at least one practice');
  });

  it('does not cache a rejection: fixing the content makes the next load resolve', async () => {
    const goodPractices = mockContent.practices;
    mockContent.practices = [];
    await expect(loader.loadModuleContent('aware-presence')).rejects.toThrow(Error);

    mockContent.practices = goodPractices;
    await expect(loader.loadModuleContent('aware-presence')).resolves.toMatchObject({ id: 'aware-presence' });
  });

  it('a cache hit skips the reload: breaking the content after a good load still resolves', async () => {
    const first = await loader.loadModuleContent('aware-presence');
    mockContent.practices = [];
    await expect(loader.loadModuleContent('aware-presence')).resolves.toBe(first);
  });

  it('clearContentCache forces a reload', async () => {
    await loader.loadModuleContent('aware-presence');
    mockContent.practices = [];
    loader.clearContentCache();
    await expect(loader.loadModuleContent('aware-presence')).rejects.toThrow(Error);
  });
});

describe('module id lists are in step', () => {
  const loaderIds = [...getAllModuleIds()].sort();

  /** Keys of the (unexported) AUTHORED_MODULE_IDS table, read from source with comments stripped. */
  const authoredTableKeys = (): string[] => {
    const src = stripComments(fs.readFileSync(EDUCATION_TYPES, 'utf8'));
    const block = /AUTHORED_MODULE_IDS[^=]*=\s*\{([\s\S]*?)\}/.exec(src);
    expect(block).not.toBeNull();
    return [...block![1].matchAll(/'([a-z0-9-]+)'\s*:\s*true/g)].map((m) => m[1]).sort();
  };

  it('control: the source slice for the authored table is non-empty', () => {
    expect(authoredTableKeys().length).toBeGreaterThan(0);
  });

  it('getAllModuleIds equals the authored-id table', () => {
    expect(authoredTableKeys()).toEqual(loaderIds);
  });

  it('every loader id is accepted by isModuleId, and nothing else read here is', () => {
    const candidates = new Set<string>([
      ...loaderIds,
      ...Object.keys(MODULE_TO_PRINCIPLE_MAP),
      ...jsonFiles.map((f) => readModuleJson(f).id),
    ]);
    const accepted = [...candidates].filter((c) => isModuleId(c)).sort();
    expect(accepted).toEqual(loaderIds);
  });

  it('getAllModuleIds equals the MODULE_TO_PRINCIPLE_MAP keys', () => {
    expect(Object.keys(MODULE_TO_PRINCIPLE_MAP).sort()).toEqual(loaderIds);
  });

  it('getAllModuleIds equals the ids of the JSON files in assets/modules', () => {
    expect(jsonFiles.length).toBeGreaterThan(0);
    const fileIds: ModuleId[] = jsonFiles.map((f) => readModuleJson(f).id);
    expect([...fileIds].sort()).toEqual(loaderIds);
  });
});
