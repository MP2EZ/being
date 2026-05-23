#!/usr/bin/env node
/**
 * Per-file lint baseline ratchet.
 *
 *   npm run lint:baseline            — fail if any file's error count
 *                                      grew vs the snapshot.
 *   npm run lint:baseline -- --update — refresh the snapshot.
 *
 * Stored at app/.eslint-baseline.json. Includes per-file counts so a
 * "fix one error in A, add one to B" swap can't pass under a global
 * total. Improvements are reported (not auto-applied) — run --update
 * to ratchet down once you've fixed a file.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASELINE_FILE = path.join(__dirname, '..', '.eslint-baseline.json');
const SHOULD_UPDATE = process.argv.includes('--update');

function run() {
  const out = execFileSync(
    'npx',
    ['eslint', 'src', '--ext', '.ts,.tsx', '--format', 'json'],
    { encoding: 'utf8', maxBuffer: 200 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }
  );
  const results = JSON.parse(out);
  const counts = {};
  for (const r of results) {
    if (r.errorCount > 0) {
      const rel = path.relative(path.join(__dirname, '..'), r.filePath);
      counts[rel] = r.errorCount;
    }
  }
  return counts;
}

let current;
try {
  current = run();
} catch (e) {
  // eslint exits non-zero when errors are present — that's expected.
  // It still writes the JSON to stdout, so parse from the error object.
  if (e.stdout) {
    const results = JSON.parse(e.stdout);
    current = {};
    for (const r of results) {
      if (r.errorCount > 0) {
        const rel = path.relative(path.join(__dirname, '..'), r.filePath);
        current[rel] = r.errorCount;
      }
    }
  } else {
    throw e;
  }
}

if (SHOULD_UPDATE) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(current, null, 2) + '\n');
  const total = Object.values(current).reduce((s, n) => s + n, 0);
  console.log(`Baseline updated: ${Object.keys(current).length} files, ${total} errors.`);
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE_FILE)
  ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'))
  : {};

const regressions = [];
const improvements = [];
const allFiles = new Set([...Object.keys(baseline), ...Object.keys(current)]);
for (const file of allFiles) {
  const b = baseline[file] || 0;
  const c = current[file] || 0;
  if (c > b) regressions.push(`  ${file}: ${b} → ${c} (+${c - b})`);
  else if (c < b) improvements.push(`  ${file}: ${b} → ${c} (-${b - c})`);
}

if (regressions.length > 0) {
  console.error('Lint regressions vs baseline:');
  for (const r of regressions) console.error(r);
  console.error('\nFix the new errors, or accept them with: npm run lint:baseline -- --update');
  process.exit(1);
}

if (improvements.length > 0) {
  console.log('Lint improvements (run --update to ratchet baseline):');
  for (const i of improvements) console.log(i);
}

const totalCurrent = Object.values(current).reduce((s, n) => s + n, 0);
const totalBaseline = Object.values(baseline).reduce((s, n) => s + n, 0);
console.log(`No new lint errors. ${totalCurrent}/${totalBaseline} errors across ${Object.keys(current).length} files.`);
process.exit(0);
