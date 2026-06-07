/**
 * AssessmentResults render-contract tests (TEST-09)
 *
 * Covers the crisis-handoff visibility on a critical safety surface — the
 * screen that renders PHQ-9/GAD-7 outcomes and decides whether to surface
 * the "🚨 Immediate support is available" banner pointing users at the
 * crisis button. A regression that hides this banner on a crisis result
 * is a silent safety failure.
 *
 * Component thresholds (per `AssessmentResults.tsx:78-101`):
 *   - PHQ-9 ≥20 OR suicidalIdeation === true → crisis banner visible
 *   - GAD-7 ≥15                              → crisis banner visible
 *   - Everything else                        → no crisis banner
 *
 * Note: the audit's TEST-09 expected a two-tier CTA (≥15 support, ≥20
 * escalation). The actual component uses a single-tier 20-floor for PHQ-9
 * (matching CRISIS_SAFETY_THRESHOLDS.PHQ9_SEVERE_THRESHOLD, which the
 * sentinel test in PR 1 pins). This test asserts what the component
 * actually does. If the product wants a separate 15-floor support tier,
 * that's a feature add — separate ticket.
 */
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import AssessmentResults from '../AssessmentResults';
import type { PHQ9Result, GAD7Result, AssessmentAnswer } from '../../types';

const phqAnswers = (totalScore: number, q9Response = 0): AssessmentAnswer[] => {
  // Distribute totalScore - q9Response across questions 1-8, then put q9
  // explicitly. Each response capped at 3.
  const baseScore = totalScore - q9Response;
  const answers: AssessmentAnswer[] = [];
  let remaining = baseScore;
  for (let i = 1; i <= 8; i++) {
    const response = Math.min(3, Math.max(0, remaining)) as AssessmentAnswer['response'];
    answers.push({ questionId: `phq9_${i}`, response, timestamp: Date.now() });
    remaining -= response;
  }
  answers.push({
    questionId: 'phq9_9',
    response: q9Response as AssessmentAnswer['response'],
    timestamp: Date.now(),
  });
  return answers;
};

const phqResult = (totalScore: number, suicidalIdeation = false): PHQ9Result => ({
  totalScore,
  severity:
    totalScore >= 20 ? 'severe' :
    totalScore >= 15 ? 'moderately_severe' :
    totalScore >= 10 ? 'moderate' :
    totalScore >= 5 ? 'mild' : 'minimal',
  isCrisis: totalScore >= 15 || suicidalIdeation,
  suicidalIdeation,
  completedAt: Date.now(),
  answers: phqAnswers(totalScore, suicidalIdeation ? 1 : 0),
});

const gad7Result = (totalScore: number): GAD7Result => ({
  totalScore,
  severity:
    totalScore >= 15 ? 'severe' :
    totalScore >= 10 ? 'moderate' :
    totalScore >= 5 ? 'mild' : 'minimal',
  isCrisis: totalScore >= 15,
  completedAt: Date.now(),
  answers: Array.from({ length: 7 }, (_, i) => ({
    questionId: `gad7_${i + 1}`,
    response: Math.min(3, Math.floor(totalScore / 7) + (i < totalScore % 7 ? 1 : 0)) as AssessmentAnswer['response'],
    timestamp: Date.now(),
  })),
});

const CRISIS_BANNER = /Immediate support is available/i;

