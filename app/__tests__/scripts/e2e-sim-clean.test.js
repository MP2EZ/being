/**
 * INFRA-435 — e2e-sim-clean.sh orphan sweep + disk-headroom pre-flight.
 *
 * WHAT THIS PINS, AND WHY THE PREDICATE IS NOT THE OBVIOUS ONE.
 *
 * The originating story prescribed `[ ! -e "$WorkspacePath" ]` — i.e. "the .xcworkspace
 * LEAF is missing" — as the orphan test. That predicate deletes live caches under CNG
 * (INFRA-280), because `app/ios/` is generated and routinely absent from a perfectly live
 * worktree:
 *
 *   - `e2e-sim-build.sh` runs `expo prebuild --platform ios --clean` inside the SHARED gate
 *     worktree, which deletes `app/ios/` for the ~7 minutes of a post-regen build. During
 *     that window the gate's own multi-GB cache presents as an orphan while a build is
 *     actively depending on it.
 *   - A worktree sitting post-prebuild / pre-`pod install` has `app/ios/` but no
 *     `.xcworkspace` at all. That is an ordinary state, not a broken one.
 *
 * So the predicate here is the worktree ROOT, never the leaf. The root is what
 * `git worktree remove` actually deletes, and it is the only thing whose absence means
 * "nobody can be building here."
 *
 * These tests spawn the REAL script against a sandbox HOME with a synthetic DerivedData
 * tree, and PATH-shim `plutil` (absent on ubuntu-latest, where `test:scripts` runs).
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REAL_CLEAN = path.resolve(__dirname, '../../scripts/e2e-sim-clean.sh');

/**
 * `plutil -extract WorkspacePath raw -o - <plist>`.
 *
 * Mirrors the real tool's contract on the two paths the script depends on: prints the
 * value and exits 0 when the key is present, prints nothing and exits 1 when it is not.
 * The exit-1 arm is load-bearing — the script's `|| true` swallows it, so the resulting
 * EMPTY STRING is what the implementation must treat as "unknown, never delete".
 */
const PLUTIL_STUB = [
  'f="${@: -1}"',
  '[ -f "$f" ] || exit 1',
  'v="$(sed -n \'s:.*<string>\\(.*\\)</string>.*:\\1:p\' "$f" | head -1)"',
  '[ -n "$v" ] || exit 1',
  'printf "%s\\n" "$v"',
].join('\n');

function writeStub(dir, name, body) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 });
  return p;
}

/** A DerivedData dir whose info.plist names `workspacePath`, padded to a measurable size. */
function makeCache(ddRoot, hash, workspacePath, { plist = true } = {}) {
  const dir = path.join(ddRoot, `Being-${hash}`);
  fs.mkdirSync(path.join(dir, 'Build'), { recursive: true });
  // Non-trivial payload so `du -sk` reports a positive number and a byte total that
  // stays at zero is a real failure rather than a rounding artefact.
  fs.writeFileSync(path.join(dir, 'Build', 'payload.bin'), Buffer.alloc(96 * 1024, 7));
  if (plist) {
    fs.writeFileSync(
      path.join(dir, 'info.plist'),
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<plist version="1.0"><dict>',
        '<key>WorkspacePath</key>',
        workspacePath === null ? '' : `<string>${workspacePath}</string>`,
        '</dict></plist>',
      ].join('\n')
    );
  }
  return dir;
}

/**
 * Build a sandbox: a fake HOME holding DerivedData, plus worktrees under `<root>/wt/`.
 * The script is copied to `<root>/wt/self/app/scripts/`, so "THIS worktree" is `wt/self`.
 */
