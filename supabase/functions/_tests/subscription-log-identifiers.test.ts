/**
 * Subscription functions never log an identifier or error text (MAINT-765) - source pin.
 *
 * Compliance ruling: no console argument in the subscription functions may carry a user id, a
 * store transaction id, an order id, a purchase token, a per-notification id, a subscription
 * row id, a whole error object or any error text. Generalises delete-account-uid-log.test.ts
 * (DEBUG-761) from one function to the six files that log around subscriptions
 * (grace-period-automation/handler.ts joined in MAINT-770).
 *
 * WHAT THIS CATCHES. Every console call in every file below, in ANY argument position, is
 * sliced from its `(` to the matching `)`. String literals are blanked (their words are
 * prose, not values) and a template literal keeps only its `${...}` expressions. Calls to the
 * approved wrappers are then removed whole - loggableErrorName(error), appleFailureMetadata(
 * error) and so on map a value to a CLOSED reason, which is the point of them - and what is
 * left must name no tainted identifier and read no .message / .details / .hint / .stack.
 *
 * WHAT IT CANNOT SEE: an alias (`const who = authUid; console.log(who)`). The behavioural
 * leak tests beside each handler capture what actually reaches the console, and catch that.
 *
 * Comments are stripped first (DEBUG-390): this codebase names its anti-patterns in prose.
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';

const ROOT = new URL('../', import.meta.url);

const FILES = [
  'verify-apple-receipt/handler.ts',
  'verify-google-receipt/handler.ts',
  'subscription-webhook/handlers.ts',
  'subscription-webhook/replayCache.ts',
  '_shared/subscriptionAudit.ts',
  'grace-period-automation/handler.ts',
];

/** Wrappers that turn a value into a closed reason or a validated code. Their argument is
 *  exempt; nothing else is. */
const SAFE_WRAPPERS = [
  'loggableErrorName',
  'appleFailureMetadata',
  'googleFailureMetadata',
  'webhookFailureReason',
  'sqlStateOf',
  'safeStoreCode',
  'automationFailure',
];

/** Identifiers that hold a person, a purchase, a notification or an error. */
const TAINTED = [
  'authUid',
  'userId',
  'user_id',
  'uid',
  'sub',
  'orderId',
  'purchaseToken',
  'transactionId',
  'originalTransactionId',
  'subscriptionId',
  'subscription_id',
  'subscription',
  'notificationUUID',
  'messageId',
  'notificationId',
  'notification_id',
  'serviceAccountEmail',
  'verification',
  'mockVerification',
  'payload',
  'body',
  'error',
  'err',
  'updateError',
  'lookupError',
  'upsertError',
  'insErr',
  'e',
  'row',
  'trial',
  'grace',
];

