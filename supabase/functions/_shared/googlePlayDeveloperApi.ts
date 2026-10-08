/**
 * Google Play Developer API client (DEBUG-752).
 *
 * The Google counterpart of `appStoreServerApi.ts`. It mints a service-account OAuth token
 * and makes ONE lookup against `purchases.subscriptions.get`. It decides nothing about
 * entitlement: `verify-google-receipt` parses the returned purchase.
 *
 *   - `getGoogleAccessToken` -> POST https://oauth2.googleapis.com/token with an RS256
 *     JWT-bearer assertion signed by the service account's private key. Before DEBUG-752 the
 *     assertion was `${header}.${payload}.signature_placeholder`, so Google rejected every
 *     request and no Google receipt could ever verify.
 *   - `fetchSubscriptionPurchase` -> GET androidpublisher/v3/applications/{pkg}/purchases/
 *     subscriptions/{subscriptionId}/tokens/{purchaseToken}.
 *
 * WHY THE URL HARDENING SHIPS WITH THE SIGNING FIX. While the token request always failed,
 * the client-supplied identifiers interpolated into the lookup path never reached Google.
 * A real token makes them live: an unvalidated `subscriptionId` or `purchaseToken` of `..`
 * (which `encodeURIComponent` leaves untouched, and which WHATWG URL parsing resolves, as it
 * does `%2e%2e`) would send Being's bearer token to a path the caller chose. So identifiers
 * are pattern-checked BEFORE a token is minted, the URL is built from a constant base, and
 * the resulting origin and exact path are re-asserted. The package name is never taken from
 * the request at all — the Google analogue of INFRA-449's app-scope pin: a purchase token for
 * another app under the same developer account must not become a Being entitlement.
 *
 * ---------------------------------------------------------------------------
 * CONFIGURATION IS A PARAMETER, NOT AN ENV READ
 * ---------------------------------------------------------------------------
 * Nothing under `_shared/` reads `Deno.env`. `verify-google-receipt` reads the literal
 * `GOOGLE_SERVICE_ACCOUNT` secret and passes the parsed credential in, which keeps the
 * INFRA-442 deploy-manifest reconcile seeing a reader and lets tests inject a throwaway key.
 *
 * The token endpoint and audience are module constants. A service-account key file carries
 * its own `token_uri`; it is deliberately never read, because a config-driven endpoint would
 * let whoever controls the secret choose where a signed assertion is sent (the same
 * reasoning as `APP_STORE_CONNECT_AUDIENCE`).
 *
 * ---------------------------------------------------------------------------
 * DATA HANDLING
 * ---------------------------------------------------------------------------
 * The purchase token is a replayable Google credential; the service-account key is a
 * secret. Every thrown message here is assumed to reach `subscription_audit.metadata` and
 * `console.error` (verify-google-receipt's Google-API catch), so no message carries key
 * material, the assertion, the access token, the client email, the purchase token, or any
 * Google response text — only a fixed sentence and, where useful, an HTTP status. Original
 * errors are DISCARDED, not wrapped: V8's JSON SyntaxError quotes its input, ASN.1 failures
 * can echo key fragments, and Deno's network errors embed the full request URL. This module
 * emits no console output. It keeps no token cache: one mint per verification is well inside
 * Google's limits, and it keeps test order irrelevant.
 *
 * Not PHI — Being is not a HIPAA covered entity. Subscription data is personal data under
 * GDPR/CCPA/TDPSA.
 */

import { importPKCS8, SignJWT } from 'https://esm.sh/jose@5.9.6';

export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const ANDROIDPUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
export const ANDROIDPUBLISHER_ORIGIN = 'https://androidpublisher.googleapis.com';

/** Being's Android application id (app.json `android.package`, build.gradle
 * `applicationId`, IAPService `ANDROID_PACKAGE_NAME`). Never read from the request. */
export const BEING_ANDROID_PACKAGE = 'fyi.being.app';

/** Assertion lifetime. Google rejects assertions whose lifetime exceeds one hour. */
export const ASSERTION_LIFETIME_SECONDS = 3600;
export const ASSERTION_MAX_LIFETIME_SECONDS = 3600;

export const REQUEST_TIMEOUT_MS = 10_000;

/** Google's product-id grammar: lowercase letters, digits, '_' and '.', starting with a
 * letter or digit (so '.' and '..' can never match). */
export const SUBSCRIPTION_ID_PATTERN = /^[a-z0-9][a-z0-9._]{0,99}$/;

/** Google documents no formal grammar for purchase tokens. Observed tokens use this set; a
 * too-tight bound fails closed (a lost verification, never a bypass). No '/', '?', '#',
 * '%' or whitespace, and pure-dot values are refused separately below. */
