/**
 * MAINT-811 — the PostHog runtime feature-flag tier is retired. Flags are build-time only.
 *
 * THE RULING (founder, 2026-10-19). EAS build-time flags are the real flag source, and there is
 * no A/B need pre-launch, so `useFeatureFlag` and `PRODUCT_FLAGS` are gone. The tier never fetched
 * flags anyway (MAINT-804): every `$feature_flag_called` on app 1.4.0 carried
 * `$used_bootstrap_value=true`.
 *
 * WHAT THIS PINS, and why it is a privacy contract. DPIA v2.50 states that the app evaluates no
 * PostHog feature flag, sends no `$feature_flag_called`, and never calls `identify` or `group`.
 * A client flag read is new processing that must come back through crisis + compliance review,
 * so a reintroduced one fails here rather than shipping on a green suite.
 *
 * The DEBUG-812 shadowing in analyticsIdentityReset.ts (`client.reloadFeatureFlags = () =>
 * undefined`) is an ASSIGNMENT that suppresses the SDK's own reset() → /flags path. It must stay,
 * and the call pattern below deliberately does not match it.
 *
 * Source scans strip comments first (DEBUG-390): this codebase names these APIs in prose. Each
 * negative scan is paired with a positive assertion on the scanned set, and each matcher is
 * proven against an inline fixture, so a scan that matches nothing fails loudly.
 */

import * as fs from 'fs';
import * as path from 'path';

const APP_ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(APP_ROOT, 'src');
const HOOK_MODULE = path.join(SRC, 'core/analytics/useFeatureFlag.ts');
const ANALYTICS_BARREL = path.join(SRC, 'core/analytics/index.ts');
const NOTES_HOST = path.join(SRC, 'features/insights/components/WellnessScreeningTrends.tsx');

/** A call on a PostHog client: `x.getFeatureFlag(`, `posthog.onFeatureFlags(`, ... */
const CLIENT_FLAG_CALL = /\.(getFeatureFlag\w*|onFeatureFlags|reloadFeatureFlags\w*|isFeatureEnabled)\s*\(/;
/** Person/group processing on a PostHog client. */
const CLIENT_IDENTITY_CALL = /\.(identify|group)\s*\(/;
/** The retired hook, called anywhere. */
const HOOK_CALL = /\buseFeatureFlag\s*\(/;
/** Any of the SDK's flag hooks imported from posthog-react-native. */
const SDK_FLAG_HOOK_IMPORT =
  /import\s*\{[^}]*\b(useFeatureFlag|useFeatureFlagEnabled|useFeatureFlagPayload|useActiveFeatureFlags)\b[^}]*\}\s*from\s*['"]posthog-react-native['"]/;
const BUILD_TIME_NOTES_READ = /isFeatureEnabled\(\s*['"]wellness_trend_notes['"]\s*\)/;

/** Block comments, then line comments (not `://` inside a URL string). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const FILES = [...sourceFiles(SRC), path.join(APP_ROOT, 'App.tsx')];
const STRIPPED = FILES.map((f) => ({ file: path.relative(APP_ROOT, f), code: stripComments(fs.readFileSync(f, 'utf8')) }));

function offenders(pattern: RegExp): string[] {
  return STRIPPED.filter(({ code }) => pattern.test(code)).map(({ file }) => file);
}

describe('MAINT-811 — runtime flag tier retired', () => {
  describe('matcher integrity', () => {
    it.each([
      ['posthog.getFeatureFlag("x")', CLIENT_FLAG_CALL],
      ['client.getFeatureFlagPayload("x")', CLIENT_FLAG_CALL],
      ['posthog.onFeatureFlags(cb)', CLIENT_FLAG_CALL],
      ['client.reloadFeatureFlags()', CLIENT_FLAG_CALL],
      ['posthog.isFeatureEnabled("x")', CLIENT_FLAG_CALL],
      ['posthog.identify("u")', CLIENT_IDENTITY_CALL],
      ['posthog.group("company", "x")', CLIENT_IDENTITY_CALL],
      ["const on = useFeatureFlag('x');", HOOK_CALL],
      ["import { useFeatureFlagEnabled } from 'posthog-react-native';", SDK_FLAG_HOOK_IMPORT],
    ])('%s is caught', (fixture, pattern) => {
      expect(fixture).toMatch(pattern);
    });

    it.each([
      // The DEBUG-812 shadowing is an assignment, not a call, and must stay legal.
      ['client.reloadFeatureFlags = () => undefined;', CLIENT_FLAG_CALL],
      // The build-time reader is a bare function, not a client method.
      ["isFeatureEnabled('wellness_trend_notes')", CLIENT_FLAG_CALL],
    ])('%s is not caught', (fixture, pattern) => {
      expect(fixture).not.toMatch(pattern);
    });
  });

  it('the walk reaches the former hook caller, which now reads the flag at build time', () => {
    expect(FILES).toContain(NOTES_HOST);
    expect(stripComments(fs.readFileSync(NOTES_HOST, 'utf8'))).toMatch(BUILD_TIME_NOTES_READ);
  });

  it('the runtime hook module no longer exists', () => {
    expect(fs.existsSync(HOOK_MODULE)).toBe(false);
  });

  it('the analytics barrel exports neither useFeatureFlag nor PRODUCT_FLAGS', () => {
    const code = stripComments(fs.readFileSync(ANALYTICS_BARREL, 'utf8'));
    expect(code).toMatch(/export\s*\{/); // anti-vacuity: the barrel still exports things
    expect(code).not.toMatch(/\buseFeatureFlag\b/);
    expect(code).not.toMatch(/\bPRODUCT_FLAGS\b/);
  });

  it('no production source calls a PostHog client flag API', () => {
    expect(offenders(CLIENT_FLAG_CALL)).toEqual([]);
  });

  it('no production source calls identify or group on a PostHog client', () => {
    expect(offenders(CLIENT_IDENTITY_CALL)).toEqual([]);
  });

  it('no production source calls useFeatureFlag', () => {
    expect(offenders(HOOK_CALL)).toEqual([]);
  });

  it('no production source imports a flag hook from posthog-react-native', () => {
    expect(offenders(SDK_FLAG_HOOK_IMPORT)).toEqual([]);
  });
});
