/**
 * Unit tests for the pure `compare` in scripts/legal-registry.js (MAINT-743 / TEST-63).
 *
 * Fixtures are inline synthetic generator and registry text. compare() takes the RAW
 * directory listing and does the .md filter, exclusion and sort itself.
 */

const { compare, EXCLUDED_FROM_REGISTRY } = require('../../../scripts/legal-registry');

const generator = (entries) =>
  `const SOURCES = [\n${entries
    .map(([key, file]) => `  { key: '${key}', file: '${file}' },`)
    .join('\n')}\n];\n`;

const registry = ({ imports, union, keys, recordBody }) =>
  [
    `import {\n${imports.map((i) => `  ${i},`).join('\n')}\n} from './legalContent.generated';`,
    '',
    `export type LegalDocumentType =\n${union.map((u) => `  | '${u}'`).join('\n')};`,
    '',
    'export const legalDocuments: Record<LegalDocumentType, LegalDocument> = {',
    recordBody ??
      keys.map((k) => `  '${k}': {\n    id: '${k}',\n    title: 'T',\n  },`).join('\n'),
    '};',
    '',
  ].join('\n');

// A consistent baseline of two documents.
const DOCS = [
  ['alphaContent', 'alpha-doc.md'],
  ['betaContent', 'beta-doc.md'],
];
const consistent = () => ({
  files: ['alpha-doc.md', 'beta-doc.md'],
  gen: generator(DOCS),
  reg: registry({
    imports: ['alphaContent', 'betaContent'],
    union: ['alpha-doc', 'beta-doc'],
    keys: ['alpha-doc', 'beta-doc'],
  }),
});

describe('compare: consistent surfaces', () => {
  it('returns no errors', () => {
    const { files, gen, reg } = consistent();
    expect(compare(files, gen, reg)).toEqual([]);
  });

  it('does the filtering and sorting itself on a raw, unsorted listing', () => {
    const { gen, reg } = consistent();
    expect(compare(['beta-doc.md', 'notes.txt', '.DS_Store', 'alpha-doc.md', 'subdir'], gen, reg)).toEqual([]);
  });
});

describe('compare: EXCLUDED_FROM_REGISTRY', () => {
  it('pins the excluded names', () => {
    expect([...EXCLUDED_FROM_REGISTRY].sort()).toEqual([
      'README',
      'breach-notification-runbook',
      'dpia-sensitive-wellness-data',
      'lia-crisis-telemetry',
      'regulatory-applicability',
    ]);
  });

  it('ignores excluded docs present on disk', () => {
    const { files, gen, reg } = consistent();
    const withExcluded = [...files, ...[...EXCLUDED_FROM_REGISTRY].map((n) => `${n}.md`)];
    expect(compare(withExcluded, gen, reg)).toEqual([]);
  });

  it('does not exclude a non-listed internal-looking doc', () => {
    const { files, gen, reg } = consistent();
    const errors = compare([...files, 'unlisted-internal.md'], gen, reg);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/filenames vs generator SOURCES\.file disagree/);
    expect(errors[1]).toMatch(/filenames vs LegalDocumentType union disagree/);
    expect(errors[0]).toContain('"unlisted-internal"');
  });
});

describe('compare: parse misses are entries, never throws or exits', () => {
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('process.exit called');
  });
  afterAll(() => exitSpy.mockRestore());

  it('reports a missing SOURCES block', () => {
    const { files, reg } = consistent();
    const errors = compare(files, 'const NOPE = [];', reg);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/could not locate `const SOURCES = \[ … \];`/);
  });

  it('reports a SOURCES block with no parsable entries', () => {
    const { files, reg } = consistent();
    const errors = compare(files, 'const SOURCES = [ { key: "dq", file: "x.md" } ];', reg);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/SOURCES block found but no \{ key, file \} entries parsed/);
  });

  it('reports a missing generated-content import', () => {
    const { files, gen } = consistent();
    const reg = registry({ imports: ['a'], union: ['alpha-doc', 'beta-doc'], keys: ['alpha-doc', 'beta-doc'] }).replace(
      './legalContent.generated',
      './elsewhere'
    );
    const errors = compare(files, gen, reg);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/could not locate `import \{ … \} from '\.\/legalContent\.generated'`/);
  });

  it('reports a missing union', () => {
    const { files, gen } = consistent();
    const reg = consistent().reg.replace('export type LegalDocumentType =', 'export type Other =');
    const errors = compare(files, gen, reg);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/could not locate `export type LegalDocumentType = …;`/);
  });

  it('reports a missing legalDocuments record', () => {
    const { files, gen } = consistent();
    const reg = consistent().reg.replace('export const legalDocuments', 'export const somethingElse');
    const errors = compare(files, gen, reg);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/could not locate `export const legalDocuments … = \{ … \};`/);
  });

  it('collects parse misses from several surfaces in one pass', () => {
    const errors = compare(['a.md'], 'nothing', 'nothing');
    expect(errors).toHaveLength(4);
  });
});

