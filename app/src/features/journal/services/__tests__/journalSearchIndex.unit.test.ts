/**
 * journalSearchIndex — unit specs (FEAT-530 slice A, AC #1-#5)
 *
 * Storage is an in-memory fake with fault injection, because the properties
 * under test are ORDERING properties (queue, epoch) and FAILURE properties
 * (a rejected write is never a false miss). The cost of the real crypto path is
 * pinned separately in `journalSearchIndex.derivations.unit.test.ts`.
 */

const mockDisk = new Map<string, string>();
const mockFaults: {
  beforeStore: null | ((key: string) => Promise<void> | void);
  failStore: (key: string) => boolean;
  failRetrieve: (key: string) => boolean;
  failDelete: (key: string) => boolean;
} = {
  beforeStore: null,
  failStore: () => false,
  failRetrieve: () => false,
  failDelete: () => false,
};

jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
      if (mockFaults.beforeStore) await mockFaults.beforeStore(key);
      if (mockFaults.failStore(key)) return { success: false };
      mockDisk.set(key, JSON.stringify(data));
      return { success: true };
    }),
    retrieveWellnessBlob: jest.fn(async (key: string) => {
      if (mockFaults.failRetrieve(key)) throw new Error('boom');
      const raw = mockDisk.get(key);
      return raw === undefined ? null : JSON.parse(raw);
    }),
    deleteWellnessBlob: jest.fn(async (key: string) => {
      if (mockFaults.failDelete(key)) throw new Error('boom');
      mockDisk.delete(key);
    }),
    listWellnessBlobKeys: jest.fn(async (prefix: string) =>
      [...mockDisk.keys()].filter((k) => k.startsWith(prefix))
    ),
  },
}));

import SecureStorageService from '@/core/services/security/SecureStorageService';

import {
  SHARD_BUDGET_BYTES,
  SHARD_KEY_PREFIX,
  buildSearchIndex,
  ensureSearchIndex,
  gatherSearchIndexForExport,
  getSearchIndexCompleteness,
  indexEntryAfterSave,
  querySearchIndex,
  removeEntryFromSearchIndex,
  resetSearchIndexForErasure,
  type JournalIndexSource,
} from '../journalSearchIndex';
import { buildTermRow } from '../journalSearchTerms';

const store = SecureStorageService as unknown as {
  storeWellnessBlob: jest.Mock;
  retrieveWellnessBlob: jest.Mock;
  deleteWellnessBlob: jest.Mock;
  listWellnessBlobKeys: jest.Mock;
};

function makeSource(texts: Record<string, string>): JournalIndexSource & {
  readText: jest.Mock;
  listIds: jest.Mock;
} {
  return {
    listIds: jest.fn(async () => Object.keys(texts)),
    readText: jest.fn(async (id: string) => (id in texts ? texts[id] : null)),
  };
}

const shardKeys = () => [...mockDisk.keys()].filter((k) => k.startsWith(SHARD_KEY_PREFIX));
const utf8 = (s: string) => new TextEncoder().encode(s).length;
const disk = () => JSON.stringify([...mockDisk.entries()]);

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  mockDisk.clear();
  mockFaults.beforeStore = null;
  mockFaults.failStore = () => false;
  mockFaults.failRetrieve = () => false;
  mockFaults.failDelete = () => false;
  jest.clearAllMocks();
  resetSearchIndexForErasure();
});

describe('what is persisted (AC #1)', () => {
  const texts = {
    a: 'A quiet Café morning, breathe breathe breathe',
    b: 'Stoic calm at work',
  };

  it('writes shard 0 through storeWellnessBlob at the assessment sensitivity', async () => {
    await buildSearchIndex(makeSource(texts));

    expect(shardKeys()).toEqual(['voice_journal_search_0']);
    const [key, , sensitivity] = store.storeWellnessBlob.mock.calls.at(-1)!;
    expect(key).toBe('voice_journal_search_0');
    expect(sensitivity).toBe('level_2_assessment_data');
  });

  it('persists rows of exactly { entryId, terms }, terms unique and sorted', async () => {
    await buildSearchIndex(makeSource(texts));

    const { rows } = JSON.parse(mockDisk.get('voice_journal_search_0')!);
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(Object.keys(row)).toEqual(['entryId', 'terms']);
    const a = rows.find((r: { entryId: string }) => r.entryId === 'a');
    expect(a.terms).toEqual(['a', 'breathe', 'cafe', 'morning', 'quiet']);
  });

  it('matches "caf" against "Café" and requires every prefix ("stoic cal")', async () => {
    await buildSearchIndex(makeSource({ ...texts, c: 'stoic but not the other word' }));
    const live = ['a', 'b', 'c'];

    const cafe = await querySearchIndex('caf', live);
    expect(cafe).toEqual({ status: 'ok', ids: new Set(['a']) });
    const both = await querySearchIndex('stoic cal', live);
    expect(both).toEqual({ status: 'ok', ids: new Set(['b']) });
  });

  it('builds an empty journal as built-and-empty: export [] (never null)', async () => {
    await expect(gatherSearchIndexForExport()).resolves.toBeNull();
    await expect(buildSearchIndex(makeSource({}))).resolves.toBe('complete');
    expect(shardKeys()).toEqual(['voice_journal_search_0']);
    await expect(gatherSearchIndexForExport()).resolves.toEqual([]);
  });
});

