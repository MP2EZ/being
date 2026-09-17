/**
 * AssessmentResults copy contract (MAINT-615)
 *
 * The results screen reads as wellness self-screening, not a diagnosis, while
 * keeping every safety-bearing line at full strength:
 *   - severity titles name a symptom band, never a condition ("Moderate
 *     Depression" is retired); every result at PHQ-9 >=15 or GAD-7 >=15 keeps
 *     the "Significant" qualifier plus a symptom domain term (crisis floor);
 *   - the professional-help guidance and the Professional Support block
 *     (988, 741741) are byte-identical to their pre-change text;
 *   - a not-a-diagnosis line renders on every band, AFTER Professional Support
 *     and BEFORE the summary, so it never sits above the banner or between the
 *     score card and the support content, and it is not an alert.
 */
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import AssessmentResults from '../AssessmentResults';
import {
  WELLNESS_LABELS,
  WELLNESS_SCREENING_NOT_A_DIAGNOSIS,
} from '../../types/wellnessLabels';
import type { PHQ9Result, GAD7Result, AssessmentAnswer } from '../../types';

const answers = (prefix: string, count: number, total: number): AssessmentAnswer[] => {
  let remaining = total;
  return Array.from({ length: count }, (_, i) => {
    const response = Math.min(3, Math.max(0, remaining)) as AssessmentAnswer['response'];
    remaining -= response;
    return { questionId: `${prefix}_${i + 1}`, response, timestamp: 1 };
  });
};

const phq = (totalScore: number, suicidalIdeation = false): PHQ9Result => ({
  totalScore,
  severity:
    totalScore >= 20 ? 'severe' :
    totalScore >= 15 ? 'moderately_severe' :
    totalScore >= 10 ? 'moderate' :
    totalScore >= 5 ? 'mild' : 'minimal',
  isCrisis: totalScore >= 15 || suicidalIdeation,
  suicidalIdeation,
  completedAt: 1_700_000_000_000,
  answers: answers('phq9', 9, totalScore),
});

const gad = (totalScore: number): GAD7Result => ({
  totalScore,
  severity:
    totalScore >= 15 ? 'severe' :
    totalScore >= 10 ? 'moderate' :
    totalScore >= 5 ? 'mild' : 'minimal',
  isCrisis: totalScore >= 15,
  completedAt: 1_700_000_000_000,
  answers: answers('gad7', 7, totalScore),
});

type Case = {
  name: string;
  result: PHQ9Result | GAD7Result;
  title: string;
  header: string;
  professionalSupport: boolean;
  /** Pre-change guidance, verbatim. Must not be softened. */
  guidance: string;
};

