/**
 * DEBUG-370 — the call-site pin for raw `colorSystem.gray[600]`.
 *
 * WHY A SOURCE-SCANNING TEST AND NOT A CONTRAST ASSERTION. Its sibling
 * `theme-contrast.accessibility.test.ts` pins TOKEN values against a surface
 * list. That is the right shape for the token, and it is structurally blind to
 * this defect: it has no visibility into call sites, so it passed green while 78
 * non-test sites read the raw ramp value and bypassed the token entirely. The
 * proof is arithmetic — the whole accessibility suite was green on the commit
 * before this file existed, with every one of those 78 sites present. A test
 * asserting `semantic.text.secondary` clears 4.5:1 cannot fail because a
 * component declined to use it.
 *
 * So the assertion has to be about the SOURCE, not the palette. Precedent for
 * that shape in this repo is INFRA-184's `lsApplicationQueriesSchemes.config.test.ts`,
 * which reads `app.json` off disk for the same reason: the runtime path it
 * protects is one that mocked unit tests cannot reach.
 *
 * FILE PATH IS LOAD-BEARING, NOT STYLISTIC — identical constraint to the sibling
 * pin. `npm run test:accessibility` is `jest --testPathPattern=accessibility`, so
 * the FILENAME must contain "accessibility" or this never runs; and
 * jest.config.js's `src/**\/__tests__/**\/*` pattern is what makes a file here
 * match testMatch at all.
 *
 * WHY THIS IS A TEST AND NOT THE ESLINT RULE. DEBUG-370's acceptance criteria
 * defer a `no-restricted-syntax` guard, and correctly so: unlike gray[500]
 * (DEBUG-342), which fails every bar on every surface and is therefore a hard
 * zero, gray[600] stays LEGAL as a non-text colour — it clears the WCAG 1.4.11
 * 3:1 bar everywhere in the surface matrix. A blanket ban would red-line lawful
 * code. ESLint also cannot cheaply express "in a text position", and any
 * `Property[key.name="color"]` selector would miss both the `placeholderTextColor`
 * JSX prop and any local alias. An exact-allowlist test has neither problem: it
 * names the survivors individually, with the reason each one is lawful.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

/** Repo-relative root of the scanned tree (`app/src`). */
const SRC_ROOT = join(__dirname, '..', '..', '..');

/**
 * The reference this file detects, ASSEMBLED FROM PARTS RATHER THAN WRITTEN OUT.
 *
 * This is the one file in the repo that must contain the exact literal it
 * forbids, which makes it uniquely fragile: a repo-wide find-and-replace of
 * `colorSystem.gray[600]` — precisely the operation DEBUG-370 performed — rewrites
 * this detector into one that searches for the replacement token, and it then
 * passes for the wrong reason while catching nothing. Splitting the literal means
 * no such sweep can match it, so the guard survives the next sweep of its own kind.
 */
const RAW_REF = `colorSystem.gray[${600}]`;

/**
 * The complete set of raw `colorSystem.gray[600]` references permitted to remain
 * in non-test source, each with the reason it is lawful.
 *
 * EXACT-SET, NOT A CEILING. The assertion below compares this against what the
 * scan finds in BOTH directions, which is what makes it a pin rather than a
 * budget: a new raw reference fails (regression), and an entry disappearing also
 * fails (the allowlist has gone stale and is no longer describing the tree).
 *
 * It also closes the alias hole for free. A local re-export such as
 * `const localColors = { gray600: colorSystem.gray[600] }` — the shape that hid
 * 12 downstream text sites behind a single grep hit in `OnboardingScreen` before
 * DEBUG-370 — is itself a raw reference on its declaration line, so it surfaces
 * here and fails set equality. No separate alias rule is needed.
 */
const ALLOWED: ReadonlyArray<{ file: string; property: string; reason: string }> = [
  {
    file: 'features/crisis/components/CrisisAccessibility.tsx',
    property: 'backgroundColor',
    reason:
      'Button FILL, not text. The label on it is base.white; white on #757575 is 4.608:1, ' +
      'which clears WCAG 1.4.3 for normal text, and the fill clears 1.4.11 against the page. ' +
      'Nothing to fix — re-pointing it would darken a lawful control for no accessibility gain.',
  },
  {
    file: 'features/crisis/components/CrisisErrorBoundary.tsx',
    property: 'backgroundColor',
    reason:
      'Button FILL, not text. Same 4.608:1 white-on-fill as above. Lawful under both bars.',
  },
  {
    file: 'core/navigation/CleanTabNavigator.tsx',
    property: 'color',
    reason:
      'Text, but inside `PlaceholderScreen` — a component declared in this file and rendered ' +
      'nowhere in app/src. Dead code, and on a white ground where gray[600] is 4.608:1 and ' +
      'passes anyway. Left as-is deliberately: it is not a live defect, and editing it would ' +
      'put core/navigation/ in the diff. Delete it with the dead component, not with a sweep.',
  },
];

