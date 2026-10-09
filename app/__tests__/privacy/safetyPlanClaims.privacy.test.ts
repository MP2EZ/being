/**
 * Safety-plan and emergency-contact claim guard (DEBUG-608)
 *
 * The published privacy policy listed "Emergency Contacts ... (stored locally
 * only)" as information users provide. The in-app Privacy & Data screen showed a
 * "Crisis Contacts" storage row described as "Emergency contacts and safety
 * plan". The Cloud Backup consent card excluded "Crisis contact information".
 * The DPIA classified "crisis safety plan content" as a collected sensitive
 * category and justified collecting it. The public README advertised "Safety
 * Planning: Personal crisis plan creation and storage".
 *
 * None of it was ever collected. `CrisisPlanScreen` was deleted in MAINT-125
 * (2025-12-11) and `crisisPlanStore` in MAINT-123 (2025-12-26), both before the
 * first external distribution (TestFlight, 2026-06-15). No shipped build had a
 * surface to enter a safety plan or a personal emergency contact. The copy
 * described a feature the app does not have, which is the FTC Act §5 shape
 * DEBUG-534 closed for a named control.
 *
 * This suite asserts the relation directly:
 *   (a) app/src holds no safety-plan / emergency-contact / crisis-plan screen or
 *       store file and no `@crisis_plan` storage key, so the copy has nothing to
 *       describe;
 *   (b) the user-facing surfaces make no safety-plan claim and no claim to
 *       collect or store emergency or crisis contacts;
 *   (c) the DPIA's analytic sections (§3 to §7) do not classify, purpose or
 *       justify a safety plan. The §9 change log is exempt because it must be
 *       able to name what it removed.
 *   (d) every matcher still fires on the pre-fix text and the scanned text is
 *       non-trivial.
 *
 * Deliberately NOT asserted: defensive redaction lists (`BLOCKED_FIELDS`,
 * `SensitiveDataPatterns`, `PHIFilter`) and erasure floors
 * (`crisis_async_` / `crisis_secure_`). Those name the fields so they are
 * scrubbed or swept if they ever appear. They are not claims.
 *
 * DEBUG-390 DISCIPLINE. Source is comment-stripped before matching, and
 * `describe('matcher integrity')` proves the stripper and every regex still go
 * red, so this file cannot silently match nothing and pass forever.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const APP_SRC = path.join(REPO_ROOT, 'app/src');
const DPIA = path.join(REPO_ROOT, 'docs/legal/dpia-sensitive-wellness-data.md');
const GENERATED_LEGAL = path.join(
  APP_SRC,
  'features/profile/content/legalContent.generated.ts'
);

/** User-facing markdown that must not describe the feature. */
const MARKDOWN_SURFACES = [
  'docs/legal/privacy-policy.md',
  'docs/legal/medical-disclaimer.md',
  'README.md',
];

/** In-app copy that must not describe the feature (comment-stripped). */
const SOURCE_SURFACES = [
  'app/src/features/profile/screens/PrivacyDataScreen.tsx',
  'app/src/features/consent/constants/consentDetails.ts',
];

/**
 * Entitlement, crisis and assessment type models that used to name the feature
 * as if it existed. Comment-stripped. The four assessment files joined in
 * MAINT-616, which deleted the emergencyContacts / emergencyContactOverride /
 * SAFETY_PLANNING members this guard had missed.
 */
const MODEL_SURFACES = [
  'app/src/core/types/subscription/index.ts',
  'app/src/features/crisis/types/safety.ts',
  'app/src/features/assessment/types/actions.ts',
  'app/src/features/assessment/types/params.ts',
  'app/src/features/assessment/types/props.ts',
  'app/src/features/assessment/types/scoring.ts',
];

/** Any safety-plan wording, including "Safety Planning". */
const SAFETY_PLAN = /safety[ _-]?plan/i;

/** A labelled collection entry: "**Emergency Contacts:**". */
const EMERGENCY_CONTACTS_LABEL = /emergency contacts?\s*:/i;

