/**
 * Subscription audit-log error handling — fail-closed structural pin (DEBUG-446).
 *
 * THE DEFECT THIS PINS AGAINST. Every `log_subscription_event` call site used to be a bare
 * `await supabase.rpc(...)` whose returned `error` was never destructured. The success path
 * sent an event_type the CHECK constraint rejected, Postgres returned the violation, and
 * nothing read it — so every successful receipt verification wrote no audit row and reported
 * nothing. The missing enum value was one line; the swallowed error is what made it invisible
 * and would have hidden the next mismatch identically.
 *
 * WHY SOURCE-SHAPE AND NOT BEHAVIOURAL. Two independent reasons, both structural:
 *   1. index.ts calls Deno.serve at module scope, so importing it starts a listener
 *      (mock-receipt-gate.test.ts documents the same constraint).
 *   2. The `Edge Functions (Deno)` CI job runs with `--cached-only` and no network egress
 *      (INFRA-354), so no CI-eligible test here can reach a real Postgres and observe a real
 *      constraint violation. The DB-level proof lives in supabase/tests/ and is run by hand.
 * What CAN gate the merge is the shape of the source: assert no call site discards the RPC
 * result, and that the shared writer actually reads and surfaces the error.
 *
 * DEBUG-390 DISCIPLINE APPLIES AND IS LOAD-BEARING. This file's own prose, and the helper's,
 * both contain the literal `supabase.rpc(` while describing the anti-pattern. An unstripped
 * assertion would therefore fail on correct code, or — worse — a naive "does the file mention
 * error handling" check would pass on a file that only describes it. Comments are stripped
 * first, and the final test proves the matchers can still go red.
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

/** Every function that writes subscription audit events. */
const CALLERS = [
  'verify-apple-receipt',
  'verify-google-receipt',
  'subscription-webhook',
  'grace-period-automation',
] as const;

const HELPER_PATH = new URL('../_shared/subscriptionAudit.ts', import.meta.url);

function readCaller(name: string): string {
  return stripComments(
    Deno.readTextFileSync(new URL(`../${name}/index.ts`, import.meta.url)),
  );
}

/**
 * Test 1 — no caller invokes the audit RPC directly.
 *
 * A direct `supabase.rpc('log_subscription_event', ...)` in a caller is the exact shape that
 * discarded the error. Routing every site through the shared writer is what makes the NEXT
 * call site correct by default, so the pin is on the absence of the raw call, not on the
 * presence of a destructure at each site (which twelve authors could each forget).
 */
Deno.test('DEBUG-446: no caller calls log_subscription_event RPC directly', () => {
  for (const name of CALLERS) {
    const src = readCaller(name);
    assertEquals(
      /supabase\s*\.\s*rpc\(\s*['"]log_subscription_event['"]/.test(src),
      false,
      `${name}/index.ts calls the log_subscription_event RPC directly. Route it through ` +
        `logSubscriptionEvent() from _shared/subscriptionAudit.ts so the returned error is read.`,
    );
  }
});

/** Test 2 — every caller imports and uses the shared writer. */
Deno.test('DEBUG-446: every caller routes audit writes through the shared writer', () => {
  for (const name of CALLERS) {
    const src = readCaller(name);
    assert(
      /import\s*\{[^}]*\blogSubscriptionEvent\b[^}]*\}\s*from\s*['"]\.\.\/_shared\/subscriptionAudit\.ts['"]/
        .test(src),
      `${name}/index.ts does not import logSubscriptionEvent from _shared/subscriptionAudit.ts`,
    );
    assert(
      /\blogSubscriptionEvent\s*\(/.test(src),
      `${name}/index.ts imports logSubscriptionEvent but never calls it`,
    );
  }
});

/**
 * Test 3 — the shared writer reads the error and surfaces it.
 *
 * This is the whole point of the indirection. A writer that destructured `error` and then
 * ignored it would satisfy Tests 1 and 2 completely while reproducing the defect.
 */
Deno.test('DEBUG-446: the shared writer destructures and surfaces the RPC error', () => {
  const src = stripComments(Deno.readTextFileSync(HELPER_PATH));

  assert(
    /const\s*\{\s*error\s*\}\s*=\s*await\s+supabase\s*\.\s*rpc\(/.test(src),
    'subscriptionAudit.ts does not destructure `error` from the rpc() result',
  );
  assert(
    /if\s*\(\s*error\s*\)/.test(src),
    'subscriptionAudit.ts destructures `error` but never branches on it',
  );
  assert(
    /console\.error\(/.test(src),
    'subscriptionAudit.ts branches on `error` but does not surface it — a silent branch is ' +
      'the defect DEBUG-446 fixed, wearing a different shape',
  );
});

/**
 * Test 4 — the control. Prove the matchers can still go red.
 *
 * A comment-stripped source assertion paired with a narrow regex is exactly the combination
 * that can silently match nothing at all. Without this, Tests 1–3 could all be vacuous — green
 * against a file that no longer contains what they claim to check — and nobody would know.
 */
Deno.test('DEBUG-446: the matchers fire on known-bad source', () => {
  const KNOWN_BAD_CALLER = `
    await supabase.rpc('log_subscription_event', { p_user_id: x });
  `;
  assertEquals(
    /supabase\s*\.\s*rpc\(\s*['"]log_subscription_event['"]/.test(KNOWN_BAD_CALLER),
    true,
    'Test 1 matcher no longer detects a direct RPC call — it is vacuous',
  );

  const KNOWN_BAD_HELPER = `
    const result = await supabase.rpc('log_subscription_event', {});
    return true;
  `;
  assertEquals(
    /const\s*\{\s*error\s*\}\s*=\s*await\s+supabase\s*\.\s*rpc\(/.test(KNOWN_BAD_HELPER),
    false,
    'Test 3 matcher passes a helper that never destructures error — it is vacuous',
  );

  // And that stripComments has not eaten the file wholesale, which would make every
  // "absence" assertion trivially true.
  const helperStripped = stripComments(Deno.readTextFileSync(HELPER_PATH));
  assert(
    helperStripped.trim().length > 200,
    'stripComments() reduced subscriptionAudit.ts to near-nothing — the absence assertions ' +
      'in this file would be vacuously true',
  );
});
