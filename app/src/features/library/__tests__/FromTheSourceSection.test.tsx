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
    expect(queryByText(/Of Things, some are in our Power/)).toBeTruthy();
    // Second passage (Enchiridion 2) text is hidden until expanded.
    expect(queryByText(/Desire promises the Attainment/)).toBeNull();
  });

  it('reveals a passage when its header is tapped', () => {
    const { getByLabelText, queryByText, queryAllByText } = render(
      <FromTheSourceSection principle="sphere-sovereignty" />
    );
    fireEvent.press(getByLabelText('Expand passage: Epictetus, Enchiridion 2'));
    expect(queryByText(/Desire promises the Attainment/)).toBeTruthy();
    // Translator attribution surfaces on expand (passages 1 & 2 are both Carter,
    // so both are now visible — assert at least one).
    expect(queryAllByText(/trans\. Elizabeth Carter/).length).toBeGreaterThan(0);
  });

  /**
   * FEAT-569 AC5. This surface renders the note directly beneath
   * "— trans. {translator}", so an unlabelled note reads as the translator's own
   * commentary — silent attribution, and it gets worse the longer the note is.
   * A visual rule cannot carry the distinction: a screen reader hears the two
   * Text nodes consecutively with nothing between them. The label is the fix,
   * so it is pinned rather than left to a style someone may tidy away.
   */
  it('labels the context note so it is not read as the translator\'s words', () => {
    const { queryByText } = render(<FromTheSourceSection principle="radical-acceptance" />);
    // First passage expands by default, so its note is on screen.
    expect(queryByText(/trans\. George Long/)).toBeTruthy();
    expect(queryByText('Context')).toBeTruthy();
    expect(queryByText(/from inside the order/)).toBeTruthy();
  });

  it('deep-links into the library with the current principle', () => {
    const { getByLabelText } = render(<FromTheSourceSection principle="aware-presence" />);
    fireEvent.press(getByLabelText('Browse the full Classical Library'));
    expect(mockNavigate).toHaveBeenCalledWith('ClassicalLibrary', { principle: 'aware-presence' });
  });
});