export const PURCHASE_TOKEN_PATTERN = /^[A-Za-z0-9._-]{1,2048}$/;

const SUBSCRIPTIONS_PATH_PREFIX = `/androidpublisher/v3/applications/${BEING_ANDROID_PACKAGE}/purchases/subscriptions/`;

export interface GoogleServiceAccountCredential {
  clientEmail: string;
  privateKeyPem: string;
  privateKeyId: string;
}

/** The fields of `purchases.subscriptions.get` that verify-google-receipt reads. */
export interface GoogleSubscriptionPurchase {
  kind: string;
  startTimeMillis: string;
  expiryTimeMillis: string;
  autoRenewing: boolean;
  priceCurrencyCode: string;
  priceAmountMicros: string;
  countryCode: string;
  developerPayload?: string;
  cancelReason?: number;
  userCancellationTimeMillis?: string;
  orderId: string;
  linkedPurchaseToken?: string;
  purchaseType?: number;
  acknowledgementState?: number;
}

export interface GoogleFetchOptions {
  /** Injected for tests, which cannot reach the network under `--cached-only`. */
  fetchImpl?: typeof fetch;
  /** Injected for tests. Milliseconds since epoch. */
  now?: () => number;
}

// ---------------------------------------------------------------------------
// Errors. Four types, deliberately not collapsed: a credential problem and an invalid
// receipt need opposite responses, and the audit table must not record a key-rotation
// outage as "every user's receipt is invalid".
// ---------------------------------------------------------------------------

/** Missing or unusable service-account credential. Ours to fix; maps to 5xx. */
export class GoogleServiceAccountConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleServiceAccountConfigError';
  }
}

/** Google refused our credential, or the token endpoint was unusable. Maps to 5xx — never
 * to a "your receipt is invalid" answer. `status` 0 means no response was received. */
export class GoogleAuthError extends Error {
  constructor(public readonly status: number) {
    super('Google rejected or could not issue this service\'s access token');
    this.name = 'GoogleAuthError';
  }
}

/** The purchase lookup failed upstream: a non-2xx (other than 401/403), no response
 * (`status` 0), or a 200 that is not a subscription purchase. Maps to 5xx. */
export class GooglePlayApiError extends Error {
  constructor(public readonly status: number) {
    super(
      status === 0
        ? 'Google Play Developer API was unreachable'
        : `Google Play Developer API request failed (HTTP ${status})`,
    );
    this.name = 'GooglePlayApiError';
  }
}

/** Our own pre-flight rejection of a request identifier. Maps to 4xx; no call was made. */
export class InvalidGooglePurchaseError extends Error {
  constructor() {
    super('Purchase identifiers are missing or malformed');
    this.name = 'InvalidGooglePurchaseError';
  }
}

// ---------------------------------------------------------------------------
// Input validation — all of it runs before any key use or network call.
// ---------------------------------------------------------------------------

export function assertBeingPackageName(value: unknown): string {
  if (value !== BEING_ANDROID_PACKAGE) throw new InvalidGooglePurchaseError();
  return BEING_ANDROID_PACKAGE;
}

export function assertValidSubscriptionId(value: unknown): string {
  if (typeof value !== 'string' || !SUBSCRIPTION_ID_PATTERN.test(value)) {
    throw new InvalidGooglePurchaseError();
  }
  return value;
}

export function assertValidPurchaseToken(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !PURCHASE_TOKEN_PATTERN.test(value) ||
    /^\.+$/.test(value)
  ) {
    throw new InvalidGooglePurchaseError();
  }
  return value;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Parse the `GOOGLE_SERVICE_ACCOUNT` secret (a service-account JSON key file).
 *
 * The JSON.parse error is discarded: V8's SyntaxError quotes an excerpt of its input,
 * which here is the private key.
 */
