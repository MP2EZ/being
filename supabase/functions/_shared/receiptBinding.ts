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
 * Reject cross-identity replay. If (platform, originalTransactionId) is already
 * bound to a DIFFERENT auth.uid(), throw ReceiptReplayError. Same-uid
 * re-verification (restore-purchases) returns normally → idempotent refresh.
 */
export async function assertNoCrossIdentityReplay(
  supabase: any,
  platform: string,
  originalTransactionId: string | undefined,
  authUid: string,
): Promise<void> {
  if (!originalTransactionId) return;

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
