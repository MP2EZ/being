/**
 * verifyGoogleOIDC behavioural tests (MAINT-738 AC2 / audit TEST-02).
 *
 * Every check gets an accept case and a reject case, against a locally generated RS256 key
 * served through the `jwks` seam (`createLocalJWKSet`). No test reaches Google: global
 * fetch is a throwing tripwire during each verification, because the CI task grants
 * --allow-net and a silent fall-through to the real JWKS would make a test pass for the
 * wrong reason.
 *
 * The public JWK deliberately carries NO `alg` member. With `alg: 'RS256'` on the key,
 * jose's key selection — not the verifier's `algorithms: ['RS256']` allowlist — would be
 * what rejects an RS384 token, and deleting the allowlist would go unnoticed.
 */

import {
  assertEquals,
  assertRejects,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  importJWK,
  SignJWT,
} from 'https://esm.sh/jose@5.9.6';
import { verifyGoogleOIDC } from '../subscription-webhook/verifyGoogleOIDC.ts';

const ISSUER = 'https://accounts.google.com';
const AUDIENCE = 'https://edge.test/functions/v1/subscription-webhook';
const SA = 'rtdn-push@being-prod.iam.gserviceaccount.com';
const KID = 'test-key-1';


const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
const publicJwk = { ...(await exportJWK(publicKey)), kid: KID, use: 'sig' };
const jwks = createLocalJWKSet({ keys: [publicJwk] });

const NOW_S = Math.floor(Date.parse('2026-10-06T12:00:00Z') / 1000);
const currentDate = new Date(NOW_S * 1000);

// The SAME RSA key material, imported for RS384. A WebCrypto key is bound to one hash, so
// signing RS384 with `privateKey` itself throws — and that throw would satisfy a careless
// assertRejects. This key produces a genuine RS384 signature that the public key verifies,
// so the only thing standing between it and acceptance is the RS256 allowlist.
const rs384Key = await importJWK(await exportJWK(privateKey), 'RS384');

function token(
  claims: Record<string, unknown> = {},
  opts: { alg?: string; iss?: string; aud?: string } = {},
): Promise<string> {
  const alg = opts.alg ?? 'RS256';
  return new SignJWT({ email: SA, email_verified: true, ...claims })
    .setProtectedHeader({ alg, kid: KID })
    .setIssuer(opts.iss ?? ISSUER)
    .setAudience(opts.aud ?? AUDIENCE)
    .setIssuedAt(NOW_S - 60)
    .setExpirationTime(NOW_S + 3600)
    .sign(alg === 'RS384' ? rs384Key : privateKey);
}

/**
 * Verify with global fetch replaced by a tripwire for the duration of the call, so a seam
 * regression that fell through to Google's real JWKS fails loudly. Scoped per call, not per
 * file: test modules share one process, and other suites rely on the real fetch.
 */
async function verify(header: string | null, pinned: string | undefined = SA) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('network tripwire: verifyGoogleOIDC reached for the real JWKS');
  };
  try {
    return await verifyGoogleOIDC(header, AUDIENCE, pinned, { jwks, currentDate });
  } finally {
    globalThis.fetch = realFetch;
  }
}

Deno.test('accept: a well-formed token for the audience, issuer and pinned account', async () => {
  const { serviceAccountEmail } = await verify(`Bearer ${await token()}`);
  assertEquals(serviceAccountEmail, SA);
});

Deno.test('header: missing is rejected', async () => {
  await assertRejects(() => verify(null), Error, 'Missing Authorization header');
});

Deno.test('header: non-Bearer is rejected; Bearer (any case) is accepted', async () => {
  const t = await token();
  await assertRejects(() => verify(`Basic ${t}`), Error, 'not a Bearer token');
  await verify(`bearer ${t}`);
});

Deno.test('header: an empty token is rejected', async () => {
  // `Bearer` + 2+ spaces reaches the empty-token check; a single space is "not Bearer".
  await assertRejects(() => verify('Bearer   '), Error, 'Bearer token is empty');
});

Deno.test('issuer: a token from any other issuer is rejected', async () => {
  for (const iss of ['accounts.google.com', 'https://evil.example', 'https://accounts.google.com/']) {
    const t = await token({}, { iss });
    await assertRejects(() => verify(`Bearer ${t}`), Error, 'unexpected "iss" claim value');
  }
});

Deno.test('audience: a token for another audience is rejected', async () => {
  const t = await token({}, { aud: 'https://someone-else.example/push' });
  await assertRejects(() => verify(`Bearer ${t}`), Error, 'unexpected "aud" claim value');
});

Deno.test('algorithm: a token signed with the same RSA key under RS384 is rejected by the allowlist', async () => {
  // Built OUTSIDE assertRejects, so a signing failure cannot pass for a rejection.
  const rs384 = await token({}, { alg: 'RS384' });
  await assertRejects(() => verify(`Bearer ${rs384}`), Error, '"alg" (Algorithm) Header Parameter value not allowed');
});

Deno.test('email_verified: false or absent is rejected', async () => {
  for (const email_verified of [false, undefined]) {
    const t = await token({ email_verified });
    await assertRejects(() => verify(`Bearer ${t}`), Error, 'email_verified claim is not true');
  }
});

Deno.test('pinned account: a token for a different service account is rejected', async () => {
  const t = await token({ email: 'attacker@other-project.iam.gserviceaccount.com' });
  await assertRejects(() => verify(`Bearer ${t}`), Error, 'does not match pinned service account');
});

Deno.test('signature: a token signed by another key is rejected', async () => {
  const stranger = await generateKeyPair('RS256');
  const forged = await new SignJWT({ email: SA, email_verified: true })
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(NOW_S - 60)
    .setExpirationTime(NOW_S + 3600)
    .sign(stranger.privateKey);
  await assertRejects(() => verify(`Bearer ${forged}`), Error, 'signature verification failed');
});
