/**
 * Nothing Being stores leaves the device through OS backup or device transfer (MAINT-868)
 *
 * Android: `app/android/` is COMMITTED (only iOS is CNG, INFRA-280), so the committed
 * manifest is what ships. Its <application> must carry allowBackup="false",
 * fullBackupContent="false" (Android 11 and earlier) and dataExtractionRules pointing at
 * res/xml/data_extraction_rules.xml, whose <cloud-backup> and <device-transfer> sections
 * (Android 12+) each exclude every domain and include nothing. app.json mirrors
 * allowBackup:false so a future prebuild agrees.
 *
 * The expo-secure-store config plugin must stay unregistered: on a prebuild it points both
 * attributes at its own rules, which exclude only its keys and so back up everything else.
 *
 * iOS: app.json sets RCTAsyncStorageExcludeFromBackup = true, the library default made
 * explicit. It does NOT cover the keychain (master key, stoic_practice_state), which is
 * still in an encrypted iPhone backup; that migration is MAINT-869, and the copy and the
 * policy are worded to stay true until it lands.
 *
 * DEBUG-390 DISCIPLINE: 'matcher integrity' proves the parsers read multi-line elements
 * and go red on the pre-fix manifest and on a rules file that includes or omits a domain.
 */
import * as fs from 'fs';
import * as path from 'path';

const APP_ROOT = path.resolve(__dirname, '../..');
const MAIN_MANIFEST = path.join(APP_ROOT, 'android/app/src/main/AndroidManifest.xml');
const RULES = path.join(APP_ROOT, 'android/app/src/main/res/xml/data_extraction_rules.xml');
const NODE_MODULES = path.join(APP_ROOT, 'node_modules');
const DOMAINS = ['database', 'external', 'file', 'root', 'sharedpref'];
const SECTIONS = ['cloud-backup', 'device-transfer'];

const stripComments = (xml: string): string => xml.replace(/<!--[\s\S]*?-->/g, '');
const attr = (attrs: string, key: string): string | null =>
  new RegExp(`${key}\\s*=\\s*"([^"]*)"`).exec(attrs)?.[1] ?? null;

function applicationAttrs(xml: string): string {
  const m = /<application\b([\s\S]*?)>/.exec(stripComments(xml));
  if (!m) throw new Error('no <application> element');
  return m[1];
}

interface Section {
  excluded: string[];
  includes: number;
}

