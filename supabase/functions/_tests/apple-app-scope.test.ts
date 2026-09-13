/**
 * INFRA-449 — Apple payloads must be scoped to THIS app before they are trusted.
 *
 * THE HOLE THIS CLOSES. `verifyAppleJWS` anchors the x5c chain to a pinned Apple Root
 * CA - G3 SPKI and verifies the ES256 signature. That proves *Apple* signed the payload.
 * It does not prove Apple signed it **for us** — every App Store developer's transaction
 * JWS chains to that same root, so a genuine, correctly-signed notification from any
 * other developer's app passes verification. Grepped before writing this: zero
 * `bundleId` / `appAppleId` checks existed anywhere in `supabase/functions`, and the
 * `environment` claim was never read at all.
 *
 * WHY IT WAS PREVIOUSLY COVERED, AND IS ABOUT TO STOP BEING. The legacy `verifyReceipt`
 * call carried `APPLE_SHARED_SECRET`, which was implicit app-scoping — Apple would only
 * answer for the app that secret belonged to. The App Store Server API migration drops
 * that secret, so the implicit scoping goes with it. This assertion has to exist before
 * the migration, not after, which is why it is carved out of INFRA-449 and shipped alone.
 *
 * WHAT IS DELIBERATELY *NOT* ASSERTED HERE. Pinning `environment` to `Production`
 * specifically is not expressible today: one Supabase project serves both production and
 * development, and edge-function secrets are project-wide, so a constant or a secret
 * cannot discriminate. What IS enforced is that the claim is present, well-formed, and
 * internally coherent — an unset or unrecognized environment fails closed rather than
 * being ignored. The strict production pin belongs with the environment decision in
 * INFRA-467.
 */

import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  assertAppleAppScope,
  BEING_BUNDLE_ID,
  APPLE_ENVIRONMENTS,
} from '../_shared/verifyAppleJWS.ts';

const OK = { bundleId: 'fyi.being.app', environment: 'Production' };

Deno.test('the pinned bundle id is fyi.being.app, not the retired com.being.app', () => {
  // MAINT-161: com.being.app was claimed by a third party and retired. Asserting the
  // wrong identifier would reject every genuine notification while still accepting
  // nothing — a fail-closed outage rather than a security control.
  assertEquals(BEING_BUNDLE_ID, 'fyi.being.app');
});

Deno.test('a well-formed payload for this app is accepted, and its claims returned', () => {
  const scope = assertAppleAppScope(OK, 'test');
  assertEquals(scope.bundleId, 'fyi.being.app');
  assertEquals(scope.environment, 'Production');
});

Deno.test('Sandbox is a valid environment — this must not become a production-only pin', () => {
  // Sandbox notifications are how the purchase path is exercised before launch. A
  // production-only assertion would make the whole subscription flow untestable.
  const scope = assertAppleAppScope({ ...OK, environment: 'Sandbox' }, 'test');
  assertEquals(scope.environment, 'Sandbox');
  assertEquals(APPLE_ENVIRONMENTS.includes('Sandbox'), true);
});

Deno.test('THE FORGERY CASE — another developer\'s app is rejected', () => {
  // This payload is genuinely Apple-signed and chains to the same pinned root. Only the
  // bundle id distinguishes it, which is precisely why the check has to exist.
  assertThrows(
    () => assertAppleAppScope({ ...OK, bundleId: 'com.someoneelse.app' }, 'test'),
    Error,
    'bundleId',
  );
});

Deno.test('the retired com.being.app identifier is also rejected', () => {
  assertThrows(
    () => assertAppleAppScope({ ...OK, bundleId: 'com.being.app' }, 'test'),
    Error,
    'bundleId',
  );
});

Deno.test('an ABSENT bundleId fails closed — it is not treated as "unknown, allow"', () => {
  assertThrows(() => assertAppleAppScope({ environment: 'Production' }, 'test'), Error, 'bundleId');
});

Deno.test('a non-string or empty bundleId fails closed', () => {
  for (const bad of [null, undefined, '', 123, {}, []]) {
    assertThrows(
      () => assertAppleAppScope({ ...OK, bundleId: bad as unknown as string }, 'test'),
      Error,
      'bundleId',
    );
  }
});

Deno.test('an ABSENT environment fails closed', () => {
  // Sandbox transactions are mintable free by anyone with a sandbox Apple ID, so an
  // unread environment claim is a real acceptance path, not a formality.
  assertThrows(() => assertAppleAppScope({ bundleId: BEING_BUNDLE_ID }, 'test'), Error, 'environment');
});

