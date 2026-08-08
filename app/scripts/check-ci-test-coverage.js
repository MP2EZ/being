#!/usr/bin/env node
'use strict';

/**
 * check-ci-test-coverage.js — INFRA-368
 *
 * CI coverage in this repo is an EMERGENT property, not a declared one. Every
 * jest job selects files with `--testPathPattern`, which matches by path
 * substring/regex — so a suite is gated if and only if somebody happened to
 * name it into a pattern. `check-crisis-hotline.test.js` is gated purely
 * because its filename contains "crisis". Nobody decided it belonged to the
 * crisis job. Symmetrically, `__tests__/privacy/` was gated by nothing at all.
 *
 * This script makes the property observable and then pins it:
 *
 *   1. COVERAGE — recompute `jest --listTests` minus the union of every
 *      `--testPathPattern` CI actually invokes, and assert the ungated set
 *      equals a committed allowlist. A new test file landing in a path no
 *      pattern matches fails here instead of silently gating nothing.
 *
 *   2. GATE WIRING — assert `ci-pass` tracks every gate in all four of its
 *      hand-synced lists. This is the subtler failure: a job added to `needs:`
 *      but missing from the if-condition RUNS, goes RED, and `CI pass` still
 *      reports green. That is the same class of bug as (1) — a gate that exists
 *      but does not gate — reproduced by the very fix for it.
 *
 * Deliberately dependency-free. `js-yaml` is only transitively present in
 * node_modules and is not a declared dependency of this package, so requiring
 * it would work locally and break on a pruned install. ci.yml's `npm run`
 * invocations are single-line and regex-extractable; that is enough.
 *
 * Usage:
 *   node scripts/check-ci-test-coverage.js              # verify, exit 1 on drift
 *   node scripts/check-ci-test-coverage.js --print-uncovered
 *   node scripts/check-ci-test-coverage.js --update-allowlist
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const APP_DIR = path.resolve(__dirname, '..');
const CI_YML = path.resolve(APP_DIR, '..', '.github', 'workflows', 'ci.yml');
const PKG_JSON = path.join(APP_DIR, 'package.json');
const ALLOWLIST = path.join(__dirname, 'ci-uncovered-tests.json');

// ---------------------------------------------------------------------------
// Pure helpers — exported for the meta-test. Keep them free of I/O.
// ---------------------------------------------------------------------------

/**
 * Every script name CI invokes via `npm run <name>`.
 *
 * Must NOT match `npm ci` (the install step), hence the required `run `.
 */
function extractCiScriptNames(ciYml) {
  const names = new Set();
  const re = /npm run ([A-Za-z0-9:_-]+)/g;
  let m;
  while ((m = re.exec(ciYml)) !== null) names.add(m[1]);
  return names;
}

