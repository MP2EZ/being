#!/usr/bin/env node
'use strict';

/**
 * check-generated-infoplist.js — INFRA-592
 *
 * Asserts that the Info.plist `expo prebuild` GENERATES still lists `tel` and `sms` in
 * LSApplicationQueriesSchemes. Without them `Linking.canOpenURL('tel:988')` returns false
 * and CrisisResourcesScreen falls back to "Unable to Call" during a crisis.
 *
 * iOS is CNG (INFRA-280): app/ios/ is generated, gitignored, and no reviewer ever sees a
 * plist diff. The failure this exists for is a key PRESENT in app.json and ABSENT from the
 * generated output. A config plugin registered as a bare string takes its library defaults,
 * and an option of `false` deletes a plist key, so a dependency bump can strip it with no
 * app.json change at all.
 *
 * Three halves, none a substitute for another:
 *   - __tests__/safety/lsApplicationQueriesSchemes.config.test.ts — the SOURCE. Does app.json
 *     declare the schemes. Cannot see plugin composition by construction.
 *   - this check — COMPOSITION. app.json + plugins + the lockfile's library versions, fresh,
 *     on every PR. Cannot see what the Xcode build or EAS does after prebuild.
 *   - scripts/e2e-sim-build.sh §7f — the BUILT .app, on gate builds only. /b-close Phase 2.5
 *     does not arm a gate build on a dependency bump.
 * None proves canOpenURL on hardware; that is docs/testing/crisis-device-checklist.md §2.
 *
 * THIS IS A CI GATE, and it can be one. `@expo/cli` skips iOS prebuild only on win32
 * (56.1.12, build/src/prebuild/resolveOptions.js:210), and the template ships in
 * node_modules/expo/template.tgz, so ubuntu-latest generates the same project macOS does.
 * Measured on ubuntu-latest, PR #510 (actions/runs/<id>): clean → 0 (34916221140); a
 * finalized mod stripping sms → 1 with the app.json pin green (34916372558); tel → telprompt
 * → 1 (34916496957); a throwing plugin → 2 (34916608339).
 * Do not move it to local-only without a new crisis ruling.
 *
 * Deliberately narrow: two exact array elements, not a plist snapshot, which would churn on
 * every SDK bump and get disabled. Adding a scheme (mailto) passes.
 *
 * Generation is fresh every run, in a new temp dir. app/ios/ is NEVER read: locally it is
 * stale by construction, and on CI it does not exist, so reusing it could only ever run where
 * it is wrong. Never swap this for `expo config --type introspect`, which skips dangerous
 * mods — the plugins that write the file directly.
 *
 * Exit: 0 pass / 1 plist read, schemes wrong / 2 no trustworthy reading. No path exits 0
 * without a parsed plist.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const APP_DIR = path.resolve(__dirname, '..');
const EXIT = { PASS: 0, SCHEMES: 1, NO_READING: 2 };
const REQUIRED_SCHEMES = ['tel', 'sms'];
/** Everything prebuild reads besides node_modules. app.json names no path outside these. */
const INPUTS = ['app.json', 'package.json', 'plugins', 'assets'];

function renderValue(value) {
  if (value === undefined) return '<absent>';
  if (value === null) return '<null>';
  if (!Array.isArray(value)) return `<${typeof value}>`;
  return JSON.stringify(value);
}

function evaluateSchemes(value) {
  const rendered = renderValue(value);
  if (!Array.isArray(value)) {
    return { code: EXIT.SCHEMES, missing: [...REQUIRED_SCHEMES], reason: 'key absent or not an array', rendered };
  }
  // Exact elements: a substring match would accept `telprompt` or `smsto`.
  const missing = REQUIRED_SCHEMES.filter((s) => !value.includes(s));
  if (!value.every((s) => typeof s === 'string')) {
    return { code: EXIT.SCHEMES, missing, reason: 'not an array of strings', rendered };
  }
  if (missing.length) {
    return { code: EXIT.SCHEMES, missing, reason: `missing ${missing.join(', ')}`, rendered };
  }
  return { code: EXIT.PASS, missing, reason: null, rendered };
}

function collectLocalPaths(node, out = []) {
  if (typeof node === 'string') {
    if (node.startsWith('./') || node.startsWith('../')) out.push(node);
  } else if (node && typeof node === 'object') {
    for (const child of Object.values(node)) collectLocalPaths(child, out);
  }
  return out;
}

/**
 * Local paths app.json names that the temp copy cannot resolve. Plugins commonly skip a
 * missing file quietly, so an unresolved input would otherwise read as a pass. Plugin
 * references are extensionless module paths, hence the `.js` and `index.js` probes.
 */
function unresolvedLocalPaths(expoConfig, root, exists = fs.existsSync) {
  return collectLocalPaths(expoConfig).filter((rel) => {
    const abs = path.join(root, rel);
    return !(exists(abs) || exists(`${abs}.js`) || exists(path.join(abs, 'index.js')));
  });
}

