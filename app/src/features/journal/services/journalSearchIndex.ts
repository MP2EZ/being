/**
 * journalSearchIndex — encrypted, sharded word index over voice journal entries
 * (FEAT-530 slice A, AC #1-#7)
 *
 * WHY IT EXISTS. `EncryptionService` derives a fresh PBKDF2 key for every record
 * (the derived-key cache is disabled because each record carries its own salt),
 * so reading N entries costs N derivations. Searching the journal by decrypting
 * every entry is unshippable. This index is one derivation per SHARD instead.
 * The founder accepted that reading of "one derivation per query" on 2026-10-23:
 * a cold search costs one derivation per shard (1 at ~100 entries, 3-6 at ~500),
 * a repeat search on a loaded index costs 0, and `core/services/security/` is
 * untouched.
 *
 * WHAT IS STORED. Rows of exactly `{ entryId, terms }` (see `journalSearchTerms`),
 * persisted ONLY through `SecureStorageService.storeWellnessBlob` as
 * `voice_journal_search_<n>` — AES-256-GCM under the master key, under the swept
 * `wellness_async_` prefix, never in Settings Backup. No counts, frequencies,
 * positions, classifications or verdicts. Rows are packed into shards of at most
 * SHARD_BUDGET_BYTES of serialised plaintext, measured in UTF-8 bytes, because
 * `MAX_WELLNESS_PAYLOAD_SIZE` caps the JSON of the base64 CIPHERTEXT at 256KB and
 * a character count understates multibyte text. An entry whose terms do not fit
 * the room left in a shard is split across successive shards as several rows; an
 * entry's rows always occupy consecutive shards, and every read unions per
 * `entryId`.
 *
 * "BUILT" MEANS SHARD 0 EXISTS. Creation is lazy: until `buildSearchIndex` writes
 * shard 0, the save hook is a no-op and nothing derived from an entry exists.
 *
 * NEVER A PARTIAL ANSWER. The query returns `needs-build` whenever the index's id
 * set differs from the live id set in EITHER direction (a failed save-time write,
 * entries that predate the index, a half-finished build, an id whose removal was
 * missed). A false "nothing matches" about someone's own writing is the failure
 * this guards.
 *
 * THE RESULT SHAPE. An unordered `Set` of entry ids or a status. Never an ordered
 * list, never a count. This module sorts nothing — the one sort (of a term list)
 * lives in the builder — and it never imports the entry store, a crisis scan, or
 * a text-classification module: entry access is injected as `JournalIndexSource`.
 *
 * CONCURRENCY. Every read-modify-write runs on ONE promise chain. The shard cache
 * is only touched from inside that chain. A backfill queues one job per entry
 * with an `await` between entries, never a `Promise.all`, so it cannot hold the
 * JS thread or the native crypto queue while the crisis button is on screen.
 *
 * ERASURE. `resetSearchIndexForErasure` (registered with the erasure registry)
 * bumps an epoch and drops the cache. Every job captures the epoch when it is
 * queued and checks it immediately before each `storeWellnessBlob` and again
 * after it settles; a write that landed across a bump is deleted again. Removal
 * is erasure and is never gated: `writeShardForRemoval` is the only writer a
 * consent gate must not wrap, `writeShardForAdd` the only one it may.
 *
 * COSTS, in key derivations (one per shard read, one per shard write):
 *   cold search ................ one per shard; repeat on a loaded index: 0
 *   save, new id, cold ......... 1 (list ids) + 1 (read tail shard) + 1 (write)
 *   save, new id, warm ......... 1 (list ids) + 1 (write)
 *   save, existing id, cold .... 1 (list ids) + up to one read per shard + 1-2 writes
 *   delete, warm ............... 1 write per shard holding the entry
 *   delete, cold ............... reads shards in order from 0 until the first shard
 *                                after the entry's last row, so up to one read per
 *                                shard (a delete of an entry the index never held
 *                                reads every shard), plus 1 write per shard holding it
 *
 * FAILURE POLICY. A save-time add that fails writes nothing the next search can
 * trust: the id is simply absent, so the query says `needs-build`. A removal (or
 * a replacement of existing rows) that fails deletes EVERY shard, which forces a
 * rebuild. If that delete also fails the residual is the old shard bytes: they
 * are encrypted, the membership filter hides a deleted id's rows (a deleted id is
 * not live, so completeness reads `needs-build`, never a hit), and the account
 * erasure sweep is the backstop.
 *
 * Failures log a category only. The underlying error is never forwarded: storage
 * errors carry payload sizes and shard key names reveal the shard count.
 */

