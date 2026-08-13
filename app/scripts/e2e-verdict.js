#!/usr/bin/env node
/**
 * DEBUG-392 — adjudicate one Maestro flow from its JUnit report.
 *
 * WHY THIS EXISTS
 * ===============
 * `e2e-safety.sh` used to decide a flow's fate from `maestro test`'s exit code
 * alone. A process that wedges never produces one. On 2026-08-08 the harness sat
 * ~80 minutes in `Maestro.clearAppState` and was killed, emitting no verdict —
 * and `/b-close` Phase 2.5 routes the merge decision on that exit code. This
 * helper is the second, file-based channel, so the gate can distinguish "the
 * flow failed" from "the harness never reported".
 *
 * WHY JUNIT AND NOT commands-*.json
 * =================================
 * The debug artifact truncates at the failing command (53 entries vs 83 on a
 * pass, measured on this machine's corpus), so a run killed mid-flow yields
 * all-COMPLETED-and-short — indistinguishable from a pass to any "no FAILED
 * node" rule without a command-count invariant that breaks the day a flow gains
 * a top-level conditional. `metadata.status` is also an internal name: rename
 * it and that rule goes vacuously true, degrading the gate to always-pass.
 *
 * A JUnit report is a published schema, is written only by a run that reaches
 * the end, and states the outcome positively. A killed run leaves NO file —
 * and absence is unambiguous where truncation is not. The failure class stops
 * being representable instead of being guarded against.
 *
 * FAIL-CLOSED. Every ambiguous input resolves to a non-PASS token. The caller
 * runs under `set -u` without `-e`/`pipefail`, so a crash here yields an empty
 * string on stdout; its `case` must treat empty as a refusal too. Same shape as
 * the provenance verdict at e2e-safety.sh:189-191.
 *
 * WHY REGEX AND NOT AN XML PARSER
 * ===============================
 * The repo carries no XML dependency and this gate must not gain one for a
 * document produced by a single known generator. The scan is deliberately
 * biased: anything that looks like a failure counts as one, so a false read
 * errs toward refusing a merge rather than allowing one. The one place that
 * bias is NOT safe — concluding "no failures" from a document we failed to
 * understand — is covered by NO_TESTCASE, which demands positive evidence that
 * a testcase was actually parsed before any PASS is possible.
 */

const fs = require('fs');

const VERDICT = {
  /** Report parsed, names this flow, contains a testcase, reports no failure. */
  PASS: 'PASS',
  /** Report parsed and states a failure or error. */
  FAIL: 'FAIL',
  /** No file, or an empty one — the wedged/killed case. */
  NO_REPORT: 'NO_REPORT',
  /** Present but not a JUnit document we recognise. */
  UNPARSEABLE: 'UNPARSEABLE',
  /**
   * Well-formed but carries no <testcase>. The falsifiability guard: if Maestro
   * renames the element, this fires instead of a silent green. Without it,
   * "found no failures" would be true of a document containing nothing at all.
   */
  NO_TESTCASE: 'NO_TESTCASE',
  /**
   * The report does not name the flow we ran. ~/.maestro/tests is global and
   * this machine runs several worktrees against one simulator, so adjudicating
   * a neighbouring session's green report is a live hazard, not a hypothetical.
   */
  FLOW_MISMATCH: 'FLOW_MISMATCH',
};

