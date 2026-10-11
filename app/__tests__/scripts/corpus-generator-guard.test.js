/**
 * Tests for the destination guard in scripts/generate-crisis-corpus.js
 * (MAINT-743 / TEST-62).
 *
 * Only the pure guards are imported. main() sits behind `require.main`, so nothing
 * here can reach the network or the API. As belt and braces, beforeEach unsets
 * ANTHROPIC_API_KEY and replaces global.fetch with a function that throws.
 *
 * Everything below passes PATHS only. No file or symlink is ever created inside the
 * repository or its bare working tree; symlinks live in an fs.mkdtempSync sandbox.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const childProcess = require('child_process');
const { assertOutsideRepo, parseArgs } = require('../../../scripts/generate-crisis-corpus');

const WORKTREE_ROOT = fs.realpathSync.native(path.resolve(__dirname, '..', '..', '..'));
// The guard boundary is the bare working tree that holds peer worktrees, derived the
// same way the guard derives it.
const BOUNDARY = fs.realpathSync.native(
  path.dirname(
    execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd: __dirname,
      encoding: 'utf8',
    }).trim()
  )
);

class ExitCalled extends Error {
  constructor(code) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

const exitCode = (fn) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof ExitCalled) return e.code;
    throw e;
  }
  return null; // the guard returned normally: the destination was accepted
};

describe('assertOutsideRepo', () => {
  let tmp;
  const realFetch = global.fetch;
  const realKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    global.fetch = () => {
      throw new Error('network access attempted from a unit test');
    };
    jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new ExitCalled(code);
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'corpus-guard-'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = realFetch;
    if (realKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = realKey;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  describe('refuses (exit 2)', () => {
    it('a path inside the worktree', () => {
      expect(exitCode(() => assertOutsideRepo(path.join(WORKTREE_ROOT, 'placeholder.json')))).toBe(2);
    });

    it('a nested path inside the worktree whose directories do not exist', () => {
      expect(exitCode(() => assertOutsideRepo(path.join(WORKTREE_ROOT, 'no', 'such', 'dir', 'placeholder.json')))).toBe(2);
    });

    it('the repository root itself', () => {
      expect(exitCode(() => assertOutsideRepo(WORKTREE_ROOT))).toBe(2);
    });

    it('the repository root with a trailing slash', () => {
      expect(exitCode(() => assertOutsideRepo(WORKTREE_ROOT + path.sep))).toBe(2);
    });

    it('a path that leaves via .. and comes back into the repo', () => {
      const viaDotDot = path.join(tmp, '..', '..', '..', '..', '..', '..', WORKTREE_ROOT, 'placeholder.json');
      expect(path.resolve(viaDotDot).startsWith(WORKTREE_ROOT)).toBe(true);
      expect(exitCode(() => assertOutsideRepo(viaDotDot))).toBe(2);
    });

    it('a dot-dot-prefixed file name directly under the repo root', () => {
      // path.relative gives "..placeholder.json": a prefix test for ".." misreads it as escaping.
      expect(exitCode(() => assertOutsideRepo(path.join(WORKTREE_ROOT, '..placeholder.json')))).toBe(2);
    });

    const caseInsensitive = fs.existsSync(WORKTREE_ROOT.toUpperCase()) && WORKTREE_ROOT !== WORKTREE_ROOT.toUpperCase();
    (caseInsensitive ? it : it.skip)('a case-variant spelling of the repo path (case-insensitive filesystem)', () => {
      const variant = path.join(WORKTREE_ROOT.toUpperCase(), 'placeholder.json');
      expect(exitCode(() => assertOutsideRepo(variant))).toBe(2);
    });

    it('a destination reached through a symlink that points at the repo root', () => {
      const link = path.join(tmp, 'link');
      fs.symlinkSync(WORKTREE_ROOT, link);
      expect(exitCode(() => assertOutsideRepo(path.join(link, 'placeholder.json')))).toBe(2);
    });

    it('a destination that is itself a dangling symlink into the repo', () => {
      const link = path.join(tmp, 'dangling');
      fs.symlinkSync(path.join(WORKTREE_ROOT, 'does-not-exist-placeholder.json'), link);
      expect(exitCode(() => assertOutsideRepo(link))).toBe(2);
    });

    it('a path in the bare working tree that holds peer worktrees', () => {
      expect(exitCode(() => assertOutsideRepo(path.join(BOUNDARY, 'placeholder.json')))).toBe(2);
    });

    it('a path in a not-yet-existing peer worktree directory of the bare tree', () => {
      expect(exitCode(() => assertOutsideRepo(path.join(BOUNDARY, 'peer-worktree-placeholder', 'placeholder.json')))).toBe(2);
    });
  });

  describe('fails closed (exit 2) on a guard error', () => {
    it('when the git lookup fails', () => {
      jest.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
        throw new Error('git unavailable');
      });
      expect(exitCode(() => assertOutsideRepo(path.join(tmp, 'placeholder.json')))).toBe(2);
    });

    it('when realpath fails with something other than ENOENT', () => {
      jest.spyOn(fs.realpathSync, 'native').mockImplementation(() => {
        throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
      });
      expect(exitCode(() => assertOutsideRepo(path.join(tmp, 'placeholder.json')))).toBe(2);
    });
  });

  describe('accepts', () => {
    it('a file in a sibling temp directory', () => {
      expect(exitCode(() => assertOutsideRepo(path.join(tmp, 'placeholder.json')))).toBeNull();
    });

    it('a not-yet-existing nested path under a temp directory', () => {
      expect(exitCode(() => assertOutsideRepo(path.join(tmp, 'a', 'b', 'placeholder.json')))).toBeNull();
    });

    it('a symlink in the temp directory that points elsewhere in the temp directory', () => {
      const real = path.join(tmp, 'real');
      fs.mkdirSync(real);
      const link = path.join(tmp, 'link');
      fs.symlinkSync(real, link);
      expect(exitCode(() => assertOutsideRepo(path.join(link, 'placeholder.json')))).toBeNull();
    });

    it('an absolute path outside the repository', () => {
      expect(exitCode(() => assertOutsideRepo(path.join(path.parse(os.tmpdir()).root, 'placeholder-outside.json')))).toBeNull();
    });

    it('a name-prefix sibling of the boundary that is not inside it', () => {
      expect(exitCode(() => assertOutsideRepo(`${BOUNDARY}-sibling-placeholder.json`))).toBeNull();
    });
  });
});

describe('parseArgs', () => {
  it('defaults the count to 30', () => {
    expect(parseArgs([])).toEqual({ count: 30 });
  });

  it('reads --class, --count and --out', () => {
    expect(parseArgs(['--class', 'MUST_NOT_FIRE', '--count', '5', '--out', 'x.json'])).toEqual({
      count: 5,
      cls: 'MUST_NOT_FIRE',
      out: 'x.json',
    });
  });

  it('prints usage and exits 1 on an unrecognised argument', () => {
    jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new ExitCalled(code);
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(exitCode(() => parseArgs(['--bogus']))).toBe(1);
    jest.restoreAllMocks();
  });

  it('prints usage and exits 0 on --help', () => {
    jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new ExitCalled(code);
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(exitCode(() => parseArgs(['--help']))).toBe(0);
    jest.restoreAllMocks();
  });
});
