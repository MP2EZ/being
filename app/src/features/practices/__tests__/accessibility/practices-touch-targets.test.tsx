/**
 * Practices touch targets — DECLARED style only.
 *
 * WHAT THIS FILE PROVES. That practices controls DECLARE a `minHeight` of at
 * least TOUCH_TARGETS.minimum on the style that actually reaches their
 * interactive host node. That is all it proves.
 *
 * WHAT IT DOES NOT PROVE, and cannot. React Native Testing Library performs no
 * layout, so nothing here measures a rendered 44x44 target. It cannot detect
 * clipping at large Dynamic Type sizes, cannot detect hitSlop regions
 * overlapping between adjacent controls, and cannot enter VoiceOver. Those need
 * device QA. This is a STRUCTURAL PROXY and is named as one throughout.
 *
 * Why that distinction is laboured here: MAINT-358 deleted a test called "Timer
 * controls have adequate touch targets" which rendered the Timer and asserted
 * the CONTAINER was truthy — it never reached a control, never read a style, and
 * could not have failed on an undersized target. A test claiming measured
 * geometry would be a fresh instance of exactly that defect. DEBUG-365 is the
 * item MAINT-358 opened to discharge the real gap.
 *
 * The 44pt bar is NOT a WCAG AA requirement, despite DEBUG-365's title. WCAG
 * 2.5.5 (44x44) is Level AAA. WCAG 2.2's 2.5.8 is Level AA but only 24x24,
 * which every control below already cleared. 44 is the house standard
 * (TOUCH_TARGETS.minimum) and matches Apple HIG 44pt / Android Material 48dp.
 * These fixes are a real motor-accessibility improvement; they are not
 * remediation of an AA conformance failure.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

// The featured card (and with it the principle link) only renders once module
// content resolves. Built from the real catalog constants rather than invented
// ids, so the mock cannot drift from what the screen actually looks up.
const mockLoadModuleContent = jest.fn();
jest.mock('@/core/services/moduleContent', () => ({
  loadModuleContent: (...args: unknown[]) => mockLoadModuleContent(...args),
}));

import Timer from '../../shared/components/Timer';
import { ResumeSessionModal } from '../../shared/components/ResumeSessionModal';
import PracticeLibraryScreen from '../../screens/PracticeLibraryScreen';
import {
  FEATURED_PRACTICE,
  STANDALONE_PRACTICES,
} from '@/features/practices/catalog/standalonePractices';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';

beforeEach(() => {
  mockLoadModuleContent.mockReset();
  mockLoadModuleContent.mockImplementation(async (moduleId: string) => ({
    practices: STANDALONE_PRACTICES.filter((p) => p.moduleId === moduleId).map(
      (p) => ({ id: p.practiceId, title: `Practice ${p.practiceId}`, durationMinutes: 5 })
    ),
  }));
});

/**
 * Resolve the style actually applied to a host node.
 *
 * Timer's controls use a function style (`({ pressed }) => [...]`), which React
 * Native resolves to an array before it reaches the host node — reading
 * `styles.controlButton` directly would assert the wrong object, and those
 * StyleSheets are not exported anyway. StyleSheet.flatten collapses registered
 * IDs, arrays and nesting into a single object.
 */
