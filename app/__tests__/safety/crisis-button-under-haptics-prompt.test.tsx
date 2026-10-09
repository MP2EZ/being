/**
 * INFRA-427 — the root crisis button under the undismissable haptics opt-in prompt.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * ⚠️  THIS FILE IS NOT THE INFRA-427 VERIFICATION. DO NOT CITE IT AS ONE.
 *
 * INFRA-427 asks whether a screen-reader user can still REACH the 988 affordance
 * while `HapticsOptInPrompt` — the one screen state in the app that has no
 * dismissal path — is on screen. That question is answerable only on real
 * hardware, with VoiceOver or TalkBack actually running, and the answer is
 * recorded as a dated observation in the work item.
 *
 * This file is a STRUCTURAL REGRESSION PIN over the tree shape that reachability
 * depends on. It is not evidence about either screen reader, and a green run here
 * is not a determination. Read §"WHY GREEN HERE PROVES LESS THAN IT LOOKS" below
 * before treating any assertion in this file as a safety guarantee.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── THE TREE THIS PINS ──
 *
 * Two DIFFERENT modality mechanisms are in play, with different blast radii:
 *
 *   NavigationContainer
 *   └── <View style={styles.root}>                         CleanRootNavigator.tsx
 *       ├── <Stack.Navigator> … PracticeTimer | ReflectionTimer | BodyScan
 *       │     └── PracticeScreenLayout → <SafeAreaView>
 *       │           ├── <View testID="practice-screen-content"
 *       │           │      importantForAccessibility="no-hide-descendants">  ← Android
 *       │           └── {overlay} = HapticsOptInPrompt
 *       │                 └── <View accessibilityViewIsModal={true}>         ← iOS
 *       └── <RootCrisisBoundary><RootCrisisButton/></RootCrisisBoundary>     ← 988
 *
 * Android's `no-hide-descendants` is a pure tree relation scoped to the content
 * wrapper, and the crisis button is in a different subtree entirely — so for
 * Android these assertions are close to the real answer.
 *
 * iOS's `accessibilityViewIsModal` is the uncertain half. Apple documents it as
 * silencing the SIBLING VIEWS OF THE RECEIVER, and the crisis button is a sibling
 * of the Stack.Navigator rather than of the backdrop — several levels above the
 * modal's documented reach. That is the inference the device session exists to
 * check, not something this file can settle.
 *
 * ── WHY GREEN HERE PROVES LESS THAN IT LOOKS ──
 *
 * RNTL's `isHiddenFromAccessibility` (helpers/accessibility.js) implements
 * PRECISELY the per-level host-sibling rule the iOS inference assumes: it walks the
 * ancestor chain and hides an element only if one of its own host siblings carries
 * `aria-modal` / `accessibilityViewIsModal`. So RNTL's model IS the hypothesis under
 * test. Asserting reachability against it re-encodes the inference — it does not
 * discover anything about UIKit, and it says nothing about react-native-screens'
 * own modality flags on the enclosing RNSScreen.
 *
 * What that leaves, which is still worth the file: if someone later moves the
 * crisis button inside the hidden subtree, re-homes `no-hide-descendants` onto an
 * ancestor shared with the overlay, or nests `RootCrisisBoundary` inside the
 * navigator, these assertions go red. That is a real regression class, and nothing
 * else in the suite covers it — `haptic-cues-accessibility.test.tsx` renders
 * `PracticeScreenLayout` in isolation with a stand-in overlay and never mounts the
 * crisis button at all.
 *
 * ── WHAT THIS FILE DELIBERATELY DOES NOT ASSERT ──
 *
 * Screen-reader focus or traversal order; that activation navigates; taps-to-988;
 * that the prompt is not an RN <Modal> (already pinned at
 * haptic-cues-accessibility.test.tsx, do not duplicate); contrast ratios (DEBUG-396
 * owns the fade constant, and the backdrop colour is pinned in the same file).
 *
 * ── AND WHAT MUST NOT BE "FIXED" HERE ──
 *
 * The prompt having no ✕, no tap-outside, no swipe-to-dismiss, and a consuming
 * Android BackHandler is FEAT-385's ruling, not a defect. If the device
 * observation comes back unreachable, the fix is on the crisis-overlay side and
 * must preserve MAINT-290's single root mount. Adding a dismissal path would be a
 * worse failure than the one it addresses: spending the once-ever prompt by
 * accident is silent and permanent, where an unreachable button is at least
 * observable.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';

// The real CollapsibleCrisisButton is mounted on purpose — see MOUNT NOTE below.
// Only its two escape hatches out of the component tree are stubbed.
jest.mock('@/core/navigation/navigationRef', () => ({
  navigationRef: { isReady: () => true, navigate: jest.fn() },
  getActiveRootRouteName: jest.fn(),
}));
jest.mock('@/features/crisis/utils/openCrisisUrl', () => ({
  openCrisisUrl: jest.fn(),
}));

import PracticeScreenLayout from '@/features/learn/practices/shared/PracticeScreenLayout';
import HapticsOptInPrompt from '@/features/practices/shared/components/HapticsOptInPrompt';
import {
  RootCrisisButton,
  ROOT_CRISIS_BUTTON_TEST_ID,
  IMMERSIVE_ROUTES,
  SUPPRESSED_ROUTES,
} from '@/features/crisis/components/RootCrisisButton';

/**
 * The three screens that mount the prompt, with the `scrollable` value each one
 * actually passes. `PracticeScreenLayout`'s overlay slot documents different
 * nesting per branch, so both are exercised for every host rather than only the
 * combination that ships.
 */
