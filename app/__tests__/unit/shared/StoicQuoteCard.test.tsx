/**
 * StoicQuoteCard Tests
 *
 * FEAT-139: Unit tests for the shared StoicQuoteCard component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StoicQuoteCard } from '@/features/practices/shared/components/StoicQuoteCard';

describe('StoicQuoteCard', () => {
  const defaultProps = {
    quote: 'We were born to work together like feet, hands, and eyes.',
    author: 'Marcus Aurelius',
  };

  it('renders quote with quotation marks', () => {
    const { getByText } = render(<StoicQuoteCard {...defaultProps} />);

    expect(getByText(`"${defaultProps.quote}"`)).toBeTruthy();
  });

  it('renders author with dash prefix', () => {
    const { getByText } = render(<StoicQuoteCard {...defaultProps} />);

    expect(getByText(/— Marcus Aurelius/)).toBeTruthy();
  });

  it('renders with source when provided', () => {
    const { getByText } = render(
      <StoicQuoteCard {...defaultProps} source="Meditations 2:1" />
    );

    expect(getByText(/Meditations 2:1/)).toBeTruthy();
  });

  it('renders without source when not provided', () => {
    const { queryByText } = render(<StoicQuoteCard {...defaultProps} />);

    expect(queryByText(/Meditations/)).toBeNull();
  });

  it('uses default testID', () => {
    const { getByTestId } = render(<StoicQuoteCard {...defaultProps} />);

    expect(getByTestId('stoic-quote-card')).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    const { getByTestId } = render(
      <StoicQuoteCard {...defaultProps} testID="morning-quote" />
    );

    expect(getByTestId('morning-quote')).toBeTruthy();
  });

  it('renders with morning theme', () => {
    const { toJSON } = render(
      <StoicQuoteCard {...defaultProps} theme="morning" />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('renders with midday theme', () => {
    const { toJSON } = render(
      <StoicQuoteCard {...defaultProps} theme="midday" />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('renders with evening theme', () => {
    const { toJSON } = render(
      <StoicQuoteCard {...defaultProps} theme="evening" />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('has proper accessibility label', () => {
    const { getByLabelText } = render(
      <StoicQuoteCard {...defaultProps} source="Meditations 2:1" />
    );

    expect(
      getByLabelText(
        `Quote: ${defaultProps.quote}. By ${defaultProps.author}, from Meditations 2:1`
      )
    ).toBeTruthy();
  });

  it('has accessibility label without source', () => {
    const { getByLabelText } = render(<StoicQuoteCard {...defaultProps} />);

    expect(
      getByLabelText(`Quote: ${defaultProps.quote}. By ${defaultProps.author}`)
    ).toBeTruthy();
  });
});
