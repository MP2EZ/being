/**
 * Crisis-dial guard — every tel:/sms: dial routes through openCrisisUrl (DEBUG-314)
 *
 * WHAT THIS PINS
 * ==============
 * `openCrisisUrl` is the one place that wraps a crisis deeplink in a
 * `canOpenURL` guard, a manual-dial fallback Alert, a `LogCategory.CRISIS`
 * audit record, and the INFRA-297 tap-measurement terminals. A bare
 * `Linking.openURL('tel:988')` gets none of it: when `openURL` rejects — no
 * telephony, a missing `LSApplicationQueriesSchemes` entry, an OS restriction —
 * the promise rejects into nothing. No dial, no alert, no log. The user taps
 * the crisis button and nothing happens, silently.
 *
 * WHY A TEST AND NOT JUST REVIEW
 * ==============================
 * The 14 bypassing call sites were catalogued by hand on 2026-07-26. Ten days
 * later that inventory was already stale: FEAT-283 had relocated three of them
 * and introduced a brand-new unguarded dial in `VoiceReflectionScreen.tsx`.
 * A defect class that relies on a human re-grepping regrows with every feature.
 *
 * This test is the PRIMARY mechanical pin — it rides `npm run test:safety`,
 * which `npm run precommit` runs on every commit on every machine. It mirrors
 * `lsApplicationQueriesSchemes.config.test.ts`, which CLAUDE.md designates the
 * primary pin for the sibling `LSApplicationQueriesSchemes` contract (and which
 * protects `openCrisisUrl`'s guard while doing nothing for bypassing callers —
 * this test closes that half).
 *
 * `npm run check:crisis-dial` runs the same logic in the CI `security` job,
 * because `test:safety` is not itself a CI job and `--no-verify` is permitted
 * on `hotfix/*` branches.
 *
 * Detection logic lives in `app/scripts/check-crisis-dial-guard.js` so both
 * surfaces share one implementation. The tests below cover the real tree AND
 * synthetic fixtures — a guard never observed failing is not a guard.
 */

