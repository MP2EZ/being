/**
 * Mock-receipt gate — fail-closed structural pin.
 *
 * Both receipt verifiers carry a MOCK MODE branch that returns a valid,
 * year-long subscription when the caller supplies a string with the right
 * prefix. Deployed ungated, that is an entitlement bypass reachable by anyone
 * holding the anon key, which ships in the app bundle.
 *
 * These functions are deployed by hand and there is no CI deploy, so a
 * behavioural test against a running instance cannot gate the merge. What CAN
 * gate it is the shape of the source: assert the branch is gated, that the
 * gate defaults to REJECT, and that it runs before any mock response is built.
 *
 * Why source-shape and not an import: index.ts calls Deno.serve at module
 * scope, so importing it starts a listener. Reading the file is the cheaper
 * and more direct way to pin the property that matters.
 *
 * DEBUG-390 discipline applies and is load-bearing here: the gate's own
 * explanatory comments contain the literal ALLOW_MOCK_RECEIPTS, so an
 * unstripped assertion would pass on a file whose gate had been deleted and
 * only described. Comments are stripped first, every matcher is
 * quote-or-syntax-bounded, and the final test proves the matchers can still
 * go red.
 */

import {
  assert,
  assertEquals,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';

/** Strip block and line comments so prose cannot satisfy a source assertion. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const TARGETS = [
  {
    name: 'verify-apple-receipt',
    path: new URL('../verify-apple-receipt/index.ts', import.meta.url),
    prefix: 'mock_receipt_',
  },
  {
    name: 'verify-google-receipt',
    path: new URL('../verify-google-receipt/index.ts', import.meta.url),
    prefix: 'mock_token_',
  },
] as const;

/** The gate must reject on anything that is not exactly 'true' (opt-in). */
const FAIL_CLOSED_GATE =
  /Deno\.env\.get\(\s*['"]ALLOW_MOCK_RECEIPTS['"]\s*\)\s*!==\s*['"]true['"]/;

for (const target of TARGETS) {
  Deno.test(`${target.name}: mock branch is gated fail-closed`, async () => {
    const raw = await Deno.readTextFile(target.path);
    const src = stripComments(raw);

    // Anti-vacuity: a comment-stripped source that collapsed to nothing would
    // make every negative assertion below trivially true.
    assert(
      src.length > 500,
      `stripped source implausibly short (${src.length}) — stripper is over-matching`,
    );

    const branchIdx = src.indexOf(`startsWith('${target.prefix}')`);
    assert(
      branchIdx !== -1,
      `mock branch not found in executable source of ${target.name}`,
    );

    assert(
      FAIL_CLOSED_GATE.test(src),
      `${target.name} has a mock branch with no fail-closed ALLOW_MOCK_RECEIPTS gate`,
    );

    // The gate must sit INSIDE the branch, before the mock response is built —
    // a gate placed after the success response would be inert.
    const gateIdx = src.search(FAIL_CLOSED_GATE);
    const grantIdx = src.indexOf('valid: true');
    assert(gateIdx > branchIdx, `${target.name}: gate precedes the mock branch`);
    assert(
      grantIdx === -1 || gateIdx < grantIdx,
      `${target.name}: gate does not run before the mock entitlement is granted`,
    );
  });
}

Deno.test('the fail-closed matcher can still go red', () => {
  // Guards against the failure mode this file's own discipline creates: a
  // comment-stripped narrow regex that silently matches nothing looks exactly
  // like a passing test.
  assertEquals(
    FAIL_CLOSED_GATE.test(`if (Deno.env.get('ALLOW_MOCK_RECEIPTS') !== 'true') {`),
    true,
    'matcher failed against a known-GOOD gate — it would never detect the real one',
  );

  // Fail-OPEN spellings must NOT satisfy it. Each of these deploys the bypass.
  for (const bad of [
    `if (Deno.env.get('ALLOW_MOCK_RECEIPTS') === 'false') {`,
    `if (!Deno.env.get('ALLOW_MOCK_RECEIPTS')) {`,
    `if (Deno.env.get('ALLOW_MOCK_RECEIPTS') !== 'false') {`,
    `// Deno.env.get('ALLOW_MOCK_RECEIPTS') !== 'true'`,
  ]) {
    assertEquals(
      FAIL_CLOSED_GATE.test(stripComments(bad)),
      false,
      `matcher accepted a fail-open or commented spelling: ${bad}`,
    );
  }
});

Deno.test('comment-only mentions do not satisfy the gate assertion', () => {
  const commentedOut = `
    /* if (Deno.env.get('ALLOW_MOCK_RECEIPTS') !== 'true') { reject(); } */
    // if (Deno.env.get('ALLOW_MOCK_RECEIPTS') !== 'true') { reject(); }
    if (receiptData.startsWith('mock_receipt_')) { grant(); }
  `;
  assertEquals(
    FAIL_CLOSED_GATE.test(stripComments(commentedOut)),
    false,
    'a gate that exists only in prose was accepted as real',
  );
});
