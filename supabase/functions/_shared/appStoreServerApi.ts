/**
 * App Store Server API client (INFRA-467 slice 1).
 *
 * Apple's `verifyReceipt` endpoint is deprecated. This module mints an ES256 App Store
 * Connect token and makes ONE outbound call against one of TWO endpoints. It performs NO
 * verification of the returned artifacts — see "What this module does not do" below.
 *
 *   - `fetchSignedTransactionInfo` -> `GET /inApps/v1/transactions/{transactionId}`.
 *     A point-in-time transaction. Answers "was this purchase real?".
 *     Caller: `verify-apple-receipt` (user-initiated).
 *   - `fetchSubscriptionStatuses` -> `GET /inApps/v1/subscriptions/{originalTransactionId}`.
 *     Current renewal state. Answers "is this STILL renewing?" (DEBUG-474).
 *     Caller: `grace-period-automation` (nightly cron, no principal).
 *
 * EVERY HARDENING PROPERTY BELOW IS PER-FUNCTION, NOT PER-MODULE. Identifier validation
 * before key use, host selection with no default, the `new URL` + origin/protocol
 * re-assertion, `redirect: 'error'`, the request timeout, reading only Apple's numeric
 * `errorCode`, and the 200-carrying-garbage shape check are each written out in both
 * functions on purpose. A third endpoint does not inherit them by being added beside these.
 *
 * ---------------------------------------------------------------------------
 * WHY THE ENVIRONMENT IS A REQUIRED PARAMETER WITH NO DEFAULT
 * ---------------------------------------------------------------------------
 * The legacy path called production, and on status 21007 retried against sandbox. That
 * retry is precisely how a sandbox-minted transaction got accepted as a production one,
 * and deleting it is the security gain this migration buys. So there is exactly one
 * outbound call and no fallback.
 *
 * That relocates the question rather than answering it: SOMEONE still has to say which
 * host to ask. This module validates `environment` but cannot trust it — validated is not
 * the same as trusted. The caller owes a trusted source. Today there is no fully trusted
 * one in this system: `assertAppleAppScope` deliberately declines to pin `environment`
 * (one Supabase project serves prod and dev, and edge secrets are project-wide), and
 * sandbox transactions are free to mint with any sandbox Apple ID.
 *
 * The caller's obligation, therefore: after verifying the returned JWS, compare the
 * `environment` claim INSIDE the signed payload against the environment used to select
 * the host, and reject on mismatch. Returning the raw JWS is what makes that possible.
 * A caller that skips it is no better off than the 21007 fallback it replaced.
 *
 * NEVER add a retry that switches host. Retrying the SAME host on a 5xx would be fine;
 * host-switching retry is the deleted bug growing back.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS MODULE DOES NOT DO
 * ---------------------------------------------------------------------------
 * It does not verify the JWS, and the value it returns is UNVERIFIED. The caller owes
 * `verifyAppleJWS` (proves Apple signed it) followed by `assertAppleAppScope` (proves
 * Apple signed it for THIS app — INFRA-449). It does not decode the payload, persist
 * anything, or log. It never reads `APPLE_SHARED_SECRET` and has no path back to
 * `verifyReceipt`.
 *
 * It also does not rate-limit, and since DEBUG-474 that sentence needs its second half
 * restated. App Store Connect quotas are PER-KEY, and both callers draw on the same key —
 * so an unbounded caller exhausts the quota for the other one, and one of them is the
 * user-facing verification path. Throttling therefore still belongs at the call site, but
 * "the call site knows the authenticated principal" is now true of only ONE caller:
 *
 *   - `verify-apple-receipt` is per-request and principal-scoped; its budget is per-user.
 *   - `grace-period-automation` is a cron with NO principal. It cannot throttle per-user,
 *     so it owes a RUN-SCOPED budget instead: serial calls only, a floor on the interval
 *     between them, a bounded batch, a wall-clock deadline, and an immediate abort of the
 *     whole step on 401/403 or 429 rather than continuing through the batch.
 *
 * That budget lives in `grace-period-automation/`, deliberately not here: a sleep inside
 * this module would silently add latency to the user-facing path as well.
 *
 * ---------------------------------------------------------------------------
 * CONFIGURATION IS A PARAMETER, NOT AN ENV READ
 * ---------------------------------------------------------------------------
 * Nothing under `_shared/` reads `Deno.env` — `receiptCrypto.ts` takes its key as an
 * argument and the deployable function does the lookup. This module follows that: the
 * caller reads `APPLE_ISSUER_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` and passes them
 * in. Three consequences, all deliberate:
 *   - no top-level env read, so importing this module in a secretless test environment
 *     cannot throw an unattributable module-load error;
 *   - tests inject a generated throwaway key instead of mutating the environment;
 *   - `scripts/supabase-deploy-drift.js --reconcile` stays consistent. It fails BOTH on an
 *     undeclared `Deno.env.get` and on a manifest entry nothing reads, so the three Apple
 *     names must enter `supabase/deploy-manifest.json` in the SAME commit that introduces
 *     the read — which is the cutover slice, not this one.
 *
 * The token is signed with a TEAM key (`iss` = issuer id). An INDIVIDUAL App Store Connect
 * key has no issuer and uses `sub: 'user'` instead; the claim set below would 401 with one.
 *
 * ---------------------------------------------------------------------------
 * DATA HANDLING
 * ---------------------------------------------------------------------------
 * The returned JWS is subscription transaction data — personal data under GDPR/CCPA/TDPSA
 * and functionally a bearer-ish verification credential. It is not PHI; Being is not a
 * HIPAA covered entity. It is never logged here, in whole or in part, and neither is any
 * claim decoded from it. This module emits no console output at all, in any environment.
 *
 * Thrown messages are assumed to reach a user: `verify-apple-receipt/index.ts:316` echoes
 * `err.message` into an HTTP response body and `:413`/`:493` write it into
 * `subscription_audit.metadata`. No message here carries key material, the bearer token,
 * the issuer or key id, the transaction id, or Apple's own response text.
 */

