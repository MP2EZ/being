/**
 * The keyboard pre-flight's SCOPING predicate (DEBUG-506).
 *
 * WHY THE PREDICATE AND NOT THE SEEDING. The seeding itself is a `defaults` write plus a
 * read-back against a live simulator, which the harness cannot stand in for. What can go
 * wrong silently is the SCOPE: the pre-flight only runs for flows that can put a keyboard
 * on screen, so a predicate that misses a flow leaves that flow to meet iOS's QuickPath
 * tutorial where the keyboard should be — a false RED aimed at a healthy app.
 *
 * The near-miss this pins: the obvious predicate is `inputText`, and it is wrong.
 * `crisis-keyboard-accessory.yaml` taps into a field and asserts WITHOUT typing, so an
 * inputText-only scan skips seeding for the one flow the seeding exists to serve. Same
 * shape as the defect DEBUG-506 fixes — correct-looking at every site, absent where it
 * matters.
 *
 * Read out of the script rather than re-typed, so this cannot pass against a predicate the
 * gate no longer uses.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '../..');
const SAFETY_SH = path.join(APP_ROOT, 'scripts/e2e-safety.sh');
const MAESTRO = path.join(APP_ROOT, '.maestro');

/** The live predicate, lifted from the script. */
function keyboardMarkers() {
  const src = fs.readFileSync(SAFETY_SH, 'utf8');
  const m = src.match(/^KEYBOARD_MARKERS='([^']+)'/m);
  if (!m) throw new Error('KEYBOARD_MARKERS not found in e2e-safety.sh');
  return new RegExp(m[1]);
}

const raises = (flow) =>
  keyboardMarkers().test(fs.readFileSync(path.join(MAESTRO, flow), 'utf8'));

describe('DEBUG-506 — keyboard pre-flight scoping', () => {
  it('is still present in the script at all', () => {
    // If the block is removed, this fails loudly rather than the suite going quietly green
    // on a predicate nothing consults.
    expect(() => keyboardMarkers()).not.toThrow();
    expect(fs.readFileSync(SAFETY_SH, 'utf8')).toContain('DidShowContinuousPathIntroduction');
  });

  it('selects the flow that taps a field WITHOUT typing', () => {
    // The whole point. An `inputText`-only predicate fails exactly here.
    expect(raises('crisis-keyboard-accessory.yaml')).toBe(true);
    expect(fs.readFileSync(path.join(MAESTRO, 'crisis-keyboard-accessory.yaml'), 'utf8'))
      .not.toMatch(/^\s*-\s*inputText:/m);
  });

  it('selects the keyboard-asserting flow that runs in the default suite', () => {
    // journal-crisis-scan asserts UIKeyboardLayoutStar Preview and is IN `e2e:safety`, so
    // an unseeded simulator makes it red against a healthy app.
    expect(raises('journal-crisis-scan.yaml')).toBe(true);
  });

  it('does NOT select flows that never raise a keyboard', () => {
    // Scope discipline: this simulator is shared across worktrees, so device-wide state a
    // run has no use for is not that run's to write.
    expect(raises('q9-single-alert.yaml')).toBe(false);
    expect(raises('crisis-button-reachability.yaml')).toBe(false);
  });

  it('does not match a tags-only fixture, so the harness stays out of scope', () => {
    // e2e-sim-build.test.js drives the gate against a stub simulator. An unscoped
    // pre-flight exits 2 there and reds 28 unrelated tests — this is how that is prevented.
    expect(keyboardMarkers().test('tags:\n  - safety\n')).toBe(false);
  });

  it('the predicate can still go red — it is not matching everything', () => {
    // Comment-stripping-plus-narrow-regex's twin failure: a matcher so broad it selects
    // every flow proves nothing about scope.
    const all = fs.readdirSync(MAESTRO).filter((f) => f.endsWith('.yaml'));
    const matched = all.filter((f) => raises(f));
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.length).toBeLessThan(all.length);
  });
});