/** Every `--testPathPattern=X` in a string, quoted or bare. */
function extractPatterns(command) {
  const out = [];
  const re = /--testPathPattern[= ](?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let m;
  while ((m = re.exec(command)) !== null) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

/**
 * Resolve script names to testPathPatterns, following `npm run` indirection
 * RECURSIVELY.
 *
 * This recursion is load-bearing, not defensive. CI never invokes the pattern
 * scripts directly — it calls `validate:crisis-authority`, which calls
 * `test:crisis-quick`, which holds the `[Cc]risis` pattern; and
 * `validate:clinical-authority` -> `validate:clinical-complete` ->
 * `test:clinical`. A single-level scan resolves neither and understates
 * coverage by 41 files, which would then read as a coverage GAP that isn't
 * real. The `seen` set guards a self- or mutually-referential script.
 */
function resolvePatterns(scriptNames, scripts, seen = new Set()) {
  const patterns = new Set();
  for (const name of scriptNames) {
    if (seen.has(name)) continue;
    seen.add(name);
    const body = scripts[name];
    if (!body) continue;
    for (const p of extractPatterns(body)) patterns.add(p);
    for (const p of resolvePatterns(extractCiScriptNames(body), scripts, seen)) {
      patterns.add(p);
    }
  }
  return patterns;
}

/** Test files matching no pattern. Patterns are regexes tested against the full path. */
function findUncovered(testFiles, patterns) {
  const compiled = [...patterns].map((p) => new RegExp(p));
  return testFiles.filter((f) => !compiled.some((re) => re.test(f))).sort();
}

/**
 * The four places `ci-pass` tracks each gate. Returns one array per list, in
 * declaration order.
 *
 * Only `condition` decides pass/fail. The other three are reporting. That
 * asymmetry is exactly why they drift and why this is worth checking: a gate
 * can be fully visible in the run log and still not gate anything.
 */
function parseGateLists(ciYml) {
  const ciPass = ciYml.slice(ciYml.indexOf('\n  ci-pass:'));

  const needsBlock = ciPass.slice(ciPass.indexOf('\n    needs:'), ciPass.indexOf('\n    steps:'));
  const needs = [...needsBlock.matchAll(/^\s+- ([a-z0-9-]+)\s*$/gm)].map((m) => m[1]);

  const add = [...ciPass.matchAll(/\badd\s+"[^"]*"\s+"\$\{\{\s*needs\.([a-z0-9-]+)\.result/g)]
    .map((m) => m[1]);

  const aggregate = ciPass.slice(ciPass.indexOf('- name: Aggregate gate status'));
  const echo = [...aggregate.matchAll(/\becho\s+"[^"]*\$\{\{\s*needs\.([a-z0-9-]+)\.result/g)]
    .map((m) => m[1]);

  const condition = [
    ...aggregate.matchAll(/needs\.([a-z0-9-]+)\.result\s*\}\}"\s*!=\s*"success"/g),
  ].map((m) => m[1]);

  return { needs, add, echo, condition };
}

/** Names present in some gate lists but not all. Empty means the four agree. */
function gateWiringDrift({ needs, add, echo, condition }) {
  const lists = { needs, add, echo, condition };
  const all = new Set([...needs, ...add, ...echo, ...condition]);
  const drift = [];
  for (const gate of [...all].sort()) {
    const missing = Object.keys(lists).filter((k) => !lists[k].includes(gate));
    if (missing.length) drift.push({ gate, missingFrom: missing });
  }
  return drift;
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

/**
 * `jest.config.js` switches BOTH testMatch and testPathIgnorePatterns on the
 * JEST_QUICK env var, so an ambient JEST_QUICK changes the denominator and
 * makes this measurement irreproducible. Pin it unset.
 */
function listTests() {
  const env = { ...process.env };
  delete env.JEST_QUICK;
  const out = execFileSync('npx', ['jest', '--listTests'], {
    cwd: APP_DIR,
    env,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return out.split('\n').map((l) => l.trim()).filter(Boolean).sort();
}

const rel = (p) => path.relative(APP_DIR, p);

function main() {
  const args = process.argv.slice(2);
  const ciYml = fs.readFileSync(CI_YML, 'utf8');
  const scripts = JSON.parse(fs.readFileSync(PKG_JSON, 'utf8')).scripts || {};

  const patterns = resolvePatterns(extractCiScriptNames(ciYml), scripts);
  const testFiles = listTests();
  const uncovered = findUncovered(testFiles, patterns).map(rel);

  if (args.includes('--print-uncovered')) {
    uncovered.forEach((f) => console.log(f));
    return 0;
  }

  if (args.includes('--update-allowlist')) {
    // Merge, never overwrite: `note` and `why` are hand-authored and are the
    // only thing separating "deliberately ungated, here's why" from "nobody
    // noticed". Regenerating the path list must not silently discard them.
    const prev = fs.existsSync(ALLOWLIST)
      ? JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8'))
      : {};
    fs.writeFileSync(
      ALLOWLIST,
      `${JSON.stringify({ ...prev, uncovered }, null, 2)}\n`,
      'utf8'
    );
    console.log(`Wrote ${uncovered.length} entries to ${rel(ALLOWLIST)}`);
    return 0;
  }

  const expected = JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8')).uncovered;
  const added = uncovered.filter((f) => !expected.includes(f));
  const removed = expected.filter((f) => !uncovered.includes(f));
  const drift = gateWiringDrift(parseGateLists(ciYml));

  console.log(`Test files:        ${testFiles.length}`);
  console.log(`CI patterns:       ${patterns.size}`);
  console.log(`Covered by CI:     ${testFiles.length - uncovered.length}`);
  console.log(`Ungated (allowed): ${uncovered.length}`);

  let failed = false;

  if (added.length) {
    failed = true;
    console.error(
      `\n❌ ${added.length} test file(s) match no CI pattern and are not on the allowlist.\n` +
        '   They will not run on any PR. Either wire them into a job, or add them\n' +
        "   to the allowlist WITH a reason in that file's \"why\" map.\n"
    );
    added.forEach((f) => console.error(`   + ${f}`));
  }

  if (removed.length) {
    failed = true;
    console.error(
      `\n❌ ${removed.length} allowlisted file(s) are now covered or no longer exist.\n` +
        '   Good news, but the allowlist must shrink to match — a stale entry hides\n' +
        '   the next real gap.\n'
    );
    removed.forEach((f) => console.error(`   - ${f}`));
  }

  if (drift.length) {
    failed = true;
    console.error(
      '\n❌ ci-pass gate wiring is inconsistent. A job missing from `condition`\n' +
        '   runs, fails, and still reports `CI pass` green.\n'
    );
    drift.forEach((d) => console.error(`   ${d.gate} — missing from: ${d.missingFrom.join(', ')}`));
  }

  if (failed) {
    console.error('\nRun `node scripts/check-ci-test-coverage.js --print-uncovered` to inspect.');
    return 1;
  }

  console.log('\n✅ CI test coverage matches the allowlist; ci-pass gate wiring is consistent.');
  return 0;
}

module.exports = {
  extractCiScriptNames,
  extractPatterns,
  resolvePatterns,
  findUncovered,
  parseGateLists,
  gateWiringDrift,
};

if (require.main === module) process.exit(main());
