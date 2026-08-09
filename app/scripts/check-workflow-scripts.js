#!/usr/bin/env node
'use strict';

/**
 * check-workflow-scripts.js — DEBUG-389
 *
 * Asserts that every `npm run <name>` invoked by a GitHub Actions workflow
 * resolves to a real script in app/package.json.
 *
 * WHY THIS EXISTS. This is the third work item on the same defect — a workflow
 * calling an npm script that was deleted out from under it (MAINT-369 →
 * DEBUG-374 → DEBUG-389). The failure mode is quiet by construction: the
 * workflow's YAML is still valid, the job still schedules, and the break only
 * surfaces as a red run in a scheduled job nobody reads. DEBUG-389's own subject
 * had failed on every scheduled run for two months before anyone noticed, and
 * was then switched off in the GitHub UI — a state git cannot see. ~40 LOC makes
 * the class fail on the PR that introduces it instead.
 *
 * WHICH FILES ARE SCANNED, AND WHY IT IS NOT AN ALLOWLIST. Only `*.yml` and
 * `*.yaml`. That is the same predicate GitHub Actions itself uses to decide what
 * to load, which is the whole point: the scanned set is defined by what can
 * actually execute, so it cannot drift away from reality the way a hand-kept
 * allowlist does.
 *
 * The practical consequence is `deploy.yml.disabled`, which invokes 10 scripts
 * that no longer exist. Those are knowingly stale — MAINT-369 documented every
 * one of them in that file's own header rather than repairing a workflow that is
 * parked pending App Store readiness. Excluding it by extension costs nothing and
 * needs no maintenance. And if anyone ever renames it back to `.yml`, this guard
 * goes red immediately with all 10 names, which turns MAINT-369's advisory header
 * into an enforced one.
 *
 * SCOPE. `npm run` only. Bare `node scripts/foo.js` and `npx <bin>` are out,
 * matching the scope INFRA-368 chose for its sibling guard: covering them means
 * modelling per-step working directories, and there is exactly one such
 * invocation in the tree today.
 *
 * COMMENTS ARE SCANNED DELIBERATELY. The regex matches `npm run` inside a YAML
 * `#` comment as readily as in a `run:` block, and that is intentional: a comment
 * naming a deleted script is documentation that has silently become false, which
 * is the same rot in a cheaper wrapper. Not stripping them also keeps this script
 * free of a YAML parser. If a comment must name a script that does not exist,
 * write the name without the literal `npm run` prefix.
 *
 * Deliberately dependency-free, for the reason INFRA-368 recorded: `js-yaml` is
 * only transitively present in node_modules and is not a declared dependency of
 * this package, so requiring it would work locally and break on a pruned install.
 * `npm run` invocations are single-line and regex-extractable; that is enough.
 *
 * Usage:
 *   node scripts/check-workflow-scripts.js     # verify, exit 1 on drift
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.resolve(__dirname, '..');
const WORKFLOW_DIR = path.resolve(APP_DIR, '..', '.github', 'workflows');
const PKG_JSON = path.join(APP_DIR, 'package.json');

// ---------------------------------------------------------------------------
// Pure helpers — exported for the meta-test. Keep them free of I/O.
// ---------------------------------------------------------------------------

/**
 * Every `npm run <name>` in a string, with its 1-indexed line.
 *
 * The required `run ` is load-bearing: without it this matches `npm ci`, the
 * install step, and the guard would demand a script named `ci` in every workflow
 * that installs dependencies.
 */
function extractNpmRunNames(text) {
  const out = [];
  text.split('\n').forEach((lineText, i) => {
    const re = /npm run ([A-Za-z0-9:_-]+)/g;
    let m;
    while ((m = re.exec(lineText)) !== null) out.push({ name: m[1], line: i + 1 });
  });
  return out;
}

/** True for files GitHub Actions would load. See the docblock on why this is the filter. */
function isScannedWorkflow(filename) {
  return /\.(yml|yaml)$/.test(filename);
}

/**
 * Names that do not resolve, following `npm run` indirection RECURSIVELY.
 *
 * The recursion is not defensive. CI reaches most suites through an alias chain
 * — `validate:crisis-authority` → `test:crisis-quick`, `validate:clinical-authority`
 * → `validate:clinical-complete` → `test:clinical` — so a leaf-only check calls a
 * broken chain healthy as long as its first link exists. `chain` is reported so
 * the failure names the link that actually broke, not just the entry point. The
 * `seen` set guards a self- or mutually-referential script.
 */
function resolveMissing(invocations, scripts) {
  const findings = [];

  const walk = (name, chain, seen) => {
    if (seen.has(name)) return null;
    seen.add(name);
    const body = scripts[name];
    if (body === undefined) return chain;
    for (const next of extractNpmRunNames(body)) {
      const broken = walk(next.name, [...chain, next.name], seen);
      if (broken) return broken;
    }
    return null;
  };

  for (const { name, line } of invocations) {
    const chain = walk(name, [name], new Set());
    if (chain) findings.push({ name, line, chain });
  }
  return findings;
}

/**
 * Scan a workflow directory. Returns one finding per unresolvable invocation,
 * each carrying `file`, `name`, `line` and the broken `chain`.
 */
function scanWorkflowDir(dir, scripts) {
  const findings = [];
  for (const file of fs.readdirSync(dir).sort()) {
    if (!isScannedWorkflow(file)) continue;
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const f of resolveMissing(extractNpmRunNames(text), scripts)) {
      findings.push({ file, ...f });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

function main() {
  const scripts = JSON.parse(fs.readFileSync(PKG_JSON, 'utf8')).scripts || {};
  const scanned = fs.readdirSync(WORKFLOW_DIR).filter(isScannedWorkflow).sort();
  const findings = scanWorkflowDir(WORKFLOW_DIR, scripts);

  console.log(`Workflows scanned: ${scanned.length}  (${scanned.join(', ')})`);
  const skipped = fs.readdirSync(WORKFLOW_DIR).filter((f) => !isScannedWorkflow(f)).sort();
  if (skipped.length) {
    console.log(`Not loaded by Actions, so not scanned: ${skipped.join(', ')}`);
  }

  if (findings.length) {
    console.error(
      `\n❌ ${findings.length} workflow invocation(s) name an npm script that does not exist.\n` +
        '   The workflow is still valid YAML and will still schedule — it just fails\n' +
        '   at that step, in a run nobody is watching.\n'
    );
    for (const f of findings) {
      const via = f.chain.length > 1 ? `  (via ${f.chain.join(' → ')})` : '';
      console.error(`   ${f.file}:${f.line}  npm run ${f.name}${via}`);
    }
    console.error(
      '\n   Fix the workflow, restore the script, or — if the workflow is parked —\n' +
        '   rename it so Actions no longer loads it.\n'
    );
    return 1;
  }

  console.log('\n✅ Every npm script invoked by a loadable workflow exists.');
  return 0;
}

module.exports = {
  extractNpmRunNames,
  isScannedWorkflow,
  resolveMissing,
  scanWorkflowDir,
};

if (require.main === module) process.exit(main());
