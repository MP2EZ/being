/**
 * replayCache.ts behavioral tests (TEST-10 sub-A)
 *
 * Validates the idempotency/replay-protection helpers for the subscription
 * webhook handler. Each test uses an in-memory mock Supabase client that
 * mimics the subset of the JS client used by replayCache.
 *
 * Coverage:
 *   - wasProcessed returns false for unknown notification (cache miss)
 *   - wasProcessed returns true for previously-inserted notification
 *   - wasProcessed returns false on missing notification_id (defensive)
 *   - wasProcessed throws on unexpected DB errors (fail fast)
 *   - markProcessed inserts a row with source+notification_id
 *   - markProcessed swallows unique-constraint violation (concurrent insert)
 *   - markProcessed throws on other DB errors
 *   - markProcessed no-ops on empty notification_id
 */

import {
  assertEquals,
  assertRejects,
  assert,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { wasProcessed, markProcessed, type WebhookSource } from '../subscription-webhook/replayCache.ts';
import { captureConsole } from './helpers/consoleCapture.ts';

interface CacheRow {
  source: WebhookSource;
  notification_id: string;
}

/**
 * Minimal mock of the Supabase JS client that exercises only the surface
 * area used by replayCache.ts. Stores in-memory rows that survive across
 * .from(...).select() and .from(...).insert() calls.
 */
function makeMockSupabase(opts?: {
  selectError?: { code?: string; message: string; details?: string };
  insertError?: { code?: string; message: string; details?: string };
}) {
  const rows: CacheRow[] = [];

  return {
    rows, // exposed for assertions
    from(_table: string) {
      let filters: Partial<CacheRow> = {};
      return {
        select(_cols: string) {
          return {
            eq(col: keyof CacheRow, val: string) {
              filters = { ...filters, [col]: val };
              return this;
            },
            maybeSingle() {
              if (opts?.selectError) {
                return Promise.resolve({ data: null, error: opts.selectError });
              }
              const match = rows.find(
                (r) => r.source === filters.source && r.notification_id === filters.notification_id
              );
              return Promise.resolve({ data: match ?? null, error: null });
            },
          };
        },
        insert(row: CacheRow) {
          if (opts?.insertError) {
            return Promise.resolve({ data: null, error: opts.insertError });
          }
          const dup = rows.find(
            (r) => r.source === row.source && r.notification_id === row.notification_id
          );
          if (dup) {
            return Promise.resolve({
              data: null,
              error: { code: '23505', message: 'unique violation' },
            });
          }
          rows.push(row);
          return Promise.resolve({ data: row, error: null });
        },
      };
    },
  };
}

Deno.test('wasProcessed: returns false for unknown notification (cache miss)', async () => {
  const supabase = makeMockSupabase();
  assertEquals(await wasProcessed(supabase, 'apple', 'unknown-uuid'), false);
});

Deno.test('wasProcessed: returns true after markProcessed (round-trip)', async () => {
  const supabase = makeMockSupabase();
  await markProcessed(supabase, 'apple', 'uuid-1');
  assertEquals(await wasProcessed(supabase, 'apple', 'uuid-1'), true);
});

Deno.test('wasProcessed: source-scoped (apple uuid does not match google uuid)', async () => {
  const supabase = makeMockSupabase();
  await markProcessed(supabase, 'apple', 'shared-id');
  assertEquals(await wasProcessed(supabase, 'google', 'shared-id'), false);
});

Deno.test('wasProcessed: returns false on empty notification_id (defensive — caller proceeds)', async () => {
  const supabase = makeMockSupabase();
  assertEquals(await wasProcessed(supabase, 'apple', ''), false);
});

Deno.test('wasProcessed: throws on unexpected DB errors (fail fast, no silent double-process)', async () => {
  const supabase = makeMockSupabase({ selectError: { message: 'connection refused' } });
  await assertRejects(
    () => wasProcessed(supabase, 'apple', 'uuid-2'),
    Error,
    'Replay-cache check failed'
  );
});

Deno.test('markProcessed: inserts a row with source + notification_id', async () => {
  const supabase = makeMockSupabase();
  await markProcessed(supabase, 'google', 'msg-id-99');
  assertEquals(supabase.rows.length, 1);
  assertEquals(supabase.rows[0]!.source, 'google');
  assertEquals(supabase.rows[0]!.notification_id, 'msg-id-99');
});

Deno.test('markProcessed: swallows unique-constraint violation (concurrent insert race)', async () => {
  const supabase = makeMockSupabase();
  await markProcessed(supabase, 'apple', 'race-uuid');
  // Second insert with same key → unique violation (code 23505) — should NOT throw
  await markProcessed(supabase, 'apple', 'race-uuid');
  // Only one row exists (the first insert won)
  assertEquals(supabase.rows.length, 1);
});

Deno.test('markProcessed: throws on non-unique-violation DB errors', async () => {
  const supabase = makeMockSupabase({
    insertError: { code: '08000', message: 'connection_exception' },
  });
  await assertRejects(
    () => markProcessed(supabase, 'apple', 'uuid-error'),
    Error,
    'Replay-cache mark failed'
  );
});

Deno.test('markProcessed: no-ops on empty notification_id (defensive)', async () => {
  const supabase = makeMockSupabase();
  await markProcessed(supabase, 'apple', '');
  assertEquals(supabase.rows.length, 0);
});

Deno.test('integration: wasProcessed → markProcessed → wasProcessed flow', async () => {
  const supabase = makeMockSupabase();

  // First arrival: not yet processed
  assertEquals(await wasProcessed(supabase, 'apple', 'flow-uuid'), false);

  // Process the notification, then mark
  await markProcessed(supabase, 'apple', 'flow-uuid');

  // Replay (Apple retry): now seen
  assert(await wasProcessed(supabase, 'apple', 'flow-uuid'));
});

// ---------------------------------------------------------------------------
// MAINT-765: no notification id and no database text in a log line or a thrown error
// ---------------------------------------------------------------------------

const NOTIFICATION = 'notif-id-7c1e9a2b-4d5f';
const SENTINEL = 'SENTINEL_REPLAY_TEXT';

/** Everything an error exposes to a log sink, at unlimited depth. */
const inspected = (e: unknown) => Deno.inspect(e, { depth: Infinity, strAbbreviateSize: Infinity });

async function rejection(fn: () => Promise<unknown>): Promise<Error & { code?: string }> {
  try {
    await fn();
  } catch (e) {
    return e as Error & { code?: string };
  }
  throw new Error('expected a rejection');
}

Deno.test('wasProcessed: a DB error throws a fixed message and the SQLSTATE, never the database text or the id', async () => {
  const supabase = makeMockSupabase({
    selectError: { code: '08006', message: `${SENTINEL} ${NOTIFICATION}`, details: `${SENTINEL} ${NOTIFICATION}` },
  });
  const err = await rejection(() => wasProcessed(supabase, 'apple', NOTIFICATION));
  assertEquals(err.message, 'Replay-cache check failed');
  assertEquals(err.code, '08006');
  assert(!inspected(err).includes(SENTINEL) && !inspected(err).includes(NOTIFICATION), inspected(err));
});

Deno.test('markProcessed: a DB error throws a fixed message and the SQLSTATE, never the database text or the id', async () => {
  const supabase = makeMockSupabase({
    insertError: { code: '42501', message: `${SENTINEL} ${NOTIFICATION}`, details: `${SENTINEL} ${NOTIFICATION}` },
  });
  const err = await rejection(() => markProcessed(supabase, 'google', NOTIFICATION));
  assertEquals(err.message, 'Replay-cache mark failed');
  assertEquals(err.code, '42501');
  assert(!inspected(err).includes(SENTINEL) && !inspected(err).includes(NOTIFICATION), inspected(err));
});

Deno.test('a code that is not a SQLSTATE is not attached to the thrown error', async () => {
  for (const code of ['SENTINEL_CODE', '2350', '235050', undefined]) {
    const select = await rejection(() =>
      wasProcessed(makeMockSupabase({ selectError: { code, message: SENTINEL } }), 'apple', NOTIFICATION)
    );
    const insert = await rejection(() =>
      markProcessed(makeMockSupabase({ insertError: { code, message: SENTINEL } }), 'apple', NOTIFICATION)
    );
    for (const err of [select, insert]) {
      assertEquals(err.code, undefined, String(code));
      assert(!inspected(err).includes(SENTINEL) && !inspected(err).includes('SENTINEL_CODE'), inspected(err));
    }
  }
});

Deno.test('markProcessed: the concurrent-insert log line names neither the source id nor the notification', async () => {
  const supabase = makeMockSupabase();
  await markProcessed(supabase, 'apple', NOTIFICATION);
  const { lines } = await captureConsole(() => markProcessed(supabase, 'apple', NOTIFICATION));
  assert(lines.length > 0, 'the concurrent insert must still be logged');
  for (const line of lines) assert(!line.includes(NOTIFICATION), line);
});

Deno.test('wasProcessed: the missing-id warning names no id (there is none) and only the platform', async () => {
  const { lines } = await captureConsole(() => wasProcessed(makeMockSupabase(), 'google', ''));
  assertEquals(lines.length, 1);
  assert(lines[0].includes('google'));
});
