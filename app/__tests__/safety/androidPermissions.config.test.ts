/**
 * Committed Android manifest permissions match what the app actually declares (MAINT-648)
 *
 * Only iOS is CNG (INFRA-280). `app/android/` is COMMITTED, and its
 * `src/main/AndroidManifest.xml` had drifted from app.json and the installed
 * modules: RECORD_AUDIO, POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED,
 * ACCESS_NETWORK_STATE and ACCESS_WIFI_STATE were undeclared, and
 * SYSTEM_ALERT_WINDOW — declared by no installed module's main manifest, only
 * by React Native's debug-variant one — shipped to release builds.
 *
 * WHY THIS IS A TEST AND NOT A REGENERATION. @expo/config-plugins'
 * setAndroidPermissions() writes only app.json's `android.permissions`; every
 * other permission here comes from a library's own AndroidManifest.xml and is
 * merged by Gradle at BUILD time. `expo prebuild --clean` + a diff would surface
 * one of the deltas and read as reconciled. So the expected set is derived here,
 * from app.json plus every installed module's main manifest, and compared both
 * ways against the committed file.
 *
 * BLOCKED: ACTIVITY_RECOGNITION is declared unconditionally by expo-sensors for
 * its Pedometer. Being uses only Accelerometer (core/hooks/useBugReportShake.ts),
 * which needs no runtime permission — the same pair nativePurposeStrings.config
 * exempts on iOS. It is removed with `tools:node="remove"` in the committed
 * manifest (the entry that takes effect, since android/ is not generated) and
 * listed in app.json `android.blockedPermissions` (so a future prebuild agrees).
 * If anything imports Pedometer, the block is no longer defensible — the last
 * describe fails and forces the decision back open.
 *
 * NOTE: the expected set is read from node_modules, so a dependency bump that
 * adds or drops a permission turns this red. That is its job. It assumes a tree
 * installed with `npm ci` from the committed lockfile, as CI does; a stale dev
 * tree can disagree.
 *
 * DEBUG-390 DISCIPLINE: 'matcher integrity' proves the parser reads multi-line
 * elements (netinfo writes `<uses-permission` and `android:name` on separate
 * lines, which a line-based scan silently misses) and that the checks go red.
 */
import * as fs from 'fs';
import * as path from 'path';

const APP_ROOT = path.resolve(__dirname, '../..');
const NODE_MODULES = path.join(APP_ROOT, 'node_modules');
const MAIN_MANIFEST = path.join(APP_ROOT, 'android/app/src/main/AndroidManifest.xml');
const APP_SRC = path.join(APP_ROOT, 'src');

interface Perm {
  name: string;
  removed: boolean;
  maxSdk: string | null;
}

const ELEMENT = /<uses-permission\b([\s\S]*?)\/?>/g;
const attr = (attrs: string, key: string): string | null =>
  new RegExp(`${key}\\s*=\\s*"([^"]*)"`).exec(attrs)?.[1] ?? null;
const short = (n: string): string => n.replace(/^android\.permission\./, '');

function parsePermissions(xml: string): Perm[] {
  return [...xml.matchAll(ELEMENT)]
    .map((m) => ({
      name: attr(m[1], 'android:name'),
      removed: attr(m[1], 'tools:node') === 'remove',
      maxSdk: attr(m[1], 'android:maxSdkVersion'),
    }))
    .filter((p): p is Perm => p.name !== null)
    .map((p) => ({ ...p, name: short(p.name) }));
}

/** Every installed module's main manifest (top-level and @scoped), plus React Native's own. */
function moduleManifests(): string[] {
  const out: string[] = [];
  const consider = (dir: string): void => {
    const f = path.join(dir, 'android/src/main/AndroidManifest.xml');
    if (fs.existsSync(f)) out.push(f);
  };
  for (const e of fs.readdirSync(NODE_MODULES, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const dir = path.join(NODE_MODULES, e.name);
    if (e.name.startsWith('@')) {
      for (const s of fs.readdirSync(dir, { withFileTypes: true })) {
        if (s.isDirectory()) consider(path.join(dir, s.name));
      }
    } else {
      consider(dir);
    }
  }
  const rn = path.join(NODE_MODULES, 'react-native/ReactAndroid/src/main/AndroidManifest.xml');
  if (fs.existsSync(rn)) out.push(rn);
  return out;
}

const android = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'app.json'), 'utf8')).expo.android;
const APP_JSON_PERMS: string[] = (android.permissions ?? []).map(short);
const BLOCKED: string[] = (android.blockedPermissions ?? []).map(short);

const MODULE_PERMS = new Map<string, string[]>();
for (const f of moduleManifests()) {
  const mod = path.relative(NODE_MODULES, f).split(`${path.sep}android${path.sep}`)[0];
  for (const p of parsePermissions(fs.readFileSync(f, 'utf8'))) {
    if (p.removed) continue;
    MODULE_PERMS.set(p.name, [...(MODULE_PERMS.get(p.name) ?? []), mod]);
  }
}

