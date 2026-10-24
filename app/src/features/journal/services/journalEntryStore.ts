/**
 * journalEntryStore — encrypted local storage for voice journal entries
 * (FEAT-283 Slice A, AC #2 / AC #7)
 *
 * STORAGE SHAPE, AND WHY IT IS NOT WHAT THE ORIGINAL AC SAID
 *
 * The acceptance criterion originally read "chunked across SecureStore keys for
 * entries >2KB". That was written against an architecture that no longer
 * exists: INFRA-144 deliberately moved wellness ciphertext OFF SecureStore onto
 * AsyncStorage precisely to escape the iOS Keychain ~2KB per-attribute limit
 * (see the header of `SecureStorageService.ts`). Implementing the AC literally
 * would have re-imposed the exact limit INFRA-144 removed. The AC has since
 * been corrected; this is the corrected shape.
 *
 * So: no chunking. One `storeWellnessBlob` record per entry —
 * AES-256-GCM ciphertext in AsyncStorage, master key in the platform Keychain,
 * with a 256KB per-record ceiling (`MAX_WELLNESS_PAYLOAD_SIZE`).
 *
 * Per-entry records rather than one array-of-entries blob, because a single
 * blob would hit that 256KB ceiling after only a handful of long entries, and
 * every save would rewrite every entry ever written.
 *
 * The METADATA index holds id and timestamps only, never text. A list view can
 * therefore render without decrypting bodies it is not showing.
 *
 * SEARCH INDEX (FEAT-530)
 *
 * A second, separate artifact: `journalSearchIndex.ts` keeps an encrypted,
 * sharded list of the distinct words of each entry (`voice_journal_search_<n>`)
 * so a search does not decrypt every entry. It is derived from entry text, so it
 * is a second place the words of a deleted entry could survive, and the three
 * write paths here keep it honest: `saveEntry` queues an add AFTER the entry and
 * the metadata row are durable (never awaited, never able to change the
 * `SaveResult`); `deleteEntry` awaits removal of the entry's words;
 * `deleteAllEntries` deletes every shard by key prefix. Nothing exists until a
 * build creates the first shard, so until then the save hook writes nothing.
 *
 * ERASURE
 *
 * Nothing here registers itself for deletion, and that is deliberate for the
 * entry records and the metadata index.
 * `storeWellnessBlob` prepends `WELLNESS_ASYNC_PREFIX` to every key it writes,
 * and `clearAllWellnessData` sweeps that prefix, so both the entry records and
 * the index are erased automatically. This is why every write goes through
 * `SecureStorageService` and never touches `AsyncStorage` directly: a bare key
 * would be both unencrypted AND invisible to the sweep — the failure mode
 * `crisis_intervention_*` exhibited before DEBUG-305 removed it.
 * `journalErasure.privacy.test.ts` proves absence by enumeration rather than
 * trusting this comment.
 *
 * The search index is the exception to "nothing registers": it holds an
 * in-memory shard cache and a queue of pending writes, and a write already in
 * flight would otherwise land on a disk the sweep has just emptied. It therefore
 * registers with the erasure registry (`journalSearchIndex`), which drops the
 * cache and invalidates every queued or in-flight write; its shard keys are
 * still swept by the prefix like everything else.
 */

import SecureStorageService from '@/core/services/security/SecureStorageService';

import {
  deleteSearchIndex,
  indexEntryAfterSave,
  removeEntryFromSearchIndex,
  type JournalIndexSource,
} from './journalSearchIndex';

/** Logical blob names. `storeWellnessBlob` adds the `wellness_async_` prefix. */
const INDEX_KEY = 'voice_journal_index';
const ENTRY_KEY_PREFIX = 'voice_journal_entry_';

/** Entries are wellness data of the same class as assessment responses. */
const SENSITIVITY = 'level_2_assessment_data' as const;

/**
 * Maximum characters in one entry (~20-25 minutes of speech).
 *
 * Sized to stay far below the 256KB ciphertext ceiling so `validateStorageSize`
 * never throws mid-save — a save that fails after someone has spoken loses the
 * reflection, which is the worst outcome for a practice built on capture.
 */
export const MAX_ENTRY_CHARS = 20000;

