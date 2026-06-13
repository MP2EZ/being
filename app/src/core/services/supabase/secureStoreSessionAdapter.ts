/**
 * SecureStore chunking session adapter (INFRA-260)
 *
 * Backs the Supabase client's `auth.storage` with expo-secure-store
 * (iOS Keychain / Android Keystore) so the anonymous-session JWT + refresh token
 * persist in hardware-backed secure storage — NEVER in AsyncStorage, which is
 * unencrypted by design (see CLAUDE.md "Known Gotchas").
 *
 * Why chunking: a Supabase session (access JWT + refresh token + user object)
 * routinely exceeds expo-secure-store's ~2048-byte per-value limit. Past that
 * limit SecureStore warns/fails on iOS and risks silent truncation on Android —
 * a truncated session is unparseable, the user appears signed out, and every
 * RLS-protected query starts failing. We split the value across ≤1800-byte chunks
 * under a small manifest at the base key and reassemble on read.
 *
 * Fail-soft contract: `getItem` NEVER throws. A decode/IO failure (corrupt
 * Keychain entry, missing chunk, store unavailable on cold boot) returns null —
 * Supabase treats that as "no session" and mints a fresh anonymous one, rather
 * than throwing out of client init and bricking the sync layer. The crisis path
 * does not depend on this restore (see SupabaseService.trackCrisisDetection).
 */
import * as SecureStore from 'expo-secure-store';

/** Chunk ceiling — comfortably under SecureStore's ~2048-byte/value limit. */
const CHUNK_SIZE = 1800;

/** Manifest marker so a non-adapter value at the base key decodes as "no session". */
const MANIFEST_VERSION = 1;

interface Manifest {
  v: number;
  n: number; // chunk count
}

// AFTER_FIRST_UNLOCK: readable on cold boot after the first device unlock (so the
// session restores + auto-refreshes in the background) WITHOUT gating behind
// biometrics — the session must be readable before the user authenticates to anything.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

const chunkKey = (key: string, i: number): string => `${key}.${i}`;

/**
 * The minimal storage interface Supabase's auth client expects. Async returns are
 * fully supported by supabase-js.
 */
export interface SecureStoreSessionAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

function readManifest(raw: string | null): Manifest | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Manifest>;
    if (parsed && parsed.v === MANIFEST_VERSION && typeof parsed.n === 'number' && parsed.n >= 0) {
      return { v: parsed.v, n: parsed.n };
    }
  } catch {
    // Not our manifest (legacy/foreign value) → treat as no session.
  }
  return null;
}

export function createSecureStoreSessionAdapter(): SecureStoreSessionAdapter {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        const manifest = readManifest(await SecureStore.getItemAsync(key, OPTIONS));
        if (!manifest) return null;

        let out = '';
        for (let i = 0; i < manifest.n; i++) {
          const part = await SecureStore.getItemAsync(chunkKey(key, i), OPTIONS);
          if (part === null) return null; // missing chunk → corrupt → no session
          out += part;
        }
        return out;
      } catch {
        // Keychain unavailable / decode failure: fail soft so client init can't brick.
        return null;
      }
    },

    async setItem(key: string, value: string): Promise<void> {
      // Determine the previous chunk count so we can delete any orphaned trailing
      // chunks when the new (refreshed) session is shorter than the old one.
      const prev = readManifest(await SecureStore.getItemAsync(key, OPTIONS).catch(() => null));
      const prevCount = prev?.n ?? 0;

      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }

      // Write chunks first, then the manifest, so a partially-written session is
      // never advertised as complete by a manifest pointing at missing chunks.
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]!, OPTIONS);
      }
      for (let i = chunks.length; i < prevCount; i++) {
        await SecureStore.deleteItemAsync(chunkKey(key, i), OPTIONS);
      }
      await SecureStore.setItemAsync(
        key,
        JSON.stringify({ v: MANIFEST_VERSION, n: chunks.length } satisfies Manifest),
        OPTIONS,
      );
    },

    async removeItem(key: string): Promise<void> {
      const manifest = readManifest(await SecureStore.getItemAsync(key, OPTIONS).catch(() => null));
      const count = manifest?.n ?? 0;
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(chunkKey(key, i), OPTIONS);
      }
      await SecureStore.deleteItemAsync(key, OPTIONS);
    },
  };
}
