/**
 * INFRA-692 — the gate's XCTest-recording sweep (scripts/e2e-sim-attachments.sh).
 *
 * Runs the real helper under bash with `xcrun` and `plutil` stubbed on PATH and a sandbox
 * devices root, so it runs on the ubuntu CI runner and NEVER touches a real simulator: the
 * data path comes only from the stubbed `simctl list devices booted -j`.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const HELPER = path.resolve(__dirname, '../../scripts/e2e-sim-attachments.sh');
const SAFETY = path.resolve(__dirname, '../../scripts/e2e-safety.sh');

const UDID = 'AAAA1111-2222-3333-4444-555566667777';
const OTHER = 'BBBB1111-2222-3333-4444-555566667777';

let root;
let trace;

function container(udid, name, identifier) {
  const dir = path.join(root, 'Devices', udid, 'data', 'Containers', 'Data', 'InternalDaemon', name);
  fs.mkdirSync(path.join(dir, 'Attachments'), { recursive: true });
  if (identifier !== null) {
    fs.writeFileSync(path.join(dir, '.com.apple.mobile_container_manager.metadata.plist'), identifier);
  }
  return path.join(dir, 'Attachments');
}

function writeStubs(booted) {
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin, { recursive: true });
  const json = {
    devices: {
      'iOS-18-6': booted.map((udid) => ({
        udid,
        state: 'Booted',
        dataPath: path.join(root, 'Devices', udid, 'data'),
      })),
    },
  };
  fs.writeFileSync(path.join(root, 'booted.json'), JSON.stringify(json));
  fs.writeFileSync(
    path.join(bin, 'xcrun'),
    `#!/bin/bash\necho "xcrun $*" >> "${trace}"\n` +
      `[ "$XCRUN_FAIL" = "1" ] && exit 1\n` +
      `case "$*" in *"list devices booted -j"*) cat "${path.join(root, 'booted.json')}" ;; esac\n`,
    { mode: 0o755 },
  );
  // The fixture metadata file holds the identifier as plain text; the stub prints it.
  fs.writeFileSync(
    path.join(bin, 'plutil'),
    `#!/bin/bash\nfor last; do :; done\ncat "$last"\n`,
    { mode: 0o755 },
  );
}

/** Snapshot, run `between` (bash), reap. Returns the spawn result. */
function run(udid, between = ':', env = {}) {
  const script = `. "${HELPER}"; e2e_attachments_snapshot "${udid}"; ${between}; e2e_attachments_reap_run "${udid}"; echo "rc=$?"`;
  return spawnSync('/bin/bash', ['-c', script], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${path.join(root, 'bin')}:${process.env.PATH}`, TMPDIR: root, ...env },
  });
}

const touch = (file) => `printf 'movie' > "${file}"`;
const ls = (dir) => fs.readdirSync(dir).sort();

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-attach-'));
  trace = path.join(root, 'trace.log');
  writeStubs([UDID, OTHER]);
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('INFRA-692 e2e-sim-attachments.sh', () => {
  it('deletes the recordings this run wrote, and keeps what was there before', () => {
    const att = container(UDID, 'TM-1', 'com.apple.testmanagerd');
    fs.writeFileSync(path.join(att, 'OLD-UUID'), 'old');
    const res = run(UDID, touch(path.join(att, 'NEW-UUID-1')) + '; ' + touch(path.join(att, 'NEW-UUID-2')));
    expect(res.stdout).toContain('rc=0');
    expect(ls(att)).toEqual(['OLD-UUID']);
    expect(res.stderr).toMatch(/removed 2 XCTest recording/);
  });

  it('touches only the exact UDID: the other simulator and a prefix UDID are left alone', () => {
    const mine = container(UDID, 'TM-1', 'com.apple.testmanagerd');
    const theirs = container(OTHER, 'TM-2', 'com.apple.testmanagerd');
    run(UDID, `${touch(path.join(mine, 'A'))}; ${touch(path.join(theirs, 'B'))}`);
    expect(ls(mine)).toEqual([]);
    expect(ls(theirs)).toEqual(['B']);

    const prefix = UDID.slice(0, 8);
    const res = run(prefix, touch(path.join(mine, 'C')));
    expect(ls(mine)).toEqual(['C']);
    expect(res.stderr).toMatch(/could not resolve the data path/);
  });

  it('with an empty UDID (a device-only run) does nothing at all', () => {
    const att = container(UDID, 'TM-1', 'com.apple.testmanagerd');
    const res = run('', touch(path.join(att, 'X')));
    expect(res.stdout).toContain('rc=0');
    expect(ls(att)).toEqual(['X']);
    expect(fs.existsSync(trace) ? fs.readFileSync(trace, 'utf8') : '').toBe('');
  });

  it('touches only the testmanagerd container, never a decoy or an unlabelled one', () => {
    const tm = container(UDID, 'TM-1', 'com.apple.testmanagerd');
    const decoy = container(UDID, 'DECOY', 'com.apple.somethingelse');
    const bare = container(UDID, 'BARE', null);
    run(UDID, [tm, decoy, bare].map((d) => touch(path.join(d, 'NEW'))).join('; '));
    expect(ls(tm)).toEqual([]);
    expect(ls(decoy)).toEqual(['NEW']);
    expect(ls(bare)).toEqual(['NEW']);
  });

  it('matches by location, not extension, and never follows subdirectories or symlinks', () => {
    const att = container(UDID, 'TM-1', 'com.apple.testmanagerd');
    const outside = path.join(root, 'outside.txt');
    fs.writeFileSync(outside, 'keep me');
    const between = [
      touch(path.join(att, '5E2C1A7B-0D3F-4C1E-9A6B-0123456789AB')),
      `mkdir -p "${path.join(att, 'sub')}" && ${touch(path.join(att, 'sub', 'NESTED'))}`,
      `ln -s "${outside}" "${path.join(att, 'link')}"`,
    ].join('; ');
    run(UDID, between);
    expect(ls(att)).toEqual(['link', 'sub']);
    expect(ls(path.join(att, 'sub'))).toEqual(['NESTED']);
    expect(fs.readFileSync(outside, 'utf8')).toBe('keep me');
  });

  it('covers a testmanagerd container created during the run', () => {
    const late = path.join(root, 'Devices', UDID, 'data', 'Containers', 'Data', 'InternalDaemon', 'LATE');
    const between = [
      `mkdir -p "${late}/Attachments"`,
      `printf 'com.apple.testmanagerd' > "${late}/.com.apple.mobile_container_manager.metadata.plist"`,
      touch(path.join(late, 'Attachments', 'NEW')),
    ].join('; ');
    run(UDID, between);
    expect(ls(path.join(late, 'Attachments'))).toEqual([]);
  });

  it('when the snapshot cannot be taken, deletes nothing and says so', () => {
    const att = container(UDID, 'TM-1', 'com.apple.testmanagerd');
    const res = run(UDID, touch(path.join(att, 'NEW')), { XCRUN_FAIL: '1' });
    expect(res.stdout).toContain('rc=0');
    expect(ls(att)).toEqual(['NEW']);
    expect(res.stderr).toMatch(/will not be swept/);
  });

  it.each([
    ['E2E_KEEP_XCTEST_RECORDINGS', 'keep'],
    ['E2E_ATTACHMENTS_REAP_DRY_RUN', 'dry-run'],
  ])('%s=1 lists the recordings and deletes nothing', (name, mode) => {
    const att = container(UDID, 'TM-1', 'com.apple.testmanagerd');
    const res = run(UDID, touch(path.join(att, 'NEW')), { [name]: '1' });
    expect(ls(att)).toEqual(['NEW']);
    expect(res.stderr).toContain(`(${mode})`);
    expect(res.stderr).toContain('NEW');
  });

  it('logs the empty case rather than staying silent', () => {
    container(UDID, 'TM-1', 'com.apple.testmanagerd');
    const res = run(UDID);
    expect(res.stderr).toMatch(/no XCTest recordings written by this run/);
  });

  it('is idempotent, and returns 0 even when a file cannot be removed', () => {
    if (process.getuid && process.getuid() === 0) return; // root ignores the read-only bit
    const att = container(UDID, 'TM-1', 'com.apple.testmanagerd');
    const between = `${touch(path.join(att, 'NEW'))}; chmod 555 "${att}"`;
    const script = `. "${HELPER}"; e2e_attachments_snapshot "${UDID}"; ${between}; e2e_attachments_reap_run "${UDID}"; echo "first=$?"; e2e_attachments_reap_run "${UDID}"; echo "second=$?"`;
    const res = spawnSync('/bin/bash', ['-c', script], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${path.join(root, 'bin')}:${process.env.PATH}`, TMPDIR: root },
    });
    fs.chmodSync(att, 0o755);
    expect(res.stdout).toContain('first=0');
    expect(res.stdout).toContain('second=0');
    expect(res.stderr).toMatch(/could not be removed/);
    expect(ls(att)).toEqual(['NEW']);
  });

  it('the reap makes no xcrun call, so a wedged CoreSimulator cannot hang the exit trap', () => {
    const att = container(UDID, 'TM-1', 'com.apple.testmanagerd');
    run(UDID, `: > "${trace}"; ${touch(path.join(att, 'NEW'))}`);
    expect(ls(att)).toEqual([]);
    expect(fs.readFileSync(trace, 'utf8')).toBe('');
  });
});

