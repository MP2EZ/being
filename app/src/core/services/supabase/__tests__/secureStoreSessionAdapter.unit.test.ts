/**
 * SecureStore chunking session adapter (INFRA-260) — UNIT
 *
 * The Supabase anonymous session (access JWT + refresh token + user object)
 * routinely exceeds expo-secure-store's ~2048-byte/value limit. This adapter
 * backs the Supabase client's `auth.storage` with expo-secure-store by splitting
 * the value across ≤1800-byte chunks under a manifest key, reassembling on read.
 *
 * Invariants pinned here:
 *  - A >2048-byte value round-trips byte-identical (set → get).
 *  - A shorter re-write deletes orphaned trailing chunks from a previous longer
 *    session (no stale-chunk corruption on token refresh).
 *  - getItem NEVER throws — a decode/IO failure returns null ("no session") so
 *    client init can't be bricked on cold boot.
 *  - removeItem clears every chunk + the manifest.
 *  - The session is NEVER written to AsyncStorage (Keychain/Keystore only).
 */
import { jest } from '@jest/globals';

jest.mock('expo-secure-store');

import * as SecureStore from 'expo-secure-store';
import {
  createSecureStoreSessionAdapter,
  readPersistedSession,
  removePersistedSession,
  supabaseAuthStorageKey,
} from '../secureStoreSessionAdapter';

/** In-memory fake of the SecureStore key/value space for deterministic assertions. */
function installFakeStore() {
  const store = new Map<string, string>();
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(
    async (k: string, v: string) => {
      store.set(k, v);
    },
  );
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(
    async (k: string) => (store.has(k) ? store.get(k)! : null),
  );
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(
    async (k: string) => {
      store.delete(k);
    },
  );
  return store;
}

describe('secureStoreSessionAdapter (INFRA-260)', () => {
  const KEY = 'sb-yliycxslzdsgjtpxggtf-auth-token';
  let store: Map<string, string>;
  let adapter: ReturnType<typeof createSecureStoreSessionAdapter>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = installFakeStore();
    adapter = createSecureStoreSessionAdapter();
  });

  it('round-trips a >2048-byte value byte-identical', async () => {
    const big = JSON.stringify({ access_token: 'a'.repeat(3000), refresh_token: 'b'.repeat(900) });
    expect(big.length).toBeGreaterThan(2048);

    await adapter.setItem(KEY, big);
    const out = await adapter.getItem(KEY);

    expect(out).toBe(big);
  });

  it('writes multiple chunks each within the SecureStore size limit', async () => {
    const big = 'x'.repeat(5000);
    await adapter.setItem(KEY, big);

    // No single stored value exceeds the chunk ceiling.
    for (const v of store.values()) {
      expect(v.length).toBeLessThanOrEqual(1800);
    }
    // More than one chunk was produced for a 5000-char payload.
    const chunkKeys = [...store.keys()].filter((k) => /\.\d+$/.test(k));
    expect(chunkKeys.length).toBeGreaterThan(1);
  });

  it('deletes orphaned trailing chunks when a refreshed session is shorter', async () => {
    const long = 'y'.repeat(6000); // ~4 chunks
    await adapter.setItem(KEY, long);
    const longChunkCount = [...store.keys()].filter((k) => /\.\d+$/.test(k)).length;
    expect(longChunkCount).toBeGreaterThanOrEqual(4);

    const short = 'z'.repeat(100); // 1 chunk
    await adapter.setItem(KEY, short);

    const remainingChunks = [...store.keys()].filter((k) => /\.\d+$/.test(k));
    expect(remainingChunks.length).toBe(1);
    // Reassembly returns ONLY the new value (no stale bytes from the long session).
    expect(await adapter.getItem(KEY)).toBe(short);
  });

  it('returns null (does not throw) when no session is stored', async () => {
    await expect(adapter.getItem(KEY)).resolves.toBeNull();
  });

  it('returns null (does not throw) when a chunk is missing / corrupt', async () => {
    const big = 'q'.repeat(4000);
    await adapter.setItem(KEY, big);
    // Simulate Keychain corruption: drop a middle chunk.
    store.delete(`${KEY}.1`);

    await expect(adapter.getItem(KEY)).resolves.toBeNull();
  });

  it('returns null (does not throw) when the underlying store throws', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('keychain unavailable'));
    await expect(adapter.getItem(KEY)).resolves.toBeNull();
  });

  it('removeItem clears every chunk and the manifest', async () => {
    await adapter.setItem(KEY, 'w'.repeat(4000));
    expect(store.size).toBeGreaterThan(1);

    await adapter.removeItem(KEY);

    expect(store.size).toBe(0);
    expect(await adapter.getItem(KEY)).toBeNull();
  });
});

