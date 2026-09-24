/**
 * Privacy-policy §4.3 security-measures claim guard (MAINT-646)
 *
 * The published privacy policy's §4.3 listed "Regular security audits and
 * penetration testing". Being has never had a security audit or a penetration
 * test (founder-confirmed 2026-09-23), and the repository holds no evidence of
 * one. It also listed "Limited employee access to encrypted data", which invites
 * the inference of a staffed access-management programme; Being is operated by
 * its founder alone. Both lines were published to being.fyi and compiled into
 * the in-app legal screens, so both were live consumer-facing representations
 * about security — the FTC Act §5 shape DEBUG-534 and DEBUG-608 closed
 * elsewhere.
 *
 * This suite asserts, on both surfaces (the markdown source and the generated
 * in-app module):
 *   (a) §4.3 claims no audit and no penetration testing, and no staffed access
 *       control;
 *   (b) §4.3 does not overcorrect into claiming nobody can reach the data —
 *       `service_role` bypasses RLS (docs/security/supabase-rls-verification.md),
 *       so founder access is real;
 *   (c) the substantiated claims (AES-256 at rest, TLS 1.2+ in transit, the
 *       DPIA) and the two replacements are present;
 *   (d) every matcher fires on the real pre-fix lines, and the slicer covers
 *       §4.3 only. The §10 change log is outside the slice because it must be
 *       able to name what it withdrew.
 *
 * If an audit or penetration test is ever performed, record the evidence (who,
 * when, scope, report location) first, then change this suite deliberately.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const POLICY = path.join(REPO_ROOT, 'docs/legal/privacy-policy.md');
const GENERATED_LEGAL = path.join(
  REPO_ROOT,
  'app/src/features/profile/content/legalContent.generated.ts'
);

/** An audit claim in any inflection. §4.3 must not use the word at all. */
const AUDIT = /\baudit(?:s|ed|ing)?\b/i;

/** "penetration testing" / "penetration test" / "pen-test". */
const PENETRATION = /penetration[ -]?test|\bpen[ -]?test/i;

/** The staffed-access wording the policy used. */
const STAFF_ACCESS = /limited (?:employee|staff) access/i;

/** The overcorrection: a claim that no one, the operator included, can reach the data. */
const NO_ONE_ACCESS = /\bno one\b[^.]*\b(?:can|may|is able to) access|cannot be accessed by (?:anyone|us)/i;

const CLAIM_RULES: ReadonlyArray<[string, RegExp]> = [
  ['audit', AUDIT],
  ['penetration testing', PENETRATION],
  ['staffed access control', STAFF_ACCESS],
  ['no-one-can-access overcorrection', NO_ONE_ACCESS],
];

/** Slice from the "### 4.3 Security Measures" heading up to the next ##/### heading. */
function section43(text: string, label: string): string {
  const start = text.search(/^### 4\.3 Security Measures\s*$/m);
  if (start < 0) {
    throw new Error(`${label}: "### 4.3 Security Measures" not found. Re-point the slicer.`);
  }
  const rest = text.slice(start);
  // Search past the heading's own line, or "### 4.3" matches its own "## " suffix.
  const bodyStart = rest.indexOf('\n') + 1;
  const next = rest.slice(bodyStart).search(/^#{2,3} /m);
  return next < 0 ? rest : rest.slice(0, bodyStart + next);
}

function offendersIn(label: string, text: string): string[] {
  const out: string[] = [];
  text.split('\n').forEach((line, i) => {
    for (const [name, re] of CLAIM_RULES) {
      if (re.test(line)) out.push(`${label} §4.3 line ${i + 1} [${name}] ${line.trim()}`);
    }
  });
  return out;
}

function readGenerated(): string {
  // Gitignored (app/.gitignore, DEBUG-178) but regenerated on postinstall /
  // prestart / preios. CI's Safety + privacy gates job runs npm ci, so it exists there.
  if (!fs.existsSync(GENERATED_LEGAL)) {
    throw new Error(
      'legalContent.generated.ts is missing. Run: cd app && npm run generate:legal-content'
    );
  }
  return fs.readFileSync(GENERATED_LEGAL, 'utf8');
}

const SURFACES: ReadonlyArray<[string, () => string]> = [
  ['docs/legal/privacy-policy.md', () => fs.readFileSync(POLICY, 'utf8')],
  ['legalContent.generated.ts', readGenerated],
];

describe('MAINT-646 (a)(b): §4.3 makes no unsubstantiated security claim', () => {
  it.each(SURFACES)('%s', (label, load) => {
    const slice = section43(load(), label);
    expect(offendersIn(label, slice)).toEqual([]);
  });
});

describe('MAINT-646 (c): §4.3 keeps the substantiated claims and states the replacements', () => {
  it.each(SURFACES)('%s', (label, load) => {
    const slice = section43(load(), label);
    expect(slice).toContain('AES-256 encryption for data at rest');
    expect(slice).toContain('TLS 1.2+ encryption for data in transit');
    expect(slice).toContain('Data Protection Impact Assessment');
    expect(slice).toMatch(/dependency vulnerability scanning/i);
    expect(slice).toMatch(/continuous integration/i);
    expect(slice).toMatch(/operated solely by its founder/i);
  });
});

describe('MAINT-646 (d): matcher integrity', () => {
  it('each claim matcher fires on the real pre-fix line', () => {
    expect(AUDIT.test('- Regular security audits and penetration testing')).toBe(true);
    expect(PENETRATION.test('- Regular security audits and penetration testing')).toBe(true);
    expect(STAFF_ACCESS.test('- Limited employee access to encrypted data')).toBe(true);
    expect(NO_ONE_ACCESS.test('- No one can access your encrypted data')).toBe(true);
    expect(NO_ONE_ACCESS.test('- No one, including Being, can access your data')).toBe(true);
  });

  it('the matchers spare the replacement wording', () => {
    const replacements = [
      '- Automated dependency vulnerability scanning and automated safety and privacy test suites, enforced in continuous integration on every code change',
      '- Being is operated solely by its founder, with no additional employees or staff who access user data',
    ];
    for (const line of replacements) {
      expect(offendersIn('fixture', line)).toEqual([]);
    }
  });

  it('the slicer covers §4.3 only, on both surfaces', () => {
    for (const [label, load] of SURFACES) {
      const slice = section43(load(), label);
      expect(slice.startsWith('### 4.3 Security Measures')).toBe(true);
      expect(slice).not.toMatch(/^### 4\.4 /m);
      expect(slice).not.toMatch(/Recent revisions/);
      expect(slice.split('\n').length).toBeGreaterThan(3);
    }
  });
});