const HOSTS = [
  { route: 'PracticeTimer', screen: 'PracticeTimerScreen.tsx', shipsScrollable: true },
  { route: 'ReflectionTimer', screen: 'ReflectionTimerScreen.tsx', shipsScrollable: true },
  { route: 'BodyScan', screen: 'BodyScanScreen.tsx', shipsScrollable: true },
] as const;

const SCROLLABLE = [false, true] as const;

/**
 * MOUNT NOTE — the real `CollapsibleCrisisButton`, and why no stub.
 *
 * `RootCrisisButton.test.tsx` stubs it as "heavy, animation-driven", which is right
 * for a suite asserting the route→mode contract. It would be fatal here: the stub
 * replaces exactly the accessibility props under assertion, so the test would pass
 * against a button that declares itself hidden. reanimated, gesture-handler,
 * safe-area-context and the vector-icon package are all mocked globally in
 * `__tests__/setup/jest.setup.js`, so the real component mounts fine.
 *
 * `CleanRootNavigator` is NOT mounted — it drags in NavigationContainer, the consent
 * gate, the stores and every screen. The root <View> below models the one structural
 * fact that matters (the button is a sibling of the navigator, not inside it), and
 * that modelling is what the source-ordinal block at the bottom exists to check.
 */
/** Minimal shape of an RNTL node, so this file needs no react-test-renderer types. */
type TestNode = { parent: TestNode | null; props: Record<string, unknown> };

/** Every `testID` on the ancestor chain above `node`, innermost first. */
const ancestorTestIds = (node: unknown): string[] => {
  const ids: string[] = [];
  for (let n = (node as TestNode).parent; n; n = n.parent) {
    const id = n.props?.testID;
    if (typeof id === 'string') ids.push(id);
  }
  return ids;
};

const renderHost = (routeName: string, scrollable: boolean) =>
  render(
    <View style={{ flex: 1 }}>
      <PracticeScreenLayout
        title="Practice"
        onBack={() => {}}
        scrollable={scrollable}
        overlay={<HapticsOptInPrompt onChoose={() => {}} />}
        testID="practice-screen"
      >
        <Text>practice content</Text>
      </PracticeScreenLayout>
      <RootCrisisButton routeName={routeName} />
    </View>,
  );

