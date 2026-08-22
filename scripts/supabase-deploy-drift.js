#!/usr/bin/env node
/**
 * INFRA-442 — Supabase deploy-drift check.
 *
 * THE FAILURE CLASS. There is no CI auto-deploy for Supabase migrations, edge
 * functions or secrets, so "merged" and "running" drift apart silently and only a
 * live query distinguishes them. It has bitten three times: INFRA-278 (the entire
 * crisis-monitoring stack dormant in production for weeks after merge), INFRA-379
 * (prod four migrations behind; grace-period-automation, the subscription watchdog
 * and the analytics retention prune simply absent), and — found while executing
 * INFRA-379 — service_role holding no DML on `subscriptions`, i.e. the whole
 * server-side subscription lifecycle had never worked. Each discovery was
 * incidental. Nobody was looking.
 *
 * THIS FILE IS THE HALF THAT NEEDS NO CREDENTIAL.
 *
 *   --reconcile   (implemented here)  source ↔ supabase/deploy-manifest.json
 *   live probe    (INFRA-448)         manifest ↔ the deployed project
 *
 * The split is not cosmetic. The live probe needs a Supabase PAT that does not
 * exist in repo secrets today — verified: only SUPABASE_URL and SUPABASE_ANON_KEY
 * are present, and the anon key can read none of the three drift classes
 * (`supabase_migrations.schema_migrations` is not PostgREST-exposed under this
 * project's `[api] schemas` pin, and `vault.secrets` is postgres-role-only). The
 * reconcile half gates on merge TODAY and is what catches the commonest cause of
 * live drift: a new secret name entering the code that nobody provisions.
 *
 * WHY A MANIFEST AND NOT JUST A GREP. `Deno.env.get` appears in three shapes and a
 * regex sees only one cleanly — literal-required, literal-with-default (a tunable,
 * where absence is correct), and NON-LITERAL, where the name arrives as a
 * parameter. A grep cannot produce the expected set; it can only be reconciled
 * against one. Check 6 fails on any non-literal read this file does not already
 * know about, so the blind spot cannot widen silently.
 *
 * FAIL-CLOSED. Every failure mode exits non-zero. An unreadable manifest, an
 * unparseable source tree or an internal error exits 2 and is reported as COULD
 * NOT DETERMINE — never as "no drift". A check that reports clean when it could not
 * look is worse than no check, and is the explicit AC this file is written against.
 *
 * Node built-ins only, no npm install, invoked as `node scripts/supabase-deploy-drift.js`
 * — the same dependency-free posture as legal-site-freshness.js and
 * check-workflow-scripts.js, and for the same reason: a pruned install must not
 * break the guard.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(REPO_ROOT, 'supabase', 'deploy-manifest.json');
const FUNCTIONS_DIR = path.join(REPO_ROOT, 'supabase', 'functions');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase', 'migrations');

/** Directories under supabase/functions/ that are not deployable functions. */
const NON_FUNCTION_DIRS = new Set(['_shared', '_tests', 'vendor']);

const problems = [];
const notes = [];
function drift(msg) { problems.push(msg); }
function note(msg) { notes.push(msg); }

