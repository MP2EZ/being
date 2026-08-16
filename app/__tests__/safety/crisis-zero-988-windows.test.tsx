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

  test('the MAIN branch keeps its always-visible crisis footer', () => {
    const mainBranchStart = source.lastIndexOf('  return (');
    const mainBranch = source.slice(mainBranchStart);
    expect(mainBranch).toContain('crisisFooter');
    expect(mainBranch).toContain('accessibilityLabel="Call 988"');
    expect(mainBranch).toContain('accessibilityLabel="Text Crisis Line"');
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
    const mainBranch = source.slice(source.lastIndexOf('  return ('));
    const scrollViewCloses = mainBranch.indexOf('</ScrollView>');
    const footerOpens = mainBranch.indexOf('styles.crisisFooter}');

    expect(scrollViewCloses).toBeGreaterThan(-1);
    expect(footerOpens).toBeGreaterThan(-1);
    expect(footerOpens).toBeGreaterThan(scrollViewCloses);
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
    expect(source).toContain("openCrisisUrl('tel:988'");
    expect(source).not.toMatch(/Linking\.openURL\(\s*['"]tel:988/);
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

