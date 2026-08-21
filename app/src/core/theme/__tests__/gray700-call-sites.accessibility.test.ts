/**
 * MAINT-487 — the call-site pin for raw `colorSystem.gray[700]`.
 *
 * SAME SHAPE, ONE TOKEN UP, AND FOR THE SAME REASON as its sibling
 * `gray600-call-sites.accessibility.test.ts` (DEBUG-370): the token pin in
 * `theme-contrast.accessibility.test.ts` asserts VALUES against a surface list and
 * is structurally blind to a call site that declines to use the token. That
 * blindness is not hypothetical here — MAINT-471 re-pointed `semantic.text.secondary`
 * and `.muted` from gray[700] to gray[650] and the whole accessibility suite stayed
 * green while 56 raw text sites kept rendering the old value.
 *
 * WHAT MAKES THIS TOKEN DIFFERENT FROM gray[600], AND WHY THE PIN IS WORTH MORE HERE.
 * gray[600] failed AA on every non-white surface, so its sweep fixed a live defect and
 * the pin guards a contrast floor. gray[700] fails nothing — 8.202:1 on gray[300], the
 * darkest enumerated ground. Nothing regressed when these sites drifted, and nothing
 * WILL. What the pin guards is HIERARCHY CONSISTENCY: before MAINT-471 the raw value and
 * the token were byte-identical, so the bypass was invisible by construction and
 * accumulated to 60 references. A guard that only fires on contrast could never have
 * caught that, because there was nothing to catch until the token moved.
 *
 * So the failure mode this file exists for is a FUTURE token move, not a present
 * failure: the next time `semantic.text.*` is re-pointed, the sites that bypassed it
 * are named here rather than discovered a release later.
 *
 * FILE PATH IS LOAD-BEARING, NOT STYLISTIC. `npm run test:accessibility` is
 * `jest --testPathPattern=accessibility`, so the FILENAME must contain "accessibility"
 * or this never runs; and jest.config.js's `src/**\/__tests__/**\/*` pattern is what
 * makes a file in this directory match testMatch at all.
 *
 * WHY A TEST AND NOT AN ESLINT RULE. DEBUG-370 settled this in writing for the
 * structurally identical sweep one token over, and gray[700] is MORE legal outside text
 * than gray[600] was: it is a lawful fill, border and badge ground, and it is the value
 * `severityBands.label` must read directly. A blanket `no-restricted-syntax` ban would
 * red-line correct code; a `Property[key.name="color"]` selector would miss both the
 * `return` inside `getPriorityColor` and the `localColors` alias. An exact-allowlist
 * test has neither problem — it names each survivor with the reason it is lawful.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

/** Repo-relative root of the scanned tree (`app/src`). */
const SRC_ROOT = join(__dirname, '..', '..', '..');

/**
 * The reference this file detects, ASSEMBLED FROM PARTS RATHER THAN WRITTEN OUT.
 *
 * Identical reasoning to the gray[600] pin, and identically load-bearing: this is the
 * one file in the repo that must contain the exact literal it forbids, so a repo-wide
 * find-and-replace of `colorSystem.gray[700]` — precisely the operation MAINT-487
 * performed — would otherwise rewrite the detector into one that searches for the
 * replacement token and then passes for the wrong reason while catching nothing.
 */
const RAW_REF = `colorSystem.gray[${700}]`;

/**
 * The complete set of raw `colorSystem.gray[700]` references permitted to remain in
 * non-test source, each with the reason it is lawful.
 *
 * EXACT-SET, NOT A CEILING. The assertion below compares this against the scan in BOTH
 * directions, which is what makes it a pin rather than a budget: a new raw reference
 * fails (regression), and an entry disappearing also fails (the allowlist has gone
 * stale and stopped describing the tree).
 *
 * It also closes the alias hole for free. A local re-export such as
 * `const localColors = { gray700: colorSystem.gray[700] }` — the shape that hid a
 * downstream site behind a single grep hit in `OnboardingScreen` — is itself a raw
 * reference on its declaration line, so it surfaces here and fails set equality.
 */
