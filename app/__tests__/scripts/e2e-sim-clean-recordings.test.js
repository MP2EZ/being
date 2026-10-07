/**
 * INFRA-718 — `e2e-sim-clean.sh --xctest-recordings`: the XCTest screen recordings the gate's
 * own per-run sweep (INFRA-692) cannot reach — ad-hoc maestro runs, other simulators, the
 * backlog.
 *
 * Spawns the REAL script, copied into a sandbox with the helpers it sources, against a
 * synthetic devices root. `xcrun`, `plutil` and `lsof` are PATH stubs, HOME is an empty
 * sandbox and E2E_LOCK_ROOT is private, so this runs on the ubuntu CI runner and can never
 * touch a real simulator or a real gate lease.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPTS = path.resolve(__dirname, '../../scripts');
const COPIED = ['e2e-sim-clean.sh', 'e2e-sim-attachments.sh', 'e2e-sim-lock.sh', 'e2e-telemetry.sh'];

const A = 'AAAA1111-2222-3333-4444-555566667777';
const B = 'BBBB1111-2222-3333-4444-555566667777';
const C = 'CCCC1111-2222-3333-4444-555566667777';

let root;
let selfApp;
let stubs;
let home;
let lockRoot;
let trace;

const ls = (dir) => fs.readdirSync(dir).sort();
const dataPath = (udid) => path.join(root, 'Devices', udid, 'data');

/** A container under a simulator's data path. `identifier: null` writes no metadata file. */
function container(udid, name, identifier = 'com.apple.testmanagerd') {
  const dir = path.join(dataPath(udid), 'Containers', 'Data', 'InternalDaemon', name);
  fs.mkdirSync(path.join(dir, 'Attachments'), { recursive: true });
  if (identifier !== null) {
    fs.writeFileSync(path.join(dir, '.com.apple.mobile_container_manager.metadata.plist'), identifier);
  }
  return path.join(dir, 'Attachments');
}

function movie(dir, name, bytes = 2048) {
  const f = path.join(dir, name);
  fs.writeFileSync(f, Buffer.alloc(bytes, 1));
  return f;
}

/** `simctl list devices -j` across runtimes and states. `dataPath` may be overridden. */
function devices(list) {
  const json = { devices: {} };
  for (const d of list) {
    const rt = d.runtime || 'com.apple.CoreSimulator.SimRuntime.iOS-18-6';
    (json.devices[rt] = json.devices[rt] || []).push({
      udid: d.udid,
      state: d.state || 'Shutdown',
      name: d.name || `Sim ${d.udid.slice(0, 4)}`,
      dataPath: d.dataPath || dataPath(d.udid),
    });
  }
  fs.writeFileSync(path.join(root, 'devices.json'), JSON.stringify(json));
}

function writeStubs() {
  fs.writeFileSync(
    path.join(stubs, 'xcrun'),
    `#!/bin/bash\necho "xcrun $*" >> "${trace}"\n` +
      `[ "\${XCRUN_FAIL:-}" = "1" ] && exit 1\n` +
      `case "$*" in "simctl list devices -j") cat "${path.join(root, 'devices.json')}" ;; esac\n`,
    { mode: 0o755 },
  );
  // The fixture metadata file holds the identifier as plain text; the stub prints it.
  fs.writeFileSync(path.join(stubs, 'plutil'), '#!/bin/bash\nfor last; do :; done\ncat "$last"\n', {
    mode: 0o755,
  });
  // `lsof -w -Fn +d DIR`. LSOF_MODE=error fails loudly; otherwise the paths listed in
  // $LSOF_OPEN that sit directly in DIR are reported open (exit 0), else exit 1 silently —
  // the real tool's contract for "nothing open".
  fs.writeFileSync(
    path.join(stubs, 'lsof'),
    [
      '#!/bin/bash',
      'echo "lsof $*" >> "' + trace + '"',
      'if [ "${LSOF_MODE:-}" = "error" ]; then echo "lsof: cannot open /dev/kmem" >&2; exit 1; fi',
      'for last; do :; done',
      'hit=0',
      'if [ -n "${LSOF_OPEN:-}" ] && [ -f "$LSOF_OPEN" ]; then',
      '  while IFS= read -r p; do',
      '    [ -n "$p" ] || continue',
      '    [ "$(dirname "$p")" = "$last" ] || continue',
      '    printf "p4242\\nfcwd\\nn%s\\n" "$p"; hit=1',
      '  done < "$LSOF_OPEN"',
      'fi',
      '[ "$hit" = "1" ] || exit 1',
    ].join('\n') + '\n',
    { mode: 0o755 },
  );
}

