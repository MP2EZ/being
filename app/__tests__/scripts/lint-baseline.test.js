/**
 * Meta-test for scripts/lint-baseline.js (MAINT-742 / TEST-19).
 *
 * eslint is never run: `exec` is injected. Baseline files live in a mkdtemp dir.
 *
 * The load-bearing distinction: an EMPTY eslint result array means zero files
 * were linted (bad glob, broken config) and must exit 2 with COULD NOT DETERMINE,
 * whereas a clean tree is a NON-empty array of zero-error entries and must pass.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { diff, parseEslintJson, collect, main } = require('../../scripts/lint-baseline');

const ROOT = '/fake/app';
const entry = (rel, errorCount) => ({ filePath: `${ROOT}/${rel}`, errorCount });
const json = (entries) => JSON.stringify(entries);

/** exec that returns stdout normally. */
const okExec = (stdout) => () => stdout;
/** exec that mimics eslint exiting non-zero with the JSON still on stdout. */
const failingExec = (stdout) => () => {
  const e = new Error('Command failed: npx eslint');
  e.status = 1;
  e.stdout = stdout;
  throw e;
};

let tmp;
let baselineFile;
let out;
let err;
const io = () => ({
  log: (m) => out.push(String(m)),
  error: (m) => err.push(String(m)),
});

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-baseline-'));
  baselineFile = path.join(tmp, 'baseline.json');
  out = [];
  err = [];
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const writeBaseline = (obj) => fs.writeFileSync(baselineFile, JSON.stringify(obj));
const run = (argv, exec) => main({ argv, baselineFile, exec, appRoot: ROOT, ...io() });

describe('diff', () => {
  it('reports a regression when a file count grows', () => {
    expect(diff({ 'a.ts': 1 }, { 'a.ts': 3 })).toEqual({
      regressions: [{ file: 'a.ts', from: 1, to: 3 }],
      improvements: [],
    });
  });

  it('reports a brand-new erroring file as a regression from 0', () => {
    expect(diff({}, { 'b.ts': 1 }).regressions).toEqual([{ file: 'b.ts', from: 0, to: 1 }]);
  });

  it('reports an improvement when a count shrinks or a file disappears', () => {
    expect(diff({ 'a.ts': 3, 'c.ts': 1 }, { 'a.ts': 1 })).toEqual({
      regressions: [],
      improvements: [
        { file: 'a.ts', from: 3, to: 1 },
        { file: 'c.ts', from: 1, to: 0 },
      ],
    });
  });

  it('is empty when nothing changed', () => {
    expect(diff({ 'a.ts': 2 }, { 'a.ts': 2 })).toEqual({ regressions: [], improvements: [] });
  });

  it('catches a swap that a global total would hide', () => {
    const d = diff({ 'a.ts': 1, 'b.ts': 0 }, { 'a.ts': 0, 'b.ts': 1 });
    expect(d.regressions).toHaveLength(1);
    expect(d.improvements).toHaveLength(1);
  });
});

describe('parseEslintJson', () => {
  it('maps only files with errors, relative to the app root', () => {
    const counts = parseEslintJson(
      json([entry('src/a.ts', 2), entry('src/b.ts', 0), entry('src/c.ts', 1)]),
      ROOT
    );
    expect(counts).toEqual({ 'src/a.ts': 2, 'src/c.ts': 1 });
  });

  it('a clean tree (non-empty array, all zero errors) is {} and does not throw', () => {
    expect(parseEslintJson(json([entry('src/a.ts', 0)]), ROOT)).toEqual({});
  });

  it.each([
    ['an empty array (zero files linted)', '[]'],
    ['an empty string', ''],
    ['non-JSON text', 'Oops! Something went wrong'],
    ['a JSON object', '{}'],
  ])('throws on %s', (_label, stdout) => {
    expect(() => parseEslintJson(stdout, ROOT)).toThrow();
  });
});

describe('collect', () => {
  it('parses stdout from a zero-exit run', () => {
    expect(collect({ exec: okExec(json([entry('src/a.ts', 1)])), appRoot: ROOT })).toEqual({ 'src/a.ts': 1 });
  });

  it('recovers stdout from a non-zero exit', () => {
    expect(collect({ exec: failingExec(json([entry('src/a.ts', 4)])), appRoot: ROOT })).toEqual({ 'src/a.ts': 4 });
  });

  it('rethrows when the failure carries no stdout', () => {
    const exec = () => {
      throw new Error('spawn npx ENOENT');
    };
    expect(() => collect({ exec, appRoot: ROOT })).toThrow('ENOENT');
  });

  it('throws on empty eslint output rather than reporting zero errors', () => {
    expect(() => collect({ exec: okExec('[]'), appRoot: ROOT })).toThrow(/empty/);
  });
});

