/**
 * .gitignore secret-pattern pin (MAINT-742, replaces scripts/validate-gitignore-security.sh).
 *
 * Asks git itself, via `git check-ignore --no-index -q` from the repo root, whether
 * representative secret filenames are ignored. `--no-index` makes the answer a pure
 * function of the ignore rules, independent of what happens to be tracked.
 *
 * Exit status contract of `git check-ignore -q`: 0 = ignored, 1 = NOT ignored,
 * anything else (128 etc.) = git could not answer. Only 0 and 1 are verdicts; any
 * other status FAILS the test rather than being read as "not ignored".
 *
 * `.env.production` is deliberately in the MUST-be-ignored list (SEC-04): production
 * secrets belong in EAS secrets / runtime config, not in git.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const MUST_BE_IGNORED = [
  '.env',
  '.env.local',
  '.env.production',
  'credentials.json',
  'secrets.yaml',
  'test.secret',
  'server.pem',
  'signing.key',
  'id_rsa',
  'id_ed25519',
  'cert.pfx',
  'service-account.json',
  'my-credentials.json',
  'app-service-key.json',
];

const MUST_NOT_BE_IGNORED = [
  '.env.example',
  'credentials.example.json',
  'secrets.example.yaml',
];

function checkIgnore(file) {
  const r = spawnSync('git', ['check-ignore', '--no-index', '-q', file], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  if (r.error) throw r.error;
  return r.status;
}

describe('.gitignore secret patterns', () => {
  it.each(MUST_BE_IGNORED)('%s is ignored', (file) => {
    const status = checkIgnore(file);
    if (status !== 0 && status !== 1) {
      throw new Error(`git check-ignore could not answer for ${file} (status ${status})`);
    }
    expect(status).toBe(0);
  });

  it.each(MUST_NOT_BE_IGNORED)('%s is NOT ignored (allowed exception)', (file) => {
    const status = checkIgnore(file);
    if (status !== 0 && status !== 1) {
      throw new Error(`git check-ignore could not answer for ${file} (status ${status})`);
    }
    expect(status).toBe(1);
  });
});
