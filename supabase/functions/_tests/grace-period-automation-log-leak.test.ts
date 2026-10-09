/**
 * grace-period-automation logs, heartbeat row and response carry no Postgres text (MAINT-770).
 *
 * The same compliance ruling as MAINT-765, applied to the cron: no console argument, no
 * `grace_period_automation_runs.errors` entry and no response body may carry an error's message,
 * details or hint (a constraint-violation message quotes the offending row, and the row holds a
 * user id and a store transaction id), and no identifier of any kind. What a failure may say is
 * closed: a reason from a fixed set and a validated five-character SQLSTATE.
 *
 * Behavioural, not source-shape: the handler runs against a small local fake client whose every
 * failure carries a sentinel in message / details / hint (and, in the invalid-code variant, in
 * `code` too), and every console line is captured with an unlimited-depth inspect
 * (helpers/consoleCapture.ts), the way a log sink records an object. The source pin beside this
 * (subscription-log-identifiers.test.ts) catches the shapes; this catches what actually leaves.
 *
 * The healthcheck gate is NOT changed by MAINT-770: every failing row still writes status
 * 'error' with a non-empty errors[], which is what suppresses the ops dead-man's-switch ping.
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { captureConsole } from './helpers/consoleCapture.ts';
import { withEnv } from './helpers/receiptHandlerKit.ts';
import * as handlerModule from '../grace-period-automation/handler.ts';

const { handle } = handlerModule;

const SECRET = 'grace-cron-secret-test-0001';
const S = 'SENTINEL_PG_TEXT_do_not_leak';
const USER_S = 'SENTINEL_USER_ID_do_not_leak';
const ROW_S = 'SENTINEL_ROW_ID_do_not_leak';
const OTX_S = 'SENTINEL_ORIGINAL_TXN_do_not_leak';
const SENTINELS = [S, USER_S, ROW_S, OTX_S];

/** A PostgrestError as supabase-js 2.x returns it: a plain object, not an Error. */
const pgError = () => ({ message: S, details: S, hint: S, code: '23505' });
/** The same with a `code` that is not a SQLSTATE: it must be logged as null, never echoed. */
const pgErrorBadCode = () => ({ message: S, details: S, hint: S, code: S });

// ---------------------------------------------------------------------------
// Fake client: just enough of supabase-js for this handler
// ---------------------------------------------------------------------------

type Result = { data?: unknown; error?: unknown; count?: number | null };
type Outcome = Result | { reject: unknown };

interface FakeSpec {
  rpc?: Record<string, Outcome>;
  /** The Apple stale-row select. */
  staleSelect?: Outcome;
  /** The head/count select for stale Google rows. */
  googleCount?: Outcome;
  /** The heartbeat insert. */
  insert?: Outcome;
  createThrows?: unknown;
}

function settle(outcome: Outcome) {
  return {
    then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
      return 'reject' in outcome ? reject(outcome.reject) : resolve(outcome);
    },
  };
}

/** A chainable query builder that settles to `outcome` when awaited. */
function builder(outcome: Outcome) {
  // deno-lint-ignore no-explicit-any
  const b: any = {
    eq: () => b,
    in: () => b,
    or: () => b,
    limit: () => b,
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      settle(outcome).then(resolve, reject),
  };
  return b;
}

