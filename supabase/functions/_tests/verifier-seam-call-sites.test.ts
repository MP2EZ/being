/**
 * The verifier test seams are unreachable from production (MAINT-738).
 *
 * MAINT-738 gave verifyAppleJWS an injectable trust anchor and clock, and verifyGoogleOIDC an
 * injectable key set, so the chain walk and the OIDC checks can be proven against throwaway
 * keys. A seam on a trust boundary is only safe while nothing in production can reach it:
 * one call site passing `trustAnchorSpki` — from config, a header, anywhere — would make the
 * Apple pin advisory.
 *
 * So this pins, by option NAME rather than call shape (call sites move: DEBUG-739 moved the
 * webhook's into handlers.ts), that no production file outside the defining module mentions
 * a seam, and that no production module imports test helpers. DEBUG-390: comments are
 * stripped first, and each matcher is shown able to fire.
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const ROOT = new URL('../', import.meta.url);

/** Every production .ts under supabase/functions: not _tests/, not vendor/. */
function productionFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: URL, rel: string) => {
    for (const e of Deno.readDirSync(dir)) {
      if (e.isDirectory) {
        if (e.name === '_tests' || e.name === 'vendor' || e.name.startsWith('.')) continue;
        walk(new URL(`${e.name}/`, dir), `${rel}${e.name}/`);
      } else if (e.name.endsWith('.ts') && !/\.test\.ts$/.test(e.name)) {
        out.push(`${rel}${e.name}`);
      }
    }
  };
  walk(ROOT, '');
  return out.sort();
}

const SEAMS: Array<{ pattern: RegExp; definedIn: string }> = [
  { pattern: /\btrustAnchorSpki\b/, definedIn: '_shared/verifyAppleJWS.ts' },
  { pattern: /\bjwks\s*[:=,}]/, definedIn: 'subscription-webhook/verifyGoogleOIDC.ts' },
];

Deno.test('no production file outside the defining module touches a verifier seam', () => {
  const files = productionFiles();
  // Vacuity floor: the walk must actually see the functions it claims to police.
  assert(files.includes('subscription-webhook/handlers.ts'), 'walk did not reach handlers.ts');
  assert(files.includes('verify-apple-receipt/index.ts'), 'walk did not reach verify-apple-receipt');
  assert(files.includes('grace-period-automation/index.ts'), 'walk did not reach grace-period-automation');
  for (const { pattern, definedIn } of SEAMS) {
    const offenders = files.filter((f) =>
      f !== definedIn && pattern.test(stripComments(Deno.readTextFileSync(new URL(f, ROOT))))
    );
    assertEquals(offenders, [], `${pattern} is referenced outside ${definedIn}`);
  }
});

Deno.test('no production module imports from _tests/', () => {
  const offenders = productionFiles().filter((f) =>
    /from\s*['"][^'"]*_tests\//.test(stripComments(Deno.readTextFileSync(new URL(f, ROOT))))
  );
  assertEquals(offenders, []);
});

Deno.test('CONTROL: the seam matchers fire on real code and not on prose', () => {
  assert(SEAMS[0].pattern.test("verifyAppleJWS(jws, { trustAnchorSpki: pem })"));
  assert(SEAMS[1].pattern.test('verifyGoogleOIDC(h, aud, sa, { jwks })'));
  assert(SEAMS[1].pattern.test('verifyGoogleOIDC(h, aud, sa, { jwks: keySet })'));
  assertEquals(SEAMS[0].pattern.test(stripComments('// never pass trustAnchorSpki here\nconst x = 1;')), false);
  // `createRemoteJWKSet` and `JWKS` must not satisfy the jwks matcher (word boundary + case).
  assertEquals(SEAMS[1].pattern.test('const JWKS = createRemoteJWKSet(url);'), false);
  assert(/from\s*['"][^'"]*_tests\//.test("import { x } from '../_tests/_helpers/testPki.ts';"));
});
