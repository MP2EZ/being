/**
 * DEBUG-771 — the questions-phase exit control, accessibility contract (AC1 rulings).
 *
 * A visible WORD, "Exit", top-left in an in-flow header row above the question's
 * ScrollView. Neutral: it never reads as help or crisis. A native button on its own —
 * never merged into a <Focusable> — announced after the crisis banner when one is shown
 * and before the progress and question otherwise. The two-finger escape opens the same
 * confirm and never exits or steps back on its own.
 *
 * jest has no Yoga viewport, so geometry is asserted from styles, not measured. The
 * on-device proof is `assessment-exit` (default size) and the visibility assertion added
 * to `assessment-ax5-reachability` (AX5).
 */
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
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

const mockStore = (() => {
  let state: Record<string, unknown> = {};
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (patch: Record<string, unknown>) => {
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    },
    replace: (next: Record<string, unknown>) => {
      state = next;
    },
    subscribe: (l: () => void) => {
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
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { act, fireEvent, render, within, type RenderAPI } from '@testing-library/react-native';
import EnhancedAssessmentFlow from '../EnhancedAssessmentFlow';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';
import { CRISIS_BUTTON_PROMINENT_EXCLUSION_RECT } from '@/features/crisis/constants/crisisButtonGeometry';

// The module object the component reads at call time (a wildcard import would be a copy).
const SafeArea = jest.requireMock('react-native-safe-area-context') as {
  useSafeAreaInsets: () => { top: number; right: number; bottom: number; left: number };
};

const EXIT_ID = 'assessment-exit-button';
const NOTCH_TOP = 59; // the tallest top inset on a shipping portrait iPhone
const SMALLEST_HEIGHT = 667; // iPhone SE 3, the smallest supported viewport

const q9Detection = { id: 'crisis-q9', isTriggered: true, primaryTrigger: 'phq9_suicidal_ideation', severityLevel: 'critical' };

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.replace({
    currentSession: null,
    error: null,
    crisisDetection: null,
    currentResult: null,
    completionBlocked: null,
    startAssessment: jest.fn(async () => undefined),
    answerQuestion: jest.fn(async () => undefined),
    completeAssessment: jest.fn(async () => {
      mockStore.set({
        currentResult: { totalScore: 0, severity: 'minimal', isCrisis: false, suicidalIdeation: false, completedAt: 1, answers: [] },
      });
    }),
    resetAssessment: jest.fn(),
    handleCrisisDetection: jest.fn(),
  });
});

afterEach(() => jest.restoreAllMocks());

async function renderQuestions(props: Partial<React.ComponentProps<typeof EnhancedAssessmentFlow>> = {}): Promise<RenderAPI> {
  const screen = render(
    <EnhancedAssessmentFlow
      assessmentType="phq9"
      sessionId="session-771"
      context="standalone"
      showIntroduction={false}
      onComplete={jest.fn()}
      onCancel={jest.fn()}
      {...props}
    />,
  );
  await act(async () => {
    await Promise.resolve();
  });
  return screen;
}

type Node = { props: Record<string, unknown>; parent: Node | null; type: unknown };

/** Host ancestors of an element, nearest first. */
function hostAncestors(el: Node): Node[] {
  const out: Node[] = [];
  for (let p = el.parent; p; p = p.parent) if (typeof p.type === 'string') out.push(p);
  return out;
}

/** testIDs in document (and therefore VoiceOver) order. */
function testIdOrder(screen: RenderAPI): string[] {
  const ids: string[] = [];
  const walk = (n: unknown): void => {
    if (!n || typeof n !== 'object') return;
    const node = n as { props?: { testID?: string }; children?: unknown[] };
    if (node.props?.testID) ids.push(node.props.testID);
    (node.children ?? []).forEach(walk);
  };
  const json = screen.toJSON();
  (Array.isArray(json) ? json : [json]).forEach(walk);
  return ids;
}

describe('DEBUG-771 · exit control accessibility', () => {
  it('is a button with the ruled label and hint, and never names help, support, crisis or 988', async () => {
    const screen = await renderQuestions();
    const exit = screen.getByTestId(EXIT_ID);
    expect(exit.props.accessibilityRole).toBe('button');
    expect(exit.props.accessibilityLabel).toBe('Exit check-in');
    expect(exit.props.accessibilityHint).toBe('Asks before ending this check-in.');
    expect(within(exit).getByText('Exit')).toBeTruthy();
    for (const text of [exit.props.accessibilityLabel, exit.props.accessibilityHint, 'Exit']) {
      expect(String(text)).not.toMatch(/help|support|crisis|988/i);
    }
  });

  it('has no accessible ancestor, so it is never merged into a Focusable', async () => {
    const screen = await renderQuestions();
    const merged = hostAncestors(screen.getByTestId(EXIT_ID) as unknown as Node).filter(
      (a) => a.props.accessible === true,
    );
    expect(merged).toEqual([]);
    // Positive control: the matcher does see a Focusable merge where one exists.
    const progress = screen.getByTestId('focusable-assessment-progress');
    expect(progress.props.accessible).toBe(true);
  });

  it('reads before the progress and the question when no crisis banner is shown', async () => {
    const order = testIdOrder(await renderQuestions());
    expect(order.indexOf(EXIT_ID)).toBeGreaterThan(-1);
    expect(order.indexOf(EXIT_ID)).toBeLessThan(order.indexOf('focusable-assessment-progress'));
    expect(order.indexOf(EXIT_ID)).toBeLessThan(order.indexOf('focusable-assessment-question-text'));
  });

  it('reads AFTER the crisis banner when one is shown (crisis requirement)', async () => {
    mockStore.set({ crisisDetection: q9Detection });
    const order = testIdOrder(await renderQuestions());
    const banner = order.indexOf('focusable-crisis-alert-banner');
    expect(banner).toBeGreaterThan(-1);
    expect(banner).toBeLessThan(order.indexOf(EXIT_ID));
    expect(order.indexOf(EXIT_ID)).toBeLessThan(order.indexOf('focusable-assessment-progress'));
  });

  it('meets the minimum touch target', async () => {
    const style = StyleSheet.flatten((await renderQuestions()).getByTestId(EXIT_ID).props.style);
    expect(style.minWidth).toBeGreaterThanOrEqual(TOUCH_TARGETS.minimum);
    expect(style.minHeight).toBeGreaterThanOrEqual(TOUCH_TARGETS.minimum);
  });

  it('the word scales with Dynamic Type, capped at 2x so the row stays one line at AX5', async () => {
    const word = within((await renderQuestions()).getByTestId(EXIT_ID)).getByText('Exit');
    expect(word.props.allowFontScaling).not.toBe(false);
    expect(word.props.maxFontSizeMultiplier).toBeGreaterThan(1);
    expect(word.props.maxFontSizeMultiplier).toBe(2);
    expect(word.props.numberOfLines).toBe(1);
  });

  it('is in flow (not absolute) and clears the safe-area top inset', async () => {
    jest.spyOn(SafeArea, 'useSafeAreaInsets').mockReturnValue({ top: NOTCH_TOP, right: 0, bottom: 34, left: 0 });
    const screen = await renderQuestions();
    const exit = screen.getByTestId(EXIT_ID);
    expect(StyleSheet.flatten(exit.props.style).position).not.toBe('absolute');

    const padded = hostAncestors(exit as unknown as Node).find(
      (a) => StyleSheet.flatten(a.props.style as object)?.paddingTop === NOTCH_TOP,
    );
    expect(padded).toBeDefined();
    for (const a of hostAncestors(exit as unknown as Node)) {
      expect(StyleSheet.flatten(a.props.style as object)?.position).not.toBe('absolute');
    }
  });

  it('sits outside the ScrollView, so scrolling a long question can never hide it', async () => {
    const screen = await renderQuestions();
    expect(screen.getByTestId(EXIT_ID)).toBeTruthy();
    expect(within(screen.UNSAFE_getByType(ScrollView)).queryByTestId(EXIT_ID)).toBeNull();
  });

  it('is alone in its header row: nothing pressable to its right', async () => {
    const screen = await renderQuestions();
    const row = screen.getByTestId('assessment-exit-row');
    const pressables = within(row).queryAllByRole('button');
    expect(pressables).toHaveLength(1);
    expect(pressables[0]!.props.testID).toBe(EXIT_ID);
    const rowStyle = StyleSheet.flatten(row.props.style);
    expect(rowStyle.flexDirection).toBe('row');
    expect(['flex-start', undefined]).toContain(rowStyle.justifyContent);
  });

  it('lies wholly outside the prominent crisis button exclusion rect on the smallest screen', async () => {
    jest.spyOn(SafeArea, 'useSafeAreaInsets').mockReturnValue({ top: NOTCH_TOP, right: 0, bottom: 34, left: 0 });
    const screen = await renderQuestions();
    const row = StyleSheet.flatten(screen.getByTestId('assessment-exit-row').props.style);
    const exit = StyleSheet.flatten(screen.getByTestId(EXIT_ID).props.style);
    const word = StyleSheet.flatten(within(screen.getByTestId(EXIT_ID)).getByText('Exit').props.style);

    // Worst case: the tallest inset and the word at its 2x cap with a generous line height.
    const n = (v: unknown): number => (typeof v === 'number' ? v : 0);
    const wordHeight = n(word.fontSize) * 2 * 1.5;
    const controlHeight = Math.max(n(exit.minHeight), wordHeight + 2 * n(exit.paddingVertical));
    const controlBottom = NOTCH_TOP + n(row.paddingTop) + n(row.paddingVertical) + controlHeight;
    expect(controlBottom).toBeLessThan(SMALLEST_HEIGHT - CRISIS_BUTTON_PROMINENT_EXCLUSION_RECT.top);
  });

  it('the accessibility escape opens the same confirm, and Continue is the cancel-style button', async () => {
    const screen = await renderQuestions();
    act(() => {
      screen.getByTestId('assessment-questions-root').props.onAccessibilityEscape();
    });
    const [title, body, buttons] = (Alert.alert as jest.Mock).mock.calls.at(-1);
    expect(title).toBe('Exit Assessment?');
    expect(body).toBe('If you exit now, this check-in will end. You can start a new one any time.');
    expect(buttons[0]).toMatchObject({ text: 'Continue Assessment', style: 'cancel' });
    expect(buttons[1]).toMatchObject({ text: 'Exit', style: 'destructive' });
  });

  it('the escape never steps back a question on its own', async () => {
    const screen = await renderQuestions();
    fireEvent.press(screen.getByTestId('assessment-response-group-option-0'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('Question 2 of 9')).toBeTruthy();
    act(() => {
      screen.getByTestId('assessment-questions-root').props.onAccessibilityEscape();
    });
    expect(screen.getByText('Question 2 of 9')).toBeTruthy();
  });

  it('is absent from the introduction', async () => {
    const screen = await renderQuestions({ showIntroduction: true });
    expect(screen.getByTestId('assessment-begin-button')).toBeTruthy();
    expect(screen.queryByTestId(EXIT_ID)).toBeNull();
  });

  it('is absent from the results', async () => {
    const screen = await renderQuestions();
    for (let i = 0; i < 9; i++) {
      fireEvent.press(screen.getByTestId('assessment-response-group-option-0'));
      await act(async () => {
        await Promise.resolve();
      });
    }
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId('assessment-results-mock')).toBeTruthy();
    expect(screen.queryByTestId(EXIT_ID)).toBeNull();
  });
});
