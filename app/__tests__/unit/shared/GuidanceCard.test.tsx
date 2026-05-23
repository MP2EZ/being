/**
 * GuidanceCard Tests
 *
 * FEAT-139: Unit tests for the shared GuidanceCard component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import GuidanceCard from '@/features/practices/shared/components/GuidanceCard';

describe('GuidanceCard', () => {
  const defaultProps = {
    title: 'Before this day begins, notice:',
    items: [
      'The weight of your body',
      'The rhythm of your breath',
      'The sounds around you',
    ],
  };

  it('renders title correctly', () => {
    const { getByText } = render(<GuidanceCard {...defaultProps} />);

    expect(getByText('Before this day begins, notice:')).toBeTruthy();
  });

  it('renders all items with bullet points', () => {
    const { getByText } = render(<GuidanceCard {...defaultProps} />);

    expect(getByText('• The weight of your body')).toBeTruthy();
    expect(getByText('• The rhythm of your breath')).toBeTruthy();
    expect(getByText('• The sounds around you')).toBeTruthy();
  });

  it('renders with testID when provided', () => {
    const { getByTestId } = render(
      <GuidanceCard {...defaultProps} testID="morning-guidance" />
    );

    expect(getByTestId('morning-guidance')).toBeTruthy();
  });

  it('renders with empty items array', () => {
    const { getByText, queryByText } = render(
      <GuidanceCard title="Notice:" items={[]} />
    );

    expect(getByText('Notice:')).toBeTruthy();
    expect(queryByText('•')).toBeNull();
  });

  it('renders with single item', () => {
    const { getByText } = render(
      <GuidanceCard title="Focus on:" items={['Your breath']} />
    );

    expect(getByText('Focus on:')).toBeTruthy();
    expect(getByText('• Your breath')).toBeTruthy();
  });
});