/** Directory names never scanned. */
const SKIPPED_DIRS = new Set(['__tests__', '__mocks__', 'node_modules']);

const isTestFile = (name: string) =>
  name.includes('.test.') || name.includes('.spec.') || name.endsWith('.d.ts');

const isSourceFile = (name: string) =>
  (name.endsWith('.ts') || name.endsWith('.tsx')) && !isTestFile(name);

/** Every non-test source file under `app/src`, repo-relative to that root. */
const collectSourceFiles = (dir: string, acc: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!SKIPPED_DIRS.has(entry)) collectSourceFiles(full, acc);
    } else if (isSourceFile(entry)) {
      acc.push(full);
    }
  }
  return acc;
};

/**
 * A line is a comment if its FIRST non-space characters open or continue one.
 * Prose naming the token is not a use of it, and this file's own header would
 * otherwise trip the scan it defines.
 */
const isCommentLine = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);

/**
 * Best-effort label for the syntactic position of a reference, used only to make
 * a failure legible — the pass/fail decision is the file+property pair.
 */
const propertyOf = (line: string): string => {
  const objectKey = /(\w+)\s*:\s*colorSystem\.gray\[600\]/.exec(line);
  if (objectKey) return objectKey[1];
  const jsxProp = /(\w+)=\{colorSystem\.gray\[600\]\}/.exec(line);
  if (jsxProp) return jsxProp[1];
  if (/return\s+colorSystem\.gray\[600\]/.test(line)) return 'return';
  return 'unknown';
};

interface Reference {
  file: string;
  line: number;
  property: string;
}

const scan = (): { files: string[]; refs: Reference[] } => {
  const files = collectSourceFiles(SRC_ROOT);
  const refs: Reference[] = [];
  for (const full of files) {
    const text = readFileSync(full, 'utf8');
    if (!text.includes(RAW_REF)) continue;
    text.split('\n').forEach((line, i) => {
      if (!line.includes(RAW_REF) || isCommentLine(line)) return;
      refs.push({
        // POSIX-normalise so the allowlist reads the same on any platform.
        file: relative(SRC_ROOT, full).split(sep).join('/'),
        line: i + 1,
        property: propertyOf(line),
      });
    });
  }
  return { files, refs };
};

describe('DEBUG-370: raw gray[600] survives only where it is lawful', () => {
  const { files, refs } = scan();

  it('actually scanned the tree (guards against a silently empty scan)', () => {
    // MAINT-358's standard, applied to a filesystem walk rather than a matrix: the
    // set-equality assertion below is SILENTLY GREEN if the walker returns nothing,
    // which is exactly what a moved directory or a broken join() produces. A scan
    // that finds no files would "prove" the sweep complete while proving nothing.
    expect(existsSync(SRC_ROOT)).toBe(true);
    expect(files.length).toBeGreaterThan(200);

    // And prove it reaches BOTH trees the allowlist spans, not just the nearest one
    // — a walker that silently stopped at core/ would still clear the count above.
    const scanned = files.map((f) => relative(SRC_ROOT, f).split(sep).join('/'));
    expect(scanned).toContain('core/navigation/CleanTabNavigator.tsx');
    expect(scanned).toContain('features/crisis/components/CrisisAccessibility.tsx');
  });

  it('leaves exactly the allowlisted references, no more and no fewer', () => {
    const found = refs
      .map((r) => `${r.file}:${r.property}`)
      .sort();
    const allowed = ALLOWED.map((a) => `${a.file}:${a.property}`).sort();

    // Compare the full sorted lists rather than counts, so a failure NAMES the
    // offending site instead of reporting "expected 3, received 4".
    expect(found).toEqual(allowed);
  });

  it('no raw reference sits in a text position outside the allowlist', () => {
    // Narrower restatement of the assertion above, kept separate because this is
    // the one that carries the accessibility meaning: `color:` and
    // `placeholderTextColor` are governed by WCAG 1.4.3 at 4.5:1, which gray[600]
    // fails on every non-white surface in the app.
    const allowedKeys = new Set(ALLOWED.map((a) => `${a.file}:${a.property}`));
    const offenders = refs
      .filter((r) => r.property === 'color' || r.property === 'placeholderTextColor')
      .filter((r) => !allowedKeys.has(`${r.file}:${r.property}`))
      .map((r) => `${r.file}:${r.line}`);

    expect(offenders).toEqual([]);
  });

  it('every allowlist entry records why that reference is lawful', () => {
    // The allowlist is the only place the exemptions are justified, so an entry
    // without a reason is an undocumented exemption — the failure mode that turns
    // a pin back into tribal knowledge.
    for (const entry of ALLOWED) {
      expect(entry.reason.length).toBeGreaterThan(40);
    }
  });
});