import { registerErasureReset } from '@/core/services/privacy/erasureResetRegistry';
import { LogCategory, logError } from '@/core/services/logging';
import SecureStorageService from '@/core/services/security/SecureStorageService';

import { buildTermRow, queryPrefixes, type TermRow } from './journalSearchTerms';

/** Logical shard key prefix. `storeWellnessBlob` adds the `wellness_async_` prefix. */
export const SHARD_KEY_PREFIX = 'voice_journal_search_';

/** Entries are wellness data of the same class as assessment responses. */
const SENSITIVITY = 'level_2_assessment_data' as const;

/**
 * Serialised plaintext ceiling per shard, in UTF-8 bytes of `JSON.stringify(rows)`.
 * The ciphertext is base64 (~4/3) plus a small fixed envelope, so 150KB lands near
 * 200KB against the 256KB cap: headroom for the envelope and for the model below
 * being an upper bound rather than a measurement.
 */
export const SHARD_BUDGET_BYTES = 150_000;

/** A backfill writes its dirty shards at least this often (entries), and whenever one fills. */
const FLUSH_EVERY_ENTRIES = 25;

/** Entry access, injected so this module never imports the entry store. */
export interface JournalIndexSource {
  listIds(): Promise<string[]>;
  readText(id: string): Promise<string | null>;
}

export type SearchQueryResult =
  | { status: 'ok'; ids: ReadonlySet<string> }
  | { status: 'unavailable' | 'needs-build' | 'empty-query' };

export type SearchIndexCompleteness = 'complete' | 'needs-build' | 'unavailable';

/**
 * How a backfill ended. `interrupted` is not a failure: the caller went away or
 * erasure ran, and the next call resumes from what was flushed. `not-built` is
 * `ensureSearchIndex` finding no shard 0 (only `buildSearchIndex` creates it).
 */
export type BackfillOutcome = 'complete' | 'interrupted' | 'not-built' | 'failed';

export interface BackfillOptions {
  /** Consulted before each entry. When every joined caller says no, the job stops. */
  shouldContinue?: () => boolean;
}

export interface ExportedSearchRow {
  entryId: string;
  terms: string[];
}

interface Cache {
  /** Loaded shards. Reflects disk, plus `dirty` shards staged by a backfill. */
  shards: Map<number, TermRow[]>;
  /** entryId -> shards holding a row for it, over the LOADED shards only. */
  owners: Map<string, Set<number>>;
  /** Shard numbers present on disk (key listing, no decryption); null until listed. */
  known: Set<number> | null;
  /** Shards changed in memory and not yet written. */
  dirty: Set<number>;
  /** Every known shard is in `shards`, so `owners` is the whole index. */
  loadedAll: boolean;
}

const freshCache = (): Cache => ({
  shards: new Map(),
  owners: new Map(),
  known: null,
  dirty: new Set(),
  loadedAll: false,
});

let epoch = 0;
let cache: Cache = freshCache();
let chain: Promise<void> = Promise.resolve();

interface Flight {
  promise: Promise<BackfillOutcome>;
  guards: Array<() => boolean>;
  create: boolean;
}

let inFlight: Flight | null = null;
/** Ids removed while a backfill is running, so a read already in progress cannot resurrect them. */
const removedDuringBackfill = new Set<string>();

const noop = (): void => undefined;

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(job);
  chain = run.then(noop, noop);
  return run;
}

function logFailure(message: string): void {
  logError(LogCategory.SYSTEM, message);
}

// ── Keys and sizes ──────────────────────────────────────────────────────────