describe.each(HOSTS)(
  '$route — crisis button vs. the prompt subtrees',
  ({ route, shipsScrollable }) => {
    it('is classified IMMERSIVE, never suppressed', () => {
      // Derived from the exported Sets, never a literal copy (FEAT-417): a
      // hardcoded copy is how adding a route to SUPPRESSED_ROUTES — deleting the
      // 988 affordance from a whole screen — once failed zero tests.
      //
      // Suppression is the catastrophic shape for THIS item specifically: the
      // button would not be merely hidden from a screen reader, it would not be
      // mounted at all, on a screen state the user cannot leave.
      expect(SUPPRESSED_ROUTES.has(route)).toBe(false);
      expect(IMMERSIVE_ROUTES.has(route)).toBe(true);
    });

    it.each(SCROLLABLE)(
      'keeps the button out of the hidden subtree while the content goes (scrollable=%s)',
      (scrollable) => {
        const { getByTestId, queryByTestId } = renderHost(route, scrollable);

        // FIXTURE GUARD — first, because everything below is meaningless if the
        // overlay silently failed to render. The backdrop is queryable because it
        // is the sibling doing the hiding, not a victim of it.
        expect(queryByTestId('haptics-optin-prompt')).not.toBeNull();

        /**
         * ── THE CONTROLS, AND WHY THERE ARE THREE OF THEM ──
         *
         * This block originally had ONE control: `practice-screen-content` is
         * null. It was worthless, and the mutation run that proved it is worth
         * recording, because the assertion looked completely reasonable.
         *
         * Deleting the Android mechanism outright — hardcoding
         * `importantForAccessibility` to `'auto'` in PracticeScreenLayout —
         * left all 15 tests GREEN. RNTL's `isHiddenFromAccessibility` checks
         * `no-hide-descendants` AND the `aria-modal` host-sibling rule, and the
         * prompt's backdrop is a host sibling of the content wrapper. So the iOS
         * mechanism alone drives the content to null, and the Android mechanism
         * could be removed entirely without a single test going red.
         *
         * ABSENCE IS THE WRONG ASSERTION FOR A MECHANISM: two mechanisms produce
         * one indistinguishable effect. Each is now asserted on its own prop,
         * reading past the very hiding under test with `includeHiddenElements`.
         *
         * (`haptic-cues-accessibility.test.tsx:292` escapes this only by
         * accident — it uses a plain <Text> overlay carrying no
         * `accessibilityViewIsModal`, so there the null-ness does attribute to
         * `no-hide-descendants`. Swapping in the real prompt would break it.)
         */

        // CONTROL A — the ANDROID mechanism, on its own prop. TalkBack has no
        // equivalent of accessibilityViewIsModal, so this is the only thing
        // hiding the practice content on that platform.
        expect(
          getByTestId('practice-screen-content', { includeHiddenElements: true }).props
            .importantForAccessibility,
        ).toBe('no-hide-descendants');

        // CONTROL B — the iOS mechanism, on its own prop.
        expect(getByTestId('haptics-optin-prompt').props.accessibilityViewIsModal).toBe(
          true,
        );

        // CONTROL C — their combined effect. Kept because it is what a screen
        // reader actually experiences, but it is NOT attributable to either
        // mechanism on its own; A and B are what make this line interpretable.
        expect(queryByTestId('practice-screen-content')).toBeNull();

        // THE SUBJECT. `includeHiddenElements: false` is the repo default and is
        // passed explicitly anyway, so a global RNTL config change cannot defang
        // this line without touching it.
        const button = queryByTestId(ROOT_CRISIS_BUTTON_TEST_ID, {
          includeHiddenElements: false,
        });
        expect(button).not.toBeNull();

        // …and structurally, not merely by RNTL's verdict: the button is outside
        // the practice screen altogether, so neither mechanism has it in scope.
        // This is the claim the device session exists to check on real hardware.
        expect(ancestorTestIds(button)).not.toContain('practice-screen');
        expect(ancestorTestIds(button)).not.toContain('practice-screen-content');
      },
    );

    it('THE ANCESTOR WALKER CAN STILL GO RED', () => {
      // A negative structural assertion is worthless if the walker silently
      // returns nothing, so prove it finds a chain it is supposed to find.
      const { getByTestId } = renderHost(route, shipsScrollable);
      const heading = getByTestId('haptics-optin-prompt-heading');

      expect(ancestorTestIds(heading)).toContain('haptics-optin-prompt');
      expect(ancestorTestIds(heading)).toContain('practice-screen');
    });

    it('still declares itself an accessibility element in the FADED immersive state', () => {
      // `mode === 'immersive'` reaches opacity, shadow and the re-fade timer, and
      // nothing else — no conditional on `accessible`, `accessibilityElementsHidden`,
      // `importantForAccessibility` or size. This pins that, so a future "the button
      // is barely visible anyway" optimisation cannot quietly withdraw the element.
      const { getByTestId } = renderHost(route, shipsScrollable);
      const button = getByTestId(ROOT_CRISIS_BUTTON_TEST_ID);

      expect(button.props.accessible).toBe(true);
      expect(typeof button.props.accessibilityLabel).toBe('string');
      expect(button.props.accessibilityLabel.length).toBeGreaterThan(0);
    });
  },
);

