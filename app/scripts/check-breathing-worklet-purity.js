#!/usr/bin/env node
/**
 * Structural guard for the breathing-circle animation path (INFRA-306, Layer A).
 *
 * WHAT THIS IS — AND IS NOT
 * =========================
 * This is NOT a frame-rate measurement, and it does NOT enforce the 60fps
 * budget. It cannot: every job in .github/workflows/ci.yml runs on
 * `ubuntu-latest`, so nothing in CI can render a frame.
 *
 * What it IS: a structural proxy that FAILS when the *shape* of the already-fixed
 * PERF-01/PERF-02 regression (commit ff591f3a) reappears on the breathing
 * animation path. It pins the fix in place. The actual on-device measurement is
 * INFRA-309, which is blocked on naming a calibration handset.
 *
 * Stating that boundary plainly is deliberate. MAINT-307 had to correct two
 * separate docs that claimed these budgets were "enforced on-device via the
 * Maestro flows" when they were not, and a doc asserting a safety control that
 * does not exist is worse than a documented gap — it stops anyone from building
 * the real one.
 *
 * THE BUG CLASS
 * =============
 * BreathingCircle animates entirely in Reanimated worklets on the UI thread.
 * PERF-02 removed per-frame JS sampling from it: the old implementation ran
 * `runOnJS` several times per second out of a `useAnimatedStyle` body, which
 * (a) hopped the bridge on every frame and (b) used float-equality phase checks
 * that could double-fire cycle-complete. See the comment at BreathingCircle.tsx
 * ~line 154.
 *
 * WHAT IS DELIBERATELY *NOT* FLAGGED
 * ==================================
 * This matters as much as what is. A guard born red gets loosened, not obeyed.
 *   - `runOnJS` inside a `withTiming` COMPLETION callback. That fires once per
 *     cycle leg and is precisely the pattern PERF-02 replaced the bad one with.
 *     Banning it would ban the fix.
 *   - `setInterval(..., 1000)` for the hold-pattern countdown, and the 100ms
 *     inter-cycle `setTimeout` restart. Both are per-cycle, not per-frame.
 *   - `cancelAnimationFrame` — teardown, not sampling.
 *
 * ESCAPE HATCH
 * ============
 * Put `// breathing-worklet-skip: <reason>` on the line directly above an
 * intentional violation. Expect zero usages; if this starts accumulating, the
 * rule is wrong and should be fixed rather than papered over.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');

/**
 * The breathing animation path, listed explicitly rather than glob-discovered.
 * An explicit list is reviewable: adding a file to the guarded set should be a
 * visible diff, not a silent consequence of where someone put a new component.
 */
const ANIMATION_PATH_FILES = [
  'src/features/practices/shared/components/BreathingCircle.tsx',
  'src/features/practices/shared/components/SharedBreathingScreen.tsx',
];

/** Reanimated hooks whose callback bodies run on the UI thread every frame. */
const WORKLET_HOOKS = ['useAnimatedStyle', 'useDerivedValue', 'useAnimatedReaction'];