const shardKey = (n: number): string => `${SHARD_KEY_PREFIX}${n}`;

function shardNumber(key: string): number | null {
  if (!key.startsWith(SHARD_KEY_PREFIX)) return null;
  const rest = key.slice(SHARD_KEY_PREFIX.length);
  return /^\d+$/.test(rest) ? Number(rest) : null;
}

function highest(known: ReadonlySet<number>): number {
  let top = -1;
  for (const n of known) if (n > top) top = n;
  return top;
}

const encoder = new TextEncoder();
const utf8Bytes = (text: string): number => encoder.encode(text).length;

/** Upper bound of one term's cost in a serialised row: its JSON plus a comma. */
const termCost = (term: string): number => utf8Bytes(JSON.stringify(term)) + 1;

/** Upper bound of a row's fixed cost: `{"entryId":…,"terms":[]}` plus a comma. */
const rowOverhead = (entryId: string): number =>
  utf8Bytes(JSON.stringify({ entryId, terms: [] })) + 1;

// ── Cache bookkeeping ───────────────────────────────────────────────────────

function detach(c: Cache, n: number): void {
  for (const row of c.shards.get(n) ?? []) {
    const held = c.owners.get(row.entryId);
    if (!held) continue;
    held.delete(n);
    if (held.size === 0) c.owners.delete(row.entryId);
  }
}

function attach(c: Cache, n: number, rows: TermRow[]): void {
  c.shards.set(n, rows);
  for (const row of rows) {
    const held = c.owners.get(row.entryId);
    if (held) held.add(n);
    else c.owners.set(row.entryId, new Set([n]));
  }
}

/** Replace a shard's rows in memory and mark it unwritten. */
function stageShard(c: Cache, n: number, rows: TermRow[]): void {
  detach(c, n);
  attach(c, n, rows);
  (c.known ??= new Set()).add(n);
  c.dirty.add(n);
}

const withoutEntry = (rows: readonly TermRow[], entryId: string): TermRow[] =>
  rows.filter((row) => row.entryId !== entryId);

/** Throw the cache away so the next job reloads from disk. */
function invalidate(c: Cache): void {
  if (cache === c) cache = freshCache();
}

// ── Reading ─────────────────────────────────────────────────────────────────

function parseRows(raw: unknown): TermRow[] | null {
  const rows = (raw as { rows?: unknown } | null)?.rows;
  if (!Array.isArray(rows)) return null;
  const out: TermRow[] = [];
  for (const row of rows as Array<Partial<TermRow> | null>) {
    if (
      !row ||
      typeof row.entryId !== 'string' ||
      !Array.isArray(row.terms) ||
      !row.terms.every((t) => typeof t === 'string')
    ) {
      return null;
    }
    out.push({ entryId: row.entryId, terms: row.terms });
  }
  return out;
}

async function enumerate(c: Cache): Promise<Set<number>> {
  if (c.known) return c.known;
  const keys = await SecureStorageService.listWellnessBlobKeys(SHARD_KEY_PREFIX);
  const known = new Set<number>();
  for (const key of keys) {
    const n = shardNumber(key);
    if (n !== null) known.add(n);
  }
  c.known = known;
  return known;
}

/** One derivation. Throws when the shard is unreadable. */
async function loadShard(c: Cache, n: number): Promise<void> {
  if (c.shards.has(n)) return;
  const raw = await SecureStorageService.retrieveWellnessBlob<unknown>(shardKey(n), undefined, {
    sensitivityLevel: SENSITIVITY,
  });
  const rows = parseRows(raw);
  if (!rows) throw new Error('unreadable shard');
  attach(c, n, rows);
}

/** Load every shard. false = not built (no shard 0). Throws when a shard is unreadable. */
async function loadAll(c: Cache): Promise<boolean> {
  if (c.loadedAll) return true;
  const known = await enumerate(c);
  if (!known.has(0)) return false;
  const top = highest(known);
  for (let n = 0; n <= top; n += 1) {
    if (known.has(n)) await loadShard(c, n);
  }
  c.loadedAll = true;
  return true;
}