export function parseServiceAccountCredential(raw: unknown): GoogleServiceAccountCredential {
  if (!nonEmptyString(raw)) {
    throw new GoogleServiceAccountConfigError('GOOGLE_SERVICE_ACCOUNT is not configured');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GoogleServiceAccountConfigError('GOOGLE_SERVICE_ACCOUNT is not valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new GoogleServiceAccountConfigError('GOOGLE_SERVICE_ACCOUNT is not a JSON object');
  }
  const key = parsed as Record<string, unknown>;
  if (key.type !== 'service_account') {
    throw new GoogleServiceAccountConfigError('GOOGLE_SERVICE_ACCOUNT is not a service-account key');
  }
  if (!nonEmptyString(key.client_email) || !nonEmptyString(key.private_key) || !nonEmptyString(key.private_key_id)) {
    throw new GoogleServiceAccountConfigError(
      'GOOGLE_SERVICE_ACCOUNT is missing client_email, private_key or private_key_id',
    );
  }
  return {
    clientEmail: key.client_email,
    privateKeyPem: key.private_key,
    privateKeyId: key.private_key_id,
  };
}

/**
 * Import the PKCS#8 PEM. The PEM stays a local and the resulting CryptoKey is discarded
 * after one signature. The original error is discarded: ASN.1/DER failures can echo
 * decoded fragments of the key.
 */
async function importSigningKey(privateKeyPem: string): Promise<CryptoKey> {
  // Secrets pasted through a shell commonly arrive with literal backslash-n.
  const normalized = privateKeyPem.replace(/\\n/g, '\n');
  try {
    return await importPKCS8(normalized, 'RS256') as CryptoKey;
  } catch {
    throw new GoogleServiceAccountConfigError('GOOGLE_SERVICE_ACCOUNT private_key is not a valid PKCS#8 PEM');
  }
}

/**
 * Mint an access token for the androidpublisher scope. Exactly one outbound call.
 */
export async function getGoogleAccessToken(
  credential: GoogleServiceAccountCredential,
  options: GoogleFetchOptions = {},
): Promise<string> {
  // A runtime invariant, not merely a well-chosen constant: a drift past Google's one-hour
  // ceiling fails every verification, which nobody would read as "the lifetime changed".
  if (ASSERTION_LIFETIME_SECONDS > ASSERTION_MAX_LIFETIME_SECONDS) {
    throw new GoogleServiceAccountConfigError('Google assertion lifetime exceeds the 3600s maximum');
  }

  const signingKey = await importSigningKey(credential.privateKeyPem);
  const doFetch = options.fetchImpl ?? globalThis.fetch;
  const nowSeconds = Math.floor((options.now ?? Date.now)() / 1000);

  // Exactly these claims. No `sub`: there is no domain-wide delegation.
  const assertion = await new SignJWT({ scope: ANDROIDPUBLISHER_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: credential.privateKeyId })
    .setIssuer(credential.clientEmail)
    .setAudience(GOOGLE_TOKEN_ENDPOINT)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + ASSERTION_LIFETIME_SECONDS)
    .sign(signingKey);

  let response: Response;
  try {
    response = await doFetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
      // A 3xx would carry the signed assertion off-origin.
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GoogleAuthError(0);
  }

  // The body is never echoed: `error_description` is upstream free text.
  if (!response.ok) throw new GoogleAuthError(response.status);

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new GoogleAuthError(response.status);
  }
  const token = (data as { access_token?: unknown } | null)?.access_token;
  if (!nonEmptyString(token)) throw new GoogleAuthError(response.status);
  return token;
}

/**
 * Look up one subscription purchase for Being's package. Exactly one outbound call, made
 * only after both identifiers pass validation.
 */
export async function fetchSubscriptionPurchase(
  identifiers: { subscriptionId: unknown; purchaseToken: unknown },
  accessToken: string,
  options: GoogleFetchOptions = {},
): Promise<GoogleSubscriptionPurchase> {
  const subscriptionId = assertValidSubscriptionId(identifiers.subscriptionId);
  const purchaseToken = assertValidPurchaseToken(identifiers.purchaseToken);

  const expectedPath =
    `${SUBSCRIPTIONS_PATH_PREFIX}${encodeURIComponent(subscriptionId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  // Built from a constant base, then re-asserted. The origin and exact-path checks are the
  // backstop that keeps the bearer token on this endpoint even if a pattern is loosened.
  const url = new URL(expectedPath, ANDROIDPUBLISHER_ORIGIN);
  if (url.origin !== ANDROIDPUBLISHER_ORIGIN || url.protocol !== 'https:' || url.pathname !== expectedPath || url.search !== '') {
    throw new InvalidGooglePurchaseError();
  }

  const doFetch = options.fetchImpl ?? globalThis.fetch;
  let response: Response;
  try {
    response = await doFetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Deno's network error embeds the request URL, purchase token included.
    throw new GooglePlayApiError(0);
  }

  if (response.status === 401 || response.status === 403) throw new GoogleAuthError(response.status);
  if (!response.ok) throw new GooglePlayApiError(response.status);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new GooglePlayApiError(response.status);
  }
  const purchase = body as Partial<GoogleSubscriptionPurchase> | null;
  if (
    purchase?.kind !== 'androidpublisher#subscriptionPurchase' ||
    typeof purchase.expiryTimeMillis !== 'string' ||
    !/^[0-9]+$/.test(purchase.expiryTimeMillis)
  ) {
    throw new GooglePlayApiError(response.status);
  }
  return purchase as GoogleSubscriptionPurchase;
}