/**
 * DEBUG-704 — the deletion probe. `deleteAccount()` decides "is there a server account to
 * erase?" from what auth-js persisted, without building a client and without minting.
 * Unlike `getItem`, the probe is STRICT: an IO failure throws and a corrupt session reads
 * as present-but-unidentifiable, so the caller can fail closed instead of reading
 * "no session" and reporting an erasure that never reached the server.
 */
describe('DEBUG-704 — persisted-session probe and removal', () => {
  const KEY = 'sb-yliycxslzdsgjtpxggtf-auth-token';
  let store: Map<string, string>;
  const adapter = () => createSecureStoreSessionAdapter();
  const session = (uid: string) =>
    JSON.stringify({ access_token: 'a'.repeat(2500), refresh_token: 'r', expires_at: 1, user: { id: uid } });

  beforeEach(() => {
    jest.clearAllMocks();
    store = installFakeStore();
  });

  it('supabaseAuthStorageKey matches the storageKey the REAL createClient derives (drift pin)', () => {
    const { createClient } = jest.requireActual('@supabase/supabase-js') as any;
    for (const url of [
      'https://yliycxslzdsgjtpxggtf.supabase.co',
      'https://test.supabase.co',
      'http://127.0.0.1:54321',
      'http://localhost:54321/',
    ]) {
      // No explicit storageKey — exactly how SupabaseService constructs its client.
      const client = createClient(url, 'k', {
        auth: { persistSession: false, autoRefreshToken: false, storage: adapter() },
      });
      expect(supabaseAuthStorageKey(url)).toBe(client.storageKey);
      expect(supabaseAuthStorageKey(url)).toBe((client.auth as any).storageKey);
    }
  });

  it('absent: nothing at the base key reads as not present', async () => {
    await expect(readPersistedSession(KEY)).resolves.toEqual({ present: false, uid: null });
  });

  it('present: a chunked session yields its user id', async () => {
    await adapter().setItem(KEY, session('uid-1'));
    expect([...store.keys()].length).toBeGreaterThan(2); // genuinely chunked
    await expect(readPersistedSession(KEY)).resolves.toEqual({ present: true, uid: 'uid-1' });
  });

  it('corrupt: manifest present, chunk missing → present with no uid (never "absent")', async () => {
    await adapter().setItem(KEY, session('uid-1'));
    store.delete(`${KEY}.1`);
    await expect(readPersistedSession(KEY)).resolves.toEqual({ present: true, uid: null });
  });

  it('corrupt: reassembled value is not a session → present with no uid', async () => {
    await adapter().setItem(KEY, 'not json');
    await expect(readPersistedSession(KEY)).resolves.toEqual({ present: true, uid: null });
  });

  it('a foreign value at the base key → present with no uid', async () => {
    store.set(KEY, 'legacy-value');
    await expect(readPersistedSession(KEY)).resolves.toEqual({ present: true, uid: null });
  });

  it('strict: a Keychain IO failure THROWS rather than reading as "no session"', async () => {
    await adapter().setItem(KEY, session('uid-1'));
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('keychain unavailable'));
    await expect(readPersistedSession(KEY)).rejects.toThrow('keychain unavailable');
  });

  it('removePersistedSession removes the session, its chunks, -user and -code-verifier', async () => {
    await adapter().setItem(KEY, session('uid-1'));
    await adapter().setItem(`${KEY}-user`, JSON.stringify({ user: { id: 'uid-1' } }));
    await adapter().setItem(`${KEY}-code-verifier`, 'verifier');
    store.set('unrelated-key', 'kept');

    await removePersistedSession(KEY);

    expect([...store.keys()]).toEqual(['unrelated-key']);
    await expect(readPersistedSession(KEY)).resolves.toEqual({ present: false, uid: null });
  });

  it('removePersistedSession propagates a delete failure so the caller can retry', async () => {
    await adapter().setItem(KEY, session('uid-1'));
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(new Error('delete failed'));
    await expect(removePersistedSession(KEY)).rejects.toThrow('delete failed');
  });
});