/**
 * The shards holding rows for `id`. Warm: the owner map. Cold: shards are read in
 * order from 0 until the first shard after the entry's last row (rows of one entry
 * are consecutive), so a cold lookup costs up to one derivation per shard.
 */
async function locateEntry(c: Cache, id: string): Promise<number[]> {
  if (c.loadedAll) return [...(c.owners.get(id) ?? [])];
  const known = await enumerate(c);
  const top = highest(known);
  const hits: number[] = [];
  for (let n = 0; n <= top; n += 1) {
    if (!known.has(n)) {
      if (hits.length > 0) break;
      continue;
    }
    await loadShard(c, n);
    const here = (c.shards.get(n) ?? []).some((row) => row.entryId === id);
    if (here) hits.push(n);
    else if (hits.length > 0) break;
  }
  return hits;
}

// ── Writing ─────────────────────────────────────────────────────────────────

async function dropKey(key: string): Promise<void> {
  try {
    await SecureStorageService.deleteWellnessBlob(key);
  } catch {
    // The erasure sweep is the backstop.
  }
}

/**
 * The ONLY writer of the add and backfill paths: a consent gate (FEAT-666) wraps
 * this function and no other. The epoch is checked before the write and again
 * after it settles.
 */
async function writeShardForAdd(epochAtQueue: number, n: number, rows: TermRow[]): Promise<boolean> {
  if (epochAtQueue !== epoch) return false;
  let written = false;
  try {
    const result = await SecureStorageService.storeWellnessBlob(shardKey(n), { rows }, SENSITIVITY);
    written = Boolean(result?.success);
  } catch {
    written = false;
  }
  if (epochAtQueue !== epoch) {
    await dropKey(shardKey(n));
    return false;
  }
  if (!written) logFailure('Journal search index write failed');
  return written;
}

/**
 * The ONLY writer of the removal path. Erasure: it must never be gated, so a user
 * who has withheld consent can still strip an entry's words. Same epoch rules.
 */
async function writeShardForRemoval(epochAtQueue: number, n: number, rows: TermRow[]): Promise<boolean> {
  if (epochAtQueue !== epoch) return false;
  let written = false;
  try {
    const result = await SecureStorageService.storeWellnessBlob(shardKey(n), { rows }, SENSITIVITY);
    written = Boolean(result?.success);
  } catch {
    written = false;
  }
  if (epochAtQueue !== epoch) {
    await dropKey(shardKey(n));
    return false;
  }
  if (!written) logFailure('Journal search index removal failed');
  return written;
}

/**
 * Write every dirty shard, removal-only shards first (so a failed replacement
 * never leaves old and new rows side by side), each pass in ascending order.
 */
async function flushDirty(c: Cache, e: number, removalOnly: ReadonlySet<number>): Promise<boolean> {
  const top = highest(c.known ?? new Set<number>());
  for (const removalPass of [true, false]) {
    for (let n = 0; n <= top; n += 1) {
      if (!c.dirty.has(n) || removalOnly.has(n) !== removalPass) continue;
      const rows = c.shards.get(n) ?? [];
      const ok = removalPass
        ? await writeShardForRemoval(e, n, rows)
        : await writeShardForAdd(e, n, rows);
      if (!ok) return false;
      c.dirty.delete(n);
    }
  }
  return true;
}

/** Delete every shard key by prefix and drop the cache. false = a delete failed (residual). */
async function wipeShards(c: Cache): Promise<boolean> {
  invalidate(c);
  let ok = true;
  try {
    const keys = await SecureStorageService.listWellnessBlobKeys(SHARD_KEY_PREFIX);
    for (const key of keys) {
      try {
        await SecureStorageService.deleteWellnessBlob(key);
      } catch {
        ok = false;
      }
    }
  } catch {
    ok = false;
  }
  if (!ok) logFailure('Journal search index could not be fully deleted');
  return ok;
}

// ── Packing ─────────────────────────────────────────────────────────────────

/** The shard that receives new rows, loaded. */
async function loadTail(c: Cache): Promise<void> {
  const known = await enumerate(c);
  await loadShard(c, highest(known));
}

