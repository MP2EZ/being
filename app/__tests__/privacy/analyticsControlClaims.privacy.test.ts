/**
 * Legal-copy control-claim guard (DEBUG-534)
 *
 * The privacy policy directed users to "Settings > Privacy > Delete Analytics
 * Data" — a control that was removed as a non-functional stub (MAINT-173) and
 * never existed in working form. The claim shipped in three tracked places and
 * was served live on being.fyi. That is an affirmative representation about a
 * named control the app does not provide: the FTC Act §5 deception shape.
 *
 * Nothing caught it, and the three near-misses each show why:
 *   - `scripts/legal-registry.js` compares document FILENAMES to the generator's
 *     source list. It never reads a byte of prose, so it can see a missing
 *     document but not a false claim inside one.
 *   - `scripts/legal-site-freshness.js` fingerprints live being.fyi prose against
 *     the markdown. BOTH SIDES DERIVE FROM THE SAME MARKDOWN, so it detects a
 *     stale deploy, never a wrong claim — it fingerprinted the deception as fresh.
 *   - `__tests__/compliance/consumer-privacy-posture.test.ts` is named for this
 *     duty and cites FTC §5, but asserts only store-level posture. It never
 *     opens docs/legal.
 *
 * So this suite asserts the one relation none of them cover: A CONTROL PATH
 * NAMED IN THE LEGAL COPY MUST RESOLVE TO A CONTROL THAT EXISTS. It is
 * deliberately wider than the single string — there is no "Settings" navigation
 * root in this app at all (the tab is Profile, the screen is "Privacy & Data"),
 * so pinning one literal would leave five sibling claims equally wrong and would
 * go green forever the moment that literal was deleted.
 *
 * DEBUG-390 DISCIPLINE. This codebase deliberately names retired anti-patterns
 * in prose to warn the next reader off them — `CloudBackupSettings.tsx` records
 * that the "Delete Analytics Data" control "was a non-functional stub". A bare
 * `not.toContain` over source would match that comment and fail on correct code.
 * Source is therefore comment-stripped before matching, and `describe('matcher
 * integrity')` proves the stripper and every regex still fire, so this file
 * cannot silently match nothing and pass forever.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const LEGAL_DIR = path.join(REPO_ROOT, 'docs/legal');
const ARCH_DIR = path.join(REPO_ROOT, 'docs/architecture');
const APP_SRC = path.join(REPO_ROOT, 'app/src');

const PRIVACY_SCREEN = path.join(
  APP_SRC,
  'features/profile/screens/PrivacyDataScreen.tsx'
);

/** The removed control (MAINT-173). */
const ABSENT_CONTROL = 'Delete Analytics Data';

/**
 * In PROSE, naming the control is not the offence — DIRECTING users to it is.
 * The DPIA change log and this suite's own header must be able to name the
 * string in order to record that it was removed, exactly as
 * `translatorProvenanceDocs.test.ts` distinguishes naming a banned translator
 * from attributing shipped text to one. So markdown is matched on the
 * directive shape; app source and the generated module (below) keep bare
 * presence, because neither has any reason to contain the string at all.
 */
const DIRECTS_TO_ABSENT_CONTROL = new RegExp(
  String.raw`(?:via|Go to|Navigate to|Tap|Open)\b[^.\n]*` + ABSENT_CONTROL,
  'i'
);

/**
 * The real in-app route title (ProfileStackNavigator.tsx). There is no
 * "Settings" navigation root; asserting its absence is the general fix.
 */
const REAL_ROUTE_TITLE = 'Privacy & Data';

/**
 * iOS SYSTEM Settings paths are not app navigation and are legitimately named.
 * Anchored on "Settings > Apple ID", which only the system path uses.
 */
const SYSTEM_SETTINGS_PATH = /Settings\s*>\s*Apple ID/;

