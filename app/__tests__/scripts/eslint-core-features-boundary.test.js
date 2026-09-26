/**
 * MAINT-659 — pins the `core/` must-not-import-`features/` boundary in eslint.config.js.
 *
 * The rule is enforced by the `being/core-features-boundary` block. This suite exists
 * because every way that block can rot is SILENT:
 *   - flat config REPLACES a rule's options per matching object, so the core block
 *     re-reads MAINT-437's SafeAreaView `paths` and DEBUG-342's gray[500] selector from
 *     the base block. Drop either and core files lose that ban with no error anywhere;
 *   - a `patterns` regex that matches nothing lints clean forever;
 *   - `lint:baseline -- --update` absorbs a new violation as a count, so "the rule
 *     errors" is not the same as "no core file violates it" — hence the hard-zero walk;
 *   - an exception entry for a file that moved, or stopped importing features, is dead
 *     weight that silently widens the list.
 *
 * Two ESLint surfaces, deliberately:
 *   - `ESLint` with the REAL config and a REAL in-tsconfig core path, for the one
 *     behavioural check. Default config discovery cannot be used here: it loads
 *     eslint.config.js with `await import()`, which jest's VM rejects without
 *     --experimental-vm-modules. `overrideConfigFile: true` + `overrideConfig` skips it.
 *   - `Linter` + @typescript-eslint/parser with NO type info, for the file walks. It is
 *     AST-based, so a comment naming a forbidden import cannot match (DEBUG-390), and it
 *     avoids a type-aware parse per file.
 */

const fs = require('fs');
const path = require('path');
const { ESLint, Linter } = require('eslint');
const tsParser = require('@typescript-eslint/parser');

const APP_DIR = path.join(__dirname, '..', '..');
const config = require('../../eslint.config.js');

const CORE_BLOCK_NAME = 'being/core-features-boundary';
const BOUNDARY_TAG = 'MAINT-659';

// A real, non-excepted, in-tsconfig core file. The type-aware parser rejects a
// virtual path, so lintText must borrow a real one; its on-disk content is ignored.
const PROBE_PATH = 'src/core/theme/index.ts';

// The four specifiers every core file may import. They are INFRA-531's anchors plus
// the component DEBUG-506's guard prescribes; if any moves, INFRA-531's import
// detector keys on a path that no longer exists and its self-test keeps passing.
const LEAF_MODULES = [
  'src/features/crisis/constants/crisisButtonGeometry.ts',
  'src/features/crisis/constants/crisisInputAccessory.ts',
  'src/features/crisis/types/safety.ts',
  'src/features/assessment/types/scoring.ts',
  'src/features/crisis/components/CrisisTextInput.tsx',
];

function coreBlock() {
  const block = config.find((c) => c.name === CORE_BLOCK_NAME);
  if (!block) throw new Error(`eslint.config.js has no config object named ${CORE_BLOCK_NAME}`);
  return block;
}

