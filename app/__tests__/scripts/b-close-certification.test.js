/**
 * INFRA-510 — the viewport refusal, scoped to the flows the close actually requested.
 *
 * WHY THIS EXISTS
 * ===============
 * INFRA-493 landed the `UNCERTIFIED` verdict token and a receipt carrying `certification:`
 * and `uncertified_flows:`, but deliberately did NOT arm the `/b-close` refusal. INFRA-481
 * had just added `reconsent-stale-ineligible.yaml` declaring `393x852` — the first target
 * in the repo that is neither `375x667` nor `any` — and `e2e_resolve_sim_device` pins ONE
 * device. So no device yields a run-level `certification: CERTIFIED` over the whole suite,
 * and a refusal reading that line would make every FULL_SUITE close unmergeable. The
 * documented response to an unsatisfiable gate is `--skip-e2e` habit, which is the hazard.
 *
 * The fix is to refuse on the INTERSECTION of `uncertified_flows:` with the set the close
 * requested, never on the run-level line. A scoped close must not be refused because some
 * flow it never ran declares a different target.
 *
 * WHAT IS PINNED HERE
 * ===================
 * 1. FAIL-CLOSED IS STRUCTURAL. Absence of evidence is a refusal on every path — no
 *    receipt, no `certification:` line, an unrecognised token, and an empty requested set
 *    (which means FULL_SUITE, i.e. everything was requested) all refuse. OK is the only
 *    answer that merges, so no arm may reach it by falling through.
 * 2. LIVENESS. The OK cases are asserted against verbatim receipt text alongside every
 *    refusal, because a parser that silently matches nothing answers OK on a red run — the
 *    one failure a merge gate cannot survive.
 * 3. WRITER/READER ANTI-DRIFT. The reader here and the writer in `e2e-safety.sh` are in
 *    different files and different languages of intent. A renamed receipt key would make
 *    this parser see an empty set and merge everything, silently. The shipped writer lines
 *    are asserted to still emit the keys this parses.
 * 4. NAME MATCHING IS WORD-EXACT. `reconsent-stale` is a proper prefix of
 *    `reconsent-stale-ineligible`, and those two flows declare DIFFERENT targets. A
 *    substring match refuses the wrong close in one direction and merges a red one in the
 *    other, so both directions are pinned.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_APP = path.resolve(__dirname, '..', '..');
const HELPER = path.join(REPO_APP, 'scripts', 'b-close-verdict.sh');
const SAFETY = path.join(REPO_APP, 'scripts', 'e2e-safety.sh');
const RUNNER = path.join(REPO_APP, 'scripts', 'b-close-run.sh');

let TMP;
beforeAll(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'infra510-'));
});
afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

/** Source the helper and evaluate one expression, returning {stdout, status}. */
function sh(expr) {
  const r = spawnSync('bash', ['-c', `set -u; . "${HELPER}"; ${expr}`], { encoding: 'utf8' });
  return { stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim(), status: r.status };
}

/**
 * Write a receipt in the shape `e2e-safety.sh` actually emits. The surrounding keys are
 * present on purpose: a parser anchored too loosely (`grep certification`) would match
 * `certification` inside another line, and only a realistic file catches that.
 */
function receipt({ certification = 'CERTIFIED', uncertified = 'none', results = [] } = {}) {
  const file = path.join(TMP, `receipt-${Math.random().toString(36).slice(2)}.txt`);
  fs.writeFileSync(
    file,
    [
      'e2e:safety receipt',
      'generated_utc:   2026-08-21T22:00:00Z',
      'repo_head:       deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      'repo_branch:     chore/INFRA-510-viewport-refusal-scope',
      'device_line:     iPhone SE (3rd generation) · iOS 26.0',
      'device_udid:     11111111-2222-3333-4444-555555555555',
      'device_model_id: com.apple.CoreSimulator.SimDeviceType.iPhone-SE-3rd-generation',
      'device_ios:      26.0',
      'device_viewport: 375x667',
      'declared_target: 375x667',
      'host_at_start:   quiet',
      'flows_ran:       11 of 11',
      'target_replaced: 0',
      `certification:   ${certification}`,
      `uncertified_flows: ${uncertified}`,
      'results:',
      ...results.map((r) => `  ${r}`),
      '',
    ].join('\n')
  );
  return file;
}