import { importPKCS8, SignJWT } from 'https://esm.sh/jose@5.9.6';
import { APPLE_ENVIRONMENTS, BEING_BUNDLE_ID } from './verifyAppleJWS.ts';

/** The two App Store Server API hosts. Selected by environment; never defaulted.
 *
 * These are the forms Apple documents. The older `*.itunes.apple.com` aliases still
 * resolve — each pair shares one Akamai CNAME — so this is a guard against Apple
 * retiring them, not a live fix. Both forms working is NOT a reason to try both:
 * see the no-host-switching-retry rule above. */
export const APP_STORE_SERVER_API_ORIGINS = {
  Production: 'https://api.storekit.apple.com',
  Sandbox: 'https://api.storekit-sandbox.apple.com',
} as const;

/** Fixed audience for App Store Connect API tokens. Never configurable — an env-driven
 * audience would be a token-redirection primitive. */
export const APP_STORE_CONNECT_AUDIENCE = 'appstoreconnect-v1';

/** Token lifetime. Well inside Apple's ceiling so clock skew cannot push us over it. */
export const TOKEN_LIFETIME_SECONDS = 1200;

/** Apple rejects tokens whose lifetime exceeds 60 minutes. Enforced at signing time. */
export const TOKEN_MAX_LIFETIME_SECONDS = 3600;

/** Treat a token as expired this far ahead of its `exp`. There is no retry on a 401, so a
 * token that expires mid-flight is a hard user-visible failure; this margin prevents it. */
export const TOKEN_REFRESH_MARGIN_SECONDS = 300;

/** Decimal digits only, bounded by the int64 range Apple's identifiers live in. NOT pinned
 * to 13 digits: StoreKit 2 ids are commonly 16 and legacy ones 10. */