/** Strip block and line comments so prose warnings are not matched as code. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function readMarkdownFiles(dir: string): Array<{ file: string; text: string }> {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({
      file: path.relative(REPO_ROOT, path.join(dir, f)),
      text: fs.readFileSync(path.join(dir, f), 'utf8'),
    }));
}

function walkSource(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walkSource(full, acc);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('DEBUG-534 — legal copy may not name a control the app lacks', () => {
  const legalDocs = readMarkdownFiles(LEGAL_DIR);
  const archDocs = readMarkdownFiles(ARCH_DIR);

  it('has legal documents to scan (non-vacuity)', () => {
    expect(legalDocs.length).toBeGreaterThan(3);
    expect(archDocs.length).toBeGreaterThan(0);
  });

  it.each([...legalDocs, ...archDocs])(
    'does not direct users to the removed control — $file',
    ({ file, text }) => {
      // The filename rides in the asserted VALUE, not in a message argument:
      // Jest's expect() takes exactly one argument, and the diff must name the
      // offending doc on its own.
      expect({ file, directsToRemovedControl: DIRECTS_TO_ABSENT_CONTROL.test(text) }).toEqual({
        file,
        directsToRemovedControl: false,
      });
    }
  );

  it('names no "Settings >" in-app navigation path — there is no Settings root', () => {
    const offenders: string[] = [];
    for (const { file, text } of [...legalDocs, ...archDocs]) {
      text.split('\n').forEach((line, i) => {
        if (!/Settings\s*>/.test(line)) return;
        if (SYSTEM_SETTINGS_PATH.test(line)) return; // iOS system path, legitimate
        offenders.push(`${file}:${i + 1}  ${line.trim()}`);
      });
    }
    // Offenders are the diff. The app has no Settings navigation root — the tab
    // is Profile and the screen is "Privacy & Data".
    expect(offenders).toEqual([]);
  });

  it('every in-app control path it DOES name resolves to a real label', () => {
    const screen = stripComments(fs.readFileSync(PRIVACY_SCREEN, 'utf8'));
    expect(screen.length).toBeGreaterThan(2000); // stripper did not gut the file

    const named = new Set<string>();
    for (const { text } of [...legalDocs, ...archDocs]) {
      const re = new RegExp(`${REAL_ROUTE_TITLE}\\s*>\\s*([A-Za-z][A-Za-z ]+)`, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) named.add(m[1].trim());
    }

    const missing = [...named].filter((label) => !screen.includes(label));
    // Any entry here is a control the legal copy names but PrivacyDataScreen
    // does not render under that label.
    expect(missing).toEqual([]);
  });

  it('no app source file offers the removed control (comments stripped)', () => {
    const offenders = walkSource(APP_SRC)
      .filter((f) => stripComments(fs.readFileSync(f, 'utf8')).includes(ABSENT_CONTROL))
      .map((f) => path.relative(REPO_ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('the generated in-app module carries the corrected copy', () => {
    const generated = path.join(
      APP_SRC,
      'features/profile/content/legalContent.generated.ts'
    );
    // Gitignored (app/.gitignore, DEBUG-178) but regenerated on postinstall /
    // prestart / preios. CI's Safety + privacy gates job runs npm ci, so it exists there.
    if (!fs.existsSync(generated)) {
      throw new Error(
        'legalContent.generated.ts is missing. Run: cd app && npm run generate:legal-content'
      );
    }
    const text = fs.readFileSync(generated, 'utf8');
    expect(text.includes(ABSENT_CONTROL)).toBe(false);
    expect(text).toContain(REAL_ROUTE_TITLE); // codegen bridge is live
  });
});

/**
 * Proves every matcher above can still go red. Without this the suite could
 * silently match nothing — the DEBUG-390 failure mode — and pass forever.
 */
describe('DEBUG-534 — matcher integrity', () => {
  it('the comment stripper removes a prose mention but keeps code', () => {
    const sample = [
      '// the "Delete Analytics Data" control was a non-functional stub.',
      '/* Delete Analytics Data */',
      'const label = "Anonymous Usage Analytics";',
    ].join('\n');
    const stripped = stripComments(sample);
    expect(stripped).not.toContain(ABSENT_CONTROL);
    expect(stripped).toContain('Anonymous Usage Analytics');
  });

  it('the allowlisted prose mention really exists — the stripper is doing work', () => {
    const raw = fs.readFileSync(
      path.join(APP_SRC, 'core/components/settings/CloudBackupSettings.tsx'),
      'utf8'
    );
    // If this ever fails, the MAINT-173 comment moved and the stripper is no
    // longer exercised by real code — re-point it before trusting the suite.
    expect(raw).toContain(ABSENT_CONTROL);
    expect(stripComments(raw)).not.toContain(ABSENT_CONTROL);
  });

  it('the directive matcher fires on the real pre-fix line, not on a historical record', () => {
    expect(
      DIRECTS_TO_ABSENT_CONTROL.test(
        '- Request deletion via Settings > Privacy > Delete Analytics Data'
      )
    ).toBe(true);
    // The DPIA change log must be able to record what it corrected.
    expect(
      DIRECTS_TO_ABSENT_CONTROL.test(
        'it directed users to "Settings > Privacy > Delete Analytics Data", a control removed as a stub.'
      )
    ).toBe(false);
  });

  it('the Settings-path matcher fires on a known-bad line and spares the iOS one', () => {
    expect(/Settings\s*>/.test('Opt-in via Settings > Privacy > Analytics')).toBe(true);
    expect(SYSTEM_SETTINGS_PATH.test('**iOS:** Settings > Apple ID > Subscriptions > Being')).toBe(true);
    expect(SYSTEM_SETTINGS_PATH.test('Go to Settings > Privacy > Export Data')).toBe(false);
  });

  it('the control-path matcher extracts a label from a known-good line', () => {
    const re = new RegExp(`${REAL_ROUTE_TITLE}\\s*>\\s*([A-Za-z][A-Za-z ]+)`, 'g');
    const m = re.exec('Opt-in via Privacy & Data > Anonymous Usage Analytics');
    expect(m?.[1].trim()).toBe('Anonymous Usage Analytics');
  });
});
