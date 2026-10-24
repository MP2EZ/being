/**
 * DEBUG-853 — the identifier is a "random account ID", never "anonymous".
 *
 * Founder decision 2026-10-23: FTC guidance treats a persistent identifier as not anonymous,
 * with or without the IP address INFRA-851 scrubs, so the in-app name and the legal docs drop
 * "anonymous account identifier" together. This sweep keeps the old term from coming back in
 * one place while the others moved.
 *
 * Scope: in-app strings (app/src, comments stripped — DEBUG-390) and the documents that
 * describe the identifier to users or to the App Store. Change-log rows are history and keep
 * the words they were written in: a table row that opens with a version number, and a
 * "- **v1.x" revision bullet.
 */
import * as fs from 'fs';
import * as path from 'path';
import { CONSENT_DETAILS } from '@/features/consent/constants/consentDetails';
import {
  CONNECTION_RECORDS_DISCLOSURE,
  OPERATIONAL_TELEMETRY_DISCLOSURE,
} from '@/core/services/supabase/operationalEvents';

const ROOT = path.resolve(__dirname, '../../..');
const APP_SRC = path.join(ROOT, 'app/src');

const OLD_TERM = /anonymous account(?: identifier)?|anonymous identifier/i;
const NEW_TERM = /random account ID/;

const DOCS = [
  'docs/legal/privacy-policy.md',
  'docs/legal/california-privacy.md',
  'docs/legal/multi-state-privacy.md',
  'docs/legal/lia-crisis-telemetry.md',
  'docs/legal/dpia-sensitive-wellness-data.md',
  'docs/legal/regulatory-applicability.md',
  'docs/security/ios-privacy-manifest.md',
  'docs/product/app-store-connect-metadata.md',
];

const HISTORY_LINE = /^\|\s*v?\d+\.\d+\s*\||^- \*\*v\d+\.\d+/;

// The text this item replaced, kept so OLD_TERM is proven to fire.
const PRE_FIX = {
  ops: "Records of when a backup or restore ran, whether it succeeded, how long it took and how large it was — stored on Being's servers with your anonymous account identifier",
  erased: 'Your anonymous account and subscription records on our servers',
  policy41: 'the app creates an **anonymous account identifier** with our database provider (Supabase).',
  scenario1: 'identifiability of the anonymous identifier',
};

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

function srcFiles(dir: string, out: Array<{ rel: string; text: string }> = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__tests__' && e.name !== 'node_modules') srcFiles(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\./.test(e.name) && !/\.generated\./.test(e.name)) {
      out.push({ rel: path.relative(ROOT, p), text: stripComments(fs.readFileSync(p, 'utf8')) });
    }
  }
  return out;
}

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('DEBUG-853 — "random account ID" replaces "anonymous account identifier"', () => {
  it('the old-term matcher fires on the text this item replaced', () => {
    for (const s of Object.values(PRE_FIX)) expect(s).toMatch(OLD_TERM);
    expect('your random account ID').not.toMatch(OLD_TERM);
  });

  it('no in-app string under app/src uses the old term', () => {
    const files = srcFiles(APP_SRC);
    expect(files.length).toBeGreaterThan(100); // liveness
    const hits = files.filter((f) => OLD_TERM.test(f.text)).map((f) => f.rel);
    expect(hits).toEqual([]);
  });

  it.each(DOCS)('%s uses the old term only in change-log history', (rel) => {
    const lines = read(rel).split('\n');
    const hits = lines
      .map((l, i) => ({ l, n: i + 1 }))
      .filter(({ l }) => OLD_TERM.test(l) && !HISTORY_LINE.test(l))
      .map(({ n, l }) => `${rel}:${n}: ${l.slice(0, 80)}`);
    expect(hits).toEqual([]);
  });

  it('the history exclusion is narrow: it matches change-log rows and nothing else', () => {
    expect('| 2.55 | 2026-10-23 | Palouse Labs LLC | DEBUG-850 …').toMatch(HISTORY_LINE);
    expect('- **v1.25 (October 23, 2026) — material change.** …').toMatch(HISTORY_LINE);
    expect('| **Identifiers** | IP address, an anonymous account identifier |').not.toMatch(HISTORY_LINE);
    expect('To keep any data that does reach our servers …').not.toMatch(HISTORY_LINE);
  });

  it('policy §4.1 defines the new term and drops the "anonymous in the sense" sentence', () => {
    const policy = read('docs/legal/privacy-policy.md');
    const s41 = policy.slice(policy.indexOf('### 4.1'), policy.indexOf('### 4.2'));
    expect(s41).toMatch(/\*\*random account ID\*\*/);
    expect(s41).not.toMatch(/"anonymous"/);
  });

  it('the in-app strings that name the identifier use the new term', () => {
    expect(OPERATIONAL_TELEMETRY_DISCLOSURE).toMatch(NEW_TERM);
    expect(CONNECTION_RECORDS_DISCLOSURE).toMatch(NEW_TERM);
    expect(read('app/src/features/profile/screens/DeleteAccountScreen.tsx')).toContain(
      "'Your random account ID and subscription records on our servers'"
    );
  });

  it('the Settings Backup card does not call anything anonymous', () => {
    const c = CONSENT_DETAILS.cloudSync;
    const text = [c.title, c.description, ...c.details.whatWeCollect, ...c.details.whatWeDontCollect, c.details.whyItHelps, c.details.privacyNote].join('\n');
    expect(text).toMatch(NEW_TERM); // liveness
    expect(text).not.toMatch(/anonymous/i);
  });
});
