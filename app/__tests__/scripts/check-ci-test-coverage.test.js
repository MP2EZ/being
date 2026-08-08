/**
 * Meta-test for scripts/check-ci-test-coverage.js (INFRA-368).
 *
 * Gated by the existing `test:scripts` CI step, so the thing that measures CI
 * coverage is itself covered — otherwise this script would be the 64th file
 * matching no pattern, which would be a fairly complete joke.
 *
 * Every case below is driven by fixture strings rather than the real ci.yml, so
 * these assertions pin the RESOLVER's behaviour and do not re-break every time
 * a job is legitimately added.
 */

const {
  extractCiScriptNames,
  extractPatterns,
  resolvePatterns,
  findUncovered,
  parseGateLists,
  gateWiringDrift,
} = require('../../scripts/check-ci-test-coverage');

describe('extractCiScriptNames', () => {
  it('picks up npm run invocations including colons and flags after them', () => {
    const yml = `
      - run: cd app && npm run test:safety -- --ci --testTimeout=20000
      - run: cd app && npm run check:breathing-worklets
    `;
    expect([...extractCiScriptNames(yml)].sort()).toEqual([
      'check:breathing-worklets',
      'test:safety',
    ]);
  });

  it('does NOT match `npm ci`, which is the install step, not a script', () => {
    const yml = '- run: cd app && npm ci --prefer-offline --no-audit';
    expect([...extractCiScriptNames(yml)]).toEqual([]);
  });
});

describe('extractPatterns', () => {
  it('reads a bare pattern', () => {
    expect(extractPatterns('jest --testPathPattern=unit --forceExit')).toEqual(['unit']);
  });

  it('reads a double-quoted pattern containing regex alternation', () => {
    expect(
      extractPatterns('jest --testPathPattern="(__tests__/safety|__tests__/crisis-safety)"')
    ).toEqual(['(__tests__/safety|__tests__/crisis-safety)']);
  });

  it('returns [] for a script with no pattern', () => {
    expect(extractPatterns('tsc --noEmit')).toEqual([]);
  });
});

describe('resolvePatterns', () => {
  // The regression that motivates the whole function: CI invokes neither
  // pattern-bearing script directly. A single-level scan resolves nothing here.
  const scripts = {
    'validate:crisis-authority': 'npm run test:crisis-quick',
    'test:crisis-quick': 'jest --testPathPattern="[Cc]risis" --testTimeout=5000',
    'validate:clinical-authority': 'npm run validate:clinical-complete',
    'validate:clinical-complete': 'npm run test:clinical',
    'test:clinical': 'jest --testPathPattern=clinical',
  };

  it('follows npm run indirection two levels deep', () => {
    expect([...resolvePatterns(new Set(['validate:clinical-authority']), scripts)]).toEqual([
      'clinical',
    ]);
  });

  it('follows one level of indirection', () => {
    expect([...resolvePatterns(new Set(['validate:crisis-authority']), scripts)]).toEqual([
      '[Cc]risis',
    ]);
  });

  it('ignores a script name that does not exist in package.json', () => {
    expect([...resolvePatterns(new Set(['nope']), scripts)]).toEqual([]);
  });

  it('terminates on a self-referential script instead of blowing the stack', () => {
    const cyclic = { a: 'npm run b', b: 'npm run a && jest --testPathPattern=x' };
    expect([...resolvePatterns(new Set(['a']), cyclic)]).toEqual(['x']);
  });
});

