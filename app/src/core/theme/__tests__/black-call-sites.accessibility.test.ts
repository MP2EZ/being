/**
 * DEBUG-387 — the call-site pin for raw `colorSystem.base.black` and `#1C1C1C`.
 *
 * Sibling of `gray600-call-sites.accessibility.test.ts` (DEBUG-370) and built to
 * the same shape for the same reason: `theme-contrast.accessibility.test.ts` pins
 * TOKEN values against a surface list and is structurally blind to call sites, so
 * it stayed green while ~96 non-test sites read the raw ramp value and bypassed
 * `semantic.text.primary` entirely. A test asserting the token clears its bars
 * cannot fail because a component declined to use the token.
 *
 * WHY A TEST AND NOT AN ESLINT RULE — this is DEBUG-387's central design decision,
 * and it reverses the acceptance criteria as written. The AC prescribed the
 * DEBUG-342 `no-restricted-syntax` mechanism. That mechanism was ALREADY RULED
 * WRONG in this repo for a structurally identical problem, one token over, in the
 * DEBUG-370 sibling's own header:
 *
 *   "unlike gray[500] (DEBUG-342), which fails every bar on every surface and is
 *    therefore a hard zero, gray[600] stays LEGAL as a non-text colour... A blanket
 *    ban would red-line lawful code. ESLint also cannot cheaply express 'in a text
 *    position', and any Property[key.name="color"] selector would miss both the
 *    placeholderTextColor JSX prop and any local alias. An exact-allowlist test has
 *    neither problem."
 *
 * `base.black` is MORE legal outside text than gray[600] was: it is lawful as a
 * shadow (3 sites) and it IS the value of `semantic.text.primary`. Three further
 * facts, each measured rather than assumed, make the ESLint route unworkable here:
 *
 *   1. A `Property[key.name="color"] > MemberExpression` selector matches 93, not
 *      94 — it misses `BodyAreaGrid.tsx`'s ternary, whose `color:` key sits two
 *      lines above the reference. The descendant combinator is required there.
 *   2. The mirror-image mistake breaks the anti-alias selector: written with a
 *      descendant combinator it matches 97, because `StyleSheet.create({ x: {
 *      color: ... } })` puts a non-`color` Property ancestor above EVERY swept
 *      site. It needs the direct-child form. Getting these two backwards is the
 *      single easiest error in this work item, and the version circulated in
 *      planning had it wrong in a third way — omitting `:not([key.name=
 *      "shadowColor"])`, so it red-lined the exact three sites the AC protects.
 *   3. `eslint.config.js`'s test-file override sets `no-restricted-syntax: 'off'`,
 *      and `CircuitBreakerService.ts` fails to parse (it is baselined at 1 error),
 *      so no ESLint rule has ever run on it. An ESLint guard has a permanent blind
 *      file; a filesystem walk does not.
 *
 * FILE PATH IS LOAD-BEARING, NOT STYLISTIC. `npm run test:accessibility` is
 * `jest --testPathPattern=accessibility`, matched on PATH, so the filename must
 * contain "accessibility" or this never runs; and jest.config.js's
 * `src/**\/__tests__/**\/*` pattern is what makes a file here match testMatch.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

/** Repo-relative root of the scanned tree (`app/src`). */
const SRC_ROOT = join(__dirname, '..', '..', '..');

/**
 * The two references this file detects, ASSEMBLED FROM PARTS RATHER THAN WRITTEN
 * OUT — the same fragility the DEBUG-370 sibling documents, and it bites harder
 * here because DEBUG-387 sweeps BOTH forms. A repo-wide find-and-replace of
 * either literal would otherwise rewrite this detector into one that searches for
 * the replacement and then passes for the wrong reason, catching nothing.
 */
const RAW_REF = `colorSystem.base.${'black'}`;
const RAW_HEX = `#1C1C1${'C'}`;

/**
 * The complete set of raw `colorSystem.base.black` references permitted to remain
 * in non-test source, each with the reason it is lawful.
 *
 * EXACT-SET, NOT A CEILING — compared in BOTH directions, so a new raw reference
 * fails (regression) and a vanished entry also fails (the allowlist has gone stale
 * and stopped describing the tree).
 *
 * It closes the alias hole for free, exactly as the DEBUG-370 sibling does: a local
 * re-export such as `const localColors = { black: colorSystem.base.black }` — the
 * shape that hid 14 downstream text sites behind ONE grep hit in `OnboardingScreen`
 * — is itself a raw reference on its declaration line, so it surfaces here and
 * fails set equality. No separate alias rule is needed.
 *
 * NOTE THE ASYMMETRY WITH `RAW_HEX`, WHICH HAS NO ALLOWLIST AND IS A HARD ZERO.
 * The alias closure above works only because an alias declaration is *itself* a
 * token reference. `black: '#1C1C1C'` is not — it is invisible to any
 * `colorSystem.base.black` scanner, which is why three such declarations survived
 * every previous audit. The palette's own definition of the value lives in the
 * `@mp2ez/being-design-system` package, outside this tree, so no source file under
 * `app/src` has a lawful reason to spell the hex out. CLAUDE.md forbids hardcoded
 * hex independently.
 */
