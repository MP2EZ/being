#!/usr/bin/env node
/**
 * Mechanical pin against RN `<Modal>` occluding the root crisis button
 * (DEBUG-406).
 *
 * WHAT THIS ENFORCES
 * ==================
 * No JSX `<Modal>` may appear anywhere under `app/src` except the files in
 * ALLOWLIST below, each of which carries a recorded ruling explaining why.
 *
 * WHY
 * ===
 * React Native's `<Modal>` renders in a SEPARATE NATIVE WINDOW above the JS view
 * hierarchy. `RootCrisisButton` mounts inside `NavigationContainer`, so while any
 * RN `<Modal>` is open the crisis button is not dimmed, not faded, not behind
 * something — it is NOT ON SCREEN. The governing invariant, stated at
 * `RootCrisisButton.tsx` and enforced by
 * `__tests__/safety/crisis-zero-988-windows.test.tsx`, is that no reachable
 * render state may have zero 988 affordance. A `<Modal>` produces exactly that
 * state, for as long as it is open.
 *
 * WHY A MECHANICAL PIN AND NOT REVIEW OR A PROTECTED PATH
 * =======================================================
 * This defect class has now been found three times by hand and never once by the
 * tooling:
 *   • DEBUG-396 discovered it while establishing that a CONTRAST fix could not
 *     reach it — a different defect class entirely.
 *   • DEBUG-403 fixed the immersive case and scoped four standard-route sites out
 *     BY ANALOGY, without individually verifying any of them.
 *   • DEBUG-406 audited those four and found three of them wrong.
 *
 * A Protected Paths row would not have caught any of it. `src/core/components/`
 * and `src/features/insights/` are not on that list and should not be — the risk
 * is not a directory, it is a COMPONENT SHAPE that can appear in any directory.
 * CLAUDE.md already documents this exact failure twice: `features/guidance/`
 * (a safety gate in a brand-new dir matching no pattern) and `features/consent/`
 * (DEBUG-390's fix file matched nothing; the safety gate fired only because the
 * same branch happened to also touch a `.maestro` flow).
 *
 * The allowlist is therefore the AUDIT TRAIL as well as the escape hatch: every
 * surviving `<Modal>` in the app is here, with the reason it survives. Rule 2
 * fails on a STALE entry too, so converting a file away from `<Modal>` forces the
 * record to be updated rather than quietly outliving its justification — which is
 * how DEBUG-403's four-site ruling went stale in the first place.
 *
 * WHY COMMENTS ARE STRIPPED FIRST
 * ===============================
 * This codebase deliberately NAMES anti-patterns in prose to warn the next reader
 * off them — `HapticsOptInPrompt` says "Never convert this to <Modal>",
 * `ReConsentScreen` lists `<Modal>` among the things forbidden on that screen,
 * and `RootCrisisButton` explains the mechanism at length. A guard that counted
 * those would fire on the very comments written to prevent the defect. Same
 * lesson as DEBUG-390, and the same fix: strip block and line comments, match on
 * code only. The unit test asserts the matcher still fires against a literal
 * known-bad string, so comment-stripping cannot silently reduce this to a guard
 * that matches nothing.
 *
 * RULE 4 — THIRD-PARTY PRESENTER CALL SITES (INFRA-571)
 * =====================================================
 * Rules 1-3 match a component WE render. Rule 4 matches a CALL that hands
 * presentation to a third party whose component never appears in our tree at
 * all. DEBUG-533 found the first instance and no detector could see it: this
 * guard scans `app/src` for JSX `<Modal>`, so Sentry's `<Modal>` inside
 * node_modules is invisible to it, and INFRA-531's crisis-constant-import rule
 * matches nothing because nothing on that path imports from `features/crisis/`.
 * Not "consumes a crisis constant while matching no path pattern", but "mounts a
 * third-party component that occludes the affordance while importing nothing of
 * ours at all."
 *
 * The CALL SITE is the correct anchor precisely because it is the only part of
 * the mechanism that is ours. Extending the scan into `node_modules` is the
 * wrong inversion: it would fire on every RN library that happens to render a
 * `<Modal>` — unbounded, and mostly on code we never mount — while still telling
 * us nothing about whether WE reach it. `collectSourceFiles` already skips
 * node_modules; do not widen it.
 *
 * The matcher is CALL-SHAPED (`name` followed by `(`), not a bare identifier.
 * `stripComments` blanks comments but NOT string literals, and
 * `ExternalErrorReporter.ts` carries `showFeedbackWidget` three times in three
 * different syntactic roles within five lines — a `typeof` capability probe, the
 * real call, and a `logger.warn` message string. A bare-identifier rule would
 * report a log message as an occlusion site.
 *
 * PRESENTER_ALLOWLIST is keyed per FILE **and SYMBOL**, not per file. A ruling
 * that examined one call must go stale when THAT call is removed, even if a
 * different denylisted call survives in the same file — a file-level key would
 * silently transfer a recorded ruling onto a call it never examined, which is
 * DEBUG-403's failure mode reproduced inside the fix for it.
 *
 * WHAT THIS DOES NOT COVER
 * ========================
 * • `Alert.alert` — also native, also above the JS hierarchy, and also capable of
 *   occluding the button. `ReConsentScreen` forbids it for that reason. It is out
 *   of scope here only because it has no JSX shape to match; a separate pin would
 *   need call-site analysis. It remains, by count, the LARGEST uncovered occluder
 *   surface in the tree. Rule 4 builds machinery that could eventually reach it;
 *   it does not reach it today, and this guard's green must not be read as
 *   covering it.
 * • Presenters reached through one of OUR OWN wrappers. Rule 4 matches the SDK
 *   call, so a third file calling `showFeedbackForm()` — which wraps
 *   `showFeedbackWidget()` — is not a hit. The unit of audit is the third-party
 *   call, not reachability.
 * • Presenters reached by bracket access (`mod['showFeedbackWidget']()`) or a
 *   deep import that renames them. Rule 3 catches the aliasing shape for
 *   `<Modal>`; there is no equivalent arm for rule 4 yet.
 * • Anything not on THIRD_PARTY_PRESENTERS. That list is NON-EXHAUSTIVE by
 *   design — see the note above it.
 * • Navigation `presentation: 'modal'` / `'transparentModal'` routes. These are
 *   NOT an occlusion class: the root stack is a JS stack and `RootCrisisButton`
 *   is a later sibling of the whole navigator, so a modally-presented screen
 *   renders BENEATH it. Verified in DEBUG-406 and documented at `ReConsentScreen`.
 * • An aliased import (`import { Modal as Sheet }`). Rule 3 catches the aliasing
 *   itself, which is the only way to reach it.
 * • Test files, which are excluded — they legitimately reference the shape in
 *   order to assert its absence.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(APP_ROOT, 'src');

/**
 * Files permitted to render an RN `<Modal>`, each with the ruling that permits
 * it. Adding an entry is a safety decision and belongs in a work item, not in a
 * drive-by edit.
 */
