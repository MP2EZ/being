/**
 * eas-cli version lockstep pin (INFRA-351).
 *
 * Two places name an eas-cli version and they must not drift apart:
 *   - `.github/workflows/release.yml` — `eas-version:` on the Setup EAS CLI step,
 *     pinned by INFRA-345. This is the CLI that runs the real `eas build`.
 *   - `app/eas.json` — `cli.version`, the range eas-cli enforces on ITSELF before
 *     resolving a project dir.
 *
 * eas-cli enforces `cli.version` by THROWING, not warning — verbatim, in the
 * installed CLI at
 * `build/commandUtils/context/contextUtils/findProjectDirAndVerifyProjectSetupAsync.js`:
 *
 *     if (... && !semver.satisfies(easCliVersion, config.version)) { throw new Error(...) }
 *
 * guarded only by `getenv.boolish('EAS_SKIP_CLI_VERSION_CHECK', false)`. So the
 * bound is ENFORCEABLE, not advisory, and `EAS_SKIP_CLI_VERSION_CHECK=1` is the
 * documented escape hatch for anyone who needs to step outside it deliberately.
 *
 * WHY A TEST AND NOT A COMMENT IN eas.json: a comment cannot go there. Both
 * `__tests__/safety/e2eSeedGate.config.test.ts` (module-scope strict `JSON.parse`,
 * run by `test:safety` in `precommit`) and `@expo/eas-json` (`allowUnknown: false`)
 * reject it — a `//` line and a JSON-legal `"//"` key alike. eas-cli itself would
 * tolerate JSON5; this repo will not. The prose rationale therefore lives in
 * `release.yml`'s BUMP PROTOCOL block, `scripts/e2e-sim-build-eas.sh`'s prereq
 * header, and `docs/testing/e2e-maestro.md` — and this test is the mechanical half.
 *
 * Gated by the existing `test:scripts` CI step (`ci.yml`, "Script guard tests"),
 * same as the INFRA-368 and DEBUG-389 guards it sits beside. Deliberately NOT in
 * `precommit`: per CLAUDE.md, a hook is not a control on what reaches `main`.
 */

const fs = require('fs');
const path = require('path');
const semver = require('semver');

const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const RELEASE_YML = path.join(REPO_ROOT, '.github', 'workflows', 'release.yml');
const EAS_JSON = path.join(__dirname, '..', '..', 'eas.json');

// `eas-version: 21.6.0` on the expo/expo-github-action step. Anchored to a literal
// semver so `eas-version: latest` does NOT match — reverting INFRA-345's pin to
// `latest` must fail this file loudly rather than quietly extracting nothing.
const PIN_RE = /^\s*eas-version:\s*(\d+\.\d+\.\d+)\s*$/m;

// `>=21.6.0` — floor. Optional whitespace so the pre-INFRA-351 `">= 12.14.1"` is
// still *parsed* and fails on the value, not on an unhelpful "could not parse".
const FLOOR_RE = />=\s*(\d+\.\d+\.\d+)/;
// `<22.0.0` — ceiling. `(?!=)` keeps this from matching a `<=` bound.
const CEILING_RE = /<(?!=)\s*(\d+\.\d+\.\d+)/;

const releaseYml = fs.readFileSync(RELEASE_YML, 'utf8');
const easJson = JSON.parse(fs.readFileSync(EAS_JSON, 'utf8'));
const cliVersion = easJson.cli?.version;

describe('the matchers can still fire (DEBUG-390)', () => {
  // A regex guard is only worth its cost if it can go red. These assert the
  // matchers against literal known-good / known-bad strings, so a future edit
  // that makes PIN_RE or FLOOR_RE match nothing at all fails HERE — visibly —
  // instead of turning every assertion below into a silent pass.
  it('PIN_RE extracts a pinned version and rejects `latest`', () => {
    expect('          eas-version: 21.6.0\n'.match(PIN_RE)?.[1]).toBe('21.6.0');
    expect('          eas-version: latest\n'.match(PIN_RE)).toBeNull();
  });

  it('FLOOR_RE and CEILING_RE read both ends of a bounded range', () => {
    expect('>=21.6.0 <22.0.0'.match(FLOOR_RE)?.[1]).toBe('21.6.0');
    expect('>=21.6.0 <22.0.0'.match(CEILING_RE)?.[1]).toBe('22.0.0');
    // A floor-only range must yield no ceiling — that is the state INFRA-351 fixed.
    expect('>= 12.14.1'.match(CEILING_RE)).toBeNull();
  });

  it('reads a non-trivial release.yml and a parsed eas.json', () => {
    expect(releaseYml.length).toBeGreaterThan(1000);
    expect(typeof cliVersion).toBe('string');
  });
});

describe('app/eas.json cli.version is bounded at BOTH ends (INFRA-351)', () => {
  it('declares a floor', () => {
    expect(cliVersion).toMatch(FLOOR_RE);
  });

  it('declares a major-version ceiling', () => {
    // A floor alone is what this item existed to fix: `">= 12.14.1"` let a local
    // CLI sit nine majors below CI with nothing complaining.
    expect(cliVersion).toMatch(CEILING_RE);
  });

  it('is a valid semver range', () => {
    expect(semver.validRange(cliVersion)).not.toBeNull();
  });

  it('excludes the CLI version this item was blocked on (19.0.8)', () => {
    // Proves the bound is load-bearing and not vacuously wide.
    expect(semver.satisfies('19.0.8', cliVersion)).toBe(false);
  });
});

describe("eas.json's floor is in lockstep with release.yml's pin (INFRA-351)", () => {
  const pin = releaseYml.match(PIN_RE)?.[1];

  it('release.yml still pins a literal eas-version (INFRA-345)', () => {
    expect(pin).toBeDefined();
  });

  it("the floor EQUALS the pin — not merely 'satisfied by' it", () => {
    // `>=21.0.0 <22.0.0` would satisfy the pin while still permitting a
    // 21.0.0-local vs 21.6.0-CI skew, which is the exact divergence this item
    // exists to close. Equality is the assertion; satisfaction is not enough.
    expect(cliVersion.match(FLOOR_RE)?.[1]).toBe(pin);
  });

  it('the pinned CI CLI satisfies the range it will be checked against', () => {
    // The one combination that would break every real release: CI installs the
    // pin, then `eas build` throws because eas.json forbids it.
    expect(semver.satisfies(pin, cliVersion)).toBe(true);
  });

  it('the ceiling is the pin\'s next major', () => {
    expect(cliVersion.match(CEILING_RE)?.[1]).toBe(`${semver.major(pin) + 1}.0.0`);
  });
});
