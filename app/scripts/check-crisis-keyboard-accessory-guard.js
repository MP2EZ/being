#!/usr/bin/env node
/**
 * DEBUG-506 — no screen may render a bare <TextInput>; they render <CrisisTextInput>.
 *
 * THE POLARITY IS INVERTED FROM DEBUG-450's VERSION, AND THAT IS THE POINT. This guard
 * used to assert that every <TextInput> carried `crisisAccessoryProps()`. It passed
 * continuously while the affordance those props named was INERT: attachment happens once,
 * in `didMoveToWindow`, by a depth-first search of the window
 * (`RCTInputAccessoryComponentView.mm:66-82`), and the single app-root mount ran that
 * search at launch when no input existed. The old guard verified the half of the contract
 * that is a static property of one file, and the half that failed lived in native mount
 * ordering. A prop naming an accessory that never attaches is not 988 access.
 *
 * So the checkable unit is now the PAIRING, not the prop. `CrisisTextInput` renders the
 * input and its own accessory from one mount with a per-instance id, which is what makes
 * attachment possible at all; this guard's whole job is to make that component
 * unavoidable. Two rules follow, and both are file-level because the pairing is:
 *
 *   1. No bare `<TextInput` outside the one file allowed to render it.
 *   2. `inputAccessoryViewID=` appears in exactly that same file — a second occurrence is
 *      a hand-rolled second wiring path, which is how the shared-id collision returns.
 *
 * Its old header claimed "this prop cannot be centralised the same way [as the root
 * button], because RN requires the id on each input." The id is still per-input; what was
 * wrong is the conclusion that a call site must therefore supply it. A component can own
 * a per-instance id, and this one does.
 *
 * The allowlist + stale-entry design is reused verbatim: a recorded ruling that outlives
 * its subject is how DEBUG-406 describes a stale exemption surviving review.
 *
 * Exit 0 when both rules hold; exit 1 otherwise.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(APP_ROOT, 'src');

/**
 * The single file permitted to render a bare <TextInput>.
 *
 * It is the composite itself. Nothing else may render one, because a bare input is one
 * that ships with no crisis affordance behind its keyboard.
 */
const COMPOSITE = 'src/features/crisis/components/CrisisTextInput.tsx';

/**
 * Both ways an input can be bound to an accessory: the raw RN prop, and the helper that
 * produces it. Either one at a call site is a second wiring path, and a second path is
 * how the shared id — and the first-match collision behind it — comes back.
 *
 * Matching only the raw prop would be VACUOUS here, because the composite itself uses the
 * helper and never writes the prop literally: rule 2 would then hold trivially across a
 * tree in which nothing named either, and would keep holding if a call site started
 * calling the helper directly.
 */