// The exception list is read FROM the config, so the test and the rule cannot drift.
function exceptionList() {
  return coreBlock().ignores.filter((g) => !/[*{]/.test(g));
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function isTestFile(rel) {
  return /(^|\/)__tests__\//.test(rel) || /\.(test|spec)\.tsx?$/.test(rel);
}

const linter = new Linter({ configType: 'flat' });

// Lint source with ONLY the core block's two boundary rules, AST-only.
function boundaryMessages(source, filename) {
  const { rules } = coreBlock();
  const messages = linter.verify(
    source,
    [
      {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
          parser: tsParser,
          parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
        },
        rules: {
          'no-restricted-imports': rules['no-restricted-imports'],
          'no-restricted-syntax': rules['no-restricted-syntax'],
        },
      },
    ],
    { filename },
  );
  const fatal = messages.filter((m) => m.fatal);
  if (fatal.length) throw new Error(`${filename} failed to parse: ${fatal[0].message}`);
  return messages.filter((m) => m.message.includes(BOUNDARY_TAG));
}

describe('MAINT-659 core→features boundary — the real config fires on a real core file', () => {
  const FIXTURE = [
    /* 1 */ "import { SafeAreaView } from 'react-native';",
    /* 2 */ "import type { ModuleId } from '@/features/learn/types/education';",
    /* 3 */ "import { x } from '../features/learn/types/education';",
    /* 4 */ "import { y } from 'src/features/learn/types/education';",
    /* 5 */ "import { z } from '@/core/../features/learn/types/education';",
    /* 6 */ "import { w } from '@/features/crisis/constants/../../journal/services/journalEntryStore';",
    /* 7 */ "export { v } from '@/features/crisis/constants/crisisButtonGeometry';",
    /* 8 */ "const a = require('@/features/learn/types/education');",
    /* 9 */ "const b = import('@/features/crisis/constants/crisisButtonGeometry');",
    /* 10 */ "import { CRISIS_BUTTON_EXCLUSION_RECT } from '@/features/crisis/constants/crisisButtonGeometry';",
    /* 11 */ "import { crisisAccessoryProps } from '@/features/crisis/constants/crisisInputAccessory';",
    /* 12 */ "import { detectCrisis } from '@/features/crisis/types/safety';",
    /* 13 */ "import type { AssessmentResult } from '@/features/assessment/types/scoring';",
    /* 14 */ "import { CrisisTextInput } from '@/features/crisis/components/CrisisTextInput';",
    /* 15 */ "import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';",
    /* 16 */ "import { RootCrisisButton } from '@/features/crisis/components/RootCrisisButton';",
    /* 17 */ "export const probe = [ModuleId, x, y, z, w, a, b, CRISIS_BUTTON_EXCLUSION_RECT, crisisAccessoryProps, detectCrisis, CrisisTextInput, useAssessmentStore, RootCrisisButton, SafeAreaView];",
  ].join('\n');

  let byLine;

  beforeAll(async () => {
    const eslint = new ESLint({ cwd: APP_DIR, overrideConfigFile: true, overrideConfig: config });
    const [result] = await eslint.lintText(FIXTURE, { filePath: path.join(APP_DIR, PROBE_PATH) });
    const fatal = result.messages.filter((m) => m.fatal);
    if (fatal.length) throw new Error(`probe failed to parse: ${fatal[0].message}`);
    byLine = new Map();
    for (const m of result.messages) {
      if (m.ruleId !== 'no-restricted-imports' && m.ruleId !== 'no-restricted-syntax') continue;
      if (!byLine.has(m.line)) byLine.set(m.line, []);
      byLine.get(m.line).push(m.message);
    }
  }, 60000);

  const tagged = (line, tag) => (byLine.get(line) || []).some((msg) => msg.includes(tag));

  it('keeps MAINT-437: SafeAreaView from react-native still errors in a core file', () => {
    expect(tagged(1, 'MAINT-437')).toBe(true);
  });

  it.each([
    [2, 'aliased import (type-only is NOT exempt)'],
    [3, 'relative ../features specifier'],
    [4, 'baseUrl src/features specifier'],
    [5, 'alias that walks back out (@/core/../features)'],
    [6, 'traversal out of an allowed leaf directory'],
    [7, 're-export of a leaf module through core'],
    [8, 'require() of a features path'],
    [9, 'import() of a features path'],
    [15, 'a feature store'],
    [16, 'a crisis component outside the leaf allowance'],
  ])('line %i errors: %s', (line) => {
    expect(tagged(line, BOUNDARY_TAG)).toBe(true);
  });

  it.each([
    [10, 'crisis/constants/crisisButtonGeometry'],
    [11, 'crisis/constants/crisisInputAccessory'],
    [12, 'crisis/types/safety (detectCrisis)'],
    [13, 'assessment/types/scoring'],
    [14, 'crisis/components/CrisisTextInput'],
  ])('line %i is allowed (leaf module): %s', (line) => {
    expect(tagged(line, BOUNDARY_TAG)).toBe(false);
  });
});

describe('MAINT-659 core→features boundary — flat-config option replacement', () => {
  const eslint = new ESLint({ cwd: APP_DIR, overrideConfigFile: true, overrideConfig: config });

  const hasSafeAreaBan = (cfg) => {
    const [, opts] = cfg.rules['no-restricted-imports'];
    return (opts.paths || []).some(
      (p) => p.name === 'react-native' && (p.importNames || []).includes('SafeAreaView'),
    );
  };

  it('a non-excepted core file gets the boundary AND keeps both re-read bans', async () => {
    const cfg = await eslint.calculateConfigForFile(path.join(APP_DIR, PROBE_PATH));
    expect(cfg.rules['no-restricted-imports'][0]).toBe(2);
    expect(hasSafeAreaBan(cfg)).toBe(true);
    expect(cfg.rules['no-restricted-imports'][1].patterns.length).toBeGreaterThan(0);
    const selectors = cfg.rules['no-restricted-syntax'].slice(1).map((s) => s.selector);
    expect(selectors.some((s) => s.includes('object.property.name="gray"'))).toBe(true);
    expect(selectors.some((s) => s.startsWith('ImportExpression'))).toBe(true);
  });

  it('every exception falls through to the base block and keeps MAINT-437', async () => {
    for (const rel of exceptionList()) {
      const cfg = await eslint.calculateConfigForFile(path.join(APP_DIR, rel));
      expect([rel, cfg.rules['no-restricted-imports'][0]]).toEqual([rel, 2]);
      expect([rel, hasSafeAreaBan(cfg)]).toEqual([rel, true]);
      expect([rel, cfg.rules['no-restricted-imports'][1].patterns]).toEqual([rel, undefined]);
    }
  });

  it('a co-located core test is outside the boundary block', async () => {
    const cfg = await eslint.calculateConfigForFile(
      path.join(APP_DIR, 'src/core/types/__tests__/practice-identity.test.ts'),
    );
    expect(cfg.rules['no-restricted-imports'][1].patterns).toBeUndefined();
  });
});

describe('MAINT-659 core→features boundary — the exception list', () => {
  const list = exceptionList();

  it('is the reviewed 12, with no duplicates', () => {
    // Changing this number is a reviewed two-file diff by design: a new entry is a new
    // core→features edge somebody chose to allow.
    expect(list).toHaveLength(12);
    expect(new Set(list).size).toBe(list.length);
  });

  it.each(list)('%s exists and still imports from features (else delete the entry)', (rel) => {
    const abs = path.join(APP_DIR, rel);
    expect(fs.existsSync(abs)).toBe(true);
    const hits = boundaryMessages(fs.readFileSync(abs, 'utf8'), rel);
    expect(hits.length).toBeGreaterThan(0);
  });
});

describe('MAINT-659 core→features boundary — the four leaf modules INFRA-531 anchors on', () => {
  it.each(LEAF_MODULES)('%s exists at its anchored path', (rel) => {
    if (!fs.existsSync(path.join(APP_DIR, rel))) {
      throw new Error(
        `${rel} moved. The leaf allowance and INFRA-531's /b-close import detector both key on ` +
          'this exact path, and INFRA-531 only self-tests against literal strings, so it would ' +
          'keep passing while matching nothing. Move the allowance, the detector and this list together.',
      );
    }
  });
});

describe('MAINT-659 core→features boundary — hard zero over the real tree', () => {
  const coreFiles = walk(path.join(APP_DIR, 'src', 'core'))
    .map((abs) => path.relative(APP_DIR, abs))
    .filter((rel) => !isTestFile(rel));
  const exceptions = new Set(exceptionList());

  it('the walk read the tree and the matcher fires on it (positive control)', () => {
    expect(coreFiles.length).toBeGreaterThan(50);
    // Control against the SCANNED source, not a literal: an excepted file really does
    // import from features, so a matcher that stopped firing reds here first.
    const control = coreFiles.find((rel) => rel.endsWith('CleanRootNavigator.tsx'));
    expect(control).toBeDefined();
    expect(
      boundaryMessages(fs.readFileSync(path.join(APP_DIR, control), 'utf8'), control).length,
    ).toBeGreaterThan(0);
  });

  it('no non-excepted core file crosses the boundary', () => {
    // Not left to lint:baseline: its per-file count can be traded against an unrelated
    // fix, and `--update` absorbs a new violation outright.
    const offenders = coreFiles
      .filter((rel) => !exceptions.has(rel))
      .flatMap((rel) =>
        boundaryMessages(fs.readFileSync(path.join(APP_DIR, rel), 'utf8'), rel).map(
          (m) => `${rel}:${m.line} ${m.message.slice(0, 80)}`,
        ),
      );
    expect(offenders).toEqual([]);
  });

  it('no core file — excepted or not — re-exports from features', () => {
    // An excepted file may import from features; it may never become a re-export shim,
    // which would hide every later consumer from INFRA-531. The selector's own firing is
    // proven through the real config by fixture line 7 above.
    const offenders = coreFiles.flatMap((rel) =>
      boundaryMessages(fs.readFileSync(path.join(APP_DIR, rel), 'utf8'), rel)
        .filter((m) => m.message.includes('[re-export]'))
        .map((m) => `${rel}:${m.line}`),
    );
    expect(offenders).toEqual([]);
  });
});
