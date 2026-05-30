/**
 * FEAT-54: ClassicalLibraryScreen — browsable, filterable passage list.
 *
 * Coverage (the screen-level logic the loader tests don't reach):
 * - renders rows across principles/authors with no filter
 * - selecting an author chip narrows the list (combined local-state filter)
 * - a route-param principle scopes the initial list
 * - tapping a row navigates to PassageReader with the passage id
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: { principle?: string; author?: string } | undefined = {};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('@/features/crisis/components', () => ({
  CollapsibleCrisisButton: () => null,
}));

import ClassicalLibraryScreen from '../screens/ClassicalLibraryScreen';

describe('ClassicalLibraryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
  });

  it('renders passages across authors with no filter', () => {
    const { queryByLabelText } = render(<ClassicalLibraryScreen />);
    expect(queryByLabelText('Marcus Aurelius, Meditations 5.20. Virtuous Response.')).toBeTruthy();
    expect(queryByLabelText('Epictetus, Enchiridion 1. Sphere Sovereignty.')).toBeTruthy();
  });

  it('narrows the list when an author chip is selected', () => {
    const { getByLabelText, queryByLabelText } = render(<ClassicalLibraryScreen />);
    fireEvent.press(getByLabelText('Filter: Epictetus'));
    // Epictetus rows remain; Marcus rows are filtered out.
    expect(queryByLabelText('Epictetus, Enchiridion 1. Sphere Sovereignty.')).toBeTruthy();
    expect(queryByLabelText('Marcus Aurelius, Meditations 5.20. Virtuous Response.')).toBeNull();
  });

  it('scopes the initial list to a route-param principle', () => {
    mockRouteParams = { principle: 'sphere-sovereignty' };
    const { queryByLabelText } = render(<ClassicalLibraryScreen />);
    expect(queryByLabelText('Epictetus, Enchiridion 1. Sphere Sovereignty.')).toBeTruthy();
    // A passage from another principle should not appear.
    expect(queryByLabelText('Marcus Aurelius, Meditations 5.20. Virtuous Response.')).toBeNull();
  });

  it('navigates to the reader when a row is tapped', () => {
    const { getByLabelText } = render(<ClassicalLibraryScreen />);
    fireEvent.press(getByLabelText('Epictetus, Enchiridion 1. Sphere Sovereignty.'));
    expect(mockNavigate).toHaveBeenCalledWith('PassageReader', {
      passageId: 'epictetus-enchiridion-1',
    });
  });
});