/**
 * The fixture above builds the sibling relationship by hand, so on its own it is a
 * test of a fixture. This block is what ties it to the real mount site: it fails if
 * `RootCrisisBoundary` is ever nested INSIDE the Stack.Navigator, which is the
 * regression that would actually put the button under the modal's reach.
 */
describe('CleanRootNavigator — the boundary mounts OUTSIDE the navigator', () => {
  const NAVIGATOR_PATH = join(
    __dirname,
    '../../src/core/navigation/CleanRootNavigator.tsx',
  );
  const raw = readFileSync(NAVIGATOR_PATH, 'utf8');

  /** DEBUG-390: match what the file DOES, never what its prose says about itself. */
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  /** The predicate under test, applied to arbitrary source so it can be fire-checked. */
  const boundaryFollowsNavigator = (src: string): boolean => {
    const navigatorClose = src.indexOf('</Stack.Navigator>');
    const boundaryOpen = src.indexOf('<RootCrisisBoundary>');
    return navigatorClose > -1 && boundaryOpen > -1 && navigatorClose < boundaryOpen;
  };

  it('THE MATCHER CAN STILL GO RED', () => {
    // A comment-stripped, narrowly-shaped matcher is exactly the combination that
    // can silently match nothing at all, so prove it fires before trusting it.
    const knownBad =
      '<Stack.Navigator><RootCrisisBoundary><RootCrisisButton /></RootCrisisBoundary></Stack.Navigator>';
    expect(boundaryFollowsNavigator(knownBad)).toBe(false);

    const knownGood = '</Stack.Navigator><RootCrisisBoundary><RootCrisisButton /></RootCrisisBoundary>';
    expect(boundaryFollowsNavigator(knownGood)).toBe(true);
  });

  it('strips the comment block that would otherwise decide the ordinal', () => {
    // This is a live trap, not a hypothetical one: the JSX comment immediately
    // above the mount site is fifteen lines long and contains BOTH "Stack.Navigator"
    // and "RootCrisisButton" in prose. Stripping must actually remove it, and must
    // not gut the file while doing so.
    const stripped = stripComments(raw);

    expect(raw).toContain('Sibling of the root');
    expect(stripped).not.toContain('Sibling of the root');
    expect(stripped).toContain('<RootCrisisBoundary>');
    expect(stripped.length).toBeGreaterThan(10_000);
  });

  it('closes the navigator BEFORE opening the crisis boundary', () => {
    const stripped = stripComments(raw);

    // Both inside the component body, not in imports or a type block.
    const componentStart = stripped.indexOf('const CleanRootNavigator');
    expect(componentStart).toBeGreaterThan(-1);
    expect(stripped.indexOf('</Stack.Navigator>')).toBeGreaterThan(componentStart);

    expect(boundaryFollowsNavigator(stripped)).toBe(true);
  });
});