describe('shard packing (AC #3)', () => {
  const distinct = (n: number, tag: string) =>
    Array.from({ length: n }, (_, i) => `${tag}${i.toString(36).padStart(6, '0')}`).join(' ');

  it('keeps every shard within SHARD_BUDGET_BYTES of serialised plaintext, measured in UTF-8 bytes', async () => {
    const texts: Record<string, string> = {};
    for (let i = 0; i < 30; i += 1) texts[`e${i}`] = distinct(2500, `t${i}x`);
    await buildSearchIndex(makeSource(texts));

    expect(shardKeys().length).toBeGreaterThan(1);
    for (const key of shardKeys()) {
      const { rows } = JSON.parse(mockDisk.get(key)!);
      expect(utf8(JSON.stringify(rows))).toBeLessThanOrEqual(SHARD_BUDGET_BYTES);
    }
    const live = Object.keys(texts);
    await expect(getSearchIndexCompleteness(live)).resolves.toBe('complete');
  });

  it('measures bytes, not string length: multibyte terms still fit', async () => {
    // 3-byte code points: .length understates the payload by 3x.
    const texts: Record<string, string> = {};
    for (let i = 0; i < 12; i += 1) {
      texts[`m${i}`] = Array.from({ length: 4000 }, (_, j) =>
        String.fromCodePoint(0x4e00 + ((i * 4000 + j) % 20000)) + 'x'
      ).join(' ');
    }
    await buildSearchIndex(makeSource(texts));

    expect(shardKeys().length).toBeGreaterThan(1);
    for (const key of shardKeys()) {
      const { rows } = JSON.parse(mockDisk.get(key)!);
      expect(utf8(JSON.stringify(rows))).toBeLessThanOrEqual(SHARD_BUDGET_BYTES);
    }
  });

  it('splits one oversize entry across successive shards and the query unions per entryId', async () => {
    const text = distinct(30000, 'w');
    await buildSearchIndex(makeSource({ big: text }));

    const holding = shardKeys().filter((k) =>
      JSON.parse(mockDisk.get(k)!).rows.some((r: { entryId: string }) => r.entryId === 'big')
    );
    expect(holding.length).toBeGreaterThan(1);

    // First and last term live in different pieces; AND still matches.
    const last = `w${(29999).toString(36).padStart(6, '0')}`;
    const res = await querySearchIndex(`w000000 ${last}`, ['big']);
    expect(res).toEqual({ status: 'ok', ids: new Set(['big']) });
  });

  it('exports a split entry as ONE row with its full sorted term list', async () => {
    const text = distinct(30000, 'w');
    await buildSearchIndex(makeSource({ big: text }));

    const exported = await gatherSearchIndexForExport();
    expect(exported).toHaveLength(1);
    expect(exported![0]).toEqual(buildTermRow('big', text));
  });

  it('gives an entry with no words a row anyway, so its id counts as indexed', async () => {
    await buildSearchIndex(makeSource({ dots: '🙂 ... 🙂', real: 'steady' }));

    await expect(getSearchIndexCompleteness(['dots', 'real'])).resolves.toBe('complete');
    const res = await querySearchIndex('steady', ['dots', 'real']);
    expect(res).toEqual({ status: 'ok', ids: new Set(['real']) });
  });
});

