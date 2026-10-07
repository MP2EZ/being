/**
 * DEBUG-679 — linkedPracticeParams.ts is imported by CleanRootNavigator, so module-scope
 * imports of the module JSON would parse all five modules at app launch (<2s budget).
 * Pin that they are required lazily, inside the catalog builder.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const source = stripComments(
  readFileSync(join(__dirname, '../../src/core/navigation/linkedPracticeParams.ts'), 'utf8'),
);

describe('linkedPracticeParams loads module JSON lazily (DEBUG-679)', () => {
  it('has no top-level import of assets/modules', () => {
    expect(source).not.toMatch(/^import[^;]*assets\/modules/m);
  });

  it('requires the module JSON inside buildCatalog', () => {
    const body = source.slice(source.indexOf('function buildCatalog'));
    expect(body).toMatch(/require\('\.\.\/\.\.\/\.\.\/assets\/modules\/module-1-aware-presence\.json'\)/);
  });

  it('positive control: the import matcher fires on a module-scope import line', () => {
    expect("import x from '../../../assets/modules/m.json';").toMatch(
      /^import[^;]*assets\/modules/m,
    );
  });
});