/** The verdict, with the requested flow set passed exactly as /b-close would. */
function verdict(file, ...flows) {
  const args = [file, ...flows].map((a) => `"${a}"`).join(' ');
  const r = sh(`b_close_certification_verdict ${args}`);
  expect(r.status).toBe(0); // a predicate, never a gate — it must not exit non-zero
  return r.stdout;
}

/** The offending set the verdict is derived from. */
function offenders(file, ...flows) {
  const args = [file, ...flows].map((a) => `"${a}"`).join(' ');
  const r = sh(`b_close_uncertified_intersection ${args}`);
  expect(r.status).toBe(0);
  return r.stdout;
}

describe('INFRA-510 — the scoped certification verdict', () => {
  // -- Liveness: OK must be reachable, or every assertion below is vacuous ---------------
  it('answers OK for a fully certifying run with no flows requested (FULL_SUITE)', () => {
    expect(verdict(receipt({ certification: 'CERTIFIED' }))).toBe('OK');
  });

  it('answers OK for a fully certifying run with flows requested (scoped)', () => {
    expect(verdict(receipt({ certification: 'CERTIFIED' }), 'q9-single-alert')).toBe('OK');
  });

  // -- THE SCOPING FIX ------------------------------------------------------------------
  it('answers OK when the only uncertified flow is one this close never requested', () => {
    // The INFRA-493 stranding case, exactly: a scoped close of an assessment change on an
    // SE 3, where reconsent-stale-ineligible declares 393x852 and did not run at all.
    const r = receipt({
      certification: 'UNCERTIFIED',
      uncertified: 'reconsent-stale-ineligible',
    });
    expect(verdict(r, 'q9-single-alert', 'phq9-severe-completion')).toBe('OK');
  });

  it('refuses when a requested flow is the one that did not certify', () => {
    const r = receipt({
      certification: 'UNCERTIFIED',
      uncertified: 'crisis-button-reachability',
    });
    expect(verdict(r, 'crisis-button-reachability')).toBe('CERT_UNCERTIFIED');
  });

  it('refuses when ANY requested flow is uncertified, not only the first', () => {
    const r = receipt({
      certification: 'UNCERTIFIED',
      uncertified: 'deeplink-consent-gate daily-loop-quick-depth',
    });
    expect(verdict(r, 'q9-single-alert', 'daily-loop-quick-depth')).toBe('CERT_UNCERTIFIED');
  });

  it('refuses an UNCERTIFIED full-suite run — an empty requested set means ALL', () => {
    // FULL_SUITE requests every flow, so the intersection is uncertified_flows itself.
    // Reading "no flows named" as "nothing to check" is the shape that merges everything.
    const r = receipt({ certification: 'UNCERTIFIED', uncertified: 'reconsent-stale' });
    expect(verdict(r)).toBe('CERT_UNCERTIFIED');
  });

  // -- Word-exact matching, both directions ---------------------------------------------
  it('does not refuse on a PREFIX collision — reconsent-stale vs reconsent-stale-ineligible', () => {
    const r = receipt({
      certification: 'UNCERTIFIED',
      uncertified: 'reconsent-stale-ineligible',
    });
    expect(verdict(r, 'reconsent-stale')).toBe('OK');
  });

  it('does not merge on a SUFFIX collision either', () => {
    const r = receipt({ certification: 'UNCERTIFIED', uncertified: 'reconsent-stale' });
    expect(verdict(r, 'reconsent-stale-ineligible')).toBe('OK');
    expect(verdict(r, 'reconsent-stale')).toBe('CERT_UNCERTIFIED');
  });

  // -- Fail closed ----------------------------------------------------------------------
  it('refuses when the receipt does not exist', () => {
    expect(verdict(path.join(TMP, 'no-such-receipt.txt'), 'q9-single-alert')).toBe(
      'CERT_RECEIPT_MISSING'
    );
  });

  it('refuses when no receipt path was given at all', () => {
    expect(sh('b_close_certification_verdict ""').stdout).toBe('CERT_RECEIPT_MISSING');
  });

  it('refuses a receipt carrying no certification: line', () => {
    const file = path.join(TMP, 'truncated.txt');
    fs.writeFileSync(file, 'e2e:safety receipt\ndevice_viewport: 375x667\n');
    expect(verdict(file)).toBe('CERT_UNKNOWN');
  });

  it('refuses an unrecognised certification token rather than reading it as green', () => {
    expect(verdict(receipt({ certification: 'PROBABLY' }))).toBe('CERT_UNKNOWN');
  });

  it('refuses a VOID run regardless of which flows were requested', () => {
    // INFRA-434: the target moved, so every completed flow is inconclusive. VOID must not
    // be salvageable by scoping — scoping narrows WHICH verdicts apply, not WHETHER one
    // exists.
    const r = receipt({ certification: 'VOID', uncertified: 'none' });
    expect(verdict(r)).toBe('CERT_VOID');
    expect(verdict(r, 'q9-single-alert')).toBe('CERT_VOID');
  });

  it('never answers OK for an unrecognised stage outcome', () => {
    // LIVENESS FIRST. Without this line every assertion below is satisfied by the `*)`
    // stage arm answering UNKNOWN_STAGE — non-OK and non-empty for EVERY token including
    // the good one — so the spec would be green with no `certification` stage at all.
    expect(sh('b_close_stage_verdict certification OK').stdout).toBe('OK');
    for (const token of ['', 'MAYBE', 'certified', 'OK ', 'CERT_UNCERTIFIED']) {
      const out = sh(`b_close_stage_verdict certification "${token}"`).stdout;
      expect(out).not.toBe('OK');
      expect(out).not.toBe('');
      expect(out).not.toBe('UNKNOWN_STAGE'); // the stage must be typed, not fall through
    }
  });

  it('types a passing certification stage as the only mergeable answer', () => {
    expect(sh('b_close_stage_verdict certification OK').stdout).toBe('OK');
    expect(sh('b_close_mergeable "$(b_close_stage_verdict certification OK)"; echo $?').stdout)
      .toBe('0');
    expect(
      sh('b_close_mergeable "$(b_close_stage_verdict certification CERT_UNCERTIFIED)"; echo $?')
        .stdout
    ).not.toBe('0');
  });
});

