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
 * 2. Validate the cert chain cryptographically — each cert's signature
 *    verifies against the next cert's public key, validity periods are
 *    in range, CA flags are correct on intermediates and root.
 * 3. Anchor the chain to a pinned Apple Root CA - G3 public key (SPKI
 *    comparison) and confirm the root is self-signed.
 * 4. Use the leaf cert's public key to verify the JWS signature against
 *    the payload (jose's jwtVerify with the ES256 algorithm allowlist).
 * 5. Validate signedDate freshness (rejects payloads >24h old or signed
 *    in the future beyond a 5-minute skew tolerance).
 *
 * Audit reference: SEC-01 (closed) + SEC-01-FOLLOWUP (closed) — see
 * ~/dev/being/.audit-report.md and ~/.claude/plans/audit-roadmap.md.
 */

import { importX509, jwtVerify, JWTPayload, errors } from 'https://esm.sh/jose@5.9.6';
import { X509Certificate } from 'node:crypto';

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
 * Maximum accepted x5c chain length. Apple's real chain is 3 (leaf, AWWDR
 * intermediate, root). A cap rejects pathological inputs that would force
 * us into a long verification loop.
 */
const MAX_CHAIN_LENGTH = 5;

/**
 * Full cryptographic chain verification.
 *
 * For each cert in the chain except the root:
 *   1. The cert's issuer DN matches the next cert's subject DN.
 *   2. The next cert is marked as a CA.
 *   3. The cert's signature verifies against the next cert's public key
 *      (this is the actual cryptographic chain check that closes SEC-01).
 *   4. The cert is within its validity period (not expired, not yet-to-be-valid).
 *
 * For the top-of-chain cert (the claimed root):
 *   5. Its SPKI matches the pinned Apple Root CA - G3 public key (anchor).
 *   6. It is self-signed (issuer == subject AND signature verifies against
 *      its own public key) — a soundness check on top of the SPKI pin.
 *   7. It is within its validity period.
 *
 * This closes the SEC-01-FOLLOWUP attack vector where an adversary could
 * append Apple's root cert to a forged chain and pass the prior anchor-only
 * check. With per-cert sig verification, every link must be cryptographically
 * vouched for by the next link, terminating in a key we explicitly pinned.
 *
 * Implementation note: Deno's node:crypto compat ships X509Certificate which
 * knows how to extract a cert's TBSCertificate bytes, parse its signature,
 * and verify(publicKey) cryptographically. That removes the need for a
 * third-party ASN.1 / X.509 library, which is the path the earlier
 * partial-implementation comment was anticipating.
 */
async function verifyCertChain(x5c: string[]): Promise<void> {
  if (x5c.length < 2) {
    throw new Error('Cert chain too short: need leaf + at least one CA');
  }
  if (x5c.length > MAX_CHAIN_LENGTH) {
    throw new Error(`Cert chain too long: ${x5c.length} > ${MAX_CHAIN_LENGTH}`);
  }

  // Parse every cert. X509Certificate accepts a PEM string and throws on
  // malformed input.
  const certs = x5c.map((entry) => {
    try {
      return new X509Certificate(x5cToPem(entry));
    } catch (err) {
      throw new Error(
        `Cert chain entry is not a valid X.509 cert: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  });

  const now = new Date();

  // Walk pairs: cert[i] must be signed by cert[i+1].
  for (let i = 0; i < certs.length - 1; i++) {
    const cert = certs[i];
    const issuerCert = certs[i + 1];

    if (new Date(cert.validFrom).getTime() > now.getTime()) {
      throw new Error(`Cert[${i}] not yet valid (validFrom: ${cert.validFrom})`);
    }
    if (new Date(cert.validTo).getTime() < now.getTime()) {
      throw new Error(`Cert[${i}] expired (validTo: ${cert.validTo})`);
    }
    if (cert.issuer !== issuerCert.subject) {
      throw new Error(
        `Cert[${i}] issuer DN does not match cert[${i + 1}] subject DN`
      );
    }
    if (!issuerCert.ca) {
      throw new Error(`Cert[${i + 1}] is not marked as a CA but signs cert[${i}]`);
    }
    if (!cert.verify(issuerCert.publicKey)) {
      throw new Error(
        `Cert[${i}] signature does not verify against cert[${i + 1}]'s public key`
      );
    }
  }

  // Anchor: top-of-chain SPKI must match the pinned Apple Root CA - G3.
  const topCert = certs[certs.length - 1];
  if (new Date(topCert.validFrom).getTime() > now.getTime() ||
      new Date(topCert.validTo).getTime() < now.getTime()) {
    throw new Error('Top-of-chain (root) cert is outside its validity period');
  }
  const topSpkiBytes = new Uint8Array(
    topCert.publicKey.export({ type: 'spki', format: 'der' }) as Buffer
  );
  const pinnedSpkiBytes = new Uint8Array(pemToArrayBuffer(APPLE_ROOT_CA_G3_SPKI));
  if (!uint8ArraysEqual(topSpkiBytes, pinnedSpkiBytes)) {
    throw new Error(
      'Cert chain anchor mismatch: top-of-chain SPKI does not match pinned Apple Root CA - G3'
    );
  }

  // Self-signature soundness check: the root cert should verify against its
  // own public key. Combined with the SPKI pin, this means the root key
  // we trust is the one that vouches for the chain.
  if (topCert.issuer !== topCert.subject || !topCert.verify(topCert.publicKey)) {
    throw new Error('Top-of-chain cert is not self-signed');
  }
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

function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
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
