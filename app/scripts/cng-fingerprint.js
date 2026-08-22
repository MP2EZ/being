#!/usr/bin/env node
/**
 * INFRA-508 — content fingerprint of everything `expo prebuild` reads to generate ios/.
 *
 * Replaces the mtime test in e2e-sim-build.sh:
 *
 *     find app.json package.json plugins patches -newer ios/.cng-stamp
 *
 * `git checkout` restamps every file it rewrites, so ANY package.json move fired a full
 * `expo prebuild --clean` — including a one-line npm-script edit with zero dependency
 * delta. Measured across five instrumented gate runs (DEBUG-469 close, 2026-08-21):
 * regenerating 11m05s / 12m43s / 14m26s vs 1m02s / 3m51s when it was skipped. Two of the
 * three regenerations were fired by a PEER session re-pointing the shared gate worktree,
 * so the cost was unattributable from inside the session that paid it.
 *
 * SAFETY, not just cost. `expo run:ios` prebuilds ONLY when ios/ is absent, so a missed
 * regeneration yields a binary whose Info.plist does not reflect app.json — and on this
 * repo that lands on LSApplicationQueriesSchemes, the 988 dial path (INFRA-184/INFRA-383).
 * So this projection is deliberately WIDER than the old one on real inputs: it keeps
 * app.json, plugins and patches, ADDS package-lock.json, and drops only the package.json
 * fields prebuild provably does not read.
 *
 * Raw bytes for app.json, the lockfile, and plugins/patches; a canonical projection only
 * for package.json. package.json is the only one of these that churns for CNG-irrelevant
 * reasons, so it is the only one that earns a normalizer. Elsewhere raw bytes fail safe: a
 * spurious regeneration costs minutes, a missed one can certify a binary that cannot dial.
 *
 * Every failure THROWS. A fingerprint that degraded to a constant would skip prebuild
 * forever, which is the false-green direction.
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * package.json keys `expo prebuild` reads, directly or through autolinking. Everything
 * else — scripts, jest, description, private, lint config — cannot reach the generated
 * project. Keep this list narrow and justified; widening it costs correctness, narrowing
 * it costs build time.
 */
const CNG_PACKAGE_KEYS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
  'overrides',
  'resolutions',
  'expo', // autolinking config can live here
  'main', // entry point is baked into the generated project
  'version', // carried into the native project alongside app.json's
];

/** Directories whose every file is a CNG input. Absent is legitimate, not an error. */
const CNG_DIRS = ['plugins', 'patches'];

/** Deterministic JSON: recursively key-sorted, so a reorder is not a change. */
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, k) => {
        acc[k] = canonicalize(value[k]);
        return acc;
      }, {});
  }
  return value;
}

/** Every file under dir, relative to root, sorted — a stable, order-free walk. */
function walk(root, dir, out = []) {
  const abs = path.join(root, dir);
  let entries;
  try {
    entries = fs.readdirSync(abs, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return out; // an absent plugins/ or patches/ is fine
    throw err;
  }
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(root, rel, out);
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

/**
 * Hex digest of the CNG-relevant state of an Expo app directory.
 * Throws if a required input is missing or unparseable — callers must regenerate on throw.
 */
function cngFingerprint(appDir) {
  const hash = crypto.createHash('sha256');

  // Required, raw bytes. readFileSync throws ENOENT, which is the fail-safe direction.
  for (const file of ['app.json', 'package-lock.json']) {
    hash.update(`\0file:${file}\0`);
    hash.update(fs.readFileSync(path.join(appDir, file)));
  }

  // package.json: parse (throws on malformed) then project onto the CNG-relevant keys.
  const pkgRaw = fs.readFileSync(path.join(appDir, 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const projection = {};
  for (const key of CNG_PACKAGE_KEYS) {
    if (pkg[key] !== undefined) projection[key] = pkg[key];
  }
  hash.update('\0pkg\0');
  hash.update(JSON.stringify(canonicalize(projection)));

  // plugins/ and patches/: path AND bytes. The path carries meaning — a patch filename
  // pins the package version it applies to (expo-modules-jsi+56.0.12.patch).
  for (const dir of CNG_DIRS) {
    for (const rel of walk(appDir, dir)) {
      hash.update(`\0file:${rel}\0`);
      hash.update(fs.readFileSync(path.join(appDir, rel)));
    }
  }

  return hash.digest('hex');
}

module.exports = { cngFingerprint, CNG_PACKAGE_KEYS, CNG_DIRS };

if (require.main === module) {
  try {
    process.stdout.write(cngFingerprint(process.argv[2] || process.cwd()));
  } catch (err) {
    // Print nothing on stdout: the caller treats an empty fingerprint as "regenerate".
    process.stderr.write(`cng-fingerprint: ${err.message}\n`);
    process.exit(1);
  }
}
