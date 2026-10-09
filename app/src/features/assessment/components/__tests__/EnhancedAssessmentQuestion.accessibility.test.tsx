/**
 * DEBUG-722 — the question screen must keep every answer reachable at any Dynamic Type size.
 *
 * Measured on a 375x667 simulator before this fix: with no scroll container and no font cap,
 * the fixed instruction text alone ran past the bottom of the screen at AX5, so no PHQ-9
 * question could be answered; at XXXL, Q9's "Nearly every day" sat below the clip.
 *
 * These specs pin the containment contract (content scrolls, the crisis affordances do not)
 * and the crisis-button column inset. They do not measure layout — jest has no Yoga
 * viewport. The on-device proof is the `assessment-ax5-reachability` Maestro flow.
 */
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('@/features/assessment/stores/assessmentStore', () => ({
  useAssessmentStore: jest.fn(),
}));

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { render, within } from '@testing-library/react-native';
import EnhancedAssessmentQuestion from '../EnhancedAssessmentQuestion';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { CRISIS_BUTTON_PROMINENT_EXCLUSION_RECT } from '@/features/crisis/constants/crisisButtonGeometry';
import type { AssessmentQuestion as AssessmentQuestionType } from '@/features/assessment/types';
import type { CrisisDetection } from '@/features/crisis/types/safety';

const q1: AssessmentQuestionType = {
  id: 'phq9_1',
  text: 'Little interest or pleasure in doing things',
  type: 'phq9',
  order: 1,
};

const q9: AssessmentQuestionType = {
  id: 'phq9_9',
  text: 'Thoughts that you would be better off dead, or of hurting yourself',
  type: 'phq9',
  order: 9,
};

const baseProps = { question: q9, onAnswer: jest.fn(), currentStep: 9, totalSteps: 9 };

const crisisDetection: CrisisDetection = {
  id: 'crisis-1',
  isTriggered: true,
  primaryTrigger: 'phq9_suicidal_ideation',
  secondaryTriggers: [],
  severityLevel: 'critical',
  triggerValue: 1,
  assessmentType: 'phq9',
  timestamp: Date.now(),
  assessmentId: 'test-session-1',
  userId: 'user-1',
  detectionResponseTimeMs: 50,
  context: { triggeringAnswers: [], timeOfDay: 'morning' },
};

const setStoreState = (state: { crisisDetection: CrisisDetection | null }) => {
  (useAssessmentStore as unknown as jest.Mock).mockImplementation(
    (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
  );
};

const OPTION_IDS = [0, 1, 2, 3].map((i) => `assessment-response-group-option-${i}`);

describe('DEBUG-722 · EnhancedAssessmentQuestion reachability at large text sizes', () => {
  beforeEach(() => setStoreState({ crisisDetection: null }));

  it('puts the instruction, the question, the Q9 safety note and every option in one scroll container', () => {
    const screen = render(<EnhancedAssessmentQuestion {...baseProps} />);
    const scrollViews = screen.UNSAFE_getAllByType(ScrollView);
    expect(scrollViews).toHaveLength(1);

    const scroll = within(scrollViews[0]);
    expect(scroll.getByText(/Over the last 2 weeks/)).toBeTruthy();
    expect(scroll.getByText(q9.text)).toBeTruthy();
    expect(scroll.getByText(/Crisis support is immediately available/)).toBeTruthy();
    for (const id of OPTION_IDS) expect(scroll.getByTestId(id)).toBeTruthy();
  });

  it('keeps the prominent crisis button outside the scroll container', () => {
    const screen = render(<EnhancedAssessmentQuestion {...baseProps} />);
    expect(screen.getByTestId('assessment-crisis-button')).toBeTruthy();
    const scroll = within(screen.UNSAFE_getByType(ScrollView));
    expect(scroll.queryByTestId('assessment-crisis-button')).toBeNull();
  });

  it('keeps the crisis banner outside the scroll container, so scrolling cannot hide it', () => {
    setStoreState({ crisisDetection });
    const screen = render(<EnhancedAssessmentQuestion {...baseProps} />);
    expect(screen.getByText(/Crisis support is available immediately/)).toBeTruthy();
    const scroll = within(screen.UNSAFE_getByType(ScrollView));
    expect(scroll.queryByText(/Crisis support is available immediately/)).toBeNull();
  });

  it('insets the answer column by the prominent crisis button rect, so no option sits under it', () => {
    const screen = render(<EnhancedAssessmentQuestion {...baseProps} />);
    const column = screen.getByTestId('focusable-assessment-radio-group');
    expect(StyleSheet.flatten(column.props.style).marginRight).toBe(
      CRISIS_BUTTON_PROMINENT_EXCLUSION_RECT.left,
    );
    // The inset must be on an ancestor of every option, not on some sibling.
    for (const id of OPTION_IDS) expect(within(column).getByTestId(id)).toBeTruthy();
  });

  it('returns to the top, unanimated, when the reused instance moves to the next question', () => {
    const screen = render(
      <EnhancedAssessmentQuestion {...baseProps} question={q1} currentStep={1} />,
    );
    const instance = screen.UNSAFE_getByType(ScrollView).instance as unknown as {
      scrollTo: (o: { y: number; animated: boolean }) => void;
    };
    const scrollTo = jest.spyOn(instance, 'scrollTo');
    // RN's jest ScrollView mock already makes scrollTo a jest.fn, so the spy inherits
    // the mount-time call. Only a call caused by the question change counts.
    scrollTo.mockClear();

    screen.rerender(<EnhancedAssessmentQuestion {...baseProps} question={q9} currentStep={9} />);

    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
    // Same instance — EnhancedAssessmentFlow never remounts the question (MAINT-750).
    expect(screen.UNSAFE_getByType(ScrollView).instance).toBe(instance);
  });
});
