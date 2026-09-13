/**
 * MAINT-437 — meta-test for the core-export SafeAreaView guard.
 *
 * A source-shape assertion is only worth its cost if it can still go RED (DEBUG-390,
 * and the same reasoning as `check:breathing-worklets`). Comment-stripping plus a narrow
 * regex is exactly the combination that can silently match nothing at all, so this drives
 * the matcher against known-bad literals as well as against the real tree.
 */

const fs = require('fs');
const path = require('path');
const {
  APP_ROOT,
  findViolationsInSource,
  collectViolations,
} = require('../../scripts/check-safe-area-imports.js');

describe('check-safe-area-imports — the matcher fires (positive controls)', () => {
  // One `it` per shape, so a rotted matcher names WHICH shape it stopped catching
  // rather than failing as one opaque assertion.
  const KNOWN_BAD = {
    'single-line import': `import { View, SafeAreaView } from 'react-native';`,
    'multi-line import block': [
      'import {',
      '  View,',
      '  SafeAreaView,',
      '  StatusBar,',
      "} from 'react-native';",
    ].join('\n'),
    'type-only import': `import { type SafeAreaView } from 'react-native';`,
    're-export from the core module': `export { SafeAreaView } from 'react-native';`,
    'namespace member access': `const C = RN.SafeAreaView;`,
    'require member access': `const C = require('react-native').SafeAreaView;`,
    'jest.mock factory property': [
      "jest.mock('react-native', () => {",
      "  const RN = jest.requireActual('react-native');",
      '  return {',
      '    View: RN.View,',
      '    SafeAreaView: RN.SafeAreaView,',
      '  };',
      '})',
    ].join('\n'),
  };

  for (const [shape, src] of Object.entries(KNOWN_BAD)) {
    it(`catches: ${shape}`, () => {
      expect(findViolationsInSource(src, 'fixture.ts').length).toBeGreaterThan(0);
    });
  }
});

describe('check-safe-area-imports — the matcher does NOT over-fire', () => {
  /**
   * The real prose survivors. This codebase deliberately NAMES anti-patterns to warn the
   * next reader off them, which is the exact collision DEBUG-390 records: a bare
   * `not.toContain('SafeAreaView')` matches the comment saying "do not use SafeAreaView"
   * and fails on correct code.
   */
  const KNOWN_GOOD = {
    'the correct import': `import { SafeAreaView } from 'react-native-safe-area-context';`,
    'line comment naming it': `// ❌ SafeAreaView (use react-native-safe-area-context)`,
    'block comment naming it': [
      '/**',
      ' * PracticeScreenLayout: shared layout wrapper (replaces SafeAreaView + header).',
      ' */',
    ].join('\n'),
    'inline comment after code': `import { View } from 'react-native'; // not SafeAreaView`,
    'a URL is not a line comment': `// see https://example.com/SafeAreaView-notes`,
    'safe-area-context mock property': [
      "jest.mock('react-native-safe-area-context', () => {",
      '  const passthrough = ({ children }) => children;',
      '  return {',
      '    SafeAreaProvider: passthrough,',
      '    SafeAreaView: SafeAreaViewMock,',
      '  };',
      '})',
    ].join('\n'),
  };

  for (const [shape, src] of Object.entries(KNOWN_GOOD)) {
    it(`ignores: ${shape}`, () => {
      expect(findViolationsInSource(src, 'fixture.ts')).toEqual([]);
    });
  }

  it('distinguishes the two SafeAreaView mock properties in one file', () => {
    // The discriminating case for matcher (C). Both factories are in jest.setup.js, a few
    // hundred lines apart, with an IDENTICAL `SafeAreaView:` shape — one banned, one
    // required. A prop-shaped regex that is not scoped to the react-native factory
    // cannot tell them apart, and would demand the deletion of the mock the migration
    // depends on.
    const src = [
      "jest.mock('react-native', () => {",
      '  return { SafeAreaView: RN.SafeAreaView };',
      '})',
      '',
      "jest.mock('react-native-safe-area-context', () => {",
      '  return { SafeAreaView: SafeAreaViewMock };',
      '})',
    ].join('\n');
    const v = findViolationsInSource(src, 'fixture.js');
    // The react-native factory's property is flagged (by matchers B and C both — they
    // overlap deliberately, so the count is not the assertion). The safe-area-context
    // factory's identically-shaped property on line 6 must NOT be.
    expect(v.length).toBeGreaterThan(0);
    expect([...new Set(v.map((x) => x.line))]).toEqual([2]);
  });
});

describe('check-safe-area-imports — the real tree', () => {
  it('scans a non-trivial corpus (a broken walker must not pass by scanning nothing)', () => {
    const { filesScanned } = collectViolations();
    expect(filesScanned).toBeGreaterThan(500);
  });

  it('the tree already uses react-native-safe-area-context widely', () => {
    // Second liveness check: if this dropped to zero the migration would have been
    // reverted wholesale and the corpus assertion above would still pass.
    const { filesScanned } = collectViolations();
    expect(filesScanned).toBeGreaterThan(0);
    const hits = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) {
          if (!['node_modules', 'coverage', '__snapshots__'].includes(e.name)) walk(p);
        } else if (/\.tsx?$/.test(e.name)) {
          if (fs.readFileSync(p, 'utf8').includes("from 'react-native-safe-area-context'")) {
            hits.push(p);
          }
        }
      }
    };
    walk(path.join(APP_ROOT, 'src'));
    expect(hits.length).toBeGreaterThanOrEqual(18);
  });

  it('has ZERO core-export SafeAreaView usages', () => {
    const { violations } = collectViolations();
    expect(violations.map((v) => `${v.file}:${v.line} — ${v.why}`)).toEqual([]);
  });
});

describe('check-safe-area-imports — the self-exclusion stays narrow', () => {
  it('excludes exactly one file: this one', () => {
    const { SELF_EXCLUDE } = require('../../scripts/check-safe-area-imports.js');
    // A carve-out that can grow is how a guard quietly stops guarding. This file must
    // hold known-bad literals to prove the matcher fires; nothing else may opt out.
    expect(SELF_EXCLUDE).toEqual(['__tests__/scripts/check-safe-area-imports.test.js']);
  });
});
