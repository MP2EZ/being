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
      // Surprising-but-intentional: per `AssessmentResults.tsx:276`, the
      // rendered crisis banner is gated ONLY by `crisisDetection.isCrisis`
      // — the `showCrisisIntervention` prop only suppresses the imperative
      // `Alert.alert` popup at line 210, not the always-on banner. The
      // banner is the "always-visible" safety surface; the popup is the
      // additional intervention that can be suppressed (e.g. for an
      // onboarding preview context). This test pins that boundary so a
      // future refactor doesn't conflate the two.
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
