/**
 * getAuthUidFromRequest — exact-message table (MAINT-753).
 *
 * The helper decodes the JWT payload WITHOUT verifying the signature. That is safe only
 * because `verify_jwt = true` makes the gateway verify first (pinned by
 * app/__tests__/safety/verifyJwtConfig.test.ts). What the helper still owns is turning every
 * shape of garbage into one of exactly three fixed, parser-free messages, because the
 * delete-account and receipt handlers echo `err.message` into a 401 body:
 *
 *   'Missing or malformed Authorization header'
 *   'Malformed JWT'
 *   'JWT missing or invalid sub claim'
 *
 * The other half of the contract is the MUST-PASS rows. delete-account is the right-to-erasure
 * path and the only identity a Being user has is a silent anonymous Supabase session
 * (role 'authenticated', is_anonymous true, UUID sub). Any check beyond "sub is a non-empty
 * string" - UUID shape, role, email - would lock those users out of erasure, so the rows below
 * include real-shaped anonymous tokens and the table never asks for more than `sub`.
 *
 * Tokens are synthetic: the signature segment is a placeholder, nothing here is verified.
 */

import {
  assert,
  assertEquals,
  assertMatch,
  assertStrictEquals,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { getAuthUidFromRequest } from '../_shared/auth.ts';

const MALFORMED_HEADER = 'Missing or malformed Authorization header';
const MALFORMED_JWT = 'Malformed JWT';
const BAD_SUB = 'JWT missing or invalid sub claim';

/** Parser / runtime text that must never reach a response body. */
const PARSER_LEAK =
  /SyntaxError|TypeError|RangeError|DOMException|InvalidCharacterError|atob|base64|decode|JSON|Unexpected|Cannot read|is not (valid|a function|iterable)|undefined|\bat position\b/i;

const UUID = '0b7f3c52-9d1e-4a6b-8f20-5c1d7e9a4b13';

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeJson(value: unknown): string {
  return b64url(new TextEncoder().encode(JSON.stringify(value)));
}

function token(payloadSegment: string): string {
  return `${encodeJson({ alg: 'HS256', typ: 'JWT' })}.${payloadSegment}.c2ln`;
}

function reqWith(authorization: string | null): Request {
  const headers = new Headers();
  if (authorization !== null) headers.set('Authorization', authorization);
  return new Request('https://example.test/fn', { method: 'POST', headers });
}

function bearer(jwt: string): Request {
  return reqWith(`Bearer ${jwt}`);
}

/** A Supabase anonymous-session access token payload (shape, not a real token). */
function anonClaims(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    iss: 'https://projectref.supabase.co/auth/v1',
    sub: UUID,
    aud: 'authenticated',
    exp: 1893456000,
    iat: 1893452400,
    role: 'authenticated',
    aal: 'aal1',
    amr: [{ method: 'anonymous', timestamp: 1893452400 }],
    session_id: '5e0c8f6a-2b7d-4d49-9a3e-1f6b8c0d2e47',
    is_anonymous: true,
    app_metadata: { provider: 'anonymous', providers: ['anonymous'] },
    user_metadata: {},
    ...extra,
  };
}

/**
 * Build an anonymous-session payload whose UNPADDED base64url has a given length mod 4 and
 * contains both '-' and '_' (the characters standard atob rejects or mis-reads when the
 * url-safe alphabet is not translated). Base64 emits '>' (0x3E) as 62 and '?' (0x3F) as 63
 * whenever they sit at byte offset 2 mod 3, so a '>>>???' filler is guaranteed to hit both.
 * Only mod 0, 2 and 3 exist for valid base64: mod 1 is not decodable and is a 401 row below.
 */
function segmentWithLengthMod(mod: 0 | 2 | 3): string {
  for (let pad = 0; pad < 8; pad++) {
    const seg = encodeJson(anonClaims({ note: '>>>???>>>???' + 'a'.repeat(pad) }));
    if (seg.length % 4 === mod) {
      assert(seg.includes('-') && seg.includes('_'), `fixture lacks - and _ for mod ${mod}`);
      return seg;
    }
  }
  throw new Error(`could not build a payload with length mod 4 = ${mod}`);
}

// ---------------------------------------------------------------------------
// MUST PASS: every one of these is a real user who must be able to erase their data.
// ---------------------------------------------------------------------------

Deno.test('MUST-PASS: anonymous session token returns the UUID sub', () => {
  assertStrictEquals(getAuthUidFromRequest(bearer(token(encodeJson(anonClaims())))), UUID);
});

