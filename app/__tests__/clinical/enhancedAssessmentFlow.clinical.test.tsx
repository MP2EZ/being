/**
 * MAINT-774 (TEST-12) — EnhancedAssessmentFlow: completion, error and telemetry arms that
 * no other suite pins end to end.
 *
 *  (a) DEBUG-536  an analytics fault can never reach the scoring path or the results UI
 *  (b) DEBUG-550  a blocked completion routes back to the missing question, naming nothing
 *  (c) a failed or empty completion surfaces exactly one "Completion Error"
 *  (d) a failed answer save surfaces "Response Error", does not advance, and can be retried
 *  (e) rising-edge latency log fires once per detection, not once per render
 *  (f) hardware back on the introduction is not consumed
 *
 * The store is a REAL zustand store (created inside the mock factory, reset per test) so all
 * three access forms the flow uses work: the no-selector destructure, the selector, and
 * getState(). Its actions are plain jest.fn and run NO detection logic — this suite never
 * asserts anything the fake itself produces. Children (introduction, question, results,
 * error boundary, 988 button) are stubs that record the props the flow hands them.
 */
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
    // Constant focus. Deps are [effect], NOT []: the flow's handler closes over flowState and
    // the question index, so the subscription must be replaced when the callback changes.
    useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
  };
});

// Stable module-scope trackers, as the real hook returns (DEBUG-536).
const mockTrackStarted = jest.fn();
const mockTrackCompleted = jest.fn();
jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({
    trackAssessmentStarted: mockTrackStarted,
    trackAssessmentCompleted: mockTrackCompleted,
  }),
}));

const mockLogPerformance = jest.fn();
const mockLogError = jest.fn();
jest.mock('@/core/services/logging', () => ({
  ...jest.requireActual('@/core/services/logging'),
  logPerformance: (...args: unknown[]) => mockLogPerformance(...args),
  logError: (...args: unknown[]) => mockLogError(...args),
}));

jest.mock('@/features/assessment/stores/assessmentStore', () => {
  const { create } = require('zustand');
  return { useAssessmentStore: create(() => ({})) };
});

// Props the flow handed each stub, in render order.
const mockQuestionRenders: Array<Record<string, any>> = [];
const mockResultsRenders: Array<Record<string, any>> = [];

jest.mock('@/features/assessment/components/AssessmentIntroduction', () => {
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onBegin }: { onBegin: () => void }) => (
      <Pressable testID="intro-begin" onPress={onBegin}>
        <Text>Begin</Text>
      </Pressable>
    ),
  };
});

jest.mock('@/features/assessment/components/EnhancedAssessmentQuestion', () => {
  const { View, Text, Pressable } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, any>) => {
      mockQuestionRenders.push(props);
      return (
        <View>
          <Text testID="question-id">{props.question.id}</Text>
          <Text>{`Question ${props.currentStep} of ${props.totalSteps}`}</Text>
          {[0, 1, 2, 3].map((n) => (
            <Pressable key={n} testID={`answer-${n}`} onPress={() => props.onAnswer(n)} />
          ))}
        </View>
      );
    },
  };
});

jest.mock('@/features/assessment/components/AssessmentResults', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, any>) => {
      mockResultsRenders.push(props);
      return <View testID="results-stub" />;
    },
  };
});

jest.mock('@/features/crisis/components/CrisisErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/features/crisis/components/Static988Button', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="static-988" /> };
});

import React from 'react';
import { Alert, BackHandler } from 'react-native';
import { act, fireEvent, render, type RenderAPI } from '@testing-library/react-native';
import EnhancedAssessmentFlow from '@/features/assessment/components/EnhancedAssessmentFlow';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';

type Store = {
  setState: (patch: Record<string, unknown>, replace?: boolean) => void;
  getState: () => Record<string, any>;
};
const store = useAssessmentStore as unknown as Store;

const RESULT = {
  totalScore: 21,
  severity: 'severe',
  isCrisis: true,
  suicidalIdeation: false,
  completedAt: 1_800_000_000_000,
  answers: [],
};
const DETECTION_1 = { id: 'd1', isTriggered: true, primaryTrigger: 'phq9_severe_score', severityLevel: 'high' };
const DETECTION_2 = { id: 'd2', isTriggered: true, primaryTrigger: 'phq9_suicidal_ideation', severityLevel: 'critical' };

