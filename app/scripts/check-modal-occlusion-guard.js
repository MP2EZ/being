#!/usr/bin/env node
/**
 * Mechanical pin against RN `<Modal>` occluding the root crisis button
 * (DEBUG-406).
 *
 * WHAT THIS ENFORCES
 * ==================
 * No JSX `<Modal>` may appear anywhere under `app/src` except the files in
 * ALLOWLIST below, each of which carries a recorded ruling explaining why.
 *
 * WHY
 * ===
 * React Native's `<Modal>` renders in a SEPARATE NATIVE WINDOW above the JS view
 * hierarchy. `RootCrisisButton` mounts inside `NavigationContainer`, so while any
 * RN `<Modal>` is open the crisis button is not dimmed, not faded, not behind
 * something — it is NOT ON SCREEN. The governing invariant, stated at
 * `RootCrisisButton.tsx` and enforced by
 * `__tests__/safety/crisis-zero-988-windows.test.tsx`, is that no reachable
 * render state may have zero 988 affordance. A `<Modal>` produces exactly that
 * state, for as long as it is open.
 *
 * WHY A MECHANICAL PIN AND NOT REVIEW OR A PROTECTED PATH
 * =======================================================
 * This defect class has now been found three times by hand and never once by the
 * tooling:
 *   • DEBUG-396 discovered it while establishing that a CONTRAST fix could not
 *     reach it — a different defect class entirely.
 *   • DEBUG-403 fixed the immersive case and scoped four standard-route sites out
 *     BY ANALOGY, without individually verifying any of them.
 *   • DEBUG-406 audited those four and found three of them wrong.
 *
 * A Protected Paths row would not have caught any of it. `src/core/components/`
 * and `src/features/insights/` are not on that list and should not be — the risk
 * is not a directory, it is a COMPONENT SHAPE that can appear in any directory.
 * CLAUDE.md already documents this exact failure twice: `features/guidance/`
 * (a safety gate in a brand-new dir matching no pattern) and `features/consent/`
 * (DEBUG-390's fix file matched nothing; the safety gate fired only because the
 * same branch happened to also touch a `.maestro` flow).
 *
 * The allowlist is therefore the AUDIT TRAIL as well as the escape hatch: every
 * surviving `<Modal>` in the app is here, with the reason it survives. Rule 2
 * fails on a STALE entry too, so converting a file away from `<Modal>` forces the
 * record to be updated rather than quietly outliving its justification — which is
 * how DEBUG-403's four-site ruling went stale in the first place.
 *
 * WHY COMMENTS ARE STRIPPED FIRST
 * ===============================
 * This codebase deliberately NAMES anti-patterns in prose to warn the next reader
 * off them — `HapticsOptInPrompt` says "Never convert this to <Modal>",
 * `ReConsentScreen` lists `<Modal>` among the things forbidden on that screen,
 * and `RootCrisisButton` explains the mechanism at length. A guard that counted
 * those would fire on the very comments written to prevent the defect. Same
 * lesson as DEBUG-390, and the same fix: strip block and line comments, match on
 * code only. The unit test asserts the matcher still fires against a literal
 * known-bad string, so comment-stripping cannot silently reduce this to a guard
 * that matches nothing.
 *
 * WHAT THIS DOES NOT COVER
 * ========================
 * • `Alert.alert` — also native, also above the JS hierarchy, and also capable of
 *   occluding the button. `ReConsentScreen` forbids it for that reason. It is out
 *   of scope here only because it has no JSX shape to match; a separate pin would
 *   need call-site analysis.
 * • Navigation `presentation: 'modal'` / `'transparentModal'` routes. These are
 *   NOT an occlusion class: the root stack is a JS stack and `RootCrisisButton`
 *   is a later sibling of the whole navigator, so a modally-presented screen
 *   renders BENEATH it. Verified in DEBUG-406 and documented at `ReConsentScreen`.
 * • An aliased import (`import { Modal as Sheet }`). Rule 3 catches the aliasing
 *   itself, which is the only way to reach it.
 * • Test files, which are excluded — they legitimately reference the shape in
 *   order to assert its absence.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(APP_ROOT, 'src');

/**
 * Files permitted to render an RN `<Modal>`, each with the ruling that permits
 * it. Adding an entry is a safety decision and belongs in a work item, not in a
 * drive-by edit.
 */
const ALLOWLIST = {
  'src/core/components/NotificationTimePicker.tsx':
    'DEBUG-406 — ruling: the <Modal> exception STANDS here, and it stands on this ' +
    "site's own facts rather than on its route class. The surface carries zero " +
    'wellness or distress semantics (a mode="time" spinner and a Cancel/Done ' +
    'header), its exits are fixed and non-scrolling, and it is the only one of the ' +
    'four where the <Modal> is iOS-only — Android renders a native OS dialog that ' +
    'no RN change can put the crisis button above, so converting would split ' +
    'platform behaviour for a reminder-time setting. THE RULING IS CONDITIONAL: it ' +
    'stands BECAUSE the content is benign. If this picker ever gains wellness ' +
    'framing — a mood check-in reminder, an assessment-due nudge, any copy ' +
    'referencing the user\'s state — the ruling is void and it converts.',

  'src/core/components/CelebrationToast.tsx':
    'DEBUG-403 / DEBUG-406 — dead code, not an exception. Verified to have zero ' +
    'JSX mount sites across BOTH test roots (app/src and app/__tests__) and ' +
    'supabase/functions; it appears only in prose. It was listed in ' +
    "RootCrisisButton's exception comment as though live and was struck from it. " +
    'Deleting the component is tracked as separate cleanup; until then it is ' +
    'allowlisted so this guard stays green, NOT because a <Modal> here would be ' +
    'acceptable if it were ever mounted.',
};