const SKIP_DIRECTIVE_RE = /\/\/\s*breathing-worklet-skip\b/;
const RUN_ON_JS_RE = /\brunOnJS\s*\(/;
// `setFoo(` / `setState(` — React state setters. Excludes setTimeout/setInterval
// (handled separately and mostly legitimate here) and shared-value `.value =`.
const STATE_SETTER_RE = /\bset(?!Timeout\b|Interval\b|Immediate\b)[A-Z]\w*\s*\(/;
// Sampling, not teardown: `cancelAnimationFrame` must not match.
const RAF_RE = /(^|[^.\w])requestAnimationFrame\s*\(/;

const MEMO_EXPORT_RE = /export\s+default\s+React\.memo\s*\(/;
const BARE_DEFAULT_EXPORT_RE = /export\s+default\s+(?!React\.memo)/;

/**
 * Strip line and block comments so a rule cannot be tripped by prose. Crude but
 * adequate for the file shapes here, and deliberately preserves line count so
 * reported line numbers stay accurate.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

/**
 * Given the index of a hook name, return the source slice spanning its full
 * balanced call expression. Over-scoping into the dependency array is harmless:
 * a deps array contains identifiers, not calls.
 * Returns null when the parens never balance (malformed/truncated source).
 */
function balancedCallSlice(source, hookNameIdx) {
  const open = source.indexOf('(', hookNameIdx);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return null;
}

/** Line number (1-indexed) of a character offset. */
function lineOf(source, idx) {
  return source.slice(0, idx).split('\n').length;
}

/** True when the line directly above `lineNo` (1-indexed) carries the skip directive. */
function hasSkipDirective(rawLines, lineNo) {
  const prev = rawLines[lineNo - 2];
  return prev !== undefined && SKIP_DIRECTIVE_RE.test(prev);
}

/**
 * Analyze one file's source. Pure — no fs, no process.exit — so it is testable
 * against fixtures. Returns an array of human-readable violation strings;
 * empty means clean.
 *
 * @param {string} source   file contents
 * @param {string} baseName file basename, e.g. 'BreathingCircle.tsx'
 * @returns {string[]}
 */
function analyzeSource(source, baseName) {
  const violations = [];
  const rawLines = source.split('\n');
  const code = stripComments(source);

  // --- Rule 1 & 2: no per-frame JS hop out of a worklet hook body ------------
  for (const hook of WORKLET_HOOKS) {
    const hookRe = new RegExp(`\\b${hook}\\s*\\(`, 'g');
    let match;
    while ((match = hookRe.exec(code)) !== null) {
      const slice = balancedCallSlice(code, match.index);
      if (!slice) continue;
      const lineNo = lineOf(code, match.index);
      if (hasSkipDirective(rawLines, lineNo)) continue;

      if (RUN_ON_JS_RE.test(slice)) {
        violations.push(
          `${baseName}:${lineNo} — runOnJS inside a ${hook} body. That hops the ` +
            `bridge on every frame (the PERF-02 regression). Move the JS call to a ` +
            `withTiming completion callback so it fires once per cycle leg.`
        );
      }
      if (STATE_SETTER_RE.test(slice)) {
        violations.push(
          `${baseName}:${lineNo} — React state setter inside a ${hook} body. That ` +
            `re-renders on every frame. Drive UI from shared values instead.`
        );
      }
    }
  }

  // --- Rule 3: no JS-thread frame sampling -----------------------------------
  rawLines.forEach((line, i) => {
    const stripped = stripComments(line);
    if (!RAF_RE.test(stripped)) return;
    if (hasSkipDirective(rawLines, i + 1)) return;
    violations.push(
      `${baseName}:${i + 1} — requestAnimationFrame on the animation path. This ` +
        `samples the JS thread, which is the wrong thread for a Reanimated worklet ` +
        `animation, and re-adds the per-frame cost PERF-02 removed.`
    );
  });

  // --- Rules 4 & 5: BreathingCircle's memoization contract -------------------
  // Scoped to BreathingCircle: these pin the specific props-stability fix, and
  // applying them to every animation-path file would be meaningless.
  if (baseName === 'BreathingCircle.tsx') {
    if (!MEMO_EXPORT_RE.test(code) && BARE_DEFAULT_EXPORT_RE.test(code)) {
      violations.push(
        `${baseName} — default export is no longer wrapped in React.memo. Without ` +
          `it every parent re-render reconciles the breathing circle mid-animation.`
      );
    }
    for (const constName of ['DEFAULT_PATTERN', 'DEFAULT_PHASE_TEXT']) {
      const declRe = new RegExp(`^\\s*const\\s+${constName}\\b`, 'm');
      if (!declRe.test(code)) {
        violations.push(
          `${baseName} — module-scope const ${constName} is missing. Inlining it as ` +
            `a default prop creates a new object identity every render, which ` +
            `defeats React.memo and undoes the PERF-01 fix.`
        );
      }
    }
  }

  return violations;
}

function main() {
  const allViolations = [];
  const missing = [];

  for (const rel of ANIMATION_PATH_FILES) {
    const abs = path.join(APP_ROOT, rel);
    if (!fs.existsSync(abs)) {
      // A guarded file that vanished is itself a failure: the guard would
      // otherwise silently pass over a renamed/deleted animation path.
      missing.push(rel);
      continue;
    }
    const src = fs.readFileSync(abs, 'utf-8');
    for (const v of analyzeSource(src, path.basename(rel))) {
      allViolations.push(`  ${path.dirname(rel)}/${v}`);
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ Breathing-worklet purity check failed:\n');
    console.error(
      `Guarded file(s) not found:\n${missing.map((m) => `  ${m}`).join('\n')}\n\n` +
        'If a file moved, update ANIMATION_PATH_FILES in\n' +
        'app/scripts/check-breathing-worklet-purity.js so the path stays guarded.\n'
    );
    process.exit(1);
  }

  if (allViolations.length > 0) {
    console.error('\n❌ Breathing-worklet purity check failed:\n');
    console.error(allViolations.join('\n\n'));
    console.error(
      '\nThis guard pins the PERF-01/PERF-02 fix (commit ff591f3a) in place. It is a\n' +
        'structural proxy — it does NOT measure frames. The on-device 60fps\n' +
        'measurement is INFRA-309.\n\n' +
        'If a violation is genuinely intentional, add\n' +
        '`// breathing-worklet-skip: <reason>` directly above it.\n'
    );
    process.exit(1);
  }

  console.log(
    `✅ Breathing animation path is worklet-pure across ${ANIMATION_PATH_FILES.length} file(s) ` +
      '(structural proxy; frame rate itself is unmeasured — INFRA-309).'
  );
}

if (require.main === module) {
  main();
}

module.exports = { analyzeSource, ANIMATION_PATH_FILES };