/** Exit 2 — we could not determine state. Never conflate with "clean". */
function undetermined(msg, err) {
  console.error('\n❌ COULD NOT DETERMINE Supabase deploy state — this is NOT a clean result.');
  console.error(`   ${msg}`);
  if (err) console.error(`   ${err.message}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Name-shape normalisation.
//
// INFRA-379 hit a Vault secret stored as " grace_period_cron_secret" — a LEADING
// SPACE. An exact-match lookup reads that as ABSENT while a human reading the
// dashboard reads it as PRESENT, and the two states need different fixes (rename
// vs create). The live probe (INFRA-448) must therefore report MALFORMED as a
// class distinct from ABSENT. That normaliser is defined and self-tested HERE, in
// the credential-free half, so it is proven before the half that depends on it
// exists — and so a regression in it fails a PR rather than a 3am alert.
// ---------------------------------------------------------------------------
function normaliseName(raw) {
  return String(raw)
    .replace(/[​-‍﻿]/g, '') // zero-width space / joiner / non-joiner / BOM
    .replace(/ /g, ' ')               // non-breaking space → ordinary space
    .trim()
    .replace(/\s+/g, '_')                  // internal whitespace → underscore
    .replace(/-/g, '_')                    // hyphen/underscore fold
    .toLowerCase();
}

/** Self-test. A normaliser that silently stops normalising looks exactly like a clean project. */
function selfTestNormaliser() {
  const canonical = 'grace_period_cron_secret';
  const shouldMatch = [
    ' grace_period_cron_secret',        // INFRA-379's actual defect
    'grace_period_cron_secret ',
    ' grace_period_cron_secret',   // NBSP
    'grace_period_cron_secret​',   // zero-width
    'GRACE_PERIOD_CRON_SECRET',
    'grace-period-cron-secret',
  ];
  const shouldNotMatch = [
    'grace_period_cron_secrets',        // plural — a different secret
    'grace_period_cron',                // truncated
    'crisis_alert_cron_secret',         // the OTHER trust domain; must never fold together
  ];
  for (const s of shouldMatch) {
    if (normaliseName(s) !== canonical) {
      undetermined(`normaliser self-test FAILED: ${JSON.stringify(s)} did not normalise to ${canonical}`);
    }
  }
  for (const s of shouldNotMatch) {
    if (normaliseName(s) === canonical) {
      undetermined(`normaliser self-test FAILED: ${JSON.stringify(s)} wrongly normalised to ${canonical}`);
    }
  }
  // Anti-vacuity: prove the comparison can distinguish at all.
  if (normaliseName('a') === normaliseName('b')) {
    undetermined('normaliser self-test FAILED: it maps distinct names together');
  }
}

// ---------------------------------------------------------------------------
// Source walking
// ---------------------------------------------------------------------------
function walkTs(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    undetermined(`cannot read ${dir}`, err);
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'vendor' || e.name === 'node_modules') continue;
      walkTs(full, acc);
    } else if (e.isFile() && e.name.endsWith('.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function readManifest() {
  let raw;
  try {
    raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  } catch (err) {
    undetermined(`cannot read ${path.relative(REPO_ROOT, MANIFEST_PATH)}`, err);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    undetermined(`${path.relative(REPO_ROOT, MANIFEST_PATH)} is not valid JSON`, err);
  }
}

// ---------------------------------------------------------------------------
function reconcile() {
  selfTestNormaliser();

  const manifest = readManifest();
  for (const key of ['functions', 'platformInjected', 'edgeSecrets', 'tunables', 'vaultSecrets']) {
    if (!manifest[key]) undetermined(`manifest is missing required key "${key}"`);
  }

  // --- 1. Function set -----------------------------------------------------
  let dirEntries;
  try {
    dirEntries = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true });
  } catch (err) {
    undetermined(`cannot read ${path.relative(REPO_ROOT, FUNCTIONS_DIR)}`, err);
  }
  const onDisk = dirEntries
    .filter((e) => e.isDirectory() && !NON_FUNCTION_DIRS.has(e.name) && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();

  // A discovered-count floor. Without it, a layout change that makes the scan
  // find nothing would satisfy every "declared ⊆ discovered" check vacuously.
  if (onDisk.length < 5) {
    undetermined(`only ${onDisk.length} function dir(s) discovered under supabase/functions — expected at least 5. The layout changed or the scan is broken; either way this run proves nothing.`);
  }

  const declaredFns = new Set(manifest.functions);
  for (const fn of onDisk) {
    if (!declaredFns.has(fn)) {
      drift(`FUNCTION UNDECLARED: supabase/functions/${fn}/ exists but is not in the manifest's "functions". Add it — the live probe compares deployed slugs against this list, so an undeclared function is one nobody checks is deployed.`);
    }
  }
  for (const fn of manifest.functions) {
    if (!onDisk.includes(fn)) {
      drift(`FUNCTION STALE: manifest declares "${fn}" but supabase/functions/${fn}/ does not exist. Remove it, or the live probe will report a permanently-missing deployment.`);
    }
  }

  // --- 2/3/6. Env reads in function source ---------------------------------
  const tsFiles = walkTs(FUNCTIONS_DIR);
  if (tsFiles.length === 0) {
    undetermined('no .ts files found under supabase/functions — the scan is broken');
  }

  const LITERAL_ENV = /Deno\.env\.get\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)/g;
  const NONLITERAL_ENV = /Deno\.env\.get\(\s*(?!['"])/g;
  const TUNABLE = /envInt\(\s*['"]([A-Za-z0-9_]+)['"]/g;

  const seenEnv = new Map();      // NAME -> Set(relative file)
  const seenTunable = new Map();
  const nonLiteralSites = [];

  for (const file of tsFiles) {
    const rel = path.relative(REPO_ROOT, file);
    let src;
    try {
      src = fs.readFileSync(file, 'utf8');
    } catch (err) {
      undetermined(`cannot read ${rel}`, err);
    }
    // Strip comments so a name mentioned in prose is not mistaken for a read.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

    for (const m of code.matchAll(LITERAL_ENV)) {
      if (!seenEnv.has(m[1])) seenEnv.set(m[1], new Set());
      seenEnv.get(m[1]).add(rel);
    }
    for (const m of code.matchAll(TUNABLE)) {
      if (!seenTunable.has(m[1])) seenTunable.set(m[1], new Set());
      seenTunable.get(m[1]).add(rel);
    }
    if (NONLITERAL_ENV.test(code)) nonLiteralSites.push(rel);
    NONLITERAL_ENV.lastIndex = 0;
  }

  const declaredEnv = new Set([
    ...Object.keys(manifest.edgeSecrets),
    ...manifest.platformInjected,
    ...Object.keys(manifest.tunables),
  ]);

  for (const [name, files] of seenEnv) {
    if (!declaredEnv.has(name)) {
      drift(`SECRET UNDECLARED: Deno.env.get('${name}') is read in ${[...files].join(', ')} but is absent from the manifest. Declare it under "edgeSecrets" (with required true/false) so someone provisions it — an undeclared secret is exactly how a merged feature silently does nothing in production.`);
    }
  }
  for (const name of Object.keys(manifest.edgeSecrets)) {
    if (!seenEnv.has(name)) {
      drift(`SECRET STALE: manifest declares edge secret "${name}" but nothing reads it. Remove the entry, or the live probe will keep asserting a secret that no code needs — the manifest becomes a fourth drift surface, which is the failure this item exists to close.`);
    }
  }

  for (const [name, files] of seenTunable) {
    if (!Object.prototype.hasOwnProperty.call(manifest.tunables, name)) {
      drift(`TUNABLE UNDECLARED: envInt('${name}', …) in ${[...files].join(', ')} is not in the manifest's "tunables". Declare it with its default — tunables must be listed so the live probe does NOT report them absent (absence is correct for them, and reporting it is the noise that gets a drift check ignored).`);
    }
  }
  for (const name of Object.keys(manifest.tunables)) {
    if (!seenTunable.has(name)) {
      drift(`TUNABLE STALE: manifest declares tunable "${name}" but no envInt call reads it. Remove the entry.`);
    }
  }

  // Check 6 — the blind spot must not widen.
  const knownNonLiteral = new Set(
    (manifest.knownNonLiteralEnvReads || []).map((e) => e.file),
  );
  for (const rel of nonLiteralSites) {
    if (!knownNonLiteral.has(rel)) {
      drift(`NON-LITERAL ENV READ: ${rel} calls Deno.env.get() with a non-literal argument. No static pass can discover the names it reads, so they cannot be reconciled. Either pass literals, or add the file to "knownNonLiteralEnvReads" and declare the names its callers pass (as the envInt wrapper does).`);
    }
  }
  for (const entry of manifest.knownNonLiteralEnvReads || []) {
    if (!nonLiteralSites.includes(entry.file)) {
      drift(`NON-LITERAL ENTRY STALE: manifest exempts "${entry.file}" for a non-literal env read that no longer exists. Remove the exemption — a stale exemption is a hole waiting for the next file at that path.`);
    }
  }

  // --- 4/5. Vault names in migrations --------------------------------------
  let migrationFiles;
  try {
    migrationFiles = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  } catch (err) {
    undetermined(`cannot read ${path.relative(REPO_ROOT, MIGRATIONS_DIR)}`, err);
  }
  if (migrationFiles.length === 0) {
    undetermined('no .sql files found under supabase/migrations — the scan is broken');
  }

  const VAULT = /vault\.decrypted_secrets\s+WHERE\s+name\s*=\s*'([^']+)'/gi;
  const seenVault = new Map();
  for (const f of migrationFiles) {
    const full = path.join(MIGRATIONS_DIR, f);
    let src;
    try {
      src = fs.readFileSync(full, 'utf8');
    } catch (err) {
      undetermined(`cannot read supabase/migrations/${f}`, err);
    }
    // Strip SQL line comments; a name cited in a migration's prose is not a read.
    const code = src.replace(/^\s*--.*$/gm, '');
    for (const m of code.matchAll(VAULT)) {
      if (!seenVault.has(m[1])) seenVault.set(m[1], new Set());
      seenVault.get(m[1]).add(f);
    }
  }

  for (const [name, files] of seenVault) {
    if (!Object.prototype.hasOwnProperty.call(manifest.vaultSecrets, name)) {
      drift(`VAULT SECRET UNDECLARED: '${name}' is read in ${[...files].join(', ')} but is absent from the manifest's "vaultSecrets". Declare it — an undeclared Vault name is one nobody checks exists, and a cron job whose secret is missing fails silently.`);
    }
  }
  for (const name of Object.keys(manifest.vaultSecrets)) {
    if (!seenVault.has(name)) {
      drift(`VAULT SECRET STALE: manifest declares '${name}' but no migration reads it. Remove the entry.`);
    }
  }

  // Name-shape hygiene on the declared set itself — a manifest entry that is not
  // byte-equal to its own normalised form would make every live comparison against
  // it MALFORMED, which would look like a project problem rather than a typo here.
  for (const name of Object.keys(manifest.vaultSecrets)) {
    if (name !== normaliseName(name)) {
      drift(`VAULT NAME SHAPE: manifest key '${name}' is not in canonical form (expected '${normaliseName(name)}'). Fix the manifest — otherwise the live probe reports the real secret as MALFORMED against a malformed expectation.`);
    }
  }

  // --- Report --------------------------------------------------------------
  note(`${onDisk.length} function(s), ${seenEnv.size} env read(s), ${seenTunable.size} tunable(s), ${seenVault.size} vault name(s) discovered`);

  console.log('🔎 Supabase deploy-manifest reconciliation (INFRA-442, credential-free)\n');
  for (const n of notes) console.log(`   ℹ️  ${n}`);

  if (problems.length > 0) {
    console.error(`\n❌ ${problems.length} manifest drift issue(s):\n`);
    for (const p of problems) console.error(`   • ${p}\n`);
    console.error('   The manifest is the expectation the live probe (INFRA-448) will compare');
    console.error('   the deployed project against. An out-of-date manifest makes that probe');
    console.error('   wrong in whichever direction the entry is stale.\n');
    process.exit(1);
  }

  console.log('\n✅ Manifest reconciled with source — no undeclared or stale names.');
  console.log('   NOTE: this proves the manifest matches the CODE. It does not prove the');
  console.log('   project is deployed — that is the live probe, INFRA-448, which is blocked');
  console.log('   on a Supabase PAT. "Merged" still does not mean "running".\n');
  process.exit(0);
}

// ---------------------------------------------------------------------------
const mode = process.argv[2];
if (mode === '--reconcile') {
  reconcile();
} else {
  console.error('Usage: node scripts/supabase-deploy-drift.js --reconcile');
  console.error('');
  console.error('  --reconcile   Compare supabase/deploy-manifest.json against the source tree.');
  console.error('                Credential-free; runs in CI.');
  console.error('');
  console.error('  The live probe (manifest vs the deployed project) is INFRA-448 and is not');
  console.error('  implemented here — it needs a Supabase PAT that does not exist in repo');
  console.error('  secrets. Do not add a mode that silently no-ops without one.');
  process.exit(2);
}
