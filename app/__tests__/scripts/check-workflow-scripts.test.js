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
  extractScriptFileRefs,
  collectScriptFileRefs,
  isScannedWorkflow,
  resolveMissing,
  resolveUntracked,
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

// ---------------------------------------------------------------------------
// INFRA-499: npm script → tracked-file assertion.
// ---------------------------------------------------------------------------

describe('extractScriptFileRefs', () => {
  it('picks up a node-invoked script file', () => {
    expect(extractScriptFileRefs('node scripts/check-crisis-hotline.js')).toEqual([
      'scripts/check-crisis-hotline.js',
    ]);
  });

  it('picks up a bash-invoked shell file, ignoring its arguments', () => {
    expect(extractScriptFileRefs('bash scripts/e2e-safety.sh --tag safety')).toEqual([
      'scripts/e2e-safety.sh',
    ]);
  });

  it('picks up a file reached through && after another command', () => {
    expect(extractScriptFileRefs('patch-package && node scripts/generate-legal-content.js')).toEqual([
      'scripts/generate-legal-content.js',
    ]);
  });

  it('picks up a helper sourced with `.` inside bash -c', () => {
    // `e2e:safety:telemetry` reaches its helper this way. A sourced file that is
    // not in the repository fails exactly like an executed one, so the `.` and
    // `source` forms are in scope.
    const body = "bash -c '. scripts/e2e-telemetry.sh; e2e_telemetry_summary \"${1:-}\"' --";
    expect(extractScriptFileRefs(body)).toEqual(['scripts/e2e-telemetry.sh']);
  });

  it('does NOT treat an interpreter flag as a file', () => {
    // `version-check` is `node -e "…"`. Requiring a script extension on the
    // captured token is what keeps `-e` and `-c` out.
    const body =
      'node -e "const pkg=require(\'./package.json\'); if(pkg.dependencies.react !== \'19.2.3\') throw new Error(\'x\')"';
    expect(extractScriptFileRefs(body)).toEqual([]);
  });

  it('does NOT match an extensionless binary path', () => {
    expect(extractScriptFileRefs('node node_modules/.bin/jest --ci')).toEqual([]);
  });

  it('normalises a leading ./', () => {
    expect(extractScriptFileRefs('node ./scripts/lint-baseline.js')).toEqual([
      'scripts/lint-baseline.js',
    ]);
  });
});

describe('collectScriptFileRefs', () => {
  it('rewrites app-relative paths to repo-relative ones', () => {
    // npm runs a script with cwd = app/, so `scripts/x.js` in package.json is
    // `app/scripts/x.js` to git. Getting this wrong makes every file read as
    // untracked, which is the one failure shape that looks like a real finding.
    expect(collectScriptFileRefs({ 'check:x': 'node scripts/x.js' })).toEqual([
      { file: 'app/scripts/x.js', scripts: ['check:x'] },
    ]);
  });

  it('groups every script that references the same file', () => {
    expect(
      collectScriptFileRefs({
        'e2e:safety': 'bash scripts/e2e-safety.sh',
        'e2e:safety:q9': 'bash scripts/e2e-safety.sh --flow q9',
      })
    ).toEqual([
      { file: 'app/scripts/e2e-safety.sh', scripts: ['e2e:safety', 'e2e:safety:q9'] },
    ]);
  });

  it('returns nothing for scripts that invoke no file', () => {
    expect(collectScriptFileRefs({ lint: 'eslint src', test: 'jest' })).toEqual([]);
  });
});

describe('resolveUntracked', () => {
  const onDisk = (f) => f !== 'app/scripts/deleted.js';

  it('returns nothing when every file is in the index and on disk', () => {
    const refs = [{ file: 'app/scripts/x.js', scripts: ['check:x'] }];
    expect(resolveUntracked(refs, new Set(['app/scripts/x.js']), onDisk)).toEqual([]);
  });

  it('flags a file that exists on disk but is not in the index', () => {
    // This is the INFRA-499 shape: `.gitignore` swallowed it, `git add .`
    // reported nothing, every local check passed because the file is on disk.
    const refs = [{ file: 'app/scripts/ignored.js', scripts: ['check:ignored'] }];
    expect(resolveUntracked(refs, new Set(), onDisk)).toEqual([
      { file: 'app/scripts/ignored.js', scripts: ['check:ignored'], reason: 'untracked' },
    ]);
  });

  it('flags a file that is in the index but absent from the working tree', () => {
    const refs = [{ file: 'app/scripts/deleted.js', scripts: ['check:deleted'] }];
    expect(resolveUntracked(refs, new Set(['app/scripts/deleted.js']), onDisk)).toEqual([
      { file: 'app/scripts/deleted.js', scripts: ['check:deleted'], reason: 'missing' },
    ]);
  });

  it('reports untracked in preference to missing when a file is neither', () => {
    const refs = [{ file: 'app/scripts/deleted.js', scripts: ['check:deleted'] }];
    expect(resolveUntracked(refs, new Set(), onDisk)[0].reason).toBe('untracked');
  });
});

describe('the real package.json script tree', () => {
  // The sibling of the workflow guard above, one level down: that one pins
  // workflow → npm script, this one pins npm script → a file git actually has.
  it('has no npm script invoking a file that is not in the git index', () => {
    const fs = require('fs');
    const { execFileSync } = require('child_process');
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const scripts =
      JSON.parse(fs.readFileSync(path.join(repoRoot, 'app', 'package.json'), 'utf8')).scripts || {};

    const refs = collectScriptFileRefs(scripts);
    expect(refs.length).toBeGreaterThan(10); // the matcher still fires

    const listed = execFileSync('git', ['ls-files', '-z', '--', ...refs.map((r) => r.file)], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    const tracked = new Set(listed.split('\0').filter(Boolean));

    expect(resolveUntracked(refs, tracked, (f) => fs.existsSync(path.join(repoRoot, f)))).toEqual([]);
  });
});