/**
 * A PATH holding only what the script needs — and no `lsof` — for the fail-closed case.
 * Symlinks to the real tools, so nothing here is re-implemented.
 */
function pathWithoutLsof() {
  const bin = path.join(root, 'nolsof');
  fs.mkdirSync(bin, { recursive: true });
  const tools = ['bash', 'find', 'sort', 'awk', 'sed', 'grep', 'cut', 'wc', 'tr', 'mktemp', 'dirname',
    'cat', 'ps', 'date', 'mkdir', 'rm', 'rmdir', 'basename', 'comm', 'du', 'head', 'env', 'sleep', 'ls'];
  for (const t of tools) {
    const r = spawnSync('/bin/sh', ['-c', `command -v ${t}`], { encoding: 'utf8' }).stdout.trim();
    if (r) fs.symlinkSync(r, path.join(bin, t));
  }
  fs.symlinkSync(process.execPath, path.join(bin, 'node'));
  for (const s of ['xcrun', 'plutil']) fs.symlinkSync(path.join(stubs, s), path.join(bin, s));
  return bin;
}

function run(args = [], env = {}) {
  const res = spawnSync('/bin/bash', [path.join(selfApp, 'scripts', 'e2e-sim-clean.sh'), ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${stubs}:${process.env.PATH}`,
      HOME: home,
      CP_CACHE_DIR: '',
      TMPDIR: root,
      E2E_LOCK_ROOT: lockRoot,
      E2E_TELEMETRY: '0',
      E2E_LOCK_FORCE: '',
      E2E_LOCK_INHERITED: '',
      ...env,
    },
  });
  return { status: res.status, out: `${res.stdout || ''}${res.stderr || ''}` };
}

const traceLines = () => (fs.existsSync(trace) ? fs.readFileSync(trace, 'utf8').split('\n').filter(Boolean) : []);

/** The real lstart of a live pid, as the lock records it. */
function startOf(pid) {
  const row = spawnSync('/bin/sh', ['-c', `ps -axo pid=,lstart=,comm= | awk '$1 == ${pid}'`], {
    encoding: 'utf8',
  }).stdout.trim();
  return row.split(/\s+/).slice(1, 6).join(' ');
}

function plantLease(udid, { pid, start, label = 'safety flows' }) {
  const dir = path.join(lockRoot, `sim-${udid}.d`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'owner'), `${pid}\t${start}\tjest\t${label}\t1791000000\n`);
  return dir;
}

/** A pid that has certainly exited. */
function deadPid() {
  return Number(spawnSync('/bin/sh', ['-c', 'echo $$'], { encoding: 'utf8' }).stdout.trim());
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra718-'));
  selfApp = path.join(root, 'wt', 'self', 'app');
  stubs = path.join(root, 'stubs');
  home = path.join(root, 'home');
  lockRoot = path.join(root, 'locks');
  trace = path.join(root, 'trace.log');
  for (const d of [path.join(selfApp, 'scripts'), stubs, home]) fs.mkdirSync(d, { recursive: true });
  for (const f of COPIED) fs.copyFileSync(path.join(SCRIPTS, f), path.join(selfApp, 'scripts', f));
  writeStubs();
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('INFRA-718 e2e-sim-clean.sh --xctest-recordings', () => {
  it('reports by default — count and MB per simulator, Shutdown ones included — and deletes nothing', () => {
    devices([{ udid: A, state: 'Booted' }, { udid: B, state: 'Shutdown' }]);
    const a = container(A, 'TM-1');
    const b = container(B, 'TM-2');
    movie(a, 'UUID-A1', 1048576);
    movie(a, 'UUID-A2', 1048576);
    movie(b, 'UUID-B1', 524288);

    const r = run(['--xctest-recordings']);
    expect(r.status).toBe(0);
    expect(ls(a)).toEqual(['UUID-A1', 'UUID-A2']);
    expect(ls(b)).toEqual(['UUID-B1']);
    expect(r.out).toMatch(new RegExp(`${A}, Booted\\)\\s+2 recording\\(s\\), 2\\.0 MB`));
    expect(r.out).toMatch(new RegExp(`${B}, Shutdown\\)\\s+1 recording\\(s\\), 0\\.5 MB`));
    expect(r.out).toMatch(/2 simulator\(s\), 0 skipped \(lease held\); 3 recording\(s\), 2\.5 MB found/);
    expect(r.out).toContain('Nothing deleted. Re-run to reclaim:');
    expect(r.out).toContain('npm run e2e:safety:clean:recordings -- --yes');
  });

  it('--yes reaps every testmanagerd Attachments directory across simulators', () => {
    devices([{ udid: A, state: 'Booted' }, { udid: B }]);
    const a = container(A, 'TM-1');
    const b = container(B, 'TM-2');
    movie(a, 'UUID-A1');
    movie(b, 'UUID-B1');
    const r = run(['--xctest-recordings', '--yes']);
    expect(r.status).toBe(0);
    expect(ls(a)).toEqual([]);
    expect(ls(b)).toEqual([]);
    expect(r.out).toMatch(/removed 2, /);
    expect(r.out).not.toContain('Nothing deleted');
  });

  it('touches only regular files at depth 1 of the testmanagerd container', () => {
    devices([{ udid: A }]);
    const tm = container(A, 'TM-1');
    const decoy = container(A, 'DECOY', 'com.apple.somethingelse');
    const bare = container(A, 'BARE', null);
    movie(tm, 'UUID-1');
    movie(decoy, 'KEEP-D');
    movie(bare, 'KEEP-B');
    fs.mkdirSync(path.join(tm, 'subdir'));
    movie(path.join(tm, 'subdir'), 'NESTED');
    const target = movie(root, 'outside-target');
    fs.symlinkSync(target, path.join(tm, 'LINK'));

    run(['--xctest-recordings', '--yes']);
    expect(ls(tm)).toEqual(['LINK', 'subdir']);
    expect(ls(path.join(tm, 'subdir'))).toEqual(['NESTED']);
    expect(ls(decoy)).toEqual(['KEEP-D']);
    expect(ls(bare)).toEqual(['KEEP-B']);
    expect(fs.existsSync(target)).toBe(true);
  });

  it('keeps a file a process still has open, and says so', () => {
    devices([{ udid: A }]);
    const a = container(A, 'TM-1');
    const open = movie(a, 'UUID-OPEN');
    movie(a, 'UUID-CLOSED');
    const openList = path.join(root, 'open.txt');
    fs.writeFileSync(openList, `${open}\n`);

    const r = run(['--xctest-recordings', '--yes'], { LSOF_OPEN: openList });
    expect(ls(a)).toEqual(['UUID-OPEN']);
    expect(r.out).toMatch(/1 open — kept/);
    expect(traceLines().some((l) => l === `lsof -w -Fn +d ${a}`)).toBe(true);
  });

  it('fails closed when lsof errors: nothing in that directory is deleted', () => {
    devices([{ udid: A }]);
    const a = container(A, 'TM-1');
    movie(a, 'UUID-1');
    const r = run(['--xctest-recordings', '--yes'], { LSOF_MODE: 'error' });
    expect(r.status).toBe(0);
    expect(ls(a)).toEqual(['UUID-1']);
    expect(r.out).toMatch(/lsof could not check — kept/);
    expect(r.out).toMatch(/removed 0, /);
  });

  it('fails closed when lsof is not installed at all', () => {
    devices([{ udid: A }]);
    const a = container(A, 'TM-1');
    movie(a, 'UUID-1');
    const r = run(['--xctest-recordings', '--yes'], { PATH: pathWithoutLsof() });
    expect(r.status).toBe(0);
    expect(ls(a)).toEqual(['UUID-1']);
    expect(r.out).toMatch(/lsof is missing or failed/);
  });

  describe('the INFRA-436 lease', () => {
    it('skips a simulator whose lease is LIVE while the others are reaped — in both modes', () => {
      devices([{ udid: A, state: 'Booted' }, { udid: B }]);
      const a = container(A, 'TM-1');
      const b = container(B, 'TM-2');
      movie(a, 'UUID-A');
      movie(b, 'UUID-B');
      const lease = plantLease(A, { pid: process.pid, start: startOf(process.pid) });

      const report = run(['--xctest-recordings']);
      expect(report.out).toMatch(new RegExp(`${A}, Booted\\)\\s+\\[leased by pid ${process.pid} \\(safety flows\\) — skipped\\]`));
      expect(report.out).toMatch(/1 skipped \(lease held\); 1 recording\(s\)/);

      const reap = run(['--xctest-recordings', '--yes']);
      expect(reap.status).toBe(0);
      expect(ls(a)).toEqual(['UUID-A']);
      expect(ls(b)).toEqual([]);
      expect(fs.readFileSync(path.join(lease, 'owner'), 'utf8')).toContain(`${process.pid}\t`);
    });

    it('a DEAD or RECYCLED record does not block the sweep', () => {
      devices([{ udid: A }, { udid: B }]);
      const a = container(A, 'TM-1');
      const b = container(B, 'TM-2');
      movie(a, 'UUID-A');
      movie(b, 'UUID-B');
      plantLease(A, { pid: deadPid(), start: 'Fri Aug 14 13:47:35 2026' });
      plantLease(B, { pid: process.pid, start: 'Mon Jan  1 00:00:00 2001' });

      const r = run(['--xctest-recordings', '--yes']);
      expect(r.out).toMatch(/0 skipped \(lease held\)/);
      expect(ls(a)).toEqual([]);
      expect(ls(b)).toEqual([]);
    });

    it('honours a LIVE lease even with E2E_LOCK_FORCE=1 inherited, and leaves its record intact', () => {
      devices([{ udid: A }]);
      const a = container(A, 'TM-1');
      movie(a, 'UUID-A');
      const start = startOf(process.pid);
      const lease = plantLease(A, { pid: process.pid, start });
      const before = fs.readFileSync(path.join(lease, 'owner'), 'utf8');

      run(['--xctest-recordings', '--yes'], {
        E2E_LOCK_FORCE: '1',
        E2E_LOCK_INHERITED: `sim:${A}:${process.pid}`,
      });
      expect(ls(a)).toEqual(['UUID-A']);
      expect(fs.readFileSync(path.join(lease, 'owner'), 'utf8')).toBe(before);
    });

    it('releases its own lease after each simulator', () => {
      devices([{ udid: A }, { udid: B }]);
      movie(container(A, 'TM-1'), 'UUID-A');
      movie(container(B, 'TM-2'), 'UUID-B');
      run(['--xctest-recordings', '--yes']);
      const left = fs.existsSync(lockRoot) ? fs.readdirSync(lockRoot) : [];
      expect(left).toEqual([]);
    });

    it('report mode takes no lease at all', () => {
      devices([{ udid: A }]);
      movie(container(A, 'TM-1'), 'UUID-A');
      run(['--xctest-recordings']);
      expect(fs.existsSync(lockRoot) ? fs.readdirSync(lockRoot) : []).toEqual([]);
    });
  });

  it('ignores a device whose dataPath does not end in its own UDID', () => {
    devices([{ udid: A, dataPath: dataPath(C) }, { udid: B }]);
    const c = container(C, 'TM-C');
    movie(c, 'UUID-C');
    movie(container(B, 'TM-B'), 'UUID-B');
    const r = run(['--xctest-recordings', '--yes']);
    expect(ls(c)).toEqual(['UUID-C']);
    expect(r.out).not.toContain(A);
    expect(r.out).toMatch(/1 simulator\(s\)/);
  });

  it('says so out loud when no simulator resolves', () => {
    devices([{ udid: A }]);
    movie(container(A, 'TM-1'), 'UUID-A');
    const r = run(['--xctest-recordings', '--yes'], { XCRUN_FAIL: '1' });
    expect(r.status).toBe(0);
    expect(r.out).toContain('no simulators resolved');
    expect(ls(container(A, 'TM-1'))).toEqual(['UUID-A']);
  });

  it('prints the zero total on a clean machine', () => {
    devices([{ udid: A }]);
    container(A, 'TM-1');
    const r = run(['--xctest-recordings']);
    expect(r.out).toMatch(/1 simulator\(s\), 0 skipped \(lease held\); 0 recording\(s\), 0\.0 MB found/);
    expect(r.out).not.toContain('Nothing deleted');
  });

  it('makes no mutating simctl call, and builds no path from $HOME', () => {
    devices([{ udid: A }]);
    movie(container(A, 'TM-1'), 'UUID-A');
    // A decoy where a $HOME-built path would point. The sandbox HOME is otherwise empty.
    const decoy = path.join(home, 'Library/Developer/CoreSimulator/Devices', A, 'data');
    const decoyAtt = path.join(decoy, 'Containers/Data/InternalDaemon/TM-H/Attachments');
    fs.mkdirSync(decoyAtt, { recursive: true });
    fs.writeFileSync(path.join(decoyAtt, '../.com.apple.mobile_container_manager.metadata.plist'), 'com.apple.testmanagerd');
    movie(decoyAtt, 'HOME-UUID');

    run(['--xctest-recordings', '--yes']);
    expect(traceLines().filter((l) => l.startsWith('xcrun'))).toEqual(['xcrun simctl list devices -j']);
    expect(ls(decoyAtt)).toEqual(['HOME-UUID']);
  });

  it('survives a container it cannot read under set -euo pipefail', () => {
    devices([{ udid: A }, { udid: B }]);
    const a = container(A, 'TM-1');
    movie(a, 'UUID-A');
    fs.chmodSync(a, 0o000);
    movie(container(B, 'TM-2'), 'UUID-B');
    try {
      const r = run(['--xctest-recordings', '--yes']);
      expect(r.status).toBe(0);
      expect(r.out).toMatch(/2 simulator\(s\)/);
      expect(ls(container(B, 'TM-2'))).toEqual([]);
    } finally {
      fs.chmodSync(a, 0o755);
    }
  });

  it('refuses to combine with another mode, so it can never ride along on --orphans --yes', () => {
    devices([{ udid: A }]);
    const a = container(A, 'TM-1');
    movie(a, 'UUID-A');
    for (const args of [['--xctest-recordings', '--orphans', '--yes'], ['--orphans', '--xctest-recordings', '--yes'], ['--pods-under', root, '--xctest-recordings']]) {
      const r = run(args);
      expect(r.status).toBe(2);
      expect(r.out).toMatch(/cannot be combined/);
    }
    expect(ls(a)).toEqual(['UUID-A']);
  });

  it('leaves the existing modes alone: none of them looks at simulators', () => {
    devices([{ udid: A }]);
    const a = container(A, 'TM-1');
    movie(a, 'UUID-A');
    for (const args of [[], ['--yes'], ['--orphans'], ['--orphans', '--yes']]) {
      const r = run(args);
      expect(r.status).toBe(0);
      expect(r.out).not.toContain('XCTest recordings');
    }
    expect(traceLines()).toEqual([]);
    expect(ls(a)).toEqual(['UUID-A']);
  });

  it('is wired as an npm script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));
    expect(pkg.scripts['e2e:safety:clean:recordings']).toBe('bash scripts/e2e-sim-clean.sh --xctest-recordings');
  });
});
