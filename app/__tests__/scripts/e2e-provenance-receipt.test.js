/**
 * INFRA-657 — the gate receipt: `receipt` writes it, `gated` reads it.
 *
 * The receipt licenses exactly one thing — e2e-safety.sh rebuilding once when the app went
 * missing after this tree verified — so both halves fail closed. The writer refuses on
 * anything short of a MATCH_CLEAN marker and never touches the marker's bytes (INFRA-434
 * compares them); the reader answers GATED only on positive evidence and always exits 0.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.resolve(__dirname, '..', '..', 'scripts', 'e2e-provenance.js');
const SIM = 'AAAA-1111';
const MARKER = '.e2e-provenance.json';

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
}

function sandbox() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'infra657-receipt-')));
  const repo = path.join(base, 'repo');
  const state = path.join(base, 'state');
  const container = path.join(state, 'container');
  fs.mkdirSync(repo, { recursive: true });
  fs.mkdirSync(container, { recursive: true });
  fs.writeFileSync(path.join(repo, 'file.txt'), 'x\n');
  git(['init', '-q', '-b', 'main'], repo);
  git(['config', 'user.email', 't@example.com'], repo);
  git(['config', 'user.name', 'T'], repo);
  git(['add', '-A'], repo);
  git(['commit', '-qm', 'init'], repo);
  return { repo, state, container, receipt: path.join(state, 'receipt.json') };
}

const run = (s, args) => spawnSync('node', [SCRIPT, ...args], { cwd: s.repo, encoding: 'utf8' });
const write = (s) => run(s, ['write', s.container]);
const receipt = (s, extra = []) => run(s, ['receipt', s.container, s.receipt, '--sim', SIM, ...extra]);
const gated = (s, sim = SIM) => run(s, ['gated', s.receipt, '--sim', sim]);

describe('receipt — the writer refuses anything short of MATCH_CLEAN', () => {
  test('writes a receipt for a clean, matching marker and leaves the marker bytes alone', () => {
    const s = sandbox();
    expect(write(s).status).toBe(0);
    const before = fs.readFileSync(path.join(s.container, MARKER), 'utf8');
    const r = receipt(s, ['--item', 'INFRA-657', '--gate', '4242']);
    expect(r.status).toBe(0);
    const body = JSON.parse(fs.readFileSync(s.receipt, 'utf8'));
    expect(body).toMatchObject({ schema: 1, verdict: 'MATCH_CLEAN', simUdid: SIM, item: 'INFRA-657', gatePid: '4242' });
    expect(fs.readFileSync(path.join(s.container, MARKER), 'utf8')).toBe(before);
  });

  test.each([
    ['no marker', (s) => {}],
    ['a marker from another tree', (s) => { write(s); fs.writeFileSync(path.join(s.repo, 'file.txt'), 'moved\n'); }],
    ['a dirty-tree marker', (s) => { fs.writeFileSync(path.join(s.repo, 'file.txt'), 'dirty\n'); write(s); }],
  ])('refuses %s, writing nothing', (_n, setup) => {
    const s = sandbox();
    setup(s);
    expect(receipt(s).status).toBe(1);
    expect(fs.existsSync(s.receipt)).toBe(false);
  });

  test('refuses a receipt path inside the repo, where it would move the fingerprint', () => {
    const s = sandbox();
    write(s);
    const inside = path.join(s.repo, 'receipt.json');
    const r = run(s, ['receipt', s.container, inside, '--sim', SIM]);
    expect(r.status).toBe(1);
    expect(fs.existsSync(inside)).toBe(false);
  });
});

describe('gated — the reader answers GATED only on positive evidence', () => {
  test('GATED for this tree on this simulator', () => {
    const s = sandbox();
    write(s);
    receipt(s, ['--gate', '4242']);
    const r = gated(s);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toMatch(/^GATED \S+ \S+ 4242$/);
  });

  test.each([
    ['unreadable', (s) => fs.writeFileSync(s.receipt, '{nope'), SIM],
    ['unreadable', (s) => {}, SIM],
    ['other-simulator', (s) => { write(s); receipt(s); }, 'BBBB-2222'],
    ['tree-moved', (s) => { write(s); receipt(s); fs.writeFileSync(path.join(s.repo, 'new.txt'), 'y\n'); }, SIM],
    ['schema', (s) => fs.writeFileSync(s.receipt, JSON.stringify({ schema: 99 })), SIM],
  ])('NONE %s, exit 0', (why, setup, sim) => {
    const s = sandbox();
    setup(s);
    const r = gated(s, sim);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(`NONE ${why}`);
  });
});
