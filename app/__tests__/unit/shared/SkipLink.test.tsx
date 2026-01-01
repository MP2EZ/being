/**
 * SkipLink Tests
 *
 * FEAT-139: Unit tests for the shared SkipLink component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SkipLink } from '@/features/practices/shared/components/SkipLink';

describe('SkipLink', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders skip text', () => {
    const { getByText } = render(
      <SkipLink onPress={mockOnPress} accessibilityLabel="Skip gratitude" />
    );

    expect(getByText('Skip →')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const { getByTestId } = render(
      <SkipLink onPress={mockOnPress} accessibilityLabel="Skip gratitude" />
    );

    fireEvent.press(getByTestId('skip-button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('uses default testID', () => {
    const { getByTestId } = render(
      <SkipLink onPress={mockOnPress} accessibilityLabel="Skip gratitude" />
    );

    expect(getByTestId('skip-button')).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    const { getByTestId } = render(
      <SkipLink
        onPress={mockOnPress}
        accessibilityLabel="Skip gratitude"
        testID="custom-skip"
      />
    );

    expect(getByTestId('custom-skip')).toBeTruthy();
  });

  it('has proper accessibility attributes', () => {
    const { getByRole, getByLabelText } = render(
      <SkipLink onPress={mockOnPress} accessibilityLabel="Skip breathing exercise" />
    );

    expect(getByRole('button')).toBeTruthy();
    expect(getByLabelText('Skip breathing exercise')).toBeTruthy();
  });
});
