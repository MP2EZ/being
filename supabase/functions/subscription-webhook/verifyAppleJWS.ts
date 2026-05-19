/**
 * Apple JWS verification for App Store Server Notifications V2.
 *
 * Apple signs notification payloads with ES256 (ECDSA P-256). The JWS
 * carries an x5c header containing the cert chain:
 *   x5c[0] = leaf cert (signs the JWS)
 *   x5c[1] = "Apple Worldwide Developer Relations Certification Authority" intermediate
 *   x5c[2] = Apple Root CA - G3 (the trust anchor)
 *
 * Verification chain:
 * 1. Parse the JWS to extract header (containing x5c) and signature.
 * 2. Validate the cert chain: each cert signed by the next.
 * 3. Anchor the chain to a pinned Apple Root CA - G3 public key.
 * 4. Use the leaf cert's public key to verify the JWS signature against
 *    the payload.
 * 5. Validate basic claims (exp, iat, replay window).
 *
 * Audit reference: SEC-01 in ~/dev/being/.audit-report.md.
 */

import { importX509, jwtVerify, JWTPayload, errors } from 'https://esm.sh/jose@5.9.6';

/**
 * Apple Root CA - G3 public key (P-384, sha384WithECDSAEncryption).
 *
 * Embedded as a SubjectPublicKeyInfo (SPKI) PEM block. This is the trust
 * anchor for all Apple JWS notifications: any cert chain that doesn't
 * terminate in this key is rejected.
 *
 * Source: https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
 * (converted from DER cert to SPKI PEM via `openssl x509 -pubkey -noout`).
 *
 * This key is rotated very rarely (the G3 root was issued in 2014 and is
 * valid through 2039). On rotation, update this constant; the version
 * comment below makes drift detectable.
 */
export const APPLE_ROOT_CA_G3_SPKI = `-----BEGIN PUBLIC KEY-----
MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEJjytgwAOomtwseN6h+sIDqQE2iPjJ8gG
3+B9PYDIa0jbDDxv+kBYcSjfPGAVUiNzS9LcQB9sP+EYK9aIaQElW72zKL3SI8jH
QjuYa3nQRwh+OFmiBzpkS31xeOJfQRRP
-----END PUBLIC KEY-----`;
// Apple Root CA - G3 SHA-256 fingerprint:
// 63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79

interface VerifiedApplePayload {
  /** Decoded JWS payload (the notification body). */
  payload: JWTPayload & Record<string, unknown>;
  /** SHA-256 fingerprint of the leaf cert (for audit logs). */
  leafCertFingerprint: string;
}

/**
 * Parse a JWS compact serialization into its three parts plus the decoded
 * protected header. Throws on malformed input.
 */
function parseJWS(signedPayload: string): {
  headerB64: string;
  payloadB64: string;
  signatureB64: string;
  header: { alg: string; x5c?: string[] };
} {
  const parts = signedPayload.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWS: expected three dot-separated segments');
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  let header: { alg: string; x5c?: string[] };
  try {
    header = JSON.parse(base64UrlDecodeToString(headerB64));
  } catch {
    throw new Error('Invalid JWS: header is not valid JSON');
  }
  if (!header.alg) {
    throw new Error('Invalid JWS: missing alg in header');
  }
  if (header.alg !== 'ES256') {
    throw new Error(`Invalid JWS: unexpected alg ${header.alg}, expected ES256`);
  }
  if (!header.x5c || header.x5c.length === 0) {
    throw new Error('Invalid JWS: missing x5c cert chain in header');
  }
  return { headerB64, payloadB64, signatureB64, header };
}

function base64UrlDecodeToString(b64url: string): string {
  // JOSE base64url → standard base64 → text
  const padded = b64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(b64url.length + ((4 - (b64url.length % 4)) % 4), '=');
  return atob(padded);
}

/**
 * Convert a base64-encoded DER cert (the x5c format) to a PEM-encoded
 * X.509 certificate suitable for `importX509`.
 */
