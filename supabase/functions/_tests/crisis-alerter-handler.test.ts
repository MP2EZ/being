/**
 * crisis-detection-alerting handler — behavioural tests (MAINT-740, audit TEST-15).
 *
 * Exercises the DEPLOYED handler (runAlerter, imported by index.ts) against a recording
 * fake client and a recording fetch. Until MAINT-740 the handler lived inside a
 * module-scope serve() and these properties were held only by comments:
 *
 *   - Auth rejects before any read, client, fetch or heartbeat.
 *   - A failed volume read persists NO watermark (DEBUG-541), so the next run cannot read
 *     the whole series as grown-from-zero.
 *   - With ANY read error, no email is sent — and that is safe ONLY because the run is
 *     recorded 'error' and the healthchecks ping is withheld, which is what lets the
 *     watchdog and healthchecks.io page. So every no-email case asserts all three.
 *   - The ping is the LAST action, gated on the final error tally, and fire-and-forget.
 *   - The capability ping URL and the Resend key never appear in any output.
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { runAlerter, type AlerterEnv } from '../crisis-detection-alerting/runAlerter.ts';
import { fakeFetch, fakeSupabase, type Scripted } from './crisisFakeSupabase.ts';

const SECRET = 'crisis-cron-secret-value';
const PING_URL = 'https://hc-ping.test/SENTINEL-capability-uuid';
const RESEND_KEY = 're_SENTINEL_api_key';
const RESEND_URL = 'https://api.resend.com/emails';
const NOW = Date.parse('2026-06-07T12:00:00.000Z');
const HOUR = 3_600_000;

const ENV: AlerterEnv = {
  CRON_SECRET: SECRET,
  RESEND_API_KEY: RESEND_KEY,
  CRISIS_ALERT_FROM: 'alerts@being.test',
  CRISIS_ALERT_TO: 'founder@being.test',
  CRISIS_HEALTHCHECK_PING_URL: PING_URL,
  stalenessThresholdHours: 48,
  spikeMultiplier: 3,
  minAbsoluteForSpike: 5,
  bucketFloor: 3,
  baselineDays: 7,
  probeStalenessHours: 12,
};

const iso = (ms: number) => new Date(ms).toISOString();

/** Six reads that evaluate clean: fresh detection, fresh probe, quiet volume, cold start. */
function cleanReads(): Record<string, Scripted> {
  return {
    crisis_detection_liveness: {
      data: { total_detections_retained: 12, last_detection_at: iso(NOW - 2 * HOUR) },
    },
    crisis_detection_volume_daily: {
      data: [
        { event_date: '2026-06-07', detection_count: 1 },
        { event_date: '2026-06-06', detection_count: 1 },
      ],
    },
    crisis_detection_daily: { data: [] },
    crisis_liveness_probe: { data: { probed_at: iso(NOW - HOUR) } },
    crisis_detection_arrival_daily: { data: [] },
    crisis_alert_runs: { data: null }, // no prior clean run: backfill cold start
  };
}

/** A probe marker 48h old trips the probe axis on otherwise clean reads. */
const STALE_PROBE: Scripted = { data: { probed_at: iso(NOW - 48 * HOUR) } };
/** A detection 100h old (with detections retained) trips the liveness axis. */
const STALE_LIVENESS: Scripted = {
  data: { total_detections_retained: 12, last_detection_at: iso(NOW - 100 * HOUR) },
};

function post(headers: Record<string, string> = { 'x-cron-secret': SECRET }): Request {
  return new Request('https://edge.test/crisis-detection-alerting', { method: 'POST', headers });
}

