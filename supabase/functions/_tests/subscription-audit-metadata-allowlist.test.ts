/**
 * DEBUG-839 — every logSubscriptionEvent call's metadata keys are an ALLOWLIST, per call site.
 *
 * subscription_events rows are kept three years and outlive a subscription transfer (FEAT-833),
 * so a store date written into an old uid's audit metadata is an exact-value join onto the new
 * uid's subscriptions row. The leak is the VALUE, not the key name: `ends_at:
 * grace.grace_period_end` leaks as surely as `grace_period_end:`. So this pin is closed in both
 * directions — a key outside its site's set fails, and any metadata value expression naming a
 * store-date field fails, under any key.
 *
 * Source-shape, not behavioural, because the sites span four functions and most of their audit
 * branches need signed store payloads to reach. The behavioural half for the retired automation
 * writes is grace-period-automation-log-leak.test.ts. The DB backstop is the
 * subscription_events_metadata_no_store_dates CHECK (20261022000400).
 *
 * Per DEBUG-390: comments are stripped first (this codebase names the forbidden shapes in
 * prose), each call is sliced on balanced parentheses, every spread must resolve to a known
 * source of keys or the pin fails, and every matcher has a control that goes red.
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';

const FUNCTIONS_DIR = new URL('..', import.meta.url).pathname;

const STORE_DATE_FIELDS = /\b(trial_end_date|grace_period_end)\b/;
const RETIRED_EVENT_TYPES = ["'trial_ending_soon'", "'grace_period_ending'"];

/** `${file}::${eventType expression}` → the metadata keys that site may write. */
const ALLOWED: Record<string, string[]> = {
  "verify-apple-receipt/handler.ts::'receipt_verification_succeeded'": ['platform', 'environment', 'verified_at'],
  "verify-apple-receipt/handler.ts::'receipt_verification_failed'": ['platform', 'reason', 'timestamp'],
  "verify-google-receipt/handler.ts::'receipt_verification_succeeded'": ['platform', 'verified_at'],
  "verify-google-receipt/handler.ts::'receipt_verification_failed'": ['platform', 'reason', 'upstream_status', 'timestamp'],
  'subscription-webhook/handlers.ts::w.transition.eventType': [
    'platform',
    'notification_type',
    'product_type',
    'refund_type',
    'timestamp',
  ],
  'grace-period-automation/handler.ts::eventType': ['platform', 'source', 'previous_status', 'new_status', 'verified_at'],
};

/** Below this many sliced calls the pin is matching nothing it should: 12 after DEBUG-839 (apple 5, google 5, webhook 1, automation 1). */
const MIN_CALLS = 12;

interface SourceFile {
  path: string;
  src: string;
}

// ---------------------------------------------------------------------------
// Lexing helpers
// ---------------------------------------------------------------------------

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

/** Index just past the bracket that closes the one at `open`, skipping string contents. */
function matchClose(src: string, open: number): number {
  const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
  const stack: string[] = [];
  let quote: string | null = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (pairs[c]) stack.push(pairs[c]);
    else if (c === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return i + 1;
    }
  }
  throw new Error(`unbalanced bracket at ${open}`);
}