describe('the serialised queue (AC #4)', () => {
  it('lands two concurrent saves', async () => {
    const texts = { a: 'first text', b: 'second text' };
    await buildSearchIndex(makeSource({}));
    const source = makeSource(texts);

    await Promise.all([
      indexEntryAfterSave(source, { id: 'a', text: texts.a }, { replacing: false }),
      indexEntryAfterSave(source, { id: 'b', text: texts.b }, { replacing: false }),
    ]);

    const exported = await gatherSearchIndexForExport();
    expect(exported!.map((r) => r.entryId).sort()).toEqual(['a', 'b']);
  });

  it('replaces, never unions, when an id is saved again', async () => {
    const source = makeSource({ a: 'alpha beta' });
    await buildSearchIndex(source);

    const edited = makeSource({ a: 'alpha gamma' });
    await indexEntryAfterSave(edited, { id: 'a', text: 'alpha gamma' }, { replacing: true });

    const exported = await gatherSearchIndexForExport();
    expect(exported).toEqual([{ entryId: 'a', terms: ['alpha', 'gamma'] }]);
    expect(disk()).not.toContain('beta');
  });

  it('is a no-op while the index is unbuilt (lazy creation): nothing is written', async () => {
    const source = makeSource({ a: 'alpha' });
    await indexEntryAfterSave(source, { id: 'a', text: 'alpha' }, { replacing: false });

    expect(store.storeWellnessBlob).not.toHaveBeenCalled();
    expect(shardKeys()).toEqual([]);
  });

  it('skips an id that is no longer in the live list (the save/delete race)', async () => {
    await buildSearchIndex(makeSource({ keep: 'stays here' }));
    const afterDelete = makeSource({ keep: 'stays here' }); // X already deleted

    await indexEntryAfterSave(
      afterDelete,
      { id: 'x', text: 'secretword' },
      { replacing: false }
    );

    expect(disk()).not.toContain('secretword');
    // Positive control: the index is live, and holds only the surviving entry.
    expect((await gatherSearchIndexForExport())!.map((r) => r.entryId)).toEqual(['keep']);
  });

  it('never rejects, even when the shard write throws', async () => {
    await buildSearchIndex(makeSource({}));
    store.storeWellnessBlob.mockRejectedValueOnce(new Error('disk full'));

    await expect(
      indexEntryAfterSave(makeSource({ a: 'alpha' }), { id: 'a', text: 'alpha' }, { replacing: false })
    ).resolves.toBeUndefined();
  });
});

describe('removal (AC #4)', () => {
  it('removes every row of the entry and leaves the others', async () => {
    await buildSearchIndex(makeSource({ a: 'alphaword', b: 'betaword' }));

    await removeEntryFromSearchIndex('a');

    expect(disk()).not.toContain('alphaword');
    expect(disk()).toContain('betaword');
    expect(await gatherSearchIndexForExport()).toEqual([{ entryId: 'b', terms: ['betaword'] }]);
  });

  it('drops the row from the in-memory cache without re-reading disk', async () => {
    await buildSearchIndex(makeSource({ a: 'alphaword', b: 'betaword' }));
    await removeEntryFromSearchIndex('a');
    store.retrieveWellnessBlob.mockClear();

    expect(await gatherSearchIndexForExport()).toEqual([{ entryId: 'b', terms: ['betaword'] }]);
    expect(store.retrieveWellnessBlob).not.toHaveBeenCalled();
  });

  it('is a no-op for an unbuilt index', async () => {
    await removeEntryFromSearchIndex('a');
    expect(store.storeWellnessBlob).not.toHaveBeenCalled();
  });

  it('when the removal write fails, deletes every shard to force a rebuild', async () => {
    await buildSearchIndex(makeSource({ a: 'alphaword', b: 'betaword' }));
    mockFaults.failStore = (key) => key.startsWith(SHARD_KEY_PREFIX);

    await removeEntryFromSearchIndex('a');

    expect(shardKeys()).toEqual([]);
    expect(disk()).not.toContain('alphaword');
    await expect(getSearchIndexCompleteness(['b'])).resolves.toBe('needs-build');
  });

  it('when the removal write AND the shard delete both fail, never throws (residual is the sweep)', async () => {
    await buildSearchIndex(makeSource({ a: 'alphaword' }));
    mockFaults.failStore = () => true;
    mockFaults.failDelete = () => true;

    await expect(removeEntryFromSearchIndex('a')).resolves.toBeUndefined();
    // The residual: the old shard bytes are still on disk. The membership filter
    // (a deleted id is not live) hides them and clearAllWellnessData sweeps them.
    expect(shardKeys()).toEqual(['voice_journal_search_0']);
  });
});

