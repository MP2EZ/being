/**
 * docs/legal code-citation guard (MAINT-647)
 *
 * The breach-notification runbook routed its first two response steps through
 * `app/src/core/services/security/IncidentResponseService.ts`, a service that
 * has never existed, and its incident-detection step through
 * SecurityMonitoringService, which MAINT-597 deleted. Nothing checked either, so
 * the document followed under time pressure during a real breach pointed at
 * machinery that was never built. INFRA-601's check-doc-import-paths.js guards
 * `docs/architecture/` only, and it parses import statements in fenced blocks —
 * the wrong grammar for a runbook, which cites bare paths in prose and tables.
 *
 * This suite asserts, across every `docs/legal/*.md`:
 *   (a) every backticked code path (`app/…`, `scripts/…`, `supabase/…`) and
 *       every backticked bare `.ts`/`.tsx` filename resolves on disk;
 *   (b) every exemption marker is honest — it names a file that is genuinely
 *       absent AND cited on the same line, so a marker cannot mask a live file;
 *   (c) the extractor, resolver and slicers still go red (matcher integrity).
 *
 * Two citations are exempt, because a document must be able to name what it
 * removed:
 *   • anything inside a document's change log / version history section — the
 *     same exemption safetyPlanClaims.privacy.test.ts grants the DPIA's §9;
 *   • a body line that narrates a removal and carries
 *     `<!-- removed-code: <File>.ts -->` naming that exact file. The marker is
 *     per file, not per line: a second dead citation on the same line is still
 *     reported.
 *
 * Bare filenames resolve against app/ as a whole — src/, BOTH test roots
 * (app/src/**\/__tests__ and app/__tests__) and the app root (App.tsx). A scan
 * scoped to app/src false-positives on App.tsx and on every test file named in
 * these docs.
 *
 * Scope is file paths and filenames. A dead SYMBOL (a named enum or constant)
 * is not detected; MAINT-647 fixed one by hand (`BreachSeverity`).
 *
 * DEBUG-390 DISCIPLINE: `describe('matcher integrity')` proves each mechanism
 * still fires, so this file cannot silently match nothing and pass forever.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const LEGAL_DIR = path.join(REPO_ROOT, 'docs/legal');

/** A backticked repo-relative code path, with an optional `:12` / `:12-34` line suffix. */
const PATH_CITATION =
  /`((?:app|scripts|supabase)\/[A-Za-z0-9_./-]+?\.(?:ts|tsx|js|mjs|cjs))(?::\d+(?:-\d+)?)?`/g;

/** A backticked bare `.ts` / `.tsx` filename (no directory). */
const BARE_CITATION = /`([A-Za-z][A-Za-z0-9_.-]*\.tsx?)`/g;

/** `<!-- removed-code: Foo.ts -->` — exempts that one file on that one line. */
const REMOVED_MARKER = /<!--\s*removed-code:\s*([A-Za-z0-9_.-]+\.(?:tsx?|jsx?|mjs|cjs))\s*-->/g;

/** A history section heading: `## 9. Review Schedule and Change Log`, `## Version History`. */
const HISTORY_HEADING = /^## .*(?:change ?log|version history)/i;

const SKIP_DIRS = new Set(['node_modules', 'ios', 'android', '.expo', 'dist', 'build', 'coverage']);

interface Citation {
  doc: string;
  line: number;
  kind: 'path' | 'bare';
  ref: string;
}

function legalDocs(): string[] {
  return fs
    .readdirSync(LEGAL_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();
}

/** Line numbers (1-based) that sit inside a history section. */
function historyLines(text: string): Set<number> {
  const out = new Set<number>();
  let inHistory = false;
  text.split('\n').forEach((line, i) => {
    if (/^## /.test(line)) inHistory = HISTORY_HEADING.test(line);
    if (inHistory) out.add(i + 1);
  });
  return out;
}

function markersOn(line: string): string[] {
  return [...line.matchAll(REMOVED_MARKER)].map((m) => m[1]);
}

function citationsIn(doc: string, text: string): Citation[] {
  const history = historyLines(text);
  const out: Citation[] = [];
  text.split('\n').forEach((line, i) => {
    const n = i + 1;
    if (history.has(n)) return;
    const exempt = new Set(markersOn(line));
    for (const m of line.matchAll(PATH_CITATION)) {
      if (!exempt.has(path.basename(m[1]))) out.push({ doc, line: n, kind: 'path', ref: m[1] });
    }
    for (const m of line.matchAll(BARE_CITATION)) {
      if (!exempt.has(m[1])) out.push({ doc, line: n, kind: 'bare', ref: m[1] });
    }
  });
  return out;
}

let basenameIndex: Set<string> | null = null;
function basenames(): Set<string> {
  if (basenameIndex) return basenameIndex;
  const found = new Set<string>();
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else {
        found.add(entry.name);
      }
    }
  };
  walk(path.join(REPO_ROOT, 'app'));
  walk(path.join(REPO_ROOT, 'supabase/functions'));
  basenameIndex = found;
  return found;
}

