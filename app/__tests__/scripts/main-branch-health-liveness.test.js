/**
 * INFRA-460 — structural pins for the main-branch-health probe liveness check.
 *
 * WHY THESE ARE SOURCE-SHAPE ASSERTIONS. The subject is a GitHub Actions step
 * that only executes on a scheduled run against live GitHub API state. There is
 * nothing to render and nothing to invoke locally, so the only thing that can
 * fail here on the PR that breaks it is the shape of the YAML.
 *
 * WHAT THEY ARE ACTUALLY PROTECTING. INFRA-460's load-bearing decision is that
 * the liveness alarm shares the probe's LABEL but NOT its marker. Both notifiers
 * select with `listForRepo({labels})` then `.find(body.includes(MARKER))` and
 * close whatever they find, with no control discriminator — so aligning the two
 * markers makes each control close the other's live alarm, in both directions.
 * That is a one-keystroke regression with no runtime signal until an alarm goes
 * missing during an actual incident, which is exactly when nobody is reading.
 *
 * Per the repo's DEBUG-390 convention, every matcher below is paired with a
 * control proving it can still go red — a source-shape assertion that has
 * silently stopped matching is indistinguishable from a passing one.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CI_YML = path.join(REPO_ROOT, '.github/workflows/ci.yml');
const PROBE_YML = path.join(REPO_ROOT, '.github/workflows/main-branch-health.yml');

const PROBE_MARKER = '<!-- main-branch-health-tracker -->';
const LIVENESS_MARKER = '<!-- main-branch-health-liveness-tracker -->';

const read = (p) => fs.readFileSync(p, 'utf8');

/**
 * The `script:` body of the liveness step. Sliced rather than matched against
 * the whole file so an assertion cannot be satisfied by an unrelated step that
 * happens to contain the same token.
 */
function livenessStep(source) {
  const start = source.indexOf('- name: Cross-check main-branch-health probe liveness');
  expect(start).toBeGreaterThan(-1);
  // ci-pass is the last job, so the step runs to EOF unless another follows.
  const nextStep = source.indexOf('\n      - name: ', start + 1);
  return source.slice(start, nextStep === -1 ? source.length : nextStep);
}

describe('INFRA-460 — probe liveness cross-check', () => {
  describe('marker disjointness (the load-bearing decision)', () => {
    it('the two markers are neither equal nor substrings of one another', () => {
      expect(LIVENESS_MARKER).not.toBe(PROBE_MARKER);
      expect(LIVENESS_MARKER.includes(PROBE_MARKER)).toBe(false);
      expect(PROBE_MARKER.includes(LIVENESS_MARKER)).toBe(false);
    });

    it('CONTROL: the disjointness test can go red — a naively suffixed marker collides', () => {
      // The obvious "just append to it" variant that the real design rejects.
      const collidingVariant = `${PROBE_MARKER} liveness`;
      expect(collidingVariant.includes(PROBE_MARKER)).toBe(true);
    });

    it('ci.yml files the liveness alarm under the liveness marker', () => {
      expect(livenessStep(read(CI_YML))).toContain(LIVENESS_MARKER);
    });

    it('the liveness step never selects issues by the probe’s own marker', () => {
      const step = livenessStep(read(CI_YML));
      // Comments are stripped first: the file deliberately NAMES the probe
      // marker in prose to warn the next reader off aligning them, and a bare
      // substring check would match that warning and fail on correct code.
      const code = step
        .replace(/^\s*#.*$/gm, '')
        .replace(/^\s*\/\/.*$/gm, '');
      expect(code).toContain(LIVENESS_MARKER);
      expect(code).not.toContain(`MARKER = '${PROBE_MARKER}'`);
    });

    it('the probe still owns its original marker', () => {
      expect(read(PROBE_YML)).toContain(`const MARKER = '${PROBE_MARKER}';`);
    });

    it('both controls share the one label — same triage queue, by design', () => {
      expect(livenessStep(read(CI_YML))).toContain("LABEL = 'main-branch-health'");
      expect(read(PROBE_YML)).toContain("const LABEL = 'main-branch-health';");
    });
  });

  describe('the watcher cannot fail open', () => {
    it('ci-pass grants actions: read — a job-level block REPLACES the default', () => {
      const source = read(CI_YML);
      const jobStart = source.indexOf('\n  ci-pass:');
      expect(jobStart).toBeGreaterThan(-1);
      const permsBlock = source.slice(jobStart, source.indexOf('needs:', jobStart));
      expect(permsBlock).toMatch(/^\s*actions:\s*read\s*$/m);
      expect(permsBlock).toMatch(/^\s*issues:\s*write\s*$/m);
    });

    it('CONTROL: the permissions matcher is anchored, not a loose file-wide grep', () => {
      // Proves the regex requires the key form and would not match prose.
      expect('# we do not grant actions read here').not.toMatch(/^\s*actions:\s*read\s*$/m);
      expect('      actions: read').toMatch(/^\s*actions:\s*read\s*$/m);
    });

    it('a deleted workflow (404) alarms rather than being swallowed', () => {
      const step = livenessStep(read(CI_YML));
      expect(step).toMatch(/e\.status === 404/);
      // The 404 arm must assign the verdict, not merely warn.
      const arm = step.slice(step.indexOf('e.status === 404'));
      expect(arm.slice(0, 240)).toMatch(/silent\s*=/);
    });

    it('a dropped actions: read (403) alarms too', () => {
      expect(livenessStep(read(CI_YML))).toMatch(/e\.status === 403/);
    });

    it('an indeterminate API error leaves issue state untouched', () => {
      const step = livenessStep(read(CI_YML));
      expect(step).toContain('Leaving issue state untouched.');
      // core.warning + return, never a close.
      expect(step).toMatch(/core\.warning\([\s\S]{0,200}?Leaving issue state untouched\.'\);\s*\n\s*return;/);
    });
  });

  describe('staleness cannot be masked', () => {
    it('only scheduled runs count — a manual dispatch must not reset the clock', () => {
      expect(livenessStep(read(CI_YML))).toMatch(/event:\s*'schedule'/);
    });

    it('the threshold is 48h', () => {
      expect(livenessStep(read(CI_YML))).toMatch(/STALE_AFTER_MS\s*=\s*48\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
    });

    it('every run emits an observable age, so the arithmetic needs no 48h wait', () => {
      expect(livenessStep(read(CI_YML))).toMatch(/core\.notice\(`probe liveness:/);
    });
  });

  describe('it is a step, not a job', () => {
    it('does not appear in ci-pass needs: — a schedule-gated job would red-gate every PR', () => {
      const source = read(CI_YML);
      const jobStart = source.indexOf('\n  ci-pass:');
      const needsBlock = source.slice(
        source.indexOf('needs:', jobStart),
        source.indexOf('steps:', jobStart)
      );
      expect(needsBlock).not.toMatch(/liveness/i);
    });

    it('is not declared as a top-level job', () => {
      // Top-level jobs sit at exactly two spaces of indentation.
      expect(read(CI_YML)).not.toMatch(/^ {2}[a-z-]*liveness[a-z-]*:/mi);
    });
  });
});
