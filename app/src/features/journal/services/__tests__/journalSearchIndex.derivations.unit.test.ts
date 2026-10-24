/**
 * journalSearchIndex over the REAL SecureStorageService and EncryptionService
 * (FEAT-530 slice A, AC #3)
 *
 * Two things only the real stack can show:
 *   1. The payload cap. `validateStorageSize` measures the JSON of the ciphertext
 *      package against MAX_WELLNESS_PAYLOAD_SIZE and THROWS (storeWellnessBlob
 *      turns that into `success: false`). Building 500 entries at MAX_ENTRY_CHARS
 *      must never produce one — proved on two adversarial corpora, not asserted.
 *   2. The cost. Every `AesCrypto.pbkdf2` call is one 100k-iteration derivation on
 *      a device, and the cache that would amortise them is disabled by design. The
 *      numbers pinned here are the founder-accepted reading of "one derivation per
 *      query": one per shard, and 0 on a loaded index.
 *
 * Only the cipher primitives are faked (`createAesCryptoMock`); the key-derivation
 * CALLS are real and counted.
 */

const mockAsync = new Map<string, string>();
const mockSecure = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => {
  const api = {
    getItem: jest.fn(async (k: string) => mockAsync.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockAsync.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      mockAsync.delete(k);
    }),
    getAllKeys: jest.fn(async () => [...mockAsync.keys()]),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => mockAsync.delete(k));
    }),
  };
  return { __esModule: true, default: api, ...api };
});
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockSecure.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockSecure.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecure.delete(k);
  }),
}));
jest.mock('react-native-aes-crypto', () =>
  require('../../../../../__tests__/helpers/mockEncryption').createAesCryptoMock()
);
jest.mock('expo-crypto', () =>
  require('../../../../../__tests__/helpers/mockEncryption').createExpoCryptoMock()
);

import AesCrypto from 'react-native-aes-crypto';

import SecureStorageService, {
  SECURE_STORAGE_CONFIG,
} from '@/core/services/security/SecureStorageService';

import { deleteEntry, journalIndexSource, saveEntry } from '../journalEntryStore';
import { buildTermRow, MAX_TERM_CODEPOINTS } from '../journalSearchTerms';
import {
  SHARD_BUDGET_BYTES,
  SHARD_KEY_PREFIX,
  buildSearchIndex,
  getSearchIndexCompleteness,
  indexEntryAfterSave,
  querySearchIndex,
  removeEntryFromSearchIndex,
  resetSearchIndexForErasure,
  type JournalIndexSource,
} from '../journalSearchIndex';

const MAX_ENTRY_CHARS = 20000; // mirrors journalEntryStore.MAX_ENTRY_CHARS, asserted below
const WELLNESS = SECURE_STORAGE_CONFIG.WELLNESS_ASYNC_PREFIX;
const derivations = AesCrypto.pbkdf2 as unknown as jest.Mock;

const shardKeys = () =>
  [...mockAsync.keys()].filter((k) => k.startsWith(`${WELLNESS}${SHARD_KEY_PREFIX}`));

function makeSource(texts: Record<string, string>): JournalIndexSource {
  return {
    listIds: async () => Object.keys(texts),
    readText: async (id) => (id in texts ? texts[id] : null),
  };
}

/** `n` entries of ordinary prose: ~`words` distinct words each. */
function prose(n: number, words: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < n; i += 1) {
    out[`e${i}`] = Array.from({ length: words }, (_, j) => `word${i}x${j}`).join(' ');
  }
  return out;
}

beforeEach(() => {
  mockAsync.clear();
  resetSearchIndexForErasure();
  derivations.mockClear();
});

