/**
 * delete-account handler - behavioural tests (MAINT-753).
 *
 * delete-account is the user's right-to-erasure path. Until MAINT-753 its whole request path
 * sat inside a module-scope serve() and none of it was executed by any test. These drive the
 * DEPLOYED handler (handle, imported by index.ts) against a recorder fake client and pin:
 *
 *   - the caller can only delete THEMSELVES: deleteUser(sub, false), exactly two args, the
 *     first the JWT `sub`, the second strictly `false` (hard delete: the auth.users row must
 *     go so the FK cascade fires). A body-supplied id is ignored and the body is never read.
 *   - identity failure is a 401 with NO client built and NO delete issued.
 *   - every failure arm answers with a fixed message; upstream error text never reaches a
 *     response body.
 *
 * Identity is read from the Authorization header by the helper (the gateway verified the
 * signature, verify_jwt = true). Tokens here are synthetic and unsigned.
 */

import {
  assert,
  assertEquals,
  assertStrictEquals,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { handle, type DeleteAccountClient } from '../delete-account/handler.ts';

const JWT_SUB = '0b7f3c52-9d1e-4a6b-8f20-5c1d7e9a4b13';
const UPSTREAM_SENTINEL = 'SENTINEL_UPSTREAM_DETAIL_do_not_leak';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
};

function b64url(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function tokenFor(claims: unknown): string {
  return `${b64url('{"alg":"HS256","typ":"JWT"}')}.${b64url(JSON.stringify(claims))}.c2ln`;
}

const ANON_SESSION_TOKEN = tokenFor({
  sub: JWT_SUB,
  role: 'authenticated',
  aud: 'authenticated',
  is_anonymous: true,
});
const ANON_KEY_TOKEN = tokenFor({ iss: 'supabase', ref: 'projectref', role: 'anon' });
const SERVICE_ROLE_NO_SUB_TOKEN = tokenFor({ iss: 'supabase', role: 'service_role' });

type DeleteResult = { error: { message: string } | null };

interface Recorder {
  createSupabaseCalls: number;
  /** Raw argument lists, so arity is observable (`args.length`). */
  deleteUserCalls: unknown[][];
  deps: { createSupabase: () => DeleteAccountClient };
}

function recorder(opts: {
  result?: DeleteResult;
  deleteThrows?: unknown;
  createThrows?: unknown;
} = {}): Recorder {
  const rec: Recorder = {
    createSupabaseCalls: 0,
    deleteUserCalls: [],
    deps: {
      createSupabase: () => {
        rec.createSupabaseCalls++;
        if (opts.createThrows !== undefined) throw opts.createThrows;
        return {
          auth: {
            admin: {
              deleteUser: (...args: unknown[]) => {
                rec.deleteUserCalls.push(args);
                if (opts.deleteThrows !== undefined) return Promise.reject(opts.deleteThrows);
                return Promise.resolve(opts.result ?? { error: null });
              },
            },
          },
        } as unknown as DeleteAccountClient;
      },
    },
  };
  return rec;
}

function post(token: string | null, body?: BodyInit, method = 'POST'): Request {
  const headers = new Headers();
  if (token !== null) headers.set('Authorization', `Bearer ${token}`);
  return new Request('https://example.test/delete-account', { method, headers, body });
}

/** The handler logs on purpose (DEBUG-761 owns the uid log); keep test output quiet. */
async function quiet<T>(fn: () => Promise<T>): Promise<T> {
  const { log, error } = console;
  console.log = () => {};
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.log = log;
    console.error = error;
  }
}

function assertCors(res: Response) {
  for (const [k, v] of Object.entries(CORS)) assertStrictEquals(res.headers.get(k), v, k);
}

async function bodyJson(res: Response): Promise<unknown> {
  return JSON.parse(await res.text());
}

// ---------------------------------------------------------------------------
// Success and the identity contract
// ---------------------------------------------------------------------------

Deno.test('200 {success:true}: hard-deletes the JWT sub, once, with exactly two args', async () => {
  const rec = recorder();
  const res = await quiet(() => handle(post(ANON_SESSION_TOKEN), rec.deps));
  assertEquals(res.status, 200);
  assertCors(res);
  assertEquals(res.headers.get('content-type'), 'application/json');
  assertEquals(await bodyJson(res), { success: true });
  assertEquals(rec.createSupabaseCalls, 1);
  assertEquals(rec.deleteUserCalls.length, 1);
  const args = rec.deleteUserCalls[0];
  assertStrictEquals(args.length, 2);
  assertStrictEquals(args[0], JWT_SUB);
  assertStrictEquals(args[1], false);
});

