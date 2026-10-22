/**
 * Consent grant points (DEBUG-818 AC4)
 *
 * A grant point is a UI file that writes one of the four optional consent preferences.
 * Each one must give the user the CONSENT_DETAILS account of what they are agreeing to,
 * and Privacy & Data was found not to (DEBUG-818). This pins the set, so a new grant
 * point fails here and gets reviewed for disclosure parity instead of shipping unseen.
 *
 * Scope: non-test .ts/.tsx under app/src/features and app/src/core/components. The key set
 * is the four OPTIONAL preferences only; `mentalHealthProcessingConsent` is the Art. 9 grant,
 * collected document-style by the legal gate, and is deliberately not in this registry.
 *
 * DEBUG-390: comments are stripped before matching, because this codebase names consent
 * keys in prose. The matcher-integrity block proves each arm still fires.
 *
 * KNOWN BLIND SPOT: a computed-key dispatch, `updateConsent({ [key]: value })`, names no
 * key and is invisible to a static matcher. PrivacyDataScreen's handler is one; the
 * tripwire below pins which files may use that shape at all.
 */
import * as fs from 'fs';
import * as path from 'path';

const APP = path.resolve(__dirname, '../..');
const ROOTS = ['src/features', 'src/core/components'];

const KEYS = ['analyticsEnabled', 'crashReportsEnabled', 'cloudSyncEnabled', 'researchEnabled'];
const ALT = KEYS.join('|');

/** The three real shapes a write takes. */
const ARMS: Record<string, RegExp> = {
  // handleConsentToggle('cloudSyncEnabled', …), handleConsentPreferenceToggle("analyticsEnabled", …)
  quotedKey: new RegExp(`(['"\`])(?:${ALT})\\1`),
  // preferences: { analyticsEnabled, cloudSyncEnabled, … } in a submit payload
  shorthand: new RegExp(`[{,]\\s*(?:${ALT})\\s*[,}]`),
  // updateConsent({ researchEnabled: true })
  property: new RegExp(`(?<![.\\w])(?:${ALT})\\s*:`),
};
const COMPUTED_DISPATCH = /updateConsent\(\s*\{\s*\[/;

const REGISTRY = [
  'src/features/onboarding/screens/OnboardingScreen.tsx',
  'src/features/consent/screens/ReConsentScreen.tsx',
  'src/features/profile/screens/PrivacyDataScreen.tsx',
].sort();

/** Fixture writers outside the scanned roots, excluded by exact path, never by directory. */
const EXCLUDED_FIXTURE_WRITERS = ['src/core/config/e2eSeed.ts', 'src/core/stores/consentStore.ts'];

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const isWriter = (text: string) => Object.values(ARMS).some((re) => re.test(text));

function scan(): Array<{ rel: string; text: string }> {
  const out: Array<{ rel: string; text: string }> = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== '__tests__' && e.name !== '__mocks__' && e.name !== 'node_modules') walk(p);
      } else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
        out.push({ rel: path.relative(APP, p), text: stripComments(fs.readFileSync(p, 'utf8')) });
      }
    }
  };
  ROOTS.forEach((r) => walk(path.join(APP, r)));
  return out;
}

describe('DEBUG-818 AC4 — the consent grant points are exactly the reviewed registry', () => {
  const files = scan();

  it('scans a real tree', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('every file writing an optional consent preference is in the registry, and only those', () => {
    const writers = files.filter((f) => isWriter(f.text)).map((f) => f.rel).sort();
    // A new entry here is a new grant point: give it CONSENT_DETAILS parity, then add it.
    expect(writers).toEqual(REGISTRY);
  });

  it('tripwire: only PrivacyDataScreen uses the computed-key dispatch this matcher cannot see', () => {
    const computed = files.filter((f) => COMPUTED_DISPATCH.test(f.text)).map((f) => f.rel);
    expect(computed).toEqual(['src/features/profile/screens/PrivacyDataScreen.tsx']);
  });

  it.each(EXCLUDED_FIXTURE_WRITERS)('fixture writer %s exists, sits outside the roots, and does match', (rel) => {
    const abs = path.join(APP, rel);
    expect(fs.existsSync(abs)).toBe(true);
    expect(ROOTS.some((r) => rel.startsWith(`${r}/`))).toBe(false);
    expect(isWriter(stripComments(fs.readFileSync(abs, 'utf8')))).toBe(true);
  });
});

describe('matcher integrity (DEBUG-390)', () => {
  it.each([
    ["handleConsentToggle('cloudSyncEnabled', value)", 'quotedKey'],
    ['handleConsentPreferenceToggle("analyticsEnabled", v)', 'quotedKey'],
    ['preferences: {\n  analyticsEnabled,\n  cloudSyncEnabled,\n}', 'shorthand'],
    ['updateConsent({ researchEnabled: true })', 'property'],
  ])('fires on %s', (src, arm) => {
    expect(ARMS[arm].test(stripComments(src))).toBe(true);
    expect(isWriter(stripComments(src))).toBe(true);
  });

  it.each([
    "// handleConsentToggle('cloudSyncEnabled', value)",
    "/* updateConsent({ researchEnabled: true }) */",
    'const cloudSyncEnabled = prefs?.cloudSyncEnabled ?? false;',
    'value={cloudSyncEnabled && !uoo}',
  ])('does not fire on a comment or a read: %s', (src) => {
    expect(isWriter(stripComments(src))).toBe(false);
  });

  it('the naive prop-shaped pattern misses two of the three real shapes', () => {
    const naive = new RegExp(`(?:${ALT})\\s*[=:]`);
    expect(naive.test("handleConsentToggle('cloudSyncEnabled', value)")).toBe(false);
    expect(naive.test('preferences: {\n  analyticsEnabled,\n}')).toBe(false);
  });

  it('the computed-key tripwire fires on the dispatch shape', () => {
    expect(COMPUTED_DISPATCH.test('await updateConsent({ [key]: value });')).toBe(true);
  });
});
