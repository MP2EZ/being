/**
 * BreathingCircle — the opt-in paced grounding slot (DEBUG-468).
 *
 * WHAT THIS FILE CAN PROVE. The Reanimated shims in this tree stub
 * `withTiming: (val) => val`, so the animation's completion callbacks never
 * resolve and no cycle ever completes under jest. The ADVANCE is therefore not
 * observable here and is not asserted here — it lives in
 * `shared/__tests__/breathingGuidance.test.ts`, against the pure selector, which
 * is exactly why that selector is a separate module. What is provable here is the
 * wiring: which sentence occupies the slot at cycle 0, that the three other live
 * callers are untouched, and that the reduce-motion accommodation still stacks.
 *
 * WHY THE OPT-OUT CASES ARE THE MAJORITY OF THE FILE. `BreathingCircle` has four
 * live call sites and this change is for one of them. A regression here would not
 * look like a failure — it would look like PracticeTimerScreen quietly losing the
 * copy that tells a practitioner what to do.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import BreathingCircle from '../BreathingCircle';

const TRIAD = [
  'one physical sensation — feet on the ground, air on your skin',
  'the space around you — where you are right now',
  "what's present in your mind",
] as const;

const GENERIC_MOTION = 'Follow the circle as it expands and contracts';
const GENERIC_REDUCED = 'Each phase change is shown above as it happens';
const GENERIC_TRAILER = 'Let your breath find its natural rhythm';

describe('BreathingCircle — without guidanceItems (the three other callers)', () => {
  it('renders the generic guidance copy unchanged', () => {
    const screen = render(<BreathingCircle isActive testID="bc" />);
    expect(screen.getByText(GENERIC_MOTION)).toBeTruthy();
    expect(screen.getByText(GENERIC_TRAILER)).toBeTruthy();
    expect(screen.queryByTestId('bc-grounding')).toBeNull();
  });

  it('adds no accessibility grouping to the guidance container', () => {
    // The container's label is minted only for the paced case. Left on
    // unconditionally it would collapse the two generic lines into one
    // VoiceOver stop for every other screen — a silent regression.
    const screen = render(<BreathingCircle isActive testID="bc" />);
    expect(screen.queryByLabelText(/As you breathe, notice/)).toBeNull();
  });

  it('renders the generic copy even when an EMPTY list is supplied', () => {
    const screen = render(<BreathingCircle isActive testID="bc" guidanceItems={[]} />);
    expect(screen.getByText(GENERIC_MOTION)).toBeTruthy();
    expect(screen.queryByTestId('bc-grounding')).toBeNull();
  });
});

describe('BreathingCircle — with guidanceItems (Aware Presence)', () => {
  it('shows the first anchor, and only the first, at cycle 0', () => {
    const screen = render(<BreathingCircle isActive testID="bc" guidanceItems={TRIAD} />);
    expect(screen.getByTestId('bc-grounding')).toBeTruthy();
    expect(screen.getByText(TRIAD[0])).toBeTruthy();
    expect(screen.queryByText(TRIAD[1])).toBeNull();
    expect(screen.queryByText(TRIAD[2])).toBeNull();
  });

  it('replaces BOTH generic lines, which is where the reclaimed height comes from', () => {
    // Leaving the trailer behind would keep ~24pt of widget instruction competing
    // with the authored anchor, and would put two sentences in a slot sized for one.
    const screen = render(<BreathingCircle isActive testID="bc" guidanceItems={TRIAD} />);
    expect(screen.queryByText(GENERIC_MOTION)).toBeNull();
    expect(screen.queryByText(GENERIC_REDUCED)).toBeNull();
    expect(screen.queryByText(GENERIC_TRAILER)).toBeNull();
  });

  it('speaks the WHOLE triad as one label, since nothing announces the anchors', () => {
    // The visible text is a moving target and there is deliberately no
    // announcement (a 4-4 cycle already pushes two phase announcements every 8s,
    // and the third would land on the same instant as the next "Breathe in").
    // Focus therefore has to yield the triad whole or a screen-reader user gets
    // whichever anchor happened to be up.
    const screen = render(<BreathingCircle isActive testID="bc" guidanceItems={TRIAD} />);
    const label = screen.getByLabelText(
      `As you breathe, notice: ${TRIAD.join('; ')}`,
    );
    expect(label).toBeTruthy();
  });

  it('never truncates an anchor', () => {
    // A clipped anchor is not an anchor. Same reasoning DEBUG-390 recorded for the
    // crisis support line: the sentence is what makes it usable.
    const screen = render(<BreathingCircle isActive testID="bc" guidanceItems={TRIAD} />);
    const text = screen.getByText(TRIAD[0]);
    expect(text.props.numberOfLines).toBeUndefined();
    expect(text.props.ellipsizeMode).toBeUndefined();
  });

  // The reduce-motion INTERACTION — that the anchor stacks below the phase cue
  // rather than replacing it — is asserted in
  // `practices/__tests__/accessibility/BreathingCircle.reducedMotion.accessibility.test.tsx`,
  // not here. That file carries the useRef-backed Reanimated mock and the
  // `includeHiddenElements` handling the cue requires; reproducing either here
  // would duplicate a subtle harness and let the two drift.

  it('derives the grounding testID from the component default when none is passed', () => {
    // `testID` defaults to 'breathing-circle', so the suffixed id is always
    // available — a caller never has to opt in twice to address the slot.
    const screen = render(<BreathingCircle isActive guidanceItems={TRIAD} />);
    expect(screen.getByText(TRIAD[0]).props.testID).toBe('breathing-circle-grounding');
  });
});
