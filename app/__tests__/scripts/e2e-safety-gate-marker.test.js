/**
 * DEBUG-432 — the mid-suite substitution watch must RE-RESOLVE the app container.
 *
 * THE DEFECT THIS EXISTS FOR
 * ==========================
 * INFRA-434's `e2e_assert_gate_target()` read a provenance-marker path that the pre-flight
 * had resolved ONCE, minutes earlier, via `xcrun simctl get_app_container`. Its own comment
 * reasoned that binding to the container path was safe because
 *
 *     "the 'simctl mints a new UUID per fresh install' claim is asserted in this repo but
 *      verified nowhere in it, so nothing here depends on it being true."
 *
 * The claim is TRUE and the watch did depend on it. Verified on iOS 18.6, one simulator,
 * one build, nothing else running — a single `launchApp: { clearState: true }` moved the
 * bundle container:
 *
 *     before  …/Application/F52767BD-…/fyi.being.app-1786869100818.app
 *     after   …/Application/EC9AA845-…/fyi.being.app-1786869250864.app
 *
 * Maestro implements iOS `clearState` as an uninstall+reinstall, and EVERY safety flow
 * opens with one. So the cached path was dead by the first command of the first flow, the
 * marker read came back empty, and the "vanished" arm reported a healthy, passing suite as
 * VOID. Not a flow failure and not a pass — inconclusive, which blocks the merge.
 *
 * Reproduced end to end while closing DEBUG-432: `crisis-button-reachability` passed in
 * 1m58s on a FRESHLY ERASED simulator with a fresh clean-provenance build, and the gate
 * still returned VOID. Every `/b-close` reaching Phase 2.5 would have done the same. A gate
 * that cannot return PASS is not a strict gate; it is an outage, and outages are what train
 * the `--skip-e2e` reflex the gate exists to prevent.
 *
 * WHAT THIS PINS, AND WHAT IT DELIBERATELY DOES NOT
 * =================================================
 * It pins that the watch re-resolves the container BEFORE reading, and that the re-resolve
 * precedes the read in program order. It does NOT pin what counts as substitution: the
 * comparison is still the marker's BYTES, which is correct and unchanged — the marker is
 * content-addressed (INFRA-436), so a peer's binary swapped in underneath carries a
 * different repoRoot/head/treeHash and still trips the "replaced" arm wherever the
 * container lives.
 *
 * Source-shape rather than executable, for one reason: `e2e_assert_gate_target` lives
 * inside a script that runs on source, so it cannot be `.`-sourced the way
 * e2e-driver-ownership.test.js sources its helper. Extracting it is a real refactor and is
 * not smuggled into a crisis-screen fix. If it is ever extracted, replace this with a
 * stubbed-`xcrun` execution test — that would be strictly stronger.
 *
 * INFRA-466 — THE CACHED PATH IS GONE, AND THESE PINS WERE RE-EXPRESSED
 * ====================================================================
 * The design narrated above kept a resolved absolute path (`GATE_MARKER`) and overwrote it
 * only when the per-check re-resolve SUCCEEDED. A failed re-resolve therefore fell back to
 * the pre-flight's path; if that container was still readable, the bytes matched and the
 * guard returned 0 — continuing on a target it could not verify. INFRA-466 removed the
 * variable entirely: only the FILENAME is retained and the container is re-resolved every
 * check, which makes the fallback impossible by construction rather than merely unreachable.
 *
 * That necessarily deleted the literal `cat "$GATE_MARKER"` this file used to locate the
 * read. The ordering property is UNCHANGED and still pinned — only the expression it is
 * anchored on moved, to `cat "$_app/$GATE_MARKER_NAME"`. This is a re-pin, not a weakening,
 * and the negative pin below is what makes that claim checkable: it fails if the cached
 * variable ever returns.
 *
 * The behavioural counterpart lives in e2e-sim-build.test.js's `INFRA-466` block, which
 * drives the real script through a failed container lookup with the stale container still
 * readable. Prefer adding to that block over adding shape assertions here.
 */

const fs = require('fs');
const path = require('path');

const SCRIPT = path.join(__dirname, '../../scripts/e2e-safety.sh');
const source = fs.readFileSync(SCRIPT, 'utf8');

