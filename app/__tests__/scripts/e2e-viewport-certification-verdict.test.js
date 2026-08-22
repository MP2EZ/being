/**
 * INFRA-493 — a non-certifying run is LABELLED as not certifying, and the close refuses on
 * the ABSENCE of a certifying run.
 *
 * WHY THIS EXISTS
 * ===============
 * INFRA-486 landed the declaration as data and left the gate WARN-ONLY, deliberately: a
 * refusal armed over unmeasured or known-red flows converts the gate from "blocks bad
 * merges" into "blocks all merges", and the documented response to that is `--skip-e2e`.
 * The measurement has since landed — 9/9 PASS at 375x667 — so the refusal is armed here.
 *
 * THE SHAPE OF THE ARMING, AND WHY IT IS NOT AN EXIT CODE
 * ======================================================
 * The exit alphabet is spent: 0 pass / 1 flow regression / 2 harness could not complete /
 * 3 target replaced (INFRA-434), and both `/b-close` and `e2e-gate.sh` route on them. So a
 * non-certifying all-green run still exits 0 and the policy is carried by a THIRD VERDICT
 * TOKEN plus a receipt line, never by a new exit status. A reader sees `UNCERTIFIED`; a
 * caller reads `certification:` from the receipt.
 *
 * It must not be FAIL — that re-creates the "refuses because the device is large" shape
 * INFRA-478's AC 3 forbade, and makes a real 988 regression indistinguishable from a
 * wrong-device run. It must not be PASS — a PASS a grep or a reader can salvage is an
 * unenforced guarantee. INFRA-434's VOID is the in-tree precedent.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_APP = path.resolve(__dirname, '..', '..');
const HELPER = path.join(REPO_APP, 'scripts', 'e2e-sim-device.sh');
const RUNNER = path.join(REPO_APP, 'scripts', 'e2e-safety.sh');

/** Source the helper and run one expression; returns status + trimmed streams. */
function sh(expr, opts = {}) {
  const res = spawnSync('/bin/bash', ['-c', `. "${HELPER}"; ${expr}`], {
    encoding: 'utf8',
    ...opts,
  });
  return {
    status: res.status,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim(),
  };
}

/**
 * Strip block and line comments before matching source shape (DEBUG-390). This repo
 * deliberately names anti-patterns in prose to warn the next reader off them, so a bare
 * `toContain` matches the comment saying "do not do X" and asserts the opposite of what it
 * means. Every structural pin below matches the STRIPPED text.
 */
