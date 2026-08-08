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
describe('INFRA-317 ungranted-boot switch stays inside the build-time gate', () => {
  const seedSource = fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'core', 'config', 'e2eSeed.ts'),
    'utf8',
  );

  it('introduces NO new EXPO_PUBLIC_* variable', () => {
    // The switch must ride the existing gate. A second env var would be a second
    // boundary to scope in eas.json and to pin here — and the "appears in exactly
    // one build profile" assertion above would not cover it.
    const envVars = seedSource.match(/EXPO_PUBLIC_[A-Z0-9_]+/g) ?? [];
    expect([...new Set(envVars)]).toEqual(['EXPO_PUBLIC_E2E_SEED_ONBOARDED']);
  });

  it('reads the ungranted marker ONLY after the SEED_ACTIVE early-return', () => {
    // With the build var at its 'false' default, `if (!SEED_ACTIVE) return;` makes
    // every line below it unreachable. So the marker check must sit AFTER that
    // guard inside maybeSeedE2EOnboardedState — that ordering is what makes the
    // switch dead code in a shipping build, and it is the whole compliance
    // argument for not adding a new pin.
    const seedFn = seedSource.slice(seedSource.indexOf('export async function maybeSeedE2EOnboardedState'));
    const guardIdx = seedFn.indexOf('if (!SEED_ACTIVE) return;');
    const markerIdx = seedFn.indexOf('isUngrantedBootRequested()');

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
