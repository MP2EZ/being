/**
 * Frame-probe HUD scoping pin (INFRA-373)
 *
 * `EXPO_PUBLIC_PERF_HUD` mounts `BreathingFrameProbe` on `PracticeTimerScreen`
 * and renders a frame-delivery readout over the breathing practice. A debug
 * overlay appearing during a breathing exercise is a user-visible defect in a
 * wellness app, which is why the flag's Risk score exists.
 *
 * WHY THE PIN IS "ENABLED NOWHERE" RATHER THAN "ONE PROFILE ONLY".
 * `e2eSeedGate.config.test.ts` — the model for this file — asserts its var is set
 * in exactly one EAS profile, because the safety gate needs a build that carries
 * it. This flag needs no such build. INFRA-309's AC assumed a dedicated
 * `perf-device` EAS profile with ad-hoc provisioning; that was struck once
 * INFRA-383 moved the local Release build off EAS and INFRA-424 built the
 * physical-device path, so the probe is enabled by a shell variable at local
 * build time and never by committed config. The boundary is therefore stronger
 * than the seed gate's: no profile may carry it at all.
 *
 * The schema default is the second half of the boundary. `booleanString` with
 * `.default('false')` means a build that never sets the var cannot render the HUD
 * by omission — absence is off, rather than absence being a parse error someone
 * silences by adding the var somewhere convenient.
 *
 * SOURCE ASSERTIONS STRIP COMMENTS FIRST (DEBUG-390). This codebase names
 * anti-patterns in prose deliberately, and both files asserted on below mention
 * `EXPO_PUBLIC_PERF_HUD` in their comments — including the string `'false'`. A
 * bare `toContain` would match the commentary rather than the code, in both
 * directions: a positive assertion could be satisfied by a comment that says the
 * opposite of what the code does. Comment-stripping plus a narrow regex is also
 * exactly the combination that can silently match nothing, so each matcher below
 * is proved to fire against a known-good literal and to reject a known-bad one.
 */

import * as fs from 'fs';
import * as path from 'path';

const HUD_VAR = 'EXPO_PUBLIC_PERF_HUD';
const APP_ROOT = path.join(__dirname, '..', '..');

/** Remove block and line comments so assertions describe code, not commentary. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function readStripped(...segments: string[]): string {
  return stripComments(fs.readFileSync(path.join(APP_ROOT, ...segments), 'utf8'));
}

const easJson = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'eas.json'), 'utf8')) as {
  build: Record<string, { env?: Record<string, string> }>;
};

const SCHEMA_DEFAULT_RE = new RegExp(`${HUD_VAR}:\\s*booleanString\\.default\\('false'\\)`);
const MOUNT_GUARD_RE = new RegExp(`env\\.${HUD_VAR}\\s*===\\s*'true'\\s*&&`);

describe(`${HUD_VAR} is enabled in no committed configuration`, () => {
  // Every profile, not a hand-listed subset: a profile added later must fail this
  // by default rather than be silently exempt because nobody updated the list.
  it.each(Object.keys(easJson.build))('is absent from build.%s.env', (profile) => {
    const env = easJson.build[profile]?.env ?? {};
    expect(Object.prototype.hasOwnProperty.call(env, HUD_VAR)).toBe(false);
  });

  it('eas.json declares at least one profile, so the check above is not vacuous', () => {
    expect(Object.keys(easJson.build).length).toBeGreaterThan(0);
  });
});

describe(`${HUD_VAR} defaults to off, so omission cannot enable the HUD`, () => {
  const envSource = readStripped('src', 'core', 'config', 'env.ts');

  it('stripping left real code behind, not an empty string', () => {
    expect(envSource.length).toBeGreaterThan(1000);
    expect(envSource).toContain('envSchema');
  });

  it('declares the flag as booleanString defaulting to false', () => {
    expect(SCHEMA_DEFAULT_RE.test(envSource)).toBe(true);
  });

  it('the default matcher can go red', () => {
    expect(SCHEMA_DEFAULT_RE.test(`${HUD_VAR}: booleanString.default('true'),`)).toBe(false);
    expect(SCHEMA_DEFAULT_RE.test(`${HUD_VAR}: booleanString,`)).toBe(false);
    expect(SCHEMA_DEFAULT_RE.test(`${HUD_VAR}: booleanString.default('false'),`)).toBe(true);
  });
});

describe('the probe is mounted only behind the flag', () => {
  const screenSource = readStripped(
    'src',
    'features',
    'learn',
    'practices',
    'PracticeTimerScreen.tsx',
  );

  it('stripping left real code behind, not an empty string', () => {
    expect(screenSource.length).toBeGreaterThan(1000);
    expect(screenSource).toContain('BreathingCircle');
  });

  it('gates the render on the flag', () => {
    expect(MOUNT_GUARD_RE.test(screenSource)).toBe(true);
  });

  it('mounts the probe exactly once, so no ungated second render exists', () => {
    const mounts = screenSource.match(/<BreathingFrameProbe\b/g) ?? [];
    expect(mounts).toHaveLength(1);
  });

  it('the guard matcher can go red', () => {
    expect(MOUNT_GUARD_RE.test('{true && <BreathingFrameProbe />}')).toBe(false);
    expect(MOUNT_GUARD_RE.test(`{env.${HUD_VAR} !== 'true' && <BreathingFrameProbe />}`)).toBe(
      false,
    );
    expect(MOUNT_GUARD_RE.test(`{env.${HUD_VAR} === 'true' && <BreathingFrameProbe />}`)).toBe(
      true,
    );
  });
});