describe('completeness (AC #2)', () => {
  it('is needs-build before any build', async () => {
    await expect(getSearchIndexCompleteness(['a'])).resolves.toBe('needs-build');
    await expect(getSearchIndexCompleteness([])).resolves.toBe('needs-build');
  });

  it('is complete when the id sets are equal', async () => {
    await buildSearchIndex(makeSource({ a: 'alpha', b: 'beta' }));
    await expect(getSearchIndexCompleteness(['b', 'a'])).resolves.toBe('complete');
  });

  it('needs a build after a failed save-time write: never a false miss', async () => {
    await buildSearchIndex(makeSource({ a: 'alpha' }));
    mockFaults.failStore = () => true;
    await indexEntryAfterSave(
      makeSource({ a: 'alpha', b: 'needleword' }),
      { id: 'b', text: 'needleword' },
      { replacing: false }
    );
    mockFaults.failStore = () => false;

    const res = await querySearchIndex('needleword', ['a', 'b']);
    expect(res).toEqual({ status: 'needs-build' });
  });

  it('needs a build when the index holds an id that is no longer live', async () => {
    await buildSearchIndex(makeSource({ a: 'alpha', gone: 'goneword' }));
    await expect(getSearchIndexCompleteness(['a'])).resolves.toBe('needs-build');
  });

  it('needs a build when shard 0 is absent but a later shard exists', async () => {
    await buildSearchIndex(makeSource({ a: 'alpha' }));
    mockDisk.set('voice_journal_search_3', mockDisk.get('voice_journal_search_0')!);
    mockDisk.delete('voice_journal_search_0');
    resetSearchIndexForErasure();

    await expect(getSearchIndexCompleteness(['a'])).resolves.toBe('needs-build');
  });

  it('is unavailable (not a miss) when a shard cannot be read', async () => {
    await buildSearchIndex(makeSource({ a: 'alpha' }));
    resetSearchIndexForErasure();
    mockFaults.failRetrieve = () => true;

    await expect(getSearchIndexCompleteness(['a'])).resolves.toBe('unavailable');
    expect(await querySearchIndex('alpha', ['a'])).toEqual({ status: 'unavailable' });
  });

  it('is unavailable when a shard holds something that is not rows', async () => {
    await buildSearchIndex(makeSource({ a: 'alpha' }));
    mockDisk.set('voice_journal_search_0', JSON.stringify({ rows: [{ entryId: 1 }] }));
    resetSearchIndexForErasure();

    await expect(getSearchIndexCompleteness(['a'])).resolves.toBe('unavailable');
  });
});

