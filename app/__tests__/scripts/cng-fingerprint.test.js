/**
 * INFRA-508 — the gate's native-regeneration trigger must key on CNG-relevant CONTENT,
 * not on file mtime.
 *
 * WHY THIS EXISTS. `e2e-sim-build.sh` decided whether to run `expo prebuild --clean` with
 *
 *     find app.json package.json plugins patches -newer ios/.cng-stamp
 *
 * `git checkout` restamps every file it rewrites, so ANY package.json move fired a full
 * native regeneration — including a one-line npm-script edit with zero dependency delta.
 * Measured on five instrumented gate runs during the DEBUG-469 close (2026-08-21): the
 * regenerating tier cost 11m05s / 12m43s / 14m26s, the non-regenerating tier 1m02s / 3m51s.
 * The trigger predicted all five exactly. Two of the three regenerations were fired by a
 * PEER session re-pointing the shared gate worktree, not by anything in the caller's own
 * branch — which is why the cost looked unattributable from inside one session.
 *
 * WHAT MUST NOT WEAKEN. This predicate is a safety control, not only a cost knob.
 * `expo run:ios` prebuilds ONLY when ios/ is absent, so an app.json edit with ios/ present
 * yields a binary whose Info.plist does not reflect it — and on this repo that lands on
 * LSApplicationQueriesSchemes, the 988 dial path (INFRA-184/INFRA-383). Every app.json
 * assertion below is that control, restated against the content hash. The fingerprint is
 * therefore STRICTLY WIDER than the old mtime test on real inputs: it still fires on
 * app.json, plugins and patches, adds the lockfile, and drops only package.json fields
 * that `expo prebuild` provably does not read.
 *
 * FAIL-SAFE DIRECTION. Any unreadable or unparseable input must THROW rather than return a
 * hash. A fingerprint that silently degrades to a constant would skip prebuild forever,
 * which is the false-green direction.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { cngFingerprint } = require('../../scripts/cng-fingerprint.js');

/** Minimal app dir carrying every input the fingerprint is specified to read. */
function makeAppDir(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cng-fp-'));

  const appJson = overrides.appJson ?? {
    expo: { name: 'Being', ios: { infoPlist: { LSApplicationQueriesSchemes: ['tel', 'sms'] } } },
  };
  const pkg = overrides.pkg ?? {
    name: 'being-app',
    version: '0.9.0',
    main: 'index.ts',
    scripts: { test: 'jest', 'e2e:safety': 'bash scripts/e2e-safety.sh' },
    dependencies: { expo: '56.0.0' },
    devDependencies: { jest: '30.0.0' },
    overrides: { 'expo-modules-jsi': '56.0.12' },
  };
  const lock = overrides.lock ?? { name: 'being-app', lockfileVersion: 3, packages: {} };

  fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify(appJson, null, 2));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg, null, 2));
  fs.writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify(lock, null, 2));

  fs.mkdirSync(path.join(root, 'plugins'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'plugins', 'withAppGroupsEntitlement.js'),
    overrides.pluginBody ?? '// plugin v1'
  );
  fs.mkdirSync(path.join(root, 'patches'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'patches', 'expo-modules-jsi+56.0.12.patch'),
    overrides.patchBody ?? '# patch v1'
  );

  return root;
}

