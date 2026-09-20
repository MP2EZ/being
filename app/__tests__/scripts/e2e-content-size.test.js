/**
 * DEBUG-640 instance 2 — the content-size refusal names a cause it cannot know.
 *
 * THE OBSERVED FAILURE
 * ====================
 * `e2e_assert_default_content_size` refused a non-default content size with
 * "so this was almost certainly left behind by an earlier run on this machine."
 * Acting on that, a peer session ran `simctl ui <udid> content_size large` at ~21:56
 * against a device whose AX5 state was owned by a LIVE run of `daily-loop-ax5-entry`.
 * Nothing was leaking: `e2e-dynamic-type.sh` sets AX5 and restores it in an EXIT/INT/TERM
 * trap. The script held one fact — the device global is non-default — and stated a second
 * it had no way to observe: who set it, and whether they are still using it.
 *
 * `simctl` exposes no owner for the setting, so the inference is unavailable from outside.
 * A live-JVM check WAS available and nothing pointed at it.
 *
 * WHY THE CHECK IS REPORTED AS AN OBSERVATION AND NOT A VERDICT
 * ============================================================
 * The obvious fix — "no live JVM, therefore it leaked" — would commit two further
 * instances of this item's own defect, and both are pinned below:
 *
 *   * DEVICE-BLIND. `e2e_maestro_jvm_pids` has no UDID predicate, so a peer's JVM driving
 *     a DIFFERENT simulator satisfies it. That is verbatim instance 4 from this item's own
 *     page: "`ps` reports host activity; only the pin or the log says which device a run
 *     targets."
 *   * UNSOUND WHEN ABSENT. `e2e-driver-ownership.sh` already retired this inference: "A
 *     peer sitting between its own flows has no live JVM — it is inside its own `sleep 8`
 *     settle — so the guard sees nothing." `e2e-dynamic-type.sh` holds AX5 across the
 *     WHOLE inner run, including a lock wait that can reach E2E_LOCK_TIMEOUT.
 *
 * So the refusal reports the count and the pids as a fact about NOW, states both caveats,
 * and leaves the reset to a human who has read them. The refusal itself does not move:
 * DEBUG-469 chose refuse-over-warn deliberately and `e2e-safety.sh` consumes it as
 * `|| exit 2`.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = path.resolve(__dirname, '..', '..', 'scripts');
const CONTENT_SIZE_SH = path.join(SCRIPTS, 'e2e-content-size.sh');

/**
 * Source the real helper with `xcrun` and `ps` stubbed on PATH, then call it.
 * Nothing here touches a real simulator.
 */
function runAssert({ contentSize, procs = [], env = {} }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'debug640-cs-'));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);

  fs.writeFileSync(
    path.join(bin, 'xcrun'),
    `#!/bin/sh\n# only ever asked for: simctl ui <udid> content_size\nprintf '%s\\n' ${JSON.stringify(contentSize)}\n`,
    { mode: 0o755 }
  );

  // `_e2e_ps_table` invokes ps TWICE with different formats and joins the two on pid:
  //   ps -axo pid=,ppid=,pgid=,comm=   then   ps -axo pid=,args=
  // so the stub has to branch the way the real ps does. A single fixed table here
  // produces a join that silently matches nothing — which reads as "no JVM running"
  // rather than as a broken fixture.
  const commRows = procs.map((p) => `  ${p.pid} ${p.ppid} ${p.pgid} ${p.comm}`).join('\n');
  const argsRows = procs.map((p) => `  ${p.pid} ${p.args}`).join('\n');
  fs.writeFileSync(
    path.join(bin, 'ps'),
    `#!/bin/sh\ncase "$*" in\n  *comm=*) cat <<'PSEOF'\n${commRows}\nPSEOF\n  ;;\n  *) cat <<'PSEOF'\n${argsRows}\nPSEOF\n  ;;\nesac\n`,
    { mode: 0o755 }
  );

  const r = spawnSync(
    'bash',
    ['-u', '-c', `. "${CONTENT_SIZE_SH}"; e2e_assert_default_content_size "SIM-UDID-0001"`],
    {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, ...env },
    }
  );
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

/**
 * One live maestro JVM, pinned to a DIFFERENT device than the one under test. That detail
 * is the point of instance 4: `ps` proves host activity, never which device a run targets.
 */
const JVM_PROCS = [
  {
    pid: 4242,
    ppid: 4200,
    pgid: 4200,
    comm: 'java',
    args: '/usr/bin/java -cp maestro.jar maestro.cli.AppKt test --device OTHER-UDID flow.yaml',
  },
];