describe('INFRA-510 — the offending set is named, not just counted', () => {
  it('names only the requested flows that failed to certify', () => {
    const r = receipt({
      certification: 'UNCERTIFIED',
      uncertified: 'reconsent-stale-ineligible daily-loop-quick-depth',
    });
    expect(offenders(r, 'daily-loop-quick-depth', 'q9-single-alert')).toBe(
      'daily-loop-quick-depth'
    );
  });

  it('is empty when the close requested none of them', () => {
    const r = receipt({
      certification: 'UNCERTIFIED',
      uncertified: 'reconsent-stale-ineligible',
    });
    expect(offenders(r, 'q9-single-alert')).toBe('');
  });

  it('returns the whole set for a full-suite run', () => {
    const r = receipt({
      certification: 'UNCERTIFIED',
      uncertified: 'reconsent-stale crisis-button-reachability',
    });
    expect(offenders(r)).toBe('reconsent-stale crisis-button-reachability');
  });
});

describe('INFRA-510 — writer/reader anti-drift', () => {
  // A renamed receipt key would leave the parser above matching nothing, which answers OK
  // and merges. The writer is in another file; nothing but this pin couples them.
  const src = fs.readFileSync(SAFETY, 'utf8');

  it('e2e-safety.sh still writes the certification: key this parses', () => {
    expect(src).toMatch(/echo "certification:\s/);
  });

  it('e2e-safety.sh still writes the uncertified_flows: key this parses', () => {
    expect(src).toMatch(/echo "uncertified_flows:\s/);
  });

  it('the three tokens this classifier recognises are the three the writer can emit', () => {
    const certLines = src.split('\n').filter((l) => /echo "certification:/.test(l));
    expect(certLines).toHaveLength(2); // liveness: the matcher found the writer block
    const emitted = new Set(
      certLines.flatMap((l) =>
        [...l.matchAll(/\b(CERTIFIED|UNCERTIFIED|VOID)\b/g)].map((m) => m[1])
      )
    );
    // A fourth token added upstream lands here as a red before it can reach the
    // classifier's `*)` arm and be silently refused on every close.
    expect(emitted).toEqual(new Set(['CERTIFIED', 'UNCERTIFIED', 'VOID']));
  });

  it('uncertified_flows: renders `none` when empty, which must not parse as a flow name', () => {
    expect(src).toMatch(/uncertified_flows:\s+\$\{uncertified_flows\[\*\]:-none\}/);
    const r = receipt({ certification: 'CERTIFIED', uncertified: 'none' });
    expect(offenders(r, 'none')).toBe('');
  });
});

describe('INFRA-510 — the DETACHED close cannot bypass the refusal', () => {
  // `/b-close` Step 2.5.3a hands the whole gate-to-merge span to this script, which types
  // the flows stage itself. A refusal wired only into `b-close.md` would leave detaching
  // as a bypass — and detaching is the path with nobody watching, which is the one that
  // most needs the verdict read.
  //
  // Comments stripped before matching (DEBUG-390): this file names the mechanisms it
  // implements in prose, so a bare identifier search matches the explanation.
  const src = (() => {
    const raw = fs.readFileSync(RUNNER, 'utf8').replace(/^\s*#.*$/gm, '');
    expect(raw.length).toBeGreaterThan(1000); // the stripper must not have eaten the file
    return raw;
  })();

  it('names the receipt path so the verdict reads THIS run and not a peer gate glob', () => {
    expect(src).toMatch(/E2E_RECEIPT_PATH=/);
    expect(src).toMatch(/export\s+E2E_RECEIPT_PATH/);
  });

  it('keeps the receipt OUT of the worktree', () => {
    // The provenance fingerprint hashes untracked file contents repo-wide, so a receipt
    // written under $WORKTREE reads as MISMATCH on the next verify and costs a rebuild.
    const line = src.split('\n').find((l) => /E2E_RECEIPT_PATH=/.test(l));
    expect(line).toBeDefined();
    expect(line).toContain('RUN_DIR');
    expect(line).not.toContain('WORKTREE');
  });

  it('evaluates the certification verdict AFTER the flows stage, not before', () => {
    const flowsAt = src.indexOf('stage flows');
    const certAt = src.indexOf('b_close_certification_verdict');
    expect(flowsAt).toBeGreaterThan(-1);
    expect(certAt).toBeGreaterThan(-1);
    expect(certAt).toBeGreaterThan(flowsAt);
  });

  it('scopes the verdict to the requested flows, so FULL_SUITE passes an empty set', () => {
    const line = src.split('\n').find((l) => /b_close_certification_verdict/.test(l));
    expect(line).toMatch(/\$FLOWS/);
    // Unquoted on purpose: FLOWS is a space-separated word list, and quoting it would make
    // a scoped close pass ONE argument containing spaces, which matches no flow name and
    // silently answers OK.
    expect(line).not.toMatch(/"\$FLOWS"/);
  });

  it('REFUSES on the verdict rather than only reporting it', () => {
    expect(src).toMatch(/b_close_mergeable\s+"\$CERT_VERDICT"/);
    expect(src).toMatch(/finish\s+"\$CERT_VERDICT"/);
  });

  it('names the offending flows in the refusal, not just the stage', () => {
    expect(src).toMatch(/b_close_uncertified_intersection/);
  });
});