const ALLOWED: ReadonlyArray<{ file: string; property: string; reason: string }> = [
  {
    file: 'core/theme/colors.ts',
    property: 'fill',
    reason:
      '`severityBands.fill` — the neutral band FILL behind the wellness-screening trends ' +
      'chart, rendered at 0.04-0.16 alpha. Non-text by construction (WCAG 1.4.11, not ' +
      '1.4.3), and the value it composites toward is the whole point of the token.',
  },
  {
    file: 'core/theme/colors.ts',
    property: 'label',
    reason:
      '`severityBands.label` — the MAINT-471 documented exception, and the one site the ' +
      'surface matrix structurally cannot express. The label renders on the band fill ' +
      'alpha-composited onto the card, reaching #E6E6E6 and #E1E1E1 at the two deepest ' +
      'opacities — DARKER than gray[300], the binding ground for gray[650], where ' +
      'gray[650] measures 4.4647 and 4.2612 and is illegal BY CONSTRUCTION. Re-point ' +
      'only if a ramp value is ever legal on #E1E1E1; see the note at the site.',
  },
  {
    file: 'features/crisis/screens/CrisisResourcesScreen.tsx',
    property: 'return',
    reason:
      "`getPriorityColor()`'s 'normal' branch. NOT the priority badge: line 148 guards " +
      "that on priority 'emergency' | 'high', which return their own hues, so the badge " +
      'never sees this arm. Its one live consumer is line 205, the `backgroundColor` of ' +
      'the "Call Now" Pressable — a UI-component fill under a white label (10.0497), ' +
      'governed by 1.4.11 at 3:1, not by the text ramp. It is the bottom rung of the ' +
      "screen's four-step priority ladder (red / coral / orange / dark grey), which is " +
      'its only non-textual triage signal; moving it toward the mid-grey the body copy ' +
      'now uses would make the dial control and the prose share a value.',
  },
  {
    file: 'features/onboarding/screens/OnboardingScreen.tsx',
    property: 'gray700',
    reason:
      '`localColors.gray700`, an alias whose single consumer is a `borderColor` at line ' +
      '1659 — non-text, governed by 1.4.11 at 3:1. Kept as an alias rather than inlined ' +
      'so this pin keeps seeing it: the declaration line is the detector\'s only handle ' +
      'on the alias hole, and inlining would move the reference out of scan range.',
  },
  // The two BodyAreaGrid entries are the sweep's one genuine carve-out, and both
  // specialist passes reached them independently. They are TEXT — the only text sites
  // MAINT-487 declined to move — because the ground makes every token illegal.
  {
    file: 'features/practices/shared/components/BodyAreaGrid.tsx',
    property: 'noteText.color',
    reason:
      'Text on `themeColors.light` (line 153). `themes.*.light` are SATURATED ACCENT ' +
      'MID-TONES, not light surfaces: morning #FFB366, midday #5EC4BC, evening ' +
      '#6B9B78, learn #B89DD1. gray[700] measures 5.6910 / 4.8325 / 3.1513 / 4.2025 ' +
      'there — evening and learn ALREADY FAIL AA today — and gray[650] would take all ' +
      'four under at 3.1555 / 2.6795 / 1.7473 / 2.3302. No ramp neutral is legal on ' +
      '#6B9B78, so `themes.*.light` cannot be added to the surface matrix as a passing ' +
      'entry and the fix is the GROUND, not the text. Latent, not live: the default ' +
      'export has zero render consumers — every importer takes only `BODY_AREAS`. ' +
      'Sweeping here is the DEBUG-357 failure mode exactly, a mechanical swap onto a ' +
      'token producing a WORSE ratio on a ground no pin can see.',
  },
  {
    file: 'features/practices/shared/components/BodyAreaGrid.tsx',
    property: 'summaryText.color',
    reason:
      'Its own ground is white (`summarySection`), so this one site would have been ' +
      'safe to sweep alone. Held back deliberately: splitting the two inside one ' +
      'unrendered component buys nothing and would separate the entry from the ' +
      'ratio table that explains why its sibling cannot move. Sweep both when the ' +
      'component is revived or deleted, not before.',
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
 * A line is a comment if its FIRST non-space characters open or continue one. Prose
 * naming the token is not a use of it — and this codebase deliberately names
 * anti-patterns in prose to warn the next reader off them (DEBUG-390), so without this
 * the `severityBands.label` note and this file's own header would both trip the scan.
 */
const isCommentLine = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);

/**
 * Best-effort label for the syntactic position of a reference, used to make a failure
 * legible and to give the allowlist a stable key. The pass/fail decision is the
 * file+property pair.
 *
 * A BARE `color` IS NOT A USABLE KEY, which is where this diverges from the gray[600]
 * pin. Two `color:` reads in one file collapse to the same `file:color` string, so the
 * allowlist could not say WHICH of them it was excusing — and BodyAreaGrid has exactly
 * that shape, with one site lawful for a different reason than the other. `styleKeyOf`
 * below qualifies it with the enclosing StyleSheet key, so the allowlist names
 * `summaryText` and `noteText` individually.
 */
const propertyOf = (line: string): string => {
  const objectKey = new RegExp(`(\\w+)\\s*:\\s*${RAW_REF.replace(/[[\]]/g, '\\$&')}`).exec(line);
  if (objectKey) return objectKey[1];
  const jsxProp = new RegExp(`(\\w+)=\\{${RAW_REF.replace(/[[\]]/g, '\\$&')}\\}`).exec(line);
  if (jsxProp) return jsxProp[1];
  if (new RegExp(`return\\s+${RAW_REF.replace(/[[\]]/g, '\\$&')}`).test(line)) return 'return';
  return 'unknown';
};

interface Reference {
  file: string;
  line: number;
  property: string;
}

/** Opens an object literal keyed by an identifier, e.g. `  noteText: {`. */
const OPENS_STYLE_KEY = /^[ \t]*([A-Za-z0-9_]+)\s*:\s*\{/;

const scan = (): { files: string[]; refs: Reference[] } => {
  const files = collectSourceFiles(SRC_ROOT);
  const refs: Reference[] = [];
  for (const full of files) {
    const text = readFileSync(full, 'utf8');
    if (!text.includes(RAW_REF)) continue;
    let styleKey: string | null = null;
    text.split('\n').forEach((line, i) => {
      const opener = OPENS_STYLE_KEY.exec(line);
      if (opener) styleKey = opener[1];
      if (!line.includes(RAW_REF) || isCommentLine(line)) return;
      const property = propertyOf(line);
      refs.push({
        // POSIX-normalise so the allowlist reads the same on any platform.
        file: relative(SRC_ROOT, full).split(sep).join('/'),
        line: i + 1,
        // Qualify a bare `color` with its StyleSheet key so two text sites in one file
        // are distinguishable; leave every other position alone so the key stays the
        // thing a reader would actually call it.
        property: property === 'color' && styleKey ? `${styleKey}.color` : property,
      });
    });
  }
  return { files, refs };
};

describe('MAINT-487: raw gray[700] survives only where it is lawful', () => {
  const { files, refs } = scan();

  it('actually scanned the tree (guards against a silently empty scan)', () => {
    // The set-equality assertion below is SILENTLY GREEN if the walker returns nothing,
    // which is exactly what a moved directory or a broken join() produces. A scan that
    // finds no files would "prove" the sweep complete while proving nothing.
    expect(existsSync(SRC_ROOT)).toBe(true);
    expect(files.length).toBeGreaterThan(200);

    // And prove it reaches BOTH trees the allowlist spans, not just the nearest one —
    // a walker that silently stopped at core/ would still clear the count above.
    const scanned = files.map((f) => relative(SRC_ROOT, f).split(sep).join('/'));
    expect(scanned).toContain('core/theme/colors.ts');
    expect(scanned).toContain('features/crisis/screens/CrisisResourcesScreen.tsx');
  });

  it('detects a raw reference at all (guards against a matcher that fires on nothing)', () => {
    // DEBUG-390's second failure mode: a detector paired with comment-stripping can
    // silently match nothing and look exactly like a clean tree. Prove the two halves
    // still work against known-good and known-bad literals.
    expect(propertyOf(`  color: ${RAW_REF},`)).toBe('color');
    expect(propertyOf(`    return ${RAW_REF};`)).toBe('return');
    expect(isCommentLine(`   * do not use ${RAW_REF} for text`)).toBe(true);
    expect(isCommentLine(`  color: ${RAW_REF},`)).toBe(false);
  });

  it('leaves exactly the allowlisted references, no more and no fewer', () => {
    const found = refs.map((r) => `${r.file}:${r.property}`).sort();
    const allowed = ALLOWED.map((a) => `${a.file}:${a.property}`).sort();

    // Compare the full sorted lists rather than counts, so a failure NAMES the offending
    // site instead of reporting an arithmetic mismatch the reader has to chase.
    expect(found).toEqual(allowed);
  });

  it('gives every survivor a stated reason', () => {
    for (const entry of ALLOWED) {
      expect(entry.reason.length).toBeGreaterThan(40);
    }
  });
});