/**
 * Append an entry's row at the tail, splitting its terms across successive shards
 * when the room left in a shard runs out. Stages every shard it touches and
 * returns their numbers. Sizes are an upper-bound model of the serialised JSON.
 */
function placeRow(c: Cache, row: TermRow): Set<number> {
  const touched = new Set<number>();
  let n = highest(c.known ?? new Set<number>());
  let current = [...(c.shards.get(n) ?? [])];
  let used = utf8Bytes(JSON.stringify(current));
  const costs = row.terms.map(termCost);
  const overhead = rowOverhead(row.entryId);
  let at = 0; // next term to place

  for (;;) {
    const room = SHARD_BUDGET_BYTES - used - overhead;
    let fit = 0;
    let cost = 0;
    while (at + fit < costs.length && cost + (costs[at + fit] ?? 0) <= room) {
      cost += costs[at + fit] ?? 0;
      fit += 1;
    }
    const wantsMore = at < costs.length;
    if ((wantsMore && fit === 0) || room < 0) {
      if (current.length > 0) {
        n += 1;
        current = [];
        used = 2;
        continue;
      }
      // An empty shard that cannot hold one capped term is impossible by the term
      // cap; place one anyway rather than loop.
      if (wantsMore && fit === 0) {
        fit = 1;
        cost = costs[at] ?? 0;
      }
    }
    current = [...current, { entryId: row.entryId, terms: row.terms.slice(at, at + fit) }];
    used += overhead + cost;
    stageShard(c, n, current);
    touched.add(n);
    at += fit;
    if (at >= costs.length) break;
    n += 1;
    current = [];
    used = 2;
  }
  return touched;
}

// ── Erasure ─────────────────────────────────────────────────────────────────

function bumpEpoch(): void {
  epoch += 1;
  cache = freshCache();
  inFlight = null;
  removedDuringBackfill.clear();
}

/**
 * Drop the in-memory index and invalidate every queued or in-flight write. Memory
 * only: the disk records are `clearAllWellnessData`'s job (and the prefix sweep
 * covers them). Registered with the erasure registry below.
 */
export function resetSearchIndexForErasure(): void {
  bumpEpoch();
}

/**
 * `deleteAllEntries`' half of erasure: bump the epoch (so nothing queued writes
 * again), then delete every shard key found by PREFIX — never a stored count, so a
 * stale high-numbered shard from an older build cannot survive.
 */
export async function deleteSearchIndex(): Promise<void> {
  bumpEpoch();
  try {
    const keys = await SecureStorageService.listWellnessBlobKeys(SHARD_KEY_PREFIX);
    for (const key of keys) await dropKey(key);
  } catch {
    logFailure('Journal search index could not be fully deleted');
  }
}

registerErasureReset('journalSearchIndex', resetSearchIndexForErasure);

// ── Save and delete hooks ───────────────────────────────────────────────────

async function runAdd(
  e: number,
  source: JournalIndexSource,
  entry: { id: string; text: string },
  replacing: boolean
): Promise<void> {
  if (e !== epoch) return;
  const c = cache;
  const known = await enumerate(c);
  if (!known.has(0)) return; // lazy creation: nothing exists until a build creates shard 0

  // The save/delete race: the id must still be live when this job runs.
  const live = await source.listIds();
  if (e !== epoch || !live.includes(entry.id)) return;

  const row = buildTermRow(entry.id, entry.text);
  const old = replacing || c.loadedAll ? await locateEntry(c, entry.id) : [];
  for (const n of old) stageShard(c, n, withoutEntry(c.shards.get(n) ?? [], entry.id));
  await loadTail(c);
  const receivers = placeRow(c, row);
  const removalOnly = new Set(old.filter((n) => !receivers.has(n)));

  if (!(await flushDirty(c, e, removalOnly))) {
    if (e !== epoch) return;
    // Old rows possibly still on disk beside a failed replacement: force a rebuild.
    // A failed first add leaves nothing to repair; the id is just absent.
    if (old.length > 0) await wipeShards(c);
    else invalidate(c);
  }
}

