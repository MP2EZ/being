/**
 * DEBUG-763 — the local erasure in flight (a warm deletion's, or a launch's resume), so a
 * consent write made meanwhile lands after the wipe instead of being deleted by it.
 * consentStore awaits it in verifyAge / recordLegalGateConsents / grantConsent.
 *
 * A leaf with no imports on purpose: consentStore cannot import AccountDeletionService
 * (which imports consentStore).
 */

let inFlight: Promise<void> | null = null;

/** Resolves when no local erasure is running; never rejects. */
export function awaitErasureInFlight(): Promise<void> {
  return inFlight ?? Promise.resolve();
}

export function trackErasureInFlight(erasure: Promise<unknown>): void {
  const settled = erasure.then(
    () => undefined,
    () => undefined,
  );
  inFlight = settled;
  void settled.then(() => {
    if (inFlight === settled) inFlight = null;
  });
}