export const TRANSACTION_ID_PATTERN = /^[0-9]{1,19}$/;

export const REQUEST_TIMEOUT_MS = 10_000;

const TRANSACTION_PATH_PREFIX = '/inApps/v1/transactions/';

/** Apple's subscription-status endpoint (DEBUG-474). A DIFFERENT question from the
 * transactions endpoint above: renewal state, not a point-in-time transaction. Kept a
 * module-scope constant for the same reason as its neighbour — the URL is built from a
 * constant base so an identifier can never rewrite the path. */
const SUBSCRIPTION_PATH_PREFIX = '/inApps/v1/subscriptions/';

/** App Store Connect API credentials, read from function secrets by the caller. */
export interface AppStoreConnectCredentials {
  /** APPLE_ISSUER_ID */
  issuerId: string;
  /** APPLE_KEY_ID */
  keyId: string;
  /** APPLE_PRIVATE_KEY, a PKCS#8 PEM. */
  privateKeyPem: string;
}

export interface SignedTransactionResult {
  /** The validated identifier that was requested. */
  transactionId: string;
  /** Apple's signed transaction JWS, UNVERIFIED. The caller owes verifyAppleJWS +
   * assertAppleAppScope before trusting anything in it. */
  signedTransactionInfo: string;
}

/** One `lastTransactions` entry, reduced to the only two things a caller may trust.
 *
 * Apple's `LastTransactionsItem` also carries an UNSIGNED `status` enum (1-5) and an
 * UNSIGNED `originalTransactionId`, and the enclosing `StatusResponse` carries an unsigned
 * `bundleId` and `environment`. NONE of them are surfaced here, and that is a deliberate
 * structural refusal rather than an oversight:
 *
 *   - the unsigned `status` would be an unauthenticated path to a subscription DOWNGRADE,
 *     and everything it encodes is available from the two signed payloads anyway
 *     (`expiresDate`, `revocationDate`, `isInBillingRetryPeriod`, `gracePeriodExpiresDate`);
 *   - selecting WHICH item is ours is an authorization decision, so it must be made on the
 *     id decoded from the VERIFIED transaction payload, never on the unsigned one beside it;
 *   - an unsigned field that is merely "checked as a fast pre-flight" is exactly the shape a
 *     later edit keeps while deleting the signed check it was supposed to be cheaper than.
 *
 * Not returning them means no caller can regress into trusting them.
 */
export interface SignedSubscriptionStatusItem {
  /** Apple's signed transaction JWS, UNVERIFIED. Carries `bundleId`, so this is the half
   * that can establish app scope. */
  signedTransactionInfo: string;
  /** Apple's signed renewal JWS, UNVERIFIED. Carries NO `bundleId` (confirmed against
   * Apple's `JWSRenewalInfoDecodedPayload` spec), so it can NEVER be app-scoped on its own —
   * the caller must bind it to the transaction half above by requiring their
   * `originalTransactionId` and `environment` claims to match. */
  signedRenewalInfo: string;
}

export interface SignedSubscriptionStatusResult {
  /** The validated identifier that was requested. */
  originalTransactionId: string;
  /** Every signed pair Apple returned, flattened across subscription groups. The caller
   * selects its own by decoding, never by position — Apple does not promise an order and
   * the array can span several groups. */
  items: SignedSubscriptionStatusItem[];
}

export interface FetchOptions {
  /** Injected for tests, which cannot reach the network under `--cached-only`. */
  fetchImpl?: typeof fetch;
  /** Injected for tests. Milliseconds since epoch. */
  now?: () => number;
}

// ---------------------------------------------------------------------------
// Errors — four distinct types, deliberately not collapsed.
//
// Collapsing a 401 into the same bucket as a 404 makes a key-rotation outage present as
// "every user suddenly has an invalid receipt", and the audit table records it that way.
// The two need opposite responses and opposite HTTP statuses at the call site.
// ---------------------------------------------------------------------------

