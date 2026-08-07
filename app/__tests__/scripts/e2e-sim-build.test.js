/**
 * DEBUG-315 — e2e-sim-build.sh must fail loudly, and must never install a stale build.
 *
 * Why this harness exists in this shape:
 *
 * The work item originally alleged "the script exits 0 when the EAS local build fails,"
 * diagnosed as a missing `set -euo pipefail`. That diagnosis was falsified during
 * planning: `set -euo pipefail` has been on line 25 since the script's first commit
 * (faf1f68c), eas-cli exits 1 on the dirty-tree abort, and running the stated repro at
 * unmodified HEAD returned exit 1. The most likely cause of the original observation is
 * a PIPE AT THE CALL SITE (`... | tee build.log`), which masks status unless the caller
 * sets pipefail — documented in docs/testing/e2e-maestro.md rather than fixable here.
 *
 * What IS real, and what these tests pin:
 *   1. STALE-ARTIFACT REUSE — $OUT is a fixed path that was never cleared or
 *      freshness-checked, so an `eas` that exits 0 without producing an artifact caused
 *      the PREVIOUS run's tarball to be extracted, installed, and reported as success.
 *      That is the actual "Maestro ran green against a stale build" failure the user
 *      story is about, and it is strictly stronger than the scenario originally named.
 *   2. NO STAGE NAMED ON FAILURE — `set -e` deaths print the failing tool's stderr, not
 *      a stage name, so a run could die with no ❌ line at all.
 *   3. SIGPIPE ON ARTIFACT DISCOVERY — `find ... | head -1` under `pipefail` on macOS
 *      system bash 3.2 returns 141 and killed the script printing nothing.
 *
 * Real `eas` is never invoked: it needs credentials, a booted simulator, and 10-15
 * minutes. Instead `git`, `eas` and `xcrun` are PATH-shimmed and $TMPDIR is redirected
 * into a sandbox, so the REAL script runs end-to-end against controllable stages. This
 * runs on ubuntu-latest in milliseconds.
 *
 * INFRA-329 added the clean-tree pre-flight, and with it the `git` shim. The shim is not
 * optional decoration: the script now runs `git status --porcelain` on the real repo, so
 * without it every test in this file would abort on any dirty working tree — including
 * the tree of whoever is running the suite. Shimming `git` also lets the dirty-tree stage
 * itself be covered here rather than left to memory.
 *
 * What is still MANUAL: the genuine end-to-end run against real eas-cli and a real
 * simulator. CI is 100% ubuntu-latest, so no test here proves EAS actually honours
 * requireCommit — only that the script refuses to reach EAS with a dirty tree.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '../../scripts/e2e-sim-build.sh');

/** Absolute path of the tarball the script builds to, given a sandbox TMPDIR. */
const outPath = (tmp) => path.join(tmp, 'being-e2e-sim.tar.gz');

/** Write an executable stub onto the shimmed PATH. */
function writeStub(dir, name, body) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 });
  return p;
}

/**
 * Build a real .tar.gz containing one or more `<name>.app` directories, so the script's
 * extraction and artifact-discovery stages operate on genuine input.
 */
function makeAppTarball(dest, appNames = ['Being.app']) {
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-stage-'));
  for (const name of appNames) {
    const appDir = path.join(staging, name);
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(path.join(appDir, 'Info.plist'), '<plist/>');
  }
  const res = spawnSync('tar', ['-czf', dest, '-C', staging, ...appNames], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`fixture tar failed: ${res.stderr}`);
  fs.rmSync(staging, { recursive: true, force: true });
}

/**
 * Bash body for the `git` stub, covering the three states the clean-tree pre-flight
 * distinguishes. The real script calls `git rev-parse --show-toplevel` and then
 * `git -C <root> status --porcelain`, so the stub dispatches on the subcommand found
 * anywhere in the args rather than on $1 (which is `-C` for the second call).
 */
function gitStubBody(state) {
  const dispatch = [
    'MODE=""',
    'for a in "$@"; do case "$a" in rev-parse) MODE=rev ;; status) MODE=status ;; esac; done',
  ];
  if (state === 'not-a-repo') {
    return [...dispatch, 'echo "fatal: not a git repository" >&2', 'exit 128'].join('\n');
  }
  const statusOutput = state === 'dirty' ? 'echo " M app/src/features/learn/Dirty.tsx"' : ':';
  return [
    ...dispatch,
    'if [ "$MODE" = "rev" ]; then echo "/tmp/fake-repo-root"; exit 0; fi',
    `if [ "$MODE" = "status" ]; then ${statusOutput}; exit 0; fi`,
    'exit 0',
  ].join('\n');
}

