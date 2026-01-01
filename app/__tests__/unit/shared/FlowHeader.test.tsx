/**
 * FlowHeader Tests
 *
 * FEAT-139: Unit tests for the shared FlowHeader component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { FlowHeader } from '@/features/practices/shared/components/FlowHeader';

describe('FlowHeader', () => {
  it('renders title', () => {
    const { getByText } = render(
      <FlowHeader title="Principle Focus" />
    );

    expect(getByText('Principle Focus')).toBeTruthy();
  });

  it('renders title with subtitle', () => {
    const { getByText } = render(
      <FlowHeader
        title="Principle Focus"
        subtitle="Which principle will you practice today?"
      />
    );

    expect(getByText('Principle Focus')).toBeTruthy();
    expect(getByText('Which principle will you practice today?')).toBeTruthy();
  });

  it('renders without subtitle when not provided', () => {
    const { getByText, queryByText } = render(
      <FlowHeader title="Grounded Presence" />
    );

    expect(getByText('Grounded Presence')).toBeTruthy();
    // No subtitle should be rendered
    expect(queryByText('subtitle')).toBeNull();
  });

  it('renders with centered prop', () => {
    const { toJSON } = render(
      <FlowHeader title="Let's settle into evening" centered />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('renders with large prop', () => {
    const { toJSON } = render(
      <FlowHeader title="Morning Practice" large />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('renders with both centered and large props', () => {
    const { getByText } = render(
      <FlowHeader
        title="Grounded Presence"
        subtitle="Settle into your body"
        centered
        large
      />
    );

    expect(getByText('Grounded Presence')).toBeTruthy();
    expect(getByText('Settle into your body')).toBeTruthy();
  });

  it('accepts custom style overrides', () => {
    const { toJSON } = render(
      <FlowHeader
        title="Custom Header"
        style={{ marginTop: 100 }}
        titleStyle={{ color: 'red' }}
        subtitleStyle={{ color: 'blue' }}
        subtitle="Custom subtitle"
      />
    );

    expect(toJSON()).toBeTruthy();
  });
});