const CASES: Case[] = [
  { name: 'PHQ-9 0', result: phq(0), title: 'Minimal Depressive Symptoms', header: WELLNESS_LABELS.phq9, professionalSupport: false,
    guidance: 'Continue with mindfulness practices and self-care routines. Regular check-ins can help maintain your wellness.' },
  { name: 'PHQ-9 5', result: phq(5), title: 'Mild Depressive Symptoms', header: WELLNESS_LABELS.phq9, professionalSupport: false,
    guidance: 'Consider incorporating more mindfulness practices, gentle exercise, and connecting with supportive people. Monitor your mood patterns.' },
  { name: 'PHQ-9 10', result: phq(10), title: 'Moderate Depressive Symptoms', header: WELLNESS_LABELS.phq9, professionalSupport: true,
    guidance: 'We recommend speaking with a mental health professional. In the meantime, practice self-compassion and maintain supportive connections.' },
  { name: 'PHQ-9 15', result: phq(15), title: 'Significant Depressive Symptoms', header: WELLNESS_LABELS.phq9, professionalSupport: true,
    guidance: 'Please reach out to a mental health professional soon. You deserve support, and effective treatments are available.' },
  { name: 'PHQ-9 19', result: phq(19), title: 'Significant Depressive Symptoms', header: WELLNESS_LABELS.phq9, professionalSupport: true,
    guidance: 'Please reach out to a mental health professional soon. You deserve support, and effective treatments are available.' },
  { name: 'PHQ-9 20', result: phq(20), title: 'Significant Depressive Symptoms', header: WELLNESS_LABELS.phq9, professionalSupport: true,
    guidance: 'Please reach out to a mental health professional soon. You deserve support, and effective treatments are available.' },
  { name: 'PHQ-9 27', result: phq(27), title: 'Significant Depressive Symptoms', header: WELLNESS_LABELS.phq9, professionalSupport: true,
    guidance: 'Please reach out to a mental health professional soon. You deserve support, and effective treatments are available.' },
  { name: 'PHQ-9 5 with Q9>0', result: phq(5, true), title: 'Mild Depressive Symptoms', header: WELLNESS_LABELS.phq9, professionalSupport: false,
    guidance: 'Consider incorporating more mindfulness practices, gentle exercise, and connecting with supportive people. Monitor your mood patterns.' },
  { name: 'GAD-7 0', result: gad(0), title: 'Minimal Anxiety Symptoms', header: WELLNESS_LABELS.gad7, professionalSupport: false,
    guidance: 'Continue with mindfulness practices and notice when anxiety arises with curiosity rather than judgment.' },
  { name: 'GAD-7 5', result: gad(5), title: 'Mild Anxiety Symptoms', header: WELLNESS_LABELS.gad7, professionalSupport: false,
    guidance: 'Practice breathing exercises and mindful observation of anxious thoughts. Notice patterns without judgment.' },
  { name: 'GAD-7 10', result: gad(10), title: 'Moderate Anxiety Symptoms', header: WELLNESS_LABELS.gad7, professionalSupport: true,
    guidance: 'Consider speaking with a counselor who can help you develop effective coping strategies. You\'re not alone in this.' },
  { name: 'GAD-7 15', result: gad(15), title: 'Significant Anxiety Symptoms', header: WELLNESS_LABELS.gad7, professionalSupport: true,
    guidance: 'Please consider reaching out to a mental health professional. Effective treatments can help you find relief.' },
  { name: 'GAD-7 21', result: gad(21), title: 'Significant Anxiety Symptoms', header: WELLNESS_LABELS.gad7, professionalSupport: true,
    guidance: 'Please consider reaching out to a mental health professional. Effective treatments can help you find relief.' },
];

/** A condition named as the headline: "Moderate Depression", "Significant Anxiety". */
const CONDITION_HEADLINE = /^(?:Minimal|Mild|Moderate|Significant|Severe)\s+(?:Depression|Anxiety)$/;
const DIAGNOSTIC_HEADER = /(?:Depression|Anxiety) Assessment/;
/** Softeners the crisis floor rules out at >=15. */
const SOFTENERS = /\b(?:stress|low mood|feeling down|elevated|some|noticeable|higher)\b/i;
const CRISIS_BANNER = /Immediate support is available/;

const REQUIRED_NOT_A_DIAGNOSIS =
  'This is a wellness screening, not a diagnosis. A mental health professional can help you understand your results.';

function isAtOrAboveFifteen(result: PHQ9Result | GAD7Result): boolean {
  return result.totalScore >= 15;
}

/** Every rendered string, in tree order. */
function textsInOrder(node: unknown, out: string[] = []): string[] {
  if (node === null || node === undefined) return out;
  if (typeof node === 'string') {
    out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => textsInOrder(child, out));
    return out;
  }
  const children = (node as { children?: unknown }).children;
  if (children) textsInOrder(children, out);
  return out;
}

function indexOfText(texts: string[], matcher: RegExp | string): number {
  return texts.findIndex((t) => (typeof matcher === 'string' ? t.includes(matcher) : matcher.test(t)));
}