for (const mod of [0, 2, 3] as const) {
  Deno.test(`MUST-PASS: unpadded base64url payload with '-' and '_' (length mod 4 = ${mod})`, () => {
    const seg = segmentWithLengthMod(mod);
    assertEquals(seg.length % 4, mod);
    assertStrictEquals(getAuthUidFromRequest(bearer(token(seg))), UUID);
  });
}

Deno.test('MUST-PASS: padded base64url payload (= suffix) is accepted', () => {
  // mod 2 and mod 3 payloads are the ones that carry padding when padded.
  for (const mod of [2, 3] as const) {
    const seg = segmentWithLengthMod(mod);
    const padded = seg + '='.repeat(4 - mod);
    assertEquals(padded.length % 4, 0);
    assertStrictEquals(getAuthUidFromRequest(bearer(token(padded))), UUID);
  }
});

Deno.test('MUST-PASS: extra and unknown claims do not matter', () => {
  const claims = anonClaims({
    email: 'someone@example.test',
    phone: '',
    custom: { nested: [1, 2, { deep: true }] },
    role: 'something-new',
    is_anonymous: false,
  });
  assertStrictEquals(getAuthUidFromRequest(bearer(token(encodeJson(claims)))), UUID);
});

Deno.test('MUST-PASS: sub is any non-empty string, not necessarily a UUID', () => {
  assertStrictEquals(
    getAuthUidFromRequest(bearer(token(encodeJson({ sub: 'user-123' })))),
    'user-123',
  );
});

Deno.test('MUST-PASS: scheme match is the existing one - "Bearer " prefix, rest is the token', () => {
  const jwt = token(encodeJson(anonClaims()));
  assertStrictEquals(getAuthUidFromRequest(reqWith(`Bearer ${jwt}`)), UUID);
});

// ---------------------------------------------------------------------------
// MUST 401: exact message per row. A thrown message is echoed to the client.
// ---------------------------------------------------------------------------

const jsonSeg = (v: unknown) => encodeJson(v);
const rawSeg = (s: string) => b64url(new TextEncoder().encode(s));
const validSeg = encodeJson(anonClaims());
const validHeaderSeg = encodeJson({ alg: 'HS256', typ: 'JWT' });

