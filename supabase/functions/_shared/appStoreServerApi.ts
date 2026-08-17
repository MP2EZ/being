/**
 * App Store Server API client (INFRA-467 slice 1).
 *
 * Apple's `verifyReceipt` endpoint is deprecated. Its replacement is
 * `GET /inApps/v1/transactions/{transactionId}`, which returns a freshly-signed
 * `signedTransactionInfo` JWS, authenticated by an ES256 JWT signed with an App Store
 * Connect API key. This module mints that token and makes that one call. It performs NO
 * verification of the returned artifact — see "What this module does not do" below.
 *
 * Slice 1 is wired to nothing. `verify-apple-receipt/index.ts` still runs the legacy path.
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
 * It also does not rate-limit. One authenticated request drives one outbound call with a
 * caller-supplied identifier, and App Store Connect quotas are per-key — so unbounded
 * enumeration by one caller exhausts the quota for every other. Throttling belongs at the
 * call site, which knows the authenticated principal.
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

/** The two App Store Server API hosts. Selected by environment; never defaulted. */
export const APP_STORE_SERVER_API_ORIGINS = {
  Production: 'https://api.storekit.itunes.apple.com',
  Sandbox: 'https://api.storekit-sandbox.itunes.apple.com',
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
  if (
    typeof signedTransactionInfo !== 'string' ||
    signedTransactionInfo.split('.').length !== 3 ||
    signedTransactionInfo.split('.').some((segment) => segment.length === 0)
  ) {
    throw new AppleUnavailableError(response.status);
  }

  return { transactionId: id, signedTransactionInfo };
}
