/**
 * DEBUG-771 — the questions phase has a visible way out, and leaving can never race a
 * completion or touch the crisis path.
 *
 * Before this item the only exit from a PHQ-9 / GAD-7 question was Android's hardware
 * back. On iOS (gestureEnabled false, no header) a user who started a check-in could not
 * leave it without answering every question.
 *
 * What is pinned here (crisis ruling, recorded on DEBUG-771):
 * - The control renders on every question, and opens the EXISTING confirm, byte-identical.
 * - An exit requested while an answer is saving waits for it. If that save completed the
 *   check-in, completion wins: no confirm, no onCancel, and completeAssessment /
 *   handleCrisisDetection run exactly once.
 * - Exactly one of onComplete / onCancel per flow instance.
 * - Exit writes nothing to the store: no resetAssessment, no startAssessment, and a Q9
 *   alert already raised is neither retracted nor re-raised.
 * - Android hardware back keeps its branch logic and the same in-flight hold.
 *
 * The store is a small fake with the real hook shape (selector + getState) so the race can
 * be driven deterministically; the flow, the question screen and the crisis button are real.
 */
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
    // Focus is constant in a unit render; the effect must still subscribe and clean up.
    useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
  };
});

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({ trackAssessmentStarted: jest.fn(), trackAssessmentCompleted: jest.fn() }),
}));

jest.mock('@/features/assessment/components/AssessmentResults', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="assessment-results-mock" /> };
});

type Listener = () => void;
type FakeState = Record<string, unknown>;