describe('main: comparison', () => {
  it('exits 1 and names the file on a regression', () => {
    writeBaseline({ 'src/a.ts': 1 });
    const code = run([], failingExec(json([entry('src/a.ts', 2)])));
    expect(code).toBe(1);
    expect(err.join('\n')).toMatch(/Lint regressions vs baseline/);
    expect(err.join('\n')).toMatch(/a\.ts: 1 → 2/);
  });

  it('exits 0 on an improvement and says so', () => {
    writeBaseline({ 'src/a.ts': 3 });
    const code = run([], failingExec(json([entry('src/a.ts', 1)])));
    expect(code).toBe(0);
    expect(out.join('\n')).toMatch(/Lint improvements/);
    expect(out.join('\n')).toMatch(/No new lint errors\. 1\/3 errors across 1 files\./);
  });

  it('exits 0 when nothing changed', () => {
    writeBaseline({ 'src/a.ts': 1 });
    expect(run([], failingExec(json([entry('src/a.ts', 1)])))).toBe(0);
  });

  it('treats a missing baseline file as empty: any error is a regression', () => {
    expect(fs.existsSync(baselineFile)).toBe(false);
    expect(run([], failingExec(json([entry('src/a.ts', 1)])))).toBe(1);
  });

  it('a missing baseline with a legitimately clean tree still passes', () => {
    expect(run([], okExec(json([entry('src/a.ts', 0)])))).toBe(0);
    expect(out.join('\n')).toMatch(/No new lint errors\. 0\/0 errors across 0 files\./);
  });

  it('a clean tree passes against a non-empty baseline (all improvements)', () => {
    writeBaseline({ 'src/a.ts': 2 });
    expect(run([], okExec(json([entry('src/a.ts', 0)])))).toBe(0);
  });
});

describe('main: COULD NOT DETERMINE (exit 2)', () => {
  it.each([
    ['empty result array', okExec('[]')],
    ['empty stdout', okExec('')],
    ['invalid output', okExec('not json at all')],
    ['eslint crash with no stdout', () => { throw new Error('spawn npx ENOENT'); }],
    ['non-zero exit with empty array on stdout', failingExec('[]')],
  ])('%s', (_label, exec) => {
    writeBaseline({ 'src/a.ts': 5 });
    const code = run([], exec);
    expect(code).toBe(2);
    expect(err.join('\n')).toMatch(/COULD NOT DETERMINE/);
    expect(out.join('\n')).not.toMatch(/No new lint errors/);
  });
});

describe('main: --update', () => {
  it('writes the current counts to the baseline file', () => {
    const code = run(['--update'], failingExec(json([entry('src/a.ts', 2), entry('src/b.ts', 0)])));
    expect(code).toBe(0);
    expect(JSON.parse(fs.readFileSync(baselineFile, 'utf8'))).toEqual({ 'src/a.ts': 2 });
    expect(out.join('\n')).toMatch(/Baseline updated: 1 files, 2 errors\./);
  });

  it('writes {} for a legitimately clean tree', () => {
    expect(run(['--update'], okExec(json([entry('src/a.ts', 0)])))).toBe(0);
    expect(JSON.parse(fs.readFileSync(baselineFile, 'utf8'))).toEqual({});
  });

  it('refuses to write on an empty result and leaves the existing baseline untouched', () => {
    writeBaseline({ 'src/a.ts': 5 });
    const before = fs.readFileSync(baselineFile, 'utf8');
    const code = run(['--update'], okExec('[]'));
    expect(code).toBe(2);
    expect(err.join('\n')).toMatch(/COULD NOT DETERMINE/);
    expect(fs.readFileSync(baselineFile, 'utf8')).toBe(before);
  });

  it('refuses to create a baseline from an empty result', () => {
    expect(run(['--update'], okExec('[]'))).toBe(2);
    expect(fs.existsSync(baselineFile)).toBe(false);
  });
});
