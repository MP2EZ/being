/**
 * journalEntryStore -> search index hooks (FEAT-530 slice A, AC #4)
 *
 * Storage is an in-memory fake with fault injection. The real entry store runs
 * on top of it, so the hooks are exercised exactly where `saveEntry`,
 * `deleteEntry` and `deleteAllEntries` call them.
 */

const mockDisk = new Map<string, string>();
const mockFaults: {
  failShardStore: boolean;
  rejectShardStore: boolean;
  gateShardStore: Promise<void> | null;
  retrieveHook: ((key: string, read: () => unknown) => Promise<unknown>) | null;
} = { failShardStore: false, rejectShardStore: false, gateShardStore: null, retrieveHook: null };

jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
      if (key.startsWith('voice_journal_search_')) {
        if (mockFaults.gateShardStore) await mockFaults.gateShardStore;
        if (mockFaults.rejectShardStore) throw new Error('disk full');
        if (mockFaults.failShardStore) return { success: false };
      }
      mockDisk.set(key, JSON.stringify(data));
      return { success: true };
    }),
    retrieveWellnessBlob: jest.fn(async (key: string) => {
      const read = () => {
        const raw = mockDisk.get(key);
        return raw === undefined ? null : JSON.parse(raw);
      };
      if (mockFaults.retrieveHook) return mockFaults.retrieveHook(key, read);
      return read();
    }),
    deleteWellnessBlob: jest.fn(async (key: string) => {
      mockDisk.delete(key);
    }),
    listWellnessBlobKeys: jest.fn(async (prefix: string) =>
      [...mockDisk.keys()].filter((k) => k.startsWith(prefix))
    ),
  },
}));

import SecureStorageService from '@/core/services/security/SecureStorageService';

import {
  deleteAllEntries,
  deleteEntry,
  journalIndexSource,
  saveEntry,
} from '../journalEntryStore';
import {
  buildSearchIndex,
  gatherSearchIndexForExport,
  getSearchIndexCompleteness,
  querySearchIndex,
  resetSearchIndexForErasure,
} from '../journalSearchIndex';

const store = SecureStorageService as unknown as {
  storeWellnessBlob: jest.Mock;
  retrieveWellnessBlob: jest.Mock;
};

const shardKeys = () => [...mockDisk.keys()].filter((k) => k.startsWith('voice_journal_search_'));
const disk = () => JSON.stringify([...mockDisk.entries()]);
const settle = () => new Promise((r) => setImmediate(r));

async function builtEmpty() {
  await buildSearchIndex(journalIndexSource);
  expect(shardKeys()).toEqual(['voice_journal_search_0']);
}

beforeEach(() => {
  mockDisk.clear();
  mockFaults.failShardStore = false;
  mockFaults.rejectShardStore = false;
  mockFaults.gateShardStore = null;
  mockFaults.retrieveHook = null;
  jest.clearAllMocks();
  resetSearchIndexForErasure();
});

describe('journalIndexSource', () => {
  it('lists ids from the metadata index and reads text from the entry', async () => {
    const a = await saveEntry({ text: 'alpha text' });
    if (!a.saved) throw new Error('save failed');

    expect(await journalIndexSource.listIds()).toEqual([a.entry.id]);
    expect(await journalIndexSource.readText(a.entry.id)).toBe('alpha text');
    expect(await journalIndexSource.readText('missing')).toBeNull();
  });
});

describe('saveEntry -> index', () => {
  it('writes no shard while the index is unbuilt (lazy creation)', async () => {
    await saveEntry({ text: 'alpha text' });
    await settle();

    expect(shardKeys()).toEqual([]);
    const written = store.storeWellnessBlob.mock.calls.map(([k]) => String(k));
    expect(written.every((k) => !k.startsWith('voice_journal_search_'))).toBe(true);
  });

  it('indexes the entry once the index is built', async () => {
    await builtEmpty();

    const saved = await saveEntry({ text: 'Quiet morning, steady breath' });
    if (!saved.saved) throw new Error('save failed');
    await gatherSearchIndexForExport(); // drains the queue behind the fire-and-forget job

    const live = await journalIndexSource.listIds();
    expect(await querySearchIndex('steady', live)).toEqual({
      status: 'ok',
      ids: new Set([saved.entry.id]),
    });
  });

  it('does not await the index job: save resolves while a shard write is still pending', async () => {
    await builtEmpty();
    let release!: () => void;
    mockFaults.gateShardStore = new Promise<void>((r) => {
      release = r;
    });

    const result = await saveEntry({ text: 'alpha text' });

    expect(result.saved).toBe(true); // returned although the shard write is gated
    release();
    await gatherSearchIndexForExport();
  });

  it('keeps SaveResult { saved: true } when the shard write rejects', async () => {
    await builtEmpty();
    mockFaults.rejectShardStore = true;

    const result = await saveEntry({ text: 'alpha text' });
    await settle();

    expect(result.saved).toBe(true);
    if (!result.saved) return;
    expect(result.entry.text).toBe('alpha text');
    expect(Object.keys(result)).toEqual(['saved', 'entry']);
  });

  it('keeps SaveResult { saved: true } when the shard write reports failure', async () => {
    await builtEmpty();
    mockFaults.failShardStore = true;

    const result = await saveEntry({ text: 'alpha text' });
    await settle();

    expect(result.saved).toBe(true);
  });

  it('after a failed index write, the next search says needs-build, never a false miss', async () => {
    await builtEmpty();
    mockFaults.failShardStore = true;
    await saveEntry({ text: 'needleword in here' });
    await gatherSearchIndexForExport().catch(() => null);
    mockFaults.failShardStore = false;

    const live = await journalIndexSource.listIds();
    expect(await querySearchIndex('needleword', live)).toEqual({ status: 'needs-build' });
  });

  it('re-saving an id replaces its words: a removed word is gone', async () => {
    await builtEmpty();
    const first = await saveEntry({ text: 'alpha beta' });
    if (!first.saved) throw new Error('save failed');
    await gatherSearchIndexForExport();

    await saveEntry({ id: first.entry.id, text: 'alpha gamma', createdAt: first.entry.createdAt });
    const exported = await gatherSearchIndexForExport();

    expect(exported).toEqual([{ entryId: first.entry.id, terms: ['alpha', 'gamma'] }]);
    expect(disk()).not.toContain('beta');
  });
});