function fakeClient(spec: FakeSpec) {
  const inserted: Record<string, unknown>[] = [];
  const rpcCalls: string[] = [];
  const defaults: Record<string, Outcome> = {
    expire_old_trials: { data: 0, error: null },
    expire_grace_periods: { data: 0, error: null },
    get_expiring_trials: { data: [], error: null },
    get_expiring_grace_periods: { data: [], error: null },
    log_subscription_event: { data: null, error: null },
  };
  const client = {
    rpc(name: string, _params?: unknown) {
      rpcCalls.push(name);
      return settle(spec.rpc?.[name] ?? defaults[name] ?? { data: null, error: null });
    },
    from(table: string) {
      if (table === 'grace_period_automation_runs') {
        return {
          insert(row: Record<string, unknown>) {
            inserted.push(row);
            return settle(spec.insert ?? { data: null, error: null });
          },
        };
      }
      if (table === 'subscriptions') {
        return {
          select(_cols: string, opts?: { head?: boolean }) {
            return opts?.head
              ? builder(spec.googleCount ?? { count: 0, error: null })
              : builder(spec.staleSelect ?? { data: [], error: null });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
  const createSupabase = () => {
    if (spec.createThrows !== undefined) throw spec.createThrows;
    return client;
  };
  return { createSupabase, inserted, rpcCalls };
}

interface Run {
  status: number;
  bodyText: string;
  lines: string[];
  inserted: Record<string, unknown>[];
}

async function run(spec: FakeSpec): Promise<Run> {
  const fake = fakeClient(spec);
  const realFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error('network call attempted in a unit test');
  }) as typeof fetch;
  try {
    const { result, lines } = await captureConsole(() =>
      withEnv(
        { GRACE_PERIOD_CRON_SECRET: SECRET, SUBSCRIPTION_HEALTHCHECK_PING_URL: undefined },
        () =>
          handle(
            new Request('http://localhost/grace-period-automation', {
              method: 'POST',
              headers: { 'x-cron-secret': SECRET },
            }),
            { createSupabase: fake.createSupabase },
          ),
      )
    );
    return { status: result.status, bodyText: await result.text(), lines, inserted: fake.inserted };
  } finally {
    globalThis.fetch = realFetch;
  }
}

/** Nothing identifying or textual left the function by any of the three exits. */
function assertNoLeak(r: Run, label: string) {
  assert(r.lines.length > 0, `${label}: no console line captured - the capture is reading nothing`);
  const exits: Array<[string, string]> = [
    ['console', r.lines.join('\n')],
    ['heartbeat row', JSON.stringify(r.inserted)],
    ['response body', r.bodyText],
  ];
  for (const [where, text] of exits) {
    for (const s of SENTINELS) {
      assert(!text.includes(s), `${label}: ${s} reached the ${where}`);
    }
  }
}

function hasLine(r: Run, prefix: string, json: string): boolean {
  return r.lines.some((l) => l.includes(prefix) && l.includes(json));
}

function heartbeat(r: Run): Record<string, unknown> {
  assertEquals(r.inserted.length, 1, 'expected exactly one heartbeat insert');
  return r.inserted[0];
}

// ---------------------------------------------------------------------------
// Per-step failures: 200, heartbeat 'error', closed log line and errors[] entry
// ---------------------------------------------------------------------------

const STEPS: Array<{
  name: string;
  step: string;
  prefix: string;
  spec: (err: unknown) => FakeSpec;
}> = [
  {
    name: 'expire_old_trials rpc error',
    step: 'expire_trials',
    prefix: '[Automation] Failed to expire trials:',
    spec: (err) => ({ rpc: { expire_old_trials: { data: null, error: err } } }),
  },
  {
    name: 'expire_grace_periods rpc error',
    step: 'expire_grace_periods',
    prefix: '[Automation] Failed to expire grace periods:',
    spec: (err) => ({ rpc: { expire_grace_periods: { data: null, error: err } } }),
  },
  {
    name: 'get_expiring_trials rpc error',
    step: 'notify_expiring_trials',
    prefix: '[Automation] Failed to get expiring trials:',
    spec: (err) => ({ rpc: { get_expiring_trials: { data: null, error: err } } }),
  },
  {
    name: 'get_expiring_grace_periods rpc error',
    step: 'notify_expiring_grace_periods',
    prefix: '[Automation] Failed to get expiring grace periods:',
    spec: (err) => ({ rpc: { get_expiring_grace_periods: { data: null, error: err } } }),
  },
  {
    name: 'stale-receipt select error',
    step: 'verify_stale_receipts',
    prefix: '[Automation] Failed to get stale receipts:',
    spec: (err) => ({ staleSelect: { data: null, error: err } }),
  },
];

for (const row of STEPS) {
  for (
    const [variant, err, code] of [
      ['SQLSTATE code', pgError(), '23505'],
      ['invalid code', pgErrorBadCode(), null],
    ] as const
  ) {
    Deno.test(`${row.name} (${variant}): no Postgres text in logs, heartbeat or body`, async () => {
      const r = await run(row.spec(err));
      assertNoLeak(r, row.name);
      assertEquals(r.status, 200);
      const json = JSON.stringify({ reason: 'db_error', code });
      assert(hasLine(r, row.prefix, json), `${row.name}: expected "${row.prefix} ${json}"`);
      const hb = heartbeat(r);
      assertEquals(hb.status, 'error', 'a failed step must still flip the heartbeat (healthcheck gate)');
      const entry = `step=${row.step} reason=db_error code=${code ?? 'null'}`;
      assertEquals(hb.errors, [entry]);
      assertEquals((JSON.parse(r.bodyText) as { result: { errors: string[] } }).result.errors, [entry]);
    });
  }
}

Deno.test('an rpc that REJECTS with an Error: closed errors[] entry, no message', async () => {
  const r = await run({ rpc: { expire_old_trials: { reject: new Error(S) } } });
  assertNoLeak(r, 'rpc rejects');
  assertEquals(r.status, 200);
  const hb = heartbeat(r);
  assertEquals(hb.status, 'error');
  assertEquals(hb.errors, ['step=expire_trials reason=Error code=null']);
});

// ---------------------------------------------------------------------------
// Heartbeat write failures: logged closed, never fatal, row stays 'ok'
// ---------------------------------------------------------------------------

Deno.test('heartbeat insert resolves { error }: closed line, no Postgres text', async () => {
  const r = await run({ insert: { data: null, error: pgError() } });
  assertNoLeak(r, 'heartbeat insert error');
  assertEquals(r.status, 200);
  assert(
    hasLine(r, '[Automation] Heartbeat run-record insert returned an error:', '{"reason":"db_error","code":"23505"}'),
    'expected the closed heartbeat-insert line',
  );
  assertEquals(heartbeat(r).status, 'ok');
});

for (
  const [variant, rejection, json] of [
    ['a PostgrestError', pgError(), '{"reason":"db_error","code":"23505"}'],
    ['an Error', new Error(S), '{"reason":"Error","code":null}'],
  ] as const
) {
  Deno.test(`heartbeat insert rejects with ${variant}: closed line, no text`, async () => {
    const r = await run({ insert: { reject: rejection } });
    assertNoLeak(r, `heartbeat insert rejects (${variant})`);
    assertEquals(r.status, 200);
    assert(
      hasLine(r, '[Automation] Failed to write heartbeat run-record:', json),
      `expected "[Automation] Failed to write heartbeat run-record: ${json}"`,
    );
  });
}

// ---------------------------------------------------------------------------
// Outer catch: 500 with a fixed body
// ---------------------------------------------------------------------------

Deno.test('createSupabase throws: 500, fixed body, closed line, no heartbeat', async () => {
  const r = await run({ createThrows: new Error(S) });
  assertNoLeak(r, 'createSupabase throws');
  assertEquals(r.status, 500);
  assertEquals(JSON.parse(r.bodyText), { success: false, error: 'Internal server error' });
  assert(hasLine(r, '[Automation] Unexpected error:', '{"reason":"Error","code":null}'));
  assertEquals(r.inserted.length, 0, 'no client, so no heartbeat');
});

// ---------------------------------------------------------------------------
// Identifier rows: rows carrying ids, and failures around them
// ---------------------------------------------------------------------------

Deno.test('expiring-trial row with a user id + failing audit write: no id, no text', async () => {
  const r = await run({
    rpc: {
      get_expiring_trials: {
        data: [{ user_id: USER_S, trial_end_date: '2026-10-12T00:00:00.000Z', days_remaining: 3 }],
        error: null,
      },
      log_subscription_event: { data: null, error: pgError() },
    },
  });
  assertNoLeak(r, 'expiring trial + audit failure');
  assertEquals(r.status, 200);
  assert(hasLine(r, 'log_subscription_event FAILED', '"code":"23505"'), 'the audit failure line must still fire');
  assertEquals(heartbeat(r).status, 'ok', 'an audit-write failure is non-fatal by ruling');
});

Deno.test('stale apple row with identifiers and no environment: no id reaches any exit', async () => {
  const r = await run({
    staleSelect: {
      data: [{
        id: ROW_S,
        user_id: USER_S,
        platform: 'apple',
        status: 'active',
        original_transaction_id: OTX_S,
        environment: null,
        updated_at: '2026-10-01T00:00:00.000Z',
      }],
      error: null,
    },
  });
  assertNoLeak(r, 'stale apple row');
  assertEquals(r.status, 200);
  const hb = heartbeat(r);
  assertEquals(hb.status, 'error', 'environment_missing is a failure outcome');
  assert(Array.isArray(hb.errors) && (hb.errors as unknown[]).length > 0);
});

Deno.test('every step failing at once: no Postgres text anywhere, five closed entries', async () => {
  const r = await run({
    rpc: {
      expire_old_trials: { data: null, error: pgError() },
      expire_grace_periods: { data: null, error: pgErrorBadCode() },
      get_expiring_trials: { data: null, error: pgError() },
      get_expiring_grace_periods: { data: null, error: pgErrorBadCode() },
    },
    staleSelect: { data: null, error: pgError() },
    googleCount: { count: null, error: pgError() },
    insert: { data: null, error: pgError() },
  });
  assertNoLeak(r, 'all failing');
  assertEquals(r.status, 200);
  const hb = heartbeat(r);
  assertEquals(hb.status, 'error');
  assertEquals(hb.errors, [
    'step=expire_trials reason=db_error code=23505',
    'step=expire_grace_periods reason=db_error code=null',
    'step=notify_expiring_trials reason=db_error code=23505',
    'step=notify_expiring_grace_periods reason=db_error code=null',
    'step=verify_stale_receipts reason=db_error code=23505',
  ]);
});

// ---------------------------------------------------------------------------
// Positive controls
// ---------------------------------------------------------------------------

Deno.test('CONTROL: the capture sees a raw error object (the leak shape is detectable)', async () => {
  const { lines } = await captureConsole(() => console.error('[Automation] x:', pgError()));
  assert(lines.join('\n').includes(S), 'captureConsole did not render the error object');
});

function automationFailure(err: unknown): { reason: string; code: string | null } {
  const fn = (handlerModule as Record<string, unknown>).automationFailure;
  assertEquals(typeof fn, 'function', 'handler.ts does not export automationFailure');
  return (fn as (e: unknown) => { reason: string; code: string | null })(err);
}

for (
  const [label, input, expected] of [
    ['PostgrestError-like', pgError(), { reason: 'db_error', code: '23505' }],
    ['PostgREST code PGRST116', { message: S, details: S, hint: S, code: 'PGRST116' }, { reason: 'db_error', code: null }],
    ['TypeError', new TypeError(S), { reason: 'TypeError', code: null }],
    ['custom-named Error', Object.assign(new Error(S), { name: 'ReceiptLeakError' }), { reason: 'unknown', code: null }],
    ['a string', S, { reason: 'unknown', code: null }],
    ['null', null, { reason: 'unknown', code: null }],
  ] as const
) {
  Deno.test(`automationFailure: ${label}`, () => {
    const out = automationFailure(input);
    assertEquals(out, expected);
    assert(!JSON.stringify(out).includes(S), `${label}: sentinel in the closed description`);
  });
}