describe('the payload cap (500 entries x MAX_ENTRY_CHARS never throws)', () => {
  const store = jest.spyOn(SecureStorageService, 'storeWellnessBlob');

  /** Every write succeeded, and the largest ciphertext package leaves real headroom. */
  async function expectBuildFits(texts: Record<string, string>) {
    store.mockClear();
    const outcome = await buildSearchIndex(makeSource(texts));
    expect(outcome).toBe('complete');

    for (const result of store.mock.results) {
      expect((await result.value).success).toBe(true);
    }
    const sizes = shardKeys().map((k) => mockAsync.get(k)!.length);
    expect(sizes.length).toBeGreaterThan(1);
    const largest = sizes.reduce((a, b) => Math.max(a, b), 0);
    expect(largest).toBeLessThan(SECURE_STORAGE_CONFIG.MAX_WELLNESS_PAYLOAD_SIZE);
    // Headroom, not a squeak under the line.
    expect(largest).toBeLessThan(SECURE_STORAGE_CONFIG.MAX_WELLNESS_PAYLOAD_SIZE * 0.9);
    // And the plaintext budget itself is respected.
    expect(SHARD_BUDGET_BYTES).toBeLessThan(SECURE_STORAGE_CONFIG.MAX_WELLNESS_PAYLOAD_SIZE);
  }

  it('assumes the real entry cap', () => {
    expect(jest.requireActual('../journalEntryStore').MAX_ENTRY_CHARS).toBe(MAX_ENTRY_CHARS);
  });

  it('multibyte, NFKD-expanding corpus', async () => {
    // U+3300..U+33FF are square CJK compatibility forms: NFKD expands each into
    // several 3-byte letters, so an 8-symbol source token becomes a term that runs
    // into the 32-code-point cap. 300 distinct tokens per entry, repeated to the cap.
    let x = 12345;
    const next = () => (x = (x * 1103515245 + 12345) & 0x7fffffff) >> 8;
    const texts: Record<string, string> = {};
    for (let i = 0; i < 500; i += 1) {
      const tokens = Array.from({ length: 300 }, () =>
        Array.from({ length: 8 }, () => String.fromCodePoint(0x3300 + (next() % 256))).join('')
      );
      let text = tokens.join(' ');
      while (text.length < MAX_ENTRY_CHARS) text += ` ${text}`;
      texts[`n${i}`] = text.slice(0, MAX_ENTRY_CHARS);
    }
    // The corpus must really be the hard case: capped, multibyte terms.
    const sample = buildTermRow('probe', texts.n0).terms;
    expect(sample.some((t) => Array.from(t).length === MAX_TERM_CODEPOINTS)).toBe(true);
    expect(sample.some((t) => new TextEncoder().encode(t).length > 64)).toBe(true);
    await expectBuildFits(texts);
  }, 240_000);

  it('many-distinct-short-tokens corpus', async () => {
    // 3-character tokens, all distinct within an entry: the most terms per
    // character, so the most per-term JSON overhead (two quotes and a comma).
    const texts: Record<string, string> = {};
    for (let i = 0; i < 500; i += 1) {
      // 3-char base-36 gives 46,656 values; stepping by 9 never repeats inside 5000.
      const distinct = Array.from({ length: 5000 }, (_, t) =>
        ((i * 977 + t * 9) % 46656).toString(36).padStart(3, '0')
      );
      texts[`s${i}`] = distinct.join(' ').slice(0, MAX_ENTRY_CHARS);
    }
    await expectBuildFits(texts);
  }, 240_000);
});

describe('derivation cost (pbkdf2 calls) of a search', () => {
  async function builtIndex(entries: number, words: number) {
    const texts = prose(entries, words);
    await buildSearchIndex(makeSource(texts));
    resetSearchIndexForErasure(); // cold: the shards are on disk, nothing is in memory
    derivations.mockClear();
    return { texts, live: Object.keys(texts) };
  }

  it('is ONE derivation for a cold search at 100 entries, and 0 for the repeat', async () => {
    const { live } = await builtIndex(100, 60);
    expect(shardKeys()).toHaveLength(1);

    const cold = await querySearchIndex('word5x', live);
    expect(cold.status).toBe('ok');
    expect(derivations).toHaveBeenCalledTimes(1);

    derivations.mockClear();
    await querySearchIndex('word7x', live);
    await querySearchIndex('word9x3', live);
    expect(derivations).not.toHaveBeenCalled();
  });

  it('is one derivation PER SHARD for a cold search at 500 entries (3-6 shards), and 0 for the repeat', async () => {
    const { live } = await builtIndex(500, 100);
    const shards = shardKeys().length;
    expect(shards).toBeGreaterThanOrEqual(3);
    expect(shards).toBeLessThanOrEqual(6);

    const cold = await querySearchIndex('word42x', live);
    expect(cold.status).toBe('ok');
    expect(derivations).toHaveBeenCalledTimes(shards);

    derivations.mockClear();
    await querySearchIndex('word43x', live);
    expect(derivations).not.toHaveBeenCalled();
  });

  it('completeness alone costs the same as a search, and a search after it costs 0', async () => {
    const { live } = await builtIndex(500, 100);
    const shards = shardKeys().length;

    await getSearchIndexCompleteness(live);
    expect(derivations).toHaveBeenCalledTimes(shards);
    derivations.mockClear();
    await querySearchIndex('word1x', live);
    expect(derivations).not.toHaveBeenCalled();
  });
});

