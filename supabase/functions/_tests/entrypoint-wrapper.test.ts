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
 * TARGETS covers delete-account, both receipt verifiers and grace-period-automation (MAINT-770). Beyond the shared shape, the
 * receipt entry points carry BINDING pins (what productionDeps hands the handler), and every
 * handler's *Deps interface is checked to name no env or mock key and none of the guards that
 * must stay inline - a dep is a seam, and a seam on a trust boundary is where a test (or a
 * later edit) could weaken the check.
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
  { index: 'verify-apple-receipt/index.ts', envNames: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  { index: 'verify-google-receipt/index.ts', envNames: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
  { index: 'grace-period-automation/index.ts', envNames: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
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

// ---------------------------------------------------------------------------
// Receipt entry points: what productionDeps binds (MAINT-753 b2)
// ---------------------------------------------------------------------------

/** The body of productionDeps(): from its declaration to the end of the function. */
function productionDepsBody(src: string): string {
  const at = src.indexOf('function productionDeps');
  return at < 0 ? '' : src.slice(at);
}

/** `import { ..., name, ... } from '<module>'` (comments already stripped). */
function importsFrom(name: string, module: string): RegExp {
  return new RegExp(
    String.raw`import\s*\{[^}]*\b${name}\b[^}]*\}\s*from\s*['"]${module.replace(/[./]/g, '\\$&')}['"]`,
  );
}

/** A dep bound BY REFERENCE: `name,` or `name }` in the object, never `name(`. */
function boundByReference(name: string): RegExp {
  return new RegExp(String.raw`[{,]\s*${name}\s*(?=[,}])`);
}

/** Apple: verifyTransaction forwards exactly one argument to verifyAppleJWS. */
const APPLE_ONE_ARG = /\bverifyTransaction\s*:\s*\(\s*(\w+)\s*\)\s*=>\s*verifyAppleJWS\s*\(\s*\1\s*\)/;

Deno.test('verify-apple-receipt/index.ts binds the real Apple calls: one-argument verifyAppleJWS, fetch by reference', () => {
  const src = read('verify-apple-receipt/index.ts');
  const body = productionDepsBody(src);
  assert(body.length > 0, 'productionDeps() not found');
  assert(importsFrom('fetchSignedTransactionInfo', '../_shared/appStoreServerApi.ts').test(src));
  assert(importsFrom('verifyAppleJWS', '../_shared/verifyAppleJWS.ts').test(src));
  assert(boundByReference('fetchSignedTransactionInfo').test(body), 'fetchSignedTransactionInfo is not bound by reference');
  assert(APPLE_ONE_ARG.test(body), 'verifyTransaction does not forward exactly one argument to verifyAppleJWS');
  // The verifier's second parameter is a trust-anchor / clock seam; no option name may appear.
  assertEquals(/\b(trustAnchorSpki|fetchImpl)\b/.test(src), false);
});

Deno.test('verify-google-receipt/index.ts binds the real Google calls by reference, with no fetch seam', () => {
  const src = read('verify-google-receipt/index.ts');
  const body = productionDepsBody(src);
  assert(body.length > 0, 'productionDeps() not found');
  for (const name of ['getGoogleAccessToken', 'fetchSubscriptionPurchase']) {
    assert(importsFrom(name, '../_shared/googlePlayDeveloperApi.ts').test(src), `${name} not imported from the shared module`);
    assert(boundByReference(name).test(body), `${name} is not bound by reference`);
  }
  // DEBUG-752: the only fetch seam lives in the two API-client modules.
  assertEquals(/\bfetchImpl\b/.test(src), false);
});

Deno.test('CONTROL: the binding matchers accept the one shape and reject drift', () => {
  assert(APPLE_ONE_ARG.test('verifyTransaction: (jws) => verifyAppleJWS(jws),'));
  for (
    const bad of [
      'verifyTransaction: (jws) => verifyAppleJWS(jws, { trustAnchorSpki: pem }),',
      'verifyTransaction: (jws) => verifyAppleJWS(other),',
      'verifyTransaction: verifyAppleJWS,',
      'verifyTransaction: (jws) => verifyAppleJWS(jws, undefined),',
    ]
  ) {
    assertEquals(APPLE_ONE_ARG.test(bad), false, bad);
  }
  assert(boundByReference('fetchSignedTransactionInfo').test('{ createSupabase: f,\n fetchSignedTransactionInfo,\n now }'));
  assert(boundByReference('fetchSignedTransactionInfo').test('{ fetchSignedTransactionInfo }'));
  assertEquals(boundByReference('fetchSignedTransactionInfo').test('{ fetchSignedTransactionInfo: (a) => f(a, o), }'), false);
  assertEquals(boundByReference('fetchSignedTransactionInfo').test('{ fetchSignedTransactionInfo(), }'), false);
  assert(importsFrom('getGoogleAccessToken', '../_shared/googlePlayDeveloperApi.ts').test(
    "import { fetchSubscriptionPurchase, getGoogleAccessToken } from '../_shared/googlePlayDeveloperApi.ts';",
  ));
  assertEquals(
    importsFrom('getGoogleAccessToken', '../_shared/googlePlayDeveloperApi.ts').test(
      "import { getGoogleAccessToken } from '../_shared/other.ts';",
    ),
    false,
  );
});

// ---------------------------------------------------------------------------
// Every handler's *Deps interface is a seam list, not a config bag
// ---------------------------------------------------------------------------

const HANDLERS = [
  'delete-account/handler.ts',
  'verify-apple-receipt/handler.ts',
  'verify-google-receipt/handler.ts',
  'grace-period-automation/handler.ts',
];

const DEPS_INTERFACE = /export\s+interface\s+(\w+Deps)\s*\{[\s\S]*?\n\}/g;

/** Names a *Deps interface must never contain: env/mock keys and the inline-only guards. */
const NOT_A_DEP: Array<{ name: string; re: RegExp; bad: string }> = [
  { name: 'an env key', re: /\b(ALLOW_MOCK_RECEIPTS|RECEIPT_ENCRYPTION_KEY|GOOGLE_SERVICE_ACCOUNT|APPLE_[A-Z_]+|SUPABASE_[A-Z_]+)\b/, bad: 'ALLOW_MOCK_RECEIPTS: string;' },
  { name: 'a mock switch', re: /\b\w*mock\w*\b/i, bad: 'allowMock: boolean;' },
  { name: 'an env accessor', re: /\b(env|getEnv|readEnv)\b/, bad: 'env: (name: string) => string;' },
  { name: 'an injectable identity', re: /\b(getAuthUid\w*|authUid|userId)\b/, bad: 'getAuthUidFromRequest: (r: Request) => string;' },
  { name: 'an injectable guard', re: /\b(assertAppleAppScope|assertNoCrossIdentityReplay|isUsableTransactionIdentifier|assertBeingPackageName|assertValidSubscriptionId|assertValidPurchaseToken|parseServiceAccountCredential)\b/, bad: 'assertAppleAppScope: (c: unknown) => void;' },
  { name: 'a fetch seam', re: /\bfetchImpl\b/, bad: 'fetchImpl: typeof fetch;' },
];

function depsInterfaces(src: string): Array<{ name: string; text: string }> {
  return [...src.matchAll(DEPS_INTERFACE)].map((m) => ({ name: m[1], text: m[0] }));
}

for (const handler of HANDLERS) {
  Deno.test(`${handler}: the *Deps interface names no env key, mock switch, identity or inline-only guard`, () => {
    const found = depsInterfaces(read(handler));
    assertEquals(found.length, 1, `expected exactly one exported *Deps interface in ${handler}`);
    const { name, text } = found[0];
    assert(text.includes('createSupabase'), `${name} lost createSupabase - extraction matched the wrong block`);
    for (const f of NOT_A_DEP) {
      assertEquals(f.re.test(text), false, `${name} contains ${f.name}`);
    }
  });
}

Deno.test('CONTROL: the Deps-interface extractor and its matchers fire on known-bad source, not on prose', () => {
  for (const f of NOT_A_DEP) {
    const src = stripComments(`export interface BadDeps {\n  createSupabase: () => unknown;\n  ${f.bad}\n}`);
    const [bad] = depsInterfaces(src);
    assert(bad, 'extractor found no interface in known-bad source');
    assertEquals(f.re.test(bad.text), true, `${f.name} did not fire on known-bad source`);
    const prose = stripComments(`export interface OkDeps {\n  createSupabase: () => unknown;\n  // ${f.bad}\n}`);
    assertEquals(f.re.test(depsInterfaces(prose)[0].text), false, `${f.name} fired on a comment`);
  }
});
