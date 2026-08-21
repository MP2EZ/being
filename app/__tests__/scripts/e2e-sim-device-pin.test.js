/**
 * DEBUG-497 — E2E_SIM_UDID is consulted BEFORE the single-booted short-circuit.
 *
 * WHY THIS EXISTS
 * ===============
 * `e2e_resolve_sim_device` returned the sole booted device before it ever read the
 * override, so a build pinned to one simulator silently installed onto another and
 * reported success. Measurements attributed to the wrong device are worse than no
 * measurements: the failure surfaced only because a post-hoc `e2e-provenance.js verify`
 * returned MISSING on the device the operator had actually named.
 *
 * The override is named in the resolver's own refusal text as the general remedy, so the
 * gap was between DOCUMENTED and ACTUAL behaviour rather than a missing feature.
 *
 * TWO REFUSALS, DELIBERATELY DISTINGUISHABLE. Both exit 3, because no caller reads this
 * function's status (every one collapses it — `|| exit 1`, `|| exit 2`, or `fail()`), so a
 * fourth code would be unobservable while risking collision with e2e-safety.sh's own 3.
 * What must differ is the MESSAGE: a pin naming a non-booted device is not ambiguity, and
 * telling an operator to shut a simulator down when their real problem is that the one
 * they asked for is not running sends them the wrong way.
 *
 * STDOUT IS A CONTRACT, NOT A LOG. All four callers capture it with `$(...)` and consume
 * a BARE UDID — `simctl install "$SIM_UDID"`, and `grep -qx "$SIM_UDID"` in e2e-safety.sh's
 * INFRA-434 vanished-vs-replaced discrimination. So the refusal arms must leave stdout
 * EMPTY and the success arms must emit the UDID with no trailing newline. This file
 * therefore does NOT reuse the trimming `sh()` helper from e2e-flow-certification.test.js:
 * a trim would hide the exact defect these assertions exist to catch.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const REPO_APP = path.resolve(__dirname, '..', '..');
const HELPER = path.join(REPO_APP, 'scripts', 'e2e-sim-device.sh');

const ONE = 'AAAA-1111\tiPhone SE (3rd generation)';
const TWO = `AAAA-1111\tiPhone SE (3rd generation)\nBBBB-2222\tiPad Pro 13-inch (M4)`;

/**
 * Source the helper, override `e2e_booted_devices` with a literal listing, resolve.
 *
 * The viewport warning is stubbed out: it shells to xcrun/plutil for attribution, which
 * makes stderr machine-dependent, and it is not what these cases pin. `e2e_booted_devices`
 * is a real shell function in the sourced file, so a later redefinition wins — that is
 * what makes AC 4's "no simulator required" achievable without refactoring the resolver.
 *
 * stdout is returned RAW. Callers below assert on trailing whitespace.
 */
function resolve(listing, { pin } = {}) {
  // `%b`, not `%s`: JSON.stringify turns the real tab and newline back into two-character
  // escapes, and the listing is TAB-delimited — `cut -f1` on a literal backslash-t splits
  // nothing and the fixture silently stops resembling simctl's output.
  const stub =
    `e2e_booted_devices() { printf '%b' ${JSON.stringify(listing)}; }; ` +
    `e2e_warn_if_not_smallest_viewport() { :; }; `;
  const res = spawnSync('/bin/bash', ['-c', `. "${HELPER}"; ${stub} e2e_resolve_sim_device gate`], {
    encoding: 'utf8',
    // Scrub the operator's own session pin. Without this the suite's verdict depends on
    // the shell it was launched from, and docs/testing/e2e-maestro.md tells operators to
    // export this very variable for the duration of a session.
    env: { ...process.env, E2E_SIM_UDID: pin === undefined ? '' : pin },
  });
  return {
    status: res.status,
    stdout: res.stdout || '',
    stderr: (res.stderr || '').trim(),
  };
}

