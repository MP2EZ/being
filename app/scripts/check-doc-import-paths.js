#!/usr/bin/env node
'use strict';

/**
 * check-doc-import-paths.js — INFRA-601
 *
 * Asserts that every `@/` import specifier quoted in a fenced code block under
 * docs/architecture/ resolves to a real module in app/src.
 *
 * WHY THIS EXISTS. MAINT-600 found the architecture docs teaching imports of
 * directories that were never created and modules deleted long ago. Nothing
 * validated a documented import path, so the citations rotted in silence — and
 * these are the docs a new reader trusts most.
 *
 * WHAT IS EXTRACTED. Import-statement grammar only — `from '…'`, a bare
 * `import '…'`, `import('…')`, `require('…')`, `jest.mock('…')` — and only inside
 * fenced code blocks. A quoted `@/` string that is not an import is ignored:
 * import-guidelines.md carries a tsconfig alias listing, eslint `pattern`s and a
 * sed substitution, and a quoted-string matcher reds on all three. Prose, inline
 * code spans and relative specifiers (`../x`) are OUT of scope for v1.
 *
 * Fences follow CommonMark: a fence closes only on the same character, at least
 * the opening length, with no info string. That is how GitHub renders the doc, and
 * a toggle-on-``` parser inverts fence parity after the first nested fence.
 *
 * HOW A SPECIFIER RESOLVES. Through TypeScript's own module resolution against
 * app/tsconfig.json, so the verdict tracks the real `paths` config. The host only
 * sees files that are BOTH in the git index AND on disk. That makes the check
 * case-exact — macOS's default fs host resolves `@/CORE/theme`, ubuntu CI does
 * not — and stops an untracked local file reading as a resolved import (DEBUG-389).
 *
 * THE BOUNDARY — READ THIS BEFORE TRUSTING A GREEN RUN. Only the PATH is checked.
 * `import { NoSuchExport } from '@/core/theme'` passes: the path resolves, and
 * whether it exports that name needs the TS program. A green run means "every
 * documented import path exists", never "documented imports are correct".
 *
 * DELIBERATE NON-RESOLUTION. A doc may cite an import that must NOT resolve — an
 * anti-pattern example of a deleted barrel. Mark it on the fenced line itself:
 *
 *   import { X } from '@/features/crisis'; // doc-import: unresolved-by-design - <reason>
 *
 * A marked, unresolved specifier passes and is listed. A marker whose specifier
 * now RESOLVES fails as stale, a marker with no reason fails, and a marker on a
 * line with no import fails — each would otherwise read as coverage it isn't.
 *
 * Usage:
 *   node scripts/check-doc-import-paths.js   # exit 0 clean, 1 findings, 2 could not check
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const APP_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(APP_DIR, '..');
const TSCONFIG = path.join(APP_DIR, 'tsconfig.json');
const DOCS_ROOT = 'docs/architecture';
const SRC_ROOT = 'app/src';

// ---------------------------------------------------------------------------
// Pure helpers — exported for the meta-test.
// ---------------------------------------------------------------------------

const QUOTED_ALIAS = String.raw`(['"])(@\/[^'"\s]+)\1`;
const IMPORT_PATTERNS = [
  new RegExp(String.raw`\bfrom\s+` + QUOTED_ALIAS, 'g'),
  new RegExp(String.raw`\bimport\s+` + QUOTED_ALIAS, 'g'),
  new RegExp(String.raw`\bimport\s*\(\s*` + QUOTED_ALIAS, 'g'),
  new RegExp(String.raw`\brequire\s*\(\s*` + QUOTED_ALIAS, 'g'),
  new RegExp(String.raw`\bjest\.(?:mock|doMock|unmock|requireActual)\s*\(\s*` + QUOTED_ALIAS, 'g'),
];

const MARKER_RE = /\/\/\s*doc-import:\s*unresolved-by-design\b(.*)$/;

/** The reason carried by a marker on this line, `{ reason: '' }` if it has none, or null. */
function parseMarker(lineText) {
  const m = MARKER_RE.exec(lineText);
  if (!m) return null;
  return { reason: m[1].replace(/^\s*[-–—:]?\s*/, '').trim() };
}

