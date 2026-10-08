/**
 * Throwaway X.509 test PKI for the Apple JWS chain tests (MAINT-738).
 *
 * Not a test file (no `.test.` in the name). Nothing vendored can BUILD a certificate —
 * vendor/ holds jose, supabase-js and std asserts; node:crypto's X509Certificate only
 * parses — and the suite runs --cached-only with no --allow-run, so openssl is out too.
 * Hence a minimal DER encoder: enough of RFC 5280 to emit a v3 certificate with a
 * basicConstraints extension, signed ECDSA P-256 / SHA-256 via WebCrypto.
 *
 * Every certificate is generated at test time; no private key is committed anywhere.
 * Production code must never import this module (pinned by verifier-seam-call-sites).
 */

import { SignJWT } from 'https://esm.sh/jose@5.9.6';

// ---------------------------------------------------------------------------
// DER encoding
// ---------------------------------------------------------------------------

function cat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

function lengthBytes(n: number): number[] {
  if (n < 0x80) return [n];
  if (n < 0x100) return [0x81, n];
  return [0x82, n >> 8, n & 0xff];
}

function tlv(tag: number, ...content: Uint8Array[]): Uint8Array {
  const body = cat(...content);
  return cat(new Uint8Array([tag, ...lengthBytes(body.length)]), body);
}

const seq = (...c: Uint8Array[]) => tlv(0x30, ...c);

function int(bytes: Uint8Array): Uint8Array {
  let i = 0;
  while (i < bytes.length - 1 && bytes[i] === 0) i++;
  let b = bytes.slice(i);
  if (b[0] & 0x80) b = cat(new Uint8Array([0]), b);
  return tlv(0x02, b);
}

function oid(dotted: string): Uint8Array {
  const p = dotted.split('.').map(Number);
  const out = [40 * p[0] + p[1]];
  for (const v of p.slice(2)) {
    const stack = [v & 0x7f];
    let x = v >> 7;
    while (x) {
      stack.unshift((x & 0x7f) | 0x80);
      x >>= 7;
    }
    out.push(...stack);
  }
  return tlv(0x06, new Uint8Array(out));
}

const utf8 = (s: string) => tlv(0x0c, new TextEncoder().encode(s));
const bool = (v: boolean) => tlv(0x01, new Uint8Array([v ? 0xff : 0x00]));

/** UTCTime, so valid only for 1950–2049 — ample for test validity windows. */
function utcTime(d: Date): Uint8Array {
  const s = d.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z';
  return tlv(0x17, new TextEncoder().encode(s));
}

const ECDSA_WITH_SHA256 = seq(oid('1.2.840.10045.4.3.2'));

/** A Name with a single CN RDN. */
export function cnName(cn: string): Uint8Array {
  return seq(tlv(0x31, seq(oid('2.5.4.3'), utf8(cn))));
}

function basicConstraints(isCA: boolean): Uint8Array {
  return tlv(0xa3, seq(seq(oid('2.5.29.19'), bool(true), tlv(0x04, seq(...(isCA ? [bool(true)] : []))))));
}

/** WebCrypto ECDSA signatures are raw r||s (P1363); X.509 wants DER SEQUENCE { r, s }. */
function p1363ToDer(raw: Uint8Array): Uint8Array {
  const half = raw.length / 2;
  return seq(int(raw.slice(0, half)), int(raw.slice(half)));
}

// ---------------------------------------------------------------------------
// DER reading — just enough to lift a Name out of a real certificate
// ---------------------------------------------------------------------------

/** Split a constructed TLV's content into its child TLVs (each returned whole). */
function children(der: Uint8Array): Uint8Array[] {
  const headerLen = (b: Uint8Array, at: number) => {
    const first = b[at + 1];
    if (first < 0x80) return { hdr: 2, len: first };
    const n = first & 0x7f;
    let len = 0;
    for (let k = 0; k < n; k++) len = (len << 8) | b[at + 2 + k];
    return { hdr: 2 + n, len };
  };
  const outer = headerLen(der, 0);
  const out: Uint8Array[] = [];
  let at = outer.hdr;
  const end = outer.hdr + outer.len;
  while (at < end) {
    const h = headerLen(der, at);
    out.push(der.slice(at, at + h.hdr + h.len));
    at += h.hdr + h.len;
  }
  return out;
}

