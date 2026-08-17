#!/usr/bin/env node
/**
 * Mechanical pin for crisis-scheme deeplinks (DEBUG-314).
 *
 * WHAT THIS ENFORCES
 * ==================
 * Every `tel:` / `sms:` dial in the app must go through
 * `src/features/crisis/utils/openCrisisUrl.ts`, the single place that supplies
 * what a crisis hand-off needs:
 *   1. a `canOpenURL` guard before `openURL`,
 *   2. a manual-dial fallback Alert ("Please manually dial 988 …"),
 *   3. a `logError(LogCategory.CRISIS, …)` audit record,
 *   4. the INFRA-297 `endCrisisTap()` measurement terminals.
 *
 * A bare `Linking.openURL('tel:988')` gets NONE of that. When `openURL` rejects
 * — no telephony (iPad / simulator / data-only device), a missing
 * `LSApplicationQueriesSchemes` entry, an OS restriction — the promise rejects
 * into nothing: no dial, no alert, no log. The user taps the crisis button and
 * nothing happens, silently. That is a false negative on the app's one
 * zero-false-negative path.
 *
 * WHY A MECHANICAL PIN AT ALL
 * ===========================
 * The defect was catalogued by hand on 2026-07-26. Ten days later the inventory
 * was already wrong: FEAT-283 relocated three call sites out of
 * `assessmentStore.ts` into `crisisAlert.ts` and *introduced a brand-new
 * unguarded one* in `VoiceReflectionScreen.tsx`. A defect class that needs a
 * human to re-grep is a defect class that regrows every time a feature lands.
 *
 * WHY EXACT COUNTS AND NOT ARGUMENT MATCHING
 * ==========================================
 * The obvious rule — "flag `Linking.openURL` whose argument is a `tel:`/`sms:`
 * literal" — is defeated by code already in this repo. `CrisisResourcesScreen`
 * builds `phoneUrl` / `smsUrl` into *variables* before dialing, so neither an
 * eslint AST selector nor a grep can see the scheme. Rule 1 below is therefore
 * argument-shape-independent: it pins the exact NUMBER of `Linking.openURL`
 * calls per file across the safety-relevant directories. Adding any call to an
 * already-allowlisted file fails the guard — which is how this defect actually
 * returns.
 *
 * Rule 2 is the complement: a repo-wide ban on `tel:`/`sms:` literals, which
 * catches a new crisis dial dropped into a directory Rule 1 does not cover.
 *
 * Rule 3 pins that the two deliberate bare-dial sites keep their `.catch`,
 * so their allowlist entries cannot silently re-admit the exact defect (an
 * unhandled rejection) they were carved out for.
 *
 * WHY COMMENTS ARE STRIPPED FIRST
 * ===============================
 * Several of these files *discuss* `Linking.openURL` in prose explaining why
 * they do or do not call it. A guard that counted those would drift every time
 * someone edited a comment, and a guard that fails for cosmetic reasons gets
 * muted. Counting operates on code only.
 *
 * WHY THIS IS NOT AN ESLINT RULE
 * ==============================
 * DEBUG-314's acceptance criteria offered eslint as an option. Beyond the
 * argument-matching hole above, eslint findings in this repo flow through
 * `npm run lint:baseline`, a per-file ratchet with an
 * `npm run lint:baseline -- --update` escape hatch. A developer running
 * `--update` for an unrelated reason would silently absorb a reintroduced
 * bypass into `.eslint-baseline.json` and CI would stay green. A safety control
 * with a documented "make the failure go away" button is not a control.
 *
 * WHERE THIS RUNS
 * ===============
 * Two surfaces, one implementation:
 *   - `app/__tests__/safety/crisisDialGuard.test.ts` consumes the exported
 *     functions and rides `npm run test:safety`, which `npm run precommit`
 *     already runs — every commit, every machine. This mirrors
 *     `lsApplicationQueriesSchemes.config.test.ts`, which CLAUDE.md designates
 *     the *primary* mechanical pin for the sibling `LSApplicationQueriesSchemes`
 *     contract.
 *   - `npm run check:crisis-dial` runs this file directly in the CI `security`
 *     job, so the pin also holds when a commit is pushed with `--no-verify`
 *     (permitted on `hotfix/*`). `test:safety` is NOT in CI today, so without
 *     this second surface a hotfix could land a regression unchecked.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(APP_ROOT, 'src');

/**
 * Directories whose `Linking.openURL` call counts are pinned exactly.
 * Listed explicitly rather than glob-discovered, for the same reason
 * `check-breathing-worklet-purity.js` uses an explicit list: widening the
 * guarded set should be a visible diff, not a silent consequence of where
 * someone put a new file.
 */
