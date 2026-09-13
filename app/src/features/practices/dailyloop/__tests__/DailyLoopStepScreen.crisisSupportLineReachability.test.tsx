/**
 * DEBUG-465 — the daily-loop crisis support line is reachable WITHOUT scrolling.
 *
 * THE INVARIANT, from tenseMode.ts:120-131. FEAT-301 re-hosted SUPPORT_LINE onto Sphere
 * Sovereignty specifically because it is a no-breath-gate beat that "renders the instant
 * the user lands" — anything less would make quick's crisis affordance "strictly less
 * available than deep's", which the FEAT-301 crisis review rejected. The line being
 * PRESENT is not the contract; the line being reachable at scroll offset 0 is.
 *
 * IT FAILED. Measured on a Release build (provenance c1c01157, clean tree) via
 * `maestro hierarchy` real bounds — not screenshots, per DEBUG-403, which records two
 * wrong fixes diagnosed from renders that were pixel-identical. Quick depth, flat tense,
 * default Dynamic Type, minimum-content configuration (no stage note, and
 * PreviousAnswerCard never renders in quick — DailyLoopNavigator.tsx:214):
 *
 *   iPhone SE 3   375x667   fold y=130..667   support line ABSENT      (~90pt below)
 *   iPhone 16e    390x844   fold y=157..844   support line y=785..843  (1pt clearance)
 *   iPhone 16 Pro 402x874   fold y=172..874   support line y=800..858  (16pt clearance)
 *
 * On the viewport scripts/e2e-sim-device.sh names as E2E_SMALLEST_SUPPORTED_MODEL the
 * line was not merely clipped but ABSENT FROM THE ACCESSIBILITY TREE — DEBUG-432's
 * signature verbatim. The 1pt on 390x844 is a coincidence, not a margin.
 *
 * WHY A PINNED BAR RATHER THAN TRIMMING THE BEAT. Spending every editorial lever at once
 * — subtitle 3->2 lines, notMine hint 2->1 line, deleting the reflect note, both inputs
 * 96->72 — yields ~-129pt against a ~141pt overflow at 402x874 and ~165pt at 390x844,
 * before SE 3. Trimming cannot reach it, and leaves the beat one Dynamic Type step from
 * re-breaking. Pinning makes the deficit zero by construction at every viewport and every
 * type size.
 *
 * WHY THE BAR MUST SIT INSIDE THE KeyboardAvoidingView. This beat's purpose is typing
 * into two multiline fields, so keyboard-up is its TYPICAL state — and in that state
 * `crisis-button-root` is not dimmed, it is gone, rendered in UIRemoteKeyboardWindow
 * above the app's (RootCrisisButton.tsx:129-137). A bar inside the KAV is lifted by the
 * KAV's own padding and is the only affordance that survives it. Outside the KAV the
 * keyboard covers it and that argument inverts.
 *
 * Companion pins, none substituting for another:
 *   • __tests__/safety/crisis-zero-988-windows.test.tsx — source-shape, runs in precommit.
 *   • .maestro/daily-loop-quick-depth.yaml — real on-device layout, the only pin that sees
 *     safe-area insets and Dynamic Type at all. It is NOT load-bearing on its own:
 *     e2e-sim-device.sh pins no simulator MODEL, which is exactly how DEBUG-432 stayed
 *     green while broken.
 * This one is authoritative for STRUCTURE: it survives extracting the bar into its own
 * component, which a source-shape assertion does not. It CANNOT prove the fold — no
 * layout engine runs here — so a green result here is never the reachability contract.
 */
import React from 'react';
import { render, within } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import DailyLoopStepScreen from '../screens/DailyLoopStepScreen';
import { useEducationStore } from '@/features/learn/stores/educationStore';
import { SUPPORT_LINE, QUICK_SUPPORT_STEP } from '../config/tenseMode';
import type { DailyLoopMode } from '@/features/practices/types/flows';
import type { ModuleId, ModuleProgress } from '@/features/learn/types/education';

/** All three tenses. The beat's copy length varies by tense, so the pin must too. */
const MODES: DailyLoopMode[] = ['flat', 'morning', 'evening'];

const MODULE_IDS: ModuleId[] = [
  'aware-presence',
  'radical-acceptance',
  'sphere-sovereignty',
  'virtuous-response',
  'interconnected-living',
];