describe('findUncovered', () => {
  const files = [
    '/repo/app/__tests__/safety/lsApplicationQueriesSchemes.config.test.ts',
    '/repo/app/__tests__/safety/crisisDialGuard.test.ts',
    '/repo/app/__tests__/privacy/feedbackScrub.contract.test.ts',
    '/repo/app/__tests__/unit/foo.test.ts',
  ];

  it('treats patterns as regexes matched against the full path', () => {
    expect(findUncovered(files, new Set(['unit', '[Cc]risis']))).toEqual([
      '/repo/app/__tests__/privacy/feedbackScrub.contract.test.ts',
      '/repo/app/__tests__/safety/lsApplicationQueriesSchemes.config.test.ts',
    ]);
  });

  // The accidental-coverage mechanism this item exists to expose: a file is
  // gated because of what it is NAMED, not because anyone chose to gate it.
  it('covers a safety file solely because its filename contains "crisis"', () => {
    expect(findUncovered(files, new Set(['[Cc]risis']))).not.toContain(
      '/repo/app/__tests__/safety/crisisDialGuard.test.ts'
    );
  });

  it('returns [] when every file matches something', () => {
    expect(findUncovered(files, new Set(['__tests__']))).toEqual([]);
  });
});

describe('parseGateLists / gateWiringDrift', () => {
  const ciPass = (extraNeeds = '', extraAdd = '', extraEcho = '', extraCond = '') => `
  performance:
    name: Performance regression

  ci-pass:
    name: CI pass
    needs:
      - typecheck
      - performance${extraNeeds}

    steps:
      - name: Collect gate results
        run: |
          add "TypeScript typecheck"   "\${{ needs.typecheck.result }}"
          add "Performance regression" "\${{ needs.performance.result }}"${extraAdd}
          echo "failed=$FAILED" >> "$GITHUB_OUTPUT"

      - name: Aggregate gate status
        run: |
          echo "typecheck:   \${{ needs.typecheck.result }}"
          echo "performance: \${{ needs.performance.result }}"${extraEcho}
          if [[ "\${{ needs.typecheck.result }}" != "success" \\
             || "\${{ needs.performance.result }}" != "success"${extraCond} ]]; then
            exit 1
          fi
`;

  it('extracts all four gate lists', () => {
    const lists = parseGateLists(ciPass());
    expect(lists.needs).toEqual(['typecheck', 'performance']);
    expect(lists.add).toEqual(['typecheck', 'performance']);
    expect(lists.echo).toEqual(['typecheck', 'performance']);
    expect(lists.condition).toEqual(['typecheck', 'performance']);
  });

  it('reports no drift when the four agree', () => {
    expect(gateWiringDrift(parseGateLists(ciPass()))).toEqual([]);
  });

  // THE failure mode. A job wired only into `needs:` runs and can go red while
  // `CI pass` still reports success, because only the if-condition exits 1.
  it('catches a job wired into needs but missing from the if-condition', () => {
    const yml = ciPass(
      '\n      - safety-privacy',
      '\n          add "Safety + privacy gates" "${{ needs.safety-privacy.result }}"',
      '\n          echo "safety-privacy: ${{ needs.safety-privacy.result }}"'
      // deliberately no condition entry
    );
    expect(gateWiringDrift(parseGateLists(yml))).toEqual([
      { gate: 'safety-privacy', missingFrom: ['condition'] },
    ]);
  });

  it('catches a gate that is enforced but invisible in the run log', () => {
    const yml = ciPass(
      '\n      - safety-privacy',
      '',
      '',
      ' \\\n             || "${{ needs.safety-privacy.result }}" != "success"'
    );
    expect(gateWiringDrift(parseGateLists(yml))).toEqual([
      { gate: 'safety-privacy', missingFrom: ['add', 'echo'] },
    ]);
  });

  it('does not confuse the Collect-step echo with an Aggregate-step echo', () => {
    // `echo "failed=$FAILED"` in the Collect step carries no needs ref and must
    // not be scanned; echo extraction is scoped to the Aggregate step.
    expect(parseGateLists(ciPass()).echo).not.toContain('failed');
  });
});

describe('the real ci.yml', () => {
  const fs = require('fs');
  const path = require('path');
  const ciYml = fs.readFileSync(
    path.resolve(__dirname, '../../../.github/workflows/ci.yml'),
    'utf8'
  );

  it('wires every ci-pass gate into all four lists', () => {
    expect(gateWiringDrift(parseGateLists(ciYml))).toEqual([]);
  });

  it('gates the safety + privacy suites', () => {
    expect(parseGateLists(ciYml).condition).toContain('safety-privacy');
  });
});