/**
 * After a successful `saveEntry`: index the entry. Fire-and-forget by contract —
 * this never rejects and a failure never reaches the caller's result. `replacing`
 * is whether the id already had a metadata row (a re-save), which tells a cold
 * job it must look for old rows instead of only reading the tail shard.
 */
export function indexEntryAfterSave(
  source: JournalIndexSource,
  entry: { id: string; text: string },
  options: { replacing: boolean }
): Promise<void> {
  const e = epoch;
  return enqueue(async () => {
    try {
      await runAdd(e, source, entry, options.replacing);
    } catch {
      invalidate(cache);
      logFailure('Journal search index write failed');
    }
  });
}

async function runRemoval(e: number, id: string): Promise<void> {
  if (e !== epoch) return;
  const c = cache;
  try {
    const known = await enumerate(c);
    if (!known.has(0)) return;
    const hits = await locateEntry(c, id);
    if (hits.length === 0) return;
    for (const n of hits) stageShard(c, n, withoutEntry(c.shards.get(n) ?? [], id));
    if (await flushDirty(c, e, new Set(hits))) return;
  } catch {
    // fall through to the forced rebuild
  }
  if (e !== epoch) return;
  await wipeShards(c);
}

/**
 * `deleteEntry` awaits this. Removes every row of the entry, from the cache and
 * from disk. A failure deletes every shard (forced rebuild); if that fails too the
 * residual is stated at the top of this file. Never rejects.
 */
export function removeEntryFromSearchIndex(id: string): Promise<void> {
  if (inFlight) removedDuringBackfill.add(id);
  const e = epoch;
  return enqueue(async () => {
    try {
      await runRemoval(e, id);
    } catch {
      logFailure('Journal search index removal failed');
    }
  });
}

// ── Reading the index ───────────────────────────────────────────────────────

/** First position whose term is >= prefix; the sorted list is searched, not scanned. */
function hasPrefix(terms: readonly string[], prefix: string): boolean {
  let lo = 0;
  let hi = terms.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((terms[mid] ?? '') < prefix) lo = mid + 1;
    else hi = mid;
  }
  return lo < terms.length && (terms[lo] ?? '').startsWith(prefix);
}

function sameIds(c: Cache, live: ReadonlySet<string>): boolean {
  for (const id of live) if (!c.owners.has(id)) return false;
  for (const id of c.owners.keys()) if (!live.has(id)) return false;
  return true;
}

type Inspection<T> =
  | { status: 'unavailable' | 'needs-build' }
  | { status: 'complete'; value: T };

/** Load the index and, if it is complete for `liveIds`, run `read` on it — inside the queue. */
function inspect<T>(liveIds: readonly string[], read: (c: Cache) => T): Promise<Inspection<T>> {
  return enqueue(async (): Promise<Inspection<T>> => {
    const e = epoch;
    const c = cache;
    let built: boolean;
    try {
      built = await loadAll(c);
    } catch {
      logFailure('Journal search index unreadable');
      return { status: 'unavailable' };
    }
    if (e !== epoch) return { status: 'unavailable' };
    if (!built || !sameIds(c, new Set(liveIds))) return { status: 'needs-build' };
    return { status: 'complete', value: read(c) };
  });
}

/**
 * Is the index complete for exactly these live ids? Costs one derivation per shard
 * when the index is not loaded, 0 once it is.
 */
export async function getSearchIndexCompleteness(
  liveIds: readonly string[]
): Promise<SearchIndexCompleteness> {
  const seen = await inspect(liveIds, () => true);
  return seen.status;
}

/**
 * The entries whose words match EVERY typed prefix. `empty-query` is decided first
 * (an empty, blank or punctuation-only search is never "all entries"), then
 * completeness. Reads shards only: it never reads an entry.
 */
