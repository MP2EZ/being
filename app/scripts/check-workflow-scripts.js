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
 * SECOND ASSERTION — npm script -> a file git actually has (INFRA-499). The
 * check above walks workflow -> npm script; this one walks npm script -> the
 * file it hands to an interpreter, and requires that file to be in the GIT
 * INDEX, not merely on disk. `.gitignore`'s scratch-script globs used to match
 * at every depth, so a new guard in app/scripts/ was ignored: `git add .` staged
 * nothing and said nothing, every local check passed because the file was on
 * disk, and CI went red on a tree that did not contain it (DEBUG-450). INFRA-499
 * anchored those globs to the repo root; this assertion is what makes a
 * re-introduction fail on the PR that introduces it rather than silently.
 *
 * It runs in `prepush`, and that placement is the point rather than belt-and-
 * braces: in CI the file is not on disk either, so CI already fails — just with
 * a MODULE_NOT_FOUND naming no cause. The only place the untracked-but-present
 * state exists to be caught is the author's machine, before the push.
 *
 * SCOPE of the second assertion. `app/package.json` scripts only, whose cwd is
 * unambiguously `app/`. Bare `node scripts/x.js` in a workflow step is out for
 * the same reason `npm run` indirection is the only thing scanned above — it
 * would mean modelling per-step working directories. The four such invocations
 * in .github/workflows today all name repo-root scripts/ files.
 *
 * Usage:
 *   node scripts/check-workflow-scripts.js     # verify, exit 1 on drift
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

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
 * Every file path an npm script body hands to an interpreter, app-relative.
 *
 * The required script extension is what keeps interpreter FLAGS out: `version-check`
 * is `node -e "…"` and `e2e:safety:telemetry` is `bash -c '…'`, and a bare token
 * capture would demand files named `-e` and `-c`. `.`/`source` are included because
 * a sourced helper that is not in the repository fails exactly like an executed one
 * — `e2e:safety:telemetry` reaches `scripts/e2e-telemetry.sh` that way.
 */
function extractScriptFileRefs(body) {
  const out = [];
  const re = /(?:^|[\s;&|('"`])(?:node|bash|sh|source|\.)\s+((?:\.\/)?[A-Za-z0-9_./-]+\.(?:js|cjs|mjs|sh))/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const file = m[1].replace(/^\.\//, '');
    if (!out.includes(file)) out.push(file);
  }
  return out;
}

/**
 * Every distinct file referenced by a scripts map, as REPO-relative paths with
 * the scripts that reach it.
 *
 * npm runs a script with cwd = app/, so `scripts/x.js` in app/package.json is
 * `app/scripts/x.js` to git. Getting that prefix wrong reads every file as
 * untracked, which is the one failure shape indistinguishable from a real finding.
 */
function collectScriptFileRefs(scripts) {
  const byFile = new Map();
  for (const name of Object.keys(scripts).sort()) {
    for (const file of extractScriptFileRefs(scripts[name])) {
      const key = `app/${file}`;
      if (!byFile.has(key)) byFile.set(key, []);
      byFile.get(key).push(name);
    }
  }
  return [...byFile.entries()].map(([file, refs]) => ({ file, scripts: refs }));
}

/**
 * Refs whose file is not in the git index (`untracked`) or not on disk (`missing`).
 * `exists` is injected so this stays free of I/O and testable without a fixture repo.
 */
function resolveUntracked(refs, tracked, exists) {
  const findings = [];
  for (const ref of refs) {
    if (!tracked.has(ref.file)) findings.push({ ...ref, reason: 'untracked' });
    else if (!exists(ref.file)) findings.push({ ...ref, reason: 'missing' });
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

/**
 * The subset of `paths` that git has in its index.
 *
 * One `git ls-files` for the whole set rather than `--error-unmatch` per file:
 * a pathspec-scoped listing returns only tracked entries, so the untracked ones
 * are exactly the set difference. Fails loudly if git is unavailable — a guard
 * that silently skips is worse than one that errors, because a skip reads as a
 * pass in the CI log.
 */
function listTracked(repoRoot, paths) {
  if (!paths.length) return new Set();
  const out = execFileSync('git', ['ls-files', '-z', '--', ...paths], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return new Set(out.split('\0').filter(Boolean));
}

function checkScriptFiles(scripts) {
  const repoRoot = path.resolve(APP_DIR, '..');
  const refs = collectScriptFileRefs(scripts);
  const tracked = listTracked(repoRoot, refs.map((r) => r.file));
  const findings = resolveUntracked(refs, tracked, (f) => fs.existsSync(path.join(repoRoot, f)));

  console.log(`\nScript files invoked by app/package.json: ${refs.length}`);
  if (!findings.length) {
    console.log('✅ Every one of them is in the git index.');
    return 0;
  }

  console.error(
    `\n❌ ${findings.length} npm script(s) invoke a file the repository does not have.`
  );
  if (findings.some((f) => f.reason === 'untracked')) {
    console.error(
      '   `untracked` is the silent one: the file is on disk, so every local check\n' +
        '   passes, but `git add .` never staged it and CI checks out a tree without it.'
    );
  }
  console.error('');
  for (const f of findings) {
    const via = f.scripts.slice(0, 3).join(', ') + (f.scripts.length > 3 ? `, +${f.scripts.length - 3} more` : '');
    console.error(`   ${f.file}  [${f.reason}]  invoked by: ${via}`);
  }
  console.error(
    '\n   Fix by committing the file. If `.gitignore` is swallowing it, scope the\n' +
      '   glob instead of adding a negation — see the scratch-script block there.\n'
  );
  return 1;
}

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
    // Run the second assertion anyway: two independent findings in one run beats
    // two round-trips, and neither check depends on the other's result.
    checkScriptFiles(scripts);
    return 1;
  }

  console.log('\n✅ Every npm script invoked by a loadable workflow exists.');
  return checkScriptFiles(scripts);
}

module.exports = {
  extractNpmRunNames,
  extractScriptFileRefs,
  collectScriptFileRefs,
  isScannedWorkflow,
  resolveMissing,
  resolveUntracked,
  scanWorkflowDir,
};

if (require.main === module) process.exit(main());