describe('AssessmentResults copy (MAINT-615)', () => {
  describe.each(CASES)('$name', ({ result, title, header, professionalSupport, guidance }) => {
    const renderIt = () =>
      render(<AssessmentResults result={result} onComplete={jest.fn()} />);

    it('shows the symptom-band title and no condition headline', () => {
      const { getByText, queryByText } = renderIt();
      expect(getByText(title)).toBeTruthy();
      expect(queryByText(CONDITION_HEADLINE)).toBeNull();
      expect(queryByText(DIAGNOSTIC_HEADER)).toBeNull();
    });

    it('uses the pinned wellness label as the screen header', () => {
      const { getByText } = renderIt();
      expect(getByText(header)).toBeTruthy();
    });

    it('keeps the professional-help guidance verbatim', () => {
      const { getByText } = renderIt();
      expect(getByText(guidance)).toBeTruthy();
    });

    it('meets the crisis floor at >=15: "Significant" qualifier, symptom domain, no softener', () => {
      if (!isAtOrAboveFifteen(result)) {
        expect(title).not.toMatch(/^Significant/);
        return;
      }
      expect(title).toMatch(/^Significant (?:Depressive|Anxiety) Symptoms$/);
      expect(title).not.toMatch(SOFTENERS);
    });

    it('renders Professional Support with 988 and 741741 exactly for moderate and above', () => {
      const { queryByText } = renderIt();
      if (professionalSupport) {
        expect(queryByText('• Call 988 for crisis support (24/7)')).not.toBeNull();
        expect(queryByText('• Text HOME to 741741 for crisis text line')).not.toBeNull();
      } else {
        expect(queryByText('Professional Support')).toBeNull();
      }
    });

    it('renders the not-a-diagnosis line, not as an alert', () => {
      const { getByTestId } = renderIt();
      const line = getByTestId('results-not-a-diagnosis');
      expect(line.props.children).toBe(REQUIRED_NOT_A_DIAGNOSIS);
      expect(line.props.accessibilityRole).not.toBe('alert');
      expect(line.props.accessibilityLiveRegion).toBeUndefined();
    });

    it('orders banner < Professional Support < not-a-diagnosis < summary, apart from Mindful Approach', () => {
      const texts = textsInOrder(renderIt().toJSON());
      const disclaimer = indexOfText(texts, REQUIRED_NOT_A_DIAGNOSIS);
      const summary = indexOfText(texts, 'Assessment Summary');
      const mindful = indexOfText(texts, 'Mindful Approach');
      const support = indexOfText(texts, 'Professional Support');
      const banner = indexOfText(texts, CRISIS_BANNER);

      expect(disclaimer).toBeGreaterThan(-1);
      expect(disclaimer).toBeLessThan(summary);
      expect(disclaimer).toBeGreaterThan(mindful);
      if (banner > -1) expect(banner).toBeLessThan(disclaimer);
      if (professionalSupport) {
        // Professional Support sits between the Mindful Approach paragraph and
        // the line, so the line never reads as part of "it's only temporary".
        expect(support).toBeGreaterThan(mindful);
        expect(support).toBeLessThan(disclaimer);
      }
    });
  });

  it('WELLNESS_SCREENING_NOT_A_DIAGNOSIS is the ruled copy', () => {
    expect(WELLNESS_SCREENING_NOT_A_DIAGNOSIS).toBe(REQUIRED_NOT_A_DIAGNOSIS);
  });

  describe('matcher integrity', () => {
    it('the condition-headline and header matchers fire on the retired copy', () => {
      expect(CONDITION_HEADLINE.test('Moderate Depression')).toBe(true);
      expect(CONDITION_HEADLINE.test('Significant Anxiety')).toBe(true);
      expect(CONDITION_HEADLINE.test('Significant Anxiety Symptoms')).toBe(false);
      expect(DIAGNOSTIC_HEADER.test('PHQ-9 Depression Assessment')).toBe(true);
    });

    it('the softener matcher fires on ruled-out wording', () => {
      expect(SOFTENERS.test('Elevated stress')).toBe(true);
      expect(SOFTENERS.test('Some low mood')).toBe(true);
      expect(SOFTENERS.test('Significant Anxiety Symptoms')).toBe(false);
    });

    it('textsInOrder walks nested children in order', () => {
      expect(
        textsInOrder({ children: ['a', { children: ['b', { children: ['c'] }] }, 'd'] })
      ).toEqual(['a', 'b', 'c', 'd']);
    });
  });
});
