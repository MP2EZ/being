/**
 * Maestro version pin (DEBUG-589)
 *
 * The safety gate's verdict is only meaningful against a KNOWN Maestro. A version
 * change shifts behaviour across every flow at once, so an unpinned gate cannot
 * distinguish "a flow regressed" from "the toolchain moved" — and `brew upgrade`
 * moves it silently, with no diff and no reviewer. Before DEBUG-589 nothing in the
 * repo read `maestro --version` at all; `docs/testing/e2e-maestro.md` said only
 * "should print 2.x.x", which admits ten minor versions.
 *
 * Two halves, and both must hold or the pin is decorative:
 *   1. a declared version exists and is exact, and
 *   2. `e2e-safety.sh` actually enforces it, fail-closed, before running any flow.
 *
 * Per DEBUG-390, the source-string half strips comments before matching (this repo
 * deliberately names anti-patterns in prose) and asserts prop-shaped patterns rather
 * than bare identifiers — plus a control proving each matcher can still fire, because
 * comment-stripping and a narrow regex is exactly the pair that silently matches
 * nothing.
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..', '..');
const pkg = require(path.join(APP_DIR, 'package.json'));
const SCRIPT_PATH = path.join(APP_DIR, 'scripts', 'e2e-safety.sh');

/**
 * Strip SHELL line comments so prose describing the rule cannot satisfy the rule.
 *
 * Deliberately NOT the JS stripper other suites use. Shell has no block comments, and
 * applying the C-style block-comment rule to this file collapses it from ~95k to ~19k by
 * matching across unrelated glob and path fragments — every negative assertion then passes
 * vacuously. The length floor below is what catches that; keep both.
 */
function stripComments(src) {
  return src.replace(/^\s*#.*$/gm, '');
}

describe('Maestro version pin (DEBUG-589)', () => {
  describe('the declared pin', () => {
    it('declares maestro.pinnedVersion in app/package.json', () => {
      expect(typeof pkg.maestro?.pinnedVersion).toBe('string');
    });

    it('pins an EXACT version, not a range — a range is not a pin', () => {
      expect(pkg.maestro?.pinnedVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('records why device flows are unavailable, so the pin is not read as full coverage', () => {
      expect(typeof pkg.maestro?.deviceFlowsUnavailableReason).toBe('string');
      expect(pkg.maestro.deviceFlowsUnavailableReason.length).toBeGreaterThan(40);
    });
  });

  describe('enforcement in e2e-safety.sh', () => {
    const raw = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const src = stripComments(raw);

    it('leaves a non-trivial script body after comment stripping', () => {
      // Guards the failure mode where stripping eats the file and every
      // negative assertion below passes vacuously.
      expect(src.length).toBeGreaterThan(5000);
    });

    it('reads the pinned version from package.json rather than hardcoding it', () => {
      const matcher = /maestro\s*\.\s*pinnedVersion|maestro\?\.\s*pinnedVersion|\.maestro\.pinnedVersion/;
      expect(matcher.test('require("./package.json").maestro.pinnedVersion')).toBe(true); // control
      expect(src).toMatch(matcher);
    });

    it('invokes `maestro --version` to learn the installed version', () => {
      const matcher = /maestro\s+--version/;
      expect(matcher.test('maestro --version')).toBe(true); // control
      expect(src).toMatch(matcher);
    });

    it('refuses the run on mismatch — exits non-zero rather than warning', () => {
      const matcher = /MAESTRO_VERSION_MISMATCH|E2E_ALLOW_MAESTRO_VERSION_DRIFT/;
      expect(matcher.test('MAESTRO_VERSION_MISMATCH')).toBe(true); // control
      expect(src).toMatch(matcher);
    });
  });
});