/** Rewrite one JSON file through a mutator, preserving the on-disk shape. */
function editJson(root, file, mutate) {
  const p = path.join(root, file);
  const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
  mutate(obj);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

describe('cngFingerprint — determinism', () => {
  test('is stable across repeated reads of an unchanged tree', () => {
    const root = makeAppDir();
    expect(cngFingerprint(root)).toBe(cngFingerprint(root));
  });

  test('is INDEPENDENT of mtime — the defect this replaces', () => {
    // The old predicate was `find ... -newer ios/.cng-stamp`. Rewriting a file with
    // byte-identical content moved that predicate and must not move this one.
    const root = makeAppDir();
    const before = cngFingerprint(root);

    for (const f of ['app.json', 'package.json', 'package-lock.json']) {
      const p = path.join(root, f);
      const body = fs.readFileSync(p);
      fs.writeFileSync(p, body); // same bytes, new mtime
      fs.utimesSync(p, new Date(), new Date());
    }

    expect(cngFingerprint(root)).toBe(before);
  });

  test('is independent of key ORDER in package.json', () => {
    // A merge or a formatter can reorder keys without changing the dependency graph.
    const root = makeAppDir();
    const before = cngFingerprint(root);

    editJson(root, 'package.json', (p) => {
      const deps = p.dependencies;
      delete p.dependencies;
      p.dependencies = Object.fromEntries(Object.entries(deps).reverse());
    });

    expect(cngFingerprint(root)).toBe(before);
  });
});

describe('cngFingerprint — what must NOT fire a regeneration', () => {
  test('an npm SCRIPT edit does not move the fingerprint', () => {
    // The measured 11-14 min defect: adding one npm script cost a full Pods recompile.
    const root = makeAppDir();
    const before = cngFingerprint(root);

    editJson(root, 'package.json', (p) => {
      p.scripts['e2e:safety:q9'] = 'bash scripts/e2e-safety.sh q9-single-alert';
    });

    expect(cngFingerprint(root)).toBe(before);
  });

  test('package.json fields expo prebuild does not read do not move it', () => {
    const root = makeAppDir();
    const before = cngFingerprint(root);

    editJson(root, 'package.json', (p) => {
      p.description = 'a description prebuild never reads';
      p.jest = { preset: 'jest-expo' };
      p.private = true;
    });

    expect(cngFingerprint(root)).toBe(before);
  });
});

describe('cngFingerprint — what MUST fire a regeneration', () => {
  test('an app.json edit moves it — the 988 dial Info.plist control', () => {
    // INFRA-184/INFRA-383: app.json is the sole source of the generated Info.plist, and
    // LSApplicationQueriesSchemes gates Linking.canOpenURL('tel:988'). If this stops
    // firing, the gate can certify a binary that cannot dial 988.
    const root = makeAppDir();
    const before = cngFingerprint(root);

    editJson(root, 'app.json', (a) => {
      a.expo.ios.infoPlist.LSApplicationQueriesSchemes = ['tel'];
    });

    expect(cngFingerprint(root)).not.toBe(before);
  });

  test('ANY app.json edit moves it, not only the ones we thought to enumerate', () => {
    const root = makeAppDir();
    const before = cngFingerprint(root);
    editJson(root, 'app.json', (a) => {
      a.expo.newArchEnabled = true;
    });
    expect(cngFingerprint(root)).not.toBe(before);
  });

  test.each([
    ['dependencies', (p) => { p.dependencies['expo-print'] = '56.0.4'; }],
    ['devDependencies', (p) => { p.devDependencies['patch-package'] = '8.0.0'; }],
    ['overrides', (p) => { p.overrides['expo-modules-jsi'] = '56.0.13'; }],
    ['resolutions', (p) => { p.resolutions = { 'expo-modules-jsi': '56.0.13' }; }],
    ['optionalDependencies', (p) => { p.optionalDependencies = { fsevents: '2.3.3' }; }],
    ['peerDependencies', (p) => { p.peerDependencies = { react: '19.2.3' }; }],
    ['expo', (p) => { p.expo = { autolinking: { exclude: ['expo-print'] } }; }],
    ['main', (p) => { p.main = 'index.js'; }],
    ['version', (p) => { p.version = '0.9.1'; }],
  ])('a package.json %s change moves it', (_label, mutate) => {
    const root = makeAppDir();
    const before = cngFingerprint(root);
    editJson(root, 'package.json', mutate);
    expect(cngFingerprint(root)).not.toBe(before);
  });

  test('a lockfile-only change moves it', () => {
    // A transitive native module can appear or vanish without any direct dependency
    // moving, and autolinking resolves from node_modules. Fires by design.
    const root = makeAppDir();
    const before = cngFingerprint(root);
    editJson(root, 'package-lock.json', (l) => {
      l.packages['node_modules/expo-print'] = { version: '56.0.4' };
    });
    expect(cngFingerprint(root)).not.toBe(before);
  });

  test('a plugins/ body change moves it', () => {
    const root = makeAppDir();
    const before = cngFingerprint(root);
    fs.writeFileSync(path.join(root, 'plugins', 'withAppGroupsEntitlement.js'), '// plugin v2');
    expect(cngFingerprint(root)).not.toBe(before);
  });

  test('a NEW plugins/ file moves it', () => {
    const root = makeAppDir();
    const before = cngFingerprint(root);
    fs.writeFileSync(path.join(root, 'plugins', 'withSomethingElse.js'), '// new');
    expect(cngFingerprint(root)).not.toBe(before);
  });

  test('a REMOVED plugins/ file moves it', () => {
    const root = makeAppDir();
    fs.writeFileSync(path.join(root, 'plugins', 'withSomethingElse.js'), '// new');
    const before = cngFingerprint(root);
    fs.unlinkSync(path.join(root, 'plugins', 'withSomethingElse.js'));
    expect(cngFingerprint(root)).not.toBe(before);
  });

  test('a patches/ body change moves it', () => {
    // patch-package rewrites node_modules at postinstall, so a patch edit changes the
    // sources CocoaPods compiles (INFRA-176).
    const root = makeAppDir();
    const before = cngFingerprint(root);
    fs.writeFileSync(path.join(root, 'patches', 'expo-modules-jsi+56.0.12.patch'), '# patch v2');
    expect(cngFingerprint(root)).not.toBe(before);
  });

  test('a RENAMED patch file moves it even when the body is identical', () => {
    // The pinned version lives in the filename, so path is part of the projection.
    const root = makeAppDir();
    const before = cngFingerprint(root);
    fs.renameSync(
      path.join(root, 'patches', 'expo-modules-jsi+56.0.12.patch'),
      path.join(root, 'patches', 'expo-modules-jsi+56.0.13.patch')
    );
    expect(cngFingerprint(root)).not.toBe(before);
  });
});

describe('cngFingerprint — fails safe', () => {
  test.each(['app.json', 'package.json', 'package-lock.json'])(
    'throws when %s is missing rather than returning a hash',
    (file) => {
      const root = makeAppDir();
      fs.unlinkSync(path.join(root, file));
      expect(() => cngFingerprint(root)).toThrow();
    }
  );

  test('throws on unparseable JSON rather than returning a hash', () => {
    const root = makeAppDir();
    fs.writeFileSync(path.join(root, 'package.json'), '{ not json');
    expect(() => cngFingerprint(root)).toThrow();
  });

  test('tolerates absent plugins/ and patches/ directories', () => {
    // A worktree legitimately may carry neither; that is not a reason to refuse.
    const root = makeAppDir();
    fs.rmSync(path.join(root, 'plugins'), { recursive: true, force: true });
    fs.rmSync(path.join(root, 'patches'), { recursive: true, force: true });
    expect(typeof cngFingerprint(root)).toBe('string');
  });

  test('returns a non-trivial hex digest', () => {
    // Guards the degenerate implementation that satisfies every "is stable" test above
    // by returning a constant.
    const root = makeAppDir();
    expect(cngFingerprint(root)).toMatch(/^[0-9a-f]{16,}$/);
  });
});