for (
  const [label, body] of [
    ['userId in JSON body', JSON.stringify({ userId: 'victim' })],
    ['authUid in JSON body', JSON.stringify({ authUid: 'victim' })],
    ['id and sub in JSON body', JSON.stringify({ id: 'victim', sub: 'victim', user_id: 'victim' })],
    ['non-JSON body', 'userId=victim'],
    ['malformed JSON body', '{"userId":'],
  ] as const
) {
  Deno.test(`a caller-supplied identity is ignored: ${label}`, async () => {
    const rec = recorder();
    const req = post(ANON_SESSION_TOKEN, body);
    const res = await quiet(() => handle(req, rec.deps));
    assertEquals(res.status, 200);
    assertEquals(rec.deleteUserCalls.length, 1);
    const args = rec.deleteUserCalls[0];
    assertStrictEquals(args.length, 2);
    assertStrictEquals(args[0], JWT_SUB);
    assertStrictEquals(args[1], false);
    assert(!args.includes('victim'), 'victim id reached deleteUser');
    // The handler never reads the body at all.
    assertStrictEquals(req.bodyUsed, false);
  });
}

Deno.test('a verified-looking Authorization wins over every header a caller can also set', async () => {
  const rec = recorder();
  const req = post(ANON_SESSION_TOKEN);
  req.headers.set('x-user-id', 'victim');
  req.headers.set('x-client-info', 'victim');
  req.headers.set('apikey', ANON_KEY_TOKEN);
  await quiet(() => handle(req, rec.deps));
  assertStrictEquals(rec.deleteUserCalls[0][0], JWT_SUB);
});

// ---------------------------------------------------------------------------
// Identity failure: 401, and nothing downstream runs
// ---------------------------------------------------------------------------

const UNAUTHORIZED: Array<{ name: string; req: () => Request; error: string }> = [
  { name: 'no Authorization header', req: () => post(null), error: 'Missing or malformed Authorization header' },
  { name: 'anon-key token (role anon, no sub)', req: () => post(ANON_KEY_TOKEN), error: 'JWT missing or invalid sub claim' },
  { name: 'service_role-shaped token with no sub', req: () => post(SERVICE_ROLE_NO_SUB_TOKEN), error: 'JWT missing or invalid sub claim' },
  { name: 'one-segment token', req: () => post('abcdef'), error: 'Malformed JWT' },
  { name: 'two-segment token', req: () => post('aGVhZGVy.e30'), error: 'Malformed JWT' },
  { name: 'four-segment token', req: () => post(`${ANON_SESSION_TOKEN}.extra`), error: 'Malformed JWT' },
  { name: 'non-base64 payload', req: () => post('aGVhZGVy.!!!!.c2ln'), error: 'Malformed JWT' },
  { name: 'non-JSON payload', req: () => post(`aGVhZGVy.${b64url('not json')}.c2ln`), error: 'Malformed JWT' },
  { name: 'JSON null payload', req: () => post(`aGVhZGVy.${b64url('null')}.c2ln`), error: 'Malformed JWT' },
  { name: 'JSON array payload', req: () => post(`aGVhZGVy.${b64url('[1]')}.c2ln`), error: 'Malformed JWT' },
  { name: 'empty sub', req: () => post(tokenFor({ sub: '' })), error: 'JWT missing or invalid sub claim' },
  { name: 'numeric sub', req: () => post(tokenFor({ sub: 7 })), error: 'JWT missing or invalid sub claim' },
];

for (const row of UNAUTHORIZED) {
  Deno.test(`401 with no client built and no delete: ${row.name}`, async () => {
    const rec = recorder();
    const res = await quiet(() => handle(row.req(), rec.deps));
    assertEquals(res.status, 401);
    assertCors(res);
    assertEquals(await bodyJson(res), { error: row.error });
    assertStrictEquals(rec.createSupabaseCalls, 0);
    assertStrictEquals(rec.deleteUserCalls.length, 0);
  });
}

// ---------------------------------------------------------------------------
// Method handling
// ---------------------------------------------------------------------------