/**
 * The subject Name of a DER certificate, byte for byte. The SEC-01-FOLLOWUP forgery needs
 * an attacker intermediate whose ISSUER is exactly Apple's root SUBJECT, so that the DN and
 * CA checks pass and only the per-link signature check can reject it.
 */
export function subjectNameOf(certDer: Uint8Array): Uint8Array {
  const tbs = children(certDer)[0];
  const fields = children(tbs);
  // [0] version, serial, signature alg, issuer, validity, subject, …
  return fields[fields[0][0] === 0xa0 ? 5 : 4];
}

// ---------------------------------------------------------------------------
// Keys, certificates, chains
// ---------------------------------------------------------------------------

export function generateKey(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]) as Promise<CryptoKeyPair>;
}

export interface CertSpec {
  subject: Uint8Array;
  issuer: Uint8Array;
  subjectKey: CryptoKey;
  /** The key that signs THIS certificate — the issuer's private key, unless forging. */
  signingKey: CryptoKey;
  isCA: boolean;
  notBefore: Date;
  notAfter: Date;
}

export async function makeCert(spec: CertSpec): Promise<Uint8Array> {
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', spec.subjectKey));
  const tbs = seq(
    tlv(0xa0, int(new Uint8Array([2]))),
    int(crypto.getRandomValues(new Uint8Array(8))),
    ECDSA_WITH_SHA256,
    spec.issuer,
    seq(utcTime(spec.notBefore), utcTime(spec.notAfter)),
    spec.subject,
    spki,
    basicConstraints(spec.isCA),
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, spec.signingKey, tbs),
  );
  return seq(tbs, ECDSA_WITH_SHA256, tlv(0x03, cat(new Uint8Array([0]), p1363ToDer(sig))));
}

export function derToB64(der: Uint8Array): string {
  let s = '';
  for (const b of der) s += String.fromCharCode(b);
  return btoa(s);
}

export function b64ToDer(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function spkiPem(publicKey: CryptoKey): Promise<string> {
  const der = new Uint8Array(await crypto.subtle.exportKey('spki', publicKey));
  const lines = derToB64(der).match(/.{1,64}/g)!.join('\n');
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

export interface TestChain {
  /** x5c order: leaf first, root last. */
  x5c: string[];
  /** The root's SPKI — pass as `trustAnchorSpki`. */
  anchorSpki: string;
  leafKey: CryptoKeyPair;
  keys: CryptoKeyPair[];
}

/**
 * A chain of `length` certificates (leaf, CA…, self-signed root), every link correctly
 * signed and valid around `nowMs`. `override(i)` edits the spec of cert i (0 = leaf)
 * before it is signed — the one-mutation-per-test hook.
 */
export async function buildChain(opts: {
  nowMs: number;
  length?: number;
  override?: (i: number, spec: CertSpec, keys: CryptoKeyPair[]) => CertSpec;
}): Promise<TestChain> {
  const length = opts.length ?? 3;
  const keys = await Promise.all(Array.from({ length }, () => generateKey()));
  const names = keys.map((_, i) => cnName(i === 0 ? 'Test Leaf' : i === length - 1 ? 'Test Root' : `Test CA ${i}`));
  const day = 86_400_000;
  const certs: Uint8Array[] = [];
  for (let i = 0; i < length; i++) {
    const isRoot = i === length - 1;
    let spec: CertSpec = {
      subject: names[i],
      issuer: names[isRoot ? i : i + 1],
      subjectKey: keys[i].publicKey,
      signingKey: keys[isRoot ? i : i + 1].privateKey,
      isCA: i > 0,
      notBefore: new Date(opts.nowMs - day),
      notAfter: new Date(opts.nowMs + 30 * day),
    };
    if (opts.override) spec = opts.override(i, spec, keys);
    certs.push(await makeCert(spec));
  }
  return {
    x5c: certs.map(derToB64),
    anchorSpki: await spkiPem(keys[length - 1].publicKey),
    leafKey: keys[0],
    keys,
  };
}

/** An ES256 JWS carrying `x5c` in its protected header, signed by `signingKey`. */
export function signJws(
  payload: Record<string, unknown>,
  signingKey: CryptoKey,
  x5c: string[],
): Promise<string> {
  return new SignJWT(payload).setProtectedHeader({ alg: 'ES256', x5c }).sign(signingKey);
}