const COMMITTED = parsePermissions(fs.readFileSync(MAIN_MANIFEST, 'utf8'));
const DECLARED = new Set(COMMITTED.filter((p) => !p.removed).map((p) => p.name));
const REMOVED = new Set(COMMITTED.filter((p) => p.removed).map((p) => p.name));

function expectedDeclared(): Set<string> {
  const s = new Set([...APP_JSON_PERMS, ...MODULE_PERMS.keys()]);
  for (const b of BLOCKED) s.delete(b);
  return s;
}

/** Both directions: what the manifest lacks and what it carries without a source. */
function drift(declared: Set<string>, expected: Set<string>): { missing: string[]; extraneous: string[] } {
  return {
    missing: [...expected].filter((p) => !declared.has(p)).sort(),
    extraneous: [...declared].filter((p) => !expected.has(p)).sort(),
  };
}

describe('MAINT-648: committed Android manifest matches the derived permission set', () => {
  it('declares exactly app.json permissions plus every module permission, minus the blocked', () => {
    expect(drift(DECLARED, expectedDeclared())).toEqual({ missing: [], extraneous: [] });
  });

  it('SYSTEM_ALERT_WINDOW does not ship to release (debug-variant only)', () => {
    expect(DECLARED.has('SYSTEM_ALERT_WINDOW')).toBe(false);
  });

  it('every blocked permission is removed in the committed manifest, and nothing else is', () => {
    expect([...REMOVED].sort()).toEqual([...BLOCKED].sort());
    for (const b of BLOCKED) expect(DECLARED.has(b)).toBe(false);
  });

  it('ACTIVITY_RECOGNITION is blocked (founder decision, MAINT-648)', () => {
    expect(BLOCKED).toContain('ACTIVITY_RECOGNITION');
  });

  it('keeps the maxSdkVersion caps expo-file-system declares on external storage', () => {
    for (const n of ['READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE']) {
      expect(COMMITTED.find((p) => p.name === n && !p.removed)?.maxSdk).toBe('32');
    }
  });
});

describe('MAINT-648: the ACTIVITY_RECOGNITION block stays justified', () => {
  it('no app code imports Pedometer from expo-sensors', () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== '__tests__') walk(p);
        } else if (/\.(ts|tsx)$/.test(e.name)) {
          const src = fs.readFileSync(p, 'utf8');
          if (/import[^;]*\bPedometer\b[^;]*from\s*['"]expo-sensors['"]/.test(src)) {
            offenders.push(path.relative(APP_ROOT, p));
          }
        }
      }
    };
    walk(APP_SRC);
    expect(offenders).toEqual([]);
  });
});

describe('MAINT-648: matcher integrity', () => {
  it('reads a multi-line element (the netinfo shape a line-based scan misses)', () => {
    const xml = '<manifest>\n\t<uses-permission\n\t\tandroid:name="android.permission.ACCESS_WIFI_STATE" />\n</manifest>';
    expect(parsePermissions(xml).map((p) => p.name)).toEqual(['ACCESS_WIFI_STATE']);
  });

  it('reads tools:node="remove" and maxSdkVersion', () => {
    const xml =
      '<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" tools:node="remove"/>' +
      '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>';
    expect(parsePermissions(xml)).toEqual([
      { name: 'ACTIVITY_RECOGNITION', removed: true, maxSdk: null },
      { name: 'READ_EXTERNAL_STORAGE', removed: false, maxSdk: '32' },
    ]);
  });

  it('found the module manifests that carry permissions, including the multi-line one', () => {
    expect(MODULE_PERMS.get('ACCESS_WIFI_STATE')).toContain('@react-native-community/netinfo');
    expect(MODULE_PERMS.get('ACTIVITY_RECOGNITION')).toContain('expo-sensors');
    expect(new Set([...MODULE_PERMS.values()].flat()).size).toBeGreaterThanOrEqual(4);
  });

  it('the drift check goes red on the pre-fix manifest', () => {
    const preFix = new Set(['INTERNET', 'READ_EXTERNAL_STORAGE', 'SYSTEM_ALERT_WINDOW', 'VIBRATE', 'WRITE_EXTERNAL_STORAGE']);
    const d = drift(preFix, expectedDeclared());
    expect(d.missing).toEqual(
      expect.arrayContaining(['ACCESS_NETWORK_STATE', 'ACCESS_WIFI_STATE', 'POST_NOTIFICATIONS', 'RECEIVE_BOOT_COMPLETED', 'RECORD_AUDIO'])
    );
    expect(d.extraneous).toContain('SYSTEM_ALERT_WINDOW');
  });
});