const GUARDED_DIRS = [
  'src/features/crisis',
  'src/features/assessment',
  'src/features/journal',
  'src/features/consent',
  'src/features/insights',
  // MAINT-252 WIDENED this from `src/core/services/performance` to the whole
  // of `src/core/services` when that directory was deleted. Narrowing to
  // nothing was the other option and was rejected: `collectSourceFiles`
  // returns [] for a missing directory, so a stale entry would have been
  // silently inert rather than loud, and dropping it would have shrunk Rule 1's
  // reach with no replacement. Rule 2's repo-wide `tel:`/`sms:` literal ban does
  // NOT cover the gap — its regex only matches a literal placed directly in the
  // `openURL(` call, so a variable-built dial (the `phoneUrl` shape in
  // CrisisResourcesScreen) is invisible to it. Widening cost zero new
  // EXPECTED_CALL_COUNTS entries: `src/core/services` contains no
  // `Linking.openURL` call at all.
  'src/core/services',
];

/**
 * Exact `Linking.openURL` call counts per file within GUARDED_DIRS.
 * Every entry is a hole in the guard, so each carries its justification.
 * A file absent from this map must have ZERO calls.
 */
const EXPECTED_CALL_COUNTS = {
  // The guarded implementation itself.
  'src/features/crisis/utils/openCrisisUrl.ts': 1,
  // Ruling B (DEBUG-314): last-resort dial reached only when `Alert.alert`
  // already threw. openCrisisUrl's only failure surface IS Alert.alert, so
  // guarding here would trade a blind dial for a guaranteed-silent one.
  'src/features/crisis/services/crisisAlert.ts': 1,
  // Ruling B, same reasoning, plus: showCrisisAlert() cannot throw, so reaching
  // this catch means 988 was most likely already dialed. Defense-in-depth.
  'src/features/assessment/stores/assessmentStore.ts': 1,
  // `resource.website` — an https: link, not a dial.
  'src/features/crisis/screens/CrisisResourcesScreen.tsx': 1,
  // Five https: legal / external-resource links, no dial. Four are the inline
  // links (Terms, Privacy, and the two under-age resources); the fifth is the
  // shared `onDocumentAction` handler added by DEBUG-430, which is what makes
  // Terms and Privacy reachable by screen reader — a Pressable collapses its
  // subtree on iOS, so the inline links alone had no accessibility node. Same
  // shape and same reason as the ReConsentScreen entry below. This screen DOES
  // own a crisis affordance (the pre-consent 988 footer, DEBUG-390) and
  // `LegalGate` IS in RootCrisisButton.SUPPRESSED_ROUTES — but that footer
  // dials through `openCrisisUrl`, so it contributes no count here, and this
  // entry must stay https-only. A `tel:`/`sms:` literal appearing in this file
  // is caught by Rule 2 regardless of this count.
  'src/features/consent/screens/CombinedLegalGateScreen.tsx': 5,
  // Three https: legal links, no dial (FEAT-376). Terms and Privacy Policy are
  // each reachable two ways — the inline link inside the checkbox label, and the
  // `openDocument` accessibility action that exists because a Pressable collapses
  // its subtree on iOS and would otherwise make the inline link unreachable to a
  // screen reader. The third is the shared handler both actions route through.
  // This screen owns no crisis affordance at all: `ReConsent` is deliberately
  // absent from RootCrisisButton.SUPPRESSED_ROUTES so the root overlay covers it.
  'src/features/consent/screens/ReConsentScreen.tsx': 3,
  // Two https: youth mental-health referrals, no dial (DEBUG-418) — the same
  // childmind.org / teenmentalhealth.org pair CombinedLegalGateScreen's under-age
  // branch carries, for the same cohort. This screen owns NO crisis affordance of
  // its own by founder decision D1: `ReConsent` is deliberately absent from
  // RootCrisisButton.SUPPRESSED_ROUTES, so the root overlay renders over the
  // modal and dials through `openCrisisUrl`, contributing no count here. This
  // entry must stay https-only; a `tel:`/`sms:` literal in this file is caught by
  // Rule 2 regardless of the count, and a 988 block appearing here at all is
  // caught by __tests__/safety/reconsentIneligibleCrisisReachability.test.tsx.
  'src/features/consent/screens/StaleConsentIneligibleScreen.tsx': 2,
};

