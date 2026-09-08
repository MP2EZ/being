/**
 * Device-only Maestro flows are UNAVAILABLE — mechanical pin (DEBUG-589)
 *
 * No Maestro version can execute a flow on a physical iPhone. Measured 2026-09-07 on
 * iPhone 16e / iOS 26.6 / Xcode 26.0.1 / team KN6FDLG98K, across 2.0.0, 2.1.0, 2.2.0,
 * 2.4.0, 2.5.1, 2.6.0, 2.6.1, 2.7.0, 2.8.0, 2.9.0 and 2.10.0 — two failure modes, no
 * survivor:
 *   >= 2.2.0  the shipped driver project declares a MaestroDriverLib framework target and
 *             the MaestroDriverLib/ directory is shipped in ZERO releases; the build dies
 *             in ~8s with no JUnit report. 2.10.0 is current latest, so upgrading cannot
 *             fix it.
 *   <= 2.1.0  the driver builds and the runner installs, but the XCUITest runner never
 *             becomes ready within a 300s MAESTRO_DRIVER_STARTUP_TIMEOUT.
 * The hardware is healthy — the runner launches by hand via `devicectl`. Simulator flows
 * are unaffected: they use a prebuilt driver and never compile.
 *
 * THIS SUITE ASSERTS ONLY THAT THE NOTICE IS PRESENT, BOUNDED, AND STILL TRUE. It asserts
 * nothing that implies the gate is healthy — the device gate is not healthy, and a pin
 * that could be read as coverage would recreate the hazard it exists to close.
 *
 * DEBUG-390 INVERTS HERE — read this before "fixing" the matching below. The house rule is
 * that source-string assertions must STRIP comments first, because this codebase names
 * anti-patterns in prose. That rule does not apply to this suite: the marker IS a comment,
 * in a YAML file whose entire header is comments. Stripping would delete the thing under
 * test and every assertion would pass vacuously. Matching is deliberately on RAW source,
 * and the vacuity controls below are what stand in for the stripping rule's protection.
 *
 * Compensating follow-ups (crisis ruling, DEBUG-589):
 *   DEBUG-590  move the keyboard-accessory REACHABILITY half into the sim suite — it is
 *              simulator-runnable today (DEBUG-506), so that loss is recoverable and is
 *              recorded as "not yet migrated", never as "unavailable".
 *   INFRA-591  attended manual device checklist for both contracts, release-gated.
 *   INFRA-592  assert the GENERATED Info.plist keeps tel/sms after plugin composition —
 *              the one dial residual the surviving jest pin cannot reach, since it reads
 *              app.json and iOS is CNG (INFRA-280).
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

const MAESTRO_DIR = path.join(__dirname, '..', '..', '.maestro');

/** Versions measured dead on 2026-09-07. A version outside this set invalidates the notice. */
const RECORDED_DEAD_VERSIONS = [
  '2.0.0', '2.1.0', '2.2.0', '2.4.0', '2.5.1',
  '2.6.0', '2.6.1', '2.7.0', '2.8.0', '2.9.0', '2.10.0',
];

const DEVICE_ONLY_FLOWS = ['crisis-988-dial.yaml', 'crisis-keyboard-accessory.yaml'];

/**
 * Structured, not prose. A reworded sentence must not be able to make the record vanish
 * while the condition it describes still holds.
 */
const MARKER =
  /^#\s*e2e-device-unavailable:\s*DEBUG-589\s+measured=(\d{4}-\d{2}-\d{2})\s+dead-versions=([0-9.]+)\.\.([0-9.]+)\s*$/m;

function readFlow(name: string): string {
  return fs.readFileSync(path.join(MAESTRO_DIR, name), 'utf8');
}

