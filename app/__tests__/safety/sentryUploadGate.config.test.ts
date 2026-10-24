/**
 * Sentry artifact-upload scoping pin (INFRA-800)
 *
 * The `@sentry/react-native/expo` plugin wraps the iOS "Bundle React Native code
 * and images" phase with `sentry-xcode.sh` and adds a debug-files phase. Both FAIL
 * THE BUILD when an upload fails (`sentry-xcode.sh` sets `exitCode=1`), and an
 * upload fails whenever `SENTRY_AUTH_TOKEN` is absent. Every build, including the
 * one carrying the 988 path, goes through that phase, so each EAS profile must take
 * one of two exits:
 *   - `SENTRY_DISABLE_AUTO_UPLOAD=true`: no upload is attempted (gate, dev and
 *     preview builds, none of which has the token), or
 *   - `SENTRY_ALLOW_FAILURE=true`: the upload runs, but sentry-cli exits 0 when it
 *     fails, so symbolication can never hold back a crisis-path build (crisis ruling).
 *     A failed BUNDLE still fails the phase; that was measured against sentry-cli
 *     2.58.4 before this was accepted.
 * The gate build (`npm run e2e:safety:build`) takes its env from the resolved
 * `e2e-sim` profile (`scripts/e2e-sim-build.sh` step 6), so pinning eas.json pins it.
 *
 * Metro: `getSentryExpoConfig` must stay option-free. `annotateReactComponents` and
 * `includeWebReplay: false` swap the transformer/resolver for every module on the
 * 988 path, which needs its own crisis review.
 *
 * Source assertions strip comments first (DEBUG-390), and each matcher is proved to
 * fire on a known-good literal and to reject a known-bad one.
 */

import * as fs from 'fs';
import * as path from 'path';

const APP_ROOT = path.join(__dirname, '..', '..');

type Profile = { extends?: string; env?: Record<string, string> };
const easJson = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'eas.json'), 'utf8')) as {
  build: Record<string, Profile>;
};

/** Same resolution `e2e-sim-build.sh` uses: `extends` first, the profile's own env wins. */
function resolvedEnv(name: string): Record<string, string> {
  const profile = easJson.build[name] ?? {};
  return { ...(profile.extends ? resolvedEnv(profile.extends) : {}), ...(profile.env ?? {}) };
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('every EAS profile either skips the Sentry upload or tolerates its failure', () => {
  it.each(Object.keys(easJson.build))('build.%s', (name) => {
    const env = resolvedEnv(name);
    const skips = env.SENTRY_DISABLE_AUTO_UPLOAD === 'true';
    const tolerates = env.SENTRY_ALLOW_FAILURE === 'true';
    expect(skips || tolerates).toBe(true);
  });

  it('eas.json declares profiles, so the check above is not vacuous', () => {
    expect(Object.keys(easJson.build)).toEqual(
      expect.arrayContaining(['production', 'e2e-sim', 'development', 'preview']),
    );
  });

  it('the gate profile never attempts an upload (it has no token)', () => {
    expect(resolvedEnv('e2e-sim').SENTRY_DISABLE_AUTO_UPLOAD).toBe('true');
  });

  it.each(['production', 'production-emergency'])(
    'build.%s uploads, so shipped builds are symbolicated',
    (name) => {
      expect(easJson.build[name]).toBeDefined();
      expect(resolvedEnv(name).SENTRY_DISABLE_AUTO_UPLOAD).not.toBe('true');
    },
  );
});

describe('metro.config.js uses getSentryExpoConfig with no options', () => {
  const OPTION_FREE_RE = /getSentryExpoConfig\(\s*__dirname\s*\)/;
  const source = stripComments(fs.readFileSync(path.join(APP_ROOT, 'metro.config.js'), 'utf8'));

  it('the matcher fires on the good shape and rejects an options object', () => {
    expect(OPTION_FREE_RE.test('getSentryExpoConfig(__dirname)')).toBe(true);
    expect(
      OPTION_FREE_RE.test('getSentryExpoConfig(__dirname, { annotateReactComponents: true })'),
    ).toBe(false);
  });

  it('calls it option-free, and nowhere with arguments', () => {
    expect(source).toMatch(OPTION_FREE_RE);
    expect(source.match(/getSentryExpoConfig\(/g)).toHaveLength(1);
    expect(source).not.toMatch(/getDefaultConfig\(/);
  });
});

describe('the upload is configured without a committed token', () => {
  it('app.json registers the plugin with org and project, and no authToken', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'app.json'), 'utf8')) as {
      expo: { plugins: Array<string | [string, Record<string, unknown>]> };
    };
    const entry = appJson.expo.plugins.find(
      (p) => Array.isArray(p) && p[0] === '@sentry/react-native/expo',
    ) as [string, Record<string, unknown>] | undefined;
    expect(entry).toBeDefined();
    expect(entry?.[1]).toEqual({ organization: 'being-prod', project: 'javascript-react' });
  });

  it('android applies sentry.gradle, and its sentry.properties carries no token', () => {
    const gradle = fs.readFileSync(path.join(APP_ROOT, 'android', 'app', 'build.gradle'), 'utf8');
    expect(gradle).toMatch(/^apply from: .*"sentry\.gradle"\)$/m);
    const props = fs.readFileSync(path.join(APP_ROOT, 'android', 'sentry.properties'), 'utf8');
    expect(props).toMatch(/^defaults\.org=being-prod$/m);
    expect(props).not.toMatch(/^\s*auth\.token\s*=/m);
  });
});