export async function querySearchIndex(
  query: string,
  liveIds: readonly string[]
): Promise<SearchQueryResult> {
  const prefixes = queryPrefixes(query);
  if (prefixes.length === 0) return { status: 'empty-query' };

  const seen = await inspect(liveIds, (c): ReadonlySet<string> => {
    const hits = new Map<string, Set<number>>();
    for (const rows of c.shards.values()) {
      for (const row of rows) {
        for (let i = 0; i < prefixes.length; i += 1) {
          if (!hasPrefix(row.terms, prefixes[i] ?? '')) continue;
          const held = hits.get(row.entryId);
          if (held) held.add(i);
          else hits.set(row.entryId, new Set([i]));
        }
      }
    }
    const ids = new Set<string>();
    for (const [entryId, matched] of hits) {
      if (matched.size === prefixes.length) ids.add(entryId);
    }
    return ids;
  });

  return seen.status === 'complete' ? { status: 'ok', ids: seen.value } : { status: seen.status };
}

/**
 * The data-portability copy of the index: null when never built, [] when built and
 * empty, otherwise one row per entry (split rows merged, terms still sorted because
 * an entry's pieces are consecutive and each is sorted). Throws when a shard is
 * unreadable; the export service treats that section as omitted.
 */
export function gatherSearchIndexForExport(): Promise<ExportedSearchRow[] | null> {
  return enqueue(async () => {
    const c = cache;
    const built = await loadAll(c);
    if (!built) return null;
    const merged = new Map<string, string[]>();
    const top = highest(c.known ?? new Set<number>());
    for (let n = 0; n <= top; n += 1) {
      for (const row of c.shards.get(n) ?? []) {
        const held = merged.get(row.entryId);
        if (held) held.push(...row.terms);
        else merged.set(row.entryId, [...row.terms]);
      }
    }
    return Array.from(merged, ([entryId, terms]) => ({ entryId, terms }));
  });
}

// ── Backfill ────────────────────────────────────────────────────────────────

type Prepared = { ok: true; missing: string[] } | { ok: false; outcome: BackfillOutcome };

/** Load, create shard 0 when asked, prune stale ids; return the ids still to index. */
async function prepareBackfill(
  e: number,
  create: boolean,
  live: ReadonlySet<string>,
  liveList: readonly string[]
): Promise<Prepared> {
  if (e !== epoch) return { ok: false, outcome: 'interrupted' };
  let c = cache;
  let built = false;
  try {
    built = await loadAll(c);
  } catch {
    if (!create) return { ok: false, outcome: 'failed' };
    // An unreadable shard would leave search unavailable for good: start again.
    await wipeShards(c);
    c = cache;
  }

  if (!built) {
    if (!create) return { ok: false, outcome: 'not-built' };
    await wipeShards(c); // stray shards without a shard 0 are not an index
    c = cache;
    await enumerate(c);
    stageShard(c, 0, []);
    if (!(await flushDirty(c, e, new Set()))) {
      invalidate(c);
      return { ok: false, outcome: e === epoch ? 'failed' : 'interrupted' };
    }
    c.loadedAll = highest(c.known ?? new Set<number>()) === 0;
  }

  // Prune ids that are no longer live. This is erasure of a deleted entry's words.
  const staleShards = new Set<number>();
  for (const [n, rows] of c.shards) {
    if (rows.some((row) => !live.has(row.entryId))) {
      stageShard(c, n, rows.filter((row) => live.has(row.entryId)));
      staleShards.add(n);
    }
  }
  if (staleShards.size > 0 && !(await flushDirty(c, e, staleShards))) {
    if (e !== epoch) return { ok: false, outcome: 'interrupted' };
    await wipeShards(c);
    return { ok: false, outcome: 'failed' };
  }

  return { ok: true, missing: liveList.filter((id) => !c.owners.has(id)) };
}

/** Index one entry into the cache (no write): skips ids already indexed or removed meanwhile. */
function indexOne(e: number, id: string, text: string | null): Promise<'ok' | 'failed' | 'interrupted'> {
  return enqueue(async () => {
    if (e !== epoch) return 'interrupted';
    const c = cache;
    if (c.owners.has(id) || removedDuringBackfill.has(id)) return 'ok';
    try {
      await loadTail(c);
      placeRow(c, buildTermRow(id, text ?? ''));
      return 'ok';
    } catch {
      invalidate(c);
      return 'failed';
    }
  });
}

