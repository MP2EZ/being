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
 *
 * Exit codes: 0 = no regressions (or --update wrote), 1 = regression vs
 * baseline, 2 = COULD NOT DETERMINE (eslint output empty, invalid or missing —
 * "zero files linted" is not "zero errors", so it never passes and --update
 * refuses to overwrite the baseline with it).
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_ROOT = path.join(__dirname, '..');
const BASELINE_FILE = path.join(APP_ROOT, '.eslint-baseline.json');

/**
 * Parse `eslint --format json` stdout into { relativePath: errorCount } for files
 * with errors. Throws unless the output is a NON-EMPTY JSON array: an empty array
 * means eslint linted zero files (bad glob, broken config), which is not the same
 * as a clean tree — a clean tree is a non-empty array whose entries all have
 * errorCount 0, yielding {}.
 */
function parseEslintJson(stdout, appRoot = APP_ROOT) {
  let results;
  try {
    results = JSON.parse(stdout);
  } catch (e) {
    throw new Error(`eslint output is not valid JSON (${e.message})`);
  }
  if (!Array.isArray(results)) {
    throw new Error('eslint output is not a JSON array');
  }
  if (results.length === 0) {
    throw new Error('eslint output is an empty array (zero files linted)');
  }
  const counts = {};
  for (const r of results) {
    if (r.errorCount > 0) {
      counts[path.relative(appRoot, r.filePath)] = r.errorCount;
    }
  }
  return counts;
}

/**
 * Run eslint and return the per-file error counts. eslint exits non-zero when
 * errors are present — expected; it still writes the JSON to stdout, so recover
 * it from the thrown error. `exec` is injectable for tests.
 */
function collect({ exec = execFileSync, appRoot = APP_ROOT } = {}) {
  let stdout;
  try {
    stdout = exec('npx', ['eslint', 'src', '--ext', '.ts,.tsx', '--format', 'json'], {
      encoding: 'utf8',
      maxBuffer: 200 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (e) {
    if (e && e.stdout && String(e.stdout).length > 0) {
      stdout = e.stdout;
    } else {
      throw e;
    }
  }
  return parseEslintJson(String(stdout), appRoot);
}

/** Pure comparison of two { file: count } maps. */
function diff(baseline, current) {
  const regressions = [];
  const improvements = [];
  const allFiles = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  for (const file of allFiles) {
    const b = baseline[file] || 0;
    const c = current[file] || 0;
    if (c > b) regressions.push({ file, from: b, to: c });
    else if (c < b) improvements.push({ file, from: b, to: c });
  }
  return { regressions, improvements };
}

const sum = (counts) => Object.values(counts).reduce((s, n) => s + n, 0);

/** Returns the process exit code; never calls process.exit. */
function main({
  argv = process.argv.slice(2),
  baselineFile = BASELINE_FILE,
  exec = execFileSync,
  appRoot = APP_ROOT,
  log = console.log,
  error = console.error,
} = {}) {
  let current;
  try {
    current = collect({ exec, appRoot });
  } catch (e) {
    error(`COULD NOT DETERMINE lint state: ${e && e.message ? e.message : e}`);
    error('Refusing to treat missing or empty eslint output as a pass.');
    return 2;
  }

  if (argv.includes('--update')) {
    fs.writeFileSync(baselineFile, JSON.stringify(current, null, 2) + '\n');
    log(`Baseline updated: ${Object.keys(current).length} files, ${sum(current)} errors.`);
    return 0;
  }

  const baseline = fs.existsSync(baselineFile)
    ? JSON.parse(fs.readFileSync(baselineFile, 'utf8'))
    : {};

  const { regressions, improvements } = diff(baseline, current);

  if (regressions.length > 0) {
    error('Lint regressions vs baseline:');
    for (const r of regressions) error(`  ${r.file}: ${r.from} → ${r.to} (+${r.to - r.from})`);
    error('\nFix the new errors, or accept them with: npm run lint:baseline -- --update');
    return 1;
  }

  if (improvements.length > 0) {
    log('Lint improvements (run --update to ratchet baseline):');
    for (const i of improvements) log(`  ${i.file}: ${i.from} → ${i.to} (-${i.from - i.to})`);
  }

  log(
    `No new lint errors. ${sum(current)}/${sum(baseline)} errors across ${Object.keys(current).length} files.`
  );
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { diff, parseEslintJson, collect, main };
