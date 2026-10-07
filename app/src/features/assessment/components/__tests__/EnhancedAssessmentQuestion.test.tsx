/**
 * EnhancedAssessmentQuestion render-contract + crisis-routing tests (MAINT-166 PR 1)
 *
 * Pins the behavior MAINT-G enforces:
 *   - The component delegates crisis detection to the assessment store
 *     (via the `onAnswer` callback), it does NOT fire its own crisis Alert.
 *   - The visible "🚨 Crisis support is available immediately" banner is
 *     sourced from `useAssessmentStore.crisisDetection`, not local state
 *     produced by a defunct mock crisis engine.
 *
 * Before MAINT-G: the component's local `mockCrisisEngine.triggerImmediateIntervention`
 * fired `Alert.alert` directly on PHQ-9 Q9, stacking on top of the real
 * Alert that the store's `CrisisDetectionService` fires via the parent flow.
 * After MAINT-G: only the store's path fires an Alert; the component just
 * delegates and reads detection state.
 *
 * PERF-03 (/m:audit --perf): the decorative mock encryption/audit/compliance
 * pipeline was removed, so `onAnswer` now receives just the response — real
 * AES-256 encryption + consent run downstream in the store. These tests pin
 * that the delegating call still happens unconditionally.
 */
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('@/features/assessment/stores/assessmentStore', () => ({
  useAssessmentStore: jest.fn(),
}));

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EnhancedAssessmentQuestion from '../EnhancedAssessmentQuestion';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import type {
  AssessmentQuestion as AssessmentQuestionType,
} from '@/features/assessment/types';
import type { CrisisDetection } from '@/features/crisis/types/safety';

const q9: AssessmentQuestionType = {
  id: 'phq9_9',
  text: 'Thoughts that you would be better off dead, or of hurting yourself',
  type: 'phq9',
  order: 9,
};

const q1: AssessmentQuestionType = {
  id: 'phq9_1',
  text: 'Little interest or pleasure in doing things',
  type: 'phq9',
  order: 1,
};

const baseProps = {
  question: q9,
  onAnswer: jest.fn(),
  currentStep: 9,
  totalSteps: 9,
};

const canonicalCrisisDetection: CrisisDetection = {
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
  context: {
    triggeringAnswers: [],
    timeOfDay: 'morning',
  },
};

const mockedUseAssessmentStore = useAssessmentStore as unknown as jest.Mock;

const setStoreState = (state: { crisisDetection: CrisisDetection | null }) => {
  mockedUseAssessmentStore.mockImplementation((selector?: (s: typeof state) => unknown) => {
    return selector ? selector(state) : state;
  });
};

describe('EnhancedAssessmentQuestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    setStoreState({ crisisDetection: null });
  });

  it('PHQ-9 Q9 selection with response > 0 calls onAnswer; does NOT fire Alert from the component', async () => {
    const onAnswer = jest.fn();
    const { getByTestId } = render(
      <EnhancedAssessmentQuestion {...baseProps} onAnswer={onAnswer} />
    );

    fireEvent.press(getByTestId('assessment-response-group-option-1'));

    await waitFor(() => expect(onAnswer).toHaveBeenCalledTimes(1));
    // onAnswer receives only the response now (no decorative metadata).
    expect(onAnswer).toHaveBeenCalledWith(1);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('Non-Q9 question selection calls onAnswer without any Alert', async () => {
    const onAnswer = jest.fn();
    const { getByTestId } = render(
      <EnhancedAssessmentQuestion {...baseProps} question={q1} onAnswer={onAnswer} />
    );

    fireEvent.press(getByTestId('assessment-response-group-option-2'));

    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(2));
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  // MAINT-750: EnhancedAssessmentFlow renders ONE un-keyed instance of this component for
  // all nine questions, so the answer control must route each answer through the CURRENT
  // question's handler. A stale handler records a Q9 answer under phq9_1, and the store's
  // inline Q9 > 0 detection never sees it. Same instance, rerendered — never a remount,
  // which would hide the defect.
  it.each<[string, (el: Parameters<typeof fireEvent.press>[0]) => void]>([
    ['a press', (el) => fireEvent.press(el)],
    ['the Space key', (el) => fireEvent(el, 'keyPress', { nativeEvent: { key: 'Space' } })],
  ])('advancing from phq9_1 to phq9_9 on one instance, %s answers Q9 through the Q9 handler', async (_how, answer) => {
    const onAnswerQ1 = jest.fn();
    const onAnswerQ9 = jest.fn();
    const { getByTestId, rerender } = render(
      <EnhancedAssessmentQuestion {...baseProps} question={q1} onAnswer={onAnswerQ1} currentStep={1} />
    );
    rerender(
      <EnhancedAssessmentQuestion {...baseProps} question={q9} onAnswer={onAnswerQ9} currentStep={9} />
    );

    answer(getByTestId('assessment-response-group-option-1'));

    await waitFor(() => expect(onAnswerQ9).toHaveBeenCalledWith(1));
    expect(onAnswerQ1).not.toHaveBeenCalled();
  });

  it('Crisis banner is visible when the store has an active canonical CrisisDetection', () => {
    setStoreState({ crisisDetection: canonicalCrisisDetection });

    const { getByText } = render(<EnhancedAssessmentQuestion {...baseProps} />);
    expect(getByText(/Crisis support is available/i)).toBeTruthy();
  });

  it('Crisis banner is hidden when the store has no active CrisisDetection', () => {
    const { queryByText } = render(<EnhancedAssessmentQuestion {...baseProps} />);
    expect(queryByText(/Crisis support is available/i)).toBeNull();
  });
});