function flushJob(e: number): Promise<'ok' | 'failed' | 'interrupted'> {
  return enqueue(async () => {
    if (e !== epoch) return 'interrupted';
    const c = cache;
    if (c.dirty.size === 0) return 'ok';
    if (await flushDirty(c, e, new Set())) return 'ok';
    invalidate(c);
    return e === epoch ? 'failed' : 'interrupted';
  });
}

/** A shard other than the tail is dirty: it is full and worth writing. */
function fullShardPending(): boolean {
  const c = cache;
  const tail = highest(c.known ?? new Set<number>());
  for (const n of c.dirty) if (n !== tail) return true;
  return false;
}

function wanted(flight: Flight): boolean {
  return flight.guards.some((guard) => {
    try {
      return guard();
    } catch {
      return false;
    }
  });
}

function release(flight: Flight): void {
  if (inFlight === flight) {
    inFlight = null;
    removedDuringBackfill.clear();
  }
}

async function backfill(flight: Flight, source: JournalIndexSource): Promise<BackfillOutcome> {
  const e = epoch;
  try {
    let liveList: string[];
    try {
      liveList = await source.listIds();
    } catch {
      return 'failed';
    }
    const live = new Set(liveList);
    const prepared = await enqueue(() => prepareBackfill(e, flight.create, live, liveList));
    if (!prepared.ok) return prepared.outcome;

    let unreadable = 0;
    let sinceFlush = 0;
    for (const id of prepared.missing) {
      if (e !== epoch) return 'interrupted';
      if (!wanted(flight)) {
        // Decide and release in the same tick, so a caller arriving now starts a
        // fresh job instead of joining one that is already ending.
        release(flight);
        await flushJob(e);
        return 'interrupted';
      }
      let text: string | null;
      try {
        text = await source.readText(id);
      } catch {
        unreadable += 1;
        continue;
      }
      const step = await indexOne(e, id, text);
      if (step !== 'ok') return step === 'failed' ? 'failed' : 'interrupted';
      sinceFlush += 1;
      if (sinceFlush >= FLUSH_EVERY_ENTRIES || fullShardPending()) {
        sinceFlush = 0;
        const flushed = await flushJob(e);
        if (flushed !== 'ok') return flushed === 'failed' ? 'failed' : 'interrupted';
      }
    }
    const flushed = await flushJob(e);
    if (flushed !== 'ok') return flushed === 'failed' ? 'failed' : 'interrupted';
    return unreadable > 0 ? 'failed' : 'complete';
  } finally {
    release(flight);
  }
}

function runShared(
  source: JournalIndexSource,
  options: BackfillOptions | undefined,
  create: boolean
): Promise<BackfillOutcome> {
  const guard = options?.shouldContinue ?? ((): boolean => true);
  if (inFlight) {
    if (create && !inFlight.create) {
      // An ensure is running and only a build may create shard 0: wait, then run.
      return inFlight.promise.then(() => runShared(source, options, true));
    }
    inFlight.guards.push(guard);
    return inFlight.promise;
  }
  const flight: Flight = { promise: Promise.resolve<BackfillOutcome>('failed'), guards: [guard], create };
  inFlight = flight;
  flight.promise = backfill(flight, source);
  return flight.promise;
}

/**
 * Reconcile a BUILT index with the live ids: index the missing ones, prune the
 * stale ones. Does nothing (`not-built`) when no build has created shard 0.
 * Concurrent calls share one job; stops at an entry boundary once every joined
 * caller's `shouldContinue` says no, keeping what was flushed.
 */
export function ensureSearchIndex(
  source: JournalIndexSource,
  options?: BackfillOptions
): Promise<BackfillOutcome> {
  return runShared(source, options, false);
}

/** Create shard 0, then ensure. The only call that turns an unbuilt index into a built one. */
export function buildSearchIndex(
  source: JournalIndexSource,
  options?: BackfillOptions
): Promise<BackfillOutcome> {
  return runShared(source, options, true);
}