async function run(opts: {
  req?: Request;
  env?: Partial<AlerterEnv>;
  reads?: Record<string, Scripted>;
  inserts?: Record<string, Scripted>;
  respond?: (url: string) => number;
} = {}) {
  const fake = fakeSupabase({ reads: opts.reads ?? cleanReads(), inserts: opts.inserts });
  const ff = fakeFetch(opts.respond);
  const log: string[] = [];
  let clientBuilds = 0;
  const res = await runAlerter(opts.req ?? post(), {
    env: { ...ENV, ...(opts.env ?? {}) },
    supabase: () => {
      clientBuilds++;
      return {
        from(table: string) {
          const b = fake.client.from(table);
          const insert = b.insert;
          b.insert = (row: Record<string, unknown>) => {
            log.push(`insert:${table}`);
            return insert(row);
          };
          return b;
        },
      };
    },
    fetch: (url, init) => {
      log.push(`fetch:${url}`);
      return ff.fetch(url, init);
    },
    nowMs: NOW,
  });
  const body = await res.json();
  const heartbeats = fake.inserts.filter((i) => i.table === 'crisis_alert_runs');
  const resendCalls = ff.calls.filter((c) => c.url === RESEND_URL);
  const pingCalls = ff.calls.filter((c) => c.url === PING_URL);
  return { res, body, fake, ff, log, clientBuilds, heartbeats, resendCalls, pingCalls };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

Deno.test('alerter: a non-POST is 405 — no client, no fetch, no heartbeat', async () => {
  const r = await run({ req: new Request('https://edge.test/x', { method: 'GET' }) });
  assertEquals(r.res.status, 405);
  assertEquals(r.clientBuilds, 0);
  assertEquals(r.ff.calls.length, 0);
  assertEquals(r.fake.queries.length, 0);
});

for (const [label, req, env] of [
  ['header missing', post({}), {}],
  ['header wrong', post({ 'x-cron-secret': 'nope' }), {}],
  ['same char length, different byte length', post({ 'x-cron-secret': 'é'.repeat(4) }), {
    CRON_SECRET: 'eeee',
  }],
  ['CRON_SECRET unset, header missing', post({}), { CRON_SECRET: undefined }],
  ['CRON_SECRET unset, header present', post({ 'x-cron-secret': 'anything' }), {
    CRON_SECRET: undefined,
  }],
  ["CRON_SECRET ''", post({ 'x-cron-secret': 'x' }), { CRON_SECRET: '' }],
] as Array<[string, Request, Partial<AlerterEnv>]>) {
  Deno.test(`alerter: 401 when ${label} — no client, no fetch, no heartbeat`, async () => {
    const r = await run({ req, env });
    assertEquals(r.res.status, 401);
    assertEquals(r.clientBuilds, 0);
    assertEquals(r.ff.calls.length, 0);
    assertEquals(r.fake.queries.length, 0);
  });
}

// ---------------------------------------------------------------------------
// Clean runs
// ---------------------------------------------------------------------------

Deno.test('alerter: a clean run records ok, sends no email, and pings once AFTER the heartbeat', async () => {
  const r = await run();
  assertEquals(r.res.status, 200);
  assertEquals(r.body.status, 'ok');
  assertEquals(r.resendCalls.length, 0);
  assertEquals(r.heartbeats.length, 1);
  assertEquals(r.heartbeats[0].row.status, 'ok');
  assertEquals(r.pingCalls.length, 1);
  assertEquals(r.log.at(-1), `fetch:${PING_URL}`);
  assert(r.log.indexOf('insert:crisis_alert_runs') < r.log.indexOf(`fetch:${PING_URL}`));
  assertEquals(r.pingCalls[0].init?.method, 'GET');
  assertEquals(r.pingCalls[0].init?.redirect, 'error');
  assertEquals(r.pingCalls[0].init?.body, undefined);
});

Deno.test('alerter: a clean volume read persists the gap-filled window as the watermark', async () => {
  const r = await run();
  const counts = r.heartbeats[0].row.evaluated_counts as Record<string, number>;
  assertEquals(Object.keys(counts).length, ENV.baselineDays + 1);
  assertEquals(counts['2026-06-07'], 1);
  assertEquals(counts['2026-06-05'], 0); // gap-filled: present with 0
});

Deno.test('alerter: the watermark read keeps its status and non-null filters', async () => {
  const r = await run();
  const reads = r.fake.queries.filter(
    (q) => q.table === 'crisis_alert_runs' && q.calls.some((c) => c.method === 'select'),
  );
  assertEquals(reads.length, 1);
  const calls = reads[0].calls;
  assert(calls.some((c) => c.method === 'in' && c.args[0] === 'status' &&
    JSON.stringify(c.args[1]) === JSON.stringify(['ok', 'alerted'])));
  assert(calls.some((c) => c.method === 'not' && c.args[0] === 'evaluated_counts' &&
    c.args[1] === 'is' && c.args[2] === null));
});

Deno.test('alerter: touches only the operator views and its own tables — never analytics_events', async () => {
  const r = await run({ reads: { ...cleanReads(), crisis_liveness_probe: STALE_PROBE } });
  assertEquals(r.fake.tablesTouched().sort(), [
    'crisis_alert_runs',
    'crisis_detection_arrival_daily',
    'crisis_detection_daily',
    'crisis_detection_liveness',
    'crisis_detection_volume_daily',
    'crisis_liveness_probe',
  ]);
  assertEquals(r.fake.rpcCalls.length, 0);
});

Deno.test('alerter: a breach with clean reads alerts once, then pings', async () => {
  const r = await run({ reads: { ...cleanReads(), crisis_liveness_probe: STALE_PROBE } });
  assertEquals(r.res.status, 200);
  assertEquals(r.body.status, 'alerted');
  assertEquals(r.body.alertSent, true);
  assertEquals(r.resendCalls.length, 1);
  assertEquals(r.heartbeats[0].row.status, 'alerted');
  assertEquals(r.pingCalls.length, 1);
  assert(r.log.indexOf(`fetch:${RESEND_URL}`) < r.log.indexOf(`fetch:${PING_URL}`));
});

// ---------------------------------------------------------------------------
// Read failures: no email, 'error', no ping — all three, every time
// ---------------------------------------------------------------------------

Deno.test('alerter: a failed volume read persists evaluated_counts null and records error', async () => {
  const r = await run({
    reads: { ...cleanReads(), crisis_detection_volume_daily: { error: { message: 'boom' } } },
  });
  assertEquals(r.res.status, 500);
  assertEquals(r.heartbeats[0].row.status, 'error');
  assertEquals(r.heartbeats[0].row.evaluated_counts, null);
  assertEquals(r.pingCalls.length, 0);
});

const READS = [
  'crisis_detection_liveness',
  'crisis_detection_volume_daily',
  'crisis_detection_daily',
  'crisis_liveness_probe',
  'crisis_detection_arrival_daily',
  'crisis_alert_runs',
];

for (const failing of READS) {
  for (const [shape, scripted] of [
    ['returns {error}', { error: { message: `${failing} unavailable` } }],
    ['throws', { throws: new Error(`${failing} exploded`) }],
  ] as Array<[string, Scripted]>) {
    Deno.test(`alerter: a breach plus a ${failing} read that ${shape} — error, no email, no ping`, async () => {
      // The breach must come from an axis the failed read does not feed: a failed probe
      // read degrades the probe axis to cold_start (no alert), so use liveness there.
      const breach = failing === 'crisis_liveness_probe'
        ? { crisis_detection_liveness: STALE_LIVENESS }
        : { crisis_liveness_probe: STALE_PROBE };
      const r = await run({ reads: { ...cleanReads(), ...breach, [failing]: scripted } });
      assertEquals(r.body.status, 'error');
      assertEquals(r.heartbeats[0].row.status, 'error');
      assertEquals(r.resendCalls.length, 0);
      assertEquals(r.pingCalls.length, 0);
      assertEquals(r.res.status, 500);
    });
  }
}

Deno.test('alerter: the breach axes used above really do alert on their own', async () => {
  // Control for the table above: without it, a breach that never tripped would make
  // "no email" pass vacuously.
  for (const breach of [
    { crisis_liveness_probe: STALE_PROBE },
    { crisis_detection_liveness: STALE_LIVENESS },
  ]) {
    const r = await run({ reads: { ...cleanReads(), ...breach } });
    assertEquals(r.body.status, 'alerted');
    assertEquals(r.resendCalls.length, 1);
  }
});

// ---------------------------------------------------------------------------
// Delivery and heartbeat failures
// ---------------------------------------------------------------------------

Deno.test('alerter: a Resend non-2xx records error and withholds the ping', async () => {
  const r = await run({
    reads: { ...cleanReads(), crisis_liveness_probe: STALE_PROBE },
    respond: (url) => (url === RESEND_URL ? 403 : 200),
  });
  assertEquals(r.body.status, 'error');
  assertEquals(r.body.alertSent, false);
  assertEquals(r.heartbeats[0].row.status, 'error');
  assertEquals(r.resendCalls.length, 1);
  assertEquals(r.pingCalls.length, 0);
  const deliveryError = (r.body.errors as string[]).find((e) => e.startsWith('alert delivery failed'));
  assertEquals(deliveryError, 'alert delivery failed: Resend returned 403 status 403');
});

Deno.test('alerter: missing Resend env on a breach records error and withholds the ping', async () => {
  const r = await run({
    reads: { ...cleanReads(), crisis_liveness_probe: STALE_PROBE },
    env: { RESEND_API_KEY: undefined },
  });
  assertEquals(r.body.status, 'error');
  assertEquals(r.resendCalls.length, 0);
  assertEquals(r.pingCalls.length, 0);
});

Deno.test('alerter: a heartbeat insert that resolves {error} is a 500 with no ping', async () => {
  const r = await run({ inserts: { crisis_alert_runs: { error: { message: 'insert denied' } } } });
  assertEquals(r.res.status, 500);
  assert((r.body.errors as string[]).includes('run-record insert failed: insert denied'));
  assertEquals(r.pingCalls.length, 0);
});

// ---------------------------------------------------------------------------
// The ping is fire-and-forget
// ---------------------------------------------------------------------------

Deno.test('alerter: no ping URL means no ping fetch, and the run is still ok', async () => {
  const r = await run({ env: { CRISIS_HEALTHCHECK_PING_URL: undefined } });
  assertEquals(r.body.status, 'ok');
  assertEquals(r.res.status, 200);
  assertEquals(r.ff.calls.length, 0);
});

Deno.test('alerter: a rejected ping fetch never flips the run', async () => {
  const r = await run({
    respond: (url) => {
      if (url === PING_URL) throw new TypeError('network down');
      return 200;
    },
  });
  assertEquals(r.body.status, 'ok');
  assertEquals(r.res.status, 200);
  assertEquals(r.pingCalls.length, 1);
});

// ---------------------------------------------------------------------------
// Secrets never leak
// ---------------------------------------------------------------------------

Deno.test('alerter: the ping URL and Resend key appear in no response, heartbeat or console line', async () => {
  const printed: string[] = [];
  const original = { log: console.log, warn: console.warn, error: console.error };
  const capture = (...args: unknown[]) => printed.push(args.map(String).join(' '));
  console.log = console.warn = console.error = capture;
  try {
    const scenarios = [
      await run(),
      await run({ reads: { ...cleanReads(), crisis_liveness_probe: STALE_PROBE } }),
      await run({
        reads: { ...cleanReads(), crisis_liveness_probe: STALE_PROBE },
        respond: (url) => (url === RESEND_URL ? 500 : 200),
      }),
      await run({ respond: (url) => (url === PING_URL ? 503 : 200) }),
      await run({
        respond: (url) => {
          if (url === PING_URL) throw new TypeError(`failed to reach ${url}`);
          return 200;
        },
      }),
    ];
    for (const r of scenarios) {
      const surfaces = JSON.stringify(r.body) + JSON.stringify(r.heartbeats);
      assertEquals(surfaces.includes('SENTINEL'), false);
    }
  } finally {
    console.log = original.log;
    console.warn = original.warn;
    console.error = original.error;
  }
  assertEquals(printed.some((line) => line.includes('SENTINEL')), false);
});

// ---------------------------------------------------------------------------
// DEBUG-700 — gap days through the deployed handler
// ---------------------------------------------------------------------------

/** A prior clean run's row whose watermark is a gap-filled map ending on `latest`. */
function priorRun(latest: string, extra: Record<string, number> = {}): Scripted {
  const counts: Record<string, number> = {};
  const base = Date.parse(`${latest}T00:00:00.000Z`);
  for (let i = 0; i <= 7; i++) counts[iso(base - i * 24 * HOUR).slice(0, 10)] = 0;
  return { data: { evaluated_counts: { ...counts, ...extra }, spike_status: 'normal', status: 'ok' } };
}

async function withWarnings<T>(fn: () => Promise<T>): Promise<{ result: T; warned: string[] }> {
  const warned: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => warned.push(args.map(String).join(' '));
  try {
    return { result: await fn(), warned };
  } finally {
    console.warn = original;
  }
}

Deno.test('alerter (DEBUG-700): a gap day alone sends GAP-DAY SPIKE under reason gap_day', async () => {
  const r = await run({
    reads: {
      ...cleanReads(),
      crisis_alert_runs: priorRun('2026-06-04'),
      crisis_detection_volume_daily: {
        data: [
          { event_date: '2026-06-07', detection_count: 1 },
          { event_date: '2026-06-05', detection_count: 50 },
        ],
      },
    },
  });
  assertEquals(r.res.status, 200);
  assertEquals(r.resendCalls.length, 1);
  const email = JSON.parse(String(r.resendCalls[0].init?.body));
  assertEquals(email.subject, '[Being] Crisis-detection GAP-DAY SPIKE');
  assert(email.text.includes('Days missed by earlier runs — checked now at full count:'));
  assert(email.text.includes('2026-06-05: 50 vs baseline mean 0 over 7 day(s) — GAP-DAY SPIKE'));
  assert(email.text.includes('2026-06-06: 0 vs baseline mean 7.1 over 7 day(s) — within 3x'));
  const hb = r.heartbeats[0].row;
  assertEquals([hb.status, hb.reason, hb.backfill_status], ['alerted', 'gap_day', 'gap_day']);
  assertEquals(r.body.evaluated.gapDays.map((g: { day: string }) => g.day), ['2026-06-05', '2026-06-06']);
});

Deno.test('alerter (DEBUG-700): unchecked gap days are recorded when nothing pages', async () => {
  const { result: r, warned } = await withWarnings(() =>
    run({ reads: { ...cleanReads(), crisis_alert_runs: priorRun('2026-05-20') } })
  );
  assertEquals(r.resendCalls.length, 0, 'not evaluable never pages: the outage was already paged');
  assertEquals(r.heartbeats[0].row.status, 'ok');
  assertEquals(r.heartbeats[0].row.backfill_status, 'gap_day');
  assertEquals(r.body.evaluated.gapRange, {
    from: '2026-05-21', to: '2026-05-30', days: 10, reason: 'out_of_window',
  });
  assertEquals(r.pingCalls.length, 1, 'a clean run with gap days is still a clean run');
  const line = warned.find((w) => w.includes('gap days'));
  assert(line, 'one structured console line names the unchecked days');
  assert(line.includes('2026-05-21 to 2026-05-30 (10 days)'), line);
  assertEquals(/\d{2}:\d{2}/.test(line), false, 'no clock time');
});

Deno.test('alerter (DEBUG-700 AC2): an invalid watermark key cannot stop a VOLUME SPIKE', async () => {
  const r = await run({
    reads: {
      ...cleanReads(),
      crisis_alert_runs: { data: { evaluated_counts: { '2026-00-10': 1 }, spike_status: 'normal', status: 'ok' } },
      crisis_detection_volume_daily: { data: [{ event_date: '2026-06-07', detection_count: 50 }] },
    },
  });
  assertEquals(r.res.status, 200);
  assertEquals(r.resendCalls.length, 1);
  assertEquals(JSON.parse(String(r.resendCalls[0].init?.body)).subject, '[Being] Crisis-detection VOLUME SPIKE');
  assertEquals(r.heartbeats[0].row.backfill_status, 'cold_start');
  assertEquals(r.pingCalls.length, 1);
});