/** No self-assessment anywhere, so no stage note competes for the beat. */
const clearStages = () => {
  const blank: ModuleProgress = {
    status: 'not_started',
    lastAccessedAt: new Date(),
    completedSections: [],
    developmentalStage: null,
    practiceCount: 0,
    reflectionResponses: [],
    optOutFlags: [],
  };
  useEducationStore.setState({
    modules: Object.fromEntries(MODULE_IDS.map((id) => [id, blank])) as Record<
      ModuleId,
      ModuleProgress
    >,
  });
};

beforeEach(clearStages);

const renderQuickSupportBeat = (mode: DailyLoopMode = 'flat') =>
  render(
    <DailyLoopStepScreen
      stepKey={QUICK_SUPPORT_STEP}
      mode={mode}
      depth="quick"
      onSave={jest.fn()}
    />,
  );

describe('DEBUG-465 — the support line is pinned OUTSIDE the ScrollView', () => {
  it.each(MODES)(
    'is NOT a descendant of the ScrollView in %s tense',
    (mode) => {
      const screen = renderQuickSupportBeat(mode);
      const scrollView = screen.UNSAFE_getByType(ScrollView);

      // The ancestor walk, not a child-order comparison. Order within one parent is only
      // a proxy for "above the fold"; being outside the scrolling container is the actual
      // property, and it is the one that survives a refactor into a sibling component.
      expect(within(scrollView).queryByTestId('daily-loop-support-line')).toBeNull();

      // ...and it must still EXIST. Deleting the line satisfies the assertion above
      // trivially — DEBUG-432's recorded lesson about position tests.
      expect(screen.getByTestId('daily-loop-support-line')).toBeTruthy();
    },
  );

  it('renders exactly one support line on the beat', () => {
    const screen = renderQuickSupportBeat();
    expect(screen.getAllByTestId('daily-loop-support-line')).toHaveLength(1);
  });

  it('leaves continue-button inside the ScrollView', () => {
    // Deliberate, and the asymmetry is the point: crisis review confirmed continue-button
    // carries NO reachability contract, so it may fall below the fold. Pinning it too
    // would put a second persistent control in the bar and read as "continue vs. I'm in
    // crisis" — a choice the user is made to declare.
    const screen = renderQuickSupportBeat();
    const scrollView = screen.UNSAFE_getByType(ScrollView);
    expect(within(scrollView).queryByTestId('continue-button')).not.toBeNull();
  });

  it('does not render a support line on a quick beat that does not host it', () => {
    // The exactly-once-per-depth invariant is owned at the DATA level by showsSupportLine()
    // and asserted in tenseMode.test.ts. This guards only that pinning did not promote the
    // bar to unconditional screen chrome, which would make it recur on every beat.
    const screen = render(
      <DailyLoopStepScreen
        stepKey="VirtuousResponse"
        mode="flat"
        depth="quick"
        onSave={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('daily-loop-support-line')).toBeNull();
  });

  it('keeps the crisis register, tap target and screen-reader contract intact', () => {
    const screen = renderQuickSupportBeat();
    const line = screen.getByTestId('daily-loop-support-line');

    // Wording is crisis- and philosopher-reviewed (tenseMode.ts SUPPORT_LINE). Pinning
    // changes position only; it may not add urgency, an icon, or the number itself.
    expect(line.props.accessibilityLabel).toBe(SUPPORT_LINE);
    expect(line.props.accessibilityRole).toBe('button');
    expect(line.props.accessibilityHint).toBe('Opens crisis support resources');

    const style = Array.isArray(line.props.style)
      ? Object.assign({}, ...line.props.style)
      : line.props.style;
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });

  it('never truncates the line at any Dynamic Type size', () => {
    // DEBUG-390's xxxLarge post-mortem: a crisis affordance that ellipsises has lost the
    // sentence that makes it comprehensible. numberOfLines/ellipsizeMode are banned here.
    const screen = renderQuickSupportBeat();
    const text = within(screen.getByTestId('daily-loop-support-line')).getByText(SUPPORT_LINE);
    expect(text.props.numberOfLines).toBeUndefined();
    expect(text.props.ellipsizeMode).toBeUndefined();
  });
});