function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra435-'));
  const home = path.join(root, 'home');
  const ddRoot = path.join(home, 'Library/Developer/Xcode/DerivedData');
  const stubs = path.join(root, 'stubs');
  const selfApp = path.join(root, 'wt/self/app');

  fs.mkdirSync(ddRoot, { recursive: true });
  fs.mkdirSync(stubs, { recursive: true });
  fs.mkdirSync(path.join(selfApp, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(selfApp, 'ios/Being.xcworkspace'), { recursive: true });
  fs.copyFileSync(REAL_CLEAN, path.join(selfApp, 'scripts/e2e-sim-clean.sh'));
  writeStub(stubs, 'plutil', PLUTIL_STUB);

  return {
    root,
    ddRoot,
    // INFRA-691: CocoaPods' default cache root under the sandbox HOME.
    podRoot: path.join(home, 'Library/Caches/CocoaPods/Pods'),
    stubs,
    selfWorkspace: path.join(selfApp, 'ios/Being.xcworkspace'),
    /** Create a live worktree dir and return the workspace path Xcode would record. */
    liveWorktree(name, { withLeaf = true } = {}) {
      const app = path.join(root, 'wt', name, 'app');
      fs.mkdirSync(withLeaf ? path.join(app, 'ios/Being.xcworkspace') : app, {
        recursive: true,
      });
      return path.join(app, 'ios/Being.xcworkspace');
    },
    /** A workspace path whose worktree root does not exist at all. */
    deadWorktree(name) {
      return path.join(root, 'wt', name, 'app/ios/Being.xcworkspace');
    },
    run(args = []) {
      const res = spawnSync('bash', [path.join(selfApp, 'scripts/e2e-sim-clean.sh'), ...args], {
        encoding: 'utf8',
        // CP_CACHE_DIR is CocoaPods' own override; scrub an inherited one so the pod sweep
        // can only ever see the sandbox HOME (INFRA-691).
        env: { ...process.env, HOME: home, CP_CACHE_DIR: '', PATH: `${stubs}:${process.env.PATH}` },
      });
      return { ...res, out: `${res.stdout || ''}${res.stderr || ''}` };
    },
    exists: (d) => fs.existsSync(d),
  };
}

describe('e2e-sim-clean.sh — INFRA-435 orphan sweep', () => {
  let sb;
  beforeEach(() => {
    sb = makeSandbox();
  });
  afterEach(() => {
    fs.rmSync(sb.root, { recursive: true, force: true });
  });

  /**
   * The load-bearing test. Two caches, ONE run, opposite expectations:
   *   - a genuine orphan (worktree root gone)            -> MUST be reaped
   *   - a live worktree missing only the .xcworkspace    -> MUST survive
   *
   * Neither assertion is sufficient alone, and that is the point. A no-op implementation
   * fails the first half; the AC-as-written leaf predicate (`[ ! -e "$WS" ]`) reaps both
   * and fails the second. Only a root-keyed predicate satisfies both.
   */
  it('reaps a dead worktree cache while sparing a live worktree mid-prebuild', () => {
    const dead = makeCache(sb.ddRoot, 'deadaaaa', sb.deadWorktree('feat-gone'));
    const midPrebuild = makeCache(
      sb.ddRoot,
      'midbbbbb',
      sb.liveWorktree('e2e-gate', { withLeaf: false })
    );

    const res = sb.run(['--orphans', '--yes']);

    expect(res.status).toBe(0);
    expect(sb.exists(dead)).toBe(false);
    expect(sb.exists(midPrebuild)).toBe(true);
  });

  it('spares a live sibling worktree that is not this one', () => {
    const sibling = makeCache(sb.ddRoot, 'sibccccc', sb.liveWorktree('debug-777'));
    const dead = makeCache(sb.ddRoot, 'deaddddd', sb.deadWorktree('feat-gone'));

    sb.run(['--orphans', '--yes']);

    expect(sb.exists(sibling)).toBe(true);
    expect(sb.exists(dead)).toBe(false);
  });

  /**
   * `[ ! -e "" ]` is TRUE in bash. Without an `[ -n "$WS" ]` guard ahead of the root test,
   * every cache with an unreadable or key-less info.plist is reaped — precisely the
   * directories whose contents cannot be reasoned about.
   */
  it('never reaps a cache whose WorkspacePath is empty or unreadable', () => {
    const noKey = makeCache(sb.ddRoot, 'emptyeee', null);
    const dead = makeCache(sb.ddRoot, 'deadffff', sb.deadWorktree('feat-gone'));

    const res = sb.run(['--orphans', '--yes']);

    expect(sb.exists(noKey)).toBe(true);
    expect(res.out).toMatch(/unknown/i);
    // Positive control: the sweep genuinely ran rather than bailing early.
    expect(sb.exists(dead)).toBe(false);
  });

  it('skips a directory with no info.plist at all', () => {
    const bare = makeCache(sb.ddRoot, 'bareaaaa', null, { plist: false });
    const dead = makeCache(sb.ddRoot, 'deadgggg', sb.deadWorktree('feat-gone'));

    const res = sb.run(['--orphans', '--yes']);

    expect(res.status).toBe(0);
    expect(sb.exists(bare)).toBe(true);
    expect(sb.exists(dead)).toBe(false);
  });

  it('is dry-run by default: --orphans alone deletes nothing but still reports a total', () => {
    const dead = makeCache(sb.ddRoot, 'deadhhhh', sb.deadWorktree('feat-gone'));

    const res = sb.run(['--orphans']);

    expect(res.status).toBe(0);
    expect(sb.exists(dead)).toBe(true);
    expect(res.out).toMatch(/reclaimable/i);
    // The dry run must name the command that actually reclaims, or the default mode is a
    // dead end. Assert the shape rather than one spelling: the hint may use the npm alias
    // (which already carries --orphans) or the raw script.
    expect(res.out).toMatch(/orphans[\s\S]*--yes/);
  });

  /**
   * INFRA-423's rule: a sweep that silently stops matching is indistinguishable from a
   * clean machine. The zero case must say so out loud.
   */
  it('reports the empty case out loud rather than printing nothing', () => {
    makeCache(sb.ddRoot, 'liveiiii', sb.liveWorktree('debug-777'));

    const res = sb.run(['--orphans']);

    expect(res.status).toBe(0);
    expect(res.out).toMatch(/0 orphan|no orphan/i);
  });

  it('exits 2 on an unrecognised flag rather than silently reporting', () => {
    const res = sb.run(['--reap-everything']);

    expect(res.status).toBe(2);
    expect(res.out).toMatch(/usage/i);
  });

  it('accepts the flags in either order', () => {
    const dead = makeCache(sb.ddRoot, 'deadjjjj', sb.deadWorktree('feat-gone'));

    const res = sb.run(['--yes', '--orphans']);

    expect(res.status).toBe(0);
    expect(sb.exists(dead)).toBe(false);
  });

  /**
   * Back-compat. `--yes` with no mode flag must keep its exact pre-INFRA-435 meaning:
   * this worktree's cache and nothing else. docs/testing/e2e-maestro.md and existing
   * habit both depend on it, and widening it silently would be the worst kind of change.
   */
  it('--yes alone still reaps only THIS worktree, leaving orphans untouched', () => {
    const mine = makeCache(sb.ddRoot, 'minekkkk', sb.selfWorkspace);
    const dead = makeCache(sb.ddRoot, 'deadllll', sb.deadWorktree('feat-gone'));

    const res = sb.run(['--yes']);

    expect(res.status).toBe(0);
    expect(sb.exists(mine)).toBe(false);
    expect(sb.exists(dead)).toBe(true);
  });

  it('reports without deleting when given no flags', () => {
    const mine = makeCache(sb.ddRoot, 'minemmmm', sb.selfWorkspace);
    const dead = makeCache(sb.ddRoot, 'deadnnnn', sb.deadWorktree('feat-gone'));

    const res = sb.run([]);

    expect(res.status).toBe(0);
    expect(sb.exists(mine)).toBe(true);
    expect(sb.exists(dead)).toBe(true);
    expect(res.out).toMatch(/THIS worktree/);
    expect(res.out).toMatch(/ORPHAN/);
  });
});

