/**
 * verifyAppleJWS.ts behavioral tests (TEST-10 sub-B, extended by MAINT-738 / audit TEST-01)
 *
 * Two layers:
 *   - Parser error paths (malformed input, bad header, wrong alg, missing x5c).
 *   - The CHAIN WALK, against a throwaway test PKI built at test time
 *     (`_helpers/testPki.ts`) and injected through the `trustAnchorSpki` / `now` seams.
 *     Apple publishes no stable signed fixtures, so this is the only way to show that each
 *     check rejects what it claims to. Every reject case is ONE mutation away from a chain
 *     the accept case proves valid, and asserts the message of the check that fired — a
 *     malformed hand-built cert would otherwise make every reject pass vacuously, failing
 *     at parse instead of at the check under test.
 *
 * The SEC-01-FOLLOWUP forgery runs against the DEFAULT (production) anchor, with the REAL
 * Apple Root CA - G3 appended to an attacker chain. That fixture is self-authenticated
 * below against the pinned SPKI and fingerprint.
 */

import {
  assert,
  assertRejects,
  assertEquals,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { X509Certificate } from 'node:crypto';
import {
  verifyAppleJWS,
  APPLE_ROOT_CA_G3_SPKI,
  MAX_CHAIN_LENGTH,
} from '../_shared/verifyAppleJWS.ts';
import { APPLE_ROOT_CA_G3_DER_B64 } from './_helpers/appleRootCaG3.ts';
import {
  b64ToDer,
  buildChain,
  cnName,
  derToB64,
  generateKey,
  makeCert,
  signJws,
  spkiPem,
  subjectNameOf,
} from './_helpers/testPki.ts';

// Helper: base64url-encode a string for constructing test JWS payloads.
function b64url(input: string): string {
  return btoa(input)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

Deno.test('APPLE_ROOT_CA_G3_SPKI is pinned (regression guard)', () => {
  // The audit's SEC-01 fix pins Apple's Root CA SPKI. Removing this
  // constant or changing it incorrectly silently breaks signature
  // verification. Assert the PEM header/footer + non-empty content.
  assertEquals(APPLE_ROOT_CA_G3_SPKI.startsWith('-----BEGIN PUBLIC KEY-----'), true);
  assertEquals(APPLE_ROOT_CA_G3_SPKI.endsWith('-----END PUBLIC KEY-----'), true);
  // Content between header/footer should be substantial (≥ 100 chars of base64)
  const body = APPLE_ROOT_CA_G3_SPKI
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  assertEquals(body.length > 100, true);
});

Deno.test('verifyAppleJWS: rejects payload without three dot-separated segments', async () => {
  await assertRejects(
    () => verifyAppleJWS('only.two'),
    Error,
    'three dot-separated segments'
  );
  await assertRejects(
    () => verifyAppleJWS('no-dots-at-all'),
    Error,
    'three dot-separated segments'
  );
  await assertRejects(
    () => verifyAppleJWS('a.b.c.d.e'),
    Error,
    'three dot-separated segments'
  );
});

Deno.test('verifyAppleJWS: rejects header that is not valid JSON', async () => {
  // Valid 3-segment structure but header decodes to garbage
  const bogusHeader = b64url('not valid json {{{ broken');
  await assertRejects(
    () => verifyAppleJWS(`${bogusHeader}.${b64url('{}')}.${b64url('sig')}`),
    Error,
    'header is not valid JSON'
  );
});

Deno.test('verifyAppleJWS: rejects header missing alg field', async () => {
  const headerNoAlg = b64url(JSON.stringify({ x5c: ['leaf', 'intermediate'] }));
  await assertRejects(
    () => verifyAppleJWS(`${headerNoAlg}.${b64url('{}')}.${b64url('sig')}`),
    Error,
    'missing alg'
  );
});

Deno.test('verifyAppleJWS: rejects header with non-ES256 alg (no algorithm-confusion)', async () => {
  // Apple JWS must be ES256. Accepting any other algorithm opens an
  // algorithm-confusion attack (e.g., HS256 with a known shared secret).
  for (const alg of ['RS256', 'HS256', 'none', 'ES384', 'ES512']) {
    const header = b64url(JSON.stringify({ alg, x5c: ['leaf'] }));
    await assertRejects(
      () => verifyAppleJWS(`${header}.${b64url('{}')}.${b64url('sig')}`),
      Error,
      'expected ES256',
      `alg "${alg}" should be rejected`
    );
  }
});

Deno.test('verifyAppleJWS: rejects header missing x5c cert chain', async () => {
  const headerNoX5c = b64url(JSON.stringify({ alg: 'ES256' }));
  await assertRejects(
    () => verifyAppleJWS(`${headerNoX5c}.${b64url('{}')}.${b64url('sig')}`),
    Error,
    'missing x5c'
  );
});

Deno.test('verifyAppleJWS: rejects header with empty x5c array', async () => {
  const headerEmptyX5c = b64url(JSON.stringify({ alg: 'ES256', x5c: [] }));
  await assertRejects(
    () => verifyAppleJWS(`${headerEmptyX5c}.${b64url('{}')}.${b64url('sig')}`),
    Error,
    'missing x5c'
  );
});

// ---------------------------------------------------------------------------
// Chain walk against a test PKI (MAINT-738 AC1)
// ---------------------------------------------------------------------------

const NOW = Date.parse('2026-10-06T12:00:00.000Z');
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const now = () => NOW;
const CLAIMS = { notificationType: 'DID_RENEW', notificationUUID: 'test-uuid', signedDate: NOW - HOUR };

Deno.test('chain: a valid 3-cert chain under its own anchor is accepted', async () => {
  const chain = await buildChain({ nowMs: NOW });
  const jws = await signJws(CLAIMS, chain.leafKey.privateKey, chain.x5c);
  const { payload, leafCertFingerprint } = await verifyAppleJWS(jws, { trustAnchorSpki: chain.anchorSpki, now });
  assertEquals(payload.notificationUUID, 'test-uuid');
  assertEquals(leafCertFingerprint.split(':').length, 32);
});

Deno.test('chain: the DEFAULT anchor is the Apple pin — a valid test chain is rejected with no options', async () => {
  const chain = await buildChain({ nowMs: Date.now() });
  const jws = await signJws({ ...CLAIMS, signedDate: Date.now() }, chain.leafKey.privateKey, chain.x5c);
  await assertRejects(() => verifyAppleJWS(jws), Error, 'anchor mismatch');
  await assertRejects(() => verifyAppleJWS(jws, { trustAnchorSpki: undefined }), Error, 'anchor mismatch');
  await assertRejects(() => verifyAppleJWS(jws, {}), Error, 'anchor mismatch');
});

Deno.test('chain: an empty or null anchor fails closed, never skips the comparison', async () => {
  const chain = await buildChain({ nowMs: NOW });
  const jws = await signJws(CLAIMS, chain.leafKey.privateKey, chain.x5c);
  for (const bad of ['', '   ', null]) {
    await assertRejects(
      () => verifyAppleJWS(jws, { trustAnchorSpki: bad as unknown as string, now }),
      Error,
      'Trust anchor must be a non-empty SPKI PEM',
    );
  }
});

Deno.test('chain: a different anchor than the chain terminates in is rejected', async () => {
  const chain = await buildChain({ nowMs: NOW });
  const jws = await signJws(CLAIMS, chain.leafKey.privateKey, chain.x5c);
  const other = await spkiPem((await generateKey()).publicKey);
  await assertRejects(() => verifyAppleJWS(jws, { trustAnchorSpki: other, now }), Error, 'anchor mismatch');
});

Deno.test('chain: a leaf certificate not signed by its intermediate is rejected by the per-link check', async () => {
  const stranger = await generateKey();
  const chain = await buildChain({
    nowMs: NOW,
    override: (i, spec) => (i === 0 ? { ...spec, signingKey: stranger.privateKey } : spec),
  });
  const jws = await signJws(CLAIMS, chain.leafKey.privateKey, chain.x5c);
  await assertRejects(
    () => verifyAppleJWS(jws, { trustAnchorSpki: chain.anchorSpki, now }),
    Error,
    'Cert[0] signature does not verify',
  );
});

Deno.test('chain: a JWS signed by a key other than the leaf is rejected by the signature check', async () => {
  const chain = await buildChain({ nowMs: NOW });
  const jws = await signJws(CLAIMS, (await generateKey()).privateKey, chain.x5c);
  await assertRejects(
    () => verifyAppleJWS(jws, { trustAnchorSpki: chain.anchorSpki, now }),
    Error,
    'JWS signature verification failed',
  );
});

Deno.test('chain: a correctly signed intermediate without CA:TRUE is rejected', async () => {
  const chain = await buildChain({
    nowMs: NOW,
    override: (i, spec) => (i === 1 ? { ...spec, isCA: false } : spec),
  });
  const jws = await signJws(CLAIMS, chain.leafKey.privateKey, chain.x5c);
  await assertRejects(
    () => verifyAppleJWS(jws, { trustAnchorSpki: chain.anchorSpki, now }),
    Error,
    'Cert[1] is not marked as a CA',
  );
});

Deno.test('chain: an issuer DN that does not match the next subject is rejected', async () => {
  const chain = await buildChain({
    nowMs: NOW,
    override: (i, spec) => (i === 0 ? { ...spec, issuer: cnName('Someone Else') } : spec),
  });
  const jws = await signJws(CLAIMS, chain.leafKey.privateKey, chain.x5c);
  await assertRejects(
    () => verifyAppleJWS(jws, { trustAnchorSpki: chain.anchorSpki, now }),
    Error,
    'issuer DN does not match',
  );
});

Deno.test('chain: an expired, or not-yet-valid, leaf is rejected under the injected clock', async () => {
  const expired = await buildChain({
    nowMs: NOW,
    override: (i, spec) => (i === 0 ? { ...spec, notAfter: new Date(NOW - HOUR) } : spec),
  });
  await assertRejects(
    async () => verifyAppleJWS(await signJws(CLAIMS, expired.leafKey.privateKey, expired.x5c), { trustAnchorSpki: expired.anchorSpki, now }),
    Error,
    'Cert[0] expired',
  );
  const future = await buildChain({
    nowMs: NOW,
    override: (i, spec) => (i === 0 ? { ...spec, notBefore: new Date(NOW + HOUR) } : spec),
  });
  await assertRejects(
    async () => verifyAppleJWS(await signJws(CLAIMS, future.leafKey.privateKey, future.x5c), { trustAnchorSpki: future.anchorSpki, now }),
    Error,
    'Cert[0] not yet valid',
  );
});

Deno.test('chain: an expired root is rejected', async () => {
  const chain = await buildChain({
    nowMs: NOW,
    override: (i, spec) => (i === 2 ? { ...spec, notAfter: new Date(NOW - HOUR) } : spec),
  });
  const jws = await signJws(CLAIMS, chain.leafKey.privateKey, chain.x5c);
  await assertRejects(
    () => verifyAppleJWS(jws, { trustAnchorSpki: chain.anchorSpki, now }),
    Error,
    'outside its validity period',
  );
});

Deno.test('chain: a root that matches the anchor but is not self-signed is rejected', async () => {
  const stranger = await generateKey();
  const chain = await buildChain({
    nowMs: NOW,
    override: (i, spec) => (i === 2 ? { ...spec, signingKey: stranger.privateKey } : spec),
  });
  const jws = await signJws(CLAIMS, chain.leafKey.privateKey, chain.x5c);
  await assertRejects(
    () => verifyAppleJWS(jws, { trustAnchorSpki: chain.anchorSpki, now }),
    Error,
    'not self-signed',
  );
});

Deno.test(`chain: a fully valid chain of MAX_CHAIN_LENGTH (${MAX_CHAIN_LENGTH}) is accepted, one longer is rejected`, async () => {
  const atCap = await buildChain({ nowMs: NOW, length: MAX_CHAIN_LENGTH });
  await verifyAppleJWS(await signJws(CLAIMS, atCap.leafKey.privateKey, atCap.x5c), { trustAnchorSpki: atCap.anchorSpki, now });
  const over = await buildChain({ nowMs: NOW, length: MAX_CHAIN_LENGTH + 1 });
  await assertRejects(
    async () => verifyAppleJWS(await signJws(CLAIMS, over.leafKey.privateKey, over.x5c), { trustAnchorSpki: over.anchorSpki, now }),
    Error,
    'Cert chain too long',
  );
});

Deno.test('signedDate: exactly 24h old and +4 min are accepted; 25h old and +10 min are rejected', async () => {
  const chain = await buildChain({ nowMs: NOW });
  const verifyAt = async (signedDate: number) =>
    verifyAppleJWS(await signJws({ ...CLAIMS, signedDate }, chain.leafKey.privateKey, chain.x5c), {
      trustAnchorSpki: chain.anchorSpki,
      now,
    });
  await verifyAt(NOW - DAY);
  await verifyAt(NOW + 4 * 60_000);
  await assertRejects(() => verifyAt(NOW - 25 * HOUR), Error, 'JWS payload too old');
  await assertRejects(() => verifyAt(NOW + 10 * 60_000), Error, 'signedDate is in the future');
});

// ---------------------------------------------------------------------------
// SEC-01-FOLLOWUP — the real Apple root appended to a forged chain
// ---------------------------------------------------------------------------

async function sha256Fingerprint(der: Uint8Array): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', der));
  return Array.from(h).map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
}

Deno.test('fixture: the committed Apple Root CA - G3 IS the pinned anchor', async () => {
  const der = b64ToDer(APPLE_ROOT_CA_G3_DER_B64);
  const cert = new X509Certificate(der);
  const spki = new Uint8Array(cert.publicKey.export({ type: 'spki', format: 'der' }) as Uint8Array);
  const pinned = b64ToDer(APPLE_ROOT_CA_G3_SPKI.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''));
  assertEquals(derToB64(spki), derToB64(pinned));
  const fingerprint = await sha256Fingerprint(der);
  assertEquals(fingerprint, '63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79');
  // …and that is the fingerprint pinned beside the constant in production source.
  const source = await Deno.readTextFile(new URL('../_shared/verifyAppleJWS.ts', import.meta.url));
  assert(source.includes(fingerprint), 'verifyAppleJWS.ts no longer pins this fingerprint');
});