const ACCESSORY_ID_MARKERS = [/inputAccessoryViewID\s*=/, /crisisAccessoryProps\s*\(/];

/**
 * Files allowed to name those markers: the composite that consumes them, and the module
 * that defines them. Neither renders a screen.
 */
const WIRING_OWNERS = new Set([
  COMPOSITE,
  'src/features/crisis/constants/crisisInputAccessory.ts',
]);

/**
 * Files allowed to render a bare <TextInput> anyway, each with a recorded ruling.
 *
 * READ THIS BEFORE ADDING AN ENTRY — its meaning changed with the polarity. Under the old
 * guard an entry meant "this input is wired some other way". It now means: **this input
 * ships with NO crisis affordance while its keyboard is up.** That is a crisis ruling, not
 * a wiring note, and it needs the `crisis` agent's sign-off in the entry.
 *
 * Rule 3 below fails when an entry's file no longer renders a bare <TextInput>, so a
 * ruling cannot outlive its subject.
 */
const ALLOWLIST = {
  // (empty — every live input is a CrisisTextInput. Add entries with a written ruling.)
};

/** Blank comments while preserving offsets, so reported line numbers stay true. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

/**
 * Span of a JSX opening tag's attributes, starting at the index of `<`.
 *
 * Walks forward tracking brace depth and string literals so a `>` inside an expression
 * (`style={{ a: b > c }}`) or a string does not end the tag early. Returns null if the
 * tag never closes, which a caller must treat as unparsed rather than as wired.
 */
function openingTagSpan(src, startIdx) {
  let depth = 0;
  let quote = null;
  for (let i = startIdx; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === quote && src[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') { depth += 1; continue; }
    if (ch === '}') { depth -= 1; continue; }
    if (ch === '>' && depth === 0) return src.slice(startIdx, i + 1);
  }
  return null;
}

/**
 * Every bare JSX `<TextInput` site in a source string.
 *
 * The lookahead is what keeps `<CrisisTextInput` out: the regex anchors on `<` followed
 * immediately by `TextInput`, so the composite's own tag never matches. Comments are
 * blanked first — under this polarity a prose mention would be a false FAIL, which is the
 * safe direction but still noise, and this repo names `TextInput` in prose constantly.
 */
function findTextInputSites(src) {
  const stripped = stripComments(src);
  const sites = [];
  const re = /<TextInput(?=[\s/>])/g;
  let match;
  while ((match = re.exec(stripped)) !== null) {
    sites.push({ line: stripped.slice(0, match.index).split('\n').length });
  }
  return sites;
}

/** Lines binding an input to an accessory, by either path, comments excluded. */
function findAccessoryIdSites(src) {
  const stripped = stripComments(src);
  const sites = [];
  for (const marker of ACCESSORY_ID_MARKERS) {
    const re = new RegExp(marker.source, 'g');
    let match;
    while ((match = re.exec(stripped)) !== null) {
      sites.push({ line: stripped.slice(0, match.index).split('\n').length });
    }
  }
  return sites.sort((a, b) => a.line - b.line);
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
 * @returns {{bare: Array, strayIds: Array, stale: Array, scanned: number}}
 *   `scanned` exists so a caller can prove the walk was not vacuous. An inverted guard
 *   reports success by finding NOTHING, so a scan that silently covered zero files is
 *   indistinguishable from a clean tree — the failure mode the old polarity did not have.
 */
function runGuard(srcRoot = SRC_ROOT) {
  const files = collectSourceFiles(srcRoot);
  const bare = [];
  const strayIds = [];
  const seenWithTextInput = new Set();

  for (const abs of files) {
    const rel = toRel(abs);
    const src = fs.readFileSync(abs, 'utf8');

    // Rule 2 — the accessory id is the composite's own invariant. Anywhere else it is a
    // hand-rolled second wiring path, and a second path is how a shared id returns.
    if (!WIRING_OWNERS.has(rel)) {
      const ids = findAccessoryIdSites(src);
      if (ids.length > 0) strayIds.push({ file: rel, lines: ids.map((s) => s.line) });
    }

    // Rule 1 — no bare <TextInput> outside the composite.
    const sites = findTextInputSites(src);
    if (sites.length === 0) continue;
    seenWithTextInput.add(rel);
    if (rel === COMPOSITE) continue;
    if (Object.prototype.hasOwnProperty.call(ALLOWLIST, rel)) continue;

    bare.push({ file: rel, lines: sites.map((s) => s.line) });
  }

  // Rule 3 — an allowlist entry whose file no longer renders a <TextInput> is a recorded
  // ruling that has outlived its subject. Fail so the record is updated, not preserved.
  const stale = Object.keys(ALLOWLIST).filter((rel) => !seenWithTextInput.has(rel));

  return { bare, strayIds, stale, scanned: files.length };
}

function main() {
  const { bare, strayIds, stale, scanned } = runGuard();
  let failed = false;

  // A guard that passes by finding nothing must prove it looked. Zero scanned files is a
  // broken walk reported as a clean tree.
  if (scanned === 0) {
    console.error('\n❌ DEBUG-506: the guard scanned ZERO files — the walk is broken.\n');
    process.exit(1);
  }

  if (bare.length > 0) {
    failed = true;
    console.error('\n❌ DEBUG-506: bare <TextInput> sites (no crisis keyboard accessory):\n');
    for (const { file, lines } of bare) console.error(`     ${file}:${lines.join(',')}`);
    console.error(
      '\n  While a software keyboard is up the root crisis button is inside the keyboard\n' +
        "  window and unreachable, so a bare TextInput has NO 988 access. A prop alone is\n" +
        '  not enough — the accessory only attaches when it shares ONE mount with its\n' +
        '  input, which is what CrisisTextInput is for. Convert the site:\n\n' +
        "      import { CrisisTextInput } from '@/features/crisis/components/CrisisTextInput';\n" +
        '      <CrisisTextInput … />   // same props, same ref, plus its own accessory\n\n' +
        '  If a site genuinely must ship with no crisis affordance behind its keyboard,\n' +
        '  add the FILE to ALLOWLIST with a written ruling signed off by `crisis`.\n',
    );
  }

  if (strayIds.length > 0) {
    failed = true;
    console.error('\n❌ DEBUG-506: inputAccessoryViewID named outside the composite:\n');
    for (const { file, lines } of strayIds) console.error(`     ${file}:${lines.join(',')}`);
    console.error(
      `\n  Only ${COMPOSITE} (and the module defining it) may name these. A second wiring\n` +
        '  path is how the shared id —\n' +
        '  and with it the first-match collision that leaves every input but one\n' +
        '  uncovered — comes back. Render CrisisTextInput instead.\n',
    );
  }

  if (stale.length > 0) {
    failed = true;
    console.error('\n❌ DEBUG-506: ALLOWLIST entries whose file renders no <TextInput>:\n');
    for (const file of stale) console.error(`     ${file}`);
    console.error(
      '\n  Remove the entry. The allowlist is the audit trail of deliberate\n' +
        '  exemptions; an entry with no subject is how a stale ruling survives review.\n',
    );
  }

  if (failed) process.exit(1);
  console.log(
    `✓ DEBUG-506: no bare <TextInput> outside the composite (${scanned} files scanned)`,
  );
}

if (require.main === module) main();

module.exports = {
  ACCESSORY_ID_MARKERS,
  ALLOWLIST,
  COMPOSITE,
  WIRING_OWNERS,
  collectSourceFiles,
  findAccessoryIdSites,
  findTextInputSites,
  openingTagSpan,
  runGuard,
  stripComments,
};
