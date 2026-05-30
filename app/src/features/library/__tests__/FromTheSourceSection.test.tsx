/**
 * FEAT-54: FromTheSourceSection — in-module classical passages accordion.
 *
 * Coverage:
 * - renders the principle's passages (author · citation headers)
 * - first passage expanded by default, others collapsed
 * - tapping a collapsed header reveals its text + translator
 * - "Browse the full Classical Library" deep-links with the principle
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import FromTheSourceSection from '../components/FromTheSourceSection';

describe('FromTheSourceSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders passage headers for the principle', () => {
    const { getByLabelText } = render(<FromTheSourceSection principle="sphere-sovereignty" />);
    // Headers are labelled "Expand/Collapse passage: <author>, <citation>".
    expect(getByLabelText('Collapse passage: Epictetus, Enchiridion 1')).toBeTruthy();
    expect(getByLabelText('Expand passage: Epictetus, Enchiridion 2')).toBeTruthy();
  });

  it('expands the first passage by default and collapses the rest', () => {
    const { queryByText } = render(<FromTheSourceSection principle="sphere-sovereignty" />);
    // First passage (Enchiridion 1) text is visible.
    expect(queryByText(/Some things are in our control/)).toBeTruthy();
    // Second passage (Enchiridion 2) text is hidden until expanded.
    expect(queryByText(/following desire promises/)).toBeNull();
  });

  it('reveals a passage when its header is tapped', () => {
    const { getByLabelText, queryByText, queryAllByText } = render(
      <FromTheSourceSection principle="sphere-sovereignty" />
    );
    fireEvent.press(getByLabelText('Expand passage: Epictetus, Enchiridion 2'));
    expect(queryByText(/following desire promises/)).toBeTruthy();
    // Translator attribution surfaces on expand (passages 1 & 2 are both Carter,
    // so both are now visible — assert at least one).
    expect(queryAllByText(/trans\. Elizabeth Carter/).length).toBeGreaterThan(0);
  });

  it('deep-links into the library with the current principle', () => {
    const { getByLabelText } = render(<FromTheSourceSection principle="aware-presence" />);
    fireEvent.press(getByLabelText('Browse the full Classical Library'));
    expect(mockNavigate).toHaveBeenCalledWith('ClassicalLibrary', { principle: 'aware-presence' });
  });
});
