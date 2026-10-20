/**
 * MAINT-809 — `cloud_sync` resolves through ONE tier: build time.
 *
 * THE DEFECT. The two Profile surfaces (CloudBackupScreen, PrivacyDataScreen's entry row) read
 * `cloud_sync` through the runtime `useFeatureFlag` hook, while the onboarding and re-consent
 * Cloud Backup consent cards read it at build time on purpose (DEBUG-625 AC3: a consent surface
 * must not depend on analytics consent or the network). For a flag in `PRODUCT_FLAGS` a clean
 * PostHog boolean overrides the build-time value in both directions, so the two could split:
 * PostHog `true` showed Cloud Backup (restore included) to a user never shown the card that
 * authorizes it; PostHog `false` hid restore and status from a user whose backups keep running.
 *
 * THE RULING (compliance, b-batch panel). Build time only, at all four readers, and never in
 * `PRODUCT_FLAGS`. Both halves are pinned: the allow-list could re-arm the split for any future
 * hook read, and a hook read is the split itself.
 *
 * MAINT-811 retired the runtime tier outright, so `PRODUCT_FLAGS` no longer exists. The first
 * half is now pinned as "the hook module is gone"; the four reader scans and HOOK_READ stay, so a
 * reintroduced hook still cannot carry cloud_sync. The tier-wide pin is
 * runtimeFlagTierRetired.contract.test.ts.
 *
 * Source scans strip comments first (DEBUG-390): the ruling's own comments name
 * `useFeatureFlag('cloud_sync')` in prose. Each scan is paired with a positive assertion on the
 * same stripped text, so a scan that matches nothing because the file moved fails loudly.
 */

import * as fs from 'fs';
import * as path from 'path';

const APP_ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(APP_ROOT, 'src');

const READERS = [
  'src/features/profile/screens/CloudBackupScreen.tsx',
  'src/features/profile/screens/PrivacyDataScreen.tsx',
  'src/features/onboarding/screens/OnboardingScreen.tsx',
  'src/features/consent/screens/ReConsentScreen.tsx',
];

const HOOK_READ = /useFeatureFlag\(\s*['"]cloud_sync['"]\s*\)/;
const BUILD_TIME_READ = /isFeatureEnabled\(\s*['"]cloud_sync['"]\s*\)/;

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

describe('MAINT-809 — cloud_sync is build-time only', () => {
  it('has no runtime hook to resolve it remotely: the module no longer exists (MAINT-811)', () => {
    expect(fs.existsSync(path.join(SRC, 'core/analytics/useFeatureFlag.ts'))).toBe(false);
  });

  it.each(READERS)('%s reads cloud_sync through isFeatureEnabled, not the runtime hook', (rel) => {
    const code = stripComments(fs.readFileSync(path.join(APP_ROOT, rel), 'utf8'));
    expect(code).toMatch(BUILD_TIME_READ);
    expect(code).not.toMatch(HOOK_READ);
  });

  it('no production source reads cloud_sync through useFeatureFlag', () => {
    const files = [...sourceFiles(SRC), path.join(APP_ROOT, 'App.tsx')];
    // Anti-vacuity: the walk reaches the readers it is meant to cover.
    for (const rel of READERS) expect(files).toContain(path.join(APP_ROOT, rel));
    const offenders = files.filter((f) => HOOK_READ.test(stripComments(fs.readFileSync(f, 'utf8'))));
    expect(offenders).toEqual([]);
  });
});
