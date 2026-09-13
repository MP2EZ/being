/**
 * Apple transaction identity for App Store Server API verification (INFRA-467 slice 2).
 *
 * The server is migrating off the deprecated `verifyReceipt` endpoint to
 * `GET /inApps/v1/transactions/{transactionId}`, which is keyed on a transaction id
 * rather than a receipt blob. This ships FIRST and ADDITIVELY: a client change goes
 * through App Store review while an edge function deploys in seconds, so the field must
 * be in flight long before anything server-side depends on it. The currently-deployed
 * function destructures only `receiptData` and ignores unknown keys, so sending this to
 * today's server is inert.
 *
 * WHY THIS IS ITS OWN MODULE AND NOT PART OF IAPService. It is pure logic over a plain
 * object and needs nothing from the IAP SDK, while `IAPService.ts` imports
 * `react-native-iap` at module top. Two consequences, both load-bearing: consumers that
 * only need the extractor do not drag the SDK into their module graph, and — the reason
 * it moved here — suites that `jest.mock` IAPService do not have to keep their mock
 * factories in step with every export the store happens to destructure. That coupling is
 * how this helper first broke `__tests__/unit/subscriptionStore.transitions.test.ts`.
 */

/** The only values StoreKit sets, mirroring the server's APPLE_ENVIRONMENTS. */
export const APPLE_ENVIRONMENTS = ['Production', 'Sandbox'] as const;

export type AppleEnvironment = (typeof APPLE_ENVIRONMENTS)[number];

export interface AppleTransactionIdentity {
  transactionId: string;
  /**
   * A ROUTING HINT and nothing more. It selects which Apple host the server asks; it can
   * never grant trust, because the server re-reads the environment claim from Apple's
   * signed response and rejects a mismatch. It is untrusted client input server-side.
   */
  environment?: AppleEnvironment;
}

/**
 * Extract Apple transaction identity from a purchase of unknown shape.
 *
 * Deliberately permissive on the id: the server owns the authoritative format check
 * (`^[0-9]{1,19}$`), and a stricter client-side rule would silently drop legitimate
 * purchases if Apple's id format ever widens. All this rejects is "absent or not a
 * usable string", which is the only case the client can be certain about. The `typeof`
 * test is not defensive dressing — this value crosses a native boundary where the
 * TypeScript annotation is not enforced at runtime.
 *
 * An unrecognized `environment` is OMITTED rather than forwarded. The server fails
 * closed on an unknown value, so passing garbage through would convert a recoverable
 * "caller supplied no hint" into a hard rejection.
 */
export function appleTransactionIdentityFrom(
  purchase: unknown
): AppleTransactionIdentity | undefined {
  const p = purchase as { transactionId?: unknown; environmentIOS?: unknown } | null | undefined;
  const transactionId = p?.transactionId;
  if (typeof transactionId !== 'string' || transactionId.length === 0) {
    return undefined;
  }
  const environment = p?.environmentIOS;
  return typeof environment === 'string' &&
    (APPLE_ENVIRONMENTS as readonly string[]).includes(environment)
    ? { transactionId, environment: environment as AppleEnvironment }
    : { transactionId };
}
