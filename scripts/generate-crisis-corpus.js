#!/usr/bin/env node
/**
 * INFRA-512 — offline adversarial corpus generator for free-text crisis detection.
 *
 * WHY THIS LIVES AT THE REPO ROOT AND HAS ZERO DEPENDENCIES.
 * `app/__tests__/privacy/journalAnalyticsBoundary.contract.test.ts` pins that no
 * `@anthropic-ai/*` package may enter `app/package.json`, and there is no root
 * package.json — repo-root `scripts/` is this repo's established dependency-free zone
 * (legal-registry.js, supabase-deploy-drift.js, …). So this calls the Messages API over
 * raw HTTP with Node's global fetch rather than the official SDK. That is a constraint of
 * the work item, not a style preference: installing the SDK anywhere reachable from the
 * app would break the pin, and inventing a root manifest would put an SDK at a path the
 * CI npm-audit gate never scans.
 *
 * THIS IS A ONE-OFF, ATTENDED SCRIPT. It is deliberately wired into NOTHING — no npm
 * script, no CI job. A unit test (app/__tests__/scripts/corpus-generator-guard.test.js)
 * imports only the pure guards, and nothing ever invokes main() or the network. It makes
 * a network call and costs money; a test or a gate must never invoke it.
 *
 * IT NEVER WRITES INTO THE REPO. Two independent reasons, both hard:
 *   1. Unreviewed generated self-harm phrasing must not enter git history. INFRA-512 AC3
 *      requires every corpus item be human-reviewed BEFORE it lands.
 *   2. `app/scripts/e2e-provenance.js` fingerprints untracked file contents repo-wide, so
 *      a candidate file dropped in the worktree reads as MISMATCH on the next gate verify
 *      and costs a full rebuild.
 * The refusal below is enforced, not documented.
 *
 * WORKFLOW
 *   1. node scripts/generate-crisis-corpus.js --class MUST_FIRE --count 40
 *   2. Review every candidate by hand. The reviewer decides the label; the model drafts it.
 *   3. Append accepted items to
 *      app/src/features/crisis/services/__tests__/fixtures/crisisTextCorpus.v1.json
 *      with review.reviewer / review.reviewedOn / review.verdict filled in.
 *   4. Re-run `npm run test:crisis-detection` and record the three figures in the audit doc.
 *
 * DO NOT let a bad recall number drive a widening of CRISIS_TEXT_PATTERN_SOURCES. That
 * constant feeds journalCrisisScanner.scan → showCrisisAlert(); widening it for recall
 * buys alarm fatigue on the surface where it costs most. Any widening is its own item
 * with a crisis pass.
 */

'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-5';
const ANTHROPIC_VERSION = '2023-06-01';
const PROMPT_VERSION = 'infra-512-v1';

const CLASS_BRIEFS = {
  MUST_FIRE:
    'Paraphrases and indirect expressions of suicidal ideation or self-harm intent that a ' +
    'person might plausibly write in a private reflective journal. Vary the grammar: ' +
    'gerunds, contractions, first person past and present, hedged and indirect phrasings. ' +
    'Express intent or ideation ONLY. Do not include means, methods, dosages, timing, or ' +
    'anything instructional — the detector is a substring matcher and none of that is ' +
    'relevant to it.',
  MUST_NOT_FIRE:
    'Ordinary language that must NOT be flagged, chosen adversarially: near-misses that ' +
    'share vocabulary with a crisis disclosure but carry no self-harm meaning ("this ' +
    'deadline is killing me", "I could die of embarrassment", "my phone died"). Each item ' +
    'must name, in its `refutes` field, the specific naive widening it would refute. ' +
    'Generic calm journaling is NOT useful here and will be rejected.',
  STT_MANGLED:
    'Realistic speech-to-text corruptions of a crisis disclosure: dropped or fused word ' +
    'boundaries, homophone substitutions, dropped function words, and missing negation. ' +
    'These are what an on-device recognizer plausibly emits for a spoken disclosure. Put ' +
    'the clean sentence you mangled in the `sourceText` field.',
};