const TAINT_RE = new RegExp(`\\b(?:${TAINTED.join('|')})\\b`);
const ERROR_TEXT_RE = /\.\s*(?:message|details|hint|stack)\b/;
const CONSOLE_CALL = /\bconsole\s*\.\s*(?:log|info|warn|error|debug|trace)\s*\(/g;

function skipString(src: string, start: number): number {
  const quote = src[start];
  let i = start + 1;
  while (i < src.length) {
    if (src[i] === '\\') {
      i += 2;
      continue;
    }
    if (quote === '`' && src[i] === '$' && src[i + 1] === '{') {
      i = skipBraces(src, i + 1);
      continue;
    }
    if (src[i] === quote) return i + 1;
    i++;
  }
  return src.length;
}

/** Index just past the `{...}` opening at `start`, honouring nested strings and braces. */
function skipBraces(src: string, start: number): number {
  let depth = 0;
  let i = start;
  while (i < src.length) {
    const c = src[i];
    if (c === "'" || c === '"' || c === '`') {
      i = skipString(src, i);
      continue;
    }
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return src.length;
}

/** Replace comments with spaces, keeping string and template literals intact. */
export function stripComments(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') {
        out += ' ';
        i++;
      }
    } else if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else if (c === "'" || c === '"' || c === '`') {
      const end = skipString(src, i);
      out += src.slice(i, end);
      i = end;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** Argument text of every console call, sliced from its `(` to the matching `)`. */
export function consoleCallArgs(code: string): string[] {
  const slices: string[] = [];
  for (const m of code.matchAll(CONSOLE_CALL)) {
    const open = (m.index ?? 0) + m[0].length - 1;
    let depth = 0;
    let i = open;
    while (i < code.length) {
      const c = code[i];
      if (c === "'" || c === '"' || c === '`') {
        i = skipString(code, i);
        continue;
      }
      if (c === '(') depth++;
      if (c === ')') {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    slices.push(code.slice(open + 1, i));
  }
  return slices;
}

/** Blank string literals; keep the `${...}` expressions of a template literal (recursively). */
function blankStrings(code: string): string {
  let out = '';
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    if (c === "'" || c === '"') {
      i = skipString(code, i);
      out += ' ';
    } else if (c === '`') {
      const end = skipString(code, i);
      const literal = code.slice(i, end);
      for (let j = 0; j < literal.length; j++) {
        if (literal[j] === '$' && literal[j + 1] === '{') {
          const stop = skipBraces(literal, j + 1);
          out += ' ' + blankStrings(literal.slice(j + 2, stop - 1)) + ' ';
          j = stop - 1;
        }
      }
      i = end;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** Remove every `wrapper(...)` call whole, balanced. Strings are already blanked. */
function removeSafeWrappers(code: string): string {
  const re = new RegExp(`\\b(?:${SAFE_WRAPPERS.join('|')})\\s*\\(`, 'g');
  let out = code;
  for (;;) {
    re.lastIndex = 0;
    const m = re.exec(out);
    if (!m) return out;
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let i = open;
    while (i < out.length) {
      if (out[i] === '(') depth++;
      if (out[i] === ')') {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    out = out.slice(0, m.index) + ' ' + out.slice(i + 1);
  }
}

/** What in one console call's arguments would leak, or [] when it is clean. */
export function leaksIn(args: string): string[] {
  const code = removeSafeWrappers(blankStrings(args));
  const found: string[] = [];
  const taint = code.match(TAINT_RE);
  if (taint) found.push(`identifier ${taint[0]}`);
  const text = code.match(ERROR_TEXT_RE);
  if (text) found.push(`error text ${text[0].replace(/\s+/g, '')}`);
  return found;
}

/** Every leaking console call in `src`, as `args => reasons`. */
export function leakingCalls(src: string): string[] {
  return consoleCallArgs(stripComments(src))
    .map((args) => [args, leaksIn(args)] as const)
    .filter(([, why]) => why.length > 0)
    .map(([args, why]) => `${args.replace(/\s+/g, ' ').trim()} => ${why.join(', ')}`);
}

function read(path: string): string {
  return Deno.readTextFileSync(new URL(path, ROOT));
}

Deno.test('no console call in the subscription functions carries an identifier or error text', () => {
  let total = 0;
  for (const file of FILES) {
    const src = read(file);
    const calls = consoleCallArgs(stripComments(src));
    // Non-vacuity: the slicer sees calls in every file, so a rename or a move fails here
    // instead of the pin quietly checking nothing.
    assert(calls.length >= 1, `${file}: no console call sliced`);
    total += calls.length;
    assertEquals(leakingCalls(src), [], `${file}: a console call carries an identifier or error text`);
  }
  assert(total >= 45, `only ${total} console calls sliced across the six files - the pin is reading too little`);
});

Deno.test('the approved wrappers still exist where the pin says they are', () => {
  const where: Array<[string, string]> = [
    ['verify-apple-receipt/handler.ts', 'appleFailureMetadata'],
    ['verify-apple-receipt/handler.ts', 'loggableErrorName'],
    ['verify-google-receipt/handler.ts', 'googleFailureMetadata'],
    ['verify-google-receipt/handler.ts', 'loggableErrorName'],
    ['subscription-webhook/handlers.ts', 'webhookFailureReason'],
    ['grace-period-automation/handler.ts', 'automationFailure'],
  ];
  for (const [file, name] of where) {
    assert(
      new RegExp(`function\\s+${name}\\s*\\(`).test(stripComments(read(file))),
      `${file} does not define ${name} - a wrapper the pin exempts must be real`,
    );
  }
});

// The pipeline must fire on the shapes that leak and stay silent on the ones that do not.

for (
  const [label, src] of [
    ['bare uid as a second argument', "console.log('x', authUid);"],
    ['uid in a template literal', 'console.log(`x ${authUid}`);'],
    ['the pre-fix Apple start line', "console.log('[Apple Receipt Verification] Starting verification for user:', authUid);"],
    ['an order id via member access', "console.log('Success:', verification.subscriptionId);"],
    ['a bare error object', "console.error('[Apple Receipt Verification] Verification failed:', error);"],
    ['the whole Postgres error', "console.error('[Apple Webhook] Failed to update subscription:', updateError);"],
    ['a notification uuid', "console.log('[Apple Webhook] Replay detected, no-op:', notificationUUID);"],
    ['a message id', "console.log('Replay detected', messageId);"],
    ['the replay-cache id template', 'console.log(`[Replay Cache] Concurrent insert for ${source}/${notificationId}; x`);'],
    ['error.message', "console.warn('[Webhook] Deferred for redelivery:', error.message);"],
    ['err.details', "console.error('x', err.details);"],
    ['a stack', "console.error('x', e.stack);"],
    ['String(err)', "console.error('x', String(err));"],
    ['JSON.stringify of an error', "console.error('x', JSON.stringify(err));"],
    ['a message inside a JSON payload (the pre-fix audit line)', "console.error('FAILED', JSON.stringify({ event_type: event.eventType, subscription_id: event.subscriptionId, message: (error as { message?: string }).message }));"],
    ['multi-line object', "console.error(\n  'x',\n  { who: authUid },\n);"],
    ['quoted paren before the arg', "console.log('(', authUid);"],
    ['a wrapper that does not wrap the leak', "console.error('x', loggableErrorName(error), authUid);"],
    ['the service-account email', "console.log('[Google Webhook] OIDC verified, sa:', serviceAccountEmail);"],
    ['a nested template expression', 'console.log(`a ${`b ${userId}`}`);'],
    ['the pre-fix grace heartbeat insert line', "console.error('[Automation] Heartbeat run-record insert returned an error:', insErr);"],
    ['the pre-fix grace heartbeat catch line', "console.error('[Automation] Failed to write heartbeat run-record:', e);"],
    ['the pre-fix grace stale-select line', "console.error('[Automation] Failed to get stale receipts:', error);"],
    ['a grace row id', "console.log('[Automation] Skipping row', row.id);"],
  ] as const
) {
  Deno.test(`control fires: ${label}`, () => {
    assertEquals(leakingCalls(src).length, 1, label);
  });
}

for (
  const [label, src] of [
    ['line comment', "// console.log('x', authUid);"],
    ['block comment', "/* console.error('x', error.message) */"],
    ['JSDoc', "/**\n * Never console.log(authUid) here.\n */\nconsole.log('done');"],
    ['fixed message', "console.log('[Apple Receipt Verification] Starting verification');"],
    ['prose naming an identifier inside a string', "console.warn('Missing notification_id for the error path');"],
    ['loggableErrorName(error)', "console.error('Unexpected error:', loggableErrorName(error));"],
    ['appleFailureMetadata(error)', "console.error('Verification failed:', appleFailureMetadata(error).reason);"],
    ['googleFailureMetadata(error)', "const f = googleFailureMetadata(error);\nconsole.error('x', f.reason, f.upstream_status);"],
    ['webhookFailureReason(updateError)', "const f = webhookFailureReason(updateError);\nconsole.error('x', f.reason, f.code ?? null);"],
    ['a validated code', "console.error('x', JSON.stringify({ event_type: event.eventType, code: sqlStateOf(error) }));"],
    ['a sanitised store code', "console.log('Processing:', safeStoreCode(notificationType), safeStoreCode(subtype));"],
    ['automationFailure(insErr)', "console.error('[Automation] Heartbeat insert failed:', JSON.stringify(automationFailure(insErr)));"],
    ['a platform literal template', 'console.warn(`[Replay Cache] Missing notification_id for source=${source}`);'],
    ['an id outside the call', "console.log('x');\nawait deleteUser(authUid, false);"],
    ['URL string with //', "console.log('see https://example.test/a');"],
  ] as const
) {
  Deno.test(`control stays silent: ${label}`, () => {
    assertEquals(leakingCalls(src), [], label);
  });
}
