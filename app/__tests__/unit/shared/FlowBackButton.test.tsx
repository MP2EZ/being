/**
 * FlowBackButton Tests
 *
 * FEAT-139: Unit tests for the shared FlowBackButton component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FlowBackButton } from '@/features/practices/shared/components/FlowBackButton';

describe('FlowBackButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders with default props', () => {
    const { getByText, getByTestId } = render(
      <FlowBackButton onPress={mockOnPress} />
    );

    expect(getByText('← Back')).toBeTruthy();
    expect(getByTestId('back-button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const { getByTestId } = render(
      <FlowBackButton onPress={mockOnPress} />
    );

    fireEvent.press(getByTestId('back-button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders with morning theme', () => {
    const { toJSON } = render(
      <FlowBackButton onPress={mockOnPress} theme="morning" />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('renders with midday theme', () => {
    const { toJSON } = render(
      <FlowBackButton onPress={mockOnPress} theme="midday" />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('renders with evening theme', () => {
    const { toJSON } = render(
      <FlowBackButton onPress={mockOnPress} theme="evening" />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    const { getByTestId } = render(
      <FlowBackButton onPress={mockOnPress} testID="custom-back" />
    );

    expect(getByTestId('custom-back')).toBeTruthy();
  });

  it('has proper accessibility attributes', () => {
    const { getByRole, getByLabelText } = render(
      <FlowBackButton onPress={mockOnPress} />
    );

    expect(getByRole('button')).toBeTruthy();
    expect(getByLabelText('Go back')).toBeTruthy();
  });
});