/** "Crisis contact information" / "crisis contact details". */
const CRISIS_CONTACT_INFORMATION = /crisis contact (?:information|details)/i;

/** A storage claim near contacts: "Contact information ... (stored locally only)". */
const CONTACTS_STORED = /\bcontacts?\b[^.\n]{0,60}\b(?:stored|kept|saved)\b/i;

/** In source copy there is no reason to name personal crisis/emergency contacts at all. */
const CONTACTS_BARE = /\b(?:crisis|emergency) contacts?\b/i;

const MARKDOWN_CONTACT_CLAIMS: ReadonlyArray<[string, RegExp]> = [
  ['emergency-contacts label', EMERGENCY_CONTACTS_LABEL],
  ['crisis contact information', CRISIS_CONTACT_INFORMATION],
  ['contacts stored', CONTACTS_STORED],
];

/** Model identifiers for the feature that never shipped. */
const MODEL_FEATURE = /safetyPlan|crisisContacts|CrisisSafetyPlan|safety_plan|SAFETY_PLAN|emergencyContact/;

/** Screen/store file names for the feature. */
const FEATURE_FILE = /(?:safety_?plan|emergency_?contacts?|crisis_?plan)/i;

/** The storage key `crisisPlanStore` used. */
const CRISIS_PLAN_KEY = /['"`]@crisis_plan/;

/**
 * DPIA §3 to §7: a safety plan as a noun ("crisis safety plan content",
 * "safety plans are user-authored"). "safety planning" is excluded from this
 * matcher, and is instead required to appear only in a negated scope statement.
 */
const DPIA_SAFETY_PLAN_NOUN = /\bsafety plans?\b/i;
const DPIA_PERSONAL_CRISIS_CONTACTS = /\bpersonal crisis contacts?\b/i;
const NEGATION = /\b(?:does not|do not|never|not)\b/i;

/**
 * Strip block and line comments so prose warnings are not matched as code.
 * Newlines inside a block comment are kept, so offender line numbers still
 * point at the real file.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ''))
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

function read(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

/** Slice the DPIA from the `## 3.` heading up to (not including) `## 8.`. */
function dpiaAnalyticSections(text: string): string {
  const start = text.search(/^## 3\. /m);
  const end = text.search(/^## 8\. /m);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('DPIA headings "## 3." / "## 8." not found. Re-point the slicer.');
  }
  return text.slice(start, end);
}

/** Sentences (split on ". " / newline) that mention "safety planning". */
function safetyPlanningSentences(text: string): string[] {
  return text
    .split(/(?<=\.)\s+|\n/)
    .filter((s) => /safety planning/i.test(s));
}

function offendersIn(
  file: string,
  text: string,
  rules: ReadonlyArray<[string, RegExp]>
): string[] {
  const out: string[] = [];
  text.split('\n').forEach((line, i) => {
    for (const [name, re] of rules) {
      if (re.test(line)) out.push(`${file}:${i + 1} [${name}] ${line.trim()}`);
    }
  });
  return out;
}

describe('DEBUG-608 (a): no safety-plan or emergency-contact feature exists in app/src', () => {
  const files = walk(APP_SRC);

  it('has source to scan (non-vacuity)', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('no screen or store file for a safety plan, emergency contacts or a crisis plan', () => {
    const offenders = files
      .filter((f) => FEATURE_FILE.test(path.basename(f)))
      .map((f) => path.relative(REPO_ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('no @crisis_plan storage key (comments stripped)', () => {
    const offenders = files
      .filter((f) => /\.(?:tsx?|jsx?)$/.test(f))
      .filter((f) => CRISIS_PLAN_KEY.test(stripComments(fs.readFileSync(f, 'utf8'))))
      .map((f) => path.relative(REPO_ROOT, f));
    expect(offenders).toEqual([]);
  });

  it.each(MODEL_SURFACES)('the model names no safety-plan / crisis-contacts feature, %s', (rel) => {
    const code = stripComments(read(rel));
    expect(code.length).toBeGreaterThan(2000);
    const hits = code.split('\n').filter((l) => MODEL_FEATURE.test(l)).map((l) => l.trim());
    expect({ file: rel, hits }).toEqual({ file: rel, hits: [] });
  });
});

describe('DEBUG-608 (b): user-facing copy makes no safety-plan or contact-collection claim', () => {
  it.each(MARKDOWN_SURFACES)('%s', (rel) => {
    const text = read(rel);
    expect(text.length).toBeGreaterThan(2000);
    const offenders = offendersIn(rel, text, [
      ['safety plan', SAFETY_PLAN],
      ...MARKDOWN_CONTACT_CLAIMS,
    ]);
    expect(offenders).toEqual([]);
  });

  it.each(SOURCE_SURFACES)('%s (comments stripped)', (rel) => {
    const code = stripComments(read(rel));
    expect(code.length).toBeGreaterThan(2000);
    const offenders = offendersIn(rel, code, [
      ['safety plan', SAFETY_PLAN],
      ...MARKDOWN_CONTACT_CLAIMS,
      ['crisis/emergency contacts', CONTACTS_BARE],
    ]);
    expect(offenders).toEqual([]);
  });

  it('the generated in-app legal module carries the corrected copy', () => {
    // Gitignored (app/.gitignore, DEBUG-178) but regenerated on postinstall /
    // prestart / preios. CI's Safety + privacy gates job runs npm ci, so it exists there.
    if (!fs.existsSync(GENERATED_LEGAL)) {
      throw new Error(
        'legalContent.generated.ts is missing. Run: cd app && npm run generate:legal-content'
      );
    }
    const text = fs.readFileSync(GENERATED_LEGAL, 'utf8');
    expect(text).toContain('Privacy Policy'); // codegen bridge is live
    const offenders = offendersIn('legalContent.generated.ts', text, [
      ['safety plan', SAFETY_PLAN],
      ...MARKDOWN_CONTACT_CLAIMS,
    ]);
    expect(offenders).toEqual([]);
  });
});

describe('DEBUG-608 (c): the DPIA does not classify, purpose or justify a safety plan', () => {
  const sections = dpiaAnalyticSections(fs.readFileSync(DPIA, 'utf8'));

  it('§3 to §7 contain no safety plan and no personal crisis contacts', () => {
    const offenders = offendersIn('dpia §3-§7', sections, [
      ['safety plan', DPIA_SAFETY_PLAN_NOUN],
      ['personal crisis contacts', DPIA_PERSONAL_CRISIS_CONTACTS],
    ]);
    expect(offenders).toEqual([]);
  });

  it('any "safety planning" mention in §3 to §7 is a negated scope statement', () => {
    const unscoped = safetyPlanningSentences(sections).filter((s) => !NEGATION.test(s));
    expect(unscoped).toEqual([]);
  });
});

/**
 * Proves every matcher above can still go red. Without this the suite could
 * silently match nothing (the DEBUG-390 failure mode) and pass forever.
 */
describe('DEBUG-608 (d): matcher integrity', () => {
  it('the comment stripper removes a prose mention but keeps code', () => {
    const sample = [
      '// the "Crisis Contacts" row claimed an emergency contacts and safety plan store.',
      '/* safety plan */',
      'const label = "Preferences";',
    ].join('\n');
    const stripped = stripComments(sample);
    expect(SAFETY_PLAN.test(stripped)).toBe(false);
    expect(CONTACTS_BARE.test(stripped)).toBe(false);
    expect(stripped).toContain('Preferences');
  });

  it('each claim matcher fires on the real pre-fix line', () => {
    expect(
      EMERGENCY_CONTACTS_LABEL.test(
        '- **Emergency Contacts:** Contact information for crisis support (stored locally only)'
      )
    ).toBe(true);
    expect(
      CONTACTS_STORED.test(
        '- **Emergency Contacts:** Contact information for crisis support (stored locally only)'
      )
    ).toBe(true);
    expect(CRISIS_CONTACT_INFORMATION.test('- Crisis contact information')).toBe(true);
    expect(
      CRISIS_CONTACT_INFORMATION.test("        'Crisis contact information (device-specific)',")
    ).toBe(true);
    expect(SAFETY_PLAN.test('              description="Emergency contacts and safety plan"')).toBe(
      true
    );
    expect(CONTACTS_BARE.test('              label="Crisis Contacts"')).toBe(true);
    expect(SAFETY_PLAN.test('- **Safety Planning**: Personal crisis plan creation and storage')).toBe(
      true
    );
    expect(MODEL_FEATURE.test('  safetyPlan: true;                    // ALWAYS true')).toBe(true);
    expect(MODEL_FEATURE.test("  | 'safety_plan_triggered';")).toBe(true);
    expect(MODEL_FEATURE.test('export interface CrisisSafetyPlan {')).toBe(true);
    expect(MODEL_FEATURE.test("  | 'SAFETY_PLANNING'")).toBe(true);
    expect(MODEL_FEATURE.test('  emergencyContacts?: Array<{')).toBe(true);
    expect(MODEL_FEATURE.test('    emergencyContactOverride?: {')).toBe(true);
    expect(FEATURE_FILE.test('crisisPlanStore.ts')).toBe(true);
    expect(FEATURE_FILE.test('SafetyPlanScreen.tsx')).toBe(true);
    expect(FEATURE_FILE.test('EmergencyContactScreen.tsx')).toBe(true);
    expect(CRISIS_PLAN_KEY.test("const KEY = '@crisis_plan_secure_v1';")).toBe(true);
  });

  it('the claim matchers spare the medical-disclaimer lines ruled benign', () => {
    // These refer to the third-party crisis services the app lists, not to
    // anything Being collects or stores.
    const kept = [
      '- Crisis contacts are suggestions, not monitored by Being',
      '- Being is not responsible for third-party services (988, emergency contacts)',
    ];
    for (const line of kept) {
      for (const [, re] of MARKDOWN_CONTACT_CLAIMS) expect(re.test(line)).toBe(false);
      expect(SAFETY_PLAN.test(line)).toBe(false);
    }
  });

  it('the DPIA matchers fire on the pre-fix rows and spare a negated scope statement', () => {
    expect(
      DPIA_SAFETY_PLAN_NOUN.test(
        '| Crisis safety plan content | Personal warning signs, coping strategies, support contacts | TDPSA, CPA, VCDPA, CTDPA |'
      )
    ).toBe(true);
    expect(
      DPIA_SAFETY_PLAN_NOUN.test('- **Crisis safety plans** are user-authored. They are collected because')
    ).toBe(true);
    expect(
      DPIA_PERSONAL_CRISIS_CONTACTS.test(
        '| Crisis-resource access — surface 988 and personal crisis contacts when self-harm indicators are present |'
      )
    ).toBe(true);
    expect(DPIA_SAFETY_PLAN_NOUN.test('Being does not provide safety planning.')).toBe(false);

    const sentences = safetyPlanningSentences(
      'Being refers users to 988. It does not provide safety planning. Being offers safety planning tools.'
    );
    expect(sentences).toHaveLength(2);
    expect(sentences.filter((s) => !NEGATION.test(s))).toEqual(['Being offers safety planning tools.']);
  });

  it('the DPIA slicer covers §3 to §7 and excludes the §9 change log', () => {
    const sections = dpiaAnalyticSections(fs.readFileSync(DPIA, 'utf8'));
    expect(sections.length).toBeGreaterThan(5000);
    for (const n of [3, 4, 5, 6, 7]) {
      expect(sections).toMatch(new RegExp(`^## ${n}\\. `, 'm'));
    }
    expect(sections).not.toMatch(/^## 9\. /m);
  });
});