export interface JournalEntry {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

/** Index row. Never carries entry text. */
export interface JournalEntryMeta {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export type SaveFailureReason = 'empty' | 'too_long' | 'storage_failed';

export type SaveResult =
  | { saved: true; entry: JournalEntry }
  | { saved: false; reason: SaveFailureReason };

function entryKey(id: string): string {
  return `${ENTRY_KEY_PREFIX}${id}`;
}

function newEntryId(): string {
  // Local-only identifier; no cryptographic requirement and never leaves the
  // device. Kept dependency-free rather than pulling in a uuid package.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readIndex(): Promise<JournalEntryMeta[]> {
  const raw = await SecureStorageService.retrieveWellnessBlob<JournalEntryMeta[]>(
    INDEX_KEY,
    undefined,
    { sensitivityLevel: SENSITIVITY }
  );
  // A corrupt or partially-written index must not throw into the UI — an
  // unreadable list is recoverable, a crash on the journal tab is not.
  return Array.isArray(raw) ? raw : [];
}

async function writeIndex(index: JournalEntryMeta[]): Promise<boolean> {
  const result = await SecureStorageService.storeWellnessBlob(
    INDEX_KEY,
    index,
    SENSITIVITY
  );
  return Boolean(result?.success);
}

/**
 * Save a new entry, or update an existing one by id.
 *
 * Returns a result rather than throwing: callers are UI, and a rejected promise
 * on the save path is easy to drop silently.
 *
 * Order is entry-then-index. If the index write fails the entry is already
 * durable, so a later repair can rebuild the index from stored records; the
 * reverse order would leave an index row pointing at nothing.
 */
export async function saveEntry(input: {
  id?: string;
  text: string;
  createdAt?: number;
}): Promise<SaveResult> {
  const text = input.text ?? '';

  if (text.trim().length === 0) {
    return { saved: false, reason: 'empty' };
  }
  if (text.length > MAX_ENTRY_CHARS) {
    return { saved: false, reason: 'too_long' };
  }

  const now = Date.now();
  const id = input.id ?? newEntryId();
  const entry: JournalEntry = {
    id,
    text,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };

  const stored = await SecureStorageService.storeWellnessBlob(
    entryKey(id),
    entry,
    SENSITIVITY
  );
  if (!stored?.success) {
    return { saved: false, reason: 'storage_failed' };
  }

  const index = await readIndex();
  const meta: JournalEntryMeta = {
    id,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
  const next = [...index.filter((m) => m.id !== id), meta];

  if (!(await writeIndex(next))) {
    return { saved: false, reason: 'storage_failed' };
  }

  // Search index (FEAT-530): after the entry is durable, never awaited, and it
  // cannot change the result. A failed or skipped index write is not lost data —
  // the index is derived, and its completeness check makes the next search ask
  // for a rebuild instead of answering from a partial index.
  void indexEntryAfterSave(journalIndexSource, { id, text }, { replacing: index.some((m) => m.id === id) });

  return { saved: true, entry };
}

export async function getEntry(id: string): Promise<JournalEntry | null> {
  return SecureStorageService.retrieveWellnessBlob<JournalEntry>(
    entryKey(id),
    undefined,
    { sensitivityLevel: SENSITIVITY }
  );
}

/** Metadata only, newest first. Does not decrypt entry bodies. */
export async function listEntryMetadata(): Promise<JournalEntryMeta[]> {
  const index = await readIndex();
  return [...index].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Entry access for the search index, which must not import this module (the
 * index would then be two-way coupled to the store that calls it).
 */
export const journalIndexSource: JournalIndexSource = {
  listIds: async () => (await listEntryMetadata()).map((m) => m.id),
  readText: async (id) => (await getEntry(id))?.text ?? null,
};

/**
 * Every entry, decrypted, for the data-portability export (AC #7).
 *
 * Walks the index and decrypts each entry rather than exposing a bulk reader,
 * so the export sees exactly what the app stores and nothing more.
 *
 * A single unreadable entry is skipped rather than failing the whole export: a
 * disclosure missing one entry is a far better outcome for the user exercising
 * a portability right than a disclosure that errors out entirely.
 */
export async function gatherJournalEntriesForExport(): Promise<JournalEntry[]> {
  const index = await listEntryMetadata();
  const entries: JournalEntry[] = [];

  for (const meta of index) {
    try {
      const entry = await getEntry(meta.id);
      if (entry) {
        entries.push(entry);
      }
    } catch {
      // Skip and continue — see above.
    }
  }

  return entries;
}

export async function deleteEntry(id: string): Promise<void> {
  await SecureStorageService.deleteWellnessBlob(entryKey(id));
  const index = await readIndex();
  await writeIndex(index.filter((m) => m.id !== id));
  // The entry and its metadata row are gone; now strip the words derived from it.
  // Awaited, because "deleted" has to mean the words are gone too. Never throws.
  await removeEntryFromSearchIndex(id);
}

/**
 * Delete every entry and the index.
 *
 * Individual failures are swallowed so one bad record cannot strand the rest:
 * an index left pointing at deleted blobs is worse than a blob left without an
 * index row, and the account-erasure sweep is the backstop for either.
 */
export async function deleteAllEntries(): Promise<void> {
  const index = await readIndex();

  for (const meta of index) {
    try {
      await SecureStorageService.deleteWellnessBlob(entryKey(meta.id));
    } catch {
      // Continue — the index must still be cleared below.
    }
  }

  try {
    await SecureStorageService.deleteWellnessBlob(INDEX_KEY);
  } catch {
    // Erasure sweep remains the backstop.
  }

  // The search index: bump its epoch and delete every shard by prefix. Never throws.
  await deleteSearchIndex();
}
