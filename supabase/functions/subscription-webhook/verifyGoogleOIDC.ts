/**
 * Google Pub/Sub OIDC verification for Real-Time Developer Notifications
 * (RTDN) from Google Play.
 *
 * Google delivers Play store notifications via a Cloud Pub/Sub push
 * subscription. The push HTTPS request carries an OIDC JWT in the
 * Authorization header, issued by Google to the configured service account
 * principal. This module verifies that token before we trust the message
 * body to mutate subscription state.
 *
 * Verification:
 * 1. Authorization header is present and Bearer-prefixed.
 * 2. The token's signature verifies against Google's public keys at
 *    https://www.googleapis.com/oauth2/v3/certs (cached JWKS).
 * 3. `iss` is one of Google's accepted issuer URIs.
 * 4. `aud` matches the configured push subscription audience.
 * 5. `email_verified` is true (defensive — Google always sets this true
 *    for service account principals; defending against tampering).
 * 6. Optional: `email` matches a pinned service account address if the
 *    GOOGLE_PUBSUB_SERVICE_ACCOUNT env var is set.
 *
 * Without this, the webhook trusts any HTTPS POST that happens to have a
 * `message.data` field — i.e., anyone on the internet can mutate user
 * subscription state.
 *
 * Audit reference: SEC-01 in ~/dev/being/.audit-report.md (Apple+Google).
 */

import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'https://esm.sh/jose@5.9.6';

const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');

/**
 * Module-level JWKS so jose can cache the fetched keys across invocations
 * (cuts a network round-trip off most webhook deliveries). jose handles
 * key rotation by re-fetching when a token's `kid` isn't in the cache.
 */
const JWKS = createRemoteJWKSet(GOOGLE_JWKS_URL);

// Per https://accounts.google.com/.well-known/openid-configuration, Google's
// declared OIDC issuer is exactly `https://accounts.google.com`. Older docs
// sometimes show a bare `accounts.google.com` form, but current Google-issued
// service-account tokens carry the URL form. Pinning to the single canonical
// value tightens the verification against tokens that happen to carry a
// nonstandard variant.
const EXPECTED_ISSUER = 'https://accounts.google.com';

export interface VerifiedGoogleOIDCPayload {
  /** Decoded OIDC token claims. */
  payload: JWTPayload & {
    email?: string;
    email_verified?: boolean;
    azp?: string;
  };
  /** Service account email from the token (for audit logs). */
  serviceAccountEmail: string | undefined;
}

/**
 * Verify the OIDC token in the Authorization header of an incoming Pub/Sub
 * push request. Throws on any failure with a message naming the failed check.
 */
export async function verifyGoogleOIDC(
  authorizationHeader: string | null,
  expectedAudience: string,
  pinnedServiceAccountEmail?: string
): Promise<VerifiedGoogleOIDCPayload> {
  if (!authorizationHeader) {
    throw new Error('Missing Authorization header on Google Pub/Sub push request');
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader);
  if (!match) {
    throw new Error('Authorization header is not a Bearer token');
  }
  const token = match[1].trim();
  if (!token) {
    throw new Error('Authorization Bearer token is empty');
  }

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: EXPECTED_ISSUER,
    audience: expectedAudience,
    algorithms: ['RS256'],
  });

  // Google service-account OIDC tokens carry `email` + `email_verified`.
  // email_verified should always be true for verified Google identities;
  // explicitly checking guards against the token having been minted in
  // some edge case that left the flag false.
  const typedPayload = payload as VerifiedGoogleOIDCPayload['payload'];
  if (typedPayload.email_verified !== true) {
    throw new Error('OIDC token email_verified claim is not true');
  }

  // Optional service-account pinning. If a specific service account is
  // configured, only tokens issued for that principal are accepted.
  // This defends against an attacker who somehow obtains a valid Google
  // OIDC token for some OTHER service account in some OTHER project.
  if (pinnedServiceAccountEmail) {
    if (typedPayload.email !== pinnedServiceAccountEmail) {
      throw new Error(
        `OIDC token email "${typedPayload.email}" does not match pinned service account`
      );
    }
  }

  return {
    payload: typedPayload,
    serviceAccountEmail: typedPayload.email,
  };
}