function usage(msg) {
  if (msg) console.error(`\nERROR: ${msg}`);
  console.error(`
Usage: node scripts/generate-crisis-corpus.js --class <CLASS> [--count N] [--out FILE]

  --class   One of: ${Object.keys(CLASS_BRIEFS).join(', ')}
  --count   Candidates to request (default 30)
  --out     Destination file. MUST be outside this repository.
            Default: ${path.join(os.tmpdir(), 'infra-512-candidates-<class>.json')}

Requires ANTHROPIC_API_KEY in the environment. Never run this from a test or from CI.
`);
  process.exit(msg ? 1 : 0);
}

function parseArgs(argv) {
  const out = { count: 30 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') usage();
    else if (a === '--class') out.cls = argv[++i];
    else if (a === '--count') out.count = Number(argv[++i]);
    else if (a === '--out') out.out = argv[++i];
    else usage(`unrecognised argument: ${a}`);
  }
  return out;
}

const REFUSAL_EXIT = 2;
const MAX_SYMLINK_HOPS = 40;

/**
 * The guard boundary. This is NOT the worktree: the shared git dir's parent is the
 * bare repo's own working tree, which holds every peer worktree, and an untracked file
 * in any of them breaks that worktree's e2e provenance just the same.
 */
function guardBoundary() {
  const gitCommonDir = childProcess
    .execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    .trim();
  return fs.realpathSync.native(path.dirname(gitCommonDir));
}

/**
 * Canonical form of a destination that may not exist yet: realpath (native, so the
 * filesystem's true case is returned) of the deepest EXISTING ancestor, with the
 * not-yet-existing segments rejoined. A dangling symlink is followed by hand, because
 * a later write through it would create its target. Only ENOENT is tolerated.
 */
function canonicalise(dest) {
  let pending = path.resolve(dest);
  for (let hops = 0; hops <= MAX_SYMLINK_HOPS; hops += 1) {
    let probe = pending;
    const rest = [];
    for (;;) {
      try {
        return path.join(fs.realpathSync.native(probe), ...rest);
      } catch (e) {
        if (!e || e.code !== 'ENOENT') throw e;
      }
      // ENOENT: either a dangling symlink, or a segment that does not exist yet.
      let linkTarget = null;
      try {
        if (fs.lstatSync(probe).isSymbolicLink()) linkTarget = fs.readlinkSync(probe);
      } catch (e) {
        if (!e || e.code !== 'ENOENT') throw e;
      }
      if (linkTarget !== null) {
        pending = path.join(path.resolve(path.dirname(probe), linkTarget), ...rest);
        break;
      }
      const parent = path.dirname(probe);
      if (parent === probe) throw new Error(`no existing ancestor for ${dest}`);
      rest.unshift(path.basename(probe));
      probe = parent;
    }
  }
  throw new Error(`too many symlink hops resolving ${dest}`);
}

/** Fail closed if the destination is anywhere inside the repository tree, or the guard cannot tell. */
function assertOutsideRepo(dest) {
  let resolved;
  let inside;
  try {
    const boundary = guardBoundary();
    resolved = canonicalise(dest);
    const rel = path.relative(boundary, resolved);
    const escapes = rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel);
    inside = !escapes;
  } catch (e) {
    console.error(
      `\nREFUSED: could not verify that --out is outside the repository (${e && e.message}).\n` +
        'The guard fails closed. Fix the path or the git lookup and re-run.\n',
    );
    process.exit(REFUSAL_EXIT);
  }
  if (inside) {
    console.error(
      `\nREFUSED: --out resolves inside the repository (${resolved}).\n\n` +
        'Unreviewed generated crisis phrasing must not enter git history (AC3), and an\n' +
        'untracked file under the worktree invalidates the e2e provenance fingerprint,\n' +
        'costing a full gate rebuild. Write to a path outside the repo and review there.\n',
    );
    process.exit(REFUSAL_EXIT);
  }
}