const baseState = (): Record<string, unknown> => ({
  currentSession: null,
  error: null,
  crisisDetection: null,
  currentResult: null,
  completionBlocked: null,
  startAssessment: jest.fn(async () => undefined),
  answerQuestion: jest.fn(async () => undefined),
  completeAssessment: jest.fn(async () => undefined),
  resetAssessment: jest.fn(),
  handleCrisisDetection: jest.fn(async () => undefined),
});

const fn = (name: string): jest.Mock => store.getState()[name] as jest.Mock;
const patchStore = (patch: Record<string, unknown>): void => {
  act(() => {
    store.setState(patch);
  });
};

let backHandlers: Array<() => boolean>;

beforeEach(() => {
  jest.clearAllMocks();
  [mockTrackStarted, mockTrackCompleted, mockLogPerformance, mockLogError].forEach((m) => m.mockReset());
  mockQuestionRenders.length = 0;
  mockResultsRenders.length = 0;
  store.setState(baseState(), true);
  backHandlers = [];
  (BackHandler.addEventListener as jest.Mock).mockImplementation((_e: string, handler: () => boolean) => {
    backHandlers.push(handler);
    return { remove: () => (backHandlers = backHandlers.filter((h) => h !== handler)) };
  });
});

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

type FlowProps = React.ComponentProps<typeof EnhancedAssessmentFlow>;

async function renderFlow(
  props: Partial<FlowProps> = {},
): Promise<{ screen: RenderAPI; onComplete: jest.Mock; onCancel: jest.Mock }> {
  const onComplete = jest.fn();
  const onCancel = jest.fn();
  const screen = render(
    <EnhancedAssessmentFlow
      assessmentType="phq9"
      sessionId="session-774"
      context="standalone"
      showIntroduction={false}
      onComplete={onComplete}
      onCancel={onCancel}
      {...props}
    />,
  );
  await flush();
  return { screen, onComplete, onCancel };
}

const answer = async (screen: RenderAPI, option = 1): Promise<void> => {
  fireEvent.press(screen.getByTestId(`answer-${option}`));
  await flush();
  await flush();
};

/** Answer Q1..Q8, each save settling and advancing. */
async function answerFirstEight(screen: RenderAPI): Promise<void> {
  for (let i = 1; i <= 8; i++) {
    expect(screen.getByText(`Question ${i} of 9`)).toBeTruthy();
    await answer(screen);
  }
  expect(screen.getByText('Question 9 of 9')).toBeTruthy();
}

const alerts = () => (Alert.alert as jest.Mock).mock.calls as Array<[string, string, Array<{ text: string; onPress?: () => void }>]>;
const alertsTitled = (title: string) => alerts().filter((c) => c[0] === title);
const currentQuestionId = (screen: RenderAPI): string => {
  const node = screen.getByTestId('question-id');
  return String(node.props.children);
};
const lastResultsProps = (): Record<string, any> => mockResultsRenders[mockResultsRenders.length - 1]!;
const latencyLogs = () => mockLogPerformance.mock.calls.filter((c) => c[0] === 'EnhancedAssessmentFlow.crisisResponse');