/** Split `body` (the inside of a bracket) on commas at depth 0. */
function splitTop(body: string, sep = ','): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if ('({['.includes(c)) depth++;
    else if (')}]'.includes(c)) depth--;
    else if (c === sep && depth === 0) {
      out.push(body.slice(start, i));
      start = i + 1;
    }
  }
  out.push(body.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Every object literal appearing at the top level of `expr`. */
function objectLiterals(expr: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '{') {
      const end = matchClose(expr, i);
      out.push(expr.slice(i, end));
      i = end - 1;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The analyzer
// ---------------------------------------------------------------------------

interface Analysis {
  calls: number;
  perSite: Record<string, number>;
  violations: string[];
}

/** Keys of an object literal `{ ... }`, resolving spreads against `file`. */
function keysOf(literal: string, file: SourceFile, where: string, violations: string[]): string[] {
  const keys: string[] = [];
  for (const entry of splitTop(literal.slice(1, -1))) {
    if (entry.startsWith('...')) {
      keys.push(...resolveSpread(entry.slice(3).trim(), file, where, violations));
      continue;
    }
    const colon = entry.indexOf(':');
    const key = (colon === -1 ? entry : entry.slice(0, colon)).trim().replace(/^['"]|['"]$/g, '');
    const value = colon === -1 ? key : entry.slice(colon + 1);
    if (STORE_DATE_FIELDS.test(value)) {
      violations.push(`${where}: metadata value for "${key}" names a store-date field: ${value.trim()}`);
    }
    keys.push(key);
  }
  return keys;
}

function resolveSpread(expr: string, file: SourceFile, where: string, violations: string[]): string[] {
  // `...failure` where `const failure = fn(...)` and fn declares an object-literal return type.
  const ident = expr.match(/^(\w+)$/);
  if (ident) {
    const call = file.src.match(new RegExp(`const\\s+${ident[1]}\\s*=\\s*(\\w+)\\(`));
    const ret = call && file.src.match(new RegExp(`function\\s+${call[1]}\\s*\\([^)]*\\)\\s*:\\s*\\{([^}]*)\\}`));
    if (!ret) {
      violations.push(`${where}: spread ...${expr} does not resolve to a declared return type`);
      return [];
    }
    return splitTop(ret[1].replace(/;/g, ',')).map((m) => m.split(':')[0].trim().replace(/\?$/, ''));
  }

  // `...w.auditMetadata`: every `auditMetadata: { ... }` literal in the same file.
  if (/\.auditMetadata$/.test(expr)) {
    const keys: string[] = [];
    let found = 0;
    for (const m of file.src.matchAll(/\bauditMetadata\s*:\s*\{/g)) {
      const open = m.index! + m[0].length - 1;
      keys.push(...keysOf(file.src.slice(open, matchClose(file.src, open)), file, `${where} (auditMetadata)`, violations));
      found++;
    }
    if (found === 0) violations.push(`${where}: spread ...${expr} found no auditMetadata literal`);
    return keys;
  }

  // A conditional or inline spread: the keys of every object literal it can produce.
  const literals = objectLiterals(expr);
  if (literals.length === 0) {
    violations.push(`${where}: unknown spread ...${expr}`);
    return [];
  }
  return literals.flatMap((l) => keysOf(l, file, where, violations));
}

function analyze(files: SourceFile[]): Analysis {
  const result: Analysis = { calls: 0, perSite: {}, violations: [] };
  for (const raw of files) {
    const file = { path: raw.path, src: stripComments(raw.src) };
    for (const m of file.src.matchAll(/\blogSubscriptionEvent\s*\(/g)) {
      const before = file.src.slice(Math.max(0, m.index! - 20), m.index!);
      if (/\bfunction\s+$/.test(before)) continue;
      const open = m.index! + m[0].length - 1;
      const call = file.src.slice(open, matchClose(file.src, open));
      result.calls++;

      const eventType = call.match(/\beventType\s*(?::\s*([^,\n]+))?[,\n]/);
      const eventExpr = eventType ? (eventType[1] ?? 'eventType').trim() : '<none>';
      const site = `${file.path}::${eventExpr}`;
      result.perSite[site] = (result.perSite[site] ?? 0) + 1;

      if (RETIRED_EVENT_TYPES.includes(eventExpr)) {
        result.violations.push(`${site}: writes a retired event type (DEBUG-839)`);
      }
      const allowed = ALLOWED[site];
      if (!allowed) {
        result.violations.push(`${site}: unknown audit call site; add it to ALLOWED deliberately`);
        continue;
      }

      const meta = call.match(/\bmetadata\s*:\s*\{/);
      if (!meta) {
        result.violations.push(`${site}: metadata is not an object literal, so its keys cannot be checked`);
        continue;
      }
      const mOpen = meta.index! + meta[0].length - 1;
      const literal = call.slice(mOpen, matchClose(call, mOpen));
      for (const key of keysOf(literal, file, site, result.violations)) {
        if (!allowed.includes(key)) result.violations.push(`${site}: metadata key "${key}" is not allowed`);
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Reading the real tree
// ---------------------------------------------------------------------------

function sourceFiles(): SourceFile[] {
  const files: SourceFile[] = [];
  const walk = (dir: string, rel: string) => {
    for (const entry of Deno.readDirSync(dir)) {
      if (entry.name === 'vendor' || entry.name === '_tests' || entry.name === 'node_modules') continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory) walk(`${dir}/${entry.name}`, childRel);
      else if (entry.name.endsWith('.ts')) files.push({ path: childRel, src: Deno.readTextFileSync(`${dir}/${entry.name}`) });
    }
  };
  walk(FUNCTIONS_DIR.replace(/\/$/, ''), '');
  return files;
}

const real = analyze(sourceFiles());

Deno.test('every audit call writes only its site\'s allowed metadata keys, and no store-date value', () => {
  assertEquals(real.violations, []);
});

Deno.test('vacuity floor: the pin slices every known audit call', () => {
  assert(real.calls >= MIN_CALLS, `only ${real.calls} logSubscriptionEvent calls sliced; expected >= ${MIN_CALLS}`);
  for (const site of Object.keys(ALLOWED)) {
    assert((real.perSite[site] ?? 0) > 0, `allowlisted site ${site} matched no call — stale entry or broken slicer`);
  }
});

Deno.test('the retired expiry-notice event types appear in no audit call', () => {
  const sites = Object.keys(real.perSite).filter((s) => RETIRED_EVENT_TYPES.some((t) => s.endsWith(`::${t}`)));
  assertEquals(sites, []);
});

Deno.test('the grace automation still writes its re-verify audit row (the retirement removed only the notices)', () => {
  assertEquals(real.perSite['grace-period-automation/handler.ts::eventType'], 1);
});

Deno.test('the subscriptions patch grace_period_end writes are outside every audit call, and stay silent', () => {
  const grace = sourceFiles().find((f) => f.path === 'grace-period-automation/handler.ts')!;
  const webhook = sourceFiles().find((f) => f.path === 'subscription-webhook/handlers.ts')!;
  assert(/\bgrace_period_end\s*:/.test(stripComments(grace.src)), 'handler.ts no longer patches grace_period_end');
  assert(/extraPatch\.grace_period_end\s*=/.test(stripComments(webhook.src)), 'webhook no longer patches grace_period_end');
  assertEquals(analyze([grace, webhook]).violations, []);
});

// ---------------------------------------------------------------------------
// Controls: each matcher goes red
// ---------------------------------------------------------------------------

const GRACE_PATH = 'grace-period-automation/handler.ts';

function reverifyCall(metadataBody: string): SourceFile {
  return {
    path: GRACE_PATH,
    src: `await logSubscriptionEvent(supabase, {\n  userId: row.user_id,\n  subscriptionId: row.id,\n  eventType,\n  metadata: { ${metadataBody} },\n});\n`,
  };
}

Deno.test('CONTROL: the real-shaped re-verify call is clean', () => {
  const r = analyze([reverifyCall("platform: 'apple', source: 'grace_period_automation', verified_at: nowIso")]);
  assertEquals(r.calls, 1);
  assertEquals(r.violations, []);
});

Deno.test('CONTROL: an extra key goes red', () => {
  const r = analyze([reverifyCall("platform: 'apple', days_remaining: 3")]);
  assert(r.violations.some((v) => v.includes('"days_remaining" is not allowed')), JSON.stringify(r.violations));
});

Deno.test('CONTROL: a store date under an innocent key goes red (ends_at: grace.grace_period_end)', () => {
  const r = analyze([reverifyCall("platform: 'apple', ends_at: grace.grace_period_end")]);
  assert(r.violations.some((v) => v.includes('names a store-date field')), JSON.stringify(r.violations));
});

Deno.test('CONTROL: a store date under an ALLOWED key goes red', () => {
  const r = analyze([reverifyCall('platform: trial.trial_end_date')]);
  assert(r.violations.some((v) => v.includes('names a store-date field')), JSON.stringify(r.violations));
});

Deno.test('CONTROL: an unknown spread goes red', () => {
  const r = analyze([reverifyCall("platform: 'apple', ...extra")]);
  assert(r.violations.some((v) => v.includes('does not resolve')), JSON.stringify(r.violations));
});

Deno.test('CONTROL: a nested conditional spread carrying trial_end_date goes red', () => {
  const r = analyze([{
    path: 'subscription-webhook/handlers.ts',
    src: [
      'await logSubscriptionEvent(supabase, {',
      '  userId: w.row.user_id,',
      '  eventType: w.transition.eventType,',
      '  metadata: { ...w.auditMetadata, timestamp: new Date().toISOString() },',
      '});',
      "x({ auditMetadata: { platform: 'apple', ...(c ? { trial_end_date: t } : {}) } });",
    ].join('\n'),
  }]);
  assert(r.violations.some((v) => v.includes('"trial_end_date" is not allowed')), JSON.stringify(r.violations));
});

Deno.test('CONTROL: an unknown call site and a retired event type go red', () => {
  const r = analyze([{
    path: GRACE_PATH,
    src: "await logSubscriptionEvent(supabase, { userId: u, eventType: 'trial_ending_soon', metadata: { days_remaining: 3 } });",
  }]);
  assert(r.violations.some((v) => v.includes('retired event type')), JSON.stringify(r.violations));
  assert(r.violations.some((v) => v.includes('unknown audit call site')), JSON.stringify(r.violations));
});

Deno.test('CONTROL: a commented-out call is not sliced', () => {
  const r = analyze([{ path: GRACE_PATH, src: '// await logSubscriptionEvent(supabase, { eventType: x });\n' }]);
  assertEquals(r.calls, 0);
});
