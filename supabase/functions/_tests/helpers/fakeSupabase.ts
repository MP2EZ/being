/**
 * In-memory fake Supabase client for the subscription-webhook tests (DEBUG-739).
 *
 * Not a test file (no `.test.` in the name). Hand-rolled because std/testing/mock.ts is not
 * vendored and the suite runs --cached-only.
 *
 * Unlike a recorder, this one holds TABLES and applies filters, so a test can seed a
 * subscription row the way verify-*-receipt writes it and observe whether the webhook finds
 * it. That is the point: the old Google lookup keyed on a column the token never matches, and
 * a fake that returned a row for any query would have passed against that code.
 *
 * Supported: from(t).select(cols).eq(c, v)….maybeSingle() / .single() / await;
 * from(t).update(patch).eq(c, v)… (await → { error }); from(t).insert(row) with a 23505 on a
 * duplicate (source, notification_id) in webhook_replay_cache; rpc(name, args).
 *
 * MAINT-753 additions (additive; nothing above changes behaviour): from(t).upsert(row,
 * { onConflict }) - recorded in `upserts` and applied (replace the row whose onConflict column
 * matches, else append); failOn(table, 'upsert', err) for a 23505 or a plain error; and
 * failRpc(name, err) to make an RPC (the audit writer) report an error.
 */

type Row = Record<string, unknown>;

export interface FakeDb {
  // deno-lint-ignore no-explicit-any
  client: any;
  tables: Record<string, Row[]>;
  updates: Array<{ table: string; patch: Row; filters: Array<[string, unknown]> }>;
  rpcCalls: Array<{ name: string; args: Row }>;
  /** Every upsert issued, in order (MAINT-753). `row` is a copy taken at call time. */
  upserts: Array<{ table: string; row: Row; options: Row | undefined }>;
  /** Make the next matching operation fail: `failOn('subscriptions', 'select', { message })`. */
  failOn(table: string, op: 'select' | 'update' | 'insert' | 'upsert', error: Row): void;
  /** Make the next call to the named RPC resolve `{ error }` (MAINT-753). */
  failRpc(name: string, error: Row): void;
}

export function fakeDb(seed: Record<string, Row[]> = {}): FakeDb {
  const tables: Record<string, Row[]> = { subscriptions: [], webhook_replay_cache: [], ...seed };
  const updates: FakeDb['updates'] = [];
  const rpcCalls: FakeDb['rpcCalls'] = [];
  const upserts: FakeDb['upserts'] = [];
  const failures: Array<{ table: string; op: string; error: Row }> = [];
  const rpcFailures: Array<{ name: string; error: Row }> = [];

  function takeFailure(table: string, op: string): Row | null {
    const i = failures.findIndex((f) => f.table === table && f.op === op);
    if (i < 0) return null;
    return failures.splice(i, 1)[0].error;
  }

  function query(table: string) {
    const filters: Array<[string, unknown]> = [];
    let patch: Row | null = null;
    const rows = () =>
      (tables[table] ??= []).filter((r) => filters.every(([c, v]) => r[c] === v));

    // deno-lint-ignore no-explicit-any
    const b: any = {
      select: () => b,
      eq: (c: string, v: unknown) => {
        filters.push([c, v]);
        return b;
      },
      update: (p: Row) => {
        patch = p;
        return b;
      },
      maybeSingle: () => {
        const err = takeFailure(table, 'select');
        if (err) return Promise.resolve({ data: null, error: err });
        const found = rows();
        if (found.length > 1) {
          return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'multiple rows' } });
        }
        return Promise.resolve({ data: found[0] ?? null, error: null });
      },
      single: () => {
        const err = takeFailure(table, 'select');
        if (err) return Promise.resolve({ data: null, error: err });
        const found = rows();
        return Promise.resolve(
          found.length === 1
            ? { data: found[0], error: null }
            : { data: null, error: { code: 'PGRST116', message: `${found.length} rows` } },
        );
      },
      insert: (row: Row) => {
        const err = takeFailure(table, 'insert');
        if (err) return Promise.resolve({ error: err });
        const t = (tables[table] ??= []);
        if (
          table === 'webhook_replay_cache' &&
          t.some((r) => r.source === row.source && r.notification_id === row.notification_id)
        ) {
          return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
        }
        t.push({ ...row });
        return Promise.resolve({ error: null });
      },
      upsert: (row: Row, options?: Row) => {
        upserts.push({ table, row: { ...row }, options });
        const err = takeFailure(table, 'upsert');
        if (err) return Promise.resolve({ error: err });
        const t = (tables[table] ??= []);
        const key = typeof options?.onConflict === 'string' ? options.onConflict : null;
        const i = key === null ? -1 : t.findIndex((r) => r[key] === row[key]);
        if (i >= 0) t[i] = { ...row };
        else t.push({ ...row });
        return Promise.resolve({ error: null });
      },
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => {
        let result: unknown;
        if (patch) {
          const err = takeFailure(table, 'update');
          if (err) {
            result = { error: err };
          } else {
            updates.push({ table, patch, filters: [...filters] });
            for (const r of rows()) Object.assign(r, patch);
            result = { error: null };
          }
        } else {
          const err = takeFailure(table, 'select');
          result = err ? { data: null, error: err } : { data: rows(), error: null };
        }
        return Promise.resolve(result).then(onFulfilled, onRejected);
      },
    };
    return b;
  }

  return {
    client: {
      from: (table: string) => query(table),
      rpc: (name: string, args: Row) => {
        rpcCalls.push({ name, args });
        const i = rpcFailures.findIndex((f) => f.name === name);
        if (i >= 0) return Promise.resolve({ data: null, error: rpcFailures.splice(i, 1)[0].error });
        return Promise.resolve({ data: null, error: null });
      },
    },
    tables,
    updates,
    rpcCalls,
    upserts,
    failRpc: (name, error) => rpcFailures.push({ name, error }),
    failOn: (table, op, error) => failures.push({ table, op, error }),
  };
}