const ALLOWLIST = {
  'src/core/components/NotificationTimePicker.tsx':
    'DEBUG-406 — ruling: the <Modal> exception STANDS here, and it stands on this ' +
    "site's own facts rather than on its route class. The surface carries zero " +
    'wellness or distress semantics (a mode="time" spinner and a Cancel/Done ' +
    'header), its exits are fixed and non-scrolling, and it is the only one of the ' +
    'four where the <Modal> is iOS-only — Android renders a native OS dialog that ' +
    'no RN change can put the crisis button above, so converting would split ' +
    'platform behaviour for a reminder-time setting. THE RULING IS CONDITIONAL: it ' +
    'stands BECAUSE the content is benign. If this picker ever gains wellness ' +
    'framing — a mood check-in reminder, an assessment-due nudge, any copy ' +
    'referencing the user\'s state — the ruling is void and it converts.',

  'src/core/components/CelebrationToast.tsx':
    'DEBUG-403 / DEBUG-406 — dead code, not an exception. Verified to have zero ' +
    'JSX mount sites across BOTH test roots (app/src and app/__tests__) and ' +
    'supabase/functions; it appears only in prose. It was listed in ' +
    "RootCrisisButton's exception comment as though live and was struck from it. " +
    'Deleting the component is tracked as separate cleanup; until then it is ' +
    'allowlisted so this guard stays green, NOT because a <Modal> here would be ' +
    'acceptable if it were ever mounted.',
};