describe('compare: the four disagreement checks', () => {
  it('disk vs generator SOURCES.file', () => {
    const { gen, reg } = consistent();
    const errors = compare(['alpha-doc.md', 'beta-doc.md', 'gamma-doc.md'], gen, reg);
    expect(errors.some((e) => e.startsWith('docs/legal/*.md filenames vs generator SOURCES.file disagree'))).toBe(true);
  });

  it('generator SOURCES.key vs registry imports', () => {
    const { files, gen } = consistent();
    const reg = registry({
      imports: ['alphaContent', 'wrongContent'],
      union: ['alpha-doc', 'beta-doc'],
      keys: ['alpha-doc', 'beta-doc'],
    });
    const errors = compare(files, gen, reg);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^generator SOURCES\.key vs legalDocuments\.ts imports disagree/);
    expect(errors[0]).toContain('"wrongContent"');
  });

  it('union vs record keys', () => {
    const { files, gen } = consistent();
    const reg = registry({
      imports: ['alphaContent', 'betaContent'],
      union: ['alpha-doc', 'beta-doc'],
      keys: ['alpha-doc'],
    });
    const errors = compare(files, gen, reg);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^LegalDocumentType union vs legalDocuments Record keys disagree/);
  });

  it('disk vs union', () => {
    const { files, gen } = consistent();
    const reg = registry({
      imports: ['alphaContent', 'betaContent'],
      union: ['alpha-doc', 'beta-doc', 'phantom'],
      keys: ['alpha-doc', 'beta-doc', 'phantom'],
    });
    const errors = compare(files, gen, reg);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^docs\/legal\/\*\.md filenames vs LegalDocumentType union disagree/);
    expect(errors[0]).toContain('"phantom"');
  });

  it('reports every failing check, in order, for a thoroughly drifted tree', () => {
    const errors = compare(
      ['zeta.md'],
      generator([['aContent', 'alpha-doc.md']]),
      registry({ imports: ['other'], union: ['u1'], keys: ['k1'] })
    );
    expect(errors).toHaveLength(4);
  });
});

describe('compare: record keys count only the top level of the registry object', () => {
  it('does not count a nested `meta: {` as a record key', () => {
    const { files, gen } = consistent();
    const reg = registry({
      imports: ['alphaContent', 'betaContent'],
      union: ['alpha-doc', 'beta-doc'],
      recordBody: [
        "  'alpha-doc': {",
        "    id: 'alpha-doc',",
        '    meta: {',
        "      reviewed: true,",
        '    },',
        '  },',
        "  'beta-doc': {",
        "    id: 'beta-doc',",
        '  },',
      ].join('\n'),
    });
    expect(compare(files, gen, reg)).toEqual([]);
  });

  it('still counts unquoted top-level keys', () => {
    const reg = registry({
      imports: ['alphaContent', 'betaContent'],
      union: ['alpha', 'beta'],
      recordBody: '  alpha: {\n    id: 1,\n  },\n  beta: {\n    id: 2,\n  },',
    });
    const gen = generator([
      ['alphaContent', 'alpha.md'],
      ['betaContent', 'beta.md'],
    ]);
    expect(compare(['alpha.md', 'beta.md'], gen, reg)).toEqual([]);
  });

  it('ignores braces and key-shaped text inside strings and comments', () => {
    const { files, gen } = consistent();
    const reg = registry({
      imports: ['alphaContent', 'betaContent'],
      union: ['alpha-doc', 'beta-doc'],
      recordBody: [
        "  'alpha-doc': {",
        "    description: 'has a stray { brace and fake: { key',",
        "    // don't count: { this",
        '  },',
        "  'beta-doc': {",
        '    note: "unbalanced } here",',
        '  },',
      ].join('\n'),
    });
    expect(compare(files, gen, reg)).toEqual([]);
  });

  it('reports a genuine missing key even when nested keys would have masked it', () => {
    const { files, gen } = consistent();
    const reg = registry({
      imports: ['alphaContent', 'betaContent'],
      union: ['alpha-doc', 'beta-doc'],
      recordBody: ["  'alpha-doc': {", '    beta-doc: {', '      x: 1,', '    },', '  },'].join('\n'),
    });
    const errors = compare(files, gen, reg);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^LegalDocumentType union vs legalDocuments Record keys disagree/);
  });
});