function tail(text, lines = 30) {
  return String(text || '').trim().split('\n').slice(-lines).join('\n');
}

function run() {
  const report = { platform: process.platform, expoCli: '<unresolved>', workdir: '<none>', plist: '<none>' };
  const print = (stream) => {
    for (const [k, v] of Object.entries(report)) stream(`   ${k.padEnd(9)} ${v}`);
  };
  const noReading = (why, detail) => {
    console.error(`❌ No trustworthy reading of the generated Info.plist: ${why}`);
    print(console.error);
    if (detail) console.error(`\n${detail}`);
    return EXIT.NO_READING;
  };

  const expoPkg = require.resolve('expo/package.json', { paths: [APP_DIR] });
  const expoBin = path.join(APP_DIR, 'node_modules', '.bin', 'expo');
  if (!fs.existsSync(expoBin)) return noReading(`no local expo CLI at ${expoBin} (run npm ci)`);
  report.expoCli = require(require.resolve('@expo/cli/package.json', { paths: [path.dirname(expoPkg)] })).version;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-592-plist-'));
  report.workdir = tmp;
  for (const name of INPUTS) {
    const src = path.join(APP_DIR, name);
    if (!fs.existsSync(src)) return noReading(`input ${name} is missing from ${APP_DIR}`);
    fs.cpSync(src, path.join(tmp, name), { recursive: true });
  }
  fs.symlinkSync(path.join(APP_DIR, 'node_modules'), path.join(tmp, 'node_modules'), 'dir');

  const { expo } = JSON.parse(fs.readFileSync(path.join(tmp, 'app.json'), 'utf8'));
  const unresolved = unresolvedLocalPaths(expo, tmp);
  if (unresolved.length) {
    return noReading(`app.json names paths the copy lacks — add them to INPUTS: ${unresolved.join(', ')}`);
  }
  if (fs.existsSync(path.join(tmp, 'ios'))) return noReading('temp dir already holds ios/ before prebuild');

  const prebuild = spawnSync(expoBin, ['prebuild', '--platform', 'ios', '--no-install'], {
    cwd: tmp,
    env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' },
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (prebuild.status !== 0) {
    return noReading(
      `expo prebuild exited ${prebuild.status ?? prebuild.signal ?? prebuild.error}`,
      tail(`${prebuild.stdout}\n${prebuild.stderr}`)
    );
  }

  // The file Xcode builds is the one the app target's INFOPLIST_FILE names — never a glob,
  // which a widget extension's own Info.plist would make ambiguous.
  const { IOSConfig } = require(require.resolve('expo/config-plugins', { paths: [APP_DIR] }));
  const project = IOSConfig.XcodeUtils.getPbxproj(tmp);
  const buildConfig = IOSConfig.Target.getXCBuildConfigurationFromPbxproj(project, { buildConfiguration: 'Release' });
  const infoPlistFile = buildConfig?.buildSettings?.INFOPLIST_FILE?.replace(/"/g, '').replace('$(SRCROOT)', '');
  if (!infoPlistFile) return noReading('the app target has no INFOPLIST_FILE');
  report.plist = path.join(tmp, 'ios', infoPlistFile);
  if (!fs.existsSync(report.plist)) return noReading('INFOPLIST_FILE does not exist on disk');

  const configPlugins = path.dirname(require.resolve('@expo/config-plugins/package.json', { paths: [path.dirname(expoPkg)] }));
  const plist = require(require.resolve('@expo/plist', { paths: [configPlugins] })).default;
  const verdict = evaluateSchemes(plist.parse(fs.readFileSync(report.plist, 'utf8')).LSApplicationQueriesSchemes);
  report.value = verdict.rendered;
  report.missing = verdict.missing.length ? verdict.missing.join(', ') : '<none>';

  if (verdict.code !== EXIT.PASS) {
    console.error(`❌ Generated Info.plist: LSApplicationQueriesSchemes ${verdict.reason}.`);
    console.error("   Linking.canOpenURL('tel:988') would return false on device and the dial path");
    console.error('   would fall back to "Unable to Call". app.json may still look correct — find the');
    console.error('   plugin or dependency that rewrote the key.');
    print(console.error);
    return verdict.code;
  }
  console.log(`✅ Generated Info.plist keeps ${REQUIRED_SCHEMES.join(' and ')} in LSApplicationQueriesSchemes.`);
  print(console.log);
  fs.rmSync(tmp, { recursive: true, force: true });
  return EXIT.PASS;
}

function main() {
  try {
    return run();
  } catch (error) {
    console.error('❌ No trustworthy reading of the generated Info.plist: unexpected error');
    console.error(error && error.stack ? error.stack : String(error));
    return EXIT.NO_READING;
  }
}

module.exports = { EXIT, REQUIRED_SCHEMES, evaluateSchemes, collectLocalPaths, unresolvedLocalPaths };

if (require.main === module) process.exit(main());