function resolves(c: Pick<Citation, 'kind' | 'ref'>): boolean {
  return c.kind === 'path'
    ? fs.existsSync(path.join(REPO_ROOT, c.ref))
    : basenames().has(c.ref);
}

function unresolvedIn(doc: string, text: string): string[] {
  return citationsIn(doc, text)
    .filter((c) => !resolves(c))
    .map((c) => `${c.doc}:${c.line} [${c.kind}] ${c.ref}`);
}

const read = (doc: string): string => fs.readFileSync(path.join(LEGAL_DIR, doc), 'utf8');

describe('MAINT-647 (a): every code citation in docs/legal resolves on disk', () => {
  it.each(legalDocs())('%s', (doc) => {
    expect(unresolvedIn(doc, read(doc))).toEqual([]);
  });
});

describe('MAINT-647 (b): every removed-code marker is honest', () => {
  it.each(legalDocs())('%s', (doc) => {
    const lies: string[] = [];
    read(doc)
      .split('\n')
      .forEach((line, i) => {
        for (const name of markersOn(line)) {
          if (basenames().has(name)) lies.push(`${doc}:${i + 1} marks ${name} removed, but it exists`);
          if (!line.includes(`${name}\``) && !line.includes(`/${name}`)) {
            lies.push(`${doc}:${i + 1} marks ${name} but does not cite it on that line`);
          }
        }
      });
    expect(lies).toEqual([]);
  });
});

describe('MAINT-647 (c): matcher integrity', () => {
  it('scans a non-trivial number of citations', () => {
    const all = legalDocs().flatMap((d) => citationsIn(d, read(d)));
    expect(all.length).toBeGreaterThanOrEqual(20);
    expect(all.some((c) => c.kind === 'path')).toBe(true);
    expect(all.some((c) => c.kind === 'bare')).toBe(true);
  });

  it('flags the real pre-fix runbook lines', () => {
    const preFix = [
      '1. Create an incident record via the detection hooks in `app/src/core/services/security/IncidentResponseService.ts` (auto-fired by SecurityMonitoringService for in-app triggers).',
      '| Unauthorized access to AES-256-GCM-encrypted data, keys intact | ❌ NO | Data remains "secured" — log internally per `IncidentResponseService.ts`, no FTC notification |',
    ].join('\n');
    expect(unresolvedIn('fixture.md', preFix)).toEqual([
      'fixture.md:1 [path] app/src/core/services/security/IncidentResponseService.ts',
      'fixture.md:2 [bare] IncidentResponseService.ts',
    ]);
  });

  it('resolves a live path, a line-suffixed path, and bare names from both test roots and the app root', () => {
    const live = [
      '`app/src/core/services/security/EncryptionService.ts`',
      '`app/src/core/services/security/EncryptionService.ts:12`',
      '`App.tsx` `deviceAccessControlClaims.privacy.test.ts` `legacyPlaintextRecordSweeper.privacy.test.ts`',
    ].join('\n');
    expect(citationsIn('fixture.md', live)).toHaveLength(5);
    expect(unresolvedIn('fixture.md', live)).toEqual([]);
  });

  it('a removed-code marker exempts only the file it names', () => {
    const line =
      'Deleted: `Gone.ts` and `AlsoGone.ts` <!-- removed-code: Gone.ts -->';
    expect(unresolvedIn('fixture.md', line)).toEqual(['fixture.md:1 [bare] AlsoGone.ts']);
  });

  it('the history slicer exempts a change log and nothing after it', () => {
    const doc = [
      '## 3. Controls',
      '`Missing1.ts`',
      '## 9. Review Schedule and Change Log',
      '`Missing2.ts`',
      '## 10. Next Section',
      '`Missing3.ts`',
    ].join('\n');
    expect(unresolvedIn('fixture.md', doc)).toEqual([
      'fixture.md:2 [bare] Missing1.ts',
      'fixture.md:6 [bare] Missing3.ts',
    ]);
  });

  it('the DPIA change log is what spares its narrated deletions', () => {
    const dpia = read('dpia-sensitive-wellness-data.md');
    const history = historyLines(dpia);
    const lines = dpia.split('\n');
    const narrated = lines
      .map((l, i) => ({ l, n: i + 1 }))
      .filter(({ l }) => l.includes('`AuthenticationService.ts`'));
    expect(narrated.length).toBeGreaterThan(0);
    for (const { n } of narrated) expect(history.has(n)).toBe(true);
  });
});
