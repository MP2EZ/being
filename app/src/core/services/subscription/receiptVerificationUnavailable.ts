/**
 * DEBUG-715 — "the purchase could not be verified YET", kept apart from "the receipt is
 * invalid".
 *
 * Receipt verification needs a per-user session (the edge functions read identity from
 * the JWT). When none can be acquired — offline, or the client cannot be built — the
 * receipt was never judged. processVerifiedPurchase throws this so logs separate the two
 * outcomes, and leaves the transaction unfinished so the platform offers it again.
 *
 * The message must never say the payment failed: it did not, and nothing here knows
 * anything about the payment.
 *
 * A standalone module, like appleTransactionIdentity: the store imports it statically,
 * and suites that stub IAPService need not mirror it.
 */

export type ReceiptVerificationUnavailableReason = 'no_session' | 'client_unavailable';

export class ReceiptVerificationUnavailableError extends Error {
  readonly reason: ReceiptVerificationUnavailableReason;

  constructor(reason: ReceiptVerificationUnavailableReason) {
    super(`Purchase not verified yet (${reason}); it will be offered again`);
    this.name = 'ReceiptVerificationUnavailableError';
    this.reason = reason;
  }
}
