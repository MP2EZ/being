/**
 * Meta-test for scripts/check-workflow-scripts.js (DEBUG-389).
 *
 * Gated by the existing `test:scripts` CI step, same as the INFRA-368 meta-test
 * it is modelled on.
 *
 * The resolver cases are driven by fixture strings so they pin BEHAVIOUR and do
 * not re-break when a workflow legitimately gains a step. The final block is the
 * exception and is deliberate: it runs the real tree, because the whole point of
 * this guard is that the real tree stays clean.
 */

const path = require('path');
const {
  extractNpmRunNames,
  isScannedWorkflow,
  resolveMissing,
  scanWorkflowDir,
} = require('../../scripts/check-workflow-scripts');

describe('extractNpmRunNames', () => {
  it('picks up invocations including colons and flags after them', () => {
    const yml = `
      - run: cd app && npm run test:safety -- --ci --testTimeout=20000
      - run: cd app && npm run check:breathing-worklets
    `;
    expect(extractNpmRunNames(yml).map((r) => r.name).sort()).toEqual([
      'check:breathing-worklets',
      'test:safety',
    ]);
  });

  it('does NOT match `npm ci`, which is the install step, not a script', () => {
    // The mandatory `run ` in the regex is what makes this true. Without it the
    // guard would demand a script named `ci` in every workflow that installs.
    const yml = '- run: cd app && npm ci --prefer-offline --no-audit';
    expect(extractNpmRunNames(yml)).toEqual([]);
  });

  it('reports the 1-indexed line of each invocation', () => {
    const yml = ['jobs:', '  a:', '    - run: npm run lint', '', '    - run: npm run typecheck'].join('\n');
    expect(extractNpmRunNames(yml)).toEqual([
      { name: 'lint', line: 3 },
      { name: 'typecheck', line: 5 },
    ]);
  });

  it('matches inside YAML comments — deliberately, not by oversight', () => {
    // A comment naming a script that no longer exists is drift worth catching:
    // it is documentation that has silently become false. Stripping comments
    // would also mean parsing YAML, which this script exists to avoid.
    const yml = '      # Run `npm run test:encryption` here if you need it locally';
    expect(extractNpmRunNames(yml).map((r) => r.name)).toEqual(['test:encryption']);
  });
});

describe('isScannedWorkflow', () => {
  it.each(['ci.yml', 'release.yml', 'something.yaml'])('scans %s', (f) => {
    expect(isScannedWorkflow(f)).toBe(true);
  });

  it('does NOT scan a .disabled file', () => {
    // This single line is what keeps deploy.yml.disabled from being a permanent
    // red: it carries 10 knowingly-missing targets, documented in its own header
    // by MAINT-369. The filter is not an allowlist — it is the same predicate
    // GitHub Actions uses to decide what to load, so it cannot drift out of sync
    // with reality. Rename that file back to .yml and the guard goes red at once,
    // with all 10 names, which is the intended behaviour.
    expect(isScannedWorkflow('deploy.yml.disabled')).toBe(false);
  });

  it('does NOT scan unrelated files that happen to sit in the directory', () => {
    expect(isScannedWorkflow('README.md')).toBe(false);
    expect(isScannedWorkflow('.gitkeep')).toBe(false);
  });
});

describe('resolveMissing', () => {
  const scripts = {
    lint: 'eslint src',
    'validate:authority': 'npm run validate:complete',
    'validate:complete': 'npm run test:clinical',
    'test:clinical': 'jest --testPathPattern=clinical',
    'broken:alias': 'npm run does:not:exist',
    'self:ref': 'npm run self:ref',
  };

  it('returns nothing when every name resolves', () => {
    expect(resolveMissing([{ name: 'lint', line: 1 }], scripts)).toEqual([]);
  });

  it('flags a name with no script at all', () => {
    expect(resolveMissing([{ name: 'perf:crisis', line: 306 }], scripts)).toEqual([
      { name: 'perf:crisis', line: 306, chain: ['perf:crisis'] },
    ]);
  });

  it('follows npm run indirection and reports the whole broken chain', () => {
    // A leaf-only check would call `broken:alias` present and stop. The break is
    // one level down, and the chain is what makes the failure actionable.
    expect(resolveMissing([{ name: 'broken:alias', line: 7 }], scripts)).toEqual([
      { name: 'broken:alias', line: 7, chain: ['broken:alias', 'does:not:exist'] },
    ]);
  });

  it('resolves a multi-level chain that terminates successfully', () => {
    expect(resolveMissing([{ name: 'validate:authority', line: 2 }], scripts)).toEqual([]);
  });

  it('terminates on a self-referential script instead of recursing forever', () => {
    expect(resolveMissing([{ name: 'self:ref', line: 3 }], scripts)).toEqual([]);
  });
});

describe('the real workflow tree', () => {
  // This block is the guard. Everything above pins the resolver; this pins the repo.
  it('has no workflow invoking an npm script that does not exist', () => {
    const findings = scanWorkflowDir(
      path.resolve(__dirname, '..', '..', '..', '.github', 'workflows'),
      JSON.parse(
        require('fs').readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf8')
      ).scripts || {}
    );
    expect(findings).toEqual([]);
  });
});
