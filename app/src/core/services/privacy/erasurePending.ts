/**
 * DEBUG-763 — the erasure marker: the server erased the account, the local half has not
 * finished. Written by `deleteAccountAndWipe` once the server confirms, cleared only after
 * the wipe resolves, so a kill or a throw in between leaves it for the next launch:
 * `readErasureRetirement` treats the launch as retired, and `resumeInterruptedErasure`
 * finishes the wipe.
 *
 * AsyncStorage, value = the server-erasure epoch ms and nothing else (no identifier). The
 * key matches no sweep pattern (pinned in interruptedErasureResume.privacy.test.ts), so a
 * partial wipe cannot remove it before its owner clears it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ERASURE_PENDING_KEY = '@being/erasure_pending';

/** Below this a value is not an erasure time (2001-09-09): a stray write reads as absent. */
const MIN_EPOCH_MS = 1e12;

export async function markErasurePending(erasedAt: number): Promise<void> {
  await AsyncStorage.setItem(ERASURE_PENDING_KEY, String(erasedAt));
}

export async function clearErasurePending(): Promise<void> {
  await AsyncStorage.removeItem(ERASURE_PENDING_KEY);
}

/** The server-erasure time, or null when absent or not a time. Never rejects: a fault is null. */
export async function readErasurePendingAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(ERASURE_PENDING_KEY);
    const at = raw === null ? NaN : Number(raw);
    return Number.isSafeInteger(at) && at >= MIN_EPOCH_MS ? at : null;
  } catch {
    return null;
  }
}

export async function readErasurePending(): Promise<boolean> {
  return (await readErasurePendingAt()) !== null;
}
