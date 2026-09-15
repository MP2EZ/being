/**
 * AssessmentIntroduction copy contract (MAINT-612)
 *
 * The standalone PHQ-9 / GAD-7 introduction is wellness self-screening copy in a
 * consumer app. Compliance ruled that it must not describe the screening as a
 * clinical instrument or name a clinical therapy; crisis ruled that it must not
 * imply a diagnosis. These assertions pin the rendered text, not the source, so a
 * comment mentioning either phrase can never fail them.
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

const CLINICAL_CLAIM = /clinically validated|clinical tool|mindfulness-based cognitive therapy/i;

describe('AssessmentIntroduction copy (MAINT-612)', () => {
  it('matcher self-check: the clinical-claim pattern fires on the retired copy', () => {
    expect(
      CLINICAL_CLAIM.test('The PHQ-9 is a clinically validated tool that gently guides you')
    ).toBe(true);
    expect(CLINICAL_CLAIM.test('in the spirit of mindfulness-based cognitive therapy')).toBe(true);
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
