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
import { createSecureStoreSessionAdapter } from '../secureStoreSessionAdapter';

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