describe('DEBUG-589 — the device-unavailability notice', () => {
  describe('vacuity controls (these guard every assertion below)', () => {
    it('the marker regex fires against a known-GOOD literal', () => {
      expect(
        MARKER.test('# e2e-device-unavailable: DEBUG-589 measured=2026-09-07 dead-versions=2.0.0..2.10.0'),
      ).toBe(true);
    });

    it('the marker regex does NOT fire against a near-miss literal', () => {
      // Prose that mentions the concept must not satisfy a pin about the record existing.
      expect(MARKER.test('# device flows are unavailable, see DEBUG-589')).toBe(false);
      expect(MARKER.test('# e2e-device-unavailable: DEBUG-589')).toBe(false);
    });

    it.each(DEVICE_ONLY_FLOWS)('%s is a real, non-trivial file', (name) => {
      // A rename or a move must go RED here rather than silently satisfying nothing.
      expect(readFlow(name).length).toBeGreaterThan(1000);
    });
  });

  describe.each(DEVICE_ONLY_FLOWS)('%s', (name) => {
    it('carries the structured unavailability marker', () => {
      expect(readFlow(name)).toMatch(MARKER);
    });

    it('the marker carries its measured bounds and they match the recorded set', () => {
      const m = MARKER.exec(readFlow(name));
      expect(m).not.toBeNull();
      const [, measured, low, high] = m as RegExpExecArray;
      expect(measured).toBe('2026-09-07');
      expect(low).toBe(RECORDED_DEAD_VERSIONS[0]);
      expect(high).toBe(RECORDED_DEAD_VERSIONS[RECORDED_DEAD_VERSIONS.length - 1]);
    });

    it('states the unavailability unhedged, and names the hardware as healthy', () => {
      const src = readFlow(name);
      expect(src).toMatch(/No Maestro version can\s*\n?#?\s*execute any flow on a physical iPhone|No Maestro version can execute any flow on a physical iPhone/);
      expect(src).toMatch(/HARDWARE IS (?:HEALTHY|NOT THE PROBLEM)/);
    });

    it('is not deleted, renamed or skipped — the flow body still exists', () => {
      const src = readFlow(name);
      expect(src).toMatch(/^appId:\s*fyi\.being\.app$/m);
      expect(src).toMatch(/^\s*-\s+safety-device-only\s*$/m);
    });
  });

  it('crisis-988-dial rebuts the PRIMARY/SUPPLEMENTARY reading rather than leaning on it', () => {
    // The pre-existing header calls the jest pin PRIMARY and this flow SUPPLEMENTARY.
    // Post-DEBUG-589 that phrasing reads as reassurance that nothing was lost, so the
    // notice must say in the same breath that it is not subsumption.
    const src = readFlow('crisis-988-dial.yaml');
    expect(src).toMatch(/do NOT mean the dial path was verified/i);
    expect(src).toMatch(/do not cover runtime\s*\n?#?\s*behaviour on hardware|not cover runtime behaviour on hardware/i);
  });

  it('crisis-keyboard-accessory records a RECOVERABLE loss, never a permanent one', () => {
    // Ruling: flattening this into the dial's "unavailable" would launder a movable gap
    // into a permanent one. Its reachability half is simulator-runnable today (DEBUG-506).
    const src = readFlow('crisis-keyboard-accessory.yaml');
    expect(src).toMatch(/SIMULATOR-RUNNABLE NOW/);
    expect(src).toMatch(/NOT YET MIGRATED/);
    expect(src).toMatch(/DEBUG-590/);
  });

  it('the set of safety-device-only flows is EXACTLY the two that were ruled on', () => {
    // Without this, a third device-only flow inherits the unavailability silently, with
    // nobody ruling on it.
    const tagged = fs
      .readdirSync(MAESTRO_DIR)
      .filter((f) => f.endsWith('.yaml'))
      .filter((f) => /^\s*-\s+safety-device-only\s*$/m.test(readFlow(f)))
      .sort();
    expect(tagged).toEqual([...DEVICE_ONLY_FLOWS].sort());
  });

  describe('drift arm — the notice must not outlive the condition', () => {
    // CI is 100% ubuntu-latest and has no maestro, so this arm is skipped there. The skip
    // is asserted to be DELIBERATE (maestro genuinely absent) rather than the invocation
    // being broken, which is the failure mode a bare try/catch would hide.
    let installed: string | null = null;
    let resolutionFailed = false;

    try {
      const out = execFileSync('maestro', ['--version'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const line = out.split('\n').map((l) => l.trim()).filter((l) => /^\d+\.\d+\.\d+$/.test(l)).pop();
      if (line) installed = line;
      else resolutionFailed = true;
    } catch {
      installed = null;
    }

    it('either resolved a version or maestro is genuinely absent — never a broken invocation', () => {
      expect(resolutionFailed).toBe(false);
    });

    it('any installed maestro is inside the recorded-dead set', () => {
      if (installed === null) {
        // Deliberate skip: no maestro on PATH (CI). Every other assertion still ran.
        return;
      }
      expect(RECORDED_DEAD_VERSIONS).toContain(installed);
    });
  });
});