const {
  EXPECTED_CALL_COUNTS,
  GUARDED_DIRS,
  REQUIRE_CATCH,
  bareDialHasCatch,
  collectGuardedCallCounts,
  countOpenUrlCalls,
  findUnallowedSchemeLiterals,
  findUncaughtBareDials,
  hasCrisisSchemeLiteral,
  stripComments,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require('../../scripts/check-crisis-dial-guard');

describe('crisis-dial guard — the real source tree', () => {
  it('has exactly the allowlisted Linking.openURL calls, and no others', () => {
    const { actual, expected } = collectGuardedCallCounts();
    // Exact equality, not a subset check: a NEW dial added inside an
    // already-allowlisted file is how this defect actually returns, and a
    // "contains" assertion would wave it through.
    expect(actual).toEqual(expected);
  });

  it('has no tel:/sms: literal dialed outside openCrisisUrl', () => {
    expect(findUnallowedSchemeLiterals()).toEqual([]);
  });

  it('keeps a .catch on both deliberate bare-dial last resorts', () => {
    // These two sites intentionally do NOT use openCrisisUrl: they run only
    // after `Alert.alert` already threw, and openCrisisUrl's sole failure
    // surface IS Alert.alert — guarding them would trade a blind dial for a
    // guaranteed-silent one. The `.catch` is what makes them non-silent, so it
    // is the part that must be pinned.
    expect(findUncaughtBareDials()).toEqual([]);
  });

  it('allowlists only files that still exist', () => {
    // A vanished allowlist entry means the guard protects nothing — or that
    // openCrisisUrl moved and every call site is silently unguarded.
    const fs = require('fs');
    const path = require('path');
    const { APP_ROOT } = require('../../scripts/check-crisis-dial-guard');
    for (const rel of [...Object.keys(EXPECTED_CALL_COUNTS), ...REQUIRE_CATCH]) {
      expect(fs.existsSync(path.join(APP_ROOT, rel))).toBe(true);
    }
  });

  it('guards exactly the expected directories, and each one exists', () => {
    // MAINT-252: until now nothing pinned GUARDED_DIRS, so the guard's COVERAGE
    // could shrink with every test still green — deleting a line here removes a
    // whole directory from Rule 1 silently. That is not hypothetical: MAINT-252
    // deleted `src/core/services/performance`, and the reflex fix was to drop
    // its entry rather than widen to `src/core/services`.
    //
    // The existence half matters just as much. `collectSourceFiles` returns []
    // for a missing directory, so a GUARDED_DIRS entry pointing at a moved or
    // renamed path degrades to "guards nothing" without failing anything.
    expect(GUARDED_DIRS).toEqual([
      'src/features/crisis',
      'src/features/assessment',
      'src/features/journal',
      'src/features/consent',
      'src/features/insights',
      'src/core/services',
    ]);

    const fs = require('fs');
    const path = require('path');
    const { APP_ROOT } = require('../../scripts/check-crisis-dial-guard');
    for (const dir of GUARDED_DIRS) {
      expect(fs.existsSync(path.join(APP_ROOT, dir))).toBe(true);
    }
  });
});

describe('crisis-dial guard — detection logic can actually fail', () => {
  it('counts a bare dial', () => {
    expect(countOpenUrlCalls(`Linking.openURL('tel:988');`)).toBe(1);
  });

  it('counts a dial whose argument is a VARIABLE', () => {
    // The shape that defeats eslint AST selectors and grep alike:
    // CrisisResourcesScreen builds `phoneUrl` before dialing, so no
    // argument-matching rule can see the scheme. Counting is immune.
    expect(countOpenUrlCalls(`const u = 'tel:988'; Linking.openURL(u);`)).toBe(1);
  });

  it('counts multiple dials in one file', () => {
    expect(
      countOpenUrlCalls(`Linking.openURL('tel:988'); Linking.openURL(other);`)
    ).toBe(2);
  });

  it('tolerates whitespace and reflowed calls', () => {
    expect(countOpenUrlCalls(`Linking\n  . openURL (\n  'tel:988'\n);`)).toBe(1);
  });

  it('does NOT count Linking.openURL mentioned in a line comment', () => {
    // Several guarded files explain in prose why they do or do not call it.
    // A guard that drifted when someone edited a comment would get muted.
    expect(countOpenUrlCalls(`// prefer openCrisisUrl over Linking.openURL(...)`)).toBe(0);
  });

  it('does NOT count Linking.openURL mentioned in a block comment', () => {
    expect(countOpenUrlCalls(`/**\n * dialed 988 via Linking.openURL('tel:988').\n */`)).toBe(0);
  });

  it('still counts a real call sitting next to a comment', () => {
    expect(
      countOpenUrlCalls(`// not this: Linking.openURL(x)\nLinking.openURL('tel:911');`)
    ).toBe(1);
  });

  it('preserves line count when stripping comments', () => {
    // Error messages report line numbers, so stripping must blank, not delete.
    const src = `/* a\nb */\nconst x = 1;`;
    expect(stripComments(src).split('\n')).toHaveLength(src.split('\n').length);
  });

  it.each([
    [`Linking.openURL('tel:988')`, 'tel with single quotes'],
    [`Linking.openURL("sms:741741")`, 'sms with double quotes'],
    ['Linking.openURL(`tel:911`)', 'template literal'],
    [`Linking.openURL( 'tel:988' )`, 'padded argument'],
  ])('flags %s (%s) as a crisis-scheme literal', (src) => {
    expect(hasCrisisSchemeLiteral(src)).toBe(true);
  });

  it.each([
    [`Linking.openURL('https://being.fyi/terms')`, 'https link'],
    [`Linking.openURL(resource.website)`, 'variable https link'],
  ])('does not flag %s (%s)', (src) => {
    expect(hasCrisisSchemeLiteral(src)).toBe(false);
  });

  it('recognises a caught bare dial', () => {
    expect(bareDialHasCatch(`void Linking.openURL('tel:988').catch(log);`)).toBe(true);
  });

  it('rejects an uncaught bare dial — the DEBUG-314 defect shape', () => {
    // An unhandled rejection here is precisely the silent failure this work
    // item exists to remove.
    expect(bareDialHasCatch(`void Linking.openURL('tel:988');`)).toBe(false);
  });
});
