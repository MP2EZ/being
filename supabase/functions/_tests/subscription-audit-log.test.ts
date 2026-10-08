/**
 * logSubscriptionEvent's failure line carries no identifier and no Postgres text (MAINT-765).
 *
 * The line must exist (DEBUG-446 pins it in subscription-audit-error-handling.test.ts: a
 * silent failure there made every audit write invisible). What it SAYS is the question here:
 * Postgres error text is NOT safe to log - a constraint violation quotes the row's values -
 * so the line carries the event type and a validated SQLSTATE, nothing else.
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { logSubscriptionEvent } from '../_shared/subscriptionAudit.ts';
import { captureConsole } from './helpers/consoleCapture.ts';

const SENTINEL = 'SENTINEL_AUDIT_TEXT';
const USER = '0b7f3c52-9d1e-4a6b-8f20-5c1d7e9a4b13';
const SUBSCRIPTION = `${SENTINEL}-subscription-id`;

function failingRpc(error: Record<string, unknown>) {
  return { rpc: () => Promise.resolve({ data: null, error }) };
}

async function failure(error: Record<string, unknown>) {
  const { result, lines } = await captureConsole(() =>
    logSubscriptionEvent(failingRpc(error), {
      userId: USER,
      subscriptionId: SUBSCRIPTION,
      eventType: 'receipt_verification_succeeded',
      metadata: { platform: 'apple' },
    })
  );
  return { result, lines };
}

Deno.test('a failed audit write logs the event type and the SQLSTATE, never the text, the user or the subscription', async () => {
  const { result, lines } = await failure({
    code: '23514',
    message: `new row violates check constraint, Failing row contains (${SENTINEL})`,
    hint: SENTINEL,
    details: SENTINEL,
  });
  assertEquals(result, false);
  assertEquals(lines.length, 1, 'the DEBUG-446 line must still be emitted, exactly once');
  assert(lines[0].includes('receipt_verification_succeeded'), lines[0]);
  assert(lines[0].includes('23514'), lines[0]);
  for (const forbidden of [SENTINEL, USER, SUBSCRIPTION, 'subscription_id', 'message', 'hint', 'details']) {
    assert(!lines[0].includes(forbidden), `the line carries ${JSON.stringify(forbidden)}: ${lines[0]}`);
  }
});

Deno.test('a code that is not a SQLSTATE renders as null', async () => {
  for (const code of ['SENTINEL_CODE', '2351', '235140', '2351a', 23514, undefined, null, '']) {
    const { lines } = await failure({ code, message: SENTINEL });
    assertEquals(lines.length, 1);
    assert(lines[0].includes('"code":null'), `${String(code)}: ${lines[0]}`);
    assert(!lines[0].includes(SENTINEL), lines[0]);
  }
});

Deno.test('an error with no code at all still logs the event type', async () => {
  const { lines } = await failure({ message: SENTINEL });
  assert(lines[0].includes('receipt_verification_succeeded') && lines[0].includes('"code":null'), lines[0]);
});

Deno.test('a non-object error (a thrown string) is not echoed', async () => {
  const { result, lines } = await captureConsole(() =>
    logSubscriptionEvent({ rpc: () => Promise.resolve({ data: null, error: SENTINEL }) }, {
      userId: USER,
      subscriptionId: null,
      eventType: 'subscription_expired',
      metadata: {},
    })
  );
  assertEquals(result, false);
  assertEquals(lines.length, 1);
  assert(lines[0].includes('subscription_expired') && !lines[0].includes(SENTINEL), lines[0]);
});

Deno.test('a successful write logs nothing and returns true', async () => {
  const { result, lines } = await captureConsole(() =>
    logSubscriptionEvent({ rpc: () => Promise.resolve({ data: null, error: null }) }, {
      userId: USER,
      subscriptionId: SUBSCRIPTION,
      eventType: 'x',
      metadata: {},
    })
  );
  assertEquals(result, true);
  assertEquals(lines, []);
});

Deno.test('control: the capture sees the old line shape (user, subscription, message)', async () => {
  const { lines } = await captureConsole(() => {
    console.error('FAILED', JSON.stringify({ subscription_id: SUBSCRIPTION, message: SENTINEL }));
  });
  assert(lines[0].includes(SENTINEL) && lines[0].includes(SUBSCRIPTION));
});