Deno.test('SEC-01-FOLLOWUP: an attacker chain ending in the REAL Apple root fails the per-link check under the DEFAULT anchor', async () => {
  const appleRootDer = b64ToDer(APPLE_ROOT_CA_G3_DER_B64);
  const [attackerCa, attackerLeaf] = [await generateKey(), await generateKey()];
  const issuerIsApple = subjectNameOf(appleRootDer);
  // The forged intermediate CLAIMS Apple's root as its issuer and is a CA, so the DN match and
  // the CA flag both pass; it is signed by the attacker, so only cert.verify can catch it.
  const forgedCa = await makeCert({
    subject: cnName('Apple Worldwide Developer Relations Certification Authority'),
    issuer: issuerIsApple,
    subjectKey: attackerCa.publicKey,
    signingKey: attackerCa.privateKey,
    isCA: true,
    notBefore: new Date(NOW - DAY),
    notAfter: new Date(NOW + 30 * DAY),
  });
  const leaf = await makeCert({
    subject: cnName('Prod ECC Mac App Store and iTunes Store Receipt Signing'),
    issuer: cnName('Apple Worldwide Developer Relations Certification Authority'),
    subjectKey: attackerLeaf.publicKey,
    signingKey: attackerCa.privateKey,
    isCA: false,
    notBefore: new Date(NOW - DAY),
    notAfter: new Date(NOW + 30 * DAY),
  });
  const x5c = [derToB64(leaf), derToB64(forgedCa), APPLE_ROOT_CA_G3_DER_B64];
  // Preconditions: the forgery really does pass the DN and CA checks.
  assertEquals(new X509Certificate(forgedCa).issuer, new X509Certificate(appleRootDer).subject);
  assertEquals(new X509Certificate(appleRootDer).ca, true);

  const jws = await signJws(CLAIMS, attackerLeaf.privateKey, x5c);
  await assertRejects(
    () => verifyAppleJWS(jws, { now }),
    Error,
    'Cert[1] signature does not verify',
  );
});