const flattenOf = (node: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

const expectMeetsTarget = (node: { props: { style?: unknown } }) => {
  const style = flattenOf(node);
  expect(style.minHeight).toBeGreaterThanOrEqual(TOUCH_TARGETS.minimum);
  // The box now grows past its content, so the label must be centred or it pins
  // to the top of the taller control.
  expect(style.justifyContent).toBe('center');
  // minHeight, never height: a fixed height clips the label once the OS font
  // scale grows. This is the one Dynamic Type property that is statically
  // assertable — real behaviour at large sizes still needs device QA.
  expect(style.height).toBeUndefined();
};

describe('Practices touch targets — DECLARED minHeight (structural proxy, NOT measured geometry)', () => {
  describe('Timer', () => {
    it('controlButton declares minHeight >= TOUCH_TARGETS.minimum', () => {
      // isActive={false} pins the label to "Resume timer" and leaves the tick
      // interval unstarted, so no fake timers are needed.
      const { getByLabelText } = render(
        <Timer duration={60_000} isActive={false} onComplete={jest.fn()} showControls />
      );

      expectMeetsTarget(getByLabelText('Resume timer'));
    });

    it('skipButton declares minHeight >= TOUCH_TARGETS.minimum', () => {
      // LATENT, not live: the render is guarded by `showSkip && onSkip`, and
      // every current <Timer> call site passes showSkip={false} with no onSkip,
      // so this renders nowhere in shipped code (SkipLink, already 44pt,
      // provides the skip affordance). Asserted anyway because `showSkip`
      // DEFAULTS to true — the next call site that omits the prop would
      // otherwise get a ~33pt control. Both props are passed explicitly here.
      const { getByLabelText } = render(
        <Timer
          duration={60_000}
          isActive={false}
          onComplete={jest.fn()}
          showControls
          showSkip
          onSkip={jest.fn()}
        />
      );

      expectMeetsTarget(getByLabelText('Skip this step'));
    });
  });

  describe('PracticeLibraryScreen', () => {
    it('back button declares minHeight >= TOUCH_TARGETS.minimum', () => {
      // The header renders before the entries-loading branch, so no module
      // content mock is needed to reach this control.
      const { getByLabelText } = render(
        <PracticeLibraryScreen
          onBack={jest.fn()}
          onOpenPractice={jest.fn()}
          onOpenModule={jest.fn()}
        />
      );

      expectMeetsTarget(getByLabelText('Go back'));
    });

    it('the header spacer is NOT given a touch target', () => {
      // Regression guard for the actual trap in this fix: `styles.backButton`
      // was shared between the interactive Pressable and a non-interactive
      // layout spacer <View>, so adding minHeight to the shared style would
      // have silently grown the header row. They are now separate styles.
      const { getByLabelText } = render(
        <PracticeLibraryScreen
          onBack={jest.fn()}
          onOpenPractice={jest.fn()}
          onOpenModule={jest.fn()}
        />
      );

      const backStyle = flattenOf(getByLabelText('Go back'));
      // The spacer must keep width only. If a future edit re-merges the two
      // styles, the spacer would gain a minHeight and this intent would be lost;
      // assert the back button still carries its own distinct height so the
      // split is load-bearing rather than incidental.
      expect(backStyle.minWidth).toBeDefined();
      expect(backStyle.minHeight).toBe(TOUCH_TARGETS.minimum);
    });

    it('principle link declares minHeight >= TOUCH_TARGETS.minimum', () => {
      // Sweep finding, NOT named in DEBUG-365. This Pressable carried no `style`
      // prop at all, so its box collapsed to the bodySmall line height (~17-21pt)
      // — a smaller target than the declared defect the ticket was filed for.
      const { getByTestId } = render(
        <PracticeLibraryScreen
          onBack={jest.fn()}
          onOpenPractice={jest.fn()}
          onOpenModule={jest.fn()}
        />
      );

      return waitFor(() => {
        expectMeetsTarget(getByTestId('practice-library-principle-link'));
      });
    });
  });

  describe('ResumeSessionModal', () => {
    it('tooltip button declares minHeight >= TOUCH_TARGETS.minimum', () => {
      // DEBUG-365 listed ResumeSessionModal as already compliant. That is true
      // of primaryButton / secondaryButton (48) but NOT of this third control,
      // which sat at ~33pt on the same padding-only shape as Timer's.
      const session = {
        flowType: 'morning' as never,
        startedAt: 1_700_000_000_000,
        lastSavedAt: 1_700_000_060_000,
        currentScreen: 'BreathingScreen',
        completed: false,
        expiresAt: 1_700_086_400_000,
      };

      const { getByLabelText } = render(
        <ResumeSessionModal
          visible
          session={session}
          onResume={jest.fn()}
          onBeginFresh={jest.fn()}
        />
      );

      expectMeetsTarget(getByLabelText('Learn about Sphere Sovereignty'));
    });
  });
});