describe('derivation cost of save and delete (stated, not hidden)', () => {
  let live: string[];
  let shards: number;
  let all: Record<string, string>;

  beforeEach(async () => {
    all = prose(500, 100);
    await buildSearchIndex(makeSource(all));
    shards = shardKeys().length;
    live = Object.keys(all);
    derivations.mockClear();
  });

  const coldStart = () => {
    resetSearchIndexForErasure();
    derivations.mockClear();
  };

  it('save of a NEW id: warm = 1 write', async () => {
    const source = makeSource({ ...all, fresh: 'freshword here' });
    await indexEntryAfterSave(source, { id: 'fresh', text: 'freshword here' }, { replacing: false });
    expect(derivations).toHaveBeenCalledTimes(1);
  });

  it('save of a NEW id: cold = 1 read (tail shard only) + 1 write, NOT one per shard', async () => {
    coldStart();
    const source = makeSource({ ...all, fresh: 'freshword here' });
    await indexEntryAfterSave(source, { id: 'fresh', text: 'freshword here' }, { replacing: false });
    expect(shards).toBeGreaterThan(2);
    expect(derivations).toHaveBeenCalledTimes(2);
  });

  it('re-save of an id in shard 0, cold = reads 0,1 (hit, then the first miss) + tail read + 2 writes', async () => {
    coldStart();
    const source = makeSource(all);
    await indexEntryAfterSave(source, { id: 'e0', text: 'replacement words' }, { replacing: true });
    expect(derivations).toHaveBeenCalledTimes(5);
  });

  it('delete: warm = 1 write per shard holding the entry', async () => {
    await getSearchIndexCompleteness(live); // loads everything
    derivations.mockClear();
    await removeEntryFromSearchIndex('e0');
    expect(derivations).toHaveBeenCalledTimes(1);
  });

  it('delete, cold, entry in shard 0: reads shards 0 and 1 (stops at the first miss) + 1 write — not every shard', async () => {
    coldStart();
    await removeEntryFromSearchIndex('e0');
    expect(derivations).toHaveBeenCalledTimes(3);
    expect(shards).toBeGreaterThan(3);
  });

  it('delete, cold, id the index never held: one read per shard and no write (the stated worst case)', async () => {
    coldStart();
    await removeEntryFromSearchIndex('never-indexed');
    expect(derivations).toHaveBeenCalledTimes(shards);
  });

  it('delete, cold, entry in the LAST shard: reads every shard + 1 write', async () => {
    coldStart();
    await removeEntryFromSearchIndex('e499');
    expect(derivations).toHaveBeenCalledTimes(shards + 1);
  });
});

describe('derivation cost through the real entry store', () => {
  // Everything awaits microtasks only, so two macrotask turns let the fire-and-forget job finish.
  const settle = async () => {
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
  };

  async function costOf(action: () => Promise<unknown>): Promise<number> {
    derivations.mockClear();
    await action();
    await settle();
    return derivations.mock.calls.length;
  }

  it('save: the index adds 3 derivations cold (list ids, read tail shard, write) and 2 warm', async () => {
    await saveEntry({ text: 'warm-up: first use initialises the master key' });
    await settle();
    const baseline = await costOf(() => saveEntry({ text: 'baseline entry with words' }));
    // Entry write + readIndex + writeIndex.
    expect(baseline).toBe(3);

    await buildSearchIndex(journalIndexSource);
    resetSearchIndexForErasure();

    const cold = await costOf(() => saveEntry({ text: 'second entry with words' }));
    expect(cold - baseline).toBe(3);

    const warm = await costOf(() => saveEntry({ text: 'third entry with words' }));
    expect(warm - baseline).toBe(2);
  });

  it('delete: the index adds 1 write warm, 2 cold (read the one shard, write it); 0 while unbuilt', async () => {
    const a = await saveEntry({ text: 'alpha entry' });
    const b = await saveEntry({ text: 'beta entry' });
    const c = await saveEntry({ text: 'gamma entry' });
    if (!a.saved || !b.saved || !c.saved) throw new Error('save failed');
    await settle();

    // Unbuilt: delete-blob + readIndex + writeIndex only.
    const baseline = await costOf(() => deleteEntry(a.entry.id));
    expect(baseline).toBe(2);

    await buildSearchIndex(journalIndexSource);
    const warm = await costOf(() => deleteEntry(b.entry.id));
    expect(warm - baseline).toBe(1);

    resetSearchIndexForErasure();
    const cold = await costOf(() => deleteEntry(c.entry.id));
    expect(cold - baseline).toBe(2);
  });
});