/** JSX usage of the component, e.g. `<Modal`, `<Modal>`, `<Modal\n`. */
const MODAL_JSX_RE = /<Modal(?=[\s/>])/g;

/** `Modal` pulled out of react-native under a different local name. */
const ALIASED_IMPORT_RE = /\bModal\s+as\s+(\w+)/g;

/**
 * Blank out comments while preserving offsets and line structure, so a match's
 * line number still points at real code.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

/** Line numbers (1-indexed) of every JSX `<Modal` in a source string. */
function findModalJsx(src) {
  const stripped = stripComments(src);
  const lines = [];
  let match;
  MODAL_JSX_RE.lastIndex = 0;
  while ((match = MODAL_JSX_RE.exec(stripped)) !== null) {
    lines.push(stripped.slice(0, match.index).split('\n').length);
  }
  return lines;
}

/** Local names that `Modal` was aliased to, if any. */
function findAliasedModalImports(src) {
  const stripped = stripComments(src);
  const names = [];
  let match;
  ALIASED_IMPORT_RE.lastIndex = 0;
  while ((match = ALIASED_IMPORT_RE.exec(stripped)) !== null) {
    names.push(match[1]);
  }
  return names;
}

/** Recursively collect shipping .ts/.tsx sources, excluding tests. */
function collectSourceFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      collectSourceFiles(full, acc);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const toRel = (abs) => path.relative(APP_ROOT, abs).split(path.sep).join('/');

/**
 * Run every rule against the real tree.
 * @returns {{unallowed: Array, stale: Array, aliased: Array}}
 */
function runGuard(srcRoot = SRC_ROOT) {
  const files = collectSourceFiles(srcRoot);
  const unallowed = [];
  const aliased = [];
  const seenWithModal = new Set();

  for (const abs of files) {
    const rel = toRel(abs);
    const src = fs.readFileSync(abs, 'utf8');

    const jsxLines = findModalJsx(src);
    if (jsxLines.length > 0) {
      seenWithModal.add(rel);
      if (!Object.prototype.hasOwnProperty.call(ALLOWLIST, rel)) {
        unallowed.push({ file: rel, lines: jsxLines });
      }
    }

    const aliases = findAliasedModalImports(src);
    if (aliases.length > 0) {
      aliased.push({ file: rel, aliases });
    }
  }

  // Rule 2 — an allowlist entry whose file no longer renders a <Modal> is a
  // recorded ruling that has outlived its subject. Fail so the record is updated
  // rather than silently preserved.
  const stale = Object.keys(ALLOWLIST).filter((rel) => !seenWithModal.has(rel));

  return { unallowed, stale, aliased };
}

function main() {
  const { unallowed, stale, aliased } = runGuard();
  let failed = false;

  if (unallowed.length > 0) {
    failed = true;
    console.error('\n✖ RN <Modal> found outside the allowlist.\n');
    console.error(
      "  An RN <Modal> renders in a separate native window above the JS view\n" +
      "  hierarchy, so while it is open the root crisis button is not on screen\n" +
      "  at all — a zero-988-affordance render state (DEBUG-403 / DEBUG-406).\n\n" +
      "  Use a full-bleed absolute overlay instead. Reference implementations:\n" +
      "    src/features/practices/shared/components/ResumeSessionModal.tsx\n" +
      "    src/features/practices/shared/components/HapticsOptInPrompt.tsx\n" +
      "  Geometry constants: src/features/crisis/constants/crisisButtonGeometry.ts\n",
    );
    for (const { file, lines } of unallowed) {
      console.error(`    ${file}:${lines.join(',')}`);
    }
    console.error(
      "\n  If this <Modal> is genuinely correct, it needs a RULING recorded in\n" +
      "  ALLOWLIST in scripts/check-modal-occlusion-guard.js — citing that site's\n" +
      "  own facts, not its route class. That is the standard DEBUG-406 applied.\n",
    );
  }

  if (stale.length > 0) {
    failed = true;
    console.error('\n✖ Stale allowlist entry — the file no longer renders a <Modal>.\n');
    for (const file of stale) {
      console.error(`    ${file}`);
    }
    console.error(
      "\n  Remove the entry from ALLOWLIST. The allowlist is the audit trail of\n" +
      "  every surviving <Modal> in the app; an entry that outlives its subject is\n" +
      "  how a stale ruling survives review — exactly what DEBUG-406 was filed to\n" +
      "  undo.\n",
    );
  }

  if (aliased.length > 0) {
    failed = true;
    console.error('\n✖ `Modal` imported under an alias — this defeats the guard.\n');
    for (const { file, aliases } of aliased) {
      console.error(`    ${file} → ${aliases.join(', ')}`);
    }
    console.error('');
  }

  if (failed) {
    process.exit(1);
  }

  console.log('✓ No unallowed RN <Modal> in app/src; allowlist is current.');
}

if (require.main === module) {
  main();
}

module.exports = {
  ALLOWLIST,
  APP_ROOT,
  SRC_ROOT,
  collectSourceFiles,
  findAliasedModalImports,
  findModalJsx,
  runGuard,
  stripComments,
};
