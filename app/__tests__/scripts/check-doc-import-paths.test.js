/**
 * Meta-test for scripts/check-doc-import-paths.js (INFRA-601).
 *
 * Gated by the existing `test:scripts` CI step, like the other guard meta-tests.
 *
 * Extractor and resolver cases run against fixture strings and an injected file
 * set, so they pin BEHAVIOUR and do not re-break when a doc legitimately changes.
 * The last block is the deliberate exception: it runs the real docs against the
 * real git index, because the point of the guard is that the real tree stays clean.
 */

const {
  extractSpecifiers,
  parseMarker,
  createResolver,
  checkDocs,
  formatFinding,
  listTrackedFiles,
  loadDocs,
  REPO_ROOT,
} = require('../../scripts/check-doc-import-paths');

const fence = (body, info = 'typescript') => ['```' + info, ...body, '```'].join('\n');

describe('extractSpecifiers — what counts as a documented import', () => {
  it('extracts every import-statement shape inside a fence, with its 1-indexed line', () => {
    const md = [
      '# Doc',
      fence([
        "import { a } from '@/core/a';",
        "import type { B } from \"@/core/b\";",
        "export * from '@/core/c';",
        "import '@/core/d';",
        "const e = await import('@/core/e');",
        "const f = require('@/core/f');",
        "jest.mock('@/core/g', () => ({}));",
      ]),
    ].join('\n');
    expect(extractSpecifiers(md).map((s) => [s.line, s.specifier])).toEqual([
      [3, '@/core/a'],
      [4, '@/core/b'],
      [5, '@/core/c'],
      [6, '@/core/d'],
      [7, '@/core/e'],
      [8, '@/core/f'],
      [9, '@/core/g'],
    ]);
  });

  it('reports a multi-line import on the line that holds the specifier', () => {
    const md = fence(['import {', '  a,', '  b,', "} from '@/core/multi';"]);
    expect(extractSpecifiers(md)).toEqual([
      expect.objectContaining({ line: 5, specifier: '@/core/multi' }),
    ]);
  });

  it('ignores the same specifier in prose and in an inline code span', () => {
    const md = [
      "Import it with import { a } from '@/core/prose'.",
      "Or `import { a } from '@/core/inline'` inline.",
    ].join('\n');
    expect(extractSpecifiers(md)).toEqual([]);
  });

  it('ignores quoted @/ strings that are not import statements', () => {
    // The three shapes import-guidelines.md really carries: a tsconfig alias
    // listing, eslint pathGroups, and a sed substitution. A quoted-string matcher
    // fires on all of them and reds on day one.
    const md = [
      fence(['"@/core/*"        → "src/core/*"', '"@/types/*"       → "src/types/*"']),
      fence(["{ 'pattern': '@/core/**', 'group': 'internal' }"], 'javascript'),
      fence(["  's|from \".*\\/crisis\\/|from \"@/features/crisis/|g' {} +"], 'bash'),
    ].join('\n');
    expect(extractSpecifiers(md)).toEqual([]);
  });

  it('ignores non-alias and relative specifiers — out of scope for v1', () => {
    const md = fence(["import React from 'react';", "import { x } from '../contexts';"]);
    expect(extractSpecifiers(md)).toEqual([]);
  });

  it('does not let a nested fence with an info string close the outer fence', () => {
    // CommonMark: a closing fence must use the same character, be at least as long
    // as the opener, and carry no info string. A toggle-on-``` parser inverts fence
    // parity from here to the end of the file.
    const md = [
      '````markdown',
      '## Public API',
      '```typescript',
      "import { inner } from '@/core/inside-outer';",
      '```',
      '````',
      "import { prose } from '@/core/after-outer';",
      '```typescript',
      "import { real } from '@/core/real';",
      '```',
    ].join('\n');
    expect(extractSpecifiers(md).map((s) => s.specifier)).toEqual([
      '@/core/inside-outer',
      '@/core/real',
    ]);
  });

  it('closes a fence only on the same character and at least the opening length', () => {
    const md = [
      '~~~ts',
      '```',
      "import { a } from '@/core/still-fenced';",
      '~~~',
      "import { b } from '@/core/unfenced';",
    ].join('\n');
    expect(extractSpecifiers(md).map((s) => s.specifier)).toEqual(['@/core/still-fenced']);
  });
});

describe('parseMarker — deliberate non-resolution', () => {
  it('reads the reason after the marker', () => {
    expect(
      parseMarker("import x from '@/features/crisis'; // doc-import: unresolved-by-design - MAINT-600 deleted it")
    ).toEqual({ reason: 'MAINT-600 deleted it' });
  });

  it('returns an empty reason when none is given', () => {
    expect(parseMarker("import x from '@/a'; // doc-import: unresolved-by-design")).toEqual({ reason: '' });
    expect(parseMarker("import x from '@/a'; // doc-import: unresolved-by-design - ")).toEqual({ reason: '' });
  });

  it('returns null for a line without a marker', () => {
    expect(parseMarker("import x from '@/a';")).toBeNull();
  });
});

