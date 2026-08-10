/**
 * INFRA-383 — e2e-sim-build.sh builds the Maestro safety gate's target with
 * `expo run:ios --configuration Release`, not `eas build --local`.
 *
 * Why the script changed at all: `eas build --local` cannot cache. eas-cli 19.0.8 skips
 * the whole RESTORE_CACHE phase for local builds (`if (ctx.isLocal) return` in
 * @expo/build-tools/dist/builders/ios.js) and puts derivedDataPath inside a per-run UUID
 * temp dir it deletes afterward, so every object file recompiles from zero — 10-15 min,
 * every run. Measured replacement: 11m08s cold, 1m03s warm.
 *
 * INFRA-216 claimed only the EAS `e2e-sim` profile could produce a launcher-free build.
 * That was false. Expo autolinking marks expo-dev-launcher/expo-dev-menu `debugOnly: true`,
 * so Pods-Being.release.xcconfig never links them and ExpoModulesProvider.swift's Release
 * branch of getReactDelegateHandlers() is an empty array. EAS's `developmentClient:false`
 * only *defaults* buildConfiguration, and e2e-sim sets Release explicitly — the flag was
 * unreachable. The likely misdiagnosis: INFRA-216's documented verification command
 * `npm run ios --configuration Release` omits the `--` separator, so the flag went to npm
 * and it built Debug. That failure mode will recur; hence this comment.
 *
 * WHAT THESE TESTS PIN, and why each is load-bearing rather than decorative.
 *
 * Dropping EAS moves guarantees it supplied structurally into this script. Each one is a
 * FALSE-GREEN vector — a gate that passes while testing the wrong binary — which is
 * strictly worse than a gate that fails:
 *
 *   1. LAUNCHER-FREENESS was `developmentClient:false`. A launcher build does not merely
 *      flake; it can pass by coincidence via the guessed-coordinate tap in
 *      _legal-and-onboarding.yaml, producing a green crisis-path gate that is evidence of
 *      nothing. Asserted fail-closed on three signals.
 *   2. FRESHNESS was `requireCommit` + the $OUT tarball assert. The new hazard is Xcode's
 *      dependency analysis deciding the React Native bundling phase is up to date and
 *      reusing a stale main.jsbundle inside an otherwise-successful build. With
 *      --no-bundler there is no Metro to notice. @expo/fingerprint CANNOT cover this: it
 *      does not hash app/src/**. Hence destroy-then-assert-newer, the same shape as the
 *      DEBUG-315 remedy it replaces.
 *   3. CNG REGENERATION was implicit — EAS prebuilt every build. `expo run:ios` prebuilds
 *      ONLY when ios/ is absent (@expo/cli .../run/ensureNativeProject.js:40). So an
 *      app.json edit with ios/ present yields a binary whose Info.plist does not reflect
 *      it, silently. On this repo that lands on LSApplicationQueriesSchemes — the 988 dial
 *      path. This is the one regression the swap would have introduced outright.
 *   4. FAIL-CLOSED INSTALL. The old script uninstalled AFTER the build, so a failed build
 *      left the previous binary installed and /b-close Step 2.5.4's
 *      `simctl listapps | grep fyi.being.app` greenlit running flows against it. That hole
 *      predates this change; it is fixed here by uninstalling first and trapping.
 *
 * The INFRA-329 clean-tree pre-flight is deliberately UNCHANGED. requireCommit was the only
 * thing forcing the installed binary to correspond to a commit, and 1-minute rebuilds make
 * dirty-tree iteration routine — relaxing the pre-flight in the same change that removes
 * requireCommit would convert "gate ran against a never-committed tree" from impossible to
 * routine. It relaxes only once the provenance marker replaces the guarantee (follow-up).
 *
 * Real `expo`/`xcodebuild` is never invoked: it needs a booted simulator and minutes.
 * `git`, `npx`, `xcrun`, `otool` and `plutil` are PATH-shimmed and the project dir is a
 * sandbox, so the REAL script runs end-to-end against controllable stages. `node` is NOT
 * shimmed — the eas.json env merge is genuinely exercised, including `extends` inheritance.
 * This runs on ubuntu-latest in milliseconds.
 *
 * What is still MANUAL: the genuine end-to-end run against a real simulator. CI is 100%
 * ubuntu-latest, so nothing here proves Xcode actually rebuilds the bundle — only that the
 * script refuses to proceed when the evidence says it didn't.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REAL_SCRIPT = path.resolve(__dirname, '../../scripts/e2e-sim-build.sh');
const REAL_SAFETY = path.resolve(__dirname, '../../scripts/e2e-safety.sh');
const REAL_PROVENANCE = path.resolve(__dirname, '../../scripts/e2e-provenance.js');
const BUNDLE_ID = 'fyi.being.app';
const PRODUCT_REL = 'ios/build/Build/Products/Release-iphonesimulator';
const MARKER_NAME = '.e2e-provenance.json';

/**
 * INFRA-384 — the git shim is driven by state files rather than by a fixed string, so a
 * test can MOVE THE TREE between the build and the gate run. That is the whole subject:
 * provenance is about two observations of the same repo at different times.
 */
const GIT_STATE_DIR = '.gitstate';
const DEFAULT_GIT_STATE = {
  head: '1111111111111111111111111111111111111111',
  branch: 'chore/INFRA-384-test',
  status: '',
  diff: '',
  untracked: '',
};

function writeGitState(root, state) {
  const dir = path.join(root, GIT_STATE_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const merged = { ...DEFAULT_GIT_STATE, ...state };
  for (const [k, v] of Object.entries(merged)) {
    fs.writeFileSync(path.join(dir, k), v === '' ? '' : `${v}\n`);
  }
}

/** Write an executable stub onto the shimmed PATH. */
function writeStub(dir, name, body) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 });
  return p;
}

/**
 * A minimal but REAL eas.json carrying the `extends` chain the script must resolve.
 * e2e-sim declares 2 keys literally and inherits 3 more from production; a script that
 * reads `build.e2e-sim.env` without following `extends` silently loses the inherited ones.
 */
