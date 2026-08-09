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