/** Our own pre-flight rejection of a malformed identifier. Maps to 4xx; no call was made. */
export class InvalidTransactionIdError extends Error {
  constructor() {
    super('Transaction identifier is missing or malformed');
    this.name = 'InvalidTransactionIdError';
  }
}

/** Missing or unusable App Store Connect credentials. Ours to fix; maps to 5xx. */
export class AppStoreConnectConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppStoreConnectConfigError';
  }
}

/** Apple rejected our token (401/403): misconfiguration or a revoked key. Maps to 5xx —
 * never to a "your receipt is invalid" answer. */
export class AppleAuthError extends Error {
  constructor(public readonly status: number, public readonly errorCode?: number) {
    super('App Store Server API rejected this service\'s credentials');
    this.name = 'AppleAuthError';
  }
}

/** Apple has no such transaction for this app (404). The caller's identifier is bogus or
 * belongs to someone else's app. Maps to 4xx. */
export class TransactionNotFoundError extends Error {
  constructor(public readonly errorCode?: number) {
    super('No App Store transaction matches this identifier');
    this.name = 'TransactionNotFoundError';
  }
}

/** Transient upstream failure (429/5xx/timeout), or any status we do not classify. */
export class AppleUnavailableError extends Error {
  constructor(public readonly status: number, public readonly errorCode?: number) {
    super('App Store Server API is unavailable');
    this.name = 'AppleUnavailableError';
  }
}

// ---------------------------------------------------------------------------
// Input validation — both run before any key use or network call.
// ---------------------------------------------------------------------------

/**
 * Validate a transaction identifier arriving from an untrusted request body.
 *
 * This value is interpolated into a URL PATH SEGMENT, so an unvalidated one can rewrite
 * the path (`../../inApps/v1/lookup/x`) or append a query. `encodeURIComponent` alone is
 * necessary but not sufficient: it bounds nothing, and lets arbitrary junk consume the
 * per-key Apple rate quota.
 *
 * Returns the identifier as a STRING. Never coerce it to a number — values above 2^53
 * lose precision and would silently query a different transaction.
 */
export function assertValidTransactionId(value: unknown): string {
  if (typeof value !== 'string' || !TRANSACTION_ID_PATTERN.test(value)) {
    throw new InvalidTransactionIdError();
  }
  return value;
}

/**
 * Three non-empty dot-separated segments. A shape check, not a verification — it only
 * distinguishes "Apple sent us a JWS-looking string" from "Apple sent us garbage or null".
 * Proving Apple actually signed it is `verifyAppleJWS`'s job, at the call site.
 */
function isJwsShaped(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const segments = value.split('.');
  return segments.length === 3 && segments.every((segment) => segment.length > 0);
}

/**
 * Select the API host for an environment. Fails closed on anything unrecognized — there is
 * no default host, in either direction. Mirrors `assertAppleAppScope`'s rule that an unset
 * environment must never be read as "unknown, allow".
 */
export function resolveApiOrigin(environment: unknown): string {
  if (
    typeof environment !== 'string' ||
    !(APPLE_ENVIRONMENTS as readonly string[]).includes(environment)
  ) {
    throw new Error(
      `Unrecognized App Store environment — refusing to select a host. ` +
        `Expected one of ${APPLE_ENVIRONMENTS.join(', ')}.`,
    );
  }
  return APP_STORE_SERVER_API_ORIGINS[environment as keyof typeof APP_STORE_SERVER_API_ORIGINS];
}

// ---------------------------------------------------------------------------
// Token cache.
//
// A module-scope cache is safe HERE, and the reason is narrow enough to be worth stating:
// this token is a function of {issuer, key id, private key, bundle id} and NOTHING derived
// from the request. An isolate reused across users therefore leaks nothing between them.
// That is the entire safety argument. The next thing someone is tempted to cache at module
// scope in an edge function will be request-derived, and this comment is what should stop
// them. Nothing else in this module caches — a cached Apple response would be a
// stale-entitlement bug, and negative-caching a 404 would be worse.
//
// Correctness never depends on the cache. Isolates are evicted arbitrarily and there is no
// cross-isolate coordination, so N isolates hold N distinct valid tokens; Apple permits
// that. Never share it via Postgres and never write it to a table.
//
// The token is NOT keyed on environment. It carries no host scope, so keying it that way
// would double the signing rate and imply a scoping that does not exist.
// ---------------------------------------------------------------------------