/**
 * INFRA-691 — the same sweep, extended to CocoaPods' cache.
 *
 * RN 0.85 and Expo's prebuilt xcframeworks bake the ABSOLUTE worktree path into their
 * podspecs, and the cache key is a hash of the spec — so every worktree mints its own
 * ~825 MB entry and nothing ever prunes one. Orphanhood is the INFRA-435 rule unchanged:
 * the root that owns the recorded path, never the tarball leaf, because `prebuild --clean`
 * deletes `app/ios/` inside a live worktree.
 */
describe('e2e-sim-clean.sh — INFRA-691 CocoaPods cache sweep', () => {
  let sb;
  beforeEach(() => {
    sb = makeSandbox();
  });
  afterEach(() => {
    fs.rmSync(sb.root, { recursive: true, force: true });
  });

  /** External/<pod>/<key>/ plus its Specs/External/<pod>/<key>.podspec.json. */
  function makePodEntry(pod, key, spec, { specFile = true } = {}) {
    const dir = path.join(sb.podRoot, 'External', pod, key);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'payload.bin'), Buffer.alloc(96 * 1024, 7));
    const specPath = path.join(sb.podRoot, 'Specs/External', pod, `${key}.podspec.json`);
    if (specFile) {
      fs.mkdirSync(path.dirname(specPath), { recursive: true });
      fs.writeFileSync(specPath, typeof spec === 'string' ? spec : JSON.stringify(spec));
    }
    return { dir, specPath };
  }

  /** The React-Core-prebuilt / ReactNativeDependencies shape: a file:// source. */
  const fileSourceSpec = (wtRoot) => ({
    name: 'ReactNativeDependencies',
    source: { http: `file://${wtRoot}/app/ios/Pods/ReactNativeDependencies-artifacts/deps.tar.gz` },
  });
  const wt = (name) => path.join(sb.root, 'wt', name);
  const gone = (entry) => !sb.exists(entry.dir) && !sb.exists(entry.specPath);
  const kept = (entry) => sb.exists(entry.dir) && sb.exists(entry.specPath);

  it('reaps an orphaned entry and its spec while sparing a live worktree mid-prebuild', () => {
    const dead = makePodEntry('ReactNativeDependencies', 'aaaa-1', fileSourceSpec(wt('feat-gone')));
    // e2e-gate's root exists but `app/ios/` does not — the `prebuild --clean` window.
    sb.liveWorktree('e2e-gate', { withLeaf: false });
    const live = makePodEntry('ReactNativeDependencies', 'bbbb-2', fileSourceSpec(wt('e2e-gate')));

    const res = sb.run(['--orphans', '--yes']);

    expect(res.status).toBe(0);
    expect(gone(dead)).toBe(true);
    expect(kept(live)).toBe(true);
  });

  /**
   * hermes-engine's source is a maven URL; the worktree path rides in HERMES_CLI_PATH.
   * Keying on `source` alone would leave ~96 MB per worktree behind forever.
   */
  it('finds a worktree path recorded outside `source` (hermes-engine HERMES_CLI_PATH)', () => {
    const hermes = makePodEntry('hermes-engine', 'cccc-3', {
      name: 'hermes-engine',
      source: { http: 'https://repo1.maven.org/maven2/hermes-ios-debug.tar.gz' },
      user_target_xcconfig: {
        HERMES_CLI_PATH: `${wt('feat-gone')}/app/node_modules/hermes-compiler/hermesc/osx-bin/hermesc`,
      },
    });

    sb.run(['--orphans', '--yes']);

    expect(gone(hermes)).toBe(true);
  });

  it('reaps an entry keyed to a vanished `eas build --local` temp dir', () => {
    const easRoot = path.join(sb.root, 'T/eas-build-local-nodejs/0f3e9c1a/build');
    const eas = makePodEntry('React-Core-prebuilt', 'dddd-4', fileSourceSpec(easRoot));

    sb.run(['--orphans', '--yes']);

    expect(gone(eas)).toBe(true);
  });

  it('never reaps an entry with no local path, an unparseable spec, or no spec at all', () => {
    const git = makePodEntry('fmt', 'eeee-5', {
      name: 'fmt',
      source: { git: 'https://github.com/fmtlib/fmt.git', tag: '12.1.0' },
    });
    const garbled = makePodEntry('ExpoFont', 'ffff-6', '{ "source": { "http": "file:///nope');
    const specless = makePodEntry('ExpoFileSystem', 'gggg-7', null, { specFile: false });
    const dead = makePodEntry('ReactNativeDependencies', 'hhhh-8', fileSourceSpec(wt('feat-gone')));

    const res = sb.run(['--orphans', '--yes']);

    expect(res.status).toBe(0);
    expect(kept(git)).toBe(true);
    expect(kept(garbled)).toBe(true);
    expect(sb.exists(specless.dir)).toBe(true);
    expect(res.out).toMatch(/unknown/i);
    // Positive control: the sweep genuinely ran rather than bailing early.
    expect(gone(dead)).toBe(true);
  });

  it('spares an entry when ANY of its recorded roots is still live', () => {
    sb.liveWorktree('debug-777');
    const mixed = makePodEntry('hermes-engine', 'iiii-9', {
      source: { http: `file://${wt('feat-gone')}/app/ios/Pods/hermes.tar.gz` },
      user_target_xcconfig: {
        HERMES_CLI_PATH: `${wt('debug-777')}/app/node_modules/hermes-compiler/hermesc`,
      },
    });

    sb.run(['--orphans', '--yes']);

    expect(kept(mixed)).toBe(true);
  });

  it('is dry-run without --yes, and names the reclaiming command', () => {
    const dead = makePodEntry('ReactNativeDependencies', 'jjjj-1', fileSourceSpec(wt('feat-gone')));

    const res = sb.run(['--orphans']);

    expect(res.status).toBe(0);
    expect(kept(dead)).toBe(true);
    expect(res.out).toMatch(/ORPHAN/);
    expect(res.out).toMatch(/orphans[\s\S]*--yes/);
  });

  it('reports DerivedData and pod-cache reclaim on separate lines', () => {
    makeCache(sb.ddRoot, 'deadkkkk', sb.deadWorktree('feat-gone'));
    makePodEntry('ReactNativeDependencies', 'kkkk-2', fileSourceSpec(wt('feat-gone')));

    const res = sb.run(['--orphans', '--yes']);

    expect(res.out).toMatch(/^DerivedData: Reaped 1 orphaned cache/m);
    expect(res.out).toMatch(/^CocoaPods cache: Reaped 1 orphaned entr/m);
  });

  it('reports the empty pod-cache case out loud', () => {
    const res = sb.run(['--orphans']);

    expect(res.status).toBe(0);
    expect(res.out).toMatch(/CocoaPods cache[^\n]*(0 orphan|no CocoaPods cache)/i);
  });

  it('still sweeps the pod cache on a machine with no DerivedData directory', () => {
    fs.rmSync(sb.ddRoot, { recursive: true, force: true });
    const dead = makePodEntry('ReactNativeDependencies', 'llll-3', fileSourceSpec(wt('feat-gone')));

    const res = sb.run(['--orphans', '--yes']);

    expect(res.status).toBe(0);
    expect(gone(dead)).toBe(true);
  });

  it('report mode (no flags) summarises reclaimable pod-cache orphans and deletes nothing', () => {
    const dead = makePodEntry('ReactNativeDependencies', 'mmmm-4', fileSourceSpec(wt('feat-gone')));

    const res = sb.run([]);

    expect(res.status).toBe(0);
    expect(kept(dead)).toBe(true);
    expect(res.out).toMatch(/1 orphaned CocoaPods cache entr/);
  });

  /**
   * `--pods-under DIR` is the EAS fallback's post-build hook. EAS pins its working dir to
   * a fresh directory per run, so nothing keyed under it can ever be hit again — even while
   * the directory still exists (EAS_LOCAL_BUILD_SKIP_CLEANUP). Everything outside DIR is
   * out of scope, orphaned or not, and DerivedData is never touched.
   */
  describe('--pods-under DIR', () => {
    it('reaps only entries keyed under DIR, whether or not DIR still exists', () => {
      const scope = path.join(sb.root, 'T/eas-build-local-nodejs.abc123');
      fs.mkdirSync(path.join(scope, 'build/app'), { recursive: true });
      const mine = makePodEntry('React-Core-prebuilt', 'nnnn-5', fileSourceSpec(`${scope}/build`));
      const otherOrphan = makePodEntry(
        'ReactNativeDependencies',
        'oooo-6',
        fileSourceSpec(wt('feat-gone'))
      );
      const ddOrphan = makeCache(sb.ddRoot, 'deadoooo', sb.deadWorktree('feat-gone'));

      const res = sb.run(['--pods-under', scope, '--yes']);

      expect(res.status).toBe(0);
      expect(gone(mine)).toBe(true);
      expect(kept(otherOrphan)).toBe(true);
      expect(sb.exists(ddOrphan)).toBe(true);
    });

    it('does not treat a sibling directory sharing the prefix as inside DIR', () => {
      const scope = path.join(sb.root, 'T/eas-build-local-nodejs.abc123');
      const sibling = makePodEntry(
        'React-Core-prebuilt',
        'pppp-7',
        fileSourceSpec(`${scope}-other/build`)
      );

      sb.run(['--pods-under', scope, '--yes']);

      expect(kept(sibling)).toBe(true);
    });

    /**
     * macOS: $TMPDIR is under /var, which is a symlink to /private/var, and CocoaPods may
     * record either spelling. A scope the script cannot match is a silent no-op.
     */
    it('matches a /private-prefixed recording of a /var or /tmp scope', () => {
      const scope = path.join(sb.root, 'T/eas-build-local-nodejs.def456');
      // os.tmpdir() is /tmp on Linux CI and /var/folders/... on macOS — both covered.
      expect(scope).toMatch(/^\/(var|tmp)\//);
      const recorded = makePodEntry(
        'React-Core-prebuilt',
        'qqqq-8',
        fileSourceSpec(`/private${scope}/build`)
      );

      sb.run(['--pods-under', scope, '--yes']);

      expect(gone(recorded)).toBe(true);
    });

    it('exits 2 when DIR is missing', () => {
      const res = sb.run(['--pods-under']);

      expect(res.status).toBe(2);
      expect(res.out).toMatch(/--pods-under requires a directory/);
      expect(res.out).toMatch(/usage/i);
    });
  });
});
