/**
 * AssessmentIntroduction copy contract (MAINT-612, MAINT-615)
 *
 * The standalone PHQ-9 / GAD-7 introduction is wellness self-screening copy in a
 * consumer app. Compliance ruled that it must not describe the screening as a
 * clinical instrument or name a clinical therapy; crisis ruled that it must not
 * imply a diagnosis. MAINT-615 adds that the titles are the pinned
 * WELLNESS_LABELS and that GAD-7 carries the same not-a-diagnosis clause as
 * PHQ-9. These assertions pin the rendered text, not the source, so a comment
 * mentioning either phrase can never fail them.
 */
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import AssessmentIntroduction from '../AssessmentIntroduction';
import { WELLNESS_LABELS } from '../../types/wellnessLabels';

const CLINICAL_CLAIM = /clinically validated|clinical tool|mindfulness-based cognitive therapy/i;
const DIAGNOSTIC_TITLE = /(?:Depression|Anxiety) Assessment/;

describe('AssessmentIntroduction copy (MAINT-612)', () => {
  it('matcher self-check: the clinical-claim pattern fires on the retired copy', () => {
    expect(
      CLINICAL_CLAIM.test('The PHQ-9 is a clinically validated tool that gently guides you')
    ).toBe(true);
    expect(CLINICAL_CLAIM.test('in the spirit of mindfulness-based cognitive therapy')).toBe(true);
    expect(DIAGNOSTIC_TITLE.test('Depression Assessment (PHQ-9)')).toBe(true);
  });

  it('PHQ-9 intro describes a wellness screening, not a clinical instrument or a diagnosis', () => {
    const { getByText, queryByText } = render(
      <AssessmentIntroduction assessmentType="phq9" onBegin={jest.fn()} />
    );

    expect(getByText(/widely used wellness screening tool/)).toBeTruthy();
    expect(getByText(/a starting point, not a diagnosis\./)).toBeTruthy();
    expect(queryByText(CLINICAL_CLAIM)).toBeNull();
  });

  it('GAD-7 intro makes no clinical claim either', () => {
    const { getByText, queryByText } = render(
      <AssessmentIntroduction assessmentType="gad7" onBegin={jest.fn()} />
    );

    expect(getByText(/The GAD-7 helps you notice patterns of anxiety/)).toBeTruthy();
    expect(queryByText(CLINICAL_CLAIM)).toBeNull();
  });
});

describe('AssessmentIntroduction titles and GAD-7 parity (MAINT-615)', () => {
  it.each([
    ['phq9', WELLNESS_LABELS.phq9],
    ['gad7', WELLNESS_LABELS.gad7],
  ] as const)('%s title is the pinned wellness label and drives the Begin label', (type, label) => {
    const { getByText, queryByText, getByTestId } = render(
      <AssessmentIntroduction assessmentType={type} onBegin={jest.fn()} />
    );

    expect(getByText(label)).toBeTruthy();
    expect(queryByText(DIAGNOSTIC_TITLE)).toBeNull();
    expect(getByTestId('assessment-begin-button').props.accessibilityLabel).toBe(`Begin ${label}`);
  });

  it('GAD-7 purpose carries the not-a-diagnosis clause', () => {
    const { getByText } = render(
      <AssessmentIntroduction assessmentType="gad7" onBegin={jest.fn()} />
    );

    expect(getByText(/The GAD-7 helps you notice patterns of anxiety.*a starting point, not a diagnosis\./)).toBeTruthy();
  });
});
