#!/usr/bin/env node
/**
 * MAINT-437 — no `SafeAreaView` may come from the `react-native` core export.
 *
 * WHY A SCRIPT AS WELL AS AN ESLINT RULE. They are complementary, not redundant, and
 * the ESLint rule cannot be made to cover what this does:
 *   - `SafeAreaView: RN.SafeAreaView` in a `jest.mock('react-native', …)` factory is an
 *     object property, not an import node. `no-restricted-imports` structurally cannot
 *     see it, in any file, under any glob.
 *   - Both mock-table sites live in `.js` files under `__tests__/`, and `eslint.config.js`
 *     has no config object matching `.js` at all. Worse, widening coverage via the `lint`
 *     npm script would be INERT: `scripts/lint-baseline.js` hardcodes
 *     `eslint src --ext .ts,.tsx`, and ci.yml runs `lint:baseline`, never `lint`.
 * So: ESLint owns AST-accurate enforcement over `src/**`; this owns text-accurate
 * enforcement over BOTH test roots and over `.js`.
 *
 * WHY IT MATTERS. RN's `SafeAreaView` is iOS-only — on Android it renders a plain View
 * applying zero insets — and Expo SDK 56 makes Android edge-to-edge mandatory and
 * non-disableable. A regression here is a silent Android layout defect, not just a
 * deprecation warning.
 */

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const SCAN_ROOTS = ['src', '__tests__'];
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const SKIP_DIRS = new Set(['node_modules', 'coverage', '__snapshots__', '.git']);

/**
 * This guard's OWN meta-test, and nothing else. It has to hold known-bad literals in
 * order to prove the matcher still fires, so scanning it would make the check
 * permanently red against correct code.
 *
 * Note the sibling guard (check-crisis-dial-guard.js:210) sidesteps this by skipping
 * `__tests__` entirely. That is not available here: AC1 requires scanning both test
 * roots, because two of the ten sites this item removed lived in `__tests__/setup/`.
 * So the exclusion is one named file, and the meta-test asserts the list stays length 1
 * — a carve-out that can grow is how a guard quietly stops guarding.
 */
const SELF_EXCLUDE = ['__tests__/scripts/check-safe-area-imports.test.js'];

/**
 * Copied VERBATIM from scripts/check-crisis-dial-guard.js. Two properties are
 * load-bearing and easy to lose in a paraphrase: the `(^|[^:])` guard means `https://`
 * is not eaten as a line comment, and it BLANKS rather than deletes, so line numbers
 * survive into the error messages.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

/**
 * (A) import / re-export from the core module. `[^}]` matches newlines, so multi-line
 * specifier blocks are caught without the `s` flag — which matters: 6 of the 8 source
 * sites this item migrated were multi-line, and a line-based grep misses every one.
 */
const RE_IMPORT =
  /(?:import|export)\s*(?:type\s+)?\{[^}]*\bSafeAreaView\b[^}]*\}\s*from\s*['"]react-native['"]/g;

/** (B) namespace member access — `RN.SafeAreaView`, `require('react-native').SafeAreaView`. */
const RE_NAMESPACE = /\b(?:RN|ReactNative)\.SafeAreaView\b/g;
const RE_REQUIRE = /require\(\s*['"]react-native['"]\s*\)\s*\.\s*SafeAreaView/g;

/**
 * (C) mock-table property, scoped to files that actually mock `react-native`.
 *
 * The scoping is what makes this precise rather than reckless. A bare
 * /SafeAreaView\s*:/ cannot tell `SafeAreaView: RN.SafeAreaView` (banned) from
 * `SafeAreaView: SafeAreaViewMock` in the safe-area-context factory (required) — the
 * same literal shape, a few hundred lines apart in the SAME file. So only the
 * `react-native` factory's own text is searched.
 */
const RE_MOCK_RN_FACTORY = /jest\.mock\(\s*['"]react-native['"]\s*,[\s\S]*?\n\}\)/g;
const RE_MOCK_PROP = /\bSafeAreaView\s*:/g;

function lineOf(src, index) {
  return src.slice(0, index).split('\n').length;
}

/** Violations in one source string. Exported so the meta-test can drive fixtures. */
function findViolationsInSource(src, relPath = '<fixture>') {
  const clean = stripComments(src);
  const out = [];
  const push = (re, why, haystack = clean, offset = 0) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(haystack)) !== null) {
      out.push({ file: relPath, line: lineOf(clean, m.index + offset), why });
    }
  };

  push(RE_IMPORT, "SafeAreaView imported/re-exported from 'react-native'");
  push(RE_NAMESPACE, 'SafeAreaView read off the react-native namespace');
  push(RE_REQUIRE, "SafeAreaView read off require('react-native')");

  RE_MOCK_RN_FACTORY.lastIndex = 0;
  let factory;
  while ((factory = RE_MOCK_RN_FACTORY.exec(clean)) !== null) {
    push(RE_MOCK_PROP, "SafeAreaView exposed by a jest.mock('react-native') factory", factory[0], factory.index);
  }

  return out;
}

function walk(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), acc);
    } else if (EXTS.has(path.extname(entry.name))) {
      acc.push(path.join(dir, entry.name));
    }
  }
  return acc;
}

function collectViolations() {
  const files = [];
  for (const root of SCAN_ROOTS) {
    const abs = path.join(APP_ROOT, root);
    if (fs.existsSync(abs)) walk(abs, files);
  }
  const violations = [];
  let scanned = 0;
  for (const f of files) {
    const rel = path.relative(APP_ROOT, f);
    if (SELF_EXCLUDE.includes(rel)) continue;
    scanned += 1;
    violations.push(...findViolationsInSource(fs.readFileSync(f, 'utf8'), rel));
  }
  return { violations, filesScanned: scanned };
}

if (require.main === module) {
  const { violations, filesScanned } = collectViolations();
  if (violations.length === 0) {
    console.log(`✅ no core-export SafeAreaView imports (${filesScanned} files scanned)`);
    process.exit(0);
  }
  console.error(`❌ ${violations.length} core-export SafeAreaView usage(s):\n`);
  for (const v of violations) console.error(`   ${v.file}:${v.line} — ${v.why}`);
  console.error(`\n   Import from 'react-native-safe-area-context' and pass an explicit`);
  console.error(`   \`edges\` prop. RN core's SafeAreaView is iOS-only and applies zero`);
  console.error(`   insets on Android, where SDK 56 makes edge-to-edge mandatory.`);
  process.exit(1);
}

module.exports = {
  APP_ROOT,
  SCAN_ROOTS,
  SELF_EXCLUDE,
  stripComments,
  findViolationsInSource,
  collectViolations,
};
