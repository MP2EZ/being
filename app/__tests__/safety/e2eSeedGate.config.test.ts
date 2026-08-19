/**
 * e2e-sim seed-gate config pin (INFRA-217)
 *
 * The Maestro safety gate runs against a no-dev-client EAS Release build whose
 * `e2e-sim` profile seeds post-onboarding state at launch (consent + onboarding
 * complete) so the safety flows start at the Main tab. That seed is gated by
 * `EXPO_PUBLIC_E2E_SEED_ONBOARDED`, which MUST be set ONLY in the `e2e-sim`
 * profile — never in a shipping build.
 *
 * Compliance boundary (INFRA-217 AC, `compliance` agent review): a production /
 * preview / production-emergency build must be structurally incapable of
 * auto-granting consent. There is deliberately NO `EXPO_PUBLIC_ENV==='production'`
 * superRefine in env.ts (the `e2e-sim` profile `extends: production` and resolves
 * `EXPO_PUBLIC_ENV=production`, so such a guard would refuse to boot the very
 * build the gate needs). The boundary therefore rests SOLELY on this eas.json
 * profile scoping — this static-config test is the durable, in-CI pin for it.
 * Modeled on `lsApplicationQueriesSchemes.config.test.ts` (INFRA-184).
 */

import * as fs from 'fs';
import * as path from 'path';

const SEED_VAR = 'EXPO_PUBLIC_E2E_SEED_ONBOARDED';

const easJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'eas.json'), 'utf8'),
) as { build: Record<string, { env?: Record<string, string> }> };

describe('EXPO_PUBLIC_E2E_SEED_ONBOARDED is scoped to the e2e-sim profile only', () => {
  it('is set to "true" in build.e2e-sim.env', () => {
    expect(easJson.build['e2e-sim']?.env?.[SEED_VAR]).toBe('true');
  });

  // Every profile that can produce a shippable / non-e2e artifact must NOT carry
  // the seed var. production-emergency is non-negotiable — it extends production
  // and ships to the App Store.
  it.each(['production', 'production-emergency', 'preview', 'development'])(
    'is absent from build.%s.env (no auto-grant in a non-e2e build)',
    (profile) => {
      const env = easJson.build[profile]?.env ?? {};
      expect(Object.prototype.hasOwnProperty.call(env, SEED_VAR)).toBe(false);
    },
  );

  it('appears in exactly one build profile across all of eas.json', () => {
    const profilesWithVar = Object.entries(easJson.build)
      .filter(([, cfg]) => cfg.env && Object.prototype.hasOwnProperty.call(cfg.env, SEED_VAR))
      .map(([name]) => name);
    expect(profilesWithVar).toEqual(['e2e-sim']);
  });
});