describe('ensure and build (AC #2)', () => {
  it('ensure adds the missing ids and prunes the stale ones', async () => {
    await buildSearchIndex(makeSource({ a: 'alphaword', gone: 'goneword' }));
    const source = makeSource({ a: 'alphaword', b: 'betaword' });

    await expect(ensureSearchIndex(source)).resolves.toBe('complete');

    expect(source.readText.mock.calls.map(([id]) => id)).toEqual(['b']);
    await expect(getSearchIndexCompleteness(['a', 'b'])).resolves.toBe('complete');
    expect(disk()).not.toContain('goneword');
  });

  it('ensure on an unbuilt index does nothing (build is the only creator)', async () => {
    const source = makeSource({ a: 'alpha' });
    await expect(ensureSearchIndex(source)).resolves.toBe('not-built');
    expect(store.storeWellnessBlob).not.toHaveBeenCalled();
    expect(source.readText).not.toHaveBeenCalled();
  });

  it('build indexes one entry at a time, reading text before the next', async () => {
    const order: string[] = [];
    const source = makeSource({ a: 'alpha', b: 'beta', c: 'gamma' });
    source.readText.mockImplementation(async (id: string) => {
      order.push(`start:${id}`);
      await Promise.resolve();
      order.push(`end:${id}`);
      return id;
    });

    await buildSearchIndex(source);

    expect(order).toEqual(['start:a', 'end:a', 'start:b', 'end:b', 'start:c', 'end:c']);
  });

  it('concurrent calls share ONE in-flight job', async () => {
    const source = makeSource({ a: 'alpha', b: 'beta', c: 'gamma' });

    const [first, second] = await Promise.all([buildSearchIndex(source), buildSearchIndex(source)]);

    expect([first, second]).toEqual(['complete', 'complete']);
    expect(source.readText).toHaveBeenCalledTimes(3);
  });

  it('a build joined by ensure and an ensure joined by build both finish', async () => {
    const source = makeSource({ a: 'alpha', b: 'beta' });
    const results = await Promise.all([ensureSearchIndex(source), buildSearchIndex(source)]);
    expect(results[1]).toBe('complete');
    await expect(getSearchIndexCompleteness(['a', 'b'])).resolves.toBe('complete');
  });

  it('is resumable after the caller goes away: stops at an entry boundary, a second call finishes', async () => {
    const source = makeSource({ a: 'alpha', b: 'beta', c: 'gamma' });
    let go = true;
    source.readText.mockImplementation(async (id: string) => {
      go = false; // the screen unmounts after the first entry has been read
      return `${id}word`;
    });

    await expect(buildSearchIndex(source, { shouldContinue: () => go })).resolves.toBe('interrupted');
    expect(source.readText).toHaveBeenCalledTimes(1);
    await expect(getSearchIndexCompleteness(['a', 'b', 'c'])).resolves.toBe('needs-build');

    source.readText.mockImplementation(async (id: string) => `${id}word`);
    await expect(buildSearchIndex(source)).resolves.toBe('complete');

    // Only the two remaining ids were read the second time.
    expect(source.readText).toHaveBeenCalledTimes(3);
    await expect(getSearchIndexCompleteness(['a', 'b', 'c'])).resolves.toBe('complete');
  });

  it('keeps going while any joined caller still wants it', async () => {
    const source = makeSource({ a: 'alpha', b: 'beta', c: 'gamma' });
    const gone = () => false;

    const [x, y] = await Promise.all([
      buildSearchIndex(source, { shouldContinue: gone }),
      buildSearchIndex(source, { shouldContinue: () => true }),
    ]);

    expect([x, y]).toEqual(['complete', 'complete']);
  });

  it('does not resurrect an entry deleted while the build was reading it', async () => {
    const gate = deferred();
    const source = makeSource({ a: 'alphaword', b: 'betaword' });
    source.readText.mockImplementation(async (id: string) => {
      if (id === 'b') await gate.promise;
      return `${id}word`;
    });

    const building = buildSearchIndex(source);
    await new Promise((r) => setImmediate(r));
    await removeEntryFromSearchIndex('b'); // b is deleted mid-read
    gate.resolve();
    await building;

    expect(disk()).not.toContain('bword');
    expect(disk()).toContain('aword'); // positive control: the other entry was indexed
  });

  it('a build over an unreadable shard starts the index again instead of staying unavailable', async () => {
    await buildSearchIndex(makeSource({ a: 'alpha' }));
    resetSearchIndexForErasure();
    mockDisk.set('voice_journal_search_0', 'not json');

    await expect(buildSearchIndex(makeSource({ a: 'alpha' }))).resolves.toBe('complete');
    await expect(getSearchIndexCompleteness(['a'])).resolves.toBe('complete');
  });

  it('reports failed when a flush fails, and the next call can try again', async () => {
    mockFaults.failStore = () => true;
    await expect(buildSearchIndex(makeSource({ a: 'alpha' }))).resolves.toBe('failed');
    mockFaults.failStore = () => false;
    await expect(buildSearchIndex(makeSource({ a: 'alpha' }))).resolves.toBe('complete');
  });
});