function buildPrompt(cls, count) {
  return [
    'You are helping build a labelled EVALUATION CORPUS that measures the recall of a',
    "mental-wellness app's free-text crisis detector. The corpus is a test fixture. It is",
    'never shown to a user and never used to generate user-facing content. Its purpose is',
    'to find cases where the detector FAILS to notice a disclosure, so those gaps can be',
    'measured and reasoned about rather than assumed away.',
    '',
    `Produce exactly ${count} distinct candidate items for the class ${cls}.`,
    '',
    CLASS_BRIEFS[cls],
    '',
    'Return ONE JSON object and nothing else — no prose, no markdown fence:',
    '{"items":[{"text":"…","rationale":"…"' +
      (cls === 'MUST_NOT_FIRE' ? ',"refutes":"…"' : '') +
      (cls === 'STT_MANGLED' ? ',"sourceText":"…"' : '') +
      '}]}',
    '',
    'Every item must be a plausible thing a real person would write or say. No duplicates.',
    'Do not include real names or any identifying detail.',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.cls || !CLASS_BRIEFS[args.cls]) usage('--class is required and must be a known class');
  if (!Number.isFinite(args.count) || args.count < 1) usage('--count must be a positive number');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      '\nERROR: ANTHROPIC_API_KEY is not set.\n\n' +
        'This script cannot run unattended and deliberately does not degrade to an empty\n' +
        'corpus — a silently empty fixture would make the harness report a meaningless\n' +
        '100% recall. Export a key and re-run.\n',
    );
    process.exit(1);
  }

  const dest =
    args.out || path.join(os.tmpdir(), `infra-512-candidates-${args.cls.toLowerCase()}.json`);
  assertOutsideRepo(dest);

  const runDate = new Date().toISOString().slice(0, 10);
  console.error(`Requesting ${args.count} ${args.cls} candidates from ${MODEL}…`);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'high' },
      messages: [{ role: 'user', content: buildPrompt(args.cls, args.count) }],
    }),
  });

  if (!res.ok) {
    console.error(`\nERROR: API returned ${res.status}\n${await res.text()}\n`);
    process.exit(1);
  }

  const body = await res.json();

  // Guard the refusal path explicitly: a decline is HTTP 200 with stop_reason "refusal",
  // so reading .content without checking would silently produce an empty corpus.
  if (body.stop_reason === 'refusal') {
    console.error(
      `\nERROR: the request was declined (stop_reason: refusal).\n` +
        `${JSON.stringify(body.stop_details || {}, null, 2)}\n\n` +
        'Nothing was written. Do not retry blindly — re-read the class brief and narrow it.\n',
    );
    process.exit(1);
  }

  const text = (body.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  let parsed;
  try {
    // Defensive: strip a markdown fence if the model wrapped the object despite the ask.
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error(`\nERROR: response was not parseable JSON — ${err.message}\n`);
    console.error(text.slice(0, 2000));
    process.exit(1);
  }

  const items = (parsed.items || []).map((it, i) => ({
    id: `${args.cls.toLowerCase().replace(/_/g, '-')}-cand-${String(i + 1).padStart(3, '0')}`,
    class: args.cls,
    text: it.text,
    ...(it.sourceText ? { sourceText: it.sourceText } : {}),
    ...(it.refutes ? { refutes: it.refutes } : {}),
    rationale: it.rationale,
    provenance: { source: 'anthropic-api', model: MODEL, promptVersion: PROMPT_VERSION, runDate },
    review: { reviewer: null, reviewedOn: null, verdict: 'PENDING' },
  }));

  fs.writeFileSync(
    dest,
    `${JSON.stringify({ class: args.cls, model: MODEL, promptVersion: PROMPT_VERSION, runDate, items }, null, 2)}\n`,
  );

  console.error(`\nWrote ${items.length} PENDING candidates to ${dest}`);
  console.error(
    'Every item is verdict:PENDING. Review each by hand, then append accepted ones to the\n' +
      'fixture with the reviewer recorded. Do NOT bulk-accept.\n',
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`\nUNCAUGHT: ${err && err.stack ? err.stack : err}\n`);
    process.exit(1);
  });
}

module.exports = { assertOutsideRepo, parseArgs };
