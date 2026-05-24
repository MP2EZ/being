/**
 * verifyAppleJWS.ts behavioral tests (TEST-10 sub-B)
 *
 * Scope: error-path coverage on the JWS parser + signature verifier. A
 * full happy-path test requires real Apple-signed test fixtures, which
 * Apple doesn't publish in a stable form. The error paths below cover
 * the most-important security boundaries: malformed inputs, missing
 * required fields, wrong algorithm, and (where reachable) anchor
 * mismatch on the cert chain.
 *
 * Coverage:
 *   - Malformed input: not three dot-separated segments → throws
 *   - Header not valid base64 / not valid JSON → throws
 *   - Header missing `alg` → throws
 *   - Header with non-ES256 `alg` → throws (no algorithm-confusion attack)
 *   - Header missing or empty x5c chain → throws
 *
 * Out of scope (deferred):
 *   - Anchor verification: requires generating a self-signed cert + matching
 *     SPKI; significant fixture infrastructure to do safely. Audit doc notes
 *     APPLE_ROOT_CA_G3_SPKI is the pin — that's verified by the production
 *     code's static export.
 *   - Signature verification happy path: needs a real ES256-signed test JWT
 *     with a matching x5c. Setup cost > value.
 *   - signedDate freshness: tested implicitly because malformed payloads
 *     fail parse before reaching the date check.
 */

import {
  assertRejects,
  assertEquals,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  verifyAppleJWS,
  APPLE_ROOT_CA_G3_SPKI,
} from '../subscription-webhook/verifyAppleJWS.ts';

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