describe('the erasure epoch (AC #5)', () => {
  it('a bump while a job is queued but has not written makes it write nothing', async () => {
    await buildSearchIndex(makeSource({}));
    store.storeWellnessBlob.mockClear();
    const gate = deferred();
    const source = makeSource({ a: 'secretword' });
    source.listIds.mockImplementation(async () => {
      await gate.promise;
      return ['a'];
    });

    const job = indexEntryAfterSave(source, { id: 'a', text: 'secretword' }, { replacing: false });
    await new Promise((r) => setImmediate(r));
    resetSearchIndexForErasure();
    gate.resolve();
    await job;

    expect(store.storeWellnessBlob).not.toHaveBeenCalled();
    expect(disk()).not.toContain('secretword');
  });

  it('a bump during an in-flight write deletes the key afterwards', async () => {
    await buildSearchIndex(makeSource({}));
    store.storeWellnessBlob.mockClear();
    const entered = deferred();
    const gate = deferred();
    mockFaults.beforeStore = async () => {
      entered.resolve();
      await gate.promise;
    };

    const job = indexEntryAfterSave(
      makeSource({ a: 'secretword' }),
      { id: 'a', text: 'secretword' },
      { replacing: false }
    );
    await entered.promise;
    resetSearchIndexForErasure(); // erasure fires while the write is in flight
    gate.resolve();
    await job;

    expect(store.storeWellnessBlob).toHaveBeenCalledTimes(1);
    expect(store.deleteWellnessBlob).toHaveBeenCalledWith('voice_journal_search_0');
    expect(disk()).not.toContain('secretword');
  });

  it('a bump behind a queued job stops the job queued after it too', async () => {
    await buildSearchIndex(makeSource({}));
    store.storeWellnessBlob.mockClear();
    const entered = deferred();
    const gate = deferred();
    mockFaults.beforeStore = async () => {
      entered.resolve();
      await gate.promise;
    };
    const s = makeSource({ a: 'firstword', b: 'secondword' });

    const first = indexEntryAfterSave(s, { id: 'a', text: 'firstword' }, { replacing: false });
    const second = indexEntryAfterSave(s, { id: 'b', text: 'secondword' }, { replacing: false });
    await entered.promise;
    resetSearchIndexForErasure();
    gate.resolve();
    await Promise.all([first, second]);

    expect(store.storeWellnessBlob).toHaveBeenCalledTimes(1);
    expect(disk()).not.toContain('secondword');
    expect(disk()).not.toContain('firstword');
  });

  it('a build interrupted by erasure writes nothing more', async () => {
    const source = makeSource({ a: 'alpha', b: 'beta', c: 'gamma' });
    source.readText.mockImplementation(async (id: string) => {
      if (id === 'a') resetSearchIndexForErasure();
      return `${id}word`;
    });

    await expect(buildSearchIndex(source)).resolves.toBe('interrupted');
    expect(disk()).not.toContain('bword');
    expect(disk()).not.toContain('cword');
  });

  it('after a reset the module reloads from disk (cache dropped)', async () => {
    await buildSearchIndex(makeSource({ a: 'alpha' }));
    store.retrieveWellnessBlob.mockClear();
    resetSearchIndexForErasure();

    await getSearchIndexCompleteness(['a']);
    expect(store.retrieveWellnessBlob).toHaveBeenCalledTimes(1);
  });
});

describe('querySearchIndex (AC #1)', () => {
  it('answers empty-query before anything else, even for an unbuilt index', async () => {
    for (const q of ['', '   ', '\n\t', '...', '?! --']) {
      expect(await querySearchIndex(q, ['a'])).toEqual({ status: 'empty-query' });
    }
  });

  it('answers needs-build for an unbuilt index', async () => {
    expect(await querySearchIndex('alpha', ['a'])).toEqual({ status: 'needs-build' });
  });

  it('returns an unordered Set of ids: no array, no count field', async () => {
    await buildSearchIndex(makeSource({ a: 'alpha one', b: 'alpha two' }));

    const res = await querySearchIndex('alp', ['a', 'b']);
    if (res.status !== 'ok') throw new Error('expected ok');
    expect(res.ids).toBeInstanceOf(Set);
    expect(Array.isArray(res.ids)).toBe(false);
    expect(Object.keys(res)).toEqual(['status', 'ids']);
  });

  it('matches by prefix, not by substring', async () => {
    await buildSearchIndex(makeSource({ a: 'a calm day', b: 'I recall the day' }));

    const res = await querySearchIndex('cal', ['a', 'b']);
    expect(res).toEqual({ status: 'ok', ids: new Set(['a']) });
  });

  it('finds no one when nothing matches: an empty Set, not "all entries"', async () => {
    await buildSearchIndex(makeSource({ a: 'alpha' }));
    expect(await querySearchIndex('zzz', ['a'])).toEqual({ status: 'ok', ids: new Set() });
  });

  it('only ever reads shard keys: it never reaches an entry body', async () => {
    const source = makeSource({ a: 'alpha', b: 'beta' });
    await buildSearchIndex(source);
    resetSearchIndexForErasure();
    source.readText.mockClear();
    store.retrieveWellnessBlob.mockClear();

    await querySearchIndex('alp', ['a', 'b']);

    expect(source.readText).not.toHaveBeenCalled();
    expect(source.listIds).toHaveBeenCalledTimes(1); // the build's own
    for (const [key] of store.retrieveWellnessBlob.mock.calls) {
      expect(String(key).startsWith(SHARD_KEY_PREFIX)).toBe(true);
    }
  });

  it('applies the same normaliser to the query as to the index ("CAFÉ")', async () => {
    await buildSearchIndex(makeSource({ a: 'a café visit' }));
    expect(await querySearchIndex('CAFÉ', ['a'])).toEqual({ status: 'ok', ids: new Set(['a']) });
  });
});