const stripComments = src =>
  src
    .split('\n')
    .map(l => (/^[ \t]*#/.test(l) ? '' : l))
    .join('\n');

const runnerSrc = fs.readFileSync(RUNNER, 'utf8');
const runnerCode = stripComments(runnerSrc);

const certifies = (declared, ran) => sh(`e2e_run_certifies "${declared}" "${ran}"`);
const note = (declared, ran) => sh(`e2e_flow_certification_note "${declared}" "${ran}"`).stdout;

/** Every (declared, ran) pair the gate can actually encounter. */
const MATRIX = [
  ['any', '375x667'],
  ['any', '402x874'],
  ['any', 'unknown'],
  ['375x667', '375x667'],
  ['375x667', '402x874'],
  ['375x667', 'unknown'],
  ['402x874', '375x667'],
];

describe('e2e_run_certifies — the single authority on whether a run certifies a flow', () => {
  it('certifies a viewport-independent flow on any device', () => {
    expect(certifies('any', '402x874').stdout).toBe('yes');
    expect(certifies('any', '375x667').stdout).toBe('yes');
  });

  it('certifies when the declared viewport is the one that ran', () => {
    expect(certifies('375x667', '375x667').stdout).toBe('yes');
  });

  it('does NOT certify when the viewports differ', () => {
    expect(certifies('375x667', '402x874').stdout).toBe('no');
  });

  it('does NOT certify an underivable viewport for a layout-sensitive flow', () => {
    // AC 2. This path returned 0 silently before: "we could not derive it" and "it was
    // wrong" are the same quality of evidence, so they get the same verdict.
    expect(certifies('375x667', 'unknown').stdout).toBe('no');
  });

  it('still certifies a viewport-independent flow when the viewport is underivable', () => {
    // The converse guard: `unknown` must not become a blanket refusal. A flow whose
    // contract does not depend on the viewport is unaffected by not knowing it, and
    // widening the refusal to those five flows is what makes a gate unsatisfiable.
    expect(certifies('any', 'unknown').stdout).toBe('yes');
  });

  it('is a predicate, not a gate — it exits 0 on every path including the refusing one', () => {
    // The refusal is /b-close's. A helper that exits non-zero here would put a veto inside
    // `set -e` territory in three sourcing scripts and refuse the RUN, not the MERGE.
    for (const [d, r] of MATRIX) {
      expect(certifies(d, r).status).toBe(0);
    }
  });
});

describe('the label and the verdict cannot disagree', () => {
  // The anti-drift pin, and the reason e2e_flow_certification_note was refactored to
  // CONSUME the predicate rather than re-derive it. Two independent copies of this
  // decision produce a summary line reading "certifies 375x667" beside a receipt reading
  // UNCERTIFIED, and nothing would catch it — both halves look right in isolation.
  test.each(MATRIX)('%s declared / %s ran — note and predicate agree', (declared, ran) => {
    const verdict = certifies(declared, ran).stdout;
    // Demand a real token before comparing. Without this the pair agrees vacuously
    // whenever BOTH sides are falsy, which is precisely the state a missing predicate
    // produces — the assertion would go green before the implementation existed.
    expect(['yes', 'no']).toContain(verdict);
    expect(/does not certify/.test(note(declared, ran))).toBe(verdict === 'no');
  });
});

describe('e2e_uncertified_remediation — one command, and the gate does not run it', () => {
  const remediate = (ran, udid, extraEnv = {}) =>
    sh(`e2e_uncertified_remediation "${ran}" "${udid}"`, { env: { ...process.env, ...extraEnv } });

  it('prints the literal xcrun simctl boot line for the smallest supported model', () => {
    // AC 5. What keeps a refusal from training the --skip-e2e reflex is that remediation
    // is one command the operator can paste, not a paragraph they have to interpret.
    const out = remediate('402x874', 'ABC-123');
    expect(out.stdout + out.stderr).toMatch(/xcrun simctl boot/);
    expect(out.stdout + out.stderr).toContain('iPhone SE (3rd generation)');
  });

  it('names the device currently booted, because the resolver refuses at 2+', () => {
    // Booting the SE 3 alongside the current device trips e2e_resolve_sim_device's own
    // exit 3. Remediation that produces a different failure is not remediation.
    const out = remediate('402x874', 'ABC-123');
    expect(out.stdout + out.stderr).toContain('ABC-123');
  });

  it('does NOT boot or create a simulator — it prints the command and stops', () => {
    // AC 6, mechanically. The simulator is shared across worktrees and INFRA-423's
    // driver-ownership classifier assumes the operator owns the boot, so a gate that boots
    // one silently contaminates a peer's run. Stub xcrun on PATH and assert it is never
    // invoked, rather than trusting the source to look side-effect-free.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-remediate-'));
    const sentinel = path.join(dir, 'xcrun-was-invoked');
    fs.writeFileSync(path.join(dir, 'xcrun'), `#!/bin/sh\ntouch "${sentinel}"\nexit 0\n`);
    fs.chmodSync(path.join(dir, 'xcrun'), 0o755);
    try {
      const out = remediate('402x874', 'ABC-123', { PATH: `${dir}:${process.env.PATH}` });
      // Positive control: an absent sentinel proves nothing if the function never ran.
      expect(out.stdout + out.stderr).toMatch(/xcrun simctl boot/);
      expect(fs.existsSync(sentinel)).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('exits 0 — the text is guidance, not the verdict', () => {
    expect(remediate('402x874', 'ABC-123').status).toBe(0);
  });
});

describe('e2e-safety.sh — the third verdict token', () => {
  it('the stripped source is non-trivial (guards the matchers below against matching nothing)', () => {
    // Comment-stripping plus a narrow regex is exactly the combination that silently
    // matches nothing at all and reads as green. Prove there is still a script here.
    expect(runnerCode.length).toBeGreaterThan(5000);
    expect(runnerCode).toMatch(/e2e_flow_certifies/);
  });

  it('the comment stripper actually fires (control)', () => {
    expect(stripComments('# UNCERTIFIED in a comment\nreal=1\n')).not.toMatch(/UNCERTIFIED/);
    expect(stripComments('# a comment\nreal=1\n')).toMatch(/real=1/);
  });

  it('emits UNCERTIFIED as a verdict token in executable code, not only in prose', () => {
    expect(runnerCode).toMatch(/UNCERTIFIED/);
  });

  it('chooses the token from the predicate rather than re-deriving the comparison', () => {
    expect(runnerCode).toMatch(/e2e_run_certifies/);
  });

  it('never lets a non-certifying run set the failure flag', () => {
    // AC 3. `fail` is what `exit "$fail"` returns, so any assignment in the UNCERTIFIED
    // path would express the policy as an exit status — the same category error as
    // INFRA-478's AC 2(a) vs AC 3.
    const uncertifiedArm = runnerCode
      .split('\n')
      .filter(l => /UNCERTIFIED/.test(l));
    // Assert the arm EXISTS before asserting what it does not contain — a filter that
    // matches nothing satisfies any `not.toMatch` and looks exactly like a working pin.
    expect(uncertifiedArm.length).toBeGreaterThan(0);
    expect(uncertifiedArm.join('\n')).not.toMatch(/\bfail=1\b/);
  });

  it('freezes the exit alphabet at 0/1/2/3', () => {
    const literals = [...runnerCode.matchAll(/^[ \t]*exit[ \t]+([0-9]+)[ \t]*$/gm)].map(m => m[1]);
    expect(literals.length).toBeGreaterThan(0);
    // A SUBSET assertion, not an equality one. DEBUG-496 states the invariant at the top of
    // e2e-safety.sh: "exit 1 has exactly ONE producer in this file, the terminal
    // `exit "$fail"`" — so the literal set legitimately excludes 1, and demanding it be
    // present would pin the opposite of the landed contract. Kept as a set-difference so
    // this fails on a 4th status AND on a reintroduced bare `exit 1`, which are the two
    // ways the alphabet can stop being frozen.
    expect([...new Set(literals)].filter(n => n !== '2' && n !== '3')).toEqual([]);
    expect(runnerCode).toMatch(/exit "\$fail"/);
  });
});

describe('e2e-safety.sh — the receipt is the channel /b-close reads', () => {
  it('records a machine-readable certification verdict', () => {
    // The exit code cannot carry this (frozen alphabet) and the summary is stdout-only, so
    // the receipt INFRA-486 wrote but nothing read becomes the substrate. A grep-stable
    // printed line would force the caller to capture output, and capturing a long-running
    // gate's stream is how a failed command reads as exit 0 (CLAUDE.md).
    expect(runnerCode).toMatch(/certification:/);
    expect(runnerCode).toMatch(/uncertified_flows:/);
  });

  it('records VOID, not CERTIFIED, when the gate target moved mid-suite', () => {
    // INFRA-434 already ruled every completed flow inconclusive, and the receipt outlives
    // the terminal that printed the exit 3 — so a bare CERTIFIED there is a claim about
    // flows this run no longer vouches for.
    expect(runnerCode).toMatch(/GATE_TARGET_REPLACED[^\n]*\n[^\n]*certification:[ \t]*VOID/);
  });

  it('lets the caller name the receipt path, so it need not be discovered', () => {
    // The written path is timestamped and PID-suffixed; a caller globbing for it would
    // race every peer gate on the machine. E2E_RECEIPT_PATH makes it deterministic.
    expect(runnerCode).toMatch(/E2E_RECEIPT_PATH/);
  });

  it('keeps the receipt out of the worktree', () => {
    // The provenance fingerprint is repo-wide and includes untracked file contents, so a
    // receipt written inside the worktree reads as MISMATCH on the next verify and costs
    // a rebuild — turning an evidence improvement into a 21-minute tax.
    // Anchored to the RECEIPT's own directory assignment, not a bare /TMPDIR/ — `TMPDIR`
    // also appears in the per-flow mktemp, so the loose matcher stayed green under a
    // mutation that moved the receipt to `.`, i.e. it could not go red at all.
    expect(runnerCode).toMatch(/SUITE_RECEIPT_DIR="\$\{E2E_EVIDENCE_DIR:-\$\{TMPDIR:-\/tmp\}\}"/);
  });
});
