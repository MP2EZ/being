#!/usr/bin/env node
/**
 * DEBUG-450 — every shipping <TextInput> must reach the crisis keyboard accessory.
 *
 * WHY A GUARD AND NOT A CODE REVIEW. The affordance is per-call-site: a TextInput that
 * omits `crisisAccessoryProps()` silently has no 988 access while its keyboard is up, and
 * nothing renders differently anywhere else. That is invisible in review and invisible in
 * every jest suite. MAINT-290 made the root button a single root mount precisely so a new
 * screen could not forget it; this prop cannot be centralised the same way, because RN
 * requires the id on each input. The guard is what replaces the single mount.
 *
 * HOW IT DIFFERS FROM check-modal-occlusion-guard.js, which it is otherwise modelled on.
 * That guard asks "does this file contain a <Modal>" — tag presence. This one must ask
 * "does THIS <TextInput> carry the prop" — attribute presence, per tag. A file-level
 * answer would pass a file whose first input is wired and whose second is not, which is
 * exactly the DailyLoopStepScreen shape (two sites, one of them inside a .map() factory).
 * So this scans each opening tag's own attribute span.
 *
 * The allowlist + stale-entry design IS reused verbatim: a recorded ruling that outlives
 * its subject is how DEBUG-406 describes a stale exemption surviving review.
 *
 * Exit 0 when every site is wired or allowlisted; exit 1 otherwise.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(APP_ROOT, 'src');

/** The prop spread that wires a TextInput to the accessory. */
const ACCESSORY_MARKERS = [/crisisAccessoryProps\s*\(/, /inputAccessoryViewID\s*=/];

/**
 * Sites deliberately NOT wired, each with a recorded ruling.
 *
 * An entry here is a safety decision, not a cleanup. Rule 2 below fails when an entry's
 * file no longer renders a bare <TextInput>, so a ruling cannot outlive its subject.
 */
const ALLOWLIST = {
  // (empty — every live TextInput is wired. Add entries with a written ruling.)
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

/** Every JSX `<TextInput` site in a source string, with its wiring verdict. */
function findTextInputSites(src) {
  const stripped = stripComments(src);
  const sites = [];
  const re = /<TextInput(?=[\s/>])/g;
  let match;
  while ((match = re.exec(stripped)) !== null) {
    const line = stripped.slice(0, match.index).split('\n').length;
    const span = openingTagSpan(stripped, match.index);
    const wired = span === null ? false : ACCESSORY_MARKERS.some((r) => r.test(span));
    sites.push({ line, wired, unparsed: span === null });
  }
  return sites;
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

/** @returns {{unwired: Array, stale: Array}} */
function runGuard(srcRoot = SRC_ROOT) {
  const files = collectSourceFiles(srcRoot);
  const unwired = [];
  const seenWithTextInput = new Set();

  for (const abs of files) {
    const rel = toRel(abs);
    const sites = findTextInputSites(fs.readFileSync(abs, 'utf8'));
    if (sites.length === 0) continue;

    seenWithTextInput.add(rel);
    if (Object.prototype.hasOwnProperty.call(ALLOWLIST, rel)) continue;

    const bad = sites.filter((s) => !s.wired);
    if (bad.length > 0) unwired.push({ file: rel, lines: bad.map((s) => s.line) });
  }

  // Rule 2 — an allowlist entry whose file no longer renders a <TextInput> is a recorded
  // ruling that has outlived its subject. Fail so the record is updated, not preserved.
  const stale = Object.keys(ALLOWLIST).filter((rel) => !seenWithTextInput.has(rel));

  return { unwired, stale };
}

function main() {
  const { unwired, stale } = runGuard();
  let failed = false;

  if (unwired.length > 0) {
    failed = true;
    console.error('\n❌ DEBUG-450: <TextInput> sites with no crisis keyboard accessory:\n');
    for (const { file, lines } of unwired) {
      console.error(`     ${file}:${lines.join(',')}`);
    }
    console.error(
      '\n  While a software keyboard is up, the root crisis button is inside the\n' +
        '  keyboard window and unreachable — so an unwired TextInput has NO 988 access.\n' +
        '  Spread the props on each site:\n\n' +
        "      import { crisisAccessoryProps } from '@/features/crisis/constants/crisisInputAccessory';\n" +
        '      <TextInput {...crisisAccessoryProps()} … />\n\n' +
        '  If a site genuinely must not carry it, add the FILE to ALLOWLIST in\n' +
        '  scripts/check-crisis-keyboard-accessory-guard.js with a written ruling.\n',
    );
  }

  if (stale.length > 0) {
    failed = true;
    console.error('\n❌ DEBUG-450: ALLOWLIST entries whose file renders no <TextInput>:\n');
    for (const file of stale) console.error(`     ${file}`);
    console.error(
      '\n  Remove the entry. The allowlist is the audit trail of deliberate\n' +
        '  exemptions; an entry with no subject is how a stale ruling survives review.\n',
    );
  }

  if (failed) process.exit(1);
  console.log('✓ DEBUG-450: every shipping <TextInput> reaches the crisis keyboard accessory');
}

if (require.main === module) main();

module.exports = {
  ALLOWLIST,
  collectSourceFiles,
  findTextInputSites,
  openingTagSpan,
  runGuard,
  stripComments,
};
