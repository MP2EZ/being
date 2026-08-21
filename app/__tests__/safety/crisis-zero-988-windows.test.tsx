/**
 * DEBUG-341 — suppression is a promise; these tests make it enforceable.
 *
 * THE INVARIANT: a route may suppress the root crisis overlay ONLY IF every reachable
 * render state of that route mounts its own crisis affordance.
 * `RootCrisisButton.SUPPRESSED_ROUTES` holds `CrisisResources`, `AssessmentFlow` and
 * `LegalGate` on exactly that justification, and nothing checked it.
 *
 * The planning pass reported TWO live violations. Investigation confirmed ONE and
 * disproved the other, and both outcomes are pinned here:
 *
 *   ✅ CONFIRMED — EnhancedAssessmentFlow had two render states with no crisis affordance:
 *      `flowState === 'completing'` (an ActivityIndicator and nothing else, reached
 *      immediately after a PHQ-9 that may have just crossed a threshold) and the
 *      onboarding pre-questions window (an empty View). Both fixed.
 *
 *   ❌ DISPROVED — CombinedLegalGateScreen was reported as the worst hole in the app.
 *      It is not; the main branch has always carried a crisis footer. See the first
 *      describe block for the full correction, including why the "fix" was reverted.
 *
 * Also pinned here: the always-reachable pre-route window (LoadingScreen), the
 * reduce-motion fail-open, and the existence and placement of the root boundary.
 */