/**
 * Third-party calls that present a full-screen surface above our JS hierarchy.
 *
 * THIS LIST IS **NON-EXHAUSTIVE** AND ALWAYS WILL BE. It names the presenters we
 * have actually seen in this tree; it is not a survey of every SDK we depend on.
 *
 * TO ADD THE NEXT PRESENTER: append its call name here, then either fix the call
 * site or record a ruling in PRESENTER_ALLOWLIST keyed `<file>::<name>`. Dotted
 * names are matched with flexible whitespace, so `Sharing.shareAsync` catches
 * `Sharing . shareAsync(`.
 *
 * A NOTE ON THE SENTRY THREE: `showScreenshotButton` is NOT a top-level export of
 * @sentry/react-native 7.11.0 — `index.d.ts` re-exports only `showFeedbackWidget`,
 * `showFeedbackButton` and `hideFeedbackButton`, and `showScreenshotButton` is
 * reachable solely by a deep import. It is listed here forward-looking, so do not
 * read these three as a complete account of that SDK's presenters.
 *
 * `showFeedbackWidget` occludes by full-screen sheet; `showFeedbackButton` mounts
 * a PERSISTENT FLOATING button, whose harm is DEBUG-547-style overlap with the
 * crisis FAB's `zIndex: 9999` — a wrong-destination tap, a crisis FALSE POSITIVE
 * — rather than full occlusion. Both belong here; the rulings should say which.
 */
const THIRD_PARTY_PRESENTERS = [
  'showFeedbackWidget',
  'showFeedbackButton',
  'showScreenshotButton',
  'Sharing.shareAsync',
  'RNIap.requestPurchase',
];

/**
 * Presenter call sites permitted to survive, each with the ruling that permits
 * it. Keyed `<repo-relative file>::<presenter name>` — see the header on why the
 * symbol is part of the key.
 */
