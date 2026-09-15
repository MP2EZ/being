/**
 * Device-access control-claim guard (DEBUG-624)
 *
 * The DPIA credited two controls that were never built: §7 control 3,
 * "biometric / passcode authentication for sensitive data views", and control 4,
 * "auto-timeout and session lock". Both cited `docs/security/security-architecture.md`
 * §3/§4, which specified a biometric framework and a session manager that no code
 * path ever ran. `AuthenticationService.authenticateUser` has no production caller
 * and is the only caller of `authenticateWithBiometric`. §6.1 scenario 2 leaned on
 * control 3 to score device access Low. A regulator-facing assessment that rests on
 * a control the app does not have is the defect this suite exists to stop recurring.
 *
 * It pins both directions of the relation:
 *   - CODE: if an in-app authentication prompt is ever wired, part (a) goes red and
 *     tells you to re-credit control 3. It deliberately does NOT assert the service
 *     is uncalled forever, which would freeze out a real implementation.
 *   - DOCS: while no prompt is wired, the DPIA (§3–§8) and security-architecture.md
 *     may not re-acquire a gate or auto-lock claim, and every section citation into
 *     security-architecture.md must still resolve.
 *
 * DEBUG-390 DISCIPLINE. The corrected documents NAME the withdrawn controls in order
 * to record that they were withdrawn, and the DPIA's §9 change log narrates the
 * defect. So markdown is matched on CLAIM shapes (a credited control, code-shaped
 * spec fields, a checked box), never on the bare words "biometric" or "passcode", and
 * §9 is sliced out. `describe('matcher integrity')` proves every slicer and regex
 * still fires, so the suite cannot silently match nothing and pass.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const APP_SRC = path.join(REPO_ROOT, 'app/src');
const DPIA = 'docs/legal/dpia-sensitive-wellness-data.md';
const SEC_ARCH = 'docs/security/security-architecture.md';
const ENC_ARCH = 'docs/development/encryption-architecture.md';
const RUNBOOK = 'docs/legal/breach-notification-runbook.md';

const AUTH_SERVICE = 'core/services/security/AuthenticationService.ts';

const read = (rel: string): string => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function walkSource(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walkSource(full, acc);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** Slice a markdown document from one `## N.` heading up to (not including) another. */
function sliceSections(text: string, fromNum: number, toNum: number): string {
  const start = text.search(new RegExp(`^## ${fromNum}\\. `, 'm'));
  const end = text.search(new RegExp(`^## ${toNum}\\. `, 'm'));
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Headings "## ${fromNum}." / "## ${toNum}." not found in order. Re-point the slicer.`);
  }
  return text.slice(start, end);
}

/** Slice from a heading to the next heading of the same level. */
function sliceOne(text: string, heading: RegExp): string {
  const start = text.search(heading);
  if (start === -1) throw new Error(`Heading ${heading} not found. Re-point the slicer.`);
  const rest = text.slice(start + 1);
  const next = rest.search(/^## /m);
  return next === -1 ? text.slice(start) : text.slice(start, start + 1 + next);
}

const IMPORTS_LOCAL_AUTH = /from\s+['"]expo-local-authentication['"]|require\(\s*['"]expo-local-authentication['"]\s*\)/;
const CALLS_AUTH_PROMPT = /\b(?:authenticateUser|authenticateWithBiometric|authenticateAsync)\s*\(/;

/** Affirmative gate / lock claims in DPIA prose. Withdrawn rows are excluded before matching. */
const DPIA_CLAIMS: Array<[string, RegExp]> = [
  ['sensitive views require an unlock/auth step', /Sensitive (?:data )?views require/i],
  ['credited biometric/passcode control', /Biometric \/ passcode authentication for sensitive data views/],
  ['credited auto-timeout control', /Auto-timeout and session lock/],
  ['app locks itself', /\b(?:app|Being)\s+locks\s+(?:itself|automatically)/i],
  ['cites the retired §3 title', /§3 \(?Biometric Authentication Implementation/],
  ['cites the retired §4 title', /§4 \(?Auto-Timeout and Session Management/],
];

/** Spec fields and checked boxes that assert a gate or lock exists. */
const SEC_ARCH_CLAIMS: Array<[string, RegExp]> = [
  ['authenticateAsync call', /authenticateAsync\s*\(/],
  ['LocalAuthentication API use', /LocalAuthentication\.\w+\s*\(/],
  ['soft/hard lock policy', /\b(?:soft|hard)_lock\b/],
  ['require_recent_auth', /\brequire_recent_auth\b/],
  ['keychain biometric protection', /\bbiometric_protection\b|kSecAccessControlBiometry/],
  ['biometric-bound key derivation', /\brequireBiometric\b|\buser_biometric_hash\b/],
  ['biometric access control / confirmation', /\bbiometric_(?:lock|confirmation|required)\b/],
  ['auto-lock setting', /\bauto_lock(?:_timer)?\b/],
  ['keystore biometric authentication types', /authentication_types:\s*\[\s*["']BIOMETRIC/],
  ['biometric prompt helper call', /\bbiometricAuth\.authenticate\s*\(|\bsetupBiometrics\s*\(|\bconfigureAutoLock\s*\(/],
  ['session manager class', /class\s+SecureSessionManager\b/],
  ['checked biometric box', /✅\s*Biometric/],
  ['checked session-timeout box', /✅\s*Automatic session timeout/],
  ['roadmap biometric / auto-lock items', /\[ \]\s*(?:Basic biometric authentication|Auto-lock on background|Complete session management)/],
  ['biometric / session test plan', /test\(\s*['"](?:Biometric authentication|Session management)['"]/],
  ['user-facing biometric promise', /\bUse Face ID\b|face or fingerprint ensures|biometric authentication and encryption must/i],
  ['app locks itself', /\b(?:app|Being\.?)\s+locks\s+(?:itself|automatically)/i],
];

const ENC_ARCH_CLAIMS: Array<[string, RegExp]> = [
  ['keychain with biometric protection', /(?:keychain|key storage)[^.\n]*with biometric protection/i],
];

function offenders(text: string, claims: Array<[string, RegExp]>): string[] {
  const hits: string[] = [];
  text.split('\n').forEach((line, i) => {
    for (const [name, re] of claims) {
      if (re.test(line)) hits.push(`${i + 1} [${name}] ${line.trim().slice(0, 140)}`);
    }
  });
  return hits;
}

/** Section citations into security-architecture.md, resolved against its `## N.` headings. */
function unresolvedCitations(
  doc: string,
  text: string,
  { checkTitles }: { checkTitles: boolean }
): {
  checked: number;
  unresolved: string[];
} {
  const headings = new Map<string, string>();
  for (const m of read(SEC_ARCH).matchAll(/^## (\d+)\. (.+)$/gm)) headings.set(m[1], m[2].trim());

  let checked = 0;
  const unresolved: string[] = [];
  text
    .split('\n')
    .forEach((line, i) => {
      if (!line.includes('security-architecture.md') || /of this DPIA/.test(line)) return;
      // `(?<!CFR )` and `(?!\.\d)` skip statute citations such as "16 CFR §318.2".
      for (const m of line.matchAll(/(?<!CFR )§(\d+)(?!\.\d)(?:\s+\(([^)]+)\)|\s+([A-Z][^|;.,()\n]*?)(?=\s*(?:[|;.,]|$)))?/g)) {
        const [, num, parenTitle, bareTitle] = m;
        const cited = (parenTitle ?? bareTitle)?.trim();
        const actual = headings.get(num);
        checked += 1;
        if (!actual) {
          unresolved.push(`${doc}:${i + 1} §${num} — no "## ${num}." heading`);
        } else if (checkTitles && cited && /^[A-Z]/.test(cited) && !actual.startsWith(cited)) {
          unresolved.push(`${doc}:${i + 1} §${num} "${cited}" — heading is "${actual}"`);
        }
      }
    });
  return { checked, unresolved };
}

describe('DEBUG-624 (a) — code fact: no in-app authentication prompt is wired', () => {
  const files = walkSource(APP_SRC).map((full) => ({
    rel: path.relative(APP_SRC, full),
    src: stripComments(fs.readFileSync(full, 'utf8')),
  }));

  it('scans the app source (non-vacuity)', () => {
    expect(files.length).toBeGreaterThan(100);
    expect(files.some((f) => f.rel === AUTH_SERVICE)).toBe(true);
  });

  it('expo-local-authentication is imported only by the unwired AuthenticationService', () => {
    const importers = files.filter((f) => IMPORTS_LOCAL_AUTH.test(f.src)).map((f) => f.rel);
    // If this list grows, an authentication prompt may now exist: re-credit DPIA §7
    // control 3 and security-architecture.md §3, then update this test.
    expect(importers).toEqual([AUTH_SERVICE]);
  });

  it('nothing outside AuthenticationService calls an authentication prompt', () => {
    const callers = files
      .filter((f) => f.rel !== AUTH_SERVICE && CALLS_AUTH_PROMPT.test(f.src))
      .map((f) => f.rel);
    // A caller here means a gate may be live: re-credit DPIA §7 control 3, then update this test.
    expect(callers).toEqual([]);
  });
});

describe('DEBUG-624 (b) — the DPIA does not re-credit a gate or an auto-lock', () => {
  const dpia = read(DPIA);
  const assessed = sliceSections(dpia, 3, 9);
  const controls = sliceSections(dpia, 7, 8);
  const withoutWithdrawn = assessed
    .split('\n')
    .filter((line) => !line.includes('**WITHDRAWN'))
    .join('\n');

  it('carries no affirmative gate or auto-lock claim in §3–§8', () => {
    expect(offenders(withoutWithdrawn, DPIA_CLAIMS)).toEqual([]);
  });

  it.each(['3', '4'])('§7 control %s is still present, and marked WITHDRAWN', (n) => {
    const row = controls.split('\n').find((line) => line.startsWith(`| ${n} |`));
    expect(row).toBeDefined();
    expect(row).toContain('**WITHDRAWN');
  });

  it('scores the unlocked/shared-device half of scenario 2 at Medium, separately', () => {
    const risk = sliceSections(dpia, 6, 7);
    const row = risk.split('\n').find((line) => line.startsWith('| 2(ii) |'));
    expect(row).toBeDefined();
    expect(row).toMatch(/Med × High/);
    expect(risk.split('\n').some((line) => line.startsWith('| 2(i) |'))).toBe(true);
  });

  it('records the founder acceptance of that residual in §8', () => {
    expect(sliceSections(dpia, 8, 9)).toMatch(/Accepted residual — unlocked or shared device/);
  });

  it('still names the device passcode — the correction narrowed claims, not the vocabulary', () => {
    expect(assessed).toMatch(/device passcode/);
  });
});

describe('DEBUG-624 (c) — security documents describe the protection that exists', () => {
  const secArch = read(SEC_ARCH);

  it('security-architecture.md carries no gate or auto-lock claim', () => {
    expect(offenders(secArch, SEC_ARCH_CLAIMS)).toEqual([]);
  });

  it('§3 states there is no in-app authentication gate', () => {
    expect(sliceOne(secArch, /^## 3\. /m)).toMatch(/no in-app authentication gate/i);
  });

  it('§4 states there is no auto-lock', () => {
    expect(sliceOne(secArch, /^## 4\. /m)).toMatch(/no auto-lock/i);
  });

  it('encryption-architecture.md carries no biometric-protection claim', () => {
    expect(offenders(read(ENC_ARCH), ENC_ARCH_CLAIMS)).toEqual([]);
  });
});

describe('DEBUG-624 (d) — citations into security-architecture.md still resolve', () => {
  it('every DPIA citation names an existing section, by number and title', () => {
    const { checked, unresolved } = unresolvedCitations(DPIA, read(DPIA), { checkTitles: true });
    expect(checked).toBeGreaterThanOrEqual(6);
    expect(unresolved).toEqual([]);
  });

  it('every breach-runbook citation names an existing section number', () => {
    const { checked, unresolved } = unresolvedCitations(RUNBOOK, read(RUNBOOK), { checkTitles: false });
    expect(checked).toBeGreaterThanOrEqual(2);
    expect(unresolved).toEqual([]);
  });
});

describe('matcher integrity', () => {
  it('each DPIA claim regex fires on the pre-correction wording', () => {
    const preFix = [
      'Sensitive views require operating-system-level device unlock.',
      '| 3 | Biometric / passcode authentication for sensitive data views | x | y |',
      '| 4 | Auto-timeout and session lock | x | y |',
      'Your app locks automatically after a period of inactivity',
      'See §3 (Biometric Authentication Implementation).',
      '| §4 Auto-Timeout and Session Management |',
    ].join('\n');
    for (const [name, re] of DPIA_CLAIMS) {
      expect({ name, fires: offenders(preFix, [[name, re]]).length > 0 }).toEqual({ name, fires: true });
    }
  });

  it('each security-architecture claim regex fires on the pre-correction wording', () => {
    const preFix = [
      'const result = await LocalAuthentication.authenticateAsync({',
      'const available = await LocalAuthentication.hasHardwareAsync();',
      '    soft_lock: "blur_content_require_auth",',
      '    require_recent_auth: true,',
      '    biometric_protection: "kSecAccessControlBiometryAny"',
      '      requireBiometric: true',
      '      requires: "biometric_confirmation"',
      '      auto_lock_timer: "slider_with_preview",',
      '      authentication_types: ["BIOMETRIC_STRONG", "DEVICE_CREDENTIAL"]',
      "    const authenticated = await this.biometricAuth.authenticate('export_therapy_data');",
      'class SecureSessionManager {',
      '- ✅ Biometric authentication support',
      '- ✅ Automatic session timeout',
      '  - [ ] Auto-lock on background',
      "  test('Biometric authentication', async () => {",
      '- Use Face ID, Touch ID, or your fingerprint to protect your most sensitive data',
      '- Your app locks automatically after a period of inactivity',
    ].join('\n');
    for (const [name, re] of SEC_ARCH_CLAIMS) {
      expect({ name, fires: offenders(preFix, [[name, re]]).length > 0 }).toEqual({ name, fires: true });
    }
    expect(offenders('- **Device keychain** integration with biometric protection', ENC_ARCH_CLAIMS)).toHaveLength(1);
  });

  it('the code-fact matchers fire on an import and a prompt call', () => {
    expect(IMPORTS_LOCAL_AUTH.test("import * as LocalAuthentication from 'expo-local-authentication';")).toBe(true);
    expect(CALLS_AUTH_PROMPT.test('await LocalAuthentication.authenticateAsync({})')).toBe(true);
    expect(CALLS_AUTH_PROMPT.test('await auth.authenticateUser(userId)')).toBe(true);
  });

  it('the citation resolver flags a retired title and a missing section', () => {
    const headings = [...read(SEC_ARCH).matchAll(/^## (\d+)\. (.+)$/gm)];
    expect(headings.length).toBeGreaterThanOrEqual(8);
    const probe = (line: string) =>
      unresolvedCitations('probe', line, { checkTitles: true }).unresolved;
    expect(probe('| `docs/security/security-architecture.md` | §99 Missing Section |')).toHaveLength(1);
    expect(probe('| `docs/security/security-architecture.md` | §1 A Title That Is Not There |')).toHaveLength(1);
    expect(probe('outside AES-256-GCM (see 16 CFR §318.2 and `docs/security/security-architecture.md` §1).')).toEqual([]);
  });

  it('the slicers throw when a heading is missing', () => {
    expect(() => sliceSections('## 1. a\n## 2. b', 3, 9)).toThrow(/Re-point the slicer/);
    expect(() => sliceOne('## 1. a', /^## 3\. /m)).toThrow(/Re-point the slicer/);
  });
});