describe('the save/delete race (AC #4)', () => {
  async function raceWith(snapshotBeforeGate: boolean) {
    await builtEmpty();

    // Hold the index job's listIds (its read of the metadata index) until after the delete.
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let indexReads = 0;
    mockFaults.retrieveHook = async (key, read) => {
      // Read 1 is saveEntry's own readIndex; read 2 is the index job's listIds.
      if (key === 'voice_journal_index' && ++indexReads === 2) {
        const snapshot = snapshotBeforeGate ? read() : undefined;
        await gate;
        return snapshotBeforeGate ? snapshot : read();
      }
      return read();
    };

    const saved = await saveEntry({ text: 'secretword to forget' });
    if (!saved.saved) throw new Error('save failed');
    // The index job is now parked on its listIds. Delete X while it waits, then
    // let the job run late.
    const deleting = deleteEntry(saved.entry.id);
    await settle();
    release();
    await deleting;
    await gatherSearchIndexForExport();
    return saved.entry.id;
  }

  it('late job re-checks the live ids and writes nothing (fresh read)', async () => {
    await raceWith(false);
    expect(disk()).not.toContain('secretword');
  });

  it('late job that saw the entry still live is undone by the removal queued behind it (stale read)', async () => {
    await raceWith(true);
    expect(disk()).not.toContain('secretword');
  });
});

describe('deleteEntry -> index', () => {
  it('awaits term removal: gone from disk when it resolves', async () => {
    await builtEmpty();
    const a = await saveEntry({ text: 'alphaword' });
    const b = await saveEntry({ text: 'betaword' });
    if (!a.saved || !b.saved) throw new Error('save failed');
    await gatherSearchIndexForExport();

    await deleteEntry(a.entry.id);

    expect(disk()).not.toContain('alphaword');
    expect(disk()).toContain('betaword');
  });

  it('drops the row from the in-memory cache: no disk read to see it gone', async () => {
    await builtEmpty();
    const a = await saveEntry({ text: 'alphaword' });
    if (!a.saved) throw new Error('save failed');
    await gatherSearchIndexForExport();
    await deleteEntry(a.entry.id);
    store.retrieveWellnessBlob.mockClear();

    expect(await gatherSearchIndexForExport()).toEqual([]);
    expect(store.retrieveWellnessBlob).not.toHaveBeenCalled();
    expect(await getSearchIndexCompleteness([])).toBe('complete');
  });

  it('still resolves and leaves the index consistent when the index is unbuilt', async () => {
    const a = await saveEntry({ text: 'alphaword' });
    if (!a.saved) throw new Error('save failed');
    await expect(deleteEntry(a.entry.id)).resolves.toBeUndefined();
    expect(shardKeys()).toEqual([]);
  });

  it('never throws when the term removal fails; the entry itself is still deleted', async () => {
    await builtEmpty();
    const a = await saveEntry({ text: 'alphaword' });
    if (!a.saved) throw new Error('save failed');
    await gatherSearchIndexForExport();
    mockFaults.rejectShardStore = true;

    await expect(deleteEntry(a.entry.id)).resolves.toBeUndefined();

    expect(await journalIndexSource.listIds()).toEqual([]);
    // The failed removal deleted every shard to force a rebuild.
    expect(shardKeys()).toEqual([]);
  });
});

describe('deleteAllEntries -> index', () => {
  it('deletes every shard by PREFIX, including a stale high-numbered one', async () => {
    await builtEmpty();
    await saveEntry({ text: 'alphaword' });
    await gatherSearchIndexForExport();
    mockDisk.set('voice_journal_search_7', JSON.stringify({ rows: [{ entryId: 'old', terms: ['stalewords'] }] }));
    mockDisk.set('voice_journal_search_12', JSON.stringify({ rows: [] }));
    expect(shardKeys().length).toBeGreaterThan(2);

    await deleteAllEntries();

    expect(shardKeys()).toEqual([]);
    expect(disk()).not.toContain('stalewords');
    expect(disk()).not.toContain('alphaword');
  });

  it('bumps the epoch: a job queued before it writes nothing afterwards', async () => {
    await builtEmpty();
    let release!: () => void;
    mockFaults.gateShardStore = new Promise<void>((r) => {
      release = r;
    });
    await saveEntry({ text: 'secretword' }); // its shard write is now gated, in flight
    await settle();

    const wiping = deleteAllEntries();
    release();
    await wiping;
    await settle();

    expect(shardKeys()).toEqual([]);
    expect(disk()).not.toContain('secretword');
  });
});
