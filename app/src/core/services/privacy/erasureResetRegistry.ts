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
 * subscriptionStore (DEBUG-697), supabaseService (DEBUG-698 — its backup retry
 * queue; the key's sweep entry is inert without this reset), and consentStore and
 * settingsStore (DEBUG-755 — memory only; their disk records are the wipe's job).
 * Audited and NOT registered: the journal (no in-memory cache — every read goes to
 * storage) and SessionStorageService (stateless; its blobs are in
 * WELLNESS_SECURE_STORE_KEYS).
 *
 * Bounded (DEBUG-789): a reset that never settles (a hung SecureStore write) must
 * not hang the deletion screen or the launch resume path, so the whole run races
 * ONE deadline. An owner still pending at the deadline is reported in `timedOut`
 * and the wipe proceeds; its late settlement is inert. A late reset must therefore
 * be safe to land after the wipe — each owner guards that itself (erasure
 * generation / epoch), never this registry.
 *
 * SyncCoordinator was deleted in MAINT-702; any successor must register an
 * erasure reset and sweep its keys.
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

/** The one registry-wide deadline for a full run of resets (DEBUG-789). */
export const ERASURE_RESET_DEADLINE_MS = 3_000;

export type ErasureResetOutcome = {
  /** Owners whose reset threw or rejected before the deadline. */
  failed: string[];
  /** Owners whose reset was still pending at the deadline. Distinct from `failed`. */
  timedOut: string[];
};

/**
 * Run every registered reset and settle all of them, or stop waiting at
 * ERASURE_RESET_DEADLINE_MS. Never rejects: a store that fails to reset must not
 * stop the others or the wipe that follows.
 */
export async function resetInMemoryStateForErasure(): Promise<ErasureResetOutcome> {
  const entries = [...resets.entries()];
  const status: Array<'pending' | 'fulfilled' | 'rejected'> = entries.map(() => 'pending');

  // `.then` turns a synchronous throw into a rejection, so it settles too. Each
  // branch records its own outcome and swallows its rejection, so a reset that
  // settles after the deadline is inert rather than an unhandled rejection.
  const runs = entries.map(([, reset], i) =>
    Promise.resolve()
      .then(reset)
      .then(
        () => {
          status[i] = 'fulfilled';
        },
        () => {
          status[i] = 'rejected';
        },
      ),
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ERASURE_RESET_DEADLINE_MS);
  });
  try {
    await Promise.race([Promise.all(runs), deadline]);
  } finally {
    clearTimeout(timer);
  }

  return {
    failed: entries.filter((_, i) => status[i] === 'rejected').map(([owner]) => owner),
    timedOut: entries.filter((_, i) => status[i] === 'pending').map(([owner]) => owner),
  };
}