/**
 * Files permitted to contain a `tel:` / `sms:` URL literal next to an
 * `openURL` call (Rule 2). Strictly the allowlist above minus the https-only
 * entries.
 */
const SCHEME_LITERAL_ALLOWLIST = [
  'src/features/crisis/utils/openCrisisUrl.ts',
  'src/features/crisis/services/crisisAlert.ts',
  'src/features/assessment/stores/assessmentStore.ts',
];

/** Bare-dial sites that must keep a `.catch` on the returned promise (Rule 3). */
const REQUIRE_CATCH = [
  'src/features/crisis/services/crisisAlert.ts',
  'src/features/assessment/stores/assessmentStore.ts',
];

const OPEN_URL_RE = /\bLinking\s*\.\s*openURL\s*\(/g;
const SCHEME_LITERAL_RE = /\bopenURL\s*\(\s*['"`]\s*(?:tel|sms):/;
const OPEN_URL_WITH_CATCH_RE = /\bLinking\s*\.\s*openURL\s*\([^;]*?\)\s*\.\s*catch\s*\(/s;

/**
 * Remove line and block comments so prose mentioning `Linking.openURL` is not
 * counted as a call. Deliberately simple: it blanks comment bodies rather than
 * deleting them, preserving line numbers for error messages. String literals
 * containing `//` are rare in this codebase and would only ever cause a *false
 * positive count* (a louder failure), never a miss.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

/** Count real `Linking.openURL` calls in a source string. */
function countOpenUrlCalls(src) {
  const matches = stripComments(src).match(OPEN_URL_RE);
  return matches ? matches.length : 0;
}

/** True if the source contains an `openURL(` applied to a tel:/sms: literal. */
function hasCrisisSchemeLiteral(src) {
  return SCHEME_LITERAL_RE.test(stripComments(src));
}

/** True if every `Linking.openURL` in the source is followed by `.catch(`. */
function bareDialHasCatch(src) {
  return OPEN_URL_WITH_CATCH_RE.test(stripComments(src));
}

/** Recursively collect .ts/.tsx sources, excluding tests. */
function collectSourceFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      collectSourceFiles(full, acc);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const toRel = (abs) => path.relative(APP_ROOT, abs).split(path.sep).join('/');

/**
 * Rule 1 — exact per-file call counts across GUARDED_DIRS.
 * @returns {{actual: Record<string, number>, expected: Record<string, number>}}
 */
function collectGuardedCallCounts() {
  const actual = {};
  for (const dir of GUARDED_DIRS) {
    for (const file of collectSourceFiles(path.join(APP_ROOT, dir))) {
      const n = countOpenUrlCalls(fs.readFileSync(file, 'utf-8'));
      if (n > 0) actual[toRel(file)] = n;
    }
  }
  return { actual, expected: EXPECTED_CALL_COUNTS };
}

/**
 * Rule 2 — repo-wide `tel:`/`sms:` literal ban outside the allowlist.
 * @returns {string[]} offending repo-relative paths.
 */
function findUnallowedSchemeLiterals() {
  const allowed = new Set(SCHEME_LITERAL_ALLOWLIST);
  return collectSourceFiles(SRC_ROOT)
    .map(toRel)
    .filter((rel) => !allowed.has(rel))
    .filter((rel) => hasCrisisSchemeLiteral(fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')));
}

/**
 * Rule 3 — the deliberate bare-dial sites must keep their `.catch`.
 * @returns {string[]} offending repo-relative paths.
 */
function findUncaughtBareDials() {
  return REQUIRE_CATCH.filter(
    (rel) => !bareDialHasCatch(fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8'))
  );
}

const REMEDY =
  "  import { openCrisisUrl } from '@/features/crisis/utils/openCrisisUrl';\n" +
  "  void openCrisisUrl('tel:988', { manualLabel: '988' });\n";

function main() {
  const failures = [];

  const missing = [...new Set([...Object.keys(EXPECTED_CALL_COUNTS), ...REQUIRE_CATCH])].filter(
    (p) => !fs.existsSync(path.join(APP_ROOT, p))
  );
  if (missing.length > 0) {
    // An allowlisted file that vanished means the guard protects nothing — or
    // that openCrisisUrl itself moved and every call site is now unguarded.
    failures.push(
      `Allowlisted file(s) not found:\n${missing.map((m) => `  ${m}`).join('\n')}\n` +
        '  If a file moved, update app/scripts/check-crisis-dial-guard.js.'
    );
  }

  const { actual, expected } = collectGuardedCallCounts();
  for (const [file, count] of Object.entries(actual)) {
    const want = expected[file] ?? 0;
    if (count !== want) {
      failures.push(
        `${file}: expected ${want} Linking.openURL call(s), found ${count}.\n` +
          '  A NEW dial in an already-allowlisted file is exactly how DEBUG-314 returns.\n' +
          '  Route it through openCrisisUrl, or update EXPECTED_CALL_COUNTS with a reason.'
      );
    }
  }
  for (const [file, want] of Object.entries(expected)) {
    if (!(file in actual) && want > 0) {
      failures.push(
        `${file}: expected ${want} Linking.openURL call(s), found 0.\n` +
          '  If the call was legitimately removed, drop its EXPECTED_CALL_COUNTS entry.'
      );
    }
  }

  for (const file of findUnallowedSchemeLiterals()) {
    failures.push(
      `${file}: dials a tel:/sms: literal without going through openCrisisUrl.\n${REMEDY}`
    );
  }

  for (const file of findUncaughtBareDials()) {
    failures.push(
      `${file}: its deliberate bare Linking.openURL lost its .catch.\n` +
        '  An unhandled rejection here IS the DEBUG-314 defect — the dial fails silently.'
    );
  }

  if (failures.length > 0) {
    console.error('\n❌ Crisis-dial guard failed (DEBUG-314):\n');
    console.error(failures.join('\n\n'));
    console.error(
      '\nEvery tel:/sms: dial must go through `openCrisisUrl` so it gets the\n' +
        'canOpenURL guard, the manual-dial fallback Alert, the CRISIS audit log,\n' +
        'and the crisis-tap measurement terminals. A bare Linking.openURL fails\n' +
        'SILENTLY when the scheme cannot be opened.\n'
    );
    process.exit(1);
  }

  console.log('✅ All tel:/sms: crisis dials route through openCrisisUrl.');
}

if (require.main === module) {
  main();
}

module.exports = {
  APP_ROOT,
  EXPECTED_CALL_COUNTS,
  GUARDED_DIRS,
  REQUIRE_CATCH,
  SCHEME_LITERAL_ALLOWLIST,
  bareDialHasCatch,
  collectGuardedCallCounts,
  countOpenUrlCalls,
  findUnallowedSchemeLiterals,
  findUncaughtBareDials,
  hasCrisisSchemeLiteral,
  stripComments,
};
