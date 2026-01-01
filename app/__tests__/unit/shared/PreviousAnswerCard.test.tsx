/**
 * PreviousAnswerCard Tests
 *
 * FEAT-139: Unit tests for the shared PreviousAnswerCard component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PreviousAnswerCard } from '@/features/practices/shared/components/PreviousAnswerCard';

describe('PreviousAnswerCard', () => {
  const defaultProps = {
    label: "What's weighing on you:",
    answer: 'Feeling overwhelmed by the project deadline',
  };

  it('renders label', () => {
    const { getByText } = render(<PreviousAnswerCard {...defaultProps} />);

    expect(getByText("What's weighing on you:")).toBeTruthy();
  });

  it('renders answer with quotation marks', () => {
    const { getByText } = render(<PreviousAnswerCard {...defaultProps} />);

    expect(getByText(`"${defaultProps.answer}"`)).toBeTruthy();
  });

  it('uses default testID', () => {
    const { getByTestId } = render(<PreviousAnswerCard {...defaultProps} />);

    expect(getByTestId('previous-answer-card')).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    const { getByTestId } = render(
      <PreviousAnswerCard {...defaultProps} testID="situation-card" />
    );

    expect(getByTestId('situation-card')).toBeTruthy();
  });

  it('renders with morning theme', () => {
    const { toJSON } = render(
      <PreviousAnswerCard {...defaultProps} theme="morning" />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('renders with midday theme (default)', () => {
    const { toJSON } = render(<PreviousAnswerCard {...defaultProps} />);

    expect(toJSON()).toBeTruthy();
  });

  it('renders with evening theme', () => {
    const { toJSON } = render(
      <PreviousAnswerCard {...defaultProps} theme="evening" />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('has proper accessibility label', () => {
    const { getByLabelText } = render(<PreviousAnswerCard {...defaultProps} />);

    expect(
      getByLabelText(`${defaultProps.label} ${defaultProps.answer}`)
    ).toBeTruthy();
  });

  it('renders long answer text', () => {
    const longAnswer =
      'This is a very long answer that describes a complex situation with multiple factors and considerations that the user entered on the previous screen';

    const { getByText } = render(
      <PreviousAnswerCard label="Your situation:" answer={longAnswer} />
    );

    expect(getByText(`"${longAnswer}"`)).toBeTruthy();
  });
});