describe('AssessmentResults — crisis banner visibility (TEST-09)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
  });

  describe('PHQ-9 threshold transitions', () => {
    test('score 0 (minimal) → no crisis banner', () => {
      const { queryByText } = render(
        <AssessmentResults
          result={phqResult(0)}
          onComplete={jest.fn()}
          showCrisisIntervention={true}
        />,
      );
      expect(queryByText(CRISIS_BANNER)).toBeNull();
    });

    test('score 14 (moderate, below crisis) → no crisis banner', () => {
      const { queryByText } = render(
        <AssessmentResults
          result={phqResult(14)}
          onComplete={jest.fn()}
          showCrisisIntervention={true}
        />,
      );
      expect(queryByText(CRISIS_BANNER)).toBeNull();
    });

    test('score 19 (moderately severe, JUST below crisis threshold) → no crisis banner', () => {
      // Boundary test — the cutoff is ≥20 for PHQ-9, not ≥15. A regression
      // that flipped the comparator to >15 would over-trigger the banner;
      // this assertion pins the boundary.
      const { queryByText } = render(
        <AssessmentResults
          result={phqResult(19)}
          onComplete={jest.fn()}
          showCrisisIntervention={true}
        />,
      );
      expect(queryByText(CRISIS_BANNER)).toBeNull();
    });

    test('score 20 (severe, AT crisis threshold) → crisis banner visible', () => {
      const { queryByText } = render(
        <AssessmentResults
          result={phqResult(20)}
          onComplete={jest.fn()}
          showCrisisIntervention={true}
        />,
      );
      expect(queryByText(CRISIS_BANNER)).not.toBeNull();
    });

    test('score 27 (maximum) → crisis banner visible', () => {
      const { queryByText } = render(
        <AssessmentResults
          result={phqResult(27)}
          onComplete={jest.fn()}
          showCrisisIntervention={true}
        />,
      );
      expect(queryByText(CRISIS_BANNER)).not.toBeNull();
    });
  });

  describe('PHQ-9 Q9 suicidal-ideation override', () => {
    test('low score (5) BUT Q9 > 0 → crisis banner visible (Q9 overrides total)', () => {
      // The component's safety contract: any non-zero Q9 response triggers
      // the crisis path regardless of total score. A regression that
      // gated this behind `totalScore >= 20 && suicidalIdeation` would
      // silently hide the banner for someone who answered Q9 affirmatively
      // but otherwise scored low.
      const { queryByText } = render(
        <AssessmentResults
          result={phqResult(5, /* suicidalIdeation */ true)}
          onComplete={jest.fn()}
          showCrisisIntervention={true}
        />,
      );
      expect(queryByText(CRISIS_BANNER)).not.toBeNull();
    });

    test('score 0 BUT Q9 > 0 → crisis banner visible', () => {
      const { queryByText } = render(
        <AssessmentResults
          result={phqResult(0, true)}
          onComplete={jest.fn()}
          showCrisisIntervention={true}
        />,
      );
      expect(queryByText(CRISIS_BANNER)).not.toBeNull();
    });
  });

  describe('GAD-7 threshold transitions', () => {
    test('score 14 (moderate, below crisis) → no crisis banner', () => {
      const { queryByText } = render(
        <AssessmentResults
          result={gad7Result(14)}
          onComplete={jest.fn()}
          showCrisisIntervention={true}
        />,
      );
      expect(queryByText(CRISIS_BANNER)).toBeNull();
    });

    test('score 15 (severe, AT crisis threshold) → crisis banner visible', () => {
      const { queryByText } = render(
        <AssessmentResults
          result={gad7Result(15)}
          onComplete={jest.fn()}
          showCrisisIntervention={true}
        />,
      );
      expect(queryByText(CRISIS_BANNER)).not.toBeNull();
    });

    test('score 21 (maximum) → crisis banner visible', () => {
      const { queryByText } = render(
        <AssessmentResults
          result={gad7Result(21)}
          onComplete={jest.fn()}
          showCrisisIntervention={true}
        />,
      );
      expect(queryByText(CRISIS_BANNER)).not.toBeNull();
    });
  });

  describe('showCrisisIntervention prop scope', () => {
    test('banner ALWAYS renders on crisis, regardless of showCrisisIntervention prop', () => {
      // The rendered crisis banner is gated ONLY by `crisisDetection.isCrisis`
      // — `showCrisisIntervention` was historically also gating an imperative
      // `Alert.alert` popup, which DEBUG-187 deleted (it bypassed the store's
      // `handleCrisisDetection` and rendered the OLD MAINT-166 mockCrisisEngine
      // copy). Today the prop is effectively a no-op; this test still pins the
      // banner-always-renders behavior so a future cleanup doesn't accidentally
      // gate the banner behind the prop too.
      const { queryByText } = render(
        <AssessmentResults
          result={phqResult(27, true)}
          onComplete={jest.fn()}
          showCrisisIntervention={false}
        />,
      );
      expect(queryByText(CRISIS_BANNER)).not.toBeNull();
    });
  });
});

// DEBUG-187 regression guard: the AssessmentResults component MUST NOT fire
// its own `Alert.alert` or `Linking.openURL` on a crisis result. The store's
// `handleCrisisDetection` (assessmentStore.ts:663-708) is the single writer
// of the canonical "Crisis Support Available" alert and the audit-trail
// `crisisIntervention` record. Any component-level alert bypass defeats
// per-session dedup and the `crisisIntervention.detection === crisisDetection`
// invariant. This block pins the absence of that bypass.
describe('AssessmentResults — no Alert / Linking bypass (DEBUG-187 regression guard)', () => {
  let alertSpy: jest.SpyInstance;
  let linkingSpy: jest.SpyInstance;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Alert, Linking } = require('react-native');
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    linkingSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
    linkingSpy.mockRestore();
  });

  test('PHQ-9 with suicidalIdeation=true: component fires no Alert.alert', () => {
    render(
      <AssessmentResults
        result={phqResult(0, /* suicidalIdeation */ true)}
        onComplete={jest.fn()}
        showCrisisIntervention={true}
      />,
    );
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('PHQ-9 with suicidalIdeation=true: component opens no tel:/sms: URL', () => {
    render(
      <AssessmentResults
        result={phqResult(0, true)}
        onComplete={jest.fn()}
        showCrisisIntervention={true}
      />,
    );
    expect(linkingSpy).not.toHaveBeenCalled();
  });

  test('PHQ-9 score 27 (severe): component fires no Alert.alert', () => {
    render(
      <AssessmentResults
        result={phqResult(27)}
        onComplete={jest.fn()}
        showCrisisIntervention={true}
      />,
    );
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('GAD-7 score 21 (severe): component fires no Alert.alert', () => {
    render(
      <AssessmentResults
        result={gad7Result(21)}
        onComplete={jest.fn()}
        showCrisisIntervention={true}
      />,
    );
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('crisis-button (CollapsibleCrisisButton) renders on crisis result', () => {
    // Positive assertion: the component still owes the user a visible crisis
    // affordance even though it no longer fires the modal alert. The
    // CollapsibleCrisisButton with testID="crisis-button" is that affordance.
    const { getByTestId } = render(
      <AssessmentResults
        result={phqResult(0, true)}
        onComplete={jest.fn()}
        showCrisisIntervention={true}
      />,
    );
    expect(getByTestId('crisis-button')).toBeTruthy();
  });
});