const EAS_JSON = {
  cli: { version: '>= 12.14.1', appVersionSource: 'remote', requireCommit: true },
  build: {
    production: {
      ios: { simulator: false, buildConfiguration: 'Release' },
      env: { BUILD_TYPE: 'production', CRISIS_MONITORING: 'true', NEW_ARCHITECTURE: 'true' },
    },
    'e2e-sim': {
      extends: 'production',
      developmentClient: false,
      ios: { simulator: true, buildConfiguration: 'Release' },
      env: {
        EXPO_PUBLIC_E2E_SEED_ONBOARDED: 'true',
        EXPO_PUBLIC_FEATURE_FLAGS: 'cloud_sync:false,bug_reporting:true,voice_journal:true',
      },
    },
  },
};

/** The competing flag string from .env.production, which must NOT win. */
const ENV_PRODUCTION_FLAGS = 'voice_journal:false,practice_haptics:false';

/**
 * Build a sandbox project dir containing everything the script reads, plus a copy of the
 * script at the same relative depth (scripts/) so its `cd "$(dirname "$0")/.."` lands here.
 */
function makeProject(opts = {}) {
  const {
    iosExists = true,
    cngStamp = 'current', // 'current' | 'stale' | 'absent'
    appJsonSchemes = ['tel', 'sms'],
  } = opts;

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-proj-'));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.copyFileSync(REAL_SCRIPT, path.join(root, 'scripts', 'e2e-sim-build.sh'));
  // INFRA-384: the build script now shells out to the provenance helper, and the gate
  // script is exercised by runSafety() below. Both are the REAL files — `node` is not
  // shimmed, so the provenance logic runs for real rather than being stubbed.
  fs.copyFileSync(REAL_PROVENANCE, path.join(root, 'scripts', 'e2e-provenance.js'));
  fs.copyFileSync(REAL_SAFETY, path.join(root, 'scripts', 'e2e-safety.sh'));

  fs.writeFileSync(path.join(root, 'eas.json'), JSON.stringify(EAS_JSON, null, 2));
  fs.writeFileSync(
    path.join(root, 'app.json'),
    JSON.stringify({ expo: { ios: { infoPlist: { LSApplicationQueriesSchemes: appJsonSchemes } } } })
  );
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'app' }));
  fs.mkdirSync(path.join(root, 'plugins'), { recursive: true });
  fs.writeFileSync(path.join(root, 'plugins', 'withAppGroupsEntitlement.js'), '// plugin');
  fs.mkdirSync(path.join(root, 'patches'), { recursive: true });
  fs.writeFileSync(path.join(root, 'patches', 'expo-modules-jsi+56.0.7.patch'), '# patch');
  fs.writeFileSync(path.join(root, '.env.production'), `EXPO_PUBLIC_FEATURE_FLAGS=${ENV_PRODUCTION_FLAGS}\n`);

  if (iosExists) {
    fs.mkdirSync(path.join(root, PRODUCT_REL), { recursive: true });
    // The stamp marks when ios/ was last generated. The script compares its mtime against
    // the newest CNG input; anything newer means the generated project is behind.
    // Written last, so it is naturally newer than the inputs above => 'current'.
    const stamp = path.join(root, 'ios', '.cng-stamp');
    fs.writeFileSync(stamp, 'generated');
    if (cngStamp === 'stale') fs.utimesSync(stamp, new Date(946684800000), new Date(946684800000));
  }

  // Two `safety`-tagged flows, one device-only, one helper — enough to pin the tag filter,
  // the explicit-name path, and the helper exclusion.
  const maestro = path.join(root, '.maestro');
  fs.mkdirSync(maestro, { recursive: true });
  fs.writeFileSync(path.join(maestro, 'q9-single-alert.yaml'), 'tags:\n  - safety\n');
  fs.writeFileSync(path.join(maestro, 'crisis-button-reachability.yaml'), 'tags:\n  - safety\n');
  fs.writeFileSync(path.join(maestro, 'crisis-988-dial.yaml'), 'tags:\n  - safety-device-only\n');
  fs.writeFileSync(path.join(maestro, '_legal-and-onboarding.yaml'), 'tags:\n  - helper\n');

  writeGitState(root, opts.git || {});
  return root;
}

/**
 * The git shim, shared by runScript() and runSafety().
 *
 * Dispatches on the ACTUAL argument shape rather than on a bare token. The previous
 * version matched `rev-parse` alone, so `rev-parse HEAD` returned the toplevel path, and
 * `diff HEAD` fell through to a silent `exit 0`. Both are inputs the provenance helper
 * depends on, and both were stubbed WRONG by default — the kind of shim bug that makes a
 * test pass while proving nothing.
 *
 * Answers are read from files on every invocation, so a test can mutate the tree between
 * the build and the gate run without rebuilding the shim.
 */
function writeGitStub(stubs, root, mode = 'repo') {
  if (mode === 'not-a-repo') {
    return writeStub(stubs, 'git', ['echo "fatal: not a git repository" >&2', 'exit 128'].join('\n'));
  }
  const S = path.join(root, GIT_STATE_DIR);
  return writeStub(
    stubs,
    'git',
    [
      // Strip a leading `-C <path>` so `git -C "$REPO_ROOT" status` dispatches identically.
      'if [ "${1:-}" = "-C" ]; then shift 2; fi',
      'case "${1:-}" in',
      '  rev-parse)',
      '    case "${2:-}" in',
      `      --show-toplevel) echo "${root}" ;;`,
      `      --abbrev-ref)    cat "${S}/branch" ;;`,
      `      HEAD)            cat "${S}/head" ;;`,
      `      *)               echo "${root}" ;;`,
      '    esac ;;',
      `  status)   cat "${S}/status" ;;`,
      `  diff)     cat "${S}/diff" ;;`,
      `  ls-files) cat "${S}/untracked" ;;`,
      '  *) : ;;',
      'esac',
      'exit 0',
    ].join('\n')
  );
}

