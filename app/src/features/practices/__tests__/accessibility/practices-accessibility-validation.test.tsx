/**
 * Practices check-in flows — accessibility assertions.
 *
 * WHAT THIS FILE PROVES (and it is narrower than the old header claimed):
 * - `CollapsibleCrisisButton` exposes the exact accessibilityRole, label and
 *   hint the crisis surface depends on, and carries its 12pt hitSlop. These are
 *   the ONLY assertions of that label and that hitSlop anywhere in the repo —
 *   the sibling `CollapsibleCrisisButton.accessibility.test.ts` pins width and
 *   height but neither of these. Do not delete them believing they are covered.
 * - `BreathingCircle` announces "Breathe in" synchronously on activation, stays
 *   silent when inactive, and STILL announces under `reducedMotion`.
 * - The three components render without crashing.
 *
 * WHAT IT DOES NOT PROVE. It measures no contrast ratio, no rendered tap-target
 * geometry, and no OS-level mode. React Native Testing Library performs no
 * layout, and jest has no high-contrast, Dynamic Type, or VoiceOver mode to
 * enter — those need device QA. Tests named for such properties are therefore
 * absent by design rather than faked.
 *
 * MAINT-358 removed 8 tests that could not fail — three self-asserting
 * checklists that declared an object of 34 `true` values, asserted it against
 * itself and printed `✅ contrastRatioMet: PASS` / `🚨 crisisResponseTime: PASS`
 * into CI logs; three `expect(true).toBe(true)` placeholders; and two tests that
 * asserted only that a jest mock was defined. Also removed a "colors adapt to
 * high contrast" test whose `themes.forEach` loop variable reached nothing but
 * the testID string — `BreathingCircleProps` has no `theme` prop, so it rendered
 * the same component three times.
 *
 * If you add a test here, it must be able to fail. See docs/testing/
 * accessibility-suite-coverage.md for what the wider gate does and does not
 * cover.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

// Component imports
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import BreathingCircle from '../../shared/components/BreathingCircle';
import Timer from '../../shared/components/Timer';
// MAINT-65: EmotionGrid, NeedsGrid, EveningValueSlider removed as unused legacy components

// AccessibilityInfo is already mocked globally in __tests__/setup/jest.setup.js.
// A local jest.mock('react-native', ...) here would override the carefully-tuned
// global mock (which exposes safe RN primitives + AccessibilityInfo + UIManager)
// and re-introduce TurboModule errors via jest.requireActual.

describe('DRD Check-in Flows Accessibility Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. SCREEN READER NAVIGATION', () => {
    describe('CollapsibleCrisisButton Accessibility', () => {
      it('CRITICAL: Crisis button has proper accessibility labels', () => {
        const { getByTestId } = render(
          <CollapsibleCrisisButton testID="crisis-button" />
        );

        const crisisButton = getByTestId('crisis-button');

        expect(crisisButton.props.accessibilityRole).toBe('button');
        expect(crisisButton.props.accessibilityLabel).toBe('I need support');
        expect(crisisButton.props.accessibilityHint).toContain('crisis');
      });

      it('CRITICAL: Crisis chevron is accessible', () => {
        const { getByTestId } = render(
          <CollapsibleCrisisButton testID="collapsible-crisis" />
        );

        const chevron = getByTestId('collapsible-crisis');

        expect(chevron.props.accessibilityRole).toBe('button');
        expect(chevron.props.accessibilityLabel).toBeTruthy();
      });
    });

    describe('BreathingCircle Accessibility', () => {
      // Renamed from "has proper accessibility description": it asserts no
      // description. getByTestId throws when the node is absent, so this is a
      // render smoke test — real, but only that. The announcement contract is
      // asserted in section 4.
      it('renders while active and exposes its testID', () => {
        const { getByTestId } = render(
          <BreathingCircle isActive={true} testID="breathing-circle" />
        );

        expect(getByTestId('breathing-circle')).toBeTruthy();
      });
    });

    describe('Timer Accessibility', () => {
      // Renamed from "has proper accessibility role and labels": it asserts
      // neither. Left as a render smoke test rather than deleted — nothing else
      // in the repo renders this Timer.
      it('renders while active and exposes its testID', () => {
        const { getByTestId } = render(
          <Timer
            duration={60000}
            isActive={true}
            onComplete={jest.fn()}
            testID="timer"
          />
        );

        expect(getByTestId('timer')).toBeTruthy();
      });
    });

    // MAINT-65: Interactive Grid Accessibility tests removed
    // EmotionGrid and NeedsGrid were deleted as unused legacy components
  });

  describe('2. VOICE CONTROL COMPATIBILITY', () => {
    it('CRITICAL: All interactive elements support voice activation', () => {
      const components = [
        { component: CollapsibleCrisisButton, props: { testID: 'collapsible-crisis' } },
        // MAINT-65: EmotionGrid and NeedsGrid removed as unused legacy components
      ];

      components.forEach(({ component: Component, props }) => {
        const { getByTestId } = render(<Component {...props} />);
        const element = getByTestId(props.testID!);

        // Verify voice control requirements
        expect(element.props.accessibilityRole).toBeTruthy();
        expect(element.props.accessibilityLabel).toBeTruthy();
      });
    });
  });

  // MAINT-358: the "HIGH CONTRAST MODE SUPPORT" section is gone rather than
  // renamed. Neither of its tests touched contrast: one rendered the crisis
  // button and asserted it existed (already covered by section 1, with stronger
  // assertions), and the other looped ['morning','midday','evening'] passing the
  // value nowhere but into a testID string — BreathingCircleProps has no `theme`
  // prop, so it rendered the identical component three times. jest cannot enter
  // an OS high-contrast mode at all; real contrast is computed against tokens in
  // core/theme/__tests__/theme-contrast.accessibility.test.ts, and the rest needs
  // device QA.

  describe('3. TOUCH TARGET ACCESSIBILITY', () => {
    it('CRITICAL: All buttons meet 44pt minimum touch target', () => {
      const { getByTestId } = render(
        <CollapsibleCrisisButton testID="collapsible-crisis-button" />
      );

      // Query by the testID prop (not a hardcoded literal) — that's the
      // actual interactive Pressable. 44pt visible button + 12pt hitSlop
      // on each side = 68pt effective target, comfortably above the WCAG
      // 2.5.5 minimum.
      const button = getByTestId('collapsible-crisis-button');
      expect(button.props.hitSlop).toEqual({
        top: 12,
        bottom: 12,
        left: 12,
        right: 12,
      });
    });

    // MAINT-358: "Timer controls have adequate touch targets" deleted. It
    // rendered the Timer and asserted the CONTAINER existed — it never reached a
    // control, never read a style, and could not have failed on an undersized
    // target. RNTL performs no layout, so no jest test can measure a rendered
    // tap target; a declared-minHeight assertion is the most that is honest.
    //
    // DEBUG-365 discharged that: Timer's controlButton/skipButton,
    // PracticeLibraryScreen's back button and principle link, and
    // ResumeSessionModal's tooltip button now declare minHeight, and the
    // declared-style assertions live in ./practices-touch-targets.test.tsx —
    // labelled a structural proxy there, not a geometry measurement.

    // MAINT-65: EmotionGrid and EveningValueSlider tests removed (unused legacy components)
  });

  describe('4. AUDIO ANNOUNCEMENTS FOR BREATHING EXERCISES', () => {
    it('CRITICAL: Breathing circle announces the inhale cue immediately on activation', () => {
      render(
        <BreathingCircle isActive={true} />
      );

      // The first "Breathe in" cue must fire synchronously on activation, not
      // be deferred to the first animation boundary (one cycle late). Subsequent
      // phase cues are driven by withSequence completion callbacks.
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Breathe in');
    });

    it('does not announce when inactive', () => {
      render(<BreathingCircle isActive={false} />);
      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });

    // MAINT-358: "Timer announces time remaining at key intervals" deleted — it
    // asserted `announceForAccessibility` was `toBeDefined()`, i.e. that the jest
    // mock existed. It was also unreachable by construction: the Timer's
    // thresholds are 30s/10s/≤5s, the test used a 60s duration and never advanced
    // timers, so no announcement could have fired even had it been asserted.

    it('still announces under reduced motion', () => {
      render(
        <BreathingCircle
          isActive={true}
          reducedMotion={true}
          testID="breathing-circle"
        />
      );

      // Reduced motion damps the visual but must NOT suppress audio cues —
      // the guidance text promises audio will guide breathing. This is the only
      // runtime assertion of that promise in the repo.
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Breathe in');
    });
  });

  // MAINT-358: the "REDUCED MOTION SUPPORT" and "FOCUS MANAGEMENT" sections are
  // gone. Reduced motion's only real assertion lives in section 4 above; what
  // remained here re-rendered the same component to assert it existed, plus an
  // `expect(true).toBe(true)` placeholder. Focus management asserted nothing
  // about focus — it rendered one component, and there is no focus ORDER to
  // traverse with a single node. VoiceOver/TalkBack traversal is not observable
  // in jest and belongs to device QA.

  // MAINT-358: the "COMPREHENSIVE ACCESSIBILITY CHECKLIST" section is gone. Its
  // three tests declared objects totalling 34 hardcoded `true` values, asserted
  // each against itself, and printed a PASS line per key into CI logs. They
  // computed nothing, rendered nothing, and could not fail. The most damaging
  // was `crisisResponseTime: true, // <200ms` printing `🚨 crisisResponseTime:
  // PASS` beside a budget that is genuinely gated elsewhere
  // (__tests__/performance/assessment-performance.test.ts). Real contrast
  // coverage lives in core/theme/__tests__/theme-contrast.accessibility.test.ts.
});