describe('CombinedLegalGateScreen — CORRECTION to a disproved finding', () => {
  /**
   * ⚠️ THE DEBUG-341 PLANNING PASS REPORTED THIS SCREEN AS THE WORST HOLE IN THE APP,
   * AND IT WAS WRONG. Recording that here, because the misreading is an easy one to
   * repeat and the "fix" for it would make the screen worse.
   *
   * The claim was: the Call-988 / Text-741741 controls live inside `if (showUnderAge)`,
   * so the main age+consent branch — the first screen every new user sees — has only
   * disclaimer COPY and no tappable control; and since `LegalGate` is in
   * SUPPRESSED_ROUTES, a first-run adult would have zero 988 access anywhere in the app.
   *
   * The first half is true and the conclusion does not follow. There are TWO crisis
   * blocks in this file, not one:
   *   • `crisisSection` — inside the under-age branch (accessibilityLabel
   *     "Call 988 Suicide and Crisis Lifeline"), and
   *   • `crisisFooter`  — in the MAIN branch, commented "Crisis Resources - Always
   *     Visible" (accessibilityLabel "Call 988" / "Text Crisis Line"), wired to the same
   *     handleCall988 / handleTextCrisis handlers.
   * The review saw the first and missed the second. The main branch has always had
   * tappable 988 access, and the file's header claim is accurate.
   *
   * An earlier revision of this change added a SECOND crisis block to the main branch on
   * the strength of the bad finding. It was reverted: duplicating the control would give
   * one consent screen two differently-labelled Call-988 buttons, which is worse for a
   * screen reader user than the situation it was meant to fix.
   *
   * WHAT WAS ACTUALLY TRUE, and left alone deliberately AT THE TIME: the footer sat at
   * the BOTTOM of a long ScrollView, below age verification and four consent checkboxes.
   * The <3-tap contract was met (scrolling is not tapping) but it was below the fold.
   * Moving it was judged a UX decision on a compliance screen, not a safety fix, and was
   * out of scope here.
   *
   * ⚠️ RESOLVED BY DEBUG-390 — and the "out of scope" call above did not survive.
   * DEBUG-372 made LegalGate the route a dismissed cold-start `being://crisis` lands on,
   * which turned a latent wart into a live regression: the post-dismiss state traded the
   * persistent 1-tap 988 that Main offers for a scroll-then-tap one. Measured before the
   * fix: 1433pt of content against a 759pt viewport on iPhone 15, with the 988 button's
   * top edge at 95.3% of scroll depth — 642pt of scrolling, 754pt on SE 3.
   *
   * The footer is now pinned OUTSIDE the ScrollView. `LegalGate` STAYS in
   * SUPPRESSED_ROUTES: the suppression was re-earned, not withdrawn, because suppression
   * is earned by an affordance reachable WITHOUT SCROLLING, never by one that merely
   * exists.
   *
   * NOTE WHAT THIS BLOCK GOT WRONG, because it is the reusable lesson: the assertion
   * below tested that the footer EXISTS, and it passed for the entire period the defect
   * was live. Existence was never the property in question. The position assertion is
   * the one that would have caught it.
   *
   * The runtime behaviour is already pinned by
   * src/features/consent/screens/__tests__/CombinedLegalGateScreen.crisis.test.tsx
   * (DEBUG-314), which renders the MAIN branch and presses getByLabelText('Call 988').
   * These assertions are structural, so a future edit cannot delete the footer while
   * that suite still passes against the under-age branch.
   */
  const source = require('fs').readFileSync(
    require('path').join(
      __dirname,
      '../../src/features/consent/screens/CombinedLegalGateScreen.tsx',
    ),
    'utf8',
  );

  /**
   * Comment-stripped source (DEBUG-390's own lesson, applied to this block).
   *
   * This block asserted against RAW source and survived on luck. The screen
   * deliberately names anti-patterns in prose to warn the next reader off them —
   * `accessibilityViewIsModal`, and a bare `Linking.openURL('tel:988')` — and the
   * negative matcher below is exactly the shape that goes red on correct code the
   * moment such a warning is written. FEAT-470 added several explanatory comments
   * to this screen, so the latent hazard becomes a live one. Strip first.
   */
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  /**
   * The main render branch, bounded at the stylesheet.
   *
   * Bounding matters: an unbounded `slice(lastIndexOf('  return ('))` runs to EOF
   * and therefore swallows `const styles`, where `crisisFooter:` is DEFINED. The
   * `toContain('crisisFooter')` assertion below would pass with the footer JSX
   * deleted outright. It has teeth only because of the accessibilityLabel checks —
   * so bound the slice and let the structural assertion stand on its own.
   */
  const mainBranch = (() => {
    const start = code.lastIndexOf('  return (');
    const stylesAt = code.indexOf('const styles = StyleSheet.create(', start);
    return code.slice(start, stylesAt === -1 ? undefined : stylesAt);
  })();

  test('the MAIN branch keeps its always-visible crisis footer', () => {
    expect(mainBranch).toContain('crisisFooter');
    expect(mainBranch).toContain('accessibilityLabel="Call 988"');
    expect(mainBranch).toContain('accessibilityLabel="Text Crisis Line"');
  });

  test('the bounded main-branch slice excludes the stylesheet', () => {
    // Proves the bound above actually works. Without this, a future refactor that
    // renamed the stylesheet const would silently restore the unbounded slice and
    // re-hollow the assertion above.
    expect(mainBranch.length).toBeGreaterThan(200);
    expect(mainBranch).not.toContain('StyleSheet.create(');
    expect(mainBranch).not.toContain('crisisFooter: {');
  });

  test('DEBUG-390: the crisis footer is pinned OUTSIDE the ScrollView', () => {
    // The assertion above is satisfied by a footer anywhere in the main branch —
    // including the bottom of the ScrollView, which is where the defect lived. This
    // one pins POSITION, so re-nesting the footer inside the ScrollView fails CI.
    //
    // Source-level on purpose: this file is the structural safety suite and renders
    // nothing. The render-tree equivalent (walking ancestors from the 988 control)
    // lives in
    // src/features/consent/screens/__tests__/CombinedLegalGateScreen.accessibility.test.tsx
    // and is the authoritative one; this is the copy that runs in precommit.
    const scrollViewCloses = mainBranch.indexOf('</ScrollView>');
    const footerOpens = mainBranch.indexOf('styles.crisisFooter}');

    expect(scrollViewCloses).toBeGreaterThan(-1);
    expect(footerOpens).toBeGreaterThan(-1);
    expect(footerOpens).toBeGreaterThan(scrollViewCloses);
  });

  /**
   * FEAT-470 — the footer is UNCONDITIONAL, and the Art. 9 state cannot reach it.
   *
   * WHY THESE ARE NEW. Every assertion above is a substring or an ordering check, so
   * all of them pass against a footer wrapped in a conditional. FEAT-470 introduced
   * new conditional state to this screen (the Art. 9 tick, now optional, plus the
   * refusal copy), which makes "the footer renders unconditionally" a property worth
   * asserting for the first time rather than an obvious one.
   *
   * The stakes: `LegalGate` is in `RootCrisisButton.SUPPRESSED_ROUTES`, so the root
   * overlay deliberately does not cover this screen. This footer is the ONLY crisis
   * affordance a user has before accepting anything. A footer that renders for some
   * consent states and not others is a zero-988 window by construction.
   */
  const footerRegion = (() => {
    const from = mainBranch.indexOf('</ScrollView>');
    const to = mainBranch.indexOf('</SafeAreaView>');
    return mainBranch.slice(from, to === -1 ? undefined : to);
  })();

  test('FEAT-470: nothing conditional sits between the ScrollView and the footer', () => {
    // The gap where a `{someState && (` wrapper would be introduced. Kept narrow on
    // purpose: this is the span whose contents decide whether the footer mounts.
    const gap = footerRegion.slice(0, footerRegion.indexOf('styles.crisisFooter}'));

    expect(gap).not.toMatch(/&&/);
    expect(gap).not.toMatch(/\?[^.]/); // ternary, but not optional chaining
    expect(gap.length).toBeGreaterThan(0);
  });

  test('FEAT-470: the Art. 9 consent state never reaches the footer subtree', () => {
    // The assertion that directly discharges FEAT-470's red AC. Mechanically proves
    // the optional consent cannot gate, relabel or reorder the crisis affordance —
    // no reasoning about JSX required.
    expect(footerRegion).not.toContain('mentalHealthProcessingConsented');
    expect(footerRegion).not.toContain('requiredConsentsTicked');
  });

  test('FEAT-470: no sibling was appended after the footer', () => {
    // A view added AFTER the footer competes for the same fixed vertical budget as
    // the footer itself and clips it at large Dynamic Type — the same failure mode
    // DEBUG-390 fixed, arriving from the other side.
    const afterFooter = footerRegion.slice(footerRegion.lastIndexOf('</View>'));
    expect(afterFooter).not.toMatch(/<View/);
    expect(afterFooter).not.toMatch(/<Text/);
  });

  test('FEAT-470: the footer-region matchers can actually fail', () => {
    // DEBUG-390's bar: a comment-stripped source plus narrow regexes is exactly the
    // combination that can silently match nothing. Prove each matcher still fires
    // against a literal known-bad string, and that the slices are non-trivial.
    expect(footerRegion.length).toBeGreaterThan(100);
    expect(code.length).toBeGreaterThan(1000);

    expect(/&&/.test('{!refused && (')).toBe(true);
    expect(/\?[^.]/.test('{refused ? null : (')).toBe(true);
    expect('<View style={styles.crisisFooter}>'.includes('mentalHealthProcessingConsented')).toBe(
      false,
    );
    expect(
      '{mentalHealthProcessingConsented && <View style={styles.crisisFooter}>'.includes(
        'mentalHealthProcessingConsented',
      ),
    ).toBe(true);
  });

  test('the under-age branch keeps its own crisis section', () => {
    const underAge = source.slice(
      source.indexOf('if (showUnderAge)'),
      source.lastIndexOf('  return ('),
    );
    expect(underAge).toContain('accessibilityLabel="Call 988 Suicide and Crisis Lifeline"');
  });

  test('both crisis blocks route through the guarded dial helper', () => {
    // DEBUG-314: a bare Linking.openURL fails silently when the scheme cannot open.
    // Asserted against the COMMENT-STRIPPED source: the negative matcher would
    // otherwise go red the moment anyone documents this anti-pattern in prose, which
    // is a house convention on this very screen.
    expect(code).toContain("openCrisisUrl('tel:988'");
    expect(code).not.toMatch(/Linking\.openURL\(\s*['"]tel:988/);
  });

  test('the guarded-dial matcher can still fail', () => {
    // Pairs with the comment-stripping above: proves the negative assertion is not
    // vacuous now that it runs against a transformed string.
    expect(/Linking\.openURL\(\s*['"]tel:988/.test("Linking.openURL('tel:988')")).toBe(true);
    expect(/Linking\.openURL\(\s*['"]tel:988/.test("openCrisisUrl('tel:988')")).toBe(false);
  });
});

describe('CrisisResourcesScreen — DEBUG-432: the 988 control is pinned OUTSIDE the ScrollView', () => {
  /**
   * The same defect as DEBUG-390's, on the screen DEBUG-390's principle exists to protect.
   * `CrisisResources` is in SUPPRESSED_ROUTES — the root overlay is absent — and it is the
   * destination every other crisis affordance in the app routes to. Its own 988 control
   * was the LAST child of the 988 resource card, itself inside the screen's only
   * ScrollView, so the destination failed the standard every other surface is held to.
   *
   * Measured before the fix (`maestro hierarchy`, Release build, provenance 505fc417):
   * iPhone SE 3 at DEFAULT Dynamic Type put the button at y=746..797 against a fold of
   * y=86..667 — 130pt of scrolling, and 0% of the tap target on screen. At AX5 the same
   * button sat at y=3926..4095. Three of four measured configurations failed; only the
   * largest phone at default type passed, which is why the existing green Maestro
   * assertion said nothing (the gate pins no simulator model).
   *
   * Source-level on purpose: this file is the structural safety suite, renders nothing,
   * and is the copy that runs in precommit. The authoritative render-tree equivalent —
   * walking ancestors from the control — is
   * src/features/crisis/screens/__tests__/CrisisResourcesScreen.reachability.test.tsx.
   */
  const rawSource = require('fs').readFileSync(
    require('path').join(
      __dirname,
      '../../src/features/crisis/screens/CrisisResourcesScreen.tsx',
    ),
    'utf8',
  );

  /**
   * DEBUG-390's lesson: this codebase deliberately names anti-patterns in prose to warn
   * the next reader off them, so an assertion about what the file DOES must not read what
   * it SAYS. The comment block above this very screen's pinned footer names `ScrollView`.
   */
  const stripComments = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const source = stripComments(rawSource);

  /**
   * The second failure mode DEBUG-390 flagged: comment-stripping plus a narrow matcher is
   * exactly the combination that can silently match NOTHING and go green forever. This
   * test is the proof-of-liveness for the two below — it fails if stripping ate the render
   * body, and it fails if the comparator stops discriminating a known-bad shape.
   */
  test('the comment-stripped matcher can still go red', () => {
    expect(source.length).toBeGreaterThan(2000);
    expect(source).toContain('</ScrollView>');
    expect(source).toContain('crisis-call-988-button');

    const knownBad = `
      <ScrollView>
        <Pressable testID="crisis-call-988-button" />
      </ScrollView>
    `;
    // The comparator applied to a nested control must FAIL, or it proves nothing.
    expect(knownBad.indexOf('crisis-call-988-button')).toBeLessThan(
      knownBad.indexOf('</ScrollView>'),
    );
  });

  test('crisis-call-988-button is declared AFTER the ScrollView closes', () => {
    // Whole-file ordering, NOT a slice from the last `return (`. The pre-fix defect
    // declared this testID inside `ResourceCard`, a component defined ABOVE the screen,
    // so a slice of the screen's own return would report "not found" (-1) instead of
    // "wrongly ordered" — a red for the wrong reason, and one that would go green if a
    // future refactor moved the control back into a card.
    const scrollViewCloses = source.indexOf('</ScrollView>');
    const buttonDeclared = source.indexOf('crisis-call-988-button');

    expect(scrollViewCloses).toBeGreaterThan(-1);
    expect(buttonDeclared).toBeGreaterThan(-1);
    expect(buttonDeclared).toBeGreaterThan(scrollViewCloses);
  });

  test('exactly one crisis-call-988-button exists in the file', () => {
    // DEBUG-341 reverted a duplicated crisis control: two differently-labelled Call-988
    // buttons on one screen is worse for a screen reader user than the gap it closed.
    // Two Maestro flows address this id (crisis-988-dial, deeplink-consent-gate), so a
    // duplicate also makes their selectors ambiguous.
    expect(source.match(/crisis-call-988-button/g)).toHaveLength(1);
  });

  test('the pinned control dials through the guarded helper, never a bare openURL', () => {
    expect(source).toContain('openCrisisUrl');
    expect(source).not.toMatch(/Linking\.openURL\(\s*['"]tel:988/);
  });
});

describe('EnhancedAssessmentFlow — render states on a suppressed route', () => {
  /**
   * `flowState === 'completing'` rendered an ActivityIndicator and nothing else, and it
   * is reached IMMEDIATELY AFTER a PHQ-9 that may have just crossed a crisis threshold —
   * the highest-risk moment in the product. The onboarding path
   * (`introduction` + showIntroduction false) rendered an empty View while the async
   * startAssessment resolved.
   *
   * These are asserted at the source level rather than by driving the full flow: mounting
   * EnhancedAssessmentFlow pulls in the assessment store, encryption, consent and crisis
   * detection, and a mount-based test here would be asserting the store's behaviour more
   * than the render contract. What must not regress is that BOTH branches contain a
   * crisis affordance, which is a structural property of the file.
   */
  const source = require('fs').readFileSync(
    require('path').join(
      __dirname,
      '../../src/features/assessment/components/EnhancedAssessmentFlow.tsx',
    ),
    'utf8',
  );

  test("the 'completing' branch mounts a crisis affordance, not just a spinner", () => {
    const completing = source.slice(source.indexOf("flowState === 'completing'"));
    const branch = completing.slice(0, completing.indexOf('</View>'));
    expect(branch).toContain('ActivityIndicator');
    expect(branch).toContain('Static988Button');
  });

  test('the onboarding pre-questions window mounts a crisis affordance', () => {
    const idx = source.indexOf("flowState === 'introduction' && !showIntroduction");
    expect(idx).toBeGreaterThan(-1);
    const branch = source.slice(idx, source.indexOf('</View>', idx));
    expect(branch).toContain('Static988Button');
  });

  test('Static988Button is imported EAGERLY, never lazily', () => {
    // CLAUDE.md crisis-path rule: a fallback that must resolve a chunk before it can
    // render is not a fallback.
    expect(source).toMatch(
      /^import Static988Button from '@\/features\/crisis\/components\/Static988Button';$/m,
    );
    expect(source).not.toMatch(/lazy\(\s*\(\)\s*=>\s*import\([^)]*Static988Button/);
  });
});

describe('CollapsibleCrisisButton — reduce-motion read fails OPEN', () => {
  /**
   * The catch used to `setReduceMotionEnabled(false)`, so an errored or unavailable
   * accessibility read left the button in its FADED immersive state. A predicate that can
   * dim the crisis button must resolve toward showing it fully when its input is unknown.
   */
  const source = require('fs').readFileSync(
    require('path').join(
      __dirname,
      '../../src/features/crisis/components/CollapsibleCrisisButton.tsx',
    ),
    'utf8',
  );

  test('an errored isReduceMotionEnabled() read defaults to TRUE (no fade)', () => {
    const idx = source.indexOf('isReduceMotionEnabled');
    const region = source.slice(idx, idx + 1200);
    const catchBlock = region.slice(region.indexOf('} catch'));
    expect(catchBlock).toContain('setReduceMotionEnabled(true)');
    expect(catchBlock).not.toContain('setReduceMotionEnabled(false)');
  });
});

describe('LoadingScreen — the always-reachable pre-route window', () => {
  /**
   * `RootCrisisButton` mounts INSIDE NavigationContainer; the
   * `if (!initialRoute) return <LoadingScreen />` early return sits above it. So every
   * cold launch has a window with the app on screen and no crisis button — no error
   * required. NavigationContainer independently withholds children while linkingConfig
   * resolves getInitialURL(), which is a second gate above the same button.
   *
   * This is the change that closes the whole class, and it is why the fix is not simply
   * "add an error boundary": nothing throws during a normal launch.
   */
  const source = require('fs').readFileSync(
    require('path').join(__dirname, '../../src/core/navigation/CleanRootNavigator.tsx'),
    'utf8',
  );

  test('LoadingScreen renders a 988 control', () => {
    const idx = source.indexOf('const LoadingScreen');
    const body = source.slice(idx, source.indexOf('const CleanRootNavigator', idx));
    expect(body).toContain('Static988Button');
  });

  test('checkInitialRoute is bounded and defaults to LegalGate on failure', () => {
    // Fail SAFE, not fail OPEN-TO-MAIN: routing an unconsented or under-age user into
    // the full app on a storage error is a consent violation, and for a minor a safety
    // one. LegalGate is only the right default because this change also made its crisis
    // section unconditional.
    expect(source).toContain('INITIAL_ROUTE_TIMEOUT_MS');
    expect(source).toContain('Promise.allSettled');
    const idx = source.indexOf('} catch (error) {');
    const catchBlock = source.slice(idx, idx + 800);
    expect(catchBlock).toContain("setInitialRoute('LegalGate')");
  });

  test('the crisis overlay is wrapped in its own boundary', () => {
    // So a reanimated / gesture-handler / vector-icon throw loses the animated button
    // only, rather than propagating to the root boundary and blanking the whole app.
    const idx = source.indexOf('<RootCrisisButton routeName=');
    const region = source.slice(Math.max(0, idx - 900), idx + 200);
    expect(region).toContain('<RootCrisisBoundary>');
  });
});

describe('App.tsx — the root boundary exists at all', () => {
  const source = require('fs').readFileSync(
    require('path').join(__dirname, '../../App.tsx'),
    'utf8',
  );

  test('RootCrisisBoundary is the immediate parent of CleanRootNavigator', () => {
    // Sentry.wrap is a profiler/touch wrapper — componentDidCatch appears nowhere in its
    // tree — so before this the app had no boundary at any level above the navigator.
    const idx = source.indexOf('<RootCrisisBoundary');
    expect(idx).toBeGreaterThan(-1);
    const region = source.slice(idx, source.indexOf('</RootCrisisBoundary>') + 30);
    expect(region).toContain('<CleanRootNavigator />');
  });

  test('the boundary sits INSIDE SafeAreaProvider and GestureHandlerRootView', () => {
    const gh = source.indexOf('<GestureHandlerRootView');
    const sa = source.indexOf('<SafeAreaProvider>');
    const rb = source.indexOf('<RootCrisisBoundary');
    expect(gh).toBeLessThan(sa);
    expect(sa).toBeLessThan(rb);
  });
});

describe('DailyLoopDepthSelectScreen — DEBUG-469: the depth choices are pinned OUTSIDE the ScrollView', () => {
  /**
   * DEBUG-432's defect a third time, on the daily-loop ENTRY point. At AX5 the picker's
   * intro copy alone spans 880pt, so both depth Pressables — the only way into the loop —
   * were pushed clean out of the XCUITest hierarchy on a 667pt screen. The screen was
   * already a ScrollView, so "add a scroll" was not the fix; the choices had to leave it.
   *
   * Measured before the fix (`maestro hierarchy`, Release build, provenance ce393ec0,
   * clean tree, content_size accessibility-extra-extra-extra-large):
   *   iPhone 16e  390x844  "Daily Practice" y=133..491, subtitle y=499..1013
   *                        daily-loop-depth-quick / -deep  ABSENT from the hierarchy
   *
   * THE CLEARANCE IS NOT COSMETIC. `DailyLoop` is a ROOT-STACK MODAL with no tab bar, but
   * CollapsibleCrisisButton is positioned `bottom: 100` under a comment reading "Above tab
   * bar" — true on a tabbed screen, false here — so the FAB's touch band (44pt target plus
   * 12pt hitSlop, right 0..56) lands squarely in content. While the cards were scroll
   * children they moved out from under it; pinned, they cannot, and the FAB wins both
   * z-order (zIndex 9999) and hit-testing. Without the inset a practice-choice tap on a
   * card's right-hand end silently navigates to CrisisResources.
   *
   * Source-level on purpose: this file is the structural safety suite, renders nothing, and
   * is the copy that runs in precommit.
   */
  const rawSource = require('fs').readFileSync(
    require('path').join(
      __dirname,
      '../../src/features/practices/dailyloop/screens/DailyLoopDepthSelectScreen.tsx',
    ),
    'utf8',
  );

  /** DEBUG-390: assert what the file DOES, never what it SAYS. */
  const stripComments = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const source = stripComments(rawSource);

  /**
   * DEBUG-390's second failure mode: stripping plus a narrow matcher can silently match
   * NOTHING and stay green forever. Proof-of-liveness for everything below.
   */
  test('the comment-stripped matcher can still go red', () => {
    expect(source.length).toBeGreaterThan(800);
    expect(source).toContain('</ScrollView>');
    expect(source).toContain('testID={`daily-loop-depth-');

    const knownBad = `
      <ScrollView>
        <Pressable testID={\`daily-loop-depth-${'${depth}'}\`} />
      </ScrollView>
    `;
    // Applied to a nested control the comparator must FAIL, or it proves nothing.
    expect(knownBad.indexOf('testID={`daily-loop-depth-')).toBeLessThan(
      knownBad.indexOf('</ScrollView>'),
    );
  });

  test('the depth choices are declared AFTER the ScrollView closes', () => {
    const scrollViewCloses = source.indexOf('</ScrollView>');
    // Match the CHOICE template specifically. A bare `daily-loop-depth-` also matches the
    // container's own `daily-loop-depth-select-screen`, which legitimately precedes the
    // ScrollView — a matcher that finds the wrong element reads as a failure on correct code.
    const choiceDeclared = source.indexOf('testID={`daily-loop-depth-');

    expect(scrollViewCloses).toBeGreaterThan(-1);
    expect(choiceDeclared).toBeGreaterThan(-1);
    expect(choiceDeclared).toBeGreaterThan(scrollViewCloses);
  });

  test('the pinned region declares its own CRISIS_FAB_CLEARANCE', () => {
    // Its OWN, not imported from features/consent — the two existing sites each declare
    // one locally, and a shared import would couple a practice screen to consent.
    expect(source).toMatch(/const\s+CRISIS_FAB_CLEARANCE\s*=/);
  });

  test('the clearance is applied as paddingRight, AFTER any paddingHorizontal', () => {
    // RN StyleSheet is last-key-wins, so a paddingHorizontal declared afterwards would
    // silently overwrite the inset and restore the collision with no visible diff.
    expect(source).toMatch(/paddingRight:\s*CRISIS_FAB_CLEARANCE/);
    // Fail CLOSED if the anchor is gone: indexOf(-1) would make the slices below
    // degenerate and the assertion pass while checking nothing.
    const choicesAt = source.indexOf('choices:');
    expect(choicesAt).toBeGreaterThan(-1);
    const pinnedBlock = source.slice(choicesAt);
    const horiz = pinnedBlock.indexOf('paddingHorizontal');
    const right = pinnedBlock.indexOf('paddingRight');
    expect(right).toBeGreaterThan(-1);
    if (horiz > -1) expect(right).toBeGreaterThan(horiz);
  });

  test('the clearance is NOT applied to the scrolling content container', () => {
    // Insetting the prose buys nothing — it scrolls out from under the FAB — and it would
    // narrow the framework copy the philosopher pass ruled must stay intact.
    const contentAt = source.indexOf('content:');
    const choicesAt = source.indexOf('choices:');
    expect(contentAt).toBeGreaterThan(-1);
    expect(choicesAt).toBeGreaterThan(contentAt);
    const contentBlock = source.slice(contentAt, choicesAt);
    expect(contentBlock.length).toBeGreaterThan(20);
    expect(contentBlock).not.toMatch(/paddingRight:\s*CRISIS_FAB_CLEARANCE/);
  });

  test('both depths render from ONE template, so their treatment is symmetric', () => {
    // FEAT-301: two EQUAL choices. Two hand-written Pressables could drift apart and
    // reintroduce ranking; one map over DEPTHS makes symmetry structural.
    expect(source).toMatch(/DEPTHS\.map\(/);
    expect((source.match(/testID=\{`daily-loop-depth-/g) ?? []).length).toBe(1);
  });

  test('the pinned region is a flex sibling, never absolutely positioned', () => {
    // Absolute positioning re-introduces the RN parent-padding-box trap (DEBUG-403) and
    // would let the region float over the FAB rather than beside it.
    const choicesAt = source.indexOf('choices:');
    expect(choicesAt).toBeGreaterThan(-1);
    const pinnedBlock = source.slice(choicesAt, choicesAt + 400);
    expect(pinnedBlock).not.toMatch(/position:\s*'absolute'/);
  });
});

describe('DailyLoopStepScreen — DEBUG-465: the support line is pinned OUTSIDE the ScrollView', () => {
  /**
   * DEBUG-432's defect, on the daily-loop practice beat. FEAT-301 re-hosted SUPPORT_LINE
   * onto a no-breath-gate beat so it renders the instant the user lands — anything less
   * makes quick's crisis affordance strictly less available than deep's, which the
   * FEAT-301 crisis review rejected. As the second-to-last child of the beat's only
   * ScrollView it did not hold.
   *
   * Measured before the fix (`maestro hierarchy`, Release build, provenance c1c01157,
   * clean tree; quick depth, flat tense, default Dynamic Type, no stage note):
   *   iPhone SE 3   375x667  fold y=130..667  ABSENT from the hierarchy (~90pt below)
   *   iPhone 16e    390x844  fold y=157..844  y=785..843  (1pt clearance)
   *   iPhone 16 Pro 402x874  fold y=172..874  y=800..858  (16pt clearance)
   * On the viewport scripts/e2e-sim-device.sh names E2E_SMALLEST_SUPPORTED_MODEL it was
   * not clipped but ABSENT — 0% of the tap target on screen.
   *
   * The bar must also stay INSIDE the KeyboardAvoidingView: this beat exists to be typed
   * into, and with the keyboard up `crisis-button-root` is not dimmed but gone, in
   * UIRemoteKeyboardWindow above the app's. That is asserted here too, because it is an
   * ordering property no render test in jsdom can see.
   *
   * Source-level on purpose: this file is the structural safety suite, renders nothing,
   * and is the copy that runs in precommit. The authoritative render-tree equivalent —
   * the ancestor walk from the control — is
   * src/features/practices/dailyloop/__tests__/DailyLoopStepScreen.crisisSupportLineReachability.test.tsx.
   */
  const rawSource = require('fs').readFileSync(
    require('path').join(
      __dirname,
      '../../src/features/practices/dailyloop/screens/DailyLoopStepScreen.tsx',
    ),
    'utf8',
  );

  /**
   * DEBUG-390's lesson. This screen's prose names `ScrollView`, `KeyboardAvoidingView` and
   * the support line repeatedly — the block comment at the bar's own render site does all
   * three — so an assertion about what the file DOES must not read what it SAYS.
   */
  const stripComments = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const source = stripComments(rawSource);

  /**
   * DEBUG-390's second failure mode: comment-stripping plus a narrow matcher is exactly
   * the combination that can silently match NOTHING and stay green forever. This is the
   * proof-of-liveness for the tests below — it fails if stripping ate the render body, and
   * it fails if the comparator stops discriminating a known-bad shape.
   */
  test('the comment-stripped matcher can still go red', () => {
    expect(source.length).toBeGreaterThan(2000);
    expect(source).toContain('</ScrollView>');
    expect(source).toContain('</KeyboardAvoidingView>');
    expect(source).toContain('daily-loop-support-line');

    const knownBad = `
      <ScrollView>
        <Pressable testID="daily-loop-support-line" />
      </ScrollView>
    `;
    // The comparator applied to a nested control must FAIL, or it proves nothing.
    expect(knownBad.indexOf('daily-loop-support-line')).toBeLessThan(
      knownBad.indexOf('</ScrollView>'),
    );
  });

  test('daily-loop-support-line is declared AFTER the ScrollView closes', () => {
    const scrollViewCloses = source.indexOf('</ScrollView>');
    const lineDeclared = source.indexOf('daily-loop-support-line');

    expect(scrollViewCloses).toBeGreaterThan(-1);
    expect(lineDeclared).toBeGreaterThan(-1);
    expect(lineDeclared).toBeGreaterThan(scrollViewCloses);
  });

  test('...and BEFORE the KeyboardAvoidingView closes', () => {
    // Not a stylistic preference. Outside the KAV the software keyboard covers the bar,
    // and keyboard-up is this beat's typical state — which is precisely the state in which
    // crisis-button-root is absent from the app's window entirely.
    const kavCloses = source.indexOf('</KeyboardAvoidingView>');
    const lineDeclared = source.indexOf('daily-loop-support-line');

    expect(kavCloses).toBeGreaterThan(-1);
    expect(lineDeclared).toBeLessThan(kavCloses);
  });

  test('exactly one daily-loop-support-line exists in the file', () => {
    // The exactly-once-per-depth invariant is owned at the data level by showsSupportLine()
    // and asserted in tenseMode.test.ts. This guards the render site: a duplicate would
    // also make the selector in .maestro/daily-loop-quick-depth.yaml ambiguous.
    expect(source.match(/daily-loop-support-line/g)).toHaveLength(1);
  });

  test('the line still navigates to CrisisResources and never dials directly', () => {
    // The destination owns the dial. A bare tel: here would bypass the guarded path and
    // put a second dialling control on a practice surface (DEBUG-341).
    expect(source).toContain('openCrisisResources');
    expect(source).not.toMatch(/Linking\.openURL\(\s*['"]tel:/);
  });

  test('the bar reserves the bottom safe area', () => {
    // DEBUG-432's trap: pinned bars sit under the home indicator unless the 'bottom' edge
    // is claimed. This screen previously reserved nothing there at all.
    expect(source).toMatch(/edges=\{\[\s*'bottom'\s*\]\}/);
  });
});

