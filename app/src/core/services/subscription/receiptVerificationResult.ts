/**
 * DEBUG-708 — what IAPService.verifyReceipt reports: what the server said, and nothing it
 * did not.
 *
 * Success carries the verified facts the edge functions return (productId, isTrialPeriod,
 * expiry). A failure carries only how it failed: the HTTP status and the body's error for
 * a non-2xx response, or a failure kind. A rejected body can include the verification
 * itself (the Apple 400 spreads it), and none of that surfaces — the store must never read
 * a product or trial flag from a receipt the server refused.
 *
 * Every optional key is absent rather than undefined, so a toStrictEqual table can pin the
 * exact shape. Pure module, like appleTransactionIdentity: the store imports the type
 * statically, and suites that stub IAPService need not mirror it.
 */

import type { ReceiptVerificationUnavailableReason } from './receiptVerificationUnavailable';

/**
 * - `http`        the edge function answered with a non-2xx status (`httpStatus` is set).
 * - `network`     no answer: the request never reached the function, or the relay failed.
 * - `client`      the app could not build the request (a missing purchase token or id).
 * - `unavailable` no session to verify with (DEBUG-715); `reason` says which.
 */
export type ReceiptVerificationFailure = 'network' | 'http' | 'client' | 'unavailable';

export interface ReceiptVerificationResult {
  valid: boolean;
  subscriptionId?: string;
  expiresDate?: number;
  productId?: string;
  isTrialPeriod?: boolean;
  httpStatus?: number;
  failure?: ReceiptVerificationFailure;
  error?: string;
  /** DEBUG-715: set only when the receipt could not be judged at all (no session / no client). */
  reason?: ReceiptVerificationUnavailableReason;
}

/** The success body both verify edge functions return. */
export interface VerifyReceiptResponse {
  valid: boolean;
  subscriptionId?: string;
  expiresDate?: string;
  productId?: string;
  isTrialPeriod?: boolean;
  error?: string;
}

/** A 2xx body. Only a valid one contributes verified facts. */
export function resultFromResponse(data: VerifyReceiptResponse): ReceiptVerificationResult {
  if (!data.valid) {
    return {
      valid: false,
      httpStatus: 200,
      ...(typeof data.error === 'string' ? { error: data.error } : {}),
    };
  }
  return {
    valid: true,
    ...(data.subscriptionId ? { subscriptionId: data.subscriptionId } : {}),
    ...(data.expiresDate ? { expiresDate: new Date(data.expiresDate).getTime() } : {}),
    ...(data.productId ? { productId: data.productId } : {}),
    isTrialPeriod: data.isTrialPeriod === true,
    httpStatus: 200,
  };
}

/**
 * The error `functions.invoke` returned. Dispatches on `name`, never `instanceof`: the
 * supabase-js error classes are not guaranteed to be the same class objects across
 * bundles, and the name is their documented discriminator.
 */
export async function classifyInvokeError(err: unknown): Promise<ReceiptVerificationResult> {
  const e = (err ?? {}) as { name?: unknown; message?: unknown; context?: unknown };
  const message = typeof e.message === 'string' ? e.message : 'Receipt verification failed';

  if (e.name === 'FunctionsHttpError') {
    const context = (e.context ?? {}) as { status?: unknown; json?: unknown };
    let bodyError: string | undefined;
    if (typeof context.json === 'function') {
      try {
        const body = (await (context.json as () => Promise<unknown>)()) as { error?: unknown } | null;
        if (body && typeof body.error === 'string') bodyError = body.error;
      } catch {
        // An unparseable body leaves the client's own message.
      }
    }
    return {
      valid: false,
      failure: 'http',
      ...(typeof context.status === 'number' ? { httpStatus: context.status } : {}),
      error: bodyError ?? message,
    };
  }

  // FunctionsFetchError, FunctionsRelayError, or anything else invoke hands back: no
  // answer from the function itself.
  return { valid: false, failure: 'network', error: message };
}