const PRESENTER_ALLOWLIST = {
  'src/features/profile/screens/ExportDataScreen.tsx::Sharing.shareAsync':
    'INFRA-571, MEASURED ON SIMULATOR by DEBUG-577 — DEBT REGISTER ENTRY, NOT AN ' +
    'EXCEPTION GRANTED. INFRA-571 registered this reasoning from the presentation ' +
    'mechanism; DEBUG-577 measured it and the inferred reading UNDERSTATED it. ' +
    'Provenance: 2026-09-07, Release build (launcher-free, tel/sms intact) of a tree ' +
    'byte-identical to origin/development on every file on the measured path, ' +
    'iPhone SE 3rd gen / iOS 18.6, 375x667. ' +
    'WHAT WAS MEASURED, in two separable parts, because they can disagree and that ' +
    'is the point. (1) PRESENCE: with the sheet up `maestro hierarchy` carried ZERO ' +
    '`crisis-button-root` nodes — and zero app-owned nodes of ANY kind. Not a covered ' +
    'FAB; an absent app tree. What remained was a full-bleed `PopoverDismissRegion` ' +
    '[-375,-667][750,1334] and the sheet’s own `ShareSheet.RemoteContainerView`, which ' +
    'is REMOTE — hosted out of process — and is the structural reason no app-side ' +
    'change reaches above it. (2) HIT-TESTABILITY, which is the finding: presence was ' +
    'NOT the evidence, because a hierarchy lists views another window covers and so ' +
    'discriminates nothing here. A matched-pair coordinate tap at screen point ' +
    '98%,82% — inside the FAB’s measured bounds [331,523][375,567] — reached ' +
    '`CrisisResources` with the sheet DOWN and did not reach it with the sheet UP, on ' +
    'the same route, the same point, the same run. That pair is also the falsification ' +
    'demonstration: the probe is shown capable of going green, so its red adjudicates. ' +
    'The sheet was proven up by screenshot at probe time, and the app proven alive ' +
    'afterwards by dismissing it and re-asserting the screen and the FAB. ' +
    'RULING: the exception STANDS and does not convert. UIActivityViewController is ' +
    'OS-owned and out-of-process, so no RN element, zIndex or z-order change reaches ' +
    'above it — the same structural conclusion DEBUG-533 reached for Sentry’s feedback ' +
    'widget (whose entry FEAT-570 deleted along with the call it examined, so do not go ' +
    'looking for it above) and the same ' +
    'reasoning that earned NotificationTimePicker’s Android dialog its DEBUG-406 ' +
    'carve-out. What makes it acceptable is that the window is user-initiated, ' +
    'self-terminating, and on a route the user chose for a data-portability action — ' +
    'NOT that it is short: it is bounded only by the user dismissing the sheet. ' +
    'WHAT THIS DOES NOT PROVE: one point in the FAB’s band, one device, one viewport, ' +
    'one orientation. It says nothing about iPad’s popover presentation, nothing about ' +
    'dwell, and nothing about what the user can do during the window. SCOPE: iOS only. ' +
    'Android’s share sheet is a different presenter and is UNMEASURED — there is no ' +
    'Android e2e harness. This entry says nothing about the IAPService entry below. ' +
    'Reachability is ' +
    'the reason it is registered rather than deferred: Profile → Privacy & Data ' +
    '→ Export, `ExportData` is NOT in `RootCrisisButton.SUPPRESSED_ROUTES`, and this ' +
    "file's own header records the JSON export path as ALWAYS ON, never flag-gated " +
    '— which is why INFRA-571 registered it rather than deferring it, and it stands on ' +
    'those facts alone. (INFRA-571 argued it by comparison to the Sentry widget, bounded ' +
    'by `bug_reporting` being dark; FEAT-570 has since removed that widget, so the ' +
    'comparison is history and the reachability claim no longer rests on it.) ' +
    'WHEN THAT CALL IS REMOVED, ' +
    'DELETE this entry in the same commit.',

  'src/core/services/subscription/IAPService.ts::RNIap.requestPurchase':
    'INFRA-571 — REASONED FROM THE PRESENTATION MECHANISM, NOT MEASURED. DEBUG-577 ' +
    'ATTEMPTED the measurement and was BLOCKED; it did not decline to try, and the ' +
    'blockers are structural rather than scheduling, so record them here instead of ' +
    'making the next reader re-derive them. (a) `mockMode = __DEV__` at IAPService.ts:153 ' +
    'means the mock branch returns a synthetic purchase and this call is UNREACHABLE in ' +
    'any Debug build. (b) No `.storekit` configuration exists anywhere in the tree, so ' +
    'simulator StoreKit resolves no products and the call throws instead of presenting; ' +
    'a device measurement additionally needs a sandbox Apple ID and live products in App ' +
    'Store Connect. (c) Android is separately blocked and further out: Play Billing is a ' +
    'DIFFERENT presenter from StoreKit, needs a Play-signed build on an internal track ' +
    'plus a licence tester, and there is no Android e2e harness at all. Discharging this ' +
    'needs (a)+(b) for iOS and all of (c) again for Android. It borrows NO credibility ' +
    'from the measured expo-sharing entry above: being an OS sheet is a shared mechanism, ' +
    'not shared evidence. ' +
    'StoreKit (iOS) and Play Billing (Android) present the purchase sheet as a ' +
    'system surface above the JS hierarchy, with unbounded dwell while the user ' +
    'reads terms or authenticates, and the module imports nothing of ours. Reached ' +
    'from `PurchaseOptionsScreen` via `subscriptionStore.purchaseSubscription` on ' +
    'root-stack route `PurchaseOptions`, which is NOT in ' +
    '`RootCrisisButton.SUPPRESSED_ROUTES`. Registered rather than converted because ' +
    'no app-side change can put anything above an OS-owned payment sheet — the same ' +
    'reasoning that earned NotificationTimePicker’s Android dialog its carve-out. ' +
    'WHEN THAT CALL IS REMOVED, DELETE this entry in the same commit.',
};

/** JSX usage of the component, e.g. `<Modal`, `<Modal>`, `<Modal\n`. */
const MODAL_JSX_RE = /<Modal(?=[\s/>])/g;

/** `Modal` pulled out of react-native under a different local name. */
const ALIASED_IMPORT_RE = /\bModal\s+as\s+(\w+)/g;

/**
 * Build a CALL-SHAPED matcher for a presenter name. Dotted names allow
 * whitespace around the member access. The trailing `\s*\(` is load-bearing:
 * it is what distinguishes the real call from a `typeof` probe and from the
 * identifier inside a log-message string literal.
 */
