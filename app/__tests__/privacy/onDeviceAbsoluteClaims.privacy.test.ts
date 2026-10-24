/**
 * No "on this device only" absolute in the app or the user-facing legal docs (MAINT-868)
 *
 * On iOS the master key and stoic_practice_state live in the keychain, which an encrypted
 * iPhone backup (iCloud or a computer) can include, so "only on your device", "never
 * leaves" and "always stays" are false there until MAINT-869 moves them to ThisDeviceOnly.
 * Android backup and device transfer are off (androidBackupRules.config.test.ts). Copy says
 * "stored encrypted on this device" and what Being does or does not send, never where the
 * data can never be.
 *
 * Swept: every non-test .ts/.tsx under app/src with comments stripped (DEBUG-390: this
 * codebase names the anti-pattern in prose), plus privacy-policy.md, california-privacy.md
 * and support.md. legalContent.generated.ts is built from those docs and is skipped.
 */
import * as fs from 'fs';
import * as path from 'path';

const APP_ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(APP_ROOT, 'src');
const LEGAL = path.resolve(APP_ROOT, '../docs/legal');
const DOCS = ['privacy-policy.md', 'california-privacy.md', 'support.md'];

const ABSOLUTE = new RegExp(
  [
    String.raw`\bonly on (?:this|your) (?:device|phone|iPhone)\b`,
    String.raw`\b(?:this|your) (?:device|phone|iPhone) only\b`,
    String.raw`\bin this app only\b`,
    String.raw`\bnever leaves?\b`,
    String.raw`\balways stays?\b`,
    // "What stays on your device afterward" (policy §7.4) lists what erasure keeps; not a claim.
    String.raw`\bstays? on (?:this|your) (?:device|phone|iPhone)\b(?! afterward)`,
    String.raw`\bleaves? (?:this|your) (?:device|phone|iPhone)\b`,
    String.raw`\bstays? on it\b`,
    String.raw`\bstored locally on your device\b`,
  ].join('|'),
  'gi',
);

const stripComments = (code: string): string =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : sourceFiles(p);
    if (!/\.tsx?$/.test(e.name) || /\.test\.tsx?$/.test(e.name) || e.name === 'legalContent.generated.ts') return [];
    return [p];
  });
}

const hits = (text: string): string[] => [...text.matchAll(ABSOLUTE)].map((m) => m[0]);

describe('MAINT-868: no on-device absolute claims', () => {
  const files = sourceFiles(SRC);

  it('swept a real source tree', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('app source carries none', () => {
    const found = files.flatMap((f) =>
      hits(stripComments(fs.readFileSync(f, 'utf8'))).map((h) => `${path.relative(SRC, f)}: "${h}"`),
    );
    expect(found).toEqual([]);
  });

  it.each(DOCS)('%s carries none', (doc) => {
    expect(hits(fs.readFileSync(path.join(LEGAL, doc), 'utf8'))).toEqual([]);
  });
});

describe('MAINT-868: matcher integrity', () => {
  // The pre-fix strings, verbatim: each must trip the matcher.
  const PRE_FIX = [
    'Lets these settings be restored on this device. Your wellness history stays on your device and is not part of the backup.',
    'Stored on this device only. Will not sync to other devices.',
    'Stored in this app only. Lost if you delete the app.',
    'Transcribed and saved on this device — nothing you say leaves your phone.',
    'They are decrypted on this device to be read, and stay on it.',
    'Your data stays on your device by default.',
    'PHQ-9 / GAD-7 responses, mood check-ins, journal entries, and crisis records always stay on your device.',
    'High-Severity Assessments and Suicidal Ideation Responses never leave your device',
    '3 years, on your device only.',
    'are stored locally on your device only — Being does not transmit them',
    'By default, all your wellness data is stored locally on your device.',
  ];

  it.each(PRE_FIX)('flags: %s', (s) => {
    expect(hits(s).length).toBeGreaterThan(0);
  });

  it('the matcher reads past a comment only when it is a comment', () => {
    expect(hits(stripComments("// nothing you say leaves your phone\nconst x = 'ok';"))).toEqual([]);
    expect(hits(stripComments("const u = 'https://x'; const t = 'never leaves your device';"))).toEqual(['never leaves']);
  });

  it('does not flag the erasure-survivor list or a plain storage statement', () => {
    expect(hits('What stays on your device afterward is: the account-deletion record')).toEqual([]);
    expect(hits('Stored encrypted on this device. Being does not send them anywhere.')).toEqual([]);
  });
});
