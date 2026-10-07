/**
 * crisis-liveness-probe handler — behavioural tests (MAINT-740, audit TEST-03).
 *
 * Exercises the DEPLOYED handler (handleProbe, imported by index.ts) against a recording
 * fake client. Until MAINT-740 the handler lived inside a module-scope serve() and only
 * source-grep tests could reach it, so a broken auth gate or a write to the wrong table
 * would have stayed green.
 *
 * Two properties carry the weight:
 *   - Fail-closed auth: every rejection happens BEFORE the client thunk is invoked.
 *   - The R2 red line as an ALLOWLIST: the probe touches exactly one table, makes no rpc
 *     call, and writes exactly the four PII-free ops fields. A denylist ("never
 *     analytics_events") would pass a write to any other table.
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { handleProbe } from '../crisis-liveness-probe/handleProbe.ts';
import { fakeSupabase, type FakeSupabase } from './crisisFakeSupabase.ts';

const SECRET = 'crisis-cron-secret-value';
const URL_ = 'https://edge.test/crisis-liveness-probe';

function post(headers: Record<string, string> = { 'x-cron-secret': SECRET }): Request {
  return new Request(URL_, { method: 'POST', headers });
}

/** Run the handler, counting how many times the client thunk was invoked. */
async function run(
  req: Request,
  opts: { env?: { CRON_SECRET?: string }; fake?: FakeSupabase } = {},
) {
  const fake = opts.fake ?? fakeSupabase();
  let clientBuilds = 0;
  const res = await handleProbe(req, {
    env: opts.env ?? { CRON_SECRET: SECRET },
    client: () => {
      clientBuilds++;
      return fake.client;
    },
  });
  return { res, body: await res.json(), fake, clientBuilds };
}

Deno.test('probe: a non-POST is 405 and never builds a client', async () => {
  const { res, clientBuilds, fake } = await run(new Request(URL_, { method: 'GET' }));
  assertEquals(res.status, 405);
  assertEquals(clientBuilds, 0);
  assertEquals(fake.queries.length, 0);
});

const REJECTED: Array<[string, Request, { CRON_SECRET?: string }]> = [
  ['header missing', post({}), { CRON_SECRET: SECRET }],
  ['header wrong (same length)', post({ 'x-cron-secret': 'X'.repeat(SECRET.length) }), {
    CRON_SECRET: SECRET,
  }],
  ['header a different length', post({ 'x-cron-secret': SECRET + 'x' }), { CRON_SECRET: SECRET }],
  // Same JS string length, different UTF-8 byte length: timingSafeEqual would THROW on the
  // byte mismatch, so this pins the byte-length pre-check — a 401, never a 500.
  ['same char length, different byte length', post({ 'x-cron-secret': 'é'.repeat(4) }), {
    CRON_SECRET: 'eeee',
  }],
  ['CRON_SECRET unset, header missing', post({}), {}],
  ['CRON_SECRET unset, header present', post({ 'x-cron-secret': 'anything' }), {}],
  ["CRON_SECRET '' with header 'x'", post({ 'x-cron-secret': 'x' }), { CRON_SECRET: '' }],
  // Trust-domain separation, behaviourally: the ops-domain bearer is not this function's.
  ['the GRACE_PERIOD_CRON_SECRET value', post({ 'x-cron-secret': 'grace-period-ops-secret' }), {
    CRON_SECRET: SECRET,
  }],
];

for (const [label, req, env] of REJECTED) {
  Deno.test(`probe: 401 and no client when ${label}`, async () => {
    const { res, clientBuilds, fake } = await run(req, { env });
    assertEquals(res.status, 401);
    assertEquals(clientBuilds, 0);
    assertEquals(fake.queries.length, 0);
  });
}

Deno.test('probe: R2 allowlist — exactly one table, no rpc, exactly the four ops fields', async () => {
  const { res, body, fake } = await run(post());
  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(fake.tablesTouched(), ['crisis_liveness_probe']);
  assertEquals(fake.rpcCalls.length, 0);
  assertEquals(fake.inserts.length, 1);
  assertEquals(Object.keys(fake.inserts[0].row).sort(), ['detail', 'duration_ms', 'source', 'status']);
  assertEquals(fake.inserts[0].row.status, 'ok');
  assertEquals(fake.inserts[0].row.source, 'edge');
});

Deno.test('probe: an insert that resolves {error} is a 500 carrying the message', async () => {
  const fake = fakeSupabase({
    inserts: { crisis_liveness_probe: { error: { message: 'permission denied', code: '42501' } } },
  });
  const { res, body } = await run(post(), { fake });
  assertEquals(res.status, 500);
  assertEquals(body.success, false);
  assertEquals(body.error, 'probe marker insert failed: permission denied');
  assert(!String(body.error).includes('[object Object]'));
});

Deno.test('probe: a thrown string or plain object still yields a string message', async () => {
  for (const [thrown, expected] of [
    ['socket hang up', 'socket hang up'],
    [{ error_description: 'jwt expired' }, 'jwt expired'],
  ] as Array<[unknown, string]>) {
    const fake = fakeSupabase({ inserts: { crisis_liveness_probe: { throws: thrown } } });
    const { res, body } = await run(post(), { fake });
    assertEquals(res.status, 500);
    assertEquals(body.error, `probe marker insert failed: ${expected}`);
  }
});