interface CachedToken {
  token: string;
  expSeconds: number;
  issuerId: string;
  keyId: string;
}

let cachedToken: CachedToken | null = null;

/** Test-only. Module-scope state otherwise makes test order load-bearing. */
export function __resetTokenCacheForTests(): void {
  cachedToken = null;
}

function assertUsableCredential(value: string, envName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppStoreConnectConfigError(`${envName} is not configured`);
  }
  return value;
}

/**
 * Import the PKCS#8 PEM.
 *
 * The PEM stays a local and is never stored, closed over, or attached to any object; only
 * the resulting non-extractable CryptoKey exists after this returns, and that is discarded
 * too — at one signature per ~15 minutes, re-importing is cheaper than owning a second
 * cache with its own invalidation rules.
 *
 * The original error is DISCARDED rather than wrapped: ASN.1/DER failures can echo decoded
 * fragments of the input, and this message is assumed to reach a response body.
 */
async function importSigningKey(privateKeyPem: string): Promise<CryptoKey> {
  // Supabase secrets pasted through a shell commonly arrive with literal backslash-n.
  const normalized = privateKeyPem.replace(/\\n/g, '\n');
  try {
    return await importPKCS8(normalized, 'ES256') as CryptoKey;
  } catch {
    throw new AppStoreConnectConfigError('APPLE_PRIVATE_KEY is not a valid PKCS#8 PEM');
  }
}

async function getBearerToken(
  credentials: AppStoreConnectCredentials,
  nowMs: number,
): Promise<string> {
  const issuerId = assertUsableCredential(credentials.issuerId, 'APPLE_ISSUER_ID');
  const keyId = assertUsableCredential(credentials.keyId, 'APPLE_KEY_ID');
  assertUsableCredential(credentials.privateKeyPem, 'APPLE_PRIVATE_KEY');

  const nowSeconds = Math.floor(nowMs / 1000);

  // Reuse only if it is the same credential pair AND outside the refresh margin. A
  // credential change must never be served from a token minted under the old one.
  if (
    cachedToken &&
    cachedToken.issuerId === issuerId &&
    cachedToken.keyId === keyId &&
    nowSeconds < cachedToken.expSeconds - TOKEN_REFRESH_MARGIN_SECONDS
  ) {
    return cachedToken.token;
  }

  // A runtime invariant, not merely a well-chosen constant: a silent drift past Apple's
  // 60-minute ceiling 401s 100% of verifications, which is not a failure anyone would
  // read as "the token lifetime changed".
  if (TOKEN_LIFETIME_SECONDS > TOKEN_MAX_LIFETIME_SECONDS) {
    throw new AppStoreConnectConfigError(
      'App Store Connect token lifetime exceeds the 3600s maximum',
    );
  }

  const signingKey = await importSigningKey(credentials.privateKeyPem);
  const expSeconds = nowSeconds + TOKEN_LIFETIME_SECONDS;

  // Exactly five claims. Anything extra is at best ignored and at worst a 401 that gets
  // misdiagnosed as a credential problem. `bid` is imported, never parameterised: it is the
  // only claim scoping this token to our app, so INFRA-449's assertion and this token
  // cannot disagree about who we are.
  const token = await new SignJWT({ bid: BEING_BUNDLE_ID })
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuerId)
    .setAudience(APP_STORE_CONNECT_AUDIENCE)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(expSeconds)
    .sign(signingKey);

  cachedToken = { token, expSeconds, issuerId, keyId };
  return token;
}