Deno.test('OPTIONS: null body, CORS headers, no auth needed, no client', async () => {
  const rec = recorder();
  const res = await handle(new Request('https://example.test/delete-account', { method: 'OPTIONS' }), rec.deps);
  assertEquals(res.status, 200);
  assertStrictEquals(res.body, null);
  assertCors(res);
  assertStrictEquals(rec.createSupabaseCalls, 0);
  assertStrictEquals(rec.deleteUserCalls.length, 0);
});

for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
  Deno.test(`${method}: 405 with CORS even with a valid token, no client, no delete`, async () => {
    const rec = recorder();
    const res = await handle(post(ANON_SESSION_TOKEN, undefined, method), rec.deps);
    assertEquals(res.status, 405);
    assertCors(res);
    assertEquals(await bodyJson(res), { error: 'Method not allowed' });
    assertStrictEquals(rec.createSupabaseCalls, 0);
    assertStrictEquals(rec.deleteUserCalls.length, 0);
  });
}

// ---------------------------------------------------------------------------
// Failure arms: fixed messages, upstream text never leaks
// ---------------------------------------------------------------------------

Deno.test('deleteUser returns {error}: 500 {success:false,error:"Deletion failed"}', async () => {
  const rec = recorder({ result: { error: { message: UPSTREAM_SENTINEL } } });
  const res = await quiet(() => handle(post(ANON_SESSION_TOKEN), rec.deps));
  assertEquals(res.status, 500);
  assertCors(res);
  const text = await res.text();
  assertEquals(JSON.parse(text), { success: false, error: 'Deletion failed' });
  assert(!text.includes(UPSTREAM_SENTINEL), 'upstream error text reached the response');
  assertEquals(rec.deleteUserCalls.length, 1);
});

Deno.test('deleteUser throws: 500 {success:false,error:"Internal server error"}', async () => {
  const rec = recorder({ deleteThrows: new Error(UPSTREAM_SENTINEL) });
  const res = await quiet(() => handle(post(ANON_SESSION_TOKEN), rec.deps));
  assertEquals(res.status, 500);
  assertCors(res);
  const text = await res.text();
  assertEquals(JSON.parse(text), { success: false, error: 'Internal server error' });
  assert(!text.includes(UPSTREAM_SENTINEL), 'thrown error text reached the response');
});

Deno.test('createSupabase throws (missing env): 500, no delete attempted, no leak', async () => {
  const rec = recorder({ createThrows: new Error(UPSTREAM_SENTINEL) });
  const res = await quiet(() => handle(post(ANON_SESSION_TOKEN), rec.deps));
  assertEquals(res.status, 500);
  assertCors(res);
  const text = await res.text();
  assertEquals(JSON.parse(text), { success: false, error: 'Internal server error' });
  assert(!text.includes(UPSTREAM_SENTINEL), 'constructor error text reached the response');
  assertEquals(rec.createSupabaseCalls, 1);
  assertStrictEquals(rec.deleteUserCalls.length, 0);
});

Deno.test('a non-Error throw is still a fixed 500', async () => {
  const rec = recorder({ deleteThrows: UPSTREAM_SENTINEL });
  const res = await quiet(() => handle(post(ANON_SESSION_TOKEN), rec.deps));
  assertEquals(res.status, 500);
  const text = await res.text();
  assertEquals(JSON.parse(text), { success: false, error: 'Internal server error' });
  assert(!text.includes(UPSTREAM_SENTINEL));
});

Deno.test('no response body on any path contains the user id or upstream text', async () => {
  const scenarios: Array<[string, Recorder, Request]> = [
    ['ok', recorder(), post(ANON_SESSION_TOKEN)],
    ['delete error', recorder({ result: { error: { message: UPSTREAM_SENTINEL } } }), post(ANON_SESSION_TOKEN)],
    ['delete throws', recorder({ deleteThrows: new Error(UPSTREAM_SENTINEL) }), post(ANON_SESSION_TOKEN)],
    ['create throws', recorder({ createThrows: new Error(UPSTREAM_SENTINEL) }), post(ANON_SESSION_TOKEN)],
    ['401', recorder(), post(ANON_KEY_TOKEN)],
    ['405', recorder(), post(ANON_SESSION_TOKEN, undefined, 'GET')],
  ];
  for (const [name, rec, req] of scenarios) {
    const res = await quiet(() => handle(req, rec.deps));
    const text = await res.text();
    assert(!text.includes(UPSTREAM_SENTINEL), `${name}: upstream text leaked`);
    assert(!text.includes(JWT_SUB), `${name}: user id echoed in the response`);
  }
});