describe('the gate build script derives the seed var, never hardcodes it (INFRA-383)', () => {
  // The boundary above used to rest SOLELY on eas.json profile scoping. INFRA-383 moved the
  // gate build off `eas build --local` onto `expo run:ios`, which does not read eas.json —
  // so the script became a SECOND home for the seed var and a second way to leak it into a
  // shippable build. The boundary now rests on eas.json scoping AND on the script deriving
  // its env from that same scoped profile rather than restating it.
  const script = fs.readFileSync(
    path.join(__dirname, '..', '..', 'scripts', 'e2e-sim-build.sh'),
    'utf8',
  );

  it('does not hardcode the seed var as a literal assignment', () => {
    // A literal `EXPO_PUBLIC_E2E_SEED_ONBOARDED=true` in the script would survive any
    // future removal of the var from eas.json, silently outliving the compliance boundary
    // it is supposed to be governed by.
    expect(script).not.toMatch(/EXPO_PUBLIC_E2E_SEED_ONBOARDED\s*=/);
  });

  it('resolves the e2e-sim profile from eas.json, following `extends`', () => {
    expect(script).toMatch(/require\(["']\.\/eas\.json["']\)/);
    expect(script).toMatch(/merge\(["']e2e-sim["']\)/);
    expect(script).toMatch(/p\.extends/);
  });

  it('scopes the resolved env to the build invocation instead of exporting it', () => {
    // `export` would leave a consent-auto-granting variable in the ambient shell, where a
    // later `npm run ios` in the same terminal would inherit it into a dev build.
    expect(script).toMatch(/env "\$\{ENV_ARGS\[@\]\}"/);
    expect(script).not.toMatch(/^\s*export\s+EXPO_PUBLIC_/m);
  });
});

describe('env.ts defaults the seed var to disabled', () => {
  // Source-level assertion: the schema must declare the seed var with a 'false'
  // default so any build that does not explicitly set it (i.e. every real build)
  // resolves to disabled. Reading the source keeps this pin independent of the
  // module-load env validation.
  const envSource = fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'core', 'config', 'env.ts'),
    'utf8',
  );

  it("registers EXPO_PUBLIC_E2E_SEED_ONBOARDED with booleanString.default('false')", () => {
    expect(envSource).toMatch(
      /EXPO_PUBLIC_E2E_SEED_ONBOARDED:\s*booleanString\.default\('false'\)/,
    );
  });

  it('reads the seed var explicitly in readRawEnv (preserves Babel inlining)', () => {
    expect(envSource).toMatch(
      /EXPO_PUBLIC_E2E_SEED_ONBOARDED:\s*process\.env\['EXPO_PUBLIC_E2E_SEED_ONBOARDED'\]/,
    );
  });
});

/**
 * INFRA-317 — the ungranted-boot switch must not move the compliance boundary.
 *
 * That switch lets one binary boot with consent ungranted so the INFRA-308
 * deep-link consent-gate contracts can be exercised end-to-end. It is delivered
 * over the initial deep-link URL rather than a new env var, specifically so the
 * boundary stays exactly where INFRA-217 put it: eas.json profile scoping, pinned
 * by the assertions above.
 *
 * These pin the two properties that keep that true. Both are source-level, for
 * the same reason as the assertions above — independent of module-load behaviour,
 * and they fail loudly if someone "simplifies" the mechanism later.
 */
// Module scope: INFRA-377's block below reads the same source.
const seedSource = fs.readFileSync(
  path.join(__dirname, '..', '..', 'src', 'core', 'config', 'e2eSeed.ts'),
  'utf8',
);

describe('INFRA-317 ungranted-boot switch stays inside the build-time gate', () => {
  it('introduces NO new EXPO_PUBLIC_* variable', () => {
    // The switch must ride the existing gate. A second env var would be a second
    // boundary to scope in eas.json and to pin here — and the "appears in exactly
    // one build profile" assertion above would not cover it.
    const envVars = seedSource.match(/EXPO_PUBLIC_[A-Z0-9_]+/g) ?? [];
    expect([...new Set(envVars)]).toEqual(['EXPO_PUBLIC_E2E_SEED_ONBOARDED']);
  });

  // INFRA-377 extended this to cover BOTH markers. Each is asserted separately —
  // a single loop over both would stay green while either one regressed.
  it.each([
    ['ungranted (INFRA-317)', 'isUngrantedBootRequested('],
    ['stale-consent (INFRA-377)', 'isStaleConsentBootRequested('],
  ])('reads the %s marker ONLY after the SEED_ACTIVE early-return', (_label, callSite) => {
    // With the build var at its 'false' default, `if (!SEED_ACTIVE) return;` makes
    // every line below it unreachable. So the marker check must sit AFTER that
    // guard inside maybeSeedE2EOnboardedState — that ordering is what makes the
    // switch dead code in a shipping build, and it is the whole compliance
    // argument for not adding a new pin.
    const seedFn = seedSource.slice(seedSource.indexOf('export async function maybeSeedE2EOnboardedState'));
    const guardIdx = seedFn.indexOf('if (!SEED_ACTIVE) return;');
    const markerIdx = seedFn.indexOf(callSite);

    expect(guardIdx).toBeGreaterThanOrEqual(0);
    expect(markerIdx).toBeGreaterThan(guardIdx);
  });

  it('never calls a consent mutator — it can only decline to grant', () => {
    // The switch is a suppressor. If it could reach grantConsent / revoke / clear,
    // it would be capable of zeroing out a real consent record, which is the one
    // failure mode that would make this mechanism unsafe. The seed as a whole may
    // call grantConsent; the point here is that the SUPPRESSED path returns before
    // reaching it, which the sibling unit test asserts behaviourally. This pins the
    // narrower structural fact: no revoke/clear API is referenced anywhere in the
    // module at all.
    expect(seedSource).not.toMatch(/revokeConsent|clearConsent|resetConsent|withdrawConsent/);
  });
});

/**
 * INFRA-377 — the stale-consent forge stays behind the named store seam.
 *
 * The stale variant is a WRITER, so INFRA-317's suppressor guarantee does not
 * and cannot cover it. What replaces that guarantee is a separation: the write
 * lives in `consentStore.ts` behind `__seedStaleConsentRecordForE2E`, and
 * `e2eSeed.ts` has no way to reach around it to storage directly.
 *
 * The regex above (`revokeConsent|clearConsent|…`) does NOT cover this on its
 * own: a raw `SecureStore.setItemAsync('consent_record_v1', …)` in the seed
 * module passes all four names while being strictly more powerful than any of
 * them — it can write a record that reads as revoked, under-age, or
 * integrity-broken. These close that.
 */
describe('INFRA-377 stale-consent forge is reachable only through the store seam', () => {
  it('e2eSeed.ts does not import expo-secure-store at all', () => {
    // The strongest available form: not "does not currently call setItemAsync"
    // but "has no handle on secure storage to call". A future edit that wants to
    // write directly has to add the import, and this goes red.
    expect(seedSource).not.toMatch(/from\s+['"]expo-secure-store['"]/);
    expect(seedSource).not.toMatch(/require\(\s*['"]expo-secure-store['"]\s*\)/);
  });

  it('e2eSeed.ts never names the raw consent storage key', () => {
    expect(seedSource).not.toContain('consent_record_v1');
  });

  it('the seam exists, is exported, and is guarded by the build flag inline', () => {
    const storeSource = fs.readFileSync(
      path.join(__dirname, '..', '..', 'src', 'core', 'stores', 'consentStore.ts'),
      'utf8',
    );

    expect(storeSource).toMatch(/export async function __seedStaleConsentRecordForE2E/);

    // The guard must be the FIRST statement in the function body, and must read
    // the env var directly rather than importing `isE2EOnboardingSeedEnabled`
    // from e2eSeed.ts — that module already imports this one, so the back-import
    // would be a cycle and could break Babel's build-time inlining of the var.
    const fnIdx = storeSource.indexOf('export async function __seedStaleConsentRecordForE2E');
    const body = storeSource.slice(fnIdx, fnIdx + 600);
    expect(body).toMatch(
      /\{[\s\S]{0,200}?if \(env\.EXPO_PUBLIC_E2E_SEED_ONBOARDED !== 'true'\) return false;/,
    );
    expect(storeSource).not.toMatch(/from\s+['"]@\/core\/config\/e2eSeed['"]/);
  });

  it('the assertions above can still fail (DEBUG-390 control)', () => {
    // Comment-stripping is absent here by design — these match import syntax and
    // a storage-key literal, neither of which this codebase names in prose. But a
    // regex pin is only worth its cost if it can go red, so prove each fires.
    expect("import * as SecureStore from 'expo-secure-store';").toMatch(
      /from\s+['"]expo-secure-store['"]/,
    );
    expect("const K = 'consent_record_v1';").toContain('consent_record_v1');
    expect('export async function __seedStaleConsentRecordForE2E(').toMatch(
      /export async function __seedStaleConsentRecordForE2E/,
    );
    expect(seedSource.length).toBeGreaterThan(1000);
  });
});
