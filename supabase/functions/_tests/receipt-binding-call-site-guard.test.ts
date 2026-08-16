/**
 * Call-site identifier guards — structural pin (DEBUG-447 AC2).
 *
 * AC2 requires the decision to be made "at the call site as well as in the helper", so that a
 * future edit to receiptBinding.ts alone cannot silently reopen the fail-open gap. That is a
 * property of the two verifiers, and it cannot be unit-tested: both index.ts files call
 * `Deno.serve` at module scope (importing one starts a listener — mock-receipt-gate.test.ts
 * documents the same constraint) and `updateSubscription` is not exported.
 *
 * So this pins the source shape, which is what the repo already does for index.ts-embedded
 * logic. Two properties, and the ORDER matters as much as the presence:
 *   1. each verifier checks the identifier itself, not only via the helper;
 *   2. that check appears BEFORE the `.upsert(` — AC2's "must not write a subscriptions row
 *      at all" is a statement about ordering, and a guard placed after the write satisfies
 *      "the guard exists" while delivering none of what it is for.
 *
 * DEBUG-390 discipline: this file's own prose and the verifiers' comments both contain the
 * literal `isUsableTransactionIdentifier`, so comments are stripped before matching and the
 * final test proves the matchers can still go red.
 */

import {
  assert,
  assertEquals,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const VERIFIERS = ['verify-apple-receipt', 'verify-google-receipt'] as const;

function readVerifier(name: string): string {
  return stripComments(
    Deno.readTextFileSync(new URL(`../${name}/index.ts`, import.meta.url)),
  );
}

Deno.test('DEBUG-447: each verifier imports the guard primitives', () => {
  for (const name of VERIFIERS) {
    const src = readVerifier(name);
    assert(
      /\bisUsableTransactionIdentifier\b/.test(src),
      `${name}/index.ts does not reference isUsableTransactionIdentifier`,
    );
    assert(
      /\bInvalidTransactionIdentifierError\b/.test(src),
      `${name}/index.ts does not reference InvalidTransactionIdentifierError`,
    );
  }
});

Deno.test('DEBUG-447: each verifier guards the identifier BEFORE its upsert', () => {
  for (const name of VERIFIERS) {
    const src = readVerifier(name);

    const guard = src.search(/if\s*\(\s*!\s*isUsableTransactionIdentifier\s*\(/);
    assert(guard !== -1, `${name}/index.ts has no call-site identifier guard`);

    const upsert = src.search(/\.upsert\s*\(/);
    assert(upsert !== -1, `${name}/index.ts has no .upsert( — has the write path moved?`);

    assert(
      guard < upsert,
      `${name}/index.ts guards the identifier AFTER its upsert. AC2 requires no subscriptions ` +
        `row be written at all when the identifier is unusable; a guard after the write ` +
        `satisfies the letter of "a guard exists" and none of its purpose.`,
    );
  }
});

Deno.test('DEBUG-447: each verifier has a dedicated catch arm that audits the rejection', () => {
  for (const name of VERIFIERS) {
    const src = readVerifier(name);
    assert(
      /err\s+instanceof\s+InvalidTransactionIdentifierError/.test(src),
      `${name}/index.ts has no dedicated catch arm for InvalidTransactionIdentifierError — it ` +
        `would fall through to the generic outer catch and become an undifferentiated 500 ` +
        `with no audit row, which is fail-closed but undiagnosable.`,
    );
    assert(
      /missing_txn_identifier/.test(src),
      `${name}/index.ts's catch arm does not write a distinguishable audit reason`,
    );
  }
});

/**
 * The control. A comment-stripped source assertion paired with a narrow regex is exactly the
 * combination that can silently match nothing — without this, every test above could be
 * vacuous and still green.
 */
Deno.test('DEBUG-447: the matchers fire on known-bad source', () => {
  const GUARD_AFTER_UPSERT = `
    await supabase.from('subscriptions').upsert({ id: 1 });
    if (!isUsableTransactionIdentifier(token)) { throw new InvalidTransactionIdentifierError('x'); }
  `;
  const g = GUARD_AFTER_UPSERT.search(/if\s*\(\s*!\s*isUsableTransactionIdentifier\s*\(/);
  const u = GUARD_AFTER_UPSERT.search(/\.upsert\s*\(/);
  assert(g !== -1 && u !== -1, 'ordering matchers no longer find their anchors — vacuous');
  assertEquals(g < u, false, 'the ordering assertion would pass a guard placed after the upsert');

  const NO_CATCH_ARM = `if (err instanceof ReceiptReplayError) { return; } throw err;`;
  assertEquals(
    /err\s+instanceof\s+InvalidTransactionIdentifierError/.test(NO_CATCH_ARM),
    false,
    'the catch-arm matcher passes source with no such arm — vacuous',
  );

  for (const name of VERIFIERS) {
    assert(
      readVerifier(name).trim().length > 500,
      `stripComments() reduced ${name}/index.ts to near-nothing — the assertions above would ` +
        `be operating on an empty string`,
    );
  }
});