describe('createResolver — an injected file set', () => {
  const tracked = new Set([
    'app/src/fixture/plain.ts',
    'app/src/fixture/Component.tsx',
    'app/src/fixture/dir/index.ts',
    'app/src/fixture/tsxdir/index.tsx',
    'app/src/fixture/noindex/Thing.ts',
  ]);
  const resolve = createResolver({ tracked, exists: () => true });

  it.each([
    ['@/fixture/plain', '.ts'],
    ['@/fixture/Component', '.tsx'],
    ['@/fixture/dir', 'directory index.ts'],
    ['@/fixture/tsxdir', 'directory index.tsx'],
  ])('resolves %s (%s)', (specifier) => {
    expect(resolve(specifier)).toBe(true);
  });

  it('does not resolve a directory with no index', () => {
    expect(resolve('@/fixture/noindex')).toBe(false);
  });

  it('does not resolve a wrong-case path, even on a case-insensitive filesystem', () => {
    // macOS's default fs host resolves this; ubuntu CI does not. Checking against
    // the git index is what makes the verdict identical on both.
    expect(resolve('@/FIXTURE/plain')).toBe(false);
  });

  it('does not resolve a path that is tracked but missing on disk', () => {
    const gone = createResolver({ tracked, exists: (f) => !f.endsWith('plain.ts') });
    expect(gone('@/fixture/plain')).toBe(false);
  });

  it('does not resolve a path that is on disk but untracked', () => {
    expect(resolve('@/fixture/untracked')).toBe(false);
  });
});

describe('checkDocs — findings', () => {
  const tracked = new Set(['app/src/fixture/real.ts']);
  const resolve = createResolver({ tracked, exists: () => true });

  it('goes red on a known-bad specifier and names doc, line and specifier (DEBUG-390 red proof)', () => {
    const docs = [
      {
        file: 'docs/architecture/bad.md',
        text: ['# Bad', fence(["import { Thing } from '@/features/definitely-not-real/Thing';"])].join('\n'),
      },
    ];
    const { findings } = checkDocs({ docs, resolve });
    expect(findings).toEqual([
      {
        doc: 'docs/architecture/bad.md',
        line: 3,
        specifier: '@/features/definitely-not-real/Thing',
        reason: 'unresolved',
      },
    ]);
    const message = formatFinding(findings[0]);
    expect(message).toContain('docs/architecture/bad.md:3');
    expect(message).toContain('@/features/definitely-not-real/Thing');
  });

  it('is green on a resolvable specifier', () => {
    const docs = [{ file: 'docs/architecture/ok.md', text: fence(["import { r } from '@/fixture/real';"]) }];
    expect(checkDocs({ docs, resolve })).toEqual(
      expect.objectContaining({ findings: [], checked: 1, honoured: [] })
    );
  });

  it('honours a marked, unresolved specifier and lists it', () => {
    const docs = [
      {
        file: 'docs/architecture/m.md',
        text: fence(["import x from '@/features/gone'; // doc-import: unresolved-by-design - barrel deleted"]),
      },
    ];
    const result = checkDocs({ docs, resolve });
    expect(result.findings).toEqual([]);
    expect(result.honoured).toEqual([
      { doc: 'docs/architecture/m.md', line: 2, specifier: '@/features/gone', reason: 'barrel deleted' },
    ]);
  });

  it('fails a marker on a specifier that now resolves — the marker is stale', () => {
    const docs = [
      {
        file: 'docs/architecture/m.md',
        text: fence(["import x from '@/fixture/real'; // doc-import: unresolved-by-design - was deleted"]),
      },
    ];
    expect(checkDocs({ docs, resolve }).findings).toEqual([
      expect.objectContaining({ specifier: '@/fixture/real', reason: 'stale-marker' }),
    ]);
  });

  it('fails a marker with no reason', () => {
    const docs = [
      {
        file: 'docs/architecture/m.md',
        text: fence(["import x from '@/features/gone'; // doc-import: unresolved-by-design"]),
      },
    ];
    expect(checkDocs({ docs, resolve }).findings).toEqual([
      expect.objectContaining({ specifier: '@/features/gone', reason: 'marker-missing-reason' }),
    ]);
  });

  it('fails a marker on a fenced line that carries no import', () => {
    // A marker that suppresses nothing reads as coverage it does not provide.
    const docs = [
      {
        file: 'docs/architecture/m.md',
        text: fence(['const x = 1; // doc-import: unresolved-by-design - nothing here']),
      },
    ];
    expect(checkDocs({ docs, resolve }).findings).toEqual([
      expect.objectContaining({ line: 2, reason: 'orphan-marker' }),
    ]);
  });

  it('does NOT check exported identifiers — a resolvable path naming a missing export is green (v1 boundary)', () => {
    // By design, not by oversight: the path is a filesystem question, the binding
    // needs the TS program. This test exists so nobody reads a green run as
    // "documented imports verified".
    const docs = [
      { file: 'docs/architecture/b.md', text: fence(["import { NoSuchExport } from '@/fixture/real';"]) },
    ];
    expect(checkDocs({ docs, resolve }).findings).toEqual([]);
  });
});

describe('the real docs/architecture tree', () => {
  const docs = loadDocs();
  const resolve = createResolver({ tracked: listTrackedFiles(['app/src']) });
  const result = checkDocs({ docs, resolve });

  it('finds docs to scan and extracts a non-empty specifier set (the matcher still fires)', () => {
    expect(docs.length).toBeGreaterThan(0);
    expect(result.checked).toBeGreaterThan(0);
  });

  it('has zero unresolved documented import paths', () => {
    expect(result.findings.map(formatFinding)).toEqual([]);
  });

  it('scans from the repository root', () => {
    expect(docs.every((d) => d.file.startsWith('docs/architecture/'))).toBe(true);
    expect(typeof REPO_ROOT).toBe('string');
  });
});
