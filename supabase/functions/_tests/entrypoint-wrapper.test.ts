/**
 * Entrypoint wrappers stay thin (MAINT-753).
 *
 * The edge functions' logic lives in handler modules that tests import. The deploy entry
 * point (index.ts) must stay a pure binding - imports, productionDeps(), and one
 * `serve((req) => handle(req, productionDeps()))` - because anything else in it is code no
 * test executes. A branch, a Response, an identity read or a delete call added there would be
 * silent. The failure this prevents is a security check sliding back into the untested file.
 *
 * Source-shape assertions follow DEBUG-390: comments are stripped first (the files describe
 * these very constructs in prose), and every matcher is proven here to fire on known-bad
 * source and to stay quiet on the same words in a comment.
 *
 * TARGETS lists delete-account only for now; the receipt functions join when their handlers
 * are extracted.
 */

import {
  assert,
  assertEquals,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const ROOT = new URL('../', import.meta.url);

function read(rel: string): string {
  return stripComments(Deno.readTextFileSync(new URL(rel, ROOT)));
}

interface Target {
  index: string;
  /** Literal env names productionDeps() must bind, and the only ones index.ts may read. */
  envNames: string[];
}

const TARGETS: Target[] = [
  { index: 'delete-account/index.ts', envNames: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
];

// The env-read call is spelled in pieces in the fixtures below: the INFRA-442 deploy-drift
// reconcile scans every .ts under supabase/functions (tests included) for the literal call
// and would otherwise read these fixtures as real secret reads.
const ENV_GET = 'Deno.' + 'env.get';

/** Logic that must never appear in an entrypoint. Each fires only on code, not on prose. */
const FORBIDDEN: Array<{ name: string; re: RegExp; bad: string }> = [
  { name: 'new Response(', re: /\bnew\s+Response\s*\(/, bad: "return new Response('x', { status: 401 });" },
  { name: 'if (', re: /\bif\s*\(/, bad: 'if (req.method === "POST") {}' },
  { name: 'getAuthUidFromRequest', re: /\bgetAuthUidFromRequest\b/, bad: 'const uid = getAuthUidFromRequest(req);' },
  { name: 'deleteUser(', re: /\bdeleteUser\s*\(/, bad: 'await supabase.auth.admin.deleteUser(uid, false);' },
  { name: '.upsert(', re: /\.upsert\s*\(/, bad: "await supabase.from('subscriptions').upsert(row);" },
  { name: 'logSubscriptionEvent', re: /\blogSubscriptionEvent\b/, bad: 'await logSubscriptionEvent(supabase, evt);' },
  { name: 'ALLOW_MOCK_RECEIPTS', re: /\bALLOW_MOCK_RECEIPTS\b/, bad: `${ENV_GET}('ALLOW_MOCK_RECEIPTS')` },
  { name: 'import.meta.main', re: /\bimport\.meta\.main\b/, bad: 'if (import.meta.main) serve(h);' },
];

/** Exactly the allowed shape: serve(<param> => handle(<same param>, productionDeps())). */
const SERVE_WRAPPER = /\bserve\s*\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*handle\s*\(\s*\1\s*,\s*productionDeps\s*\(\s*\)\s*\)\s*\)/g;
const SERVE_CALL = /\bserve\s*\(/g;
const ENV_READ = /Deno\.env\.get\(\s*(['"])([A-Z0-9_]+)\1\s*\)/g;

const count = (re: RegExp, text: string) => [...text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))].length;

for (const target of TARGETS) {
  Deno.test(`${target.index}: one serve(... => handle(x, productionDeps())) and nothing else`, () => {
    const src = read(target.index);
    // Vacuity floor: the comment-stripped file must still have real content.
    assert(/\bproductionDeps\b/.test(src) && /\bserve\b/.test(src), `${target.index} lost its wrapper`);
    assertEquals(count(SERVE_CALL, src), 1, 'expected exactly one serve( call');
    assertEquals(count(SERVE_WRAPPER, src), 1, 'expected exactly one serve(x => handle(x, productionDeps()))');
    for (const f of FORBIDDEN) {
      assertEquals(count(f.re, src), 0, `${target.index} contains ${f.name}`);
    }
  });

  Deno.test(`${target.index}: productionDeps binds the literal env names, and only those`, () => {
    const src = read(target.index);
    const body = src.slice(src.indexOf('function productionDeps'));
    assert(body.length > 0 && src.includes('function productionDeps'), 'productionDeps() not found');
    const names = [...src.matchAll(ENV_READ)].map((m) => m[2]).sort();
    assertEquals(names, [...target.envNames].sort());
    // The reads sit inside productionDeps(), not at module scope.
    const inDeps = [...body.matchAll(ENV_READ)].map((m) => m[2]).sort();
    assertEquals(inDeps, [...target.envNames].sort());
    assert(/\bcreateClient\s*\(/.test(body), 'productionDeps must build the client via createClient');
  });
}

// ---------------------------------------------------------------------------
// Controls (DEBUG-390): each matcher fires on known-bad code, not on prose.
// ---------------------------------------------------------------------------

Deno.test('control: every forbidden matcher fires on code and is silent on the same words in comments', () => {
  assert(FORBIDDEN.length >= 8, 'forbidden list shrank');
  for (const f of FORBIDDEN) {
    assertEquals(count(f.re, stripComments(f.bad)), 1, `${f.name} did not fire on known-bad source`);
    assertEquals(count(f.re, stripComments(`// ${f.bad}`)), 0, `${f.name} fired on a line comment`);
    assertEquals(count(f.re, stripComments(`/* ${f.bad} */`)), 0, `${f.name} fired on a block comment`);
    assertEquals(
      count(f.re, stripComments(`/**\n * prose mentioning ${f.bad}\n */\nconst ok = 1;`)),
      0,
      `${f.name} fired on a doc comment`,
    );
  }
});

Deno.test('control: the serve-wrapper matcher accepts the one shape and rejects every drift', () => {
  const good = [
    'serve((req) => handle(req, productionDeps()));',
    'serve(req => handle(req, productionDeps()));',
    'serve( (request) =>  handle( request ,productionDeps( ) ) )',
  ];
  for (const g of good) assertEquals(count(SERVE_WRAPPER, g), 1, g);
  const bad = [
    'serve(async (req) => { return handle(req, productionDeps()); });',
    'serve((req) => handle(req, deps));',
    'serve((req) => handle(other, productionDeps()));',
    'serve((req) => handle(req));',
    'serve(handle);',
    '// serve((req) => handle(req, productionDeps()));',
  ];
  for (const b of bad) assertEquals(count(SERVE_WRAPPER, stripComments(b)), 0, b);
  // Two wrappers is also a failure (exactly one).
  assertEquals(count(SERVE_WRAPPER, `${good[0]}\n${good[0]}`), 2);
  assertEquals(count(SERVE_CALL, `${good[0]}\nserve(h);`), 2);
});

Deno.test('control: the env-read matcher sees literal names and not computed ones', () => {
  assertEquals([...`${ENV_GET}('SUPABASE_URL')!`.matchAll(ENV_READ)].map((m) => m[2]), ['SUPABASE_URL']);
  assertEquals([...`${ENV_GET}("A_B1")`.matchAll(ENV_READ)].map((m) => m[2]), ['A_B1']);
  assertEquals([...`${ENV_GET}(name)`.matchAll(ENV_READ)].length, 0);
  assertEquals([...stripComments(`// ${ENV_GET}('SUPABASE_URL')`).matchAll(ENV_READ)].length, 0);
});
