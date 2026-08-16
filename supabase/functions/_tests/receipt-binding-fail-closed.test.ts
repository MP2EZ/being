/**
 * receiptBinding.ts fail-closed behaviour (DEBUG-447).
 *
 * THE DEFECT. `assertNoCrossIdentityReplay` opened with `if (!originalTransactionId) return;`
 * — so an absent or empty identifier PASSED the cross-identity replay guard rather than being
 * rejected, and the caller went on to write a `subscriptions` row with no binding. The
 * database did not backstop it and structurally could not: `uniq_txn_per_platform` is UNIQUE
 * and Postgres treats every NULL as distinct from every other NULL, so unlimited NULL-identifier
 * rows are permitted per platform regardless of the index's WHERE clause. Both layers vanished
 * together, silently — nothing errored, nothing logged, verification simply succeeded.
 *
 * A NOTE ON AC5, WHICH IS CIRCULAR AS WRITTEN. The ticket says the populated-identifier path
 * is "verified by the existing coverage, not by inspection." There was NO existing coverage —
 * no test file for receiptBinding.ts existed anywhere in the repo. So this file is both the
 * new fail-closed coverage (AC4) and the populated-path coverage AC5 wants to verify against.
 * Stated rather than glossed, because "verified against existing coverage" would otherwise be
 * a claim about something that never existed.
 *
 * WHAT THIS FILE DOES NOT COVER. The call-site guards inside the two verifiers cannot be
 * unit-tested here: both index.ts files call `Deno.serve` at module scope (importing one
 * starts a listener) and `updateSubscription` is not exported. Those are pinned by source
 * shape in receipt-binding-call-site-guard.test.ts instead.
 */

import {
  assert,
  assertEquals,
  assertRejects,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  assertNoCrossIdentityReplay,
  InvalidTransactionIdentifierError,
  ReceiptReplayError,
  isUsableTransactionIdentifier,
} from '../_shared/receiptBinding.ts';

/**
 * Minimal mock of the Supabase client surface receiptBinding uses, plus a `queried` flag so a
 * test can prove the guard short-circuited BEFORE any database round-trip. That flag is the
 * difference between "it threw" and "it threw for the right reason at the right time".
 */
function makeMockSupabase(opts?: {
  boundUserId?: string | null;
  selectError?: { message: string };
}) {
  const state = { queried: false };
  return {
    state,
    from(_table: string) {
      const chain = {
        select: (_cols: string) => chain,
        eq: (_col: string, _val: unknown) => chain,
        maybeSingle: () => {
          state.queried = true;
          if (opts?.selectError) return Promise.resolve({ data: null, error: opts.selectError });
          return Promise.resolve({
            data: opts?.boundUserId ? { user_id: opts.boundUserId } : null,
            error: null,
          });
        },
      };
      return chain;
    },
  };
}

// ---------------------------------------------------------------- AC4: fail closed

const FALSY_SHAPES: Array<[string, unknown]> = [
  ['undefined', undefined],
  ['null', null],
  ['empty string', ''],
];

for (const [label, value] of FALSY_SHAPES) {
  Deno.test(`DEBUG-447: rejects a ${label} transaction identifier`, async () => {
    const supabase = makeMockSupabase();
    await assertRejects(
      () => assertNoCrossIdentityReplay(supabase, 'apple', value as string | undefined, 'user-1'),
      InvalidTransactionIdentifierError,
    );
    assertEquals(
      supabase.state.queried,
      false,
      'the guard hit the database before rejecting — it must short-circuit first',
    );
  });
}

// AC1 names "non-string" explicitly. The TS signature says `string | undefined`, but this
// value crosses an external JSON boundary where that annotation is not enforced at runtime.
const NON_STRING_SHAPES: Array<[string, unknown]> = [
  ['number', 12345],
  ['object', { id: 'x' }],
  ['array', ['x']],
  ['boolean', true],
];

for (const [label, value] of NON_STRING_SHAPES) {
  Deno.test(`DEBUG-447: rejects a non-string (${label}) transaction identifier`, async () => {
    const supabase = makeMockSupabase();
    await assertRejects(
      () => assertNoCrossIdentityReplay(supabase, 'apple', value as unknown as string, 'user-1'),
      InvalidTransactionIdentifierError,
    );
    assertEquals(supabase.state.queried, false, 'must short-circuit before any DB round-trip');
  });
}

Deno.test('DEBUG-447: the thrown error names the platform', async () => {
  try {
    await assertNoCrossIdentityReplay(makeMockSupabase(), 'google', undefined, 'user-1');
    throw new Error('expected a throw');
  } catch (err) {
    assert(err instanceof InvalidTransactionIdentifierError);
    assertEquals(err.platform, 'google');
  }
});

// ------------------------------------------- AC5: the populated path is UNCHANGED

Deno.test('DEBUG-447: a populated identifier with no existing row resolves', async () => {
  const supabase = makeMockSupabase({ boundUserId: null });
  await assertNoCrossIdentityReplay(supabase, 'apple', 'txn-123', 'user-1');
  assertEquals(supabase.state.queried, true, 'the ownership query must still run');
});

Deno.test('DEBUG-447: same-uid re-verification stays idempotent (restore purchases)', async () => {
  const supabase = makeMockSupabase({ boundUserId: 'user-1' });
  await assertNoCrossIdentityReplay(supabase, 'apple', 'txn-123', 'user-1');
  assertEquals(supabase.state.queried, true);
});

Deno.test('DEBUG-447: a different uid still raises ReceiptReplayError, not the new error', async () => {
  const supabase = makeMockSupabase({ boundUserId: 'someone-else' });
  await assertRejects(
    () => assertNoCrossIdentityReplay(supabase, 'apple', 'txn-123', 'user-1'),
    ReceiptReplayError,
  );
});

Deno.test('DEBUG-447: a database error on the ownership check still propagates', async () => {
  const supabase = makeMockSupabase({ selectError: { message: 'connection reset' } });
  await assertRejects(
    () => assertNoCrossIdentityReplay(supabase, 'apple', 'txn-123', 'user-1'),
    Error,
    'Replay ownership check failed',
  );
});

// ------------------------------------------------------- the predicate itself

Deno.test('DEBUG-447: isUsableTransactionIdentifier accepts only non-empty strings', () => {
  assertEquals(isUsableTransactionIdentifier('txn-1'), true);
  assertEquals(isUsableTransactionIdentifier(''), false);
  assertEquals(isUsableTransactionIdentifier(undefined), false);
  assertEquals(isUsableTransactionIdentifier(null), false);
  assertEquals(isUsableTransactionIdentifier(0), false);
  assertEquals(isUsableTransactionIdentifier({}), false);
  // Whitespace is a real string and IS accepted — Apple/Google never emit one, and inventing
  // a trim rule here would silently diverge from what the UNIQUE index actually compares.
  assertEquals(isUsableTransactionIdentifier(' '), true);
});