/** Read Apple's documented numeric errorCode, ignoring the free-text errorMessage beside
 * it. The code is a low-entropy documented enum and is safe to carry as a structured
 * field; the message is upstream text that must not reach our error surface. */
async function readErrorCode(response: Response): Promise<number | undefined> {
  try {
    const body = await response.json();
    return typeof body?.errorCode === 'number' ? body.errorCode : undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// The request
// ---------------------------------------------------------------------------

/**
 * Fetch Apple's signed transaction info for one transaction. Exactly one outbound call.
 *
 * The returned JWS is UNVERIFIED — see the module header.
 */
export async function fetchSignedTransactionInfo(
  transactionId: unknown,
  environment: unknown,
  credentials: AppStoreConnectCredentials,
  options: FetchOptions = {},
): Promise<SignedTransactionResult> {
  // Order matters: a malformed identifier must cost no key import and no network call.
  const id = assertValidTransactionId(transactionId);
  const origin = resolveApiOrigin(environment);

  const doFetch = options.fetchImpl ?? globalThis.fetch;
  const nowMs = (options.now ?? Date.now)();
  const token = await getBearerToken(credentials, nowMs);

  // Built from a constant base rather than concatenated, then re-asserted. The origin and
  // protocol checks are the backstop that makes the bearer token un-redirectable — they
  // hold even if the identifier pattern is loosened by a later edit.
  const url = new URL(`${TRANSACTION_PATH_PREFIX}${encodeURIComponent(id)}`, origin);
  if (url.origin !== origin || url.protocol !== 'https:') {
    throw new InvalidTransactionIdError();
  }

  let response: Response;
  try {
    response = await doFetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      // A 3xx would forward the Authorization header off-origin.
      redirect: 'error',
      // There is no retry, so an unbounded hang would burn the function's whole wall
      // clock and produce no audit row at all.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new AppleUnavailableError(0);
  }

  if (!response.ok) {
    const errorCode = await readErrorCode(response);
    if (response.status === 401 || response.status === 403) {
      // Drop the token before throwing: the next request in this isolate must not reuse
      // one Apple just rejected, or a single bad token becomes a persistent outage.
      cachedToken = null;
      throw new AppleAuthError(response.status, errorCode);
    }
    if (response.status === 404) {
      throw new TransactionNotFoundError(errorCode);
    }
    // Everything unclassified lands here on purpose. It maps to 5xx at the call site,
    // i.e. "not the user's fault" — the safe direction to be wrong in.
    throw new AppleUnavailableError(response.status, errorCode);
  }

  let payload: { signedTransactionInfo?: unknown };
  try {
    payload = await response.json();
  } catch {
    throw new AppleUnavailableError(response.status);
  }

  // A 200 carrying garbage must fail HERE rather than propagating as success. This is a
  // shape check only — the payload is deliberately not decoded or inspected.
  const signedTransactionInfo = payload?.signedTransactionInfo;
  if (!isJwsShaped(signedTransactionInfo)) {
    throw new AppleUnavailableError(response.status);
  }

  return { transactionId: id, signedTransactionInfo: signedTransactionInfo as string };
}

/**
 * Fetch Apple's signed subscription statuses for one subscription. Exactly one outbound
 * call (DEBUG-474).
 *
 * Re-verification asks "is this STILL renewing?", which is renewal state — not the
 * point-in-time transaction `/inApps/v1/transactions/{id}` returns. Apple keys this endpoint
 * on any transaction id in the subscription's history, and
 * `subscriptions.original_transaction_id` is plaintext, so no receipt is ever decrypted to
 * make this call.
 *
 * NO `?status=` FILTER IS SENT, deliberately. Filtering server-side on Apple's unsigned
 * status enum would make an unsigned field decide which rows get processed at all — the same
 * misuse the return type refuses, relocated into the query string where it is harder to see.
 *
 * The returned JWS strings are UNVERIFIED — see the module header. The caller owes
 * `verifyAppleJWS` on BOTH halves, `assertAppleAppScope` on the transaction half, and the
 * environment cross-check.
 */
export async function fetchSubscriptionStatuses(
  originalTransactionId: unknown,
  environment: unknown,
  credentials: AppStoreConnectCredentials,
  options: FetchOptions = {},
): Promise<SignedSubscriptionStatusResult> {
  // Order matters: a malformed identifier must cost no key import and no network call.
  const id = assertValidTransactionId(originalTransactionId);
  const origin = resolveApiOrigin(environment);

  const doFetch = options.fetchImpl ?? globalThis.fetch;
  const nowMs = (options.now ?? Date.now)();
  const token = await getBearerToken(credentials, nowMs);

  const url = new URL(`${SUBSCRIPTION_PATH_PREFIX}${encodeURIComponent(id)}`, origin);
  if (url.origin !== origin || url.protocol !== 'https:') {
    throw new InvalidTransactionIdError();
  }

  let response: Response;
  try {
    response = await doFetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      // A 3xx would forward the Authorization header off-origin.
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new AppleUnavailableError(0);
  }

  if (!response.ok) {
    const errorCode = await readErrorCode(response);
    if (response.status === 401 || response.status === 403) {
      // Drop the token before throwing — one Apple just rejected must not be reused.
      cachedToken = null;
      throw new AppleAuthError(response.status, errorCode);
    }
    if (response.status === 404) {
      throw new TransactionNotFoundError(errorCode);
    }
    // NEVER retry against the other host here. A 404 from Production does not mean "try
    // Sandbox" — that is the deleted 21007 fallback, and a nightly cron nobody watches is
    // the easiest place for it to grow back.
    throw new AppleUnavailableError(response.status, errorCode);
  }

  let payload: { data?: unknown };
  try {
    payload = await response.json();
  } catch {
    throw new AppleUnavailableError(response.status);
  }

  // A 200 carrying garbage fails HERE rather than propagating as success, matching
  // `fetchSignedTransactionInfo`. Shape only — nothing is decoded or inspected.
  //
  // A caller distinguishes this from a genuine upstream outage by the status: an
  // AppleUnavailableError carrying 200 is a malformed payload, not an unavailable Apple.
  const groups = payload?.data;
  if (!Array.isArray(groups)) {
    throw new AppleUnavailableError(response.status);
  }

  const items: SignedSubscriptionStatusItem[] = [];
  for (const group of groups) {
    const lastTransactions = (group as { lastTransactions?: unknown })?.lastTransactions;
    // An absent array is malformed; a present-but-empty one is legitimate (Apple can return
    // a group with nothing in it) and is left for the caller to interpret.
    if (!Array.isArray(lastTransactions)) {
      throw new AppleUnavailableError(response.status);
    }
    for (const item of lastTransactions) {
      const signedTransactionInfo = (item as { signedTransactionInfo?: unknown })
        ?.signedTransactionInfo;
      const signedRenewalInfo = (item as { signedRenewalInfo?: unknown })?.signedRenewalInfo;
      // BOTH halves are required. The renewal half cannot be app-scoped on its own, so an
      // item missing its transaction half is unusable, and an item missing its renewal half
      // cannot answer the question this endpoint was called to answer. Fail closed rather
      // than returning a partially-usable item a caller might act on.
      if (!isJwsShaped(signedTransactionInfo) || !isJwsShaped(signedRenewalInfo)) {
        throw new AppleUnavailableError(response.status);
      }
      items.push({
        signedTransactionInfo: signedTransactionInfo as string,
        signedRenewalInfo: signedRenewalInfo as string,
      });
    }
  }

  // An empty `items` is returned as-is, NOT thrown. Apple answering "I have no subscription
  // records for this id" is a real answer; the caller must decide what it means, and the
  // ruling in grace-period-automation is that it never means "expired".
  return { originalTransactionId: id, items };
}