/** One import specifier per match on a line, in source order. */
function specifiersOnLine(lineText) {
  const hits = [];
  for (const re of IMPORT_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(lineText)) !== null) hits.push({ index: m.index, specifier: m[2] });
  }
  hits.sort((a, b) => a.index - b.index);
  return hits.map((h) => h.specifier);
}

/**
 * Every documented import in a markdown string: `{ line, specifier, marker }`,
 * plus `{ line, specifier: null, marker }` for a marker on a fenced line that
 * carries no import (so the caller can fail it).
 */
function extractSpecifiers(text) {
  const out = [];
  let open = null; // { char, length } of the fence we are inside
  text.split('\n').forEach((lineText, i) => {
    const fenceMatch = /^\s*(`{3,}|~{3,})(.*)$/.exec(lineText);
    if (open === null) {
      if (fenceMatch) {
        const [, run, info] = fenceMatch;
        // A backtick fence's info string may not itself contain a backtick.
        if (!(run[0] === '`' && info.includes('`'))) open = { char: run[0], length: run.length };
      }
      return;
    }
    if (
      fenceMatch &&
      fenceMatch[1][0] === open.char &&
      fenceMatch[1].length >= open.length &&
      fenceMatch[2].trim() === ''
    ) {
      open = null;
      return;
    }
    const marker = parseMarker(lineText);
    const specifiers = specifiersOnLine(lineText);
    if (!specifiers.length && marker) out.push({ line: i + 1, specifier: null, marker });
    for (const specifier of specifiers) out.push({ line: i + 1, specifier, marker });
  });
  return out;
}

/**
 * A `specifier -> boolean` resolver over an explicit file set.
 *
 * `tracked` holds repo-relative paths (what `git ls-files` prints); `exists` is
 * injectable so tests need no fixture repository. TypeScript is required lazily so
 * the extractor helpers stay usable without it.
 */
function createResolver({ tracked, exists = (f) => fs.existsSync(path.join(REPO_ROOT, f)), tsconfigPath = TSCONFIG }) {
  const ts = require('typescript');
  const read = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (read.error) throw new Error(`cannot read ${tsconfigPath}: ${ts.flattenDiagnosticMessageText(read.error.messageText, '\n')}`);
  const { options } = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(tsconfigPath));

  const dirs = new Set();
  for (const f of tracked) {
    for (let d = path.posix.dirname(f); d !== '.' && !dirs.has(d); d = path.posix.dirname(d)) dirs.add(d);
  }
  const rel = (abs) => path.relative(REPO_ROOT, abs).split(path.sep).join('/');

  const host = {
    fileExists: (abs) => {
      const r = rel(abs);
      return tracked.has(r) && exists(r);
    },
    directoryExists: (abs) => dirs.has(rel(abs)),
    readFile: (abs) => (host.fileExists(abs) ? fs.readFileSync(abs, 'utf8') : undefined),
    realpath: (abs) => abs,
    getCurrentDirectory: () => APP_DIR,
    useCaseSensitiveFileNames: () => true,
  };
  const containingFile = path.join(REPO_ROOT, SRC_ROOT, '__doc_import_check__.ts');

  return (specifier) =>
    Boolean(ts.resolveModuleName(specifier, containingFile, options, host).resolvedModule);
}

/**
 * Findings across a set of docs. `checked` counts import specifiers examined;
 * `honoured` lists marked specifiers that are unresolved, as intended.
 */
function checkDocs({ docs, resolve }) {
  const findings = [];
  const honoured = [];
  let checked = 0;
  for (const { file, text } of docs) {
    for (const { line, specifier, marker } of extractSpecifiers(text)) {
      if (specifier === null) {
        findings.push({ doc: file, line, specifier: null, reason: 'orphan-marker' });
        continue;
      }
      checked += 1;
      const resolves = resolve(specifier);
      if (!marker) {
        if (!resolves) findings.push({ doc: file, line, specifier, reason: 'unresolved' });
      } else if (!marker.reason) {
        findings.push({ doc: file, line, specifier, reason: 'marker-missing-reason' });
      } else if (resolves) {
        findings.push({ doc: file, line, specifier, reason: 'stale-marker' });
      } else {
        honoured.push({ doc: file, line, specifier, reason: marker.reason });
      }
    }
  }
  return { findings, checked, honoured };
}

const REASON_TEXT = {
  unresolved: 'does not resolve under app/tsconfig.json paths (git index)',
  'stale-marker': 'is marked unresolved-by-design but now resolves — remove the marker',
  'marker-missing-reason': 'has an unresolved-by-design marker with no reason',
  'orphan-marker': 'unresolved-by-design marker on a line with no @/ import',
};

function formatFinding(f) {
  return `${f.doc}:${f.line}  ${f.specifier ?? '(no specifier)'}  ${REASON_TEXT[f.reason]}`;
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

/** Repo-relative paths git has in its index under the given pathspecs. Throws if git fails. */
function listTrackedFiles(pathspecs) {
  const out = execFileSync('git', ['ls-files', '-z', '--', ...pathspecs], { cwd: REPO_ROOT, encoding: 'utf8' });
  return new Set(out.split('\0').filter(Boolean));
}

/** Tracked markdown under docs/architecture that is present on disk. */
function loadDocs() {
  return [...listTrackedFiles([DOCS_ROOT])]
    .filter((f) => f.endsWith('.md') && fs.existsSync(path.join(REPO_ROOT, f)))
    .sort()
    .map((file) => ({ file, text: fs.readFileSync(path.join(REPO_ROOT, file), 'utf8') }));
}

function main() {
  let docs;
  let resolve;
  try {
    docs = loadDocs();
    resolve = createResolver({ tracked: listTrackedFiles([SRC_ROOT]) });
  } catch (err) {
    console.error(`❌ check-doc-import-paths could not run: ${err.message}`);
    return 2;
  }
  if (!docs.length) {
    console.error(`❌ No tracked markdown under ${DOCS_ROOT}/ — refusing to report a pass on nothing.`);
    return 2;
  }

  const { findings, checked, honoured } = checkDocs({ docs, resolve });
  if (checked === 0) {
    // DEBUG-390: a matcher that silently matches nothing must not read as green.
    console.error(`❌ Scanned ${docs.length} docs but extracted zero @/ import specifiers — the matcher has stopped firing.`);
    return 2;
  }

  console.log(`Docs scanned: ${docs.length} (${DOCS_ROOT}/)`);
  console.log(`@/ import specifiers checked: ${checked}`);
  console.log(`unresolved-by-design markers honoured: ${honoured.length}`);
  for (const h of honoured) console.log(`   ${h.doc}:${h.line}  ${h.specifier}  — ${h.reason}`);
  console.log('Boundary: exported identifiers are NOT checked (INFRA-601 v1) — a path that resolves may still name an export that does not exist.');

  if (!findings.length) {
    console.log('✅ Every documented import path resolves.');
    return 0;
  }
  console.error(`\n❌ ${findings.length} documented import path problem(s):\n`);
  for (const f of findings) {
    console.error(`   ${formatFinding(f)}`);
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::error file=${f.doc},line=${f.line}::${f.specifier ?? ''} ${REASON_TEXT[f.reason]}`);
    }
  }
  console.error(
    '\n   Fix the doc to cite a module that exists. If the example must name one that\n' +
      '   does not (an anti-pattern), append `// doc-import: unresolved-by-design - <reason>`.\n'
  );
  return 1;
}

if (require.main === module) process.exit(main());

module.exports = {
  extractSpecifiers,
  parseMarker,
  createResolver,
  checkDocs,
  formatFinding,
  listTrackedFiles,
  loadDocs,
  REPO_ROOT,
};