const ALLOWED: ReadonlyArray<{ file: string; property: string; reason: string }> = [
  {
    file: 'core/theme/colors.ts',
    property: 'primary',
    reason:
      'The token DEFINITION itself — `semantic.text.primary: colorSystem.base.black`. This is ' +
      'the one site that must read the raw value; it is what every swept call site now points ' +
      'at, and it is the seam a future re-point of the primary text ramp would move.',
  },
  {
    file: 'features/insights/components/DotCalendar.tsx',
    property: 'shadowColor',
    reason:
      'A drop SHADOW, not text. WCAG 1.4.11 exempts purely decorative elements outright, so no ' +
      'contrast bar applies, and the text ramp is governed by 1.4.3 at 4.5:1 — a different ' +
      'criterion. Re-pointing it onto a text token would make a future text-ramp move silently ' +
      'repaint a non-text element.',
  },
  {
    file: 'features/insights/components/PrincipleEngagementChart.tsx',
    property: 'shadowColor',
    reason:
      'Drop shadow, decorative — same reasoning as DotCalendar above. Purely decorative under ' +
      'WCAG 1.4.11; belongs to no text ramp and must not follow one.',
  },
  {
    file: 'features/insights/components/WellnessScreeningTrends.tsx',
    property: 'shadowColor',
    reason:
      'Drop shadow, decorative — same reasoning as DotCalendar above. Purely decorative under ' +
      'WCAG 1.4.11; belongs to no text ramp and must not follow one.',
  },
];

/** Directory names never scanned. */
const SKIPPED_DIRS = new Set(['__tests__', '__mocks__', 'node_modules']);

const isTestFile = (name: string) =>
  name.includes('.test.') || name.includes('.spec.') || name.endsWith('.d.ts');

const isSourceFile = (name: string) =>
  (name.endsWith('.ts') || name.endsWith('.tsx')) && !isTestFile(name);

/** Every non-test source file under `app/src`. */
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
 * Prose naming the token is not a use of it — `colors.ts` discusses `#1C1C1C` at
 * length in the DEBUG-380 rationale block, and this file's own header would
 * otherwise trip the scan it defines.
 */
const isCommentLine = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);

/** Best-effort syntactic label, used only to make a failure legible. */
const propertyOf = (line: string, ref: string): string => {
  const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const objectKey = new RegExp(`(\\w+)\\s*:\\s*['"]?${escaped}`).exec(line);
  if (objectKey) return objectKey[1];
  const jsxProp = new RegExp(`(\\w+)=\\{${escaped}`).exec(line);
  if (jsxProp) return jsxProp[1];
  if (new RegExp(`return\\s+${escaped}`).test(line)) return 'return';
  return 'unknown';
};

interface Reference {
  file: string;
  line: number;
  property: string;
}

const scan = (ref: string): { files: string[]; refs: Reference[] } => {
  const files = collectSourceFiles(SRC_ROOT);
  const refs: Reference[] = [];
  for (const full of files) {
    const text = readFileSync(full, 'utf8');
    if (!text.includes(ref)) continue;
    text.split('\n').forEach((line, i) => {
      if (!line.includes(ref) || isCommentLine(line)) return;
      refs.push({
        file: relative(SRC_ROOT, full).split(sep).join('/'),
        line: i + 1,
        property: propertyOf(line, ref),
      });
    });
  }
  return { files, refs };
};

describe('DEBUG-387: raw base.black survives only where it is lawful', () => {
  const { files, refs } = scan(RAW_REF);

  it('actually scanned the tree (guards against a silently empty scan)', () => {
    // The set-equality assertion below is SILENTLY GREEN if the walker returns
    // nothing — exactly what a moved directory or a broken join() produces. A scan
    // that finds no files would "prove" the sweep complete while proving nothing.
    expect(existsSync(SRC_ROOT)).toBe(true);
    expect(files.length).toBeGreaterThan(200);

    // And prove it reaches BOTH trees the sweep spans, not just the nearest one —
    // a walker that silently stopped at core/ would still clear the count above.
    const scanned = files.map((f) => relative(SRC_ROOT, f).split(sep).join('/'));
    expect(scanned).toContain('core/navigation/CleanTabNavigator.tsx');
    expect(scanned).toContain('features/onboarding/screens/OnboardingScreen.tsx');
  });

  it('leaves exactly the allowlisted references, no more and no fewer', () => {
    const found = refs.map((r) => `${r.file}:${r.property}`).sort();
    const allowed = ALLOWED.map((a) => `${a.file}:${a.property}`).sort();

    // Full sorted lists rather than counts, so a failure NAMES the offending site
    // instead of reporting "expected 4, received 5".
    expect(found).toEqual(allowed);
  });

  it('no raw reference sits in a text position', () => {
    // The assertion carrying the accessibility meaning. `color` is governed by WCAG
    // 1.4.3 at 4.5:1; shadows and fills are 1.4.11 at 3:1, a different criterion.
    // Zero text-position exemptions exist, so this is a hard zero.
    const offenders = refs
      .filter((r) => r.property === 'color' || r.property === 'placeholderTextColor')
      .map((r) => `${r.file}:${r.line}`);

    expect(offenders).toEqual([]);
  });

  it('every allowlist entry records why that reference is lawful', () => {
    // An entry without a reason is an undocumented exemption — the failure mode
    // that turns a pin back into tribal knowledge.
    for (const entry of ALLOWED) {
      expect(entry.reason.length).toBeGreaterThan(40);
    }
  });
});

describe('DEBUG-387: the raw #1C1C1C literal is a hard zero in source', () => {
  const { refs } = scan(RAW_HEX);

  it('appears in no non-comment source line', () => {
    // No allowlist by design — see the RAW_HEX note above. The palette owns this
    // value in the design-system package, outside this tree, and CLAUDE.md forbids
    // hardcoded hex independently. Three `black: '#1C1C1C'` alias declarations
    // survived every prior audit precisely because they are invisible to a
    // `colorSystem.base.black` scanner; this describe block is what closes that.
    const offenders = refs.map((r) => `${r.file}:${r.line} (${r.property})`);
    expect(offenders).toEqual([]);
  });
});
