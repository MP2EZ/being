/**
 * erasureResetRegistry (DEBUG-671) — in-memory state that account erasure must drop.
 *
 * `clearAllWellnessData` wipes DISK. A Zustand store still holding pre-erasure
 * records in memory writes them straight back on its next persist, so erasure
 * also has to reset each store's memory, and do it BEFORE the wipe so a write
 * already in flight lands on disk that is about to be cleared.
 *
 * Stores register themselves at module scope, which keeps `core/` free of
 * imports from `features/` (the MAINT-659 boundary). A store whose module was
 * never imported holds no state, so an absent registration is correct by
 * construction, not a gap.
 *
 * Owners registered today: stoicPracticeStore, assessmentStore, educationStore,
 * subscriptionStore, syncCoordinator (DEBUG-697) and supabaseService (DEBUG-698 —
 * its backup retry queue; the key's sweep entry is inert without this reset).
 * Audited and NOT registered: consentStore (it holds the erasure-excluded consent
 * record, and `resetConsent` deletes excluded keys), the journal (no in-memory
 * cache — every read goes to storage) and SessionStorageService (stateless; its
 * blobs are in WELLNESS_SECURE_STORE_KEYS).
 *
 * syncCoordinator is DORMANT in production and registered anyway. Evidence
 * (2026-10-03): `initialize()` has no production caller, its only production
 * consumer is SyncStatusIndicator calling the read-only `getStatus()`, and its
 * queue entries carry no record content (`data: {}`). REVIVAL PRECONDITION: its
 * AsyncStorage keys (`@being/sync/*`, `@being/sync_coordinator/*`) match no
 * erasure sweep, and once initialized it re-queues on every assessmentStore
 * change, including this registry's own reset. Sweep those keys before reviving it.
 *
 * Dependency-free on purpose: nothing here may import a store.
 */

export type ErasureReset = () => void | Promise<void>;

const resets = new Map<string, ErasureReset>();

/** Register (or replace) the in-memory reset for `owner`. */
export function registerErasureReset(owner: string, reset: ErasureReset): void {
  resets.set(owner, reset);
}

/** The registered owners, for tests and audit. */
export function registeredErasureResetOwners(): string[] {
  return [...resets.keys()];
}

/**
 * Run every registered reset and settle all of them. Never rejects: a store that
 * fails to reset must not stop the others or the wipe that follows. Returns the
 * owners whose reset threw or rejected.
 */
export async function resetInMemoryStateForErasure(): Promise<string[]> {
  const entries = [...resets.entries()];
  const results = await Promise.allSettled(
    // `.then` turns a synchronous throw into a rejection, so it settles too.
    entries.map(([, reset]) => Promise.resolve().then(reset)),
  );
  return entries.filter((_, i) => results[i]!.status === 'rejected').map(([owner]) => owner);
}