/**
 * Run the real script with `git`, `eas` and `xcrun` stubbed.
 *
 * @param easBody   bash body for the `eas` stub (controls the build stage)
 * @param opts.installExits  exit code for `xcrun simctl install`
 * @param opts.seedStaleTarball  app names to pre-seed at $OUT before the run, simulating
 *                               a leftover artifact from a previous run
 * @param opts.gitState  'clean' (default) | 'dirty' | 'not-a-repo'
 */
function runScript(easBody, opts = {}) {
  const { installExits = 0, seedStaleTarball = null, gitState = 'clean' } = opts;

  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-sandbox-'));
  const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-stubs-'));
  const installMarker = path.join(sandbox, 'install-ran.txt');
  const easMarker = path.join(sandbox, 'eas-ran.txt');

  if (seedStaleTarball) makeAppTarball(outPath(sandbox), seedStaleTarball);

  writeStub(stubs, 'git', gitStubBody(gitState));
  // Record that the build stage was reached at all, so a pre-flight can be proven to
  // abort BEFORE eas rather than merely to fail somewhere.
  writeStub(stubs, 'eas', `echo "$@" > "${easMarker}"\n${easBody}`);

  // `xcrun` must satisfy the booted-sim precondition, tolerate the intentional
  // `uninstall ... || true`, and record whether `install` was ever reached.
  writeStub(
    stubs,
    'xcrun',
    [
      'if [ "$1" = "simctl" ] && [ "$2" = "list" ]; then',
      '  echo "iPhone 16 Pro (ABC-123) (Booted)"; exit 0',
      'fi',
      'if [ "$1" = "simctl" ] && [ "$2" = "uninstall" ]; then exit 0; fi',
      'if [ "$1" = "simctl" ] && [ "$2" = "install" ]; then',
      `  echo "$@" > "${installMarker}"; exit ${installExits}`,
      'fi',
      'exit 0',
    ].join('\n')
  );

  const res = spawnSync('bash', [SCRIPT], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${stubs}:${process.env.PATH}`, TMPDIR: sandbox },
  });

  return {
    status: res.status,
    output: `${res.stdout || ''}${res.stderr || ''}`,
    installRan: fs.existsSync(installMarker),
    installArgs: fs.existsSync(installMarker) ? fs.readFileSync(installMarker, 'utf8') : null,
    easRan: fs.existsSync(easMarker),
    outExists: fs.existsSync(outPath(sandbox)),
  };
}

/** An `eas` stub that writes a genuine artifact to the --output path and succeeds. */
const EAS_SUCCEEDS = [
  'OUT=""; while [ $# -gt 0 ]; do if [ "$1" = "--output" ]; then OUT="$2"; fi; shift; done',
  'mkdir -p "$(dirname "$OUT")"',
  'STAGE="$(mktemp -d)"; mkdir -p "$STAGE/Being.app"; echo "<plist/>" > "$STAGE/Being.app/Info.plist"',
  'tar -czf "$OUT" -C "$STAGE" Being.app',
  'exit 0',
].join('\n');

/** The real dirty-tree abort: eas prints its message and exits non-zero. */
const EAS_DIRTY_TREE_ABORT = [
  'echo "Commit all changes. Aborting..." >&2',
  'echo "Error: build command failed." >&2',
  'exit 1',
].join('\n');

/** The dangerous case: eas reports success but produces NO artifact. */
const EAS_SUCCEEDS_WITHOUT_ARTIFACT = 'echo "Build finished."; exit 0';

describe('e2e-sim-build.sh — clean-tree pre-flight (INFRA-329)', () => {
  test('aborts before invoking EAS when the working tree is dirty', () => {
    // The point of the guard: eas.json sets requireCommit:true, so a dirty tree was
    // already fatal — but only ~30s in, after EAS startup. Failing here costs
    // milliseconds. `easRan` is the assertion that matters; a non-zero exit alone
    // would also be satisfied by aborting later, which is the behaviour being fixed.
    const r = runScript(EAS_SUCCEEDS, { gitState: 'dirty' });
    expect(r.status).not.toBe(0);
    expect(r.easRan).toBe(false);
    expect(r.installRan).toBe(false);
    expect(r.output).toMatch(/❌/);
    expect(r.output).toMatch(/clean-tree/i);
  });

  test('names the offending paths so you know what to commit', () => {
    const r = runScript(EAS_SUCCEEDS, { gitState: 'dirty' });
    expect(r.output).toMatch(/Dirty\.tsx/);
  });

  test('proceeds to the build when the tree is clean', () => {
    const r = runScript(EAS_SUCCEEDS, { gitState: 'clean' });
    expect(r.status).toBe(0);
    expect(r.easRan).toBe(true);
  });

  test('does not block the build when run outside a git work tree', () => {
    // A missing or non-repo git must not make the script unusable: the pre-flight is a
    // fast-fail convenience, and EAS still enforces requireCommit on its own.
    const r = runScript(EAS_SUCCEEDS, { gitState: 'not-a-repo' });
    expect(r.status).toBe(0);
    expect(r.easRan).toBe(true);
    expect(r.output).toMatch(/skipping the clean-tree pre-flight/i);
  });
});

describe('e2e-sim-build.sh — failure propagation', () => {
  test('exits non-zero and names the build stage when the EAS build fails', () => {
    const r = runScript(EAS_DIRTY_TREE_ABORT);
    expect(r.status).not.toBe(0);
    expect(r.output).toMatch(/❌/);
    expect(r.output).toMatch(/build/i);
  });

  test('does not reach the install stage when the build fails', () => {
    const r = runScript(EAS_DIRTY_TREE_ABORT);
    expect(r.installRan).toBe(false);
  });

  test('exits non-zero and names the install stage when sim install fails', () => {
    const r = runScript(EAS_SUCCEEDS, { installExits: 1 });
    expect(r.status).not.toBe(0);
    expect(r.output).toMatch(/❌/);
    expect(r.output).toMatch(/install/i);
  });

  test('exits non-zero when the artifact contains no .app', () => {
    const easEmptyTarball = [
      'OUT=""; while [ $# -gt 0 ]; do if [ "$1" = "--output" ]; then OUT="$2"; fi; shift; done',
      'STAGE="$(mktemp -d)"; echo hi > "$STAGE/notanapp.txt"',
      'tar -czf "$OUT" -C "$STAGE" notanapp.txt',
      'exit 0',
    ].join('\n');
    const r = runScript(easEmptyTarball);
    expect(r.status).not.toBe(0);
    expect(r.output).toMatch(/❌/);
    expect(r.installRan).toBe(false);
  });
});

describe('e2e-sim-build.sh — stale-artifact protection (the real DEBUG-315 defect)', () => {
  test('refuses to install a previous run\'s tarball when the build produces no artifact', () => {
    // Pre-seed $OUT exactly as a prior successful run would have left it, then have the
    // build "succeed" without writing anything. Before the fix, tar happily extracted the
    // stale archive, installed it, printed the success line and exited 0 — the Maestro
    // gate would then run green against a stale binary.
    const r = runScript(EAS_SUCCEEDS_WITHOUT_ARTIFACT, { seedStaleTarball: ['Being.app'] });
    expect(r.status).not.toBe(0);
    expect(r.output).toMatch(/❌/);
    expect(r.installRan).toBe(false);
  });

  test('clears any pre-existing artifact before building, so success implies a fresh build', () => {
    // Same seeding, but the build fails outright. The stale tarball must not survive as
    // a trap for a later run that might mistake it for fresh output.
    const r = runScript(EAS_DIRTY_TREE_ABORT, { seedStaleTarball: ['Being.app'] });
    expect(r.status).not.toBe(0);
    expect(r.outExists).toBe(false);
  });
});

describe('e2e-sim-build.sh — artifact discovery', () => {
  test('installs the .app on the happy path', () => {
    const r = runScript(EAS_SUCCEEDS);
    expect(r.status).toBe(0);
    expect(r.installRan).toBe(true);
    expect(r.installArgs).toMatch(/Being\.app/);
    expect(r.output).toMatch(/✅/);
  });

  test('survives an artifact containing several .app directories', () => {
    // Related to the `find ... | head -1` SIGPIPE (under `pipefail` on macOS system bash
    // 3.2, head closing early made the pipeline return 141 and killed the script
    // silently). NOTE this case passes at HEAD too: the SIGPIPE only reproduces against a
    // wide tree where find is still writing when head exits, and this fixture is small.
    // So this is a guard on multi-.app selection, NOT a reproduction of that bug — the
    // `-print -quit` fix removes the pipeline entirely and is the actual remedy.
    const easManyApps = [
      'OUT=""; while [ $# -gt 0 ]; do if [ "$1" = "--output" ]; then OUT="$2"; fi; shift; done',
      'STAGE="$(mktemp -d)"',
      'for n in A B C D E F G H; do mkdir -p "$STAGE/$n.app"; echo x > "$STAGE/$n.app/Info.plist"; done',
      'tar -czf "$OUT" -C "$STAGE" .',
      'exit 0',
    ].join('\n');
    const r = runScript(easManyApps);
    expect(r.status).toBe(0);
    expect(r.installRan).toBe(true);
  });
});