function parseRules(xml: string): Map<string, Section> {
  const out = new Map<string, Section>();
  const body = stripComments(xml);
  for (const name of SECTIONS) {
    const m = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`).exec(body);
    if (!m) continue;
    const excluded = [...m[1].matchAll(/<exclude\b([\s\S]*?)\/?>/g)]
      .filter((e) => attr(e[1], 'path') === '.')
      .map((e) => attr(e[1], 'domain'))
      .filter((d): d is string => d !== null);
    out.set(name, { excluded: [...new Set(excluded)].sort(), includes: (m[1].match(/<include\b/g) ?? []).length });
  }
  return out;
}

function rulesFailures(rules: Map<string, Section>): string[] {
  const failures: string[] = [];
  for (const name of SECTIONS) {
    const s = rules.get(name);
    if (!s) {
      failures.push(`${name}: missing`);
      continue;
    }
    const missing = DOMAINS.filter((d) => !s.excluded.includes(d));
    if (missing.length) failures.push(`${name}: does not exclude ${missing.join(', ')}`);
    if (s.includes) failures.push(`${name}: has ${s.includes} <include>`);
  }
  return failures;
}

function manifestFailures(attrs: string): string[] {
  const want: Record<string, string> = {
    'android:allowBackup': 'false',
    'android:fullBackupContent': 'false',
    'android:dataExtractionRules': '@xml/data_extraction_rules',
  };
  return Object.entries(want)
    .filter(([k, v]) => attr(attrs, k) !== v)
    .map(([k, v]) => `${k} is ${attr(attrs, k) ?? 'absent'}, expected ${v}`);
}

const appJson = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'app.json'), 'utf8')).expo;

describe('MAINT-868: Android backup and device transfer are off', () => {
  it('the committed manifest disables backup and points at the rules file', () => {
    expect(manifestFailures(applicationAttrs(fs.readFileSync(MAIN_MANIFEST, 'utf8')))).toEqual([]);
  });

  it('cloud-backup and device-transfer each exclude every domain and include nothing', () => {
    const rules = parseRules(fs.readFileSync(RULES, 'utf8'));
    expect([...rules.keys()].sort()).toEqual(SECTIONS);
    expect(rulesFailures(rules)).toEqual([]);
  });

  it('app.json mirrors allowBackup:false so a prebuild agrees', () => {
    expect(appJson.android.allowBackup).toBe(false);
  });

  it('the expo-secure-store config plugin is not registered', () => {
    const plugins: unknown[] = appJson.plugins ?? [];
    const names = plugins.map((p) => (Array.isArray(p) ? p[0] : p));
    expect(names).not.toContain('expo-secure-store');
  });

  it('no installed module manifest sets a backup attribute the merge would carry', () => {
    const offenders: string[] = [];
    const scan = (dir: string) => {
      const f = path.join(dir, 'android/src/main/AndroidManifest.xml');
      if (fs.existsSync(f) && /android:(allowBackup|fullBackupContent|dataExtractionRules)\s*=/.test(stripComments(fs.readFileSync(f, 'utf8')))) {
        offenders.push(path.relative(NODE_MODULES, dir));
      }
    };
    let scanned = 0;
    for (const e of fs.readdirSync(NODE_MODULES, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const dir = path.join(NODE_MODULES, e.name);
      if (e.name.startsWith('@')) {
        for (const s of fs.readdirSync(dir, { withFileTypes: true })) {
          if (s.isDirectory()) { scan(path.join(dir, s.name)); scanned++; }
        }
      } else { scan(dir); scanned++; }
    }
    expect(scanned).toBeGreaterThan(50);
    expect(offenders).toEqual([]);
  });
});

describe('MAINT-868: iOS AsyncStorage is excluded from backup', () => {
  it('RCTAsyncStorageExcludeFromBackup is true in app.json', () => {
    expect(appJson.ios.infoPlist.RCTAsyncStorageExcludeFromBackup).toBe(true);
  });
});

describe('MAINT-868: matcher integrity', () => {
  it('reads a multi-line <application> and goes red on the pre-fix manifest', () => {
    const preFix = '<manifest>\n  <application android:name=".MainApplication"\n    android:allowBackup="true" android:theme="@style/AppTheme">\n</application></manifest>';
    expect(manifestFailures(applicationAttrs(preFix))).toEqual([
      'android:allowBackup is true, expected false',
      'android:fullBackupContent is absent, expected false',
      'android:dataExtractionRules is absent, expected @xml/data_extraction_rules',
    ]);
  });

  it('ignores an attribute that appears only in a comment', () => {
    const xml = '<!-- android:allowBackup="false" --><application android:allowBackup="true">';
    expect(manifestFailures(applicationAttrs(xml))[0]).toBe('android:allowBackup is true, expected false');
  });

  it('goes red on a section that omits a domain, includes one, or is missing', () => {
    const all = DOMAINS.map((d) => `<exclude domain="${d}" path="."/>`).join('\n');
    const xml =
      `<data-extraction-rules><cloud-backup>\n${all.replace('<exclude domain="external" path="."/>', '')}\n` +
      '<include domain="file" path="backup"/></cloud-backup></data-extraction-rules>';
    expect(rulesFailures(parseRules(xml))).toEqual([
      'cloud-backup: does not exclude external',
      'cloud-backup: has 1 <include>',
      'device-transfer: missing',
    ]);
  });

  it('a narrower path than "." does not count as excluding the domain', () => {
    const xml = `<data-extraction-rules><cloud-backup><exclude domain="file" path="tmp"/></cloud-backup></data-extraction-rules>`;
    expect(parseRules(xml).get('cloud-backup')?.excluded).toEqual([]);
  });
});