Deno.test('an UNRECOGNIZED environment fails closed rather than passing through', () => {
  for (const bad of ['production', 'PRODUCTION', 'sandbox', 'Staging', '', null, 7]) {
    assertThrows(
      () => assertAppleAppScope({ ...OK, environment: bad as unknown as string }, 'test'),
      Error,
      'environment',
    );
  }
});

Deno.test('the thrown message names the context, so two call sites are distinguishable', () => {
  // The webhook validates both the outer notification and the inner transaction JWS.
  // A bare message would leave an operator unable to tell which one failed.
  assertThrows(
    () => assertAppleAppScope({ ...OK, bundleId: 'com.other.app' }, 'inner transaction'),
    Error,
    'inner transaction',
  );
});

Deno.test('the message never echoes the full payload — only the offending claim', () => {
  // Edge-function logs are operator-visible; a payload dump would put transaction
  // identifiers into them for no diagnostic gain.
  try {
    assertAppleAppScope({ ...OK, bundleId: 'com.other.app', appAccountToken: 'user-uuid-here' }, 'test');
    throw new Error('should have thrown');
  } catch (e) {
    const msg = (e as Error).message;
    assertEquals(msg.includes('user-uuid-here'), false);
    assertEquals(msg.includes('com.other.app'), true);
  }
});

/**
 * CONTROL — proves the suite can still go red. If `assertAppleAppScope` were replaced by
 * a no-op, every `assertThrows` above would fail; this asserts the inverse directly, so a
 * stub that always throws cannot pass either.
 */
Deno.test('CONTROL: the validator is not a blanket accept and not a blanket reject', () => {
  let accepted = false;
  assertAppleAppScope(OK, 'control');
  accepted = true;
  assertEquals(accepted, true);
  assertThrows(() => assertAppleAppScope({}, 'control'));
});

/**
 * CALL-SITE GUARDS. The tests above prove the validator is correct; they prove nothing
 * about it being REACHED. A correct validator that no call site invokes is the exact
 * shape of a control that reads as shipped and isn't — so these assert the wiring.
 *
 * Source-shape, because `subscription-webhook/index.ts` calls `serve()` at module scope
 * and cannot be imported without starting a server. Same technique, and same reason, as
 * `mock-receipt-gate.test.ts`. Per DEBUG-390, comments are stripped before matching (the
 * file deliberately explains this control in prose, which a bare substring check would
 * match) and each matcher is paired with a control proving it can still fire.
 */
const WEBHOOK_SRC = await Deno.readTextFile(
  new URL('../subscription-webhook/index.ts', import.meta.url),
);

/** Strip line and block comments so prose about the control cannot satisfy a matcher. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

Deno.test('call site: the webhook imports the app-scope assertion', () => {
  const code = stripComments(WEBHOOK_SRC);
  assertEquals(/import\s*\{[^}]*assertAppleAppScope[^}]*\}\s*from/.test(code), true);
});

Deno.test('call site: BOTH the notification body and the inner transaction are scoped', () => {
  const code = stripComments(WEBHOOK_SRC);
  const calls = code.match(/assertAppleAppScope\s*\(/g) || [];
  // Two separately-signed JWSs; scoping only the envelope leaves the inner one unchecked.
  assertEquals(calls.length >= 2, true);
});

Deno.test('call site: the scope check precedes the database update', () => {
  const code = stripComments(WEBHOOK_SRC);
  const firstAssert = code.indexOf('assertAppleAppScope(');
  const firstUpdate = code.indexOf(".from('subscriptions')");
  assertEquals(firstAssert > -1, true);
  assertEquals(firstUpdate > -1, true);
  assertEquals(firstAssert < firstUpdate, true);
});

Deno.test('CONTROL: the call-site matchers can go red, and comment-stripping is not vacuous', () => {
  // A body that only MENTIONS the validator in prose must not satisfy the wiring check —
  // this is the DEBUG-390 failure mode the stripping exists for.
  const proseOnly = '// we should call assertAppleAppScope( here one day\nconst x = 1;';
  assertEquals(/assertAppleAppScope\s*\(/.test(stripComments(proseOnly)), false);
  // …and real code still matches after stripping.
  const realCall = '/* doc */\nconst s = assertAppleAppScope(data, "x");';
  assertEquals(/assertAppleAppScope\s*\(/.test(stripComments(realCall)), true);
  // The stripped webhook source must not have been reduced to nothing.
  assertEquals(stripComments(WEBHOOK_SRC).trim().length > 500, true);
});
