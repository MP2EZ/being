/**
 * FlowProgressIndicator Tests
 *
 * INFRA-135: Unit tests for the shared FlowProgressIndicator component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { FlowProgressIndicator } from '@/features/practices/shared/components/FlowProgressIndicator';

describe('FlowProgressIndicator', () => {
  it('renders current step and total steps', () => {
    const { getByText } = render(
      <FlowProgressIndicator currentStep={2} totalSteps={5} flowType="morning" />
    );

    expect(getByText('2 of 5')).toBeTruthy();
  });

  it('renders with morning flow type', () => {
    const { toJSON } = render(
      <FlowProgressIndicator currentStep={1} totalSteps={6} flowType="morning" />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('renders with midday flow type', () => {
    const { toJSON } = render(
      <FlowProgressIndicator currentStep={2} totalSteps={4} flowType="midday" />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('renders with evening flow type', () => {
    const { toJSON } = render(
      <FlowProgressIndicator currentStep={3} totalSteps={6} flowType="evening" />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('calculates progress percentage correctly', () => {
    const { getByText } = render(
      <FlowProgressIndicator currentStep={3} totalSteps={6} flowType="morning" />
    );

    // 3/6 = 50% progress
    expect(getByText('3 of 6')).toBeTruthy();
  });

  it('handles edge case of first step', () => {
    const { getByText } = render(
      <FlowProgressIndicator currentStep={1} totalSteps={5} flowType="morning" />
    );

    expect(getByText('1 of 5')).toBeTruthy();
  });

  it('handles edge case of last step', () => {
    const { getByText } = render(
      <FlowProgressIndicator currentStep={5} totalSteps={5} flowType="morning" />
    );

    expect(getByText('5 of 5')).toBeTruthy();
  });
});
