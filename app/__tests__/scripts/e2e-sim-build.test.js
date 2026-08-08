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
const BUNDLE_ID = 'fyi.being.app';
const PRODUCT_REL = 'ios/build/Build/Products/Release-iphonesimulator';

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
  return root;
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

  // --- git: unchanged INFRA-329 pre-flight surface -------------------------------------
  const gitDispatch = [
    'MODE=""',
    'for a in "$@"; do case "$a" in rev-parse) MODE=rev ;; status) MODE=status ;; esac; done',
  ];
  writeStub(
    stubs,
    'git',
    gitState === 'not-a-repo'
      ? [...gitDispatch, 'echo "fatal: not a git repository" >&2', 'exit 128'].join('\n')
      : [
          ...gitDispatch,
          'if [ "$MODE" = "rev" ]; then echo "/tmp/fake-repo-root"; exit 0; fi',
          `if [ "$MODE" = "status" ]; then ${
            gitState === 'dirty' ? 'echo " M app/src/features/learn/Dirty.tsx"' : ':'
          }; exit 0; fi`,
          'exit 0',
        ].join('\n')
  );

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
        '  shift 2',                     // drop -c and the format
        '  for f in "$@"; do /usr/bin/stat -f %m "$f"; done',
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
    root,
  };
}

// =====================================================================================

describe('e2e-sim-build.sh — clean-tree pre-flight (INFRA-329, deliberately unchanged)', () => {
  test('aborts before building when the working tree is dirty', () => {
    // Kept in this PR ON PURPOSE. requireCommit disappears with EAS, and it was the only
    // thing forcing the installed binary to correspond to a commit. Relaxing here would
    // make "gate ran against a never-committed tree" routine rather than impossible.
    const r = runScript({ gitState: 'dirty' });
    expect(r.status).not.toBe(0);
    expect(r.buildRan).toBe(false);
    expect(r.output).toMatch(/❌/);
    expect(r.output).toMatch(/clean-tree/i);
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
