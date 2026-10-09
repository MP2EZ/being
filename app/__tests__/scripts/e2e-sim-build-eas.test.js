/**
 * INFRA-691 — the EAS fallback reaps the CocoaPods cache entries its own build created.
 *
 * `eas build --local` builds in a fresh working dir every run, and RN 0.85's podspecs embed
 * that dir's absolute path, so every run mints a new ~825 MB cache entry that no later run
 * can ever hit. Unlike a worktree's entry — which its own rebuilds reuse, so it is reaped
 * only once the worktree is gone — these are dead the moment the build ends, pass or fail.
 *
 * The script pins EAS's working dir (EAS_LOCAL_BUILD_WORKINGDIR) so it knows exactly which
 * entries are its own, and reaps them via `e2e-sim-clean.sh --pods-under`. Everything else
 * in the cache — a live worktree's entry, or another worktree's orphan — is out of scope.
 *
 * Runs the REAL script and the REAL sweep against a sandbox HOME; `eas`, `xcrun` and `git`
 * are PATH-shimmed. The `eas` shim plays the part of `pod install` by writing a cache entry
 * keyed to the working dir it was handed, then deletes that dir as EAS's own cleanup does.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPTS = path.resolve(__dirname, '../../scripts');

function writeStub(dir, name, body) {
  fs.writeFileSync(path.join(dir, name), `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 });
}

function makeSandbox({ easExits = 0 } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra691-eas-'));
  const home = path.join(root, 'home');
  const podRoot = path.join(home, 'Library/Caches/CocoaPods/Pods');
  const tmp = path.join(root, 'T');
  const stubs = path.join(root, 'stubs');
  const scripts = path.join(root, 'repo/app/scripts');
  const trace = path.join(root, 'trace.log');

  for (const d of [home, tmp, stubs, scripts]) fs.mkdirSync(d, { recursive: true });
  for (const f of ['e2e-sim-build-eas.sh', 'e2e-sim-device.sh', 'e2e-sim-clean.sh']) {
    fs.copyFileSync(path.join(SCRIPTS, f), path.join(scripts, f));
  }
  fs.writeFileSync(trace, '');

  writeStub(
    stubs,
    'git',
    [
      'case "$*" in',
      `  *rev-parse*) echo "${path.join(root, 'repo')}" ;;`,
      '  *) : ;;', // status --porcelain: a clean tree
      'esac',
    ].join('\n')
  );
  writeStub(
    stubs,
    'xcrun',
    [
      'case "$*" in',
      '  "simctl list devices booted -j")',
      `    echo '${JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-18-0': [
            { udid: 'AAAA-1111', name: 'iPhone 16', state: 'Booted' },
          ],
        },
      })}' ;;`,
      '  "simctl list devicetypes -j") echo "{}" ;;',
      `  *) echo "xcrun $*" >> "${trace}" ;;`,
      'esac',
    ].join('\n')
  );

  const spec = (wd) =>
    JSON.stringify({
      name: 'React-Core-prebuilt',
      source: { http: `file://${wd}/build/app/ios/Pods/ReactNativeCore-artifacts/core.tar.gz` },
    }).replace(/'/g, "'\\''");
  writeStub(
    stubs,
    'eas',
    [
      'OUT=""',
      'while [ $# -gt 0 ]; do [ "$1" = "--output" ] && OUT="$2"; shift; done',
      'WD="$EAS_LOCAL_BUILD_WORKINGDIR"',
      `echo "eas workingdir=$WD" >> "${trace}"`,
      '[ -n "$WD" ] || exit 9',
      'mkdir -p "$WD/build/app/ios/Pods"',
      // `pod install` caching the entry this build keys to its working dir.
      `mkdir -p "${podRoot}/External/React-Core-prebuilt/own-key" "${podRoot}/Specs/External/React-Core-prebuilt"`,
      `echo payload > "${podRoot}/External/React-Core-prebuilt/own-key/core.bin"`,
      `printf '%s' '${spec('__WD__')}' | sed "s|__WD__|$WD|" > "${podRoot}/Specs/External/React-Core-prebuilt/own-key.podspec.json"`,
      `echo "eas cached own-key" >> "${trace}"`,
      ...(easExits === 0
        ? ['A="$(mktemp -d)"; mkdir -p "$A/Being.app"; tar -czf "$OUT" -C "$A" Being.app']
        : []),
      'rm -rf "$WD"', // EAS's own cleanup, which runs on failure too
      `exit ${easExits}`,
    ].join('\n')
  );

  /** A cache entry that is not this build's. */
  function makePodEntry(key, wtRoot) {
    const dir = path.join(podRoot, 'External/ReactNativeDependencies', key);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'deps.bin'), 'payload');
    const specPath = path.join(podRoot, 'Specs/External/ReactNativeDependencies', `${key}.podspec.json`);
    fs.mkdirSync(path.dirname(specPath), { recursive: true });
    fs.writeFileSync(
      specPath,
      JSON.stringify({ source: { http: `file://${wtRoot}/app/ios/Pods/deps.tar.gz` } })
    );
    return dir;
  }

  return {
    root,
    tmp,
    makePodEntry,
    ownEntry: path.join(podRoot, 'External/React-Core-prebuilt/own-key'),
    ownSpec: path.join(podRoot, 'Specs/External/React-Core-prebuilt/own-key.podspec.json'),
    run() {
      const res = spawnSync('bash', [path.join(scripts, 'e2e-sim-build-eas.sh')], {
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          TMPDIR: tmp,
          CP_CACHE_DIR: '',
          E2E_SIM_UDID: '',
          PATH: `${stubs}:${process.env.PATH}`,
        },
      });
      return {
        ...res,
        out: `${res.stdout || ''}${res.stderr || ''}`,
        trace: fs.readFileSync(trace, 'utf8'),
      };
    },
  };
}

describe('e2e-sim-build-eas.sh — INFRA-691 reaps its own pod-cache entries', () => {
  const roots = [];
  afterEach(() => {
    for (const r of roots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
  });

  it.each([
    ['passes', 0],
    ['fails', 1],
  ])('removes the entry keyed to its working dir when the build %s', (_label, easExits) => {
    const sb = makeSandbox({ easExits });
    roots.push(sb.root);
    const liveWt = path.join(sb.root, 'wt/development');
    fs.mkdirSync(liveWt, { recursive: true });
    const live = sb.makePodEntry('live-key', liveWt);
    const otherOrphan = sb.makePodEntry('orphan-key', path.join(sb.root, 'wt/feat-gone'));

    const res = sb.run();

    expect(res.status === 0).toBe(easExits === 0);
    // Positive control: the build really did cache an entry, so its absence means reaped.
    expect(res.trace).toMatch(/eas cached own-key/);
    expect(fs.existsSync(sb.ownEntry)).toBe(false);
    expect(fs.existsSync(sb.ownSpec)).toBe(false);
    // Scoped: neither a live worktree's entry nor another worktree's orphan is touched.
    expect(fs.existsSync(live)).toBe(true);
    expect(fs.existsSync(otherOrphan)).toBe(true);
  });

  it('pins EAS to a fresh working dir under $TMPDIR, and leaves none behind', () => {
    const sb = makeSandbox();
    roots.push(sb.root);

    const res = sb.run();

    const wd = (res.trace.match(/eas workingdir=(\S*)/) || [])[1];
    expect(wd).toBeTruthy();
    expect(fs.realpathSync(path.dirname(wd))).toBe(fs.realpathSync(sb.tmp));
    expect(fs.readdirSync(sb.tmp).filter((f) => f.startsWith('eas-build-local'))).toEqual([]);
  });
});
