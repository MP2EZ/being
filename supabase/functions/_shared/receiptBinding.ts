/**
 * IAP cross-identity replay guard (INFRA-260 PR2).
 *
 * The verify-{apple,google}-receipt functions write with the SERVICE-ROLE key,
 * which bypasses RLS — so the "one transaction → one auth.uid()" rule can't be an
 * RLS policy. It is this explicit ownership check, backed by the
 * uniq_txn_per_platform UNIQUE index as the TOCTOU race backstop.
 */

/** Thrown when a receipt's transaction is already bound to a different user. */
export class ReceiptReplayError extends Error {
  constructor(public readonly platform: string, public readonly txnId: string) {
    super('Receipt already bound to another account');
    this.name = 'ReceiptReplayError';
  }
}

/**
 * Thrown when a verification produced no usable stable transaction identifier (DEBUG-447).
 *
 * This exists because the guard below used to FAIL OPEN on exactly this input: an absent or
 * empty identifier took an early `return`, so the caller went on to write a `subscriptions`
 * row with no binding — an entitlement with no replay guard from that moment forward. The
 * database did not backstop it either, and structurally could not: `uniq_txn_per_platform` is
 * UNIQUE, and Postgres treats every NULL as distinct from every other NULL, so unlimited rows
 * with a NULL identifier are permitted per platform regardless of the index's WHERE clause.
 * Both layers vanished together, and silently.
 */
export class InvalidTransactionIdentifierError extends Error {
  constructor(public readonly platform: string) {
    super('Verification produced no stable transaction identifier');
    this.name = 'InvalidTransactionIdentifierError';
  }
}

/**
 * True when a value is a usable stable transaction identifier.
 *
 * `typeof` rather than a falsy test, deliberately: this value crosses an external JSON
 * boundary (Apple's / Google's verification response) where TypeScript's `string | undefined`
 * annotation is not enforced at runtime, so a number or an object can arrive here. That is not
 * a hypothetical for the App Store Server API migration (INFRA-438 / INFRA-449), which changes
 * how the identifier is derived. The same `typeof x !== 'string'` shape is already used for
 * JWT payload validation in _shared/auth.ts and both verifiers.
 */
export function isUsableTransactionIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Reject cross-identity replay. If (platform, originalTransactionId) is already
 * bound to a DIFFERENT auth.uid(), throw ReceiptReplayError. Same-uid
 * re-verification (restore-purchases) returns normally → idempotent refresh.
 *
 * FAILS CLOSED on a missing identifier (DEBUG-447): an absent, empty or non-string value
 * throws InvalidTransactionIdentifierError rather than returning early. A caller that cannot
 * produce a stable identifier must not write a `subscriptions` row at all — see AC2 — and
 * because this throw happens BEFORE the upsert in both verifiers, it does not.
 *
 * No legitimate caller is broken by this. Google truthy-validates `purchaseToken` at request
 * parsing before this is ever reached; Apple only calls the writer when `verification.valid`,
 * which requires `latest_receipt_info[0].original_transaction_id` to be present. There is no
 * trial, promo, sandbox or restore path that reaches a valid verification without one.
 */
export async function assertNoCrossIdentityReplay(
  supabase: any,
  platform: string,
  originalTransactionId: string | undefined,
  authUid: string,
): Promise<void> {
  if (!isUsableTransactionIdentifier(originalTransactionId)) {
    throw new InvalidTransactionIdentifierError(platform);
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('platform', platform)
    .eq('original_transaction_id', originalTransactionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Replay ownership check failed: ${error.message}`);
  }
  if (data && data.user_id !== authUid) {
    throw new ReceiptReplayError(platform, originalTransactionId);
  }
}

/** True if a thrown error is the constraint backstop firing on the TOCTOU race. */
export function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  const msg = (err as { message?: string })?.message ?? '';
  return code === '23505' || /duplicate key|unique constraint/i.test(msg);
}