function presenterCallRe(name) {
  const parts = name.split('.').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b${parts.join('\\s*\\.\\s*')}\\s*\\(`, 'g');
}

const PRESENTER_RES = THIRD_PARTY_PRESENTERS.map((name) => ({
  name,
  re: presenterCallRe(name),
}));

/**
 * Blank out comments while preserving offsets and line structure, so a match's
 * line number still points at real code.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

/** Line numbers (1-indexed) of every JSX `<Modal` in a source string. */
function findModalJsx(src) {
  const stripped = stripComments(src);
  const lines = [];
  let match;
  MODAL_JSX_RE.lastIndex = 0;
  while ((match = MODAL_JSX_RE.exec(stripped)) !== null) {
    lines.push(stripped.slice(0, match.index).split('\n').length);
  }
  return lines;
}

/** Every denylisted presenter CALL in a source string, with its line number. */
function findPresenterCalls(src) {
  const stripped = stripComments(src);
  const hits = [];
  for (const { name, re } of PRESENTER_RES) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(stripped)) !== null) {
      hits.push({ name, line: stripped.slice(0, match.index).split('\n').length });
    }
  }
  return hits.sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));
}

/** Local names that `Modal` was aliased to, if any. */
function findAliasedModalImports(src) {
  const stripped = stripComments(src);
  const names = [];
  let match;
  ALIASED_IMPORT_RE.lastIndex = 0;
  while ((match = ALIASED_IMPORT_RE.exec(stripped)) !== null) {
    names.push(match[1]);
  }
  return names;
}

/** Recursively collect shipping .ts/.tsx sources, excluding tests. */
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
 * Run every rule against the real tree.
 * @returns {{unallowed: Array, stale: Array, aliased: Array,
 *            unallowedPresenters: Array, stalePresenters: Array}}
 */
function runGuard(srcRoot = SRC_ROOT) {
  const files = collectSourceFiles(srcRoot);
  const unallowed = [];
  const aliased = [];
  const unallowedPresenters = [];
  const seenWithModal = new Set();
  // Keyed `<file>::<name>` so staleness is per-symbol, and so an entry for one
  // rule can never be consumed by the other's `seen` set.
  const seenPresenterKeys = new Set();

  for (const abs of files) {
    const rel = toRel(abs);
    const src = fs.readFileSync(abs, 'utf8');

    const jsxLines = findModalJsx(src);
    if (jsxLines.length > 0) {
      seenWithModal.add(rel);
      if (!Object.prototype.hasOwnProperty.call(ALLOWLIST, rel)) {
        unallowed.push({ file: rel, lines: jsxLines });
      }
    }

    const aliases = findAliasedModalImports(src);
    if (aliases.length > 0) {
      aliased.push({ file: rel, aliases });
    }

    for (const { name, line } of findPresenterCalls(src)) {
      const key = `${rel}::${name}`;
      seenPresenterKeys.add(key);
      if (!Object.prototype.hasOwnProperty.call(PRESENTER_ALLOWLIST, key)) {
        const existing = unallowedPresenters.find((u) => u.key === key);
        if (existing) existing.lines.push(line);
        else unallowedPresenters.push({ key, file: rel, name, lines: [line] });
      }
    }
  }

  // Rule 2 — an allowlist entry whose file no longer renders a <Modal> is a
  // recorded ruling that has outlived its subject. Fail so the record is updated
  // rather than silently preserved.
  const stale = Object.keys(ALLOWLIST).filter((rel) => !seenWithModal.has(rel));

  // Rule 4's staleness arm, same reasoning, per FILE+SYMBOL.
  const stalePresenters = Object.keys(PRESENTER_ALLOWLIST).filter(
    (key) => !seenPresenterKeys.has(key),
  );

  return { unallowed, stale, aliased, unallowedPresenters, stalePresenters };
}

function main() {
  const { unallowed, stale, aliased, unallowedPresenters, stalePresenters } = runGuard();
  let failed = false;

  if (unallowed.length > 0) {
    failed = true;
    console.error('\n✖ RN <Modal> found outside the allowlist.\n');
    console.error(
      "  An RN <Modal> renders in a separate native window above the JS view\n" +
      "  hierarchy, so while it is open the root crisis button is not on screen\n" +
      "  at all — a zero-988-affordance render state (DEBUG-403 / DEBUG-406).\n\n" +
      "  Use a full-bleed absolute overlay instead. Reference implementations:\n" +
      "    src/features/practices/shared/components/ResumeSessionModal.tsx\n" +
      "    src/features/practices/shared/components/HapticsOptInPrompt.tsx\n" +
      "  Geometry constants: src/features/crisis/constants/crisisButtonGeometry.ts\n",
    );
    for (const { file, lines } of unallowed) {
      console.error(`    ${file}:${lines.join(',')}`);
    }
    console.error(
      "\n  If this <Modal> is genuinely correct, it needs a RULING recorded in\n" +
      "  ALLOWLIST in scripts/check-modal-occlusion-guard.js — citing that site's\n" +
      "  own facts, not its route class. That is the standard DEBUG-406 applied.\n",
    );
  }

  if (stale.length > 0) {
    failed = true;
    console.error('\n✖ Stale allowlist entry — the file no longer renders a <Modal>.\n');
    for (const file of stale) {
      console.error(`    ${file}`);
    }
    console.error(
      "\n  Remove the entry from ALLOWLIST. The allowlist is the audit trail of\n" +
      "  every surviving <Modal> in the app; an entry that outlives its subject is\n" +
      "  how a stale ruling survives review — exactly what DEBUG-406 was filed to\n" +
      "  undo.\n",
    );
  }

  if (aliased.length > 0) {
    failed = true;
    console.error('\n✖ `Modal` imported under an alias — this defeats the guard.\n');
    for (const { file, aliases } of aliased) {
      console.error(`    ${file} → ${aliases.join(', ')}`);
    }
    console.error('');
  }

  if (unallowedPresenters.length > 0) {
    failed = true;
    console.error('\n✖ Third-party full-screen presenter called outside the allowlist.\n');
    console.error(
      "  These calls hand presentation to a component we do not render, which\n" +
      "  paints above the JS view hierarchy — so while it is up the root crisis\n" +
      "  button is not on screen at all (DEBUG-533). No detector but this one\n" +
      "  sees the shape: the <Modal> lives in node_modules, and nothing on the\n" +
      "  path imports from features/crisis/.\n",
    );
    for (const { file, name, lines } of unallowedPresenters) {
      console.error(`    ${file}:${lines.join(',')}  →  ${name}`);
    }
    console.error(
      "\n  Either remove the call, or record a RULING in PRESENTER_ALLOWLIST in\n" +
      "  scripts/check-modal-occlusion-guard.js, keyed `<file>::<name>` — citing\n" +
      "  that site's own facts, not its route class, and saying plainly whether\n" +
      "  the occlusion was MEASURED on device or only reasoned from the\n" +
      "  presentation mechanism.\n\n" +
      "  THIRD_PARTY_PRESENTERS is NON-EXHAUSTIVE. To add the next presenter:\n" +
      "  append its call name, then fix the site or record a ruling.\n",
    );
  }

  if (stalePresenters.length > 0) {
    failed = true;
    console.error('\n✖ Stale presenter ruling — the call it examined is gone.\n');
    for (const key of stalePresenters) {
      console.error(`    ${key}`);
    }
    console.error(
      "\n  DELETE that key from PRESENTER_ALLOWLIST in\n" +
      "  scripts/check-modal-occlusion-guard.js, in the same commit that removed\n" +
      "  the call. Entries are keyed <file>::<name> so a ruling can never be\n" +
      "  silently transferred onto a call it never examined — which is how\n" +
      "  DEBUG-403's four-site analogy survived review.\n",
    );
  }

  if (failed) {
    process.exit(1);
  }

  console.log(
    '✓ No unallowed RN <Modal> and no unallowed third-party presenter call in\n' +
      '  app/src; both allowlists are current.',
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  ALLOWLIST,
  APP_ROOT,
  PRESENTER_ALLOWLIST,
  SRC_ROOT,
  THIRD_PARTY_PRESENTERS,
  collectSourceFiles,
  findAliasedModalImports,
  findModalJsx,
  findPresenterCalls,
  presenterCallRe,
  runGuard,
  stripComments,
};
