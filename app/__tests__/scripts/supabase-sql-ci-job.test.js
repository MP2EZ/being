/**
 * INFRA-782 — structural pins for ci.yml's `Supabase SQL suites` job.
 *
 * WHY THESE ARE SOURCE-SHAPE ASSERTIONS. The job runs a Docker-backed Supabase
 * stack on a GitHub runner; nothing here can execute it. What CAN regress on the
 * PR that breaks it is the YAML, and two regressions matter:
 *
 *   1. REACH. The job must only ever touch the local stack it starts. One added
 *      `supabase link`, `--project-ref` or `secrets.` turns a throwaway fixture
 *      database into the shared prod project (one project serves every env).
 *   2. VERDICT. The job is strict (INFRA-829): no step and not the job carries
 *      continue-on-error, so a red suite fails `CI pass`. It shipped non-strict
 *      until development's push run 40085496464 logged `27/27 suites passed,
 *      0 SKIP`. Losing the SKIP check, a vault check or the glob makes the
 *      `N/N suites passed, 0 SKIP` line — and the green check — claim more
 *      than was run.
 *
 * Per DEBUG-390, comments are stripped before matching (the job's prose names
 * what it forbids) and every matcher is paired with a control proving it can
 * still go red.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CI_YML = path.join(REPO_ROOT, '.github/workflows/ci.yml');

const LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const FORBIDDEN = [
  'secrets.',
  'vars.',
  'supabase link',
  '--project-ref',
  'db push',
  'functions deploy',
  'migration repair',
  'supabase secrets',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'pull_request_target',
  'yliycxslzdsgjtpxggtf',
  'supabase.co',
  'pooler.supabase',
];

const read = (p) => fs.readFileSync(p, 'utf8');

/** YAML comment lines removed; the job's prose deliberately names forbidden tokens. */
const stripComments = (src) => src.replace(/^\s*#.*$/gm, '');

/** The `supabase-sql:` job, from its key to the next top-level entry under `jobs:`. */
function jobBlock(source) {
  const start = source.indexOf('\n  supabase-sql:\n');
  expect(start).toBeGreaterThan(-1);
  const rest = source.slice(start + 1);
  const next = rest.slice(1).search(/^ {2}\S/m);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

/** One step of the job, by its `name:`, up to the next step. */
function step(job, name) {
  const start = job.indexOf(`- name: ${name}\n`);
  expect(start).toBeGreaterThan(-1);
  const next = job.indexOf('\n      - ', start + 1);
  return next === -1 ? job.slice(start) : job.slice(start, next);
}

const forbiddenHits = (code) => FORBIDDEN.filter((token) => code.includes(token));

/** psql invocations whose target is anything but the job's local DB_URL. */
const nonLocalPsql = (code) =>
  code
    .split('\n')
    .filter((line) => /\bpsql\b/.test(line) && !/psql --version/.test(line))
    .filter((line) => !line.includes('psql "$DB_URL"'));

/** Every postgres URL in the code that is not the local stack's. */
const foreignDbUrls = (code) =>
  [...code.matchAll(/postgres(?:ql)?:\/\/\S+/g)].map((m) => m[0]).filter((u) => u !== LOCAL_DB_URL);

/** Script files the job would execute — the rail can only see inline commands. */
/** Both vault checks present, one before the suite loop and one after it. */
function vaultChecksBracketLoop(suites) {
  const before = suites.indexOf('before=$(vault_count)');
  const loop = suites.indexOf('for f in "${suites[@]}"');
  const after = suites.indexOf('after=$(vault_count)');
  return suites.includes('SELECT count(*) FROM vault.secrets') && before > -1 && loop > before && after > loop;
}

const FULL_GLOB = "printf '%s\\n' supabase/tests/*.sql | LC_ALL=C sort";
/** Any continue-on-error key, at step or job level, whatever its value. */
const ANY_FLAG = /\bcontinue-on-error\s*:/;

const invokedScripts = (code) => [...code.matchAll(/[\w./-]+\.(?:sh|js|mjs|cjs|py|ts)\b/g)].map((m) => m[0]);

describe('INFRA-782 — Supabase SQL suites job', () => {
  const source = read(CI_YML);
  const job = jobBlock(source);
  const code = stripComments(job);

  it('slices the real job (anchors to its name and its last step)', () => {
    expect(job).toContain('name: Supabase SQL suites');
    expect(job).toContain('- name: Run SQL suites');
    expect(job).not.toContain('\n  ci-pass:');
  });

  describe('reach: local stack only', () => {
    it('contains none of the forbidden tokens', () => {
      expect(forbiddenHits(code)).toEqual([]);
    });

    it.each(FORBIDDEN)('CONTROL: a job containing %p is caught', (token) => {
      expect(forbiddenHits(`${code}\n          run: echo ${token}`)).toEqual([token]);
    });

    it('the workflow has no pull_request_target trigger anywhere', () => {
      expect(stripComments(source)).not.toContain('pull_request_target');
    });

    it('every psql invocation targets $DB_URL', () => {
      expect(code).toMatch(/\bpsql "\$DB_URL"/);
      expect(nonLocalPsql(code)).toEqual([]);
    });

    it('CONTROL: a psql against another host is caught', () => {
      const bad = `${code}\n            psql "postgresql://postgres@db.example.com/postgres" -f a.sql`;
      expect(nonLocalPsql(bad)).toHaveLength(1);
    });

    it('DB_URL is the local stack and no other database URL appears', () => {
      expect(code).toContain(`DB_URL: ${LOCAL_DB_URL}\n`);
      expect(foreignDbUrls(code)).toEqual([]);
    });

    it('CONTROL: a second database URL is caught', () => {
      const bad = `${code}\n      OTHER: postgresql://postgres:pw@db.example.com:5432/postgres`;
      expect(foreignDbUrls(bad)).toEqual(['postgresql://postgres:pw@db.example.com:5432/postgres']);
    });

    it('runs inline commands only — no script file the rail cannot see', () => {
      expect(invokedScripts(code)).toEqual([]);
    });

    it('CONTROL: an invoked script file is caught', () => {
      expect(invokedScripts(`${code}\n        run: bash scripts/run-sql.sh`)).toEqual(['scripts/run-sql.sh']);
    });

    it('job permissions are exactly contents: read', () => {
      expect(code).toMatch(/\n {4}permissions:\n {6}contents: read\n {4}env:\n/);
    });

    it('CONTROL: a widened permissions block fails the match', () => {
      const widened = code.replace('      contents: read\n    env:', '      contents: read\n      issues: write\n    env:');
      expect(widened).not.toBe(code);
      expect(widened).not.toMatch(/\n {4}permissions:\n {6}contents: read\n {4}env:\n/);
    });

    it('the Supabase CLI is pinned to an exact version', () => {
      expect(code).toMatch(/uses: supabase\/setup-cli@v\d+\n[\s\S]*?version: \d+\.\d+\.\d+\n/);
    });
  });

  describe('verdict: what the log line claims', () => {
    const suites = stripComments(step(job, 'Run SQL suites'));

    it('is strict: no continue-on-error on any step or on the job', () => {
      expect(code).not.toMatch(ANY_FLAG);
    });

    it('CONTROL: a step-level flag re-added to the suite step is caught', () => {
      const lax = code.replace('- name: Run SQL suites\n', '- name: Run SQL suites\n        continue-on-error: true\n');
      expect(lax).not.toBe(code);
      expect(lax).toMatch(ANY_FLAG);
    });

    it('CONTROL: a job-level flag is caught', () => {
      const lax = code.replace('    timeout-minutes: 25\n', '    timeout-minutes: 25\n    continue-on-error: true\n');
      expect(lax).not.toBe(code);
      expect(lax).toMatch(ANY_FLAG);
    });

    it('runs every supabase/tests/*.sql suite in C-locale order', () => {
      expect(suites).toContain(FULL_GLOB);
    });

    it('CONTROL: a narrowed glob fails the match', () => {
      const narrowed = suites.replace('supabase/tests/*.sql', 'supabase/tests/infra260_*.sql');
      expect(narrowed).not.toBe(suites);
      expect(narrowed).not.toContain(FULL_GLOB);
    });

    it('stops each suite on its first error', () => {
      expect(suites).toContain('psql "$DB_URL" -v ON_ERROR_STOP=1 -X -f "$f"');
    });

    it('treats a SKIP line as a failure', () => {
      expect(suites).toContain("grep -qE '\\bSKIP\\b'");
      expect(suites).toContain('suites passed, ${#skipped[@]} SKIP');
    });

    it('CONTROL: the SKIP pattern matches a skip notice and not a passing one', () => {
      const re = /\bSKIP\b/;
      expect(re.test('NOTICE:  DEBUG-446 Test 2 SKIP: public.users is empty')).toBe(true);
      expect(re.test('NOTICE:  DEBUG-446 Test 2 PASS: success event landed')).toBe(false);
    });

    it('checks vault.secrets is empty both before the first suite and after the last', () => {
      expect(vaultChecksBracketLoop(suites)).toBe(true);
    });

    it('CONTROL: a step with only the pre-suite vault check is caught', () => {
      const onlyBefore = suites.replace('after=$(vault_count)', 'after=0');
      expect(onlyBefore).not.toBe(suites);
      expect(vaultChecksBracketLoop(onlyBefore)).toBe(false);
    });

    it('the summary line is the step\'s verdict, printed after the vault post-check', () => {
      const summary = suites.indexOf('echo "${passed}/${total} suites passed');
      expect(summary).toBeGreaterThan(suites.indexOf('after=$(vault_count)'));
      expect(suites).toMatch(/\[ "\$passed" -eq "\$total" \]\s*$/);
    });
  });
});
