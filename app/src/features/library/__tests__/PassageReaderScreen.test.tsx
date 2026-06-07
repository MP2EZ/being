/**
 * FEAT-54: PassageReaderScreen — single-passage reader.
 *
 * Coverage:
 * - renders author, citation + translator, and passage text for a known id
 * - excerpt↔full disclosure toggle (only for passages with fullText)
 * - principle chip deep-links back to the grounding module
 * - unknown id renders the not-found path
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: { passageId: string } = { passageId: 'seneca-letters-13' };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('@/features/crisis/components', () => ({
  CollapsibleCrisisButton: () => null,
}));

import PassageReaderScreen from '../screens/PassageReaderScreen';

describe('PassageReaderScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { passageId: 'seneca-letters-13' };
  });

  it('renders author, citation + translator, and the excerpt', () => {
    const { queryByText } = render(<PassageReaderScreen />);
    expect(queryByText('Seneca')).toBeTruthy();
    expect(queryByText(/Letters 13\.4 · trans\. Richard Mott Gummere/)).toBeTruthy();
    expect(queryByText(/we suffer more from imagination than from reality/)).toBeTruthy();
  });

  it('toggles the full passage when the disclosure is tapped', () => {
    const { getByText, queryByText } = render(<PassageReaderScreen />);
    // Full text is hidden until the disclosure is opened.
    expect(queryByText(/There are more things, Lucilius/)).toBeNull();
    fireEvent.press(getByText('Read full passage'));
    expect(queryByText(/There are more things, Lucilius/)).toBeTruthy();
    expect(getByText('Show excerpt')).toBeTruthy();
  });

  it('does not show a disclosure for passages without fullText', () => {
    mockRouteParams = { passageId: 'epictetus-enchiridion-1' };
    const { queryByText } = render(<PassageReaderScreen />);
    expect(queryByText('Read full passage')).toBeNull();
  });

  it('deep-links to the grounding module via the principle chip', () => {
    const { getByLabelText } = render(<PassageReaderScreen />);
    fireEvent.press(getByLabelText('Open the Virtuous Response module'));
    expect(mockNavigate).toHaveBeenCalledWith('ModuleDetail', {
      moduleId: 'virtuous-response',
    });
  });

  it('renders the not-found path for an unknown id', () => {
    mockRouteParams = { passageId: 'does-not-exist' };
    const { getByText } = render(<PassageReaderScreen />);
    expect(getByText('Passage not found.')).toBeTruthy();
  });
});
