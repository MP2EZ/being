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
const REAL_SIM_DEVICE = path.resolve(__dirname, '../../scripts/e2e-sim-device.sh');
const REAL_REAL_DEVICE = path.resolve(__dirname, '../../scripts/e2e-real-device.sh');

// INFRA-424 — attached physical-device fixtures. Declared here rather than beside their
// describe block because the device-only tests in the earlier `explicit flow name` block
// consume them too. Fields omitted here default to an ELIGIBLE iPhone in the writeDevices
// helper, so a test only spells out the property that makes a device ineligible.
const ONE_DEVICE = [{ udid: 'DEV-1111', name: 'Max iPhone' }];
const TWO_DEVICES = [
  { udid: 'DEV-1111', name: 'Max iPhone' },
  { udid: 'DEV-2222', name: 'Test iPhone' },
];
const REAL_DRIVER_OWNERSHIP = path.resolve(__dirname, '../../scripts/e2e-driver-ownership.sh');
const REAL_VERDICT = path.resolve(__dirname, '../../scripts/e2e-verdict.js');
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
  // INFRA-405: the shared device resolver, sourced by BOTH scripts. Copied as the real
  // file so "they resolve identically" is exercised rather than asserted.
  fs.copyFileSync(REAL_SIM_DEVICE, path.join(root, 'scripts', 'e2e-sim-device.sh'));
  // INFRA-424: the physical-device resolver, sourced by e2e-safety.sh. Real file for the
  // same reason as the simulator resolver — the point is to exercise the shipped refusal
  // semantics, not a re-implementation that agrees with the test by construction.
  fs.copyFileSync(REAL_REAL_DEVICE, path.join(root, 'scripts', 'e2e-real-device.sh'));
  // INFRA-423: the driver-ownership classifier, sourced by e2e-safety.sh. Copied as the
  // real file for the same reason as the device resolver — the point is to exercise the
  // shipped classification, not a re-implementation of it.
  fs.copyFileSync(REAL_DRIVER_OWNERSHIP, path.join(root, 'scripts', 'e2e-driver-ownership.sh'));
  // DEBUG-392: the gate's second verdict channel. Copied as the REAL file for the same
  // reason as the provenance helper — `node` is not shimmed, so the adjudication logic
  // runs for real rather than being stubbed into always agreeing with the exit code.
  fs.copyFileSync(REAL_VERDICT, path.join(root, 'scripts', 'e2e-verdict.js'));

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
 * @param opts.bootedDevices     INFRA-405 — simulators booted BEFORE the build starts.
 *                               Array of {udid, name}. Default: exactly one.
 * @param opts.midBuildBoot      INFRA-405 — a {udid, name} that boots DURING the build,
 *                               reproducing the observed Simulator.app auto-boot. A check
 *                               performed before the build does not hold for its duration.
 * @param opts.simUdid           INFRA-405 — value for the E2E_SIM_UDID override env var.
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
    bootedDevices = [{ udid: 'AAAA-1111', name: 'iPhone 16 Plus' }],
    midBuildBoot = null,
    simUdid = null,
    simctlListFails = false,
    // INFRA-424: physical devices `xcrun devicectl list devices` reports. Default EMPTY —
    // a machine with no iPhone attached, which is every CI runner and most dev machines,
    // and is the state under which the device-only refusal must fire.
    attachedDevices = [],
    devicectlFails = false,
  } = opts;

  const root = makeProject({ iosExists, cngStamp });
  const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-stubs-'));
  // INFRA-405: containers are PER-DEVICE. The old harness modelled one global container,
  // which made the install-target/assert-target divergence structurally unrepresentable —
  // so the bug could not be reproduced and `--device` was never covered by any assertion.
  const containersRoot = path.join(root, 'container');
  const containerFor = (udid) => path.join(containersRoot, udid, `${BUNDLE_ID}.app`);
  const container = containerFor(bootedDevices[0] ? bootedDevices[0].udid : 'NONE');
  const trace = path.join(root, 'trace.log');

  // Booted-device state lives in a FILE so the build stub can mutate it mid-run.
  const bootedStatePath = path.join(root, 'booted-devices.json');
  const writeBooted = (devices) =>
    fs.writeFileSync(
      bootedStatePath,
      JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-18-0': devices.map((d) => ({
            udid: d.udid,
            name: d.name,
            state: 'Booted',
          })),
        },
      })
    );
  writeBooted(bootedDevices);

  // INFRA-424: attached-device state lives in a FILE for the same reason booted-device
  // state does — a test must be able to change what is attached BETWEEN the build and the
  // gate run, and the stub is written once at runScript time.
  //
  // The fixture carries the FULL devicectl shape, not a convenient flattening, because the
  // filter under test reads four different nested fields (hardwareProperties.platform,
  // .deviceType, connectionProperties.pairingState, .tunnelState). A flattened fixture
  // would make the ineligible-device cases unrepresentable — which is exactly the class
  // this resolver exists to reject, and on the machine this was developed against the ONLY
  // device present is ineligible on two of those four fields.
  const deviceStatePath = path.join(root, 'attached-devices.json');
  const writeDevices = (devices) =>
    fs.writeFileSync(
      deviceStatePath,
      JSON.stringify({
        result: {
          devices: devices.map((d) => ({
            hardwareProperties: {
              udid: d.udid,
              platform: d.platform || 'iOS',
              deviceType: d.deviceType || 'iPhone',
              productType: d.productType || 'iPhone17,1',
            },
            deviceProperties: { name: d.name },
            connectionProperties: {
              pairingState: d.pairingState || 'paired',
              tunnelState: d.tunnelState || 'connected',
            },
          })),
        },
      })
    );
  writeDevices(attachedDevices);

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
          // INFRA-407: BUILD-ONLY. `--device generic --output <dir>` produces the .app and
          // installs nothing — the script's own `simctl install` (see the xcrun stub) is now
          // the only thing that reaches a simulator. INFRA-405's install-target modelling is
          // preserved, just moved to where the install actually happens.
          //
          // Emulating the old atomic build-install here would let the script drop its
          // install step entirely and still pass: the shim has to split exactly where the
          // real command splits, or it stops pinning the thing that changed.
          '  OUT=""',
          '  prev=""',
          '  for a in "$@"; do if [ "$prev" = "--output" ]; then OUT="$a"; fi; prev="$a"; done',
          `  echo "build-output $OUT" >> "${trace}"`,
          '  if [ -n "$OUT" ]; then',
          // -p: mtimes carry through, and the bundle-freshness assert reads them.
          '    mkdir -p "$OUT"; cp -Rp "$APP" "$OUT/"',
          '  fi',
        ]
      : []),
    // INFRA-405: a device that boots DURING the build. The observed case had
    // Simulator.app auto-boot one inside the build window, AFTER the pre-build check had
    // already confirmed exactly one — which is why the device must be resolved once and
    // reused, not re-queried at each step.
    ...(midBuildBoot
      ? [
          `  node -e 'const fs=require("fs");const p=process.argv[1];const j=JSON.parse(fs.readFileSync(p,"utf8"));Object.values(j.devices)[0].push({udid:process.argv[2],name:process.argv[3],state:"Booted"});fs.writeFileSync(p,JSON.stringify(j))' "${bootedStatePath}" "${midBuildBoot.udid}" "${midBuildBoot.name}"`,
        ]
      : []),
    '  exit 0',
    'fi',
    'exit 0',
  ].join('\n');
  writeStub(stubs, 'npx', buildBody);

  // --- xcrun simctl --------------------------------------------------------------------
  // INFRA-405. The previous stub answered ANY `simctl list` with a human-readable line, so
  // the script's `list devices booted -j | node <parse JSON>` always threw, `|| UDID=""`
  // fired, and every one of this file's tests silently exercised the UDID-EMPTY path —
  // meaning `--device` was never once asserted and the multi-simulator defect could not be
  // represented. This stub models what simctl actually does:
  //
  //   * `list devices booted -j`  -> real JSON, read from a mutable state file
  //   * `get_app_container booted` with 2+ booted -> resolves to ONE OF THEM, unspecified.
  //     `xcrun simctl help` says exactly that. We model it as the LAST booted device while
  //     the build installs to the FIRST, which is the divergence that produced the reported
  //     failure — deterministic here so CI can reproduce it without a simulator.
  //   * containers are per-device.
  writeStub(
    stubs,
    'xcrun',
    [
      `BOOTED_JSON="${bootedStatePath}"`,
      `DEVICE_JSON="${deviceStatePath}"`,
      `CONTAINERS="${containersRoot}"`,
      `TRACE="${trace}"`,
      // INFRA-424 — `xcrun devicectl list devices --json-output <path>`.
      //
      // devicectl writes its JSON to a caller-supplied FILE and prints only a human table
      // on stdout; there is no stdout-JSON mode. A stub that echoed JSON instead would let
      // a resolver reading stdout pass here and fail against the real tool, so this parses
      // the flag out of "$@" and writes there — the same shape the npx build stub already
      // uses for `--output`.
      //
      // The failure mode writes NOTHING and exits non-zero, which is what makes
      // "enumeration failed" distinguishable from "zero attached": an absent or empty file
      // is the normal shape of a devicectl failure, not an exotic one.
      'if [ "$1" = "devicectl" ] && [ "$2" = "list" ]; then',
      '  echo "devicectl list" >> "$TRACE"',
      ...(devicectlFails
        ? ['  echo "xcrun: error: unable to find utility \\"devicectl\\"" >&2; exit 72']
        : []),
      '  OUT=""',
      '  prev=""',
      '  for a in "$@"; do if [ "$prev" = "--json-output" ]; then OUT="$a"; fi; prev="$a"; done',
      '  if [ -n "$OUT" ]; then cp "$DEVICE_JSON" "$OUT"; fi',
      '  exit 0',
      'fi',
      'booted_udids() {',
      `  node -e 'const j=require(process.argv[1]);const o=[];for(const l of Object.values(j.devices||{}))for(const d of l)if(d.state==="Booted")o.push(d.udid);console.log(o.join("\\n"))' "$BOOTED_JSON" 2>/dev/null | grep -v "^$"`,
      '}',
      '# Resolve a simctl device selector to a concrete udid.',
      'resolve_dev() {',
      '  if [ "$1" != "booted" ]; then echo "$1"; return 0; fi',
      '  n="$(booted_udids | grep -c .)"',
      '  if [ "$n" -eq 0 ]; then return 1; fi',
      '  if [ "$n" -eq 1 ]; then booted_udids | head -1; return 0; fi',
      '  booted_udids | tail -1   # ambiguous: simctl picks one, unspecified',
      '}',
      'if [ "$1" = "simctl" ] && [ "$2" = "list" ]; then',
      ...(simctlListFails
        ? ['  echo "xcrun: error: unable to find utility \\"simctl\\"" >&2; exit 72']
        : []),
      '  case "$*" in',
      '    *-j*) cat "$BOOTED_JSON"; exit 0 ;;',
      '  esac',
      '  booted_udids | while read -r u; do echo "Sim ($u) (Booted)"; done',
      '  exit 0',
      'fi',
      'if [ "$1" = "simctl" ] && [ "$2" = "uninstall" ]; then',
      '  echo "uninstall $3" >> "$TRACE"',
      '  d="$(resolve_dev "$3")" || exit 0',
      '  rm -rf "$CONTAINERS/$d"; exit 0',
      'fi',
      'if [ "$1" = "simctl" ] && [ "$2" = "install" ]; then',
      '  echo "install $3" >> "$TRACE"',
      '  d="$(resolve_dev "$3")" || exit 1',
      // INFRA-407: `install-target` moved here from the run:ios stub, because the install
      // itself moved. It records the RESOLVED device (not the raw selector), which is what
      // makes the install-target vs assert-target divergence INFRA-405 pins observable —
      // that divergence is the whole point of the multi-device model above.
      '  echo "install-target $d" >> "$TRACE"',
      `  mkdir -p "$CONTAINERS/$d"; rm -rf "$CONTAINERS/$d/${BUNDLE_ID}.app"`,
      `  cp -Rp "$4" "$CONTAINERS/$d/${BUNDLE_ID}.app"; exit 0`,
      'fi',
      'if [ "$1" = "simctl" ] && [ "$2" = "get_app_container" ]; then',
      '  echo "get_app_container $3" >> "$TRACE"',
      '  d="$(resolve_dev "$3")" || { echo "No devices are booted." >&2; exit 1; }',
      `  if [ -d "$CONTAINERS/$d/${BUNDLE_ID}.app" ]; then echo "$CONTAINERS/$d/${BUNDLE_ID}.app"; exit 0; fi`,
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
      ...(simUdid ? { E2E_SIM_UDID: simUdid } : {}),
    },
  });

  const traceText = fs.readFileSync(trace, 'utf8');
  // INFRA-405: "installed" must mean "installed on the device the script targeted", not
  // "a container exists somewhere". The whole defect was those two diverging.
  const installTarget = (traceText.match(/install-target (\S+)/) || [])[1] || null;
  const activeContainer = installTarget ? containerFor(installTarget) : container;
  return {
    status: res.status,
    output: `${res.stdout || ''}${res.stderr || ''}`,
    trace: traceText,
    buildRan: /npx .*run:ios/.test(traceText),
    prebuildRan: /npx .*prebuild/.test(traceText),
    installed: fs.existsSync(activeContainer),
    markerExists: fs.existsSync(path.join(activeContainer, MARKER_NAME)),
    marker: (() => {
      try {
        return JSON.parse(fs.readFileSync(path.join(activeContainer, MARKER_NAME), 'utf8'));
      } catch {
        return null;
      }
    })(),
    // Which device the build actually installed to, and whether `--device` was passed.
    installTarget,
    deviceFlag: (traceText.match(/--device (\S+)/) || [])[1] || null,
    container: activeContainer,
    containerFor,
    bootedStatePath,
    deviceStatePath,
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
  const {
    flows = [],
    git: gitMutation = null,
    env = {},
    maestroExits = 0,
    booted = null,
    // INFRA-424: what `devicectl` reports at GATE time. Same rationale as `booted` — an
    // operator can attach or unplug an iPhone between the build and the run, and the
    // device-only refusal is decided at gate time, not build time.
    devices = null,
    // DEBUG-392: let a test supply the whole maestro stub. The default below is a
    // process that exits immediately; the cases this work exists for need one that
    // WEDGES, and one that writes a JUnit report the gate then adjudicates.
    maestroBody = null,
    // DEBUG-392: the `ps -axo` table the driver-reset guard reads. Default empty =
    // quiet machine, preserving the pre-existing behaviour for every old test.
    psInventory = '',
  } = opts;
  const trace = path.join(built.root, 'safety-trace.log');
  fs.writeFileSync(trace, '');

  // INFRA-405: let a test change which simulators are booted BETWEEN the build and the
  // gate run. That gap is real — an operator can boot a second sim, or Simulator.app can
  // do it unasked — and it is exactly when the gate could verify one device's binary and
  // then drive the flows against another.
  if (booted) {
    fs.writeFileSync(
      built.bootedStatePath,
      JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-18-0': booted.map((d) => ({
            udid: d.udid,
            name: d.name,
            state: 'Booted',
          })),
        },
      })
    );
  }

  if (devices) {
    fs.writeFileSync(
      built.deviceStatePath,
      JSON.stringify({
        result: {
          devices: devices.map((d) => ({
            hardwareProperties: {
              udid: d.udid,
              platform: d.platform || 'iOS',
              deviceType: d.deviceType || 'iPhone',
              productType: d.productType || 'iPhone17,1',
            },
            deviceProperties: { name: d.name },
            connectionProperties: {
              pairingState: d.pairingState || 'paired',
              tunnelState: d.tunnelState || 'connected',
            },
          })),
        },
      })
    );
  }

  // maestro, pkill and sleep are all shimmed. `sleep` MATTERS: the real loop sleeps 8s
  // between flows to let the XCUITest driver settle, which would make this suite take
  // 16s+ instead of milliseconds.
  // DEBUG-392: the DEFAULT stub now writes a JUnit report, because a real maestro does.
  // The gate's verdict is a conjunction of exit code AND report, so a stub that exits 0
  // while writing nothing is not "a passing maestro" — it is the wedged-and-killed
  // signature, and every pre-existing green test would fail closed on it. Keeping the
  // default faithful is what lets those tests keep asserting what they were written to
  // assert. `maestroExits` still drives the outcome; it now drives both channels
  // coherently, exactly as the real tool would.
  const defaultMaestro = [
    'out=""; flow=""',
    'for a in "$@"; do',
    '  case "$a" in',
    '    --output=*) out="${a#--output=}";;',
    '    *.yaml) flow="$a";;',
    '  esac',
    'done',
    'nm="$(basename "$flow" .yaml)"',
    'if [ -n "$out" ]; then',
    `  f=${maestroExits === 0 ? '0' : '1'}`,
    '  printf \'<?xml version="1.0"?><testsuites><testsuite name="s" tests="1" failures="%s" errors="0">\' "$f" > "$out"',
    maestroExits === 0
      ? '  printf \'<testcase name="%s" classname="%s"/>\' "$nm" "$nm" >> "$out"'
      : '  printf \'<testcase name="%s" classname="%s"><failure>stubbed failure</failure></testcase>\' "$nm" "$nm" >> "$out"',
    "  printf '</testsuite></testsuites>' >> \"$out\"",
    'fi',
    `exit ${maestroExits}`,
  ].join('\n');
  writeStub(
    built.stubs,
    'maestro',
    [`echo "maestro $@" >> "${trace}"`, maestroBody !== null ? maestroBody : defaultMaestro].join('\n')
  );
  // INFRA-423: `pkill` is gone from the gate entirely — the reap now targets an explicit
  // pid list. The stub survives only so that a REGRESSION reintroducing a pattern kill
  // shows up in the trace instead of silently succeeding.
  writeStub(built.stubs, 'pkill', [`echo "pkill $@" >> "${trace}"`, 'exit 0'].join('\n'));
  // DEBUG-392: `ps`, not `pgrep`. Identity must come from the executable, so the stub
  // answers both shapes the scripts use: the `-axo` inventory and the `-o pgid= -p`
  // lookup. `psInventory` is the raw table, so a test can inject a line that MENTIONS
  // maestro without being it — the false positive that shipped and had to be fixed.
  //
  // INFRA-423 widened the inventory to five columns — `pid ppid pgid comm args` — because
  // ownership is decided by PARENT, not by pattern: a driver whose ppid is a live maestro
  // JVM belongs to a peer, and one whose JVM is gone belongs to nobody. Fixtures written
  // for the old three-column shape must be migrated, not merely padded.
  writeStub(
    built.stubs,
    'ps',
    [
      `echo "ps $@" >> "${trace}"`,
      // Match the single-process LOOKUP shape only (`ps -o pgid= -p <pid>`). The bare
      // `*pgid*` this used to be also swallowed INFRA-423's inventory call, which asks
      // for `-axo pid=,ppid=,pgid=,comm=,args=` — so the classifier received a PGID
      // where it expected a process table, found no drivers, and every ownership
      // assertion passed vacuously against an empty reap set.
      'case "$*" in',
      '  *"-o pgid="*) echo " 99999"; exit 0;;',
      'esac',
      `cat <<'PSEOF'`,
      psInventory,
      'PSEOF',
    ].join('\n')
  );
  writeStub(built.stubs, 'sleep', 'exit 0');

  if (gitMutation) writeGitState(built.root, gitMutation);

  // DEBUG-392: bound the harness itself. spawnSync blocks the jest process outright, so
  // jest's own per-test timeout cannot interrupt it — a script under test that fails to
  // bound its child would wedge the whole suite for as long as that child lives. That is
  // the same defect this work fixes in the gate, and a test suite that can hang while
  // proving the gate cannot is not worth much. 45s is far above any stubbed run (all
  // sub-second) and far below the wedges these tests simulate.
  const res = spawnSync('bash', [path.join(built.root, 'scripts', 'e2e-safety.sh'), ...flows], {
    encoding: 'utf8',
    cwd: built.root,
    env: { ...process.env, PATH: `${built.stubs}:${process.env.PATH}`, ...env },
    timeout: 45000,
    killSignal: 'SIGKILL',
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
    // INFRA-405: read through r.container — containers are per-device now, so a hardcoded
    // flat path would silently look at a device the build never targeted.
    const bundle = fs.readFileSync(path.join(r.container, 'main.jsbundle'), 'utf8');
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
    // INFRA-424 rewrote this. It used to assert status 0 / flowsRun 1 with NO device
    // present, which pinned the defect: the flow ran, unpinned, against whatever maestro
    // chose. The property actually worth keeping is that an explicit name REACHES a
    // device-only flow at all (the tag filter excludes it from the suite), so supply the
    // device the flow now requires and assert it is reached and pinned.
    const built = runScript({ attachedDevices: ONE_DEVICE });
    const gate = runSafety(built, { flows: ['crisis-988-dial'] });
    expect(gate.status).toBe(0);
    expect(gate.flowsRun).toBe(1);
    expect(gate.trace).toMatch(/maestro test --device DEV-1111/);
  });

  test('a device-only flow skips the SIMULATOR pre-flight but is still pinned', () => {
    // crisis-988-dial runs against a REAL iPhone (the sim's canOpenURL returns false
    // unconditionally). The simulator pre-flight reasons about the booted SIM's installed
    // app, so it cannot apply here — but "no simulator pre-flight" never implied "no
    // target". INFRA-424 separates the two claims: the target is named, the binary on it
    // is not vouched for.
    const built = runScript({ attachedDevices: ONE_DEVICE });
    fs.rmSync(built.container, { recursive: true, force: true }); // no app on the sim
    const gate = runSafety(built, { flows: ['crisis-988-dial'] });
    expect(gate.status).toBe(0);
    expect(gate.flowsRun).toBe(1);
    // The attestation warning must SURVIVE pinning — shape and provenance are still
    // simulator-container-bound and still unavailable for a device.
    expect(gate.output).toMatch(/NO artifact attestation/i);
    expect(gate.output).not.toMatch(/provenance: built from this exact tree/);
    // ...and no simctl container lookup was performed for the gate.
    expect(gate.trace).not.toMatch(/get_app_container/);
  });

  test('a MIXED selection is REFUSED, not resolved to one target class', () => {
    // INFRA-424 rewrote this. It used to assert the mixed set fell through to the SIM
    // pre-flight and failed there on provenance — which is the defect: the 988 device flow
    // would then have run against that simulator underneath "✓ gate target verified" and
    // "✓ provenance" banners. There is no correct target for a mixed set, so it refuses.
    const built = runScript({});
    const gate = runSafety(built, { flows: ['crisis-988-dial', 'q9-single-alert'] });
    expect(gate.status).not.toBe(0);
    expect(gate.output).toMatch(/mixed flow selection/i);
    expect(gate.flowsRun).toBe(0);
    // The refusal must name the offending flow so the operator can split the invocation.
    expect(gate.output).toMatch(/crisis-988-dial/);
    // It must refuse BEFORE attesting anything — the whole point is that the banners
    // described a binary the device flow never ran against.
    expect(gate.output).not.toMatch(/gate target verified/);
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
        // INFRA-407: build-only, same split as the shared stub — copy to --output and leave
        // installing to `simctl install`.
        '  OUT=""; prev=""',
        '  for a in "$@"; do if [ "$prev" = "--output" ]; then OUT="$a"; fi; prev="$a"; done',
        '  if [ -n "$OUT" ]; then mkdir -p "$OUT"; cp -Rp "$APP" "$OUT/"; fi',
        'fi',
        'exit 0',
      ].join('\n')
    );
    writeStub(
      stubs,
      'xcrun',
      [
        // INFRA-405: this second inline stub needed the same `-j` JSON treatment as the
        // shared one. It answered every `simctl list` with human-readable text, so device
        // resolution now fails and the script aborts at simulator selection — before it
        // can reach the mid-build tree mutation this test is actually about.
        'if [ "$1" = "simctl" ] && [ "$2" = "list" ]; then',
        '  case "$*" in',
        `    *-j*) echo '{"devices":{"iOS-18-0":[{"udid":"ABC","name":"iPhone 16","state":"Booted"}]}}'; exit 0 ;;`,
        '  esac',
        '  echo "iPhone 16 (ABC) (Booted)"; exit 0',
        'fi',
        `if [ "$1" = "simctl" ] && [ "$2" = "uninstall" ]; then rm -rf "${container}"; exit 0; fi`,
        // INFRA-407: the build no longer installs, so this stub must — otherwise the script
        // aborts at artifact discovery and never reaches the mid-build tree mutation this
        // test is actually about (the same shape as the INFRA-405 note above).
        'if [ "$1" = "simctl" ] && [ "$2" = "install" ]; then',
        `  rm -rf "${container}"; mkdir -p "$(dirname "${container}")"; cp -Rp "$4" "${container}"; exit 0`,
        'fi',
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

// =====================================================================================
// INFRA-405 — multi-simulator device selection.
//
// The defect: the build resolved a concrete UDID and installed to it, then asserted
// against the LITERAL selector `booted`. `xcrun simctl help` says of that selector:
// "If multiple devices are booted when the 'booted' device is selected, simctl will
// choose one of them." So with 2+ booted the install target and the assert target could
// diverge, and the script exited claiming the build "installed no fyi.being.app" — the
// opposite of what happened.
//
// None of this was representable before: the old xcrun stub answered any `simctl list`
// with human-readable text, so the script's `-j` JSON parse always threw and `|| UDID=""`
// fired. Every test in this file ran the UDID-empty path and `--device` was never once
// asserted. The stub now models real JSON, per-device containers, and simctl's ambiguity.
// =====================================================================================

const ONE = [{ udid: 'AAAA-1111', name: 'iPhone 16 Plus' }];
const TWO = [
  { udid: 'AAAA-1111', name: 'iPhone 16 Plus' },
  { udid: 'BBBB-2222', name: 'iPad Pro 13' },
];

describe('INFRA-405 — e2e-sim-build.sh device selection', () => {
  test('one booted: the build targets it EXPLICITLY via --device', () => {
    const r = runScript({ bootedDevices: ONE });
    expect(r.status).toBe(0);
    // INFRA-407 moved WHERE the device is named, not WHETHER it is. The build is now
    // `--device generic` (build-only, so it installs nothing and needs no device), and the
    // resolved device is named on the `simctl install` that follows. INFRA-405's guarantee
    // — the device we resolved is the device we assert against — is what `installTarget`
    // pins, and it is unchanged. Asserting `deviceFlag` were still the udid would now be
    // asserting that the build installs, which is the behaviour INFRA-407 removed.
    expect(r.deviceFlag).toBe('generic');
    expect(r.installTarget).toBe('AAAA-1111');
    expect(r.markerExists).toBe(true);
  });

  test('two booted, no override: refuses BEFORE building, and never blames the artifact', () => {
    const r = runScript({ bootedDevices: TWO });
    expect(r.status).not.toBe(0);
    // Fail closed, and fail EARLY — nothing may be built or installed on an ambiguous
    // target, because the failure trap could not know which device to clean up.
    expect(r.buildRan).toBe(false);
    expect(r.installed).toBe(false);
    // The message must name the real cause and the fix.
    expect(r.output).toMatch(/2 simulators booted/i);
    expect(r.output).toMatch(/ambiguous/i);
    expect(r.output).toMatch(/simctl shutdown|E2E_SIM_UDID/);
    // The whole point of the item: this exact string must never appear again while the
    // app is in fact installed correctly.
    expect(r.output).not.toMatch(/installed no fyi\.being\.app/);
  });

  test('two booted + E2E_SIM_UDID: installs onto the NAMED device and writes its marker', () => {
    const r = runScript({ bootedDevices: TWO, simUdid: 'BBBB-2222' });
    expect(r.status).toBe(0);
    // INFRA-407: the build is device-agnostic (`generic`, build-only); the OVERRIDE is
    // honoured where it matters — the install. The assertion below plus the untouched-other
    // -device check at the end of this test are what actually pin E2E_SIM_UDID's effect.
    expect(r.deviceFlag).toBe('generic');
    expect(r.installTarget).toBe('BBBB-2222');
    expect(r.markerExists).toBe(true);
    // The other booted device must be left completely alone.
    expect(fs.existsSync(r.containerFor('AAAA-1111'))).toBe(false);
  });

  test('E2E_SIM_UDID naming a device that is not booted fails closed', () => {
    const r = runScript({ bootedDevices: TWO, simUdid: 'CCCC-3333' });
    expect(r.status).not.toBe(0);
    expect(r.buildRan).toBe(false);
    expect(r.output).toMatch(/not among the booted simulators/i);
  });

  test('a second simulator booting MID-BUILD does not break the post-build assert', () => {
    // The headline regression. The reported case had Simulator.app auto-boot a device
    // inside the build window, AFTER the pre-build check had confirmed exactly one. A
    // check before the build does not hold for its duration — but a UDID captured before
    // it does, which is why resolution happens once.
    const r = runScript({
      bootedDevices: ONE,
      midBuildBoot: { udid: 'BBBB-2222', name: 'iPad Pro 13' },
    });
    expect(r.status).toBe(0);
    expect(r.installTarget).toBe('AAAA-1111');
    expect(r.markerExists).toBe(true);
    expect(r.output).not.toMatch(/installed no fyi\.being\.app/);
  });

  test('no simulator booted is reported as such, distinctly from an enumeration failure', () => {
    const r = runScript({ bootedDevices: [] });
    expect(r.status).not.toBe(0);
    expect(r.buildRan).toBe(false);
    expect(r.output).toMatch(/no iOS simulator booted/i);
    expect(r.output).not.toMatch(/could not enumerate/i);
  });

  test('an ENUMERATION failure is reported as such, not as "no simulator booted"', () => {
    // Two different facts that previously collapsed into the same silent empty string:
    // `simctl list ... -j` failing yielded `UDID=""` exactly like a machine with nothing
    // booted. Telling an operator to boot a simulator when the real problem is that
    // simctl is unavailable sends them somewhere useless.
    const r = runScript({ simctlListFails: true });
    expect(r.status).not.toBe(0);
    expect(r.buildRan).toBe(false);
    expect(r.output).toMatch(/could not enumerate/i);
    expect(r.output).not.toMatch(/no iOS simulator booted/i);
  });

  test('a failed post-install assert uninstalls from the RESOLVED device, not `booted`', () => {
    // The failure trap used `uninstall booted`, so on a multi-sim machine cleanup could
    // miss and leave a marker-less app behind — which e2e-safety.sh then fail-closes on,
    // reporting a provenance problem rather than the build problem that caused it.
    const r = runScript({ bootedDevices: ONE, otoolDevLauncher: true });
    expect(r.status).not.toBe(0);
    expect(r.trace).toMatch(/uninstall AAAA-1111/);
    expect(r.trace).not.toMatch(/uninstall booted/);
    expect(fs.existsSync(r.containerFor('AAAA-1111'))).toBe(false);
  });
});

describe('INFRA-405 — e2e-safety.sh device selection', () => {
  test('passes the resolved device to maestro, so flows run on the binary just verified', () => {
    // Without this the pre-flight can attest device A's container while maestro drives
    // device B — which is verbatim the failure the pre-flight exists to prevent.
    const built = runScript({ bootedDevices: ONE });
    const r = runSafety(built);
    expect(r.status).toBe(0);
    expect(r.flowsRun).toBe(2);
    expect(r.trace).toMatch(/maestro test --device AAAA-1111/);
  });

  test('refuses when a second simulator booted between the build and the gate run', () => {
    const built = runScript({ bootedDevices: ONE });
    const r = runSafety(built, { booted: TWO });
    expect(r.status).not.toBe(0);
    expect(r.flowsRun).toBe(0);
    expect(r.output).toMatch(/ambiguous/i);
  });

  test('an explicit E2E_SIM_UDID lets the gate run against the named device', () => {
    const built = runScript({ bootedDevices: TWO, simUdid: 'BBBB-2222' });
    const r = runSafety(built, { booted: TWO, env: { E2E_SIM_UDID: 'BBBB-2222' } });
    expect(r.status).toBe(0);
    expect(r.trace).toMatch(/maestro test --device BBBB-2222/);
  });

  test('device-only runs gain no SIMULATOR dependency — 2 sims booted does not abort them', () => {
    // INFRA-424 rewrote the tail of this test. Its `expect(r.trace).not.toMatch(/--device/)`
    // asserted the defect itself: an unpinned run is what let the 988 flow attach to an
    // arbitrary booted simulator, including a peer worktree's.
    //
    // The load-bearing half SURVIVES unchanged and is why the test still exists: the
    // real-iPhone procedure must gain no simulator dependency, so TWO booted sims — which
    // abort any simulator run as ambiguous — must NOT abort this one. That property is
    // exactly what INFRA-405's DEVICE_ONLY scoping bought, and it is easy to lose while
    // adding device pinning.
    const built = runScript({ bootedDevices: ONE, attachedDevices: ONE_DEVICE });
    const r = runSafety(built, { flows: ['crisis-988-dial'], booted: TWO });
    expect(r.status).toBe(0);
    expect(r.flowsRun).toBe(1);
    expect(r.output).toMatch(/NO artifact attestation/i);
    // Not aborted as ambiguous despite two sims booted, and no simctl resolution ran.
    expect(r.output).not.toMatch(/ambiguous/i);
    expect(r.trace).not.toMatch(/simctl list/);
    // Pinned to the DEVICE, never to either simulator.
    expect(r.trace).toMatch(/maestro test --device DEV-1111/);
    expect(r.trace).not.toMatch(/--device AAAA-1111/);
    expect(r.trace).not.toMatch(/--device BBBB-2222/);
  });
});

// =====================================================================================
// INFRA-424 — a `safety-device-only` flow resolves and pins its target device.
//
// INFRA-405 pinned every flow to the attested simulator, but scoped that under
// `DEVICE_ONLY != 1` so the real-iPhone procedure gained no simctl dependency. The
// residue: crisis-988-dial, the only `safety-device-only` flow, was the only flow that ran
// with no `--device` at all — and `maestro test` picks its own target when not told one.
// With simulators booted and no iPhone attached it could attach to one of them, which is
// both a guaranteed red (a simulator's canOpenURL('tel:') is false regardless of
// LSApplicationQueriesSchemes) and a way to corrupt a peer worktree's in-flight run.
//
// HONESTY NOTE ON COVERAGE. The happy path here is STUB-ONLY: it proves the `--device`
// argument is constructed from the resolved UDID and passed, NOT that maestro drives a
// real iPhone. Only the three REFUSAL branches are honestly covered under stubs, which is
// the same limitation the work item records — the refusal branches are testable with
// stubs, the happy path is not. Real-hardware validation remains a manual step.
// =====================================================================================
describe('e2e-safety.sh — INFRA-424 device-only flows pin their target', () => {
  test('ZERO attached devices REFUSES and runs nothing — no silent simulator fallback', () => {
    // The headline regression assertion. Two simulators are booted and the app is
    // installed on one, so a fallback would have something to attach to — and the old
    // behaviour did exactly that.
    const built = runScript({ bootedDevices: ONE, attachedDevices: [] });
    const r = runSafety(built, { flows: ['crisis-988-dial'], booted: TWO });
    expect(r.status).not.toBe(0);
    expect(r.flowsRun).toBe(0);
    expect(r.output).toMatch(/device-only/i);
    // Never runs maestro at all, and never names a simulator as the target.
    expect(r.trace).not.toMatch(/maestro test/);
    expect(r.trace).not.toMatch(/--device/);
    // Says the consequence out loud rather than only "no device found" — a bare refusal
    // trains abandonment, and an unrun gate is worse than a noisy one.
    expect(r.output).toMatch(/NOT verified/i);
    // Names the override so the refusal is actionable.
    expect(r.output).toMatch(/E2E_DEVICE_UDID/);
  });

  test('EXACTLY ONE attached device is pinned and the flow runs', () => {
    const built = runScript({ attachedDevices: ONE_DEVICE });
    const r = runSafety(built, { flows: ['crisis-988-dial'] });
    expect(r.status).toBe(0);
    expect(r.flowsRun).toBe(1);
    expect(r.trace).toMatch(/maestro test --device DEV-1111/);
  });

  test('TWO attached devices refuse as AMBIGUOUS and list the candidates', () => {
    const built = runScript({ attachedDevices: TWO_DEVICES });
    const r = runSafety(built, { flows: ['crisis-988-dial'] });
    expect(r.status).not.toBe(0);
    expect(r.flowsRun).toBe(0);
    expect(r.output).toMatch(/ambiguous/i);
    expect(r.output).toMatch(/DEV-1111/);
    expect(r.output).toMatch(/DEV-2222/);
    expect(r.output).toMatch(/E2E_DEVICE_UDID/);
    expect(r.trace).not.toMatch(/maestro test/);
  });

  test('E2E_DEVICE_UDID selects among two attached devices', () => {
    const built = runScript({ attachedDevices: TWO_DEVICES });
    const r = runSafety(built, {
      flows: ['crisis-988-dial'],
      env: { E2E_DEVICE_UDID: 'DEV-2222' },
    });
    expect(r.status).toBe(0);
    expect(r.trace).toMatch(/maestro test --device DEV-2222/);
  });

  test('E2E_DEVICE_UDID naming an unattached device refuses rather than falling back', () => {
    const built = runScript({ attachedDevices: TWO_DEVICES });
    const r = runSafety(built, {
      flows: ['crisis-988-dial'],
      env: { E2E_DEVICE_UDID: 'DEV-9999' },
    });
    expect(r.status).not.toBe(0);
    expect(r.output).toMatch(/not among the attached devices/i);
    expect(r.trace).not.toMatch(/maestro test/);
  });

  test('E2E_SIM_UDID is NOT honoured as a device override', () => {
    // The override is deliberately a SEPARATE variable. docs/testing/e2e-maestro.md tells
    // operators to export E2E_SIM_UDID for both halves of a session, so it is routinely
    // live in the environment holding a SIMULATOR udid. If this resolver read it, that
    // simulator udid would refuse a correctly-attached iPhone — documented, correct
    // operator behaviour turned into a confusing refusal.
    const built = runScript({ attachedDevices: ONE_DEVICE });
    const r = runSafety(built, {
      flows: ['crisis-988-dial'],
      env: { E2E_SIM_UDID: 'AAAA-1111' },
    });
    expect(r.status).toBe(0);
    // Resolved from the attached device, NOT from the simulator udid in the environment.
    expect(r.trace).toMatch(/maestro test --device DEV-1111/);
    expect(r.trace).not.toMatch(/--device AAAA-1111/);
  });

  test('enumeration FAILURE is reported distinctly from zero devices attached', () => {
    // The same two-facts-must-not-collapse property e2e_booted_devices carries. It is
    // sharper here: devicectl writes JSON to a caller-supplied FILE, so an unwritten file
    // is the normal shape of a failure and would otherwise read as "nothing attached".
    const built = runScript({ devicectlFails: true });
    const r = runSafety(built, { flows: ['crisis-988-dial'] });
    expect(r.status).not.toBe(0);
    expect(r.output).toMatch(/could not enumerate/i);
    expect(r.output).not.toMatch(/no eligible iPhone attached/i);
    expect(r.trace).not.toMatch(/maestro test/);
  });

  test('an INELIGIBLE device does not count as attached', () => {
    // The filter is load-bearing, not hygiene. On the machine this was developed against
    // the only devicectl entry is an iPad in tunnelState "unavailable" — ineligible on two
    // independent grounds. A loose filter would resolve it as "exactly one", pin maestro
    // to an iPad, and produce a FALSE RED on the crisis path: a Wi-Fi iPad has no
    // telephony, so canOpenURL('tel:') is legitimately false there.
    const built = runScript({
      attachedDevices: [
        { udid: 'IPAD-1', name: 'Max IPA', deviceType: 'iPad', tunnelState: 'unavailable' },
        { udid: 'PHONE-OFF', name: 'Old iPhone', tunnelState: 'unavailable' },
        { udid: 'PHONE-UNPAIRED', name: 'Someone elses iPhone', pairingState: 'unpaired' },
        { udid: 'WATCH-1', name: 'Max Watch', platform: 'watchOS' },
      ],
    });
    const r = runSafety(built, { flows: ['crisis-988-dial'] });
    expect(r.status).not.toBe(0);
    expect(r.output).toMatch(/no eligible iPhone attached/i);
    expect(r.trace).not.toMatch(/maestro test/);
    expect(r.trace).not.toMatch(/--device/);
  });

  test('a connected iPhone alongside ineligible devices resolves unambiguously', () => {
    // The complement of the test above, and the one that proves the filter is not simply
    // rejecting everything — a negative-only filter test can pass while matching nothing.
    const built = runScript({
      attachedDevices: [
        { udid: 'IPAD-1', name: 'Max IPA', deviceType: 'iPad', tunnelState: 'unavailable' },
        { udid: 'DEV-1111', name: 'Max iPhone' },
        { udid: 'WATCH-1', name: 'Max Watch', platform: 'watchOS' },
      ],
    });
    const r = runSafety(built, { flows: ['crisis-988-dial'] });
    expect(r.status).toBe(0);
    expect(r.trace).toMatch(/maestro test --device DEV-1111/);
  });

  test('the driver reset stays disabled on a device run and never sees the device UDID', () => {
    // An empty SIM_UDID is a SENTINEL, not merely an unset value: e2e_reset_drivers reads
    // it as "device-only, nothing to reset" and returns early. The tempting shortcut —
    // assigning the resolved device UDID to SIM_UDID to get --device for free — would
    // silently re-enable XCUITest driver reaping during a real-device run, filtered by a
    // physical-device UDID the INFRA-423 classifier was never designed for.
    const built = runScript({ attachedDevices: ONE_DEVICE });
    const r = runSafety(built, {
      flows: ['crisis-988-dial'],
      psInventory: [
        '  501   999  501 java /usr/bin/java -cp maestro.cli.AppKt',
        '  502   501  501 xcodebuild /usr/bin/xcodebuild test-without-building -destination id=DEV-1111',
      ].join('\n'),
    });
    expect(r.status).toBe(0);
    // No reset line of either kind — the function returned before logging.
    expect(r.output).not.toMatch(/driver reset/);
    expect(r.trace).not.toMatch(/pkill/);
  });
});

// =====================================================================================
// DEBUG-392 — the gate must be able to say "I could not run", not only "pass"/"fail".
//
// On 2026-08-08 `maestro test` wedged ~80 minutes inside `Maestro.clearAppState`
// (Maestro.kt:93), had to be `kill -9`'d, and emitted no flow verdict at all. The gate
// read exit codes only, and a process that never exits has no exit code — so /b-close
// Phase 2.5, which routes the merge decision on this script's status, would have blocked
// forever. These tests pin the three properties that fix makes load-bearing:
//
//   1. every invocation is BOUNDED, and a bound that fires can never produce a pass;
//   2. the verdict is a CONJUNCTION of the exit code and a JUnit report written into a
//      per-invocation private directory — neither source can vouch for the other;
//   3. the driver reset never reaps a neighbouring session's run.
//
// Property 3 is not hypothetical. On 2026-08-12 six consecutive runs from another
// worktree produced zero commands artifacts and 239+ `Failed to connect to /127.0.0.1`
// lines each — the signature of `pkill -f test-without-building` firing across sessions
// while that session's invocation was live.

/** A maestro stub that never returns. `/bin/sleep` by absolute path — the PATH `sleep` is stubbed. */
const MAESTRO_WEDGES = 'exec /bin/sleep 3600';

/** A maestro stub that writes a JUnit report to whatever `--output` it was given. */
function maestroWrites({ flow = 'crisis-button-reachability', failures = 0, exit = 0, omitReport = false, wedgeAfter = false } = {}) {
  return [
    'out=""',
    'for a in "$@"; do case "$a" in --output=*) out="${a#--output=}";; esac; done',
    `if [ -n "$out" ] && [ "${omitReport ? 1 : 0}" != "1" ]; then`,
    `  printf '%s\\n' '<?xml version="1.0"?><testsuites><testsuite name="s" tests="1" failures="${failures}" errors="0">' > "$out"`,
    failures > 0
      ? `  printf '%s\\n' '<testcase name="${flow}" classname="${flow}"><failure>Assertion is false</failure></testcase>' >> "$out"`
      : `  printf '%s\\n' '<testcase name="${flow}" classname="${flow}"/>' >> "$out"`,
    `  printf '%s\\n' '</testsuite></testsuites>' >> "$out"`,
    'fi',
    // The nastiest real shape: the report lands, THEN the process wedges. Adjudication
    // would read a clean report; the bound must still win.
    wedgeAfter ? MAESTRO_WEDGES : `exit ${exit}`,
  ].join('\n');
}

describe('DEBUG-392 — bounded invocation', () => {
  test('a wedged maestro is killed at the bound and reported as TIMEOUT, not FAIL', () => {
    const built = runScript({});
    const r = runSafety(built, {
      flows: ['crisis-button-reachability'],
      maestroBody: MAESTRO_WEDGES,
      env: { E2E_FLOW_TIMEOUT_S: '1' },
    });
    expect(r.output).toMatch(/TIMEOUT/);
    // A distinct exit code, because "the gate found a regression" and "the gate could
    // not run" are different facts and a human triaging a red needs to tell them apart.
    expect(r.status).toBe(2);
  }, 60000);

  test('a timeout can never be laundered into a pass by a clean report', () => {
    // The dangerous shape: the bound fires, but a report (stale, or from the flow's own
    // earlier completion) parses clean. Adjudication may only ever downgrade.
    const built = runScript({});
    const r = runSafety(built, {
      flows: ['crisis-button-reachability'],
      maestroBody: maestroWrites({ wedgeAfter: true }),
      env: { E2E_FLOW_TIMEOUT_S: '1' },
    });
    expect(r.output).toMatch(/TIMEOUT/);
    expect(r.output).not.toMatch(/all safety flows passed/);
    expect(r.status).toBe(2);
  }, 60000);

  test('the second timeout aborts the remaining flows', () => {
    // 8 flows x a 600s bound is an 80-minute worst case, which reinstates the problem
    // being solved. And the wedge lives in CoreSimulator, which does not un-wedge, so
    // flows 3..N would emit garbage reds that train re-run-until-green.
    const built = runScript({});
    const r = runSafety(built, {
      // Three, because the abort is observable only in what it PREVENTS: with two
      // flows the second timeout has nothing left to skip.
      flows: ['crisis-button-reachability', 'q9-single-alert', 'crisis-button-reachability'],
      maestroBody: MAESTRO_WEDGES,
      env: { E2E_FLOW_TIMEOUT_S: '1' },
    });
    expect(r.output).toMatch(/abort/i);
    expect(r.flowsRun).toBe(2); // the third never invoked maestro at all
    expect(r.status).toBe(2);
  }, 90000);
});

describe('DEBUG-392 — the verdict is a conjunction', () => {
  test('exit 0 with NO report is a FAIL, not a pass', () => {
    // The core of the fix. Exit 0 proves the process finished; it does not prove the
    // assertions held. Absence of a report is the wedged/killed signature.
    const built = runScript({});
    const r = runSafety(built, {
      flows: ['crisis-button-reachability'],
      maestroBody: maestroWrites({ omitReport: true, exit: 0 }),
    });
    expect(r.status).toBe(1);
    expect(r.output).toMatch(/NO_REPORT/);
    expect(r.output).not.toMatch(/all safety flows passed/);
  }, 60000);

  test('exit 0 with a clean report naming the flow is the only green', () => {
    const built = runScript({});
    const r = runSafety(built, {
      flows: ['crisis-button-reachability'],
      maestroBody: maestroWrites({}),
    });
    expect(r.status).toBe(0);
    expect(r.output).toMatch(/all safety flows passed/);
  }, 60000);

  test('a failing report is a FAIL even though the harness exited cleanly', () => {
    const built = runScript({});
    const r = runSafety(built, {
      flows: ['crisis-button-reachability'],
      maestroBody: maestroWrites({ failures: 1, exit: 0 }),
    });
    expect(r.status).toBe(1);
  }, 60000);

  test('exit non-zero with a clean report is still a FAIL, and says the sources disagree', () => {
    // A harness bug deserves its own investigation, never a green.
    const built = runScript({});
    const r = runSafety(built, {
      flows: ['crisis-button-reachability'],
      maestroBody: maestroWrites({ exit: 3 }),
    });
    expect(r.status).toBe(1);
    expect(r.output).toMatch(/disagree/i);
  }, 60000);
});

describe('DEBUG-392 — evidence comes from a private per-invocation directory', () => {
  test('maestro is told to write JUNIT and a debug dump to paths this run owns', () => {
    // ~/.maestro/tests is global and this machine drives one simulator from several
    // worktrees, so `ls -dt ~/.maestro/tests/*/ | head -1` can select a NEIGHBOUR's run.
    // Adjudicating a merge on that is a laundered pass.
    const built = runScript({});
    const r = runSafety(built, {
      flows: ['crisis-button-reachability'],
      maestroBody: maestroWrites({}),
    });
    // `=` form, matching `maestro test --help` verbatim. picocli accepts both, but the
    // gate gets exactly one real run per build and an argument-parsing failure there is
    // an expensive way to learn that.
    expect(r.trace).toMatch(/--format=JUNIT/);
    expect(r.trace).toMatch(/--output=\S+/);
    expect(r.trace).toMatch(/--debug-output=\S+/);
    expect(r.trace).not.toMatch(/--output=\S*\.maestro\/tests/);
  }, 60000);
});

describe('INFRA-423 — the driver reset reaps by ownership, never by pattern', () => {
  // Retargeted from DEBUG-392's suite. That guard SKIPPED the whole reset whenever any
  // peer JVM was live, so its tests asserted on skip-vs-fire. Ownership is now decided
  // per-process, so the assertions move to WHICH pids are reaped — and the outcome for a
  // live peer is stronger than before: its driver is protected while ours is still reset,
  // where the old guard had to forgo our own reset to spare theirs.
  //
  // Columns are `pid ppid pgid comm args`. The UDID MUST be the sandbox's booted device
  // (`bootedDevices` default), because the classifier scopes to the resolved simulator —
  // a mismatched UDID here would make every assertion below pass vacuously against an
  // empty reap set, the same silently-wrong shape INFRA-405 found in this file's stubs.
  const UDID = 'AAAA-1111';
  const DRIVER_ARGS = `/usr/bin/xcodebuild test-without-building -destination id=${UDID}`;

  /** A peer mid-flow: live JVM (pid 4242) with its driver (4243) as a direct child. */
  const PEER_JVM_AND_DRIVER = [
    `  4242 4241 4242 java /usr/bin/java -classpath /opt/homebrew/lib/* maestro.cli.AppKt test --device ${UDID} flow.yaml`,
    `  4243 4242 4242 /usr/bin/xcodebuild ${DRIVER_ARGS}`,
  ].join('\n');

  /** A wedged leftover from a crashed run: JVM gone, reparented to launchd. */
  const ORPHANED_DRIVER = `  5150 1 5150 /usr/bin/xcodebuild ${DRIVER_ARGS}`;

  // A shell POLLING for maestro. Not hypothetical: a peer session running
  // `pgrep -f 'maestro.cli.AppKt'` to see whether we had finished is what broke the
  // first implementation, and Claude Code's own `/bin/zsh -c` wrapper reproduces it.
  const SHELL_MENTIONING_MAESTRO =
    `  7306 7305 7306 /bin/zsh /bin/zsh -c pgrep -f 'maestro.cli.AppKt' && echo "${DRIVER_ARGS}"`;

  const safetyEnv = { E2E_DRIVER_REAP_DRY_RUN: '1' };

  test('never reaps a driver belonging to a live neighbouring session', () => {
    // THE DEFECT. `pkill -f "test-without-building"` reaped this pid; six zero-artifact
    // runs on 2026-08-12 carried 239+ `Failed to connect to /127.0.0.1` lines apiece,
    // the signature of a driver pulled out from under a running invocation.
    const built = runScript({});
    const r = runSafety(built, {
      flows: ['crisis-button-reachability'],
      maestroBody: maestroWrites({}),
      psInventory: PEER_JVM_AND_DRIVER,
      env: safetyEnv,
    });
    expect(r.output).not.toMatch(/would kill:.*\b4243\b/);
    expect(r.output).toMatch(/PROTECTED/);
  }, 60000);

  test('reaps an orphaned driver left by an earlier crashed run', () => {
    // The self-recovery case DEBUG-392's guard declined, and which the in-loop reap alone
    // could never reach on flow 1 — hence the pre-flight reset.
    const built = runScript({});
    const r = runSafety(built, {
      flows: ['crisis-button-reachability'],
      maestroBody: maestroWrites({}),
      psInventory: ORPHANED_DRIVER,
      env: safetyEnv,
    });
    expect(r.output).toMatch(/would kill:.*\b5150\b/);
  }, 60000);

  test('protects the peer AND still resets, where the old guard had to choose', () => {
    const built = runScript({});
    const r = runSafety(built, {
      flows: ['crisis-button-reachability'],
      maestroBody: maestroWrites({}),
      psInventory: `${PEER_JVM_AND_DRIVER}\n${ORPHANED_DRIVER}`,
      env: safetyEnv,
    });
    expect(r.output).toMatch(/would kill:.*\b5150\b/);
    expect(r.output).not.toMatch(/would kill:.*\b4243\b/);
  }, 60000);

  test('a shell that merely MENTIONS the driver string is never reaped', () => {
    // THE REGRESSION, retargeted. It used to pin that such a shell did not SUPPRESS the
    // reset; it now pins that such a shell is not itself KILLED. Same defect class —
    // substring-as-identity — caught on the side that can now do damage. `pkill -f`
    // would have matched this line on both counts.
    const built = runScript({});
    const r = runSafety(built, {
      flows: ['crisis-button-reachability'],
      maestroBody: maestroWrites({}),
      psInventory: SHELL_MENTIONING_MAESTRO,
      env: safetyEnv,
    });
    expect(r.output).not.toMatch(/would kill:.*\b7306\b/);
  }, 60000);

  test('no pattern kill survives anywhere in the gate', () => {
    // The blunt structural guard: whatever else changes, `pkill` must not come back.
    const built = runScript({});
    const r = runSafety(built, {
      flows: ['crisis-button-reachability'],
      maestroBody: maestroWrites({}),
      psInventory: ORPHANED_DRIVER,
      env: safetyEnv,
    });
    expect(r.trace).not.toMatch(/pkill/);
  }, 60000);
});