/**
 * Run the real script against a sandbox project with all external tools shimmed.
 *
 * @param opts.buildExits        exit code for `npx expo run:ios`
 * @param opts.buildProducesApp  whether the build writes a .app into the product dir
 * @param opts.bundleState       'fresh' | 'stale' | 'missing' — state of main.jsbundle
 * @param opts.otoolDevLauncher  make `otool -L` report dev-launcher linkage
 * @param opts.frameworkDevLauncher  place an EXDevLauncher framework in the .app
 * @param opts.bundleFlags       flag string baked into the fake main.jsbundle
 * @param opts.plistSchemes      what `plutil` reports for LSApplicationQueriesSchemes
 * @param opts.gitState          'clean' | 'dirty' | 'not-a-repo'
 * @param opts.seedStaleApp      pre-seed a .app in the product dir from a "previous run"
 */
function runScript(opts = {}) {
  const {
    buildExits = 0,
    buildProducesApp = true,
    bundleState = 'fresh',
    otoolDevLauncher = false,
    frameworkDevLauncher = false,
    bundleFlags = 'cloud_sync:false,bug_reporting:true,voice_journal:true',
    plistSchemes = ['tel', 'sms'],
    gitState = 'clean',
    seedStaleApp = false,
    iosExists = true,
    cngStamp = 'current',
    statDialect = 'native',
  } = opts;

  const root = makeProject({ iosExists, cngStamp });
  const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-stubs-'));
  const container = path.join(root, 'container', `${BUNDLE_ID}.app`);
  const trace = path.join(root, 'trace.log');
  fs.writeFileSync(trace, '');

  if (seedStaleApp) {
    const stale = path.join(root, PRODUCT_REL, 'Being.app');
    fs.mkdirSync(stale, { recursive: true });
    fs.writeFileSync(path.join(stale, 'main.jsbundle'), 'STALE BUNDLE');
  }

  // --- git: INFRA-329 pre-flight surface + INFRA-384 fingerprint inputs -----------------
  if (gitState === 'dirty') {
    writeGitState(root, { status: ' M app/src/features/learn/Dirty.tsx' });
  }
  writeGitStub(stubs, root, gitState === 'not-a-repo' ? 'not-a-repo' : 'repo');

  // --- npx: stands in for `expo prebuild` and `expo run:ios` ----------------------------
  // Records which subcommand ran so ordering and conditionality can be asserted, and
  // materialises the build product + installed container the way a real build would.
  const buildBody = [
    `echo "npx $@" >> "${trace}"`,
    'SUB=""',
    'for a in "$@"; do case "$a" in prebuild) SUB=prebuild ;; run:ios) SUB=run ;; esac; done',
    'if [ "$SUB" = "prebuild" ]; then',
    `  mkdir -p "${path.join(root, PRODUCT_REL)}"`,
    '  exit 0',
    'fi',
    'if [ "$SUB" = "run" ]; then',
    // Env parity is observable here: the script must scope the vars to THIS invocation.
    `  echo "SEED=\${EXPO_PUBLIC_E2E_SEED_ONBOARDED:-unset} FLAGS=\${EXPO_PUBLIC_FEATURE_FLAGS:-unset} BUILD_TYPE=\${BUILD_TYPE:-unset} NODE_ENV=\${NODE_ENV:-unset}" >> "${trace}"`,
    `  if [ "${buildExits}" != "0" ]; then echo "xcodebuild failed" >&2; exit ${buildExits}; fi`,
    ...(buildProducesApp
      ? [
          `  APP="${path.join(root, PRODUCT_REL, 'Being.app')}"`,
          '  mkdir -p "$APP/Frameworks"',
          '  echo "<plist/>" > "$APP/Info.plist"',
          ...(bundleState === 'missing'
            ? []
            : [`  printf 'JSBUNDLE ${bundleFlags}' > "$APP/main.jsbundle"`]),
          ...(bundleState === 'stale'
            ? ['  touch -t 200001010000 "$APP/main.jsbundle"']
            : []),
          ...(frameworkDevLauncher ? ['  mkdir -p "$APP/Frameworks/EXDevLauncher.framework"'] : []),
          '  echo "binary" > "$APP/Being"',
          // expo run:ios installs and launches atomically — mirror that.
          `  rm -rf "${container}"; mkdir -p "$(dirname "${container}")"`,
          // -p: simctl install preserves mtimes, and the freshness assert reads them.
          `  cp -Rp "$APP" "${container}"`,
          `  echo "installed" >> "${trace}"`,
        ]
      : []),
    '  exit 0',
    'fi',
    'exit 0',
  ].join('\n');
  writeStub(stubs, 'npx', buildBody);

  // --- xcrun simctl --------------------------------------------------------------------
  writeStub(
    stubs,
    'xcrun',
    [
      'if [ "$1" = "simctl" ] && [ "$2" = "list" ]; then',
      '  echo "iPhone 16 Plus (ABC-123) (Booted)"; exit 0',
      'fi',
      'if [ "$1" = "simctl" ] && [ "$2" = "uninstall" ]; then',
      `  echo "uninstall" >> "${trace}"; rm -rf "${container}"; exit 0`,
      'fi',
      'if [ "$1" = "simctl" ] && [ "$2" = "get_app_container" ]; then',
      `  if [ -d "${container}" ]; then echo "${container}"; exit 0; fi`,
      '  echo "No such app" >&2; exit 1',
      'fi',
      'exit 0',
    ].join('\n')
  );

  writeStub(
    stubs,
    'otool',
    otoolDevLauncher
      ? 'echo "\t@rpath/EXDevLauncher.framework/EXDevLauncher (compatibility version 1.0.0)"'
      : 'echo "\t/usr/lib/libSystem.B.dylib (compatibility version 1.0.0)"'
  );

  writeStub(stubs, 'plutil', `echo '${JSON.stringify(plistSchemes)}'`);

  // Optionally force GNU `stat` semantics so the BSD-vs-GNU divergence is reproducible on
  // macOS instead of only on CI. GNU's `-f` is --file-system and takes NO format argument,
  // so `stat -f %m file` treats `%m` as a second FILE operand: it fails on that operand
  // (non-zero) while STILL printing filesystem info for `file`. A naive
  // `stat -f %m x || stat -c %Y x` therefore emits BOTH, yielding a multi-line value and an
  // integer-expression error under `set -e`. This shim reproduces exactly that.
  if (statDialect === 'gnu') {
    writeStub(
      stubs,
      'stat',
      [
        'if [ "$1" = "-c" ]; then',
        '  shift 2', // drop -c and the format
        // Compute mtime with node, not the real `stat`. Delegating to /usr/bin/stat would
        // make this shim platform-specific in exactly the way it exists to test: BSD
        // syntax breaks on the Linux runner and vice versa. node is present on both.
        '  for f in "$@"; do',
        '    node -e \'process.stdout.write(String(Math.floor(require("fs").statSync(process.argv[1]).mtimeMs/1000))+"\\n")\' "$f"',
        '  done',
        '  exit 0',
        'fi',
        'if [ "$1" = "-f" ]; then',
        '  shift',
        '  rc=0',
        '  for a in "$@"; do',
        '    case "$a" in',
        '      %*) echo "stat: cannot read file system information for $a" >&2; rc=1 ;;',
        '      *)  echo "  File: \\"$a\\"  ID: 0 Namelen: 255 Type: apfs" ;;',
        '    esac',
        '  done',
        '  exit $rc',
        'fi',
        'exit 1',
      ].join('\n')
    );
  }

  const res = spawnSync('bash', [path.join(root, 'scripts', 'e2e-sim-build.sh')], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${stubs}:${process.env.PATH}`,
      CI: '', // export:embed silently discards --reset-cache when CI is set
    },
  });

  const traceText = fs.readFileSync(trace, 'utf8');
  return {
    status: res.status,
    output: `${res.stdout || ''}${res.stderr || ''}`,
    trace: traceText,
    buildRan: /npx .*run:ios/.test(traceText),
    prebuildRan: /npx .*prebuild/.test(traceText),
    installed: fs.existsSync(container),
    markerExists: fs.existsSync(path.join(container, MARKER_NAME)),
    marker: (() => {
      try {
        return JSON.parse(fs.readFileSync(path.join(container, MARKER_NAME), 'utf8'));
      } catch {
        return null;
      }
    })(),
    container,
    stubs,
    root,
  };
}

/**
 * Run the REAL e2e-safety.sh against a sandbox left behind by runScript().
 *
 * Reuses that project and its stub dir so the gate observes exactly the container the
 * build produced — which is the point: provenance is a claim about two observations of
 * one repo, and faking either half would test nothing.
 *
 * @param built        the return value of runScript()
 * @param opts.flows   explicit flow names (the /b-close per-flow path); [] = tagged suite
 * @param opts.git     git-state mutations applied BEFORE the gate runs (moves the tree)
 * @param opts.env     extra env (e.g. E2E_REQUIRE_CLEAN_PROVENANCE)
 * @param opts.maestroExits exit code for every `maestro test`
 */
function runSafety(built, opts = {}) {
  const { flows = [], git: gitMutation = null, env = {}, maestroExits = 0 } = opts;
  const trace = path.join(built.root, 'safety-trace.log');
  fs.writeFileSync(trace, '');

  // maestro, pkill and sleep are all shimmed. `sleep` MATTERS: the real loop sleeps 8s
  // between flows to let the XCUITest driver settle, which would make this suite take
  // 16s+ instead of milliseconds.
  writeStub(built.stubs, 'maestro', [`echo "maestro $@" >> "${trace}"`, `exit ${maestroExits}`].join('\n'));
  writeStub(built.stubs, 'pkill', 'exit 0');
  writeStub(built.stubs, 'sleep', 'exit 0');

  if (gitMutation) writeGitState(built.root, gitMutation);

  const res = spawnSync('bash', [path.join(built.root, 'scripts', 'e2e-safety.sh'), ...flows], {
    encoding: 'utf8',
    cwd: built.root,
    env: { ...process.env, PATH: `${built.stubs}:${process.env.PATH}`, ...env },
  });

  const traceText = fs.readFileSync(trace, 'utf8');
  return {
    status: res.status,
    output: `${res.stdout || ''}${res.stderr || ''}`,
    trace: traceText,
    flowsRun: (traceText.match(/maestro test/g) || []).length,
  };
}

// =====================================================================================

describe('e2e-sim-build.sh — clean-tree pre-flight (relaxed by INFRA-384)', () => {
  test('BUILDS from a dirty tree, warning rather than aborting', () => {
    // Relaxed only once the provenance marker replaced the guarantee. The pre-flight was
    // never the real guarantee — just a stand-in for the requireCommit that vanished with
    // EAS — and a blunt one, taxing exactly the fast iteration INFRA-383 existed to
    // enable. Merging on a dirty build is still impossible; see the marker tests.
    const r = runScript({ gitState: 'dirty' });
    expect(r.status).toBe(0);
    expect(r.buildRan).toBe(true);
    expect(r.output).toMatch(/DIRTY tree/i);
    expect(r.output).toMatch(/NOT merge\s+evidence/i);
  });

  test('records the dirty state in the marker, so the gate can refuse it', () => {
    // The relaxation is only safe because this is true. If the marker recorded a dirty
    // build as clean, the pre-flight would have been removed for nothing.
    const r = runScript({ gitState: 'dirty' });
    expect(r.marker.dirty).toBe(true);
  });

  test('names the offending paths so you know what to commit', () => {
    expect(runScript({ gitState: 'dirty' }).output).toMatch(/Dirty\.tsx/);
  });

  test('proceeds to the build when the tree is clean', () => {
    const r = runScript({ gitState: 'clean' });
    expect(r.status).toBe(0);
    expect(r.buildRan).toBe(true);
  });

  test('does not block the build when run outside a git work tree', () => {
    const r = runScript({ gitState: 'not-a-repo' });
    expect(r.status).toBe(0);
    expect(r.buildRan).toBe(true);
    expect(r.output).toMatch(/skipping the clean-tree pre-flight/i);
  });

  test('a non-repo build produces NO provenance marker, and says so', () => {
    // INFRA-384 must not quietly turn the allowance above into a failure: there is
    // nothing to fingerprint outside a work tree, so no marker can exist. The build
    // still succeeds; the artifact is simply not gate evidence, and e2e-safety.sh
    // refuses it with MISSING. Warning here beats an unexplained refusal minutes later.
    const r = runScript({ gitState: 'not-a-repo' });
    expect(r.markerExists).toBe(false);
    expect(r.output).toMatch(/no provenance marker written/i);
  });
});

describe('e2e-sim-build.sh — fail-closed install ordering', () => {
  test('uninstalls BEFORE building, not after', () => {
    // The old script uninstalled after a successful build, so a failed build left the
    // previous binary installed and /b-close Step 2.5.4 greenlit flows against it.
    const r = runScript({});
    const uninstallAt = r.trace.indexOf('uninstall');
    const buildAt = r.trace.search(/npx .*run:ios/);
    expect(uninstallAt).toBeGreaterThanOrEqual(0);
    expect(buildAt).toBeGreaterThanOrEqual(0);
    expect(uninstallAt).toBeLessThan(buildAt);
  });

  test('a failed build leaves NO app installed', () => {
    const r = runScript({ buildExits: 65 });
    expect(r.status).not.toBe(0);
    expect(r.installed).toBe(false);
    expect(r.output).toMatch(/❌/);
    expect(r.output).toMatch(/build/i);
  });

  test('a build that succeeds without producing a .app fails and installs nothing', () => {
    const r = runScript({ buildProducesApp: false });
    expect(r.status).not.toBe(0);
    expect(r.installed).toBe(false);
  });
});

describe('e2e-sim-build.sh — CNG staleness (the regression the swap would introduce)', () => {
  test('forces a prebuild when ios/ is absent', () => {
    const r = runScript({ iosExists: false });
    expect(r.status).toBe(0);
    expect(r.prebuildRan).toBe(true);
  });

  test('forces a --clean prebuild when a CNG input is newer than the generated ios/', () => {
    // expo run:ios prebuilds ONLY when ios/ is absent, so an app.json edit would otherwise
    // produce a binary whose Info.plist does not reflect it — on this repo that is
    // LSApplicationQueriesSchemes, the 988 dial path.
    const r = runScript({ cngStamp: 'stale' });
    expect(r.status).toBe(0);
    expect(r.prebuildRan).toBe(true);
    expect(r.trace).toMatch(/prebuild[^\n]*--clean/);
  });

  test('does NOT prebuild when CNG inputs are unchanged', () => {
    // This is what protects the ~1 min warm rebuild. An unconditional prebuild would erase
    // the entire point of the change.
    const r = runScript({ cngStamp: 'current' });
    expect(r.status).toBe(0);
    expect(r.prebuildRan).toBe(false);
  });
});

describe('e2e-sim-build.sh — freshness (Xcode may skip the RN bundling phase)', () => {
  test('destroys any prior .app before building', () => {
    const r = runScript({ seedStaleApp: true });
    expect(r.status).toBe(0);
    // The surviving bundle must be the one this run wrote, never the seeded stale text.
    const bundle = fs.readFileSync(
      path.join(r.root, 'container', `${BUNDLE_ID}.app`, 'main.jsbundle'),
      'utf8'
    );
    expect(bundle).not.toMatch(/STALE BUNDLE/);
  });

  test('refuses when main.jsbundle is missing (a Debug/dev-client build)', () => {
    const r = runScript({ bundleState: 'missing' });
    expect(r.status).not.toBe(0);
    expect(r.installed).toBe(false);
    expect(r.output).toMatch(/❌/);
  });

  test('refuses when main.jsbundle predates this run', () => {
    // @expo/fingerprint cannot catch this: it does not hash app/src/**.
    const r = runScript({ bundleState: 'stale' });
    expect(r.status).not.toBe(0);
    expect(r.installed).toBe(false);
    expect(r.output).toMatch(/stale|fresh/i);
  });
});

describe('e2e-sim-build.sh — launcher-freeness, fail-closed on three signals', () => {
  test('refuses when otool reports dev-launcher linkage', () => {
    const r = runScript({ otoolDevLauncher: true });
    expect(r.status).not.toBe(0);
    expect(r.installed).toBe(false);
    expect(r.output).toMatch(/launcher/i);
  });

  test('refuses when a dev-launcher framework is embedded', () => {
    // otool -L lists DYNAMIC libraries only; a statically linked or embedded launcher
    // would pass signal 1 and must still be caught.
    const r = runScript({ frameworkDevLauncher: true });
    expect(r.status).not.toBe(0);
    expect(r.installed).toBe(false);
    expect(r.output).toMatch(/launcher/i);
  });
});

describe('e2e-sim-build.sh — env parity with the e2e-sim profile', () => {
  test('resolves the profile through `extends`, not just its literal env block', () => {
    // e2e-sim declares 2 keys; production contributes 3 more. Reading build.e2e-sim.env
    // without following extends silently drops BUILD_TYPE/CRISIS_MONITORING.
    const r = runScript({});
    expect(r.trace).toMatch(/SEED=true/);
    expect(r.trace).toMatch(/FLAGS=cloud_sync:false,bug_reporting:true,voice_journal:true/);
    expect(r.trace).toMatch(/BUILD_TYPE=production/);
  });

  test('pins NODE_ENV rather than inheriting it', () => {
    // Expo's setNodeEnv is `process.env.NODE_ENV || mode`, so an inherited NODE_ENV=test
    // from a parent harness would silently produce a dev-mode, non-inlined bundle.
    expect(runScript({}).trace).toMatch(/NODE_ENV=production/);
  });

  test('refuses when the built bundle carries .env.production flags instead', () => {
    const r = runScript({ bundleFlags: ENV_PRODUCTION_FLAGS });
    expect(r.status).not.toBe(0);
    expect(r.installed).toBe(false);
    expect(r.output).toMatch(/flag|env/i);
  });
});

describe('e2e-sim-build.sh — crisis config survives into the artifact', () => {
  test('refuses when LSApplicationQueriesSchemes lost tel/sms', () => {
    // Runtime-artifact analogue of the INFRA-184 static-config test, which only ever
    // reads app.json and so cannot see a stale generated Info.plist.
    const r = runScript({ plistSchemes: ['sms'] });
    expect(r.status).not.toBe(0);
    expect(r.installed).toBe(false);
    expect(r.output).toMatch(/LSApplicationQueriesSchemes|tel/i);
  });

  test('proceeds when both tel and sms are present', () => {
    expect(runScript({ plistSchemes: ['tel', 'sms'] }).status).toBe(0);
  });
});

describe('e2e-sim-build.sh — happy path', () => {
  test('installs, reports success, and names no failing stage', () => {
    const r = runScript({});
    expect(r.status).toBe(0);
    expect(r.installed).toBe(true);
    expect(r.output).toMatch(/✅/);
    expect(r.output).not.toMatch(/❌/);
  });
});

describe('e2e-sim-build.sh — portability of the freshness assert', () => {
  test('works under GNU stat semantics, not just BSD', () => {
    // Regression. The first implementation used
    //   stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null
    // which is correct on macOS and silently broken on Linux: GNU's -f is --file-system
    // and takes no format arg, so `%m` becomes a FILE operand — the command fails (firing
    // the ||) while STILL printing filesystem info, so BOTH branches emit, the value is
    // multi-line, and `[ "$m" -ge N ]` dies as an integer-expression error under set -e.
    // Every happy-path case went red on ubuntu-latest and green on the author's Mac.
    // The fix probes with -c (which BSD rejects outright) and picks a dialect once.
    const r = runScript({ statDialect: 'gnu' });
    expect(r.status).toBe(0);
    expect(r.installed).toBe(true);
    expect(r.output).not.toMatch(/integer expression|❌/);
  });

  test('still refuses a stale bundle under GNU stat semantics', () => {
    // The portability fix must not cost the assert its teeth.
    const r = runScript({ statDialect: 'gnu', bundleState: 'stale' });
    expect(r.status).not.toBe(0);
    expect(r.installed).toBe(false);
    expect(r.output).toMatch(/stale|fresh/i);
  });
});

// =====================================================================================
// INFRA-384 — provenance: binding the installed binary to the tree it was built from.
//
// The distinction these tests exist to defend: INFRA-383 asserts the artifact's SHAPE
// (launcher-free, fresh bundle, env parity, dial schemes). None of that says the binary
// came from THIS tree. `requireCommit: true` used to supply that as a side effect of
// EAS; dropping EAS removed it, and the clean-tree pre-flight was only ever a stand-in.
// =====================================================================================

describe('e2e-sim-build.sh — provenance marker (AC1)', () => {
  test('writes a marker into the installed container on success', () => {
    const r = runScript({});
    expect(r.status).toBe(0);
    expect(r.markerExists).toBe(true);
  });

  test('the marker records head, tree hash, bundle id and dirty flag', () => {
    const r = runScript({});
    expect(r.marker).toMatchObject({
      schema: 1,
      bundleId: BUNDLE_ID,
      head: DEFAULT_GIT_STATE.head,
      dirty: false,
    });
    expect(r.marker.treeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.marker.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('a failed build leaves NO marker, because it leaves no container', () => {
    // AC1's "absent after any failed or refused build" comes free from the cleanup
    // trap's uninstall — the marker lives inside the container it removes.
    const r = runScript({ buildExits: 65 });
    expect(r.status).not.toBe(0);
    expect(r.markerExists).toBe(false);
  });

  test('a build failing a shape assert leaves no marker either', () => {
    // Ordering claim: the marker is written AFTER every INFRA-383 assert, so its
    // presence means "passed every shape check AND came from this tree".
    const r = runScript({ otoolDevLauncher: true });
    expect(r.status).not.toBe(0);
    expect(r.markerExists).toBe(false);
  });
});

describe('e2e-safety.sh — provenance comparison (AC2, AC3)', () => {
  test('runs the flows when the tree has not moved since the build', () => {
    const built = runScript({});
    const gate = runSafety(built);
    expect(gate.status).toBe(0);
    expect(gate.flowsRun).toBe(2); // the two `safety`-tagged flows
    expect(gate.output).toMatch(/provenance: built from this exact tree/i);
  });

  test('REFUSES every flow when the tree moved after the build', () => {
    const built = runScript({});
    const gate = runSafety(built, { git: { head: '2222222222222222222222222222222222222222' } });
    expect(gate.status).not.toBe(0);
    expect(gate.flowsRun).toBe(0); // refuses BEFORE the loop, not per-flow
    expect(gate.output).toMatch(/MISMATCH/);
  });

  test('REFUSES when an uncommitted edit appears after the build', () => {
    const built = runScript({});
    const gate = runSafety(built, { git: { status: ' M app/src/features/crisis/Late.tsx' } });
    expect(gate.status).not.toBe(0);
    expect(gate.flowsRun).toBe(0);
  });

  test('REFUSES when the marker is absent entirely (the reinstall case)', () => {
    // simctl mints a new container UUID on every fresh install, so `npm run ios` over
    // the top takes the marker with it. Deleting it reproduces that.
    const built = runScript({});
    fs.unlinkSync(path.join(built.container, MARKER_NAME));
    const gate = runSafety(built);
    expect(gate.status).not.toBe(0);
    expect(gate.flowsRun).toBe(0);
    expect(gate.output).toMatch(/MISSING/);
  });

  test('REFUSES a marker whose schema this build does not understand', () => {
    // Reported as MISSING, not MISMATCH: an uninterpretable marker is absence of usable
    // evidence, not proof the tree moved.
    const built = runScript({});
    const p = path.join(built.container, MARKER_NAME);
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    fs.writeFileSync(p, JSON.stringify({ ...m, schema: 99 }));
    const gate = runSafety(built);
    expect(gate.status).not.toBe(0);
    expect(gate.output).toMatch(/MISSING/);
  });

  test('REFUSES a marker with an empty tree hash rather than matching empty-to-empty', () => {
    const built = runScript({});
    const p = path.join(built.container, MARKER_NAME);
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    fs.writeFileSync(p, JSON.stringify({ ...m, treeHash: '' }));
    const gate = runSafety(built);
    expect(gate.status).not.toBe(0);
    expect(gate.flowsRun).toBe(0);
  });

  test('REFUSES unparseable marker JSON', () => {
    const built = runScript({});
    fs.writeFileSync(path.join(built.container, MARKER_NAME), '{not json');
    const gate = runSafety(built);
    expect(gate.status).not.toBe(0);
    expect(gate.output).toMatch(/MISSING/);
  });
});

describe('e2e-safety.sh — dirty-tree runs are visibly not evidence (AC3/AC4)', () => {
  // A genuinely dirty build, end to end — the pre-flight now warns instead of aborting
  // (INFRA-384 AC5), so no hand-patching of the marker is needed.
  function builtDirty() {
    return runScript({ gitState: 'dirty' });
  }

  test('still runs the flows, but banners that this is not merge evidence', () => {
    const gate = runSafety(builtDirty());
    expect(gate.status).toBe(0);
    expect(gate.flowsRun).toBe(2); // iterating dirty is the point
    expect(gate.output).toMatch(/NOT MERGE EVIDENCE/);
  });

  test('E2E_REQUIRE_CLEAN_PROVENANCE=1 turns the same state into a refusal', () => {
    // AC3 (banner, still run) and AC4 (gate failure) are opposite policies over ONE
    // implementation; this knob is the whole difference. /b-close sets it.
    const gate = runSafety(builtDirty(), { env: { E2E_REQUIRE_CLEAN_PROVENANCE: '1' } });
    expect(gate.status).not.toBe(0);
    expect(gate.flowsRun).toBe(0);
    expect(gate.output).toMatch(/DIRTY tree|dirty tree/i);
  });
});

describe('e2e-provenance.js — the fingerprint sees what the AC recipe would miss', () => {
  test('untracked file CONTENT changes invalidate the marker', () => {
    // The AC's literal recipe (`git status --porcelain` + `git diff HEAD`) is BLIND to
    // this: status emits the same `?? path` line whatever the file contains, and
    // `diff HEAD` covers tracked files only. Untracked .ts under app/src IS bundled into
    // main.jsbundle, so a fingerprint blind to it would call a materially different
    // binary a match. Hence `git ls-files -o --exclude-standard` + hashing contents.
    const built = runScript({});
    const untracked = 'src/features/crisis/Scratch.tsx';
    fs.mkdirSync(path.join(built.root, path.dirname(untracked)), { recursive: true });
    fs.writeFileSync(path.join(built.root, untracked), 'export const A = 1;');
    writeGitState(built.root, { untracked });

    // Re-stamp the marker so the untracked FILE EXISTS at "build" time. From here the
    // only thing that changes is its CONTENT — the exact blind spot.
    const rewrite = spawnSync(
      'node',
      [path.join(built.root, 'scripts', 'e2e-provenance.js'), 'write', built.container],
      { cwd: built.root, encoding: 'utf8', env: { ...process.env, PATH: `${built.stubs}:${process.env.PATH}` } }
    );
    expect(rewrite.status).toBe(0);

    // Same file list, different bytes.
    fs.writeFileSync(path.join(built.root, untracked), 'export const A = 999;');

    const gate = runSafety(built);
    expect(gate.status).not.toBe(0);
    expect(gate.output).toMatch(/MISMATCH/);
    expect(gate.flowsRun).toBe(0);
  });
});

describe('e2e-safety.sh — flow selection and the no-silent-green rule', () => {
  test('an explicit flow name runs exactly that flow', () => {
    // This is the /b-close Phase 2.5 path: Step 2.5.3 scopes to per-flow npm scripts.
    const built = runScript({});
    const gate = runSafety(built, { flows: ['crisis-button-reachability'] });
    expect(gate.status).toBe(0);
    expect(gate.flowsRun).toBe(1);
    expect(gate.trace).toMatch(/crisis-button-reachability/);
  });

  test('the per-flow path gets the SAME provenance refusal as the suite', () => {
    // The reason the npm scripts were rerouted through this file at all: as bare
    // `maestro test` invocations they bypassed every pre-flight, so the one path the
    // merge gate actually takes was the one path with no checks on it.
    const built = runScript({});
    const gate = runSafety(built, {
      flows: ['crisis-button-reachability'],
      git: { head: '3333333333333333333333333333333333333333' },
    });
    expect(gate.status).not.toBe(0);
    expect(gate.flowsRun).toBe(0);
  });

  test('an explicit name may address a device-only flow the tag filter excludes', () => {
    const built = runScript({});
    const gate = runSafety(built, { flows: ['crisis-988-dial'] });
    expect(gate.status).toBe(0);
    expect(gate.flowsRun).toBe(1);
  });

  test('a device-only flow SKIPS the simulator pre-flight entirely', () => {
    // crisis-988-dial runs against a REAL iPhone (the sim's canOpenURL returns false
    // unconditionally). Everything in the pre-flight reasons about the booted SIM's
    // installed app, so applying it here is worse than useless: with no sim booted it
    // aborts a documented procedure, and with an unrelated sim booted it would print
    // "gate target verified / provenance" banners describing an artifact the flow is not
    // running against — attesting the wrong binary, the exact failure this item removes.
    const built = runScript({});
    fs.rmSync(built.container, { recursive: true, force: true }); // no app on the sim
    const gate = runSafety(built, { flows: ['crisis-988-dial'] });
    expect(gate.status).toBe(0);
    expect(gate.flowsRun).toBe(1);
    expect(gate.output).toMatch(/NO artifact attestation/i);
    expect(gate.output).not.toMatch(/provenance: built from this exact tree/);
  });

  test('a MIXED selection is not treated as device-only', () => {
    // Only an all-device-only selection may skip the pre-flight. One sim flow in the set
    // means the sim artifact is genuinely under test again.
    const built = runScript({});
    fs.unlinkSync(path.join(built.container, MARKER_NAME));
    const gate = runSafety(built, { flows: ['crisis-988-dial', 'q9-single-alert'] });
    expect(gate.status).not.toBe(0);
    expect(gate.output).toMatch(/MISSING/);
  });
});

describe('e2e-safety.sh — pre-flight checks BOTH crisis dial schemes', () => {
  test('refuses when the installed app lost sms, not just tel', () => {
    // This block calls itself "the load-bearing one" yet checked only `tel`. `sms` is the
    // Crisis Text Line path, so a build that lost it passed here.
    const built = runScript({});
    writeStub(built.stubs, 'plutil', `echo '${JSON.stringify(['tel'])}'`);
    const gate = runSafety(built);
    expect(gate.status).not.toBe(0);
    expect(gate.flowsRun).toBe(0);
    expect(gate.output).toMatch(/sms/);
  });
});

describe('e2e-sim-build.sh — mid-build tree mutation (the marker must not attest a tree the binary lacks)', () => {
  test('refuses to write a marker when the tree moves during the build', () => {
    // The binary corresponds to the tree AS BUNDLED; the marker records the tree NOW.
    // Committing mid-build would record dirty:false at a NEW head with a hash the binary
    // does not match — which then verifies as MATCH_CLEAN. A false green of exactly the
    // kind this file exists to prevent, and made likelier by AC5: dirty builds are now
    // routine and the remediation text is literally "commit and rebuild".
    const root = makeProject({});
    const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-stubs-'));
    const container = path.join(root, 'container', `${BUNDLE_ID}.app`);
    writeGitStub(stubs, root);

    // The npx shim mutates the git state mid-build — i.e. between the fingerprint
    // snapshot taken just before the build and the marker write after it.
    writeStub(
      stubs,
      'npx',
      [
        'SUB=""',
        'for a in "$@"; do case "$a" in prebuild) SUB=prebuild ;; run:ios) SUB=run ;; esac; done',
        '[ "$SUB" = "prebuild" ] && exit 0',
        'if [ "$SUB" = "run" ]; then',
        `  printf 'moved-during-build' > "${path.join(root, GIT_STATE_DIR, 'head')}"`,
        `  APP="${path.join(root, PRODUCT_REL, 'Being.app')}"`,
        '  mkdir -p "$APP/Frameworks"',
        '  echo "<plist/>" > "$APP/Info.plist"',
        "  printf 'JSBUNDLE cloud_sync:false,bug_reporting:true,voice_journal:true' > \"$APP/main.jsbundle\"",
        '  echo "binary" > "$APP/Being"',
        `  rm -rf "${container}"; mkdir -p "$(dirname "${container}")"`,
        `  cp -Rp "$APP" "${container}"`,
        'fi',
        'exit 0',
      ].join('\n')
    );
    writeStub(
      stubs,
      'xcrun',
      [
        'if [ "$1" = "simctl" ] && [ "$2" = "list" ]; then echo "iPhone 16 (ABC) (Booted)"; exit 0; fi',
        `if [ "$1" = "simctl" ] && [ "$2" = "uninstall" ]; then rm -rf "${container}"; exit 0; fi`,
        'if [ "$1" = "simctl" ] && [ "$2" = "get_app_container" ]; then',
        `  if [ -d "${container}" ]; then echo "${container}"; exit 0; fi`,
        '  exit 1',
        'fi',
        'exit 0',
      ].join('\n')
    );
    writeStub(stubs, 'otool', 'echo "\t/usr/lib/libSystem.B.dylib"');
    writeStub(stubs, 'plutil', `echo '${JSON.stringify(['tel', 'sms'])}'`);

    const res = spawnSync('bash', [path.join(root, 'scripts', 'e2e-sim-build.sh')], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${stubs}:${process.env.PATH}`, CI: '' },
    });

    const output = `${res.stdout || ''}${res.stderr || ''}`;
    expect(res.status).not.toBe(0);
    expect(output).toMatch(/CHANGED during the build/i);
    // Fail-closed: the trap uninstalls, so nothing is left for a gate to run against.
    expect(fs.existsSync(container)).toBe(false);
  });

  test('refuses a helper subflow by name', () => {
    const built = runScript({});
    const gate = runSafety(built, { flows: ['_legal-and-onboarding'] });
    expect(gate.status).not.toBe(0);
    expect(gate.flowsRun).toBe(0);
  });

  test('refuses a flow that does not exist instead of running nothing successfully', () => {
    const built = runScript({});
    const gate = runSafety(built, { flows: ['no-such-flow'] });
    expect(gate.status).not.toBe(0);
    expect(gate.output).toMatch(/no such flow/i);
  });

  test('refuses to report success when zero flows are selected', () => {
    // The script used to print "all safety flows passed" and exit 0 when `ran` was 0 —
    // vacuously true, and read by /b-close as a passing gate. A marker-driven skip could
    // have been laundered into a green exactly this way.
    const built = runScript({});
    for (const f of fs.readdirSync(path.join(built.root, '.maestro'))) {
      fs.unlinkSync(path.join(built.root, '.maestro', f));
    }
    const gate = runSafety(built);
    expect(gate.status).not.toBe(0);
    expect(gate.output).not.toMatch(/all safety flows passed/);
    expect(gate.output).toMatch(/refusing to report success/i);
  });

  test('a failing flow still fails the gate', () => {
    const built = runScript({});
    const gate = runSafety(built, { maestroExits: 1 });
    expect(gate.status).not.toBe(0);
    expect(gate.output).toMatch(/one or more safety flows failed/);
  });
});