describe('e2e_resolve_sim_device — E2E_SIM_UDID precedence (DEBUG-497)', () => {
  describe('AC 1 — a pin naming a NON-booted device refuses, at any count', () => {
    it('refuses when exactly one simulator is booted and the pin names another', () => {
      const r = resolve(ONE, { pin: 'CCCC-3333' });

      expect(r.status).not.toBe(0);
      // The whole defect: this arm used to return 0 with AAAA-1111 on stdout.
      expect(r.stdout).toBe('');
      expect(r.stderr).toMatch(/CCCC-3333/);
      expect(r.stderr).toMatch(/AAAA-1111/);
    });

    it('refuses when 2+ are booted and the pin names none of them', () => {
      const r = resolve(TWO, { pin: 'CCCC-3333' });

      expect(r.status).toBe(3);
      expect(r.stdout).toBe('');
      expect(r.stderr).toMatch(/not among the booted simulators/i);
    });
  });

  describe('AC 2 — existing behaviour preserved', () => {
    it('no pin + exactly one booted resolves it, exit 0', () => {
      const r = resolve(ONE);

      expect(r.status).toBe(0);
      expect(r.stdout).toBe('AAAA-1111');
    });

    it('no pin + 2+ booted refuses as ambiguous, exit 3', () => {
      const r = resolve(TWO);

      expect(r.status).toBe(3);
      expect(r.stdout).toBe('');
      expect(r.stderr).toMatch(/ambiguous/i);
    });

    it('a pin naming a booted device wins when exactly one is booted', () => {
      const r = resolve(ONE, { pin: 'AAAA-1111' });

      expect(r.status).toBe(0);
      expect(r.stdout).toBe('AAAA-1111');
    });

    it('a pin naming a booted device wins when 2+ are booted', () => {
      const r = resolve(TWO, { pin: 'BBBB-2222' });

      expect(r.status).toBe(0);
      expect(r.stdout).toBe('BBBB-2222');
    });

    it('treats set-but-empty as unset, so the 2+ arm still reads as ambiguous', () => {
      // e2e-safety-exit-alphabet.test.js sets E2E_SIM_UDID='' for EVERY case, including
      // the one asserting /ambiguous/i. Switching the guard to ${VAR+set} would invert
      // that suite's premise; `[ -n ... ]` semantics are load-bearing, not incidental.
      const r = resolve(TWO, { pin: '' });

      expect(r.status).toBe(3);
      expect(r.stderr).toMatch(/ambiguous/i);
    });
  });

  describe('AC 3 — the refusal reads as a pin mismatch, never as ambiguity', () => {
    it('names the remedy that actually fixes it', () => {
      const r = resolve(ONE, { pin: 'CCCC-3333' });

      expect(r.stderr).toMatch(/xcrun simctl boot/);
    });

    it('does NOT call a pin mismatch ambiguous', () => {
      // Nothing booted can be the device the operator asked for, so "shut one down to
      // disambiguate" is the wrong instruction. Different condition, different fix.
      const r = resolve(ONE, { pin: 'CCCC-3333' });

      expect(r.stderr).not.toMatch(/ambiguous/i);
    });

    it('still calls a genuine 2+ collision ambiguous', () => {
      // The falsifiability control for the assertion above: proves it discriminates
      // rather than passing because the word left the file entirely.
      const r = resolve(TWO);

      expect(r.stderr).toMatch(/ambiguous/i);
    });
  });

  describe('the pin is matched EXACTLY, against the UDID field only', () => {
    it('refuses a pin that is merely a prefix of a booted UDID', () => {
      // A half-pasted UDID is the likeliest operator error this item exists to catch.
      const r = resolve(ONE, { pin: 'AAAA' });

      expect(r.status).not.toBe(0);
      expect(r.stdout).toBe('');
    });

    it('refuses a pin that matches the NAME column instead of a UDID', () => {
      // The listing is `<udid>\t<name>`, and the matcher ran against the whole line, so
      // E2E_SIM_UDID=iPhone matched and `cut -f1` then handed back that line's UDID —
      // resolving an arbitrary device and reporting success.
      const r = resolve(TWO, { pin: 'iPhone' });

      expect(r.status).not.toBe(0);
      expect(r.stdout).toBe('');
    });
  });

  describe('stdout stays a bare UDID', () => {
    it('emits no trailing newline, so $(...) capture is exact', () => {
      const r = resolve(ONE);

      expect(r.stdout).toBe('AAAA-1111');
      expect(r.stdout).not.toMatch(/\s$/);
    });

    it('emits nothing at all on the enumeration-failure arm', () => {
      const res = spawnSync(
        '/bin/bash',
        ['-c', `. "${HELPER}"; e2e_booted_devices() { return 1; }; e2e_resolve_sim_device gate`],
        { encoding: 'utf8', env: { ...process.env, E2E_SIM_UDID: '' } }
      );

      expect(res.status).toBe(1);
      expect(res.stdout || '').toBe('');
    });
  });
});