describe('(a) DEBUG-536 — a throwing tracker cannot touch scoring or the results UI', () => {
  const completeWithResultAndDetection = () =>
    jest.fn(async () => {
      store.setState({ currentResult: RESULT, crisisDetection: DETECTION_1 });
    });

  it('standalone: scoring runs once and first, nothing alerts, the results screen gets the intervention flag', async () => {
    fn('completeAssessment').mockImplementation(completeWithResultAndDetection());
    mockTrackCompleted.mockImplementation(() => {
      throw new Error('analytics fault');
    });
    const { screen, onComplete, onCancel } = await renderFlow();

    await answerFirstEight(screen);
    await answer(screen);

    expect(mockTrackCompleted).toHaveBeenCalledTimes(1); // the throw was really exercised
    expect(fn('completeAssessment')).toHaveBeenCalledTimes(1);
    expect(fn('completeAssessment').mock.invocationCallOrder[0]).toBeLessThan(
      mockTrackCompleted.mock.invocationCallOrder[0]!,
    );
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(screen.getByTestId('results-stub')).toBeTruthy();
    expect(lastResultsProps()).toEqual(expect.objectContaining({ showCrisisIntervention: true, result: RESULT }));
    expect(onComplete).not.toHaveBeenCalled(); // standalone hands off from the results screen
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('onboarding: scoring runs once and first, nothing alerts, onComplete fires once with the result and onCancel never', async () => {
    fn('completeAssessment').mockImplementation(completeWithResultAndDetection());
    mockTrackCompleted.mockImplementation(() => {
      throw new Error('analytics fault');
    });
    const { screen, onComplete, onCancel } = await renderFlow({ context: 'onboarding' });

    await answerFirstEight(screen);
    await answer(screen);

    expect(mockTrackCompleted).toHaveBeenCalledTimes(1);
    expect(fn('completeAssessment')).toHaveBeenCalledTimes(1);
    expect(fn('completeAssessment').mock.invocationCallOrder[0]).toBeLessThan(
      mockTrackCompleted.mock.invocationCallOrder[0]!,
    );
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(RESULT);
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByTestId('static-988')).toBeTruthy(); // the completing state carries its own 988
  });

  it('with the introduction shown, a throwing started-tracker still reaches the first question', async () => {
    mockTrackStarted.mockImplementation(() => {
      throw new Error('analytics fault');
    });
    const { screen } = await renderFlow({ showIntroduction: true });

    fireEvent.press(screen.getByTestId('intro-begin'));
    await flush();

    expect(mockTrackStarted).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Question 1 of 9')).toBeTruthy();
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

describe('(b) DEBUG-550 — a blocked completion routes back and names nothing', () => {
  const NOT_FINISHED = 'Not quite finished';

  it.each([
    ['phq9_4', 4],
    ['phq9_9', 9],
  ])('missing %s: back at that question, one neutral alert, nothing completed', async (missingId, position) => {
    fn('completeAssessment').mockImplementation(async () => {
      store.setState({ currentResult: null, completionBlocked: { reason: 'incomplete_answers', missingQuestionIds: [missingId] } });
    });
    const { screen, onComplete, onCancel } = await renderFlow({ context: 'onboarding' });

    await answerFirstEight(screen);
    await answer(screen);

    expect(fn('completeAssessment')).toHaveBeenCalledTimes(1);
    expect(currentQuestionId(screen)).toBe(missingId);
    expect(screen.getByText(`Question ${position} of 9`)).toBeTruthy();

    const blocked = alertsTitled(NOT_FINISHED);
    expect(blocked).toHaveLength(1);
    expect(alerts()).toHaveLength(1); // no second, competing alert
    const message = blocked[0]![1];
    expect(message.length).toBeGreaterThan(0);
    expect(message).not.toMatch(/phq9_|gad7_/);
    expect(message).not.toMatch(/dead|hurt|harm|suicid/i);
    // No question wording: every item the flow has shown so far, plus the one it routed to.
    const shown = mockQuestionRenders.map((p) => p.question.text as string);
    expect(shown.length).toBeGreaterThanOrEqual(9);
    shown.forEach((text) => expect(message).not.toContain(text));

    expect(mockTrackCompleted).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(fn('resetAssessment')).not.toHaveBeenCalled();
  });
});

describe('(c) a failed or empty completion surfaces exactly one "Completion Error"', () => {
  const rejects = () => fn('completeAssessment').mockRejectedValue(new Error('scoring failed'));
  const resolvesEmpty = () => {
    fn('completeAssessment').mockImplementation(async () => {
      store.setState({ currentResult: null, completionBlocked: null, error: 'scoring failed' });
    });
  };

  it.each([
    ['onboarding', 'rejects', rejects],
    ['onboarding', 'resolves with no result', resolvesEmpty],
    ['standalone', 'rejects', rejects],
    ['standalone', 'resolves with no result', resolvesEmpty],
  ] as const)('%s, completion %s', async (context, _mode, arrange) => {
    arrange();
    const { screen, onComplete, onCancel } = await renderFlow({ context });

    await answerFirstEight(screen);
    await answer(screen);

    expect(fn('completeAssessment')).toHaveBeenCalledTimes(1);
    const completionErrors = alertsTitled('Completion Error');
    expect(completionErrors).toHaveLength(1);
    expect(completionErrors[0]![1]).toContain('Crisis support is still available');
    expect(alertsTitled('Response Error')).toHaveLength(0);
    expect(alerts()).toHaveLength(1);

    expect(mockTrackCompleted).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.queryByTestId('results-stub')).toBeNull();
    expect(screen.getByText('Question 9 of 9')).toBeTruthy(); // the last question is still on screen
  });
});

describe('(d) a failed answer save', () => {
  it('shows "Response Error", does not advance, clears the in-flight hold, and a retry advances', async () => {
    let rejectSave!: (e: Error) => void;
    fn('answerQuestion').mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectSave = reject;
        }),
    );
    const { screen } = await renderFlow();
    const lastQuestionProps = () => mockQuestionRenders[mockQuestionRenders.length - 1]!;

    fireEvent.press(screen.getByTestId('answer-2'));
    await flush();
    expect(lastQuestionProps().exitInFlight).toBe(true); // the save is genuinely pending

    await act(async () => {
      rejectSave(new Error('storage unavailable'));
    });
    await flush();

    const responseErrors = alertsTitled('Response Error');
    expect(responseErrors).toHaveLength(1);
    expect(responseErrors[0]![1]).toContain('Crisis support is still available');
    expect(screen.getByText('Question 1 of 9')).toBeTruthy(); // no advance
    expect(lastQuestionProps().exitInFlight).toBe(false); // hold released

    // Released for real: hardware back at the first question reaches the exit confirm
    // instead of being swallowed as "in flight".
    act(() => {
      expect(backHandlers[backHandlers.length - 1]!()).toBe(true);
    });
    expect(alertsTitled('Exit Assessment?')).toHaveLength(1);

    await answer(screen, 2);
    expect(fn('answerQuestion')).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Question 2 of 9')).toBeTruthy();
    expect(alertsTitled('Response Error')).toHaveLength(1); // the retry raised no new error
    expect(lastQuestionProps().exitInFlight).toBe(false);
  });
});

describe('(e) rising-edge latency log', () => {
  it('logs once per detection: null to D1 once, a re-render with the same D1 adds nothing, null to D2 adds one', async () => {
    const { screen } = await renderFlow();
    await answer(screen); // move off the first render so a later re-render is observable
    expect(latencyLogs()).toHaveLength(0);

    patchStore({ crisisDetection: DETECTION_1 });
    expect(latencyLogs()).toHaveLength(1);
    expect(latencyLogs()[0]![2]).toEqual(expect.objectContaining({ threshold: 200 }));

    // Unrelated store field: the flow subscribes to the whole store, so it DOES re-render.
    const rendersBefore = mockQuestionRenders.length;
    patchStore({ error: 'unrelated' });
    expect(mockQuestionRenders.length).toBeGreaterThan(rendersBefore);
    patchStore({ error: 'unrelated again' });
    expect(store.getState().crisisDetection).toBe(DETECTION_1);
    expect(latencyLogs()).toHaveLength(1);

    patchStore({ crisisDetection: null });
    expect(latencyLogs()).toHaveLength(1); // clearing is not a detection
    patchStore({ crisisDetection: DETECTION_2 });
    expect(latencyLogs()).toHaveLength(2);
    expect(latencyLogs()[1]![2]).toEqual(expect.objectContaining({ threshold: 200 }));
  });
});

describe('(f) hardware back on the introduction', () => {
  it('is not consumed: returns false, opens nothing, cancels nothing', async () => {
    const { screen, onCancel } = await renderFlow({ showIntroduction: true });
    expect(screen.getByTestId('intro-begin')).toBeTruthy();
    expect(backHandlers.length).toBeGreaterThan(0);

    let consumed: boolean | undefined;
    act(() => {
      consumed = backHandlers[backHandlers.length - 1]!();
    });

    expect(consumed).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('once the questions begin, the replaced handler consumes back and opens the exit confirm; Exit cancels exactly once', async () => {
    const { screen, onCancel } = await renderFlow({ showIntroduction: true });
    fireEvent.press(screen.getByTestId('intro-begin'));
    await flush();
    expect(screen.getByText('Question 1 of 9')).toBeTruthy();

    let consumed: boolean | undefined;
    act(() => {
      consumed = backHandlers[backHandlers.length - 1]!();
    });
    expect(consumed).toBe(true);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Exit Assessment?',
      expect.stringContaining('this check-in will end'),
      expect.any(Array),
    );
    const buttons = alerts().at(-1)![2];
    const exit = buttons.find((b) => b.text === 'Exit');
    expect(exit?.onPress).toEqual(expect.any(Function));

    act(() => exit!.onPress!());
    expect(onCancel).toHaveBeenCalledTimes(1);
    act(() => exit!.onPress!());
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