// ---------------------------------------------------------------------------
// The refusal itself must not move (DEBUG-469)
// ---------------------------------------------------------------------------

describe('DEBUG-640 AC3 — the refusal contract is unchanged', () => {
  test('a non-default content size still returns 1', () => {
    // e2e-safety.sh consumes this as `|| exit 2`. Softening the overstated sentence must
    // not soften the refusal: "we only observed a non-default size, so we should not
    // refuse" is the reasoning this test forbids.
    expect(runAssert({ contentSize: 'accessibility-extra-extra-extra-large' }).code).toBe(1);
  });

  test('the default still returns 0', () => {
    expect(runAssert({ contentSize: 'large' }).code).toBe(0);
  });

  test('an unreadable size still returns 0 rather than becoming an unfixable red gate', () => {
    expect(runAssert({ contentSize: '' }).code).toBe(0);
  });

  test('E2E_ALLOW_NON_DEFAULT_CONTENT_SIZE=1 still opts in', () => {
    // This is the seam e2e-dynamic-type.sh uses. It must survive the rewrite.
    const r = runAssert({
      contentSize: 'accessibility-extra-extra-extra-large',
      env: { E2E_ALLOW_NON_DEFAULT_CONTENT_SIZE: '1' },
    });
    expect(r.code).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC1/AC3 — observation, not conclusion
// ---------------------------------------------------------------------------

describe('DEBUG-640 AC1 — the refusal states what it observed', () => {
  test('it reports the measured size and that no owner is recorded', () => {
    const r = runAssert({ contentSize: 'accessibility-extra-extra-extra-large' });
    expect(r.stderr).toMatch(/accessibility-extra-extra-extra-large/);
    expect(r.stderr).toMatch(/no owner/i);
  });

  test('it no longer asserts the cause it cannot observe', () => {
    // The exact clause a peer acted on.
    const r = runAssert({ contentSize: 'accessibility-extra-extra-extra-large' });
    expect(r.stderr).not.toMatch(/almost certainly|certainly left behind|must have been left/i);
  });

  test('it names the live-run alternative it cannot rule out', () => {
    const r = runAssert({ contentSize: 'accessibility-extra-extra-extra-large' });
    expect(r.stderr).toMatch(/live/i);
    expect(r.stderr).toMatch(/trap|restore/i);
  });
});

describe('DEBUG-640 AC3 — the live-JVM check is reported as an observation', () => {
  test('with a live maestro JVM it reports the count and the pid', () => {
    const r = runAssert({
      contentSize: 'accessibility-extra-extra-extra-large',
      procs: JVM_PROCS,
    });
    expect(r.stderr).toMatch(/4242/);
  });

  test('a live JVM is NOT reported as proof this device is busy (instance 4)', () => {
    // The JVM above is pinned to OTHER-UDID. `ps` reports host activity; only the pin or
    // the log says which device a run targets. Claiming "this device is in use" here
    // would be a fresh instance of the very defect this item exists to fix.
    const r = runAssert({
      contentSize: 'accessibility-extra-extra-extra-large',
      procs: JVM_PROCS,
    });
    expect(r.stderr).toMatch(/different device|another device|which device|not necessarily this device/i);
  });

  test('an EMPTY ps table does not license a reset', () => {
    // "No live JVM" does not mean "leaked": a peer inside its sleep-8 settle shows none,
    // and e2e-dynamic-type.sh holds AX5 across its whole inner run including a lock wait.
    const r = runAssert({ contentSize: 'accessibility-extra-extra-extra-large', procs: [] });
    expect(r.stderr).not.toMatch(/almost certainly|certainly left behind|safe to reset|must have been left/i);
    expect(r.stderr).toMatch(/now|settle|between/i);
  });

  test('the reset command is offered AFTER the check, not before it', () => {
    const r = runAssert({ contentSize: 'accessibility-extra-extra-extra-large', procs: JVM_PROCS });
    const check = r.stderr.search(/maestro|java|JVM/i);
    const reset = r.stderr.indexOf('content_size large');
    expect(check).toBeGreaterThanOrEqual(0);
    expect(reset).toBeGreaterThanOrEqual(0);
    expect(check).toBeLessThan(reset);
  });

  test('DEBUG-392: never pgrep -f / pkill -f, in code OR in operator text', () => {
    const r = runAssert({ contentSize: 'accessibility-extra-extra-extra-large', procs: JVM_PROCS });
    expect(r.stderr).not.toMatch(/pgrep\s+-f|pkill\s+-f/);
  });
});

// ---------------------------------------------------------------------------
// Source-shape pins. NOTE the stripper: this is a SHELL file.
// ---------------------------------------------------------------------------

describe('DEBUG-640 AC5 — source pins over comment-stripped shell', () => {
  /**
   * A shell stripper. DEBUG-390's convention names a C-style stripper
   * (`/\*...*\/` + `//`), which is JS-specific: it does NOTHING to this file's `#`
   * comments, and `//` is shell's substring-replace operator. `e2e-maestro-version-pin`
   * records the same trap. Using the wrong stripper here would make every negative below
   * vacuous — and the house style of narrating anti-patterns in prose guarantees the
   * retired wording is still present in a comment.
   */
  const stripShellComments = (src) => src.replace(/^\s*#.*$/gm, '');

  /** Slice one function body by brace balance, anchored at BOTH ends to its own structure. */
  function sliceShellFunction(src, name) {
    const start = src.indexOf(`${name}() {`);
    if (start < 0) return '';
    const open = src.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < src.length; i += 1) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') {
        depth -= 1;
        if (depth === 0) return src.slice(start, i + 1);
      }
    }
    return '';
  }

  const raw = () => fs.readFileSync(CONTENT_SIZE_SH, 'utf8');

  test('MATCHER INTEGRITY: the stripper leaves the code and the slice is real', () => {
    const stripped = stripShellComments(raw());
    // The stripper must not have eaten the file...
    expect(stripped).toMatch(/e2e_assert_default_content_size\(\)/);
    expect(stripped.length).toBeGreaterThan(400);
    // ...and it must actually remove comments, or every negative below is meaningless.
    expect(raw()).toMatch(/^\s*#/m);
    expect(stripped).not.toMatch(/^\s*#/m);

    const slice = sliceShellFunction(stripped, 'e2e_assert_default_content_size');
    expect(slice.length).toBeGreaterThan(200);
    expect(slice).toMatch(/E2E_ALLOW_NON_DEFAULT_CONTENT_SIZE/);
    expect(slice).toMatch(/return 1/);
  });

  test('MATCHER INTEGRITY: the negative still fires when the retired clause is spliced back in', () => {
    // The control runs against the SLICE ITSELF, not a synthetic string — the DEBUG-390
    // requirement. If this ever stops failing, the matcher below has gone vacuous.
    const slice = sliceShellFunction(stripShellComments(raw()), 'e2e_assert_default_content_size');
    const mutated = slice.replace(
      /return 1/,
      'echo "   so this was almost certainly left behind by an earlier run." >&2\n  return 1'
    );
    expect(mutated).toMatch(/almost certainly/i);
  });

  test('the executable body carries no conclusion-shaped phrasing', () => {
    const slice = sliceShellFunction(stripShellComments(raw()), 'e2e_assert_default_content_size');
    expect(slice).not.toMatch(/almost certainly|certainly left behind|must have been left/i);
  });

  test('the executable body uses the comm-matching helper, never pgrep -f', () => {
    const stripped = stripShellComments(raw());
    expect(stripped).toMatch(/e2e_maestro_jvm_pids/);
    expect(stripped).not.toMatch(/pgrep\s+-f|pkill\s+-f/);
  });

  test('the ownership helper is sourced defensively, so the three-file sandboxes still work', () => {
    // e2e-dynamic-type.test.js stages only e2e-dynamic-type/e2e-sim-device/e2e-content-size,
    // and e2e-sim-build.test.js derives its staging list from `. "$(dirname "$0")/..."`
    // lines in OTHER scripts. A hard source here breaks both.
    const stripped = stripShellComments(raw());
    expect(stripped).toMatch(/\[ -f .*e2e-driver-ownership\.sh/);
    expect(stripped).toMatch(/command -v e2e_maestro_jvm_pids/);
  });

  test('it degrades rather than erroring when the helper is absent', () => {
    // Sourced into shells under a bare `set -u`; the file sets no options of its own.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'debug640-solo-'));
    const solo = path.join(dir, 'e2e-content-size.sh');
    fs.copyFileSync(CONTENT_SIZE_SH, solo);
    const bin = path.join(dir, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, 'xcrun'), '#!/bin/sh\necho accessibility-extra-extra-extra-large\n', { mode: 0o755 });

    const r = spawnSync(
      'bash',
      ['-u', '-c', `. "${solo}"; e2e_assert_default_content_size "SIM-UDID-0001"`],
      { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } }
    );
    expect(r.status).toBe(1);
    expect(r.stderr).not.toMatch(/unbound variable|command not found: e2e_maestro_jvm_pids/);
    // The operator still gets the safe form to run by hand.
    expect(r.stderr).toMatch(/maestro\.cli\.AppKt/);
  });
});