/** Loose identity match: Maestro may name a case by slug, file path, or title. */
function normalize(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * @param {string} reportPath  Path to the JUnit XML this invocation was told to write.
 * @param {string} flow        Flow slug (e.g. 'crisis-button-reachability').
 * @param {string[]} aliases   Additional acceptable identifiers (e.g. the YAML `name:`),
 *                             so a generator that titles the case rather than slugging it
 *                             does not read as another session's report.
 */
function adjudicate(reportPath, flow, aliases = []) {
  let xml;
  try {
    xml = fs.readFileSync(reportPath, 'utf8');
  } catch {
    return VERDICT.NO_REPORT;
  }
  if (!xml || !xml.trim()) return VERDICT.NO_REPORT;

  // Recognition is separate from adjudication on purpose: a Java stack trace
  // where the report should be must not fall through to "no failures found".
  if (!/<testsuite\b/.test(xml) && !/<testcase\b/.test(xml)) return VERDICT.UNPARSEABLE;

  const cases = xml.match(/<testcase\b/g) || [];
  if (cases.length === 0) return VERDICT.NO_TESTCASE;

  // Identity before outcome. A failing report for a flow we did not run is a
  // harness/concurrency problem, and labelling it FAIL would send the reader
  // hunting for a regression in the wrong flow.
  const haystack = normalize(xml);
  const wanted = [flow, ...aliases].filter(Boolean).map(normalize);
  if (!wanted.some((w) => w && haystack.includes(w))) return VERDICT.FLOW_MISMATCH;

  // Two independent failure signals; either alone is sufficient. The element is
  // the normal one; the attribute covers a generator that summarises without
  // emitting children.
  if (/<(failure|error)\b/.test(xml)) return VERDICT.FAIL;
  for (const tag of xml.match(/<testsuite\b[^>]*>/g) || []) {
    for (const attr of ['failures', 'errors']) {
      const m = tag.match(new RegExp(`\\b${attr}\\s*=\\s*"(\\d+)"`));
      if (m && Number(m[1]) > 0) return VERDICT.FAIL;
    }
  }

  return VERDICT.PASS;
}

const DIAGNOSIS = {
  /** A failing assertion's hierarchy shows openCrisisUrl's manual-dial alert. */
  DIAL_FALLBACK: 'DIAL_FALLBACK',
  /** Nothing this matcher can speak to. Saying nothing is the correct default. */
  NONE: 'NONE',
};

/**
 * openCrisisUrl.ts's manual-dial alert title. App-owned, and on the crisis-button path
 * nothing else renders it — which is what makes it a witness rather than a heuristic.
 */
const MANUAL_DIAL_ALERT = 'Unable to Call';

/**
 * DEBUG-392 — did the DEBUG-341 not-ready fallback fire during this failure?
 *
 * The filed defect was a tap on `crisis-button-root` that backgrounded the app instead
 * of opening CrisisResources, with no crash report. Reaching "the fallback at
 * RootCrisisButton.tsx:132-167 dialled 988" took a full investigation cycle, and the run
 * that produced it is gone. This makes the next occurrence say so itself.
 *
 * WHY hierarchyRoot AND NOTHING ELSE
 * ==================================
 * Two independent reasons, both of which a whole-file grep gets wrong:
 *
 *   1. The same DEBUG-392 change added `notVisible: "Unable to Call"` to 13 sites in
 *      crisis-button-reachability.yaml. Maestro embeds every command's selector in this
 *      artifact, so the literal string is now present in EVERY run of that flow, passing
 *      or failing. Grepping the file would report the dial fallback on every failure of
 *      any kind, forever.
 *   2. `error.hierarchyRoot` is present only on a genuine assertion failure. An
 *      infrastructure failure — the `Failed to connect to /127.0.0.1:<port>` class, 239+
 *      per run in six zero-artifact runs on 2026-08-12 — carries `error.cause` and no
 *      hierarchy. Requiring the field excludes that whole class structurally, rather
 *      than by blacklisting its error text.
 *
 * Follows the INFRA-407 precedent (e2e-safety.sh:269-271): match narrowly and prefer
 * silence to a wrong explanation, because a wrong explanation sends the next reader
 * somewhere else entirely — which is the cost INFRA-407 itself was created to pay off.
 */
function diagnose(debugDir) {
  let files;
  try {
    files = fs.readdirSync(debugDir).filter((f) => /^commands-.*\.json$/.test(f));
  } catch {
    return DIAGNOSIS.NONE;
  }

  for (const file of files) {
    let entries;
    try {
      entries = JSON.parse(fs.readFileSync(`${debugDir}/${file}`, 'utf8'));
    } catch {
      continue; // A corrupt artifact is not evidence of anything; it is not an error here.
    }
    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      const meta = entry && entry.metadata;
      if (!meta || meta.status !== 'FAILED') continue;
      const hierarchy = meta.error && meta.error.hierarchyRoot;
      if (!hierarchy) continue;
      if (JSON.stringify(hierarchy).includes(MANUAL_DIAL_ALERT)) return DIAGNOSIS.DIAL_FALLBACK;
    }
  }
  return DIAGNOSIS.NONE;
}

function main(argv) {
  const [cmd, ...rest] = argv;

  if (cmd === 'diagnose') {
    const [debugDir] = rest;
    if (!debugDir) {
      console.error('usage: e2e-verdict.js diagnose <debugDir>');
      return 2;
    }
    console.log(diagnose(debugDir));
    return 0; // Diagnosis never decides the gate; the verdict already did.
  }

  const [reportPath, flow, ...aliases] = rest;
  if (cmd !== 'adjudicate' || !reportPath || !flow) {
    console.error('usage: e2e-verdict.js <adjudicate <reportPath> <flow> [alias...] | diagnose <debugDir>>');
    return 2;
  }
  const verdict = adjudicate(reportPath, flow, aliases);
  console.log(verdict);
  return verdict === VERDICT.PASS ? 0 : 1;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { adjudicate, diagnose, VERDICT, DIAGNOSIS };