function x5cToPem(x5cEntry: string): string {
  // x5c is base64-encoded DER (not URL-safe). Wrap in PEM header/footer.
  const lines = x5cEntry.match(/.{1,64}/g) ?? [x5cEntry];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`;
}

/**
 * INCOMPLETE: anchor-only cert-chain check.
 *
 * This function verifies that the topmost cert in the x5c chain has the same
 * SPKI as the pinned Apple Root CA - G3 public key. It does NOT verify that
 * each cert in the chain is cryptographically signed by the next. This is a
 * REAL security gap:
 *
 *   Attack vector: an attacker constructs a JWS whose x5c is
 *   [attacker_leaf, attacker_intermediate, apple_root_cert]. They sign the
 *   JWS with attacker_leaf's private key. This function's anchor check
 *   succeeds (apple_root is at the end), and the JWS signature verifies
 *   against attacker_leaf's public key. Forgery accepted.
 *
 *   The only defense is full per-cert cryptographic chain verification:
 *   for each i in [0..chain.length-2], cert[i] must be signed by the public
 *   key in cert[i+1]. WebCrypto's `subtle` API can verify ECDSA signatures
 *   given a TBSCertificate (the cert's contents-being-signed) and the
 *   signature bytes — but extracting those from a DER X.509 cert requires
 *   ASN.1 parsing, which jose's `importX509` doesn't expose. A dedicated
 *   Deno X.509 library is needed (e.g., https://deno.land/x/x509@0.5.0).
 *
 * Current state: this is BETTER than the prior stub (which decoded payloads
 * with zero verification), but NOT production-secure. The audit's SEC-01
 * finding is partially closed: payload tampering by a non-cert-holder is
 * detected, but cert-chain forgery is not. Tracked as SEC-01-FOLLOWUP.
 *
 * Pre-launch context: webhook endpoint is currently not connected to a real
 * Apple App Store account, so the practical risk is low until TestFlight.
 * MUST complete chain verification before TestFlight invite.
 */
async function verifyCertChain(x5c: string[]): Promise<void> {
  if (x5c.length < 2) {
    throw new Error('Cert chain too short: need leaf + at least one CA');
  }

  // Import the topmost cert (claimed root) and extract its SPKI.
  const claimedRootKey = await importX509(x5cToPem(x5c[x5c.length - 1]), 'ES256');
  const claimedRootSpki = await crypto.subtle.exportKey('spki', claimedRootKey);
  const pinnedSpki = pemToArrayBuffer(APPLE_ROOT_CA_G3_SPKI);

  if (!arrayBuffersEqual(claimedRootSpki, pinnedSpki)) {
    throw new Error(
      'Cert chain anchor mismatch: top-of-chain SPKI does not match pinned Apple Root CA - G3'
    );
  }

  // Sanity-check that every cert in the chain parses as a valid X.509 cert.
  // This doesn't validate the chain cryptographically (see function docstring)
  // but does catch garbage entries.
  await Promise.all(x5c.map((entry) => importX509(x5cToPem(entry), 'ES256')));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(body);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

function arrayBuffersEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const av = new Uint8Array(a);
  const bv = new Uint8Array(b);
  for (let i = 0; i < av.length; i++) {
    if (av[i] !== bv[i]) return false;
  }
  return true;
}

async function leafCertFingerprint(x5cLeaf: string): Promise<string> {
  // SHA-256 of the DER cert bytes
  const der = pemToArrayBuffer(x5cToPem(x5cLeaf));
  const hash = await crypto.subtle.digest('SHA-256', der);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':');
}

/**
 * Verify an Apple-signed JWS payload and return the decoded payload.
 *
 * Throws if any step of verification fails. The thrown error message
 * names the failed check (cert chain, signature, claim validation).
 */
export async function verifyAppleJWS(
  signedPayload: string
): Promise<VerifiedApplePayload> {
  const { header } = parseJWS(signedPayload);

  // Step 1: validate the cert chain anchors in Apple's pinned root.
  await verifyCertChain(header.x5c!);

  // Step 2: import the leaf cert's public key (x5c[0]) and use it to verify
  // the JWS signature against the payload.
  const leafKey = await importX509(x5cToPem(header.x5c![0]), 'ES256');

  // jose's jwtVerify expects a JWT, but Apple's signedPayload IS a JWT
  // (its claims are the notification body). Use jwtVerify and let it
  // validate the signature; we add our own claim checks after.
  const { payload } = await jwtVerify(signedPayload, leafKey, {
    algorithms: ['ES256'],
  }).catch((err: unknown) => {
    if (err instanceof errors.JWSSignatureVerificationFailed) {
      throw new Error('JWS signature verification failed');
    }
    throw err;
  });

  // Step 3: basic claim validation. Apple's notification claims include
  // notificationType, data, signedDate, etc. We don't enforce iss/aud
  // because Apple's claims structure doesn't use those fields. We DO
  // enforce signedDate freshness to reject obviously-replayed payloads.
  const signedDateMs = (payload as { signedDate?: number }).signedDate;
  if (typeof signedDateMs === 'number') {
    const ageMs = Date.now() - signedDateMs;
    const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h tolerance for retries
    if (ageMs > MAX_AGE_MS) {
      throw new Error(
        `JWS payload too old: ${Math.floor(ageMs / 1000)}s (max ${MAX_AGE_MS / 1000}s)`
      );
    }
    if (ageMs < -5 * 60 * 1000) {
      // signedDate is more than 5 minutes in the future — clock skew or forgery
      throw new Error('JWS payload signedDate is in the future');
    }
  }

  const fingerprint = await leafCertFingerprint(header.x5c![0]);

  return {
    payload: payload as JWTPayload & Record<string, unknown>,
    leafCertFingerprint: fingerprint,
  };
}
