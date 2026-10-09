/**
 * ThresholdEducationModal copy contract (MAINT-615)
 *
 * The modal's header says its copy carries "no medicalization or diagnostic
 * language". This pins that it does: no "scientifically-validated" claim (the
 * MAINT-612 wording is "widely used"), no condition-named instrument labels,
 * and the philosopher-validated sentences kept verbatim.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import ThresholdEducationModal from '../ThresholdEducationModal';
import { WELLNESS_LABELS } from '@/features/assessment/types/wellnessLabels';

const VALIDITY_CLAIM = /scientifically[- ]validated|clinically validated/i;
const CONDITION_LABEL = /(?:PHQ-9|GAD-7) \((?:Depression|Anxiety)\)|Assessment Scoring|What Assessments Measure/;

const renderOpen = () => render(<ThresholdEducationModal visible onDismiss={jest.fn()} />);

describe('ThresholdEducationModal copy (MAINT-615)', () => {
  it('describes the instruments as widely used wellness screening tools, not a diagnosis', () => {
    const { getByText, queryByText } = renderOpen();
    expect(getByText(/widely used wellness screening tools/)).toBeTruthy();
    expect(getByText(/They're a starting point for understanding your experience, not a diagnosis\./)).toBeTruthy();
    expect(queryByText(VALIDITY_CLAIM)).toBeNull();
  });

  it('labels the instruments with the pinned wellness labels, not condition names', () => {
    const { getByText, queryByText } = renderOpen();
    expect(getByText(new RegExp(`${escape(WELLNESS_LABELS.phq9)}:`))).toBeTruthy();
    expect(getByText(new RegExp(`${escape(WELLNESS_LABELS.gad7)}:`))).toBeTruthy();
    expect(queryByText(CONDITION_LABEL)).toBeNull();
  });

  it('keeps the philosopher-validated sentences verbatim', () => {
    const { getByText } = renderOpen();
    expect(getByText(/this is information in your power to act on\./)).toBeTruthy();
    expect(
      getByText('These assessments are tools for awareness, not labels. Your experience is valid regardless of the number.')
    ).toBeTruthy();
  });

  it('matcher integrity: both matchers fire on the retired copy', () => {
    expect(VALIDITY_CLAIM.test('The PHQ-9 and GAD-7 are scientifically-validated tools')).toBe(true);
    expect(CONDITION_LABEL.test('PHQ-9 (Depression):')).toBe(true);
    expect(CONDITION_LABEL.test('About Assessment Scoring')).toBe(true);
    expect(CONDITION_LABEL.test(`${WELLNESS_LABELS.gad7}:`)).toBe(false);
  });
});

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