const REJECTS: Array<{ name: string; req: () => Request; message: string }> = [
  // Authorization header
  { name: 'no Authorization header', req: () => reqWith(null), message: MALFORMED_HEADER },
  { name: 'Basic scheme', req: () => reqWith('Basic dXNlcjpwYXNz'), message: MALFORMED_HEADER },
  { name: 'lowercase bearer scheme', req: () => reqWith(`bearer ${token(validSeg)}`), message: MALFORMED_HEADER },
  { name: 'bare "Bearer" with no space', req: () => reqWith('Bearer'), message: MALFORMED_HEADER },
  // Headers trims the trailing space, so an empty bearer token arrives as bare "Bearer".
  { name: '"Bearer " with an empty token', req: () => reqWith('Bearer '), message: MALFORMED_HEADER },
  { name: 'Bearer followed by a space-padded empty token', req: () => reqWith('Bearer  '), message: MALFORMED_HEADER },
  { name: 'raw token with no scheme', req: () => reqWith(token(validSeg)), message: MALFORMED_HEADER },

  // Segment count
  { name: '1 segment', req: () => bearer('abcdef'), message: MALFORMED_JWT },
  { name: '2 segments (valid payload in slot 2)', req: () => bearer(`${validHeaderSeg}.${validSeg}`), message: MALFORMED_JWT },
  { name: '4 segments (valid payload in slot 2)', req: () => bearer(`${validHeaderSeg}.${validSeg}.c2ln.extra`), message: MALFORMED_JWT },
  { name: '5 segments', req: () => bearer('a.b.c.d.e'), message: MALFORMED_JWT },

  // Payload segment
  { name: 'empty payload segment', req: () => bearer(`${validHeaderSeg}..c2ln`), message: MALFORMED_JWT },
  { name: 'non-base64 payload', req: () => bearer(token('!!!!')), message: MALFORMED_JWT },
  { name: 'payload with characters outside the base64url alphabet', req: () => bearer(token('ab$d')), message: MALFORMED_JWT },
  { name: 'payload of base64 length mod 4 = 1 (undecodable)', req: () => bearer(token('abcde')), message: MALFORMED_JWT },
  { name: 'payload that decodes to non-JSON text', req: () => bearer(token(rawSeg('not json'))), message: MALFORMED_JWT },
  { name: 'payload that decodes to truncated JSON', req: () => bearer(token(rawSeg('{"sub":"abc"'))), message: MALFORMED_JWT },
  { name: 'payload that decodes to nothing', req: () => bearer(token('====')), message: MALFORMED_JWT },
  { name: 'JSON null', req: () => bearer(token(jsonSeg(null))), message: MALFORMED_JWT },
  { name: 'JSON array', req: () => bearer(token(jsonSeg([{ sub: UUID }]))), message: MALFORMED_JWT },
  { name: 'JSON number', req: () => bearer(token(jsonSeg(42))), message: MALFORMED_JWT },
  { name: 'JSON string', req: () => bearer(token(jsonSeg(UUID))), message: MALFORMED_JWT },
  { name: 'JSON boolean', req: () => bearer(token(jsonSeg(true))), message: MALFORMED_JWT },

  // sub
  { name: 'sub missing', req: () => bearer(token(jsonSeg({ role: 'authenticated' }))), message: BAD_SUB },
  { name: 'sub empty string', req: () => bearer(token(jsonSeg({ sub: '' }))), message: BAD_SUB },
  { name: 'sub null', req: () => bearer(token(jsonSeg({ sub: null }))), message: BAD_SUB },
  { name: 'sub number', req: () => bearer(token(jsonSeg({ sub: 12345 }))), message: BAD_SUB },
  { name: 'sub object', req: () => bearer(token(jsonSeg({ sub: { id: UUID } }))), message: BAD_SUB },
  { name: 'sub array', req: () => bearer(token(jsonSeg({ sub: [UUID] }))), message: BAD_SUB },
  { name: 'sub boolean', req: () => bearer(token(jsonSeg({ sub: true }))), message: BAD_SUB },
  {
    name: 'anon-key-shaped token (role anon, no sub)',
    req: () =>
      bearer(token(jsonSeg({ iss: 'supabase', ref: 'projectref', role: 'anon', iat: 1893452400, exp: 2209072800 }))),
    message: BAD_SUB,
  },
  {
    name: 'service_role-shaped token (no sub)',
    req: () =>
      bearer(token(jsonSeg({ iss: 'supabase', ref: 'projectref', role: 'service_role', iat: 1893452400, exp: 2209072800 }))),
    message: BAD_SUB,
  },
];

for (const row of REJECTS) {
  Deno.test(`MUST-401: ${row.name}`, () => {
    let thrown: unknown;
    try {
      getAuthUidFromRequest(row.req());
    } catch (err) {
      thrown = err;
    }
    assert(thrown !== undefined, 'helper accepted a request it must reject');
    // A plain Error: not a SyntaxError / DOMException / TypeError escaping from a parser.
    assert(thrown instanceof Error, 'thrown value is not an Error');
    assertStrictEquals(thrown.name, 'Error', `parser error type escaped: ${thrown.name}`);
    assertStrictEquals(thrown.message, row.message);
  });
}

Deno.test('no rejection message ever carries parser, atob or TypeError text', () => {
  assert(REJECTS.length >= 25, 'rejection table shrank - vacuity floor');
  const messages = new Set<string>();
  for (const row of REJECTS) {
    try {
      getAuthUidFromRequest(row.req());
    } catch (err) {
      messages.add((err as Error).message);
    }
  }
  // Exactly the three documented messages, nothing else.
  assertEquals([...messages].sort(), [BAD_SUB, MALFORMED_HEADER, MALFORMED_JWT].sort());
  for (const m of messages) {
    assert(!PARSER_LEAK.test(m), `leaky message: ${m}`);
  }
});

Deno.test('control: the parser-leak matcher fires on the old helper messages', () => {
  for (const leaky of [
    'Unexpected token } in JSON at position 3',
    "Failed to decode base64: The string to be decoded is not correctly encoded.",
    "Cannot read properties of null (reading 'sub')",
    'SyntaxError: Unexpected end of JSON input',
    'InvalidCharacterError',
    'TypeError: x is not a function',
  ]) {
    assertMatch(leaky, PARSER_LEAK);
  }
  for (const clean of [MALFORMED_HEADER, MALFORMED_JWT, BAD_SUB]) {
    assert(!PARSER_LEAK.test(clean), `matcher over-fires on ${clean}`);
  }
});
