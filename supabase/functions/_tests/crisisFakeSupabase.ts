/**
 * Recording fake Supabase client for the crisis-monitoring handler tests (MAINT-740).
 *
 * Not a test file (no `.test.` in the name), so `deno task test` never runs it directly.
 * Hand-rolled because std/testing/mock.ts is not vendored and the suite runs --cached-only.
 *
 * Every `from(table)` call, every chained method with its arguments, and every insert
 * payload is recorded, so a test can assert WHICH tables were touched and HOW they were
 * queried — the probe's R2 allowlist and the alerter's watermark filters are both
 * properties of the recorded chain, not of a return value. A fake that ignored its calls
 * would make those assertions vacuous.
 */

export type Scripted =
  | { data?: unknown; error?: unknown }
  | { throws: unknown };

export interface RecordedQuery {
  table: string;
  calls: Array<{ method: string; args: unknown[] }>;
}

export interface FakeSupabase {
  // deno-lint-ignore no-explicit-any
  client: { from(table: string): any };
  queries: RecordedQuery[];
  inserts: Array<{ table: string; row: Record<string, unknown> }>;
  rpcCalls: unknown[][];
  tablesTouched(): string[];
}

/**
 * `reads` scripts each table's read result; `inserts` scripts each table's insert result.
 * An unscripted read resolves to `{ data: null, error: null }`; an unscripted insert to
 * `{ error: null }`.
 */
export function fakeSupabase(script: {
  reads?: Record<string, Scripted>;
  inserts?: Record<string, Scripted>;
} = {}): FakeSupabase {
  const queries: RecordedQuery[] = [];
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  const rpcCalls: unknown[][] = [];

  function settle(s: Scripted | undefined, fallback: Record<string, unknown>) {
    if (s && 'throws' in s) return Promise.reject(s.throws);
    return Promise.resolve({ data: null, error: null, ...fallback, ...(s ?? {}) });
  }

  const client = {
    from(table: string) {
      const q: RecordedQuery = { table, calls: [] };
      queries.push(q);
      // deno-lint-ignore no-explicit-any
      const builder: any = {};
      for (const method of ['select', 'order', 'limit', 'in', 'not', 'eq']) {
        builder[method] = (...args: unknown[]) => {
          q.calls.push({ method, args });
          return builder;
        };
      }
      for (const method of ['single', 'maybeSingle']) {
        builder[method] = (...args: unknown[]) => {
          q.calls.push({ method, args });
          return settle(script.reads?.[table], {});
        };
      }
      builder.then = (
        onFulfilled: (v: unknown) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => settle(script.reads?.[table], {}).then(onFulfilled, onRejected);
      builder.insert = (row: Record<string, unknown>) => {
        q.calls.push({ method: 'insert', args: [row] });
        inserts.push({ table, row });
        return settle(script.inserts?.[table], { error: null });
      };
      return builder;
    },
    rpc(...args: unknown[]) {
      rpcCalls.push(args);
      return Promise.resolve({ data: null, error: null });
    },
  };

  return {
    client,
    queries,
    inserts,
    rpcCalls,
    tablesTouched: () => [...new Set(queries.map((q) => q.table))],
  };
}

export interface FakeFetch {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  calls: Array<{ url: string; init?: RequestInit }>;
}

/** Recording fetch. `respond` maps a URL to a status, or throws to simulate a network failure. */
export function fakeFetch(respond: (url: string) => number = () => 200): FakeFetch {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  return {
    calls,
    fetch: (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      try {
        const status = respond(url);
        return Promise.resolve(new Response(null, { status, statusText: `status ${status}` }));
      } catch (e) {
        return Promise.reject(e);
      }
    },
  };
}