/** The body of `e2e_assert_gate_target()`, up to its closing brace at column 0. */
function gateAssertBody(text) {
  const start = text.indexOf('e2e_assert_gate_target() {');
  if (start === -1) return '';
  const end = text.indexOf('\n}', start);
  return end === -1 ? '' : text.slice(start, end);
}

describe('DEBUG-432 — e2e_assert_gate_target re-resolves the container before reading', () => {
  const body = gateAssertBody(source);

  /**
   * Proof of liveness. A source-shape assertion whose extractor silently returns '' passes
   * every `not.toMatch` forever. This fails if the function is renamed, extracted, or if
   * the brace-matching heuristic stops finding a body — all of which should force a human
   * to revisit the pins below rather than let them rot green.
   */
  test('the extractor still finds a non-trivial function body', () => {
    expect(body.length).toBeGreaterThan(200);
    expect(body).toContain('GATE_MARKER_NAME');

    // And the matcher used below must be able to FAIL: prove it against a known-bad body
    // that reads a cached path with no re-resolution.
    const knownBad = 'e2e_assert_gate_target() {\n  _now="$(cat "$GATE_MARKER")"\n';
    expect(knownBad).not.toMatch(/get_app_container/);
  });

  test('it re-resolves the container via get_app_container', () => {
    expect(body).toMatch(/get_app_container/);
  });

  test('the re-resolve happens BEFORE the marker is read', () => {
    // Ordering is the whole property. A re-resolve placed after the `cat` would satisfy a
    // bare "contains get_app_container" assertion while changing nothing.
    // INFRA-466: anchored on the re-resolved local, since no cached path exists any more.
    const resolveAt = body.indexOf('get_app_container');
    const readAt = body.indexOf('cat "$_app/$GATE_MARKER_NAME"');

    expect(resolveAt).toBeGreaterThan(-1);
    expect(readAt).toBeGreaterThan(-1);
    expect(resolveAt).toBeLessThan(readAt);
  });

  test('the marker FILENAME is tracked separately from the resolved path', () => {
    // Re-resolution needs the bare filename; if it were only ever concatenated into a
    // resolved path at pre-flight there would be nothing to rebuild the path from.
    expect(source).toMatch(/GATE_MARKER_NAME=/);
  });

  /**
   * INFRA-466 — the fallback must be impossible by construction, not merely unreachable.
   * A cached absolute path is the only thing a failed re-resolve could fall back TO, so
   * its absence is the property worth pinning. Both regexes deliberately exclude the
   * `_NAME` / `_SNAPSHOT` suffixed variables, which are the shape that must survive.
   */
  test('no cached container path survives anywhere in the script', () => {
    const stripped = source
      .split('\n')
      .filter((l) => !/^\s*#/.test(l)) // prose still discusses the retired design
      .join('\n');

    expect(stripped).not.toMatch(/\bGATE_MARKER=(?!")/);
    expect(stripped).not.toMatch(/\bGATE_MARKER="\$/);
    expect(stripped).not.toMatch(/\$GATE_MARKER"/);
    expect(stripped).not.toMatch(/\$\{GATE_MARKER\}/);

    // The matcher must be able to fire — comment-stripping plus a narrow regex is exactly
    // the combination that can silently match nothing (DEBUG-390).
    expect('  GATE_MARKER="$APP/$GATE_MARKER_NAME"').toMatch(/\bGATE_MARKER="\$/);
    expect('  _now="$(cat "$GATE_MARKER")"').toMatch(/\$GATE_MARKER"/);
    // …and must NOT fire on the variables that legitimately remain.
    expect('GATE_MARKER_NAME=""').not.toMatch(/\bGATE_MARKER=(?!")/);
    expect('  _now="$(cat "$_app/$GATE_MARKER_NAME")"').not.toMatch(/\$GATE_MARKER"/);
    expect(stripped.length).toBeGreaterThan(1000);
  });

  test('a genuine uninstall still reads empty (the GONE arm keeps its teeth)', () => {
    // The re-resolve must not paper over a real disappearance: get_app_container failing
    // has to leave the path unusable rather than falling back to something readable.
    expect(body).toMatch(/\|\|[[:space:]]*true|\|\| true/);
    expect(body).toMatch(/GATE_REPLACED_KIND="vanished"/);
  });
});