describe('INFRA-718 _e2e_attach_sims — every simulator, booted or not', () => {
  function sims(json, env = {}) {
    fs.writeFileSync(path.join(root, 'all.json'), typeof json === 'string' ? json : JSON.stringify(json));
    fs.writeFileSync(
      path.join(root, 'bin', 'xcrun'),
      `#!/bin/bash\necho "xcrun $*" >> "${trace}"\n[ "$XCRUN_FAIL" = "1" ] && exit 1\n` +
        `case "$*" in "simctl list devices -j") cat "${path.join(root, 'all.json')}" ;; esac\n`,
      { mode: 0o755 },
    );
    return spawnSync('/bin/bash', ['-c', `. "${HELPER}"; _e2e_attach_sims; echo "rc=$?"`], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${path.join(root, 'bin')}:${process.env.PATH}`, ...env },
    });
  }
  const dev = (udid, state, name) => ({ udid, state, name, dataPath: path.join(root, 'Devices', udid, 'data') });

  it('lists Booted and Shutdown devices across runtimes, sorted, with their simctl data paths', () => {
    const r = sims({ devices: { 'iOS-18-6': [dev(OTHER, 'Shutdown', 'iPhone 16e')], 'iOS-26-0': [dev(UDID, 'Booted', 'iPhone SE (3rd generation)')] } });
    expect(r.stdout.trim().split('\n')).toEqual([
      `${UDID}\tBooted\tiPhone SE (3rd generation)\t${path.join(root, 'Devices', UDID, 'data')}`,
      `${OTHER}\tShutdown\tiPhone 16e\t${path.join(root, 'Devices', OTHER, 'data')}`,
      'rc=0',
    ]);
    expect(fs.readFileSync(trace, 'utf8').trim()).toBe('xcrun simctl list devices -j');
  });

  it('drops a device whose dataPath does not end in its own UDID, and one missing fields', () => {
    const r = sims({
      devices: {
        rt: [
          { ...dev(UDID, 'Shutdown', 'a'), dataPath: path.join(root, 'Devices', OTHER, 'data') },
          { udid: OTHER, state: 'Shutdown', name: 'no path' },
          { ...dev(OTHER, 'Shutdown', 'tab\tname') },
        ],
      },
    });
    expect(r.stdout.trim()).toBe('rc=0');
  });

  it('returns 0 and prints nothing when simctl fails or prints garbage', () => {
    expect(sims({ devices: {} }, { XCRUN_FAIL: '1' }).stdout.trim()).toBe('rc=0');
    expect(sims('not json').stdout.trim()).toBe('rc=0');
  });
});

describe('INFRA-692 wiring in e2e-safety.sh', () => {
  const source = fs
    .readFileSync(SAFETY, 'utf8')
    .replace(/^\s*#.*$/gm, '');

  it('sources the helper', () => {
    expect(source).toMatch(/\. "\$\(dirname "\$0"\)\/e2e-sim-attachments\.sh"/);
  });

  it('has ONE exit trap, and it sweeps BEFORE it releases the lease', () => {
    const traps = source.match(/^\s*trap .*EXIT.*$/gm) || [];
    expect(traps).toHaveLength(1);
    expect(traps[0]).toMatch(/e2e_attachments_reap_run "\$SIM_UDID"; e2e_lock_release "\$SIM_UDID"/);
  });

  it('snapshots after the lease is taken and before any maestro invocation', () => {
    const acquire = source.indexOf('e2e_lock_acquire "$SIM_UDID"');
    const snapshot = source.indexOf('e2e_attachments_snapshot "$SIM_UDID"');
    const maestro = source.search(/\bmaestro (?:--device \S+ )?test\b|"\$MAESTRO_BIN"|\bmaestro\b.*\btest\b/);
    expect(acquire).toBeGreaterThan(-1);
    expect(snapshot).toBeGreaterThan(acquire);
    if (maestro > -1) expect(snapshot).toBeLessThan(maestro);
  });
});