/** A minimal external store with zustand's hook shape. Read lazily (jest.mock hoisting). */
const mockStore = (() => {
  let state: FakeState = {};
  const listeners = new Set<Listener>();
  return {
    get: (): FakeState => state,
    set: (patch: FakeState): void => {
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    },
    replace: (next: FakeState): void => {
      state = next;
    },
    subscribe: (l: Listener): (() => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
})();

jest.mock('@/features/assessment/stores/assessmentStore', () => {
  const { useSyncExternalStore } = require('react');
  const useAssessmentStore = (selector?: (s: Record<string, unknown>) => unknown) =>
    useSyncExternalStore(mockStore.subscribe, () =>
      selector ? selector(mockStore.get()) : mockStore.get(),
    );
  useAssessmentStore.getState = () => mockStore.get();
  return { useAssessmentStore };
});

import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Alert, BackHandler } from 'react-native';
import { act, fireEvent, render, type RenderAPI } from '@testing-library/react-native';
import EnhancedAssessmentFlow from '../EnhancedAssessmentFlow';

const EXIT_TITLE = 'Exit Assessment?';
const EXIT_BODY = 'If you exit now, this check-in will end. You can start a new one any time.';

const mockShowCrisisAlert = jest.fn();

/** A promise a test resolves by hand. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

let answerGate: Promise<void> | null = null;
let completeGate: Promise<void> | null = null;
let recorded: Map<string, number>;

const q9Detection = {
  id: 'crisis-q9',
  isTriggered: true,
  primaryTrigger: 'phq9_suicidal_ideation',
  severityLevel: 'critical',
};

function freshStore(): void {
  recorded = new Map();
  answerGate = null;
  completeGate = null;
  mockStore.replace({
    currentSession: null,
    error: null,
    crisisDetection: null,
    currentResult: null,
    completionBlocked: null,
    startAssessment: jest.fn(async () => undefined),
    answerQuestion: jest.fn(async (questionId: string, response: number) => {
      if (answerGate) await answerGate;
      recorded.set(questionId, response);
      // The store's inline Q9 path: alert once, write crisisDetection.
      if (questionId === 'phq9_9' && response > 0) {
        mockShowCrisisAlert();
        mockStore.set({ crisisDetection: q9Detection });
      }
    }),
    completeAssessment: jest.fn(async () => {
      if (completeGate) await completeGate;
      const total = [...recorded.values()].reduce((a, b) => a + b, 0);
      if (total >= 20) {
        await (mockStore.get().handleCrisisDetection as (d: unknown) => Promise<void>)({
          id: 'crisis-score',
          primaryTrigger: 'phq9_severe_score',
          severityLevel: 'high',
        });
      }
      mockStore.set({
        currentResult: {
          totalScore: total,
          severity: total >= 20 ? 'severe' : 'minimal',
          isCrisis: total >= 15,
          suicidalIdeation: (recorded.get('phq9_9') ?? 0) > 0,
          completedAt: Date.now(),
          answers: [],
        },
      });
    }),
    resetAssessment: jest.fn(),
    handleCrisisDetection: jest.fn(async (detection: unknown) => {
      mockStore.set({ crisisDetection: detection });
    }),
  });
}

const fn = (name: string): jest.Mock => mockStore.get()[name] as jest.Mock;

/** Active hardware-back handlers, so a test presses the one the flow currently holds. */
let backHandlers: Array<() => boolean>;

beforeEach(() => {
  jest.clearAllMocks();
  freshStore();
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

async function renderFlow(
  props: Partial<React.ComponentProps<typeof EnhancedAssessmentFlow>> = {},
): Promise<{ screen: RenderAPI; onComplete: jest.Mock; onCancel: jest.Mock }> {
  const onComplete = jest.fn();
  const onCancel = jest.fn();
  const screen = render(
    <EnhancedAssessmentFlow
      assessmentType="phq9"
      sessionId="session-771"
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

const answer = (screen: RenderAPI, option: number): void => {
  fireEvent.press(screen.getByTestId(`assessment-response-group-option-${option}`));
};

const exitButton = (screen: RenderAPI) => screen.getByTestId('assessment-exit-button');

/** The most recent Alert.alert call, as [title, body, buttons]. */
const lastAlert = () => (Alert.alert as jest.Mock).mock.calls.at(-1) as [
  string,
  string,
  Array<{ text: string; style?: string; onPress?: () => void }>,
];
const exitAlerts = () => (Alert.alert as jest.Mock).mock.calls.filter((c) => c[0] === EXIT_TITLE);
const pressAlertButton = (text: string): void => {
  const button = lastAlert()[2].find((b) => b.text === text);
  expect(button).toBeDefined();
  act(() => button!.onPress?.());
};

const pressBack = (): boolean => {
  const handler = backHandlers.at(-1);
  expect(handler).toBeDefined();
  let consumed = false;
  act(() => {
    consumed = handler!();
  });
  return consumed;
};

/** Answer Q1..Q8 with `option`, letting each save settle. */
async function answerFirstEight(screen: RenderAPI, option: number): Promise<void> {
  for (let i = 1; i <= 8; i++) {
    expect(screen.getByText(`Question ${i} of 9`)).toBeTruthy();
    answer(screen, option);
    await flush();
  }
  expect(screen.getByText('Question 9 of 9')).toBeTruthy();
}

describe('DEBUG-771 · the exit control', () => {
  it('renders on the first and the last question as a labelled button', async () => {
    const { screen } = await renderFlow();
    expect(exitButton(screen).props.accessibilityRole).toBe('button');
    expect(exitButton(screen).props.accessibilityLabel).toBe('Exit check-in');

    await answerFirstEight(screen, 0);
    expect(exitButton(screen).props.accessibilityLabel).toBe('Exit check-in');
  });

  it('opens the existing confirm with byte-identical copy', async () => {
    const { screen } = await renderFlow();
    fireEvent.press(exitButton(screen));

    const [title, body, buttons] = lastAlert();
    expect(title).toBe(EXIT_TITLE);
    expect(body).toBe(EXIT_BODY);
    expect(buttons.map((b) => [b.text, b.style])).toEqual([
      ['Continue Assessment', 'cancel'],
      ['Exit', 'destructive'],
    ]);
  });

  it('Exit calls onCancel exactly once; Continue does not', async () => {
    const { screen, onCancel, onComplete } = await renderFlow();

    fireEvent.press(exitButton(screen));
    pressAlertButton('Continue Assessment');
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByText('Question 1 of 9')).toBeTruthy();

    fireEvent.press(exitButton(screen));
    pressAlertButton('Exit');
    expect(onCancel).toHaveBeenCalledTimes(1);

    // A second confirm cannot produce a second terminal callback.
    pressAlertButton('Exit');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('control — after a NON-final answer has settled, exit does reach onCancel', async () => {
    const { screen, onCancel } = await renderFlow();
    answer(screen, 1);
    await flush();
    expect(screen.getByText('Question 2 of 9')).toBeTruthy();

    fireEvent.press(exitButton(screen));
    expect(exitAlerts()).toHaveLength(1);
    pressAlertButton('Exit');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('DEBUG-771 · AC3 — an exit racing the final answer', () => {
  it('PHQ-9 >= 20: while the last save is in flight the control is disabled and busy, and no confirm opens', async () => {
    const { screen } = await renderFlow();
    await answerFirstEight(screen, 3); // 24 before Q9

    const gate = deferred();
    answerGate = gate.promise;
    answer(screen, 0);
    await flush();

    expect(exitButton(screen).props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    fireEvent.press(exitButton(screen));
    expect(exitAlerts()).toHaveLength(0);

    await act(async () => {
      gate.resolve();
    });
    await flush();
  });

  it('completion wins: an escape requested mid-save never confirms, never cancels, and crisis runs once', async () => {
    const { screen, onCancel } = await renderFlow();
    await answerFirstEight(screen, 3);

    const answerSave = deferred();
    const completion = deferred();
    answerGate = answerSave.promise;
    completeGate = completion.promise;
    answer(screen, 0);
    await flush();

    // The accessibility escape is not blocked by `disabled`, so it must take the hold.
    act(() => {
      screen.getByTestId('assessment-questions-root').props.onAccessibilityEscape();
    });
    await act(async () => {
      answerSave.resolve();
    });
    await flush();
    expect(exitAlerts()).toHaveLength(0); // still holding: completeAssessment is in flight

    await act(async () => {
      completion.resolve();
    });
    await flush();
    await flush();

    expect(fn('completeAssessment')).toHaveBeenCalledTimes(1);
    expect(fn('handleCrisisDetection')).toHaveBeenCalledTimes(1);
    expect(exitAlerts()).toHaveLength(0);
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByTestId('assessment-results-mock')).toBeTruthy();
  });

  it('the control is back to enabled once a non-final save settles', async () => {
    const { screen } = await renderFlow();
    const gate = deferred();
    answerGate = gate.promise;
    answer(screen, 2);
    await flush();
    expect(exitButton(screen).props.accessibilityState).toMatchObject({ disabled: true, busy: true });

    await act(async () => {
      gate.resolve();
    });
    await flush();
    expect(exitButton(screen).props.accessibilityState?.disabled).not.toBe(true);
    expect(exitButton(screen).props.accessibilityState?.busy).not.toBe(true);
  });
});

describe('DEBUG-771 · onboarding — exactly one terminal callback', () => {
  it('an exit held behind the final save is dropped when the save completes: onComplete once, onCancel never', async () => {
    const { screen, onComplete, onCancel } = await renderFlow({ context: 'onboarding' });
    await answerFirstEight(screen, 0);

    const gate = deferred();
    answerGate = gate.promise;
    answer(screen, 0);
    await flush();
    act(() => {
      screen.getByTestId('assessment-questions-root').props.onAccessibilityEscape();
    });
    expect(pressBack()).toBe(true);

    await act(async () => {
      gate.resolve();
    });
    await flush();
    await flush();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    expect(exitAlerts()).toHaveLength(0);
  });

  it('after exiting, nothing can produce onComplete', async () => {
    const { screen, onComplete, onCancel } = await renderFlow({ context: 'onboarding' });
    fireEvent.press(exitButton(screen));
    pressAlertButton('Exit');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('DEBUG-771 · exit writes nothing to the store and leaves the crisis path alone', () => {
  it('Q9 = 1 then an exit mid-save: the inline alert fired once, is not re-raised, crisisDetection is unchanged', async () => {
    const { screen, onCancel } = await renderFlow();
    await answerFirstEight(screen, 0);

    const gate = deferred();
    completeGate = gate.promise; // Q9 is PHQ-9's last item: its save runs completion
    answer(screen, 1);
    await flush();
    expect(mockShowCrisisAlert).toHaveBeenCalledTimes(1);
    expect(mockStore.get().crisisDetection).toBe(q9Detection);

    act(() => {
      screen.getByTestId('assessment-questions-root').props.onAccessibilityEscape();
    });
    await act(async () => {
      gate.resolve();
    });
    await flush();
    await flush();

    expect(mockShowCrisisAlert).toHaveBeenCalledTimes(1);
    expect(mockStore.get().crisisDetection).toBe(q9Detection);
    expect(fn('resetAssessment')).not.toHaveBeenCalled();
    expect(exitAlerts()).toHaveLength(0);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('with a Q9 detection already set, the control stays enabled and exit leaves it untouched', async () => {
    const { screen, onCancel } = await renderFlow();
    act(() => {
      mockStore.set({ crisisDetection: q9Detection }); // as the store's inline path writes it
    });
    expect(screen.getByText(/Crisis support is available immediately/)).toBeTruthy();
    expect(exitButton(screen).props.accessibilityState?.disabled).not.toBe(true);

    fireEvent.press(exitButton(screen));
    pressAlertButton('Exit');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockStore.get().crisisDetection).toBe(q9Detection);
    expect(mockShowCrisisAlert).not.toHaveBeenCalled();
    expect(fn('handleCrisisDetection')).not.toHaveBeenCalled();
  });

  it('no exit path calls resetAssessment or startAssessment', async () => {
    const { screen } = await renderFlow();
    expect(fn('startAssessment')).toHaveBeenCalledTimes(1); // mount only
    answer(screen, 1);
    await flush();

    fireEvent.press(exitButton(screen));
    pressAlertButton('Continue Assessment');
    act(() => {
      screen.getByTestId('assessment-questions-root').props.onAccessibilityEscape();
    });
    pressAlertButton('Continue Assessment');
    pressBack(); // index 1 → back to Q1
    pressBack(); // index 0 → the confirm
    pressAlertButton('Exit');
    await flush();

    expect(fn('resetAssessment')).not.toHaveBeenCalled();
    expect(fn('startAssessment')).toHaveBeenCalledTimes(1);
    expect(fn('completeAssessment')).not.toHaveBeenCalled();
  });
});

describe('DEBUG-771 · Android hardware back (regression)', () => {
  it('index > 0 goes to the previous question without a confirm', async () => {
    const { screen } = await renderFlow();
    answer(screen, 1);
    await flush();
    expect(screen.getByText('Question 2 of 9')).toBeTruthy();

    expect(pressBack()).toBe(true);
    await flush();
    expect(screen.getByText('Question 1 of 9')).toBeTruthy();
    expect(exitAlerts()).toHaveLength(0);
  });

  it('index 0 opens the same confirm', async () => {
    const { onCancel } = await renderFlow();
    expect(pressBack()).toBe(true);
    await flush();
    const [title, body] = lastAlert();
    expect(title).toBe(EXIT_TITLE);
    expect(body).toBe(EXIT_BODY);
    pressAlertButton('Exit');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('in flight on the final answer: back is consumed and never reaches onCancel', async () => {
    const { screen, onCancel } = await renderFlow();
    await answerFirstEight(screen, 3);
    const gate = deferred();
    answerGate = gate.promise;
    answer(screen, 0);
    await flush();

    expect(pressBack()).toBe(true);
    await act(async () => {
      gate.resolve();
    });
    await flush();
    await flush();

    expect(exitAlerts()).toHaveLength(0);
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe('DEBUG-771 · source pins (comment-stripped, DEBUG-390)', () => {
  const stripComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const FLOW = stripComments(readFileSync(join(__dirname, '../EnhancedAssessmentFlow.tsx'), 'utf8'));

  /** A `const NAME = useCallback(` body, bounded at its own dependency-array close. */
  const callbackBody = (source: string, name: string): string => {
    const start = source.indexOf(`const ${name} = useCallback(`);
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf('\n  }, [', start);
    expect(end).toBeGreaterThan(start);
    return source.slice(start, end);
  };

  const EXIT_HANDLERS = ['promptExit', 'confirmExit', 'requestExit'];
  const STORE_WRITE = /\b(resetAssessment|startAssessment)\b/;

  it('matcher self-check: the pattern fires on a store write, and stripping keeps code', () => {
    expect('resetAssessment();').toMatch(STORE_WRITE);
    expect(stripComments('// resetAssessment()\nconst x = 1;')).not.toMatch(STORE_WRITE);
    expect(stripComments('// resetAssessment()\nconst x = 1;')).toContain('const x = 1;');
  });

  it('positive control: the retake path, which DOES reset, is visible to the matcher', () => {
    expect(FLOW).toMatch(/onRetake[\s\S]*resetAssessment\(\)/);
  });

  it.each(EXIT_HANDLERS)('%s never resets or restarts the assessment', (name) => {
    const body = callbackBody(FLOW, name);
    expect(body.length).toBeGreaterThan(40);
    expect(body).not.toMatch(STORE_WRITE);
  });

  it('the in-flight mark is the FIRST statement of handleAnswer', () => {
    const body = callbackBody(FLOW, 'handleAnswer');
    const firstStatement = body.slice(body.indexOf('=> {') + 4).trim().split('\n')[0];
    expect(firstStatement).toMatch(/^inFlightRef\.current\s*(\+=\s*1|=\s*true)\s*;/);
  });
});
