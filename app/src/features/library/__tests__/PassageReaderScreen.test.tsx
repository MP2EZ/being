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

  /**
   * FEAT-569 AC5. The doctrinal correctives live in `context`, and the provenance
   * suite pins their WORDING — but a field can be correct in the asset and never
   * reach a reader. This is the render half: without it the corrective could be
   * authored, pinned, and dropped on the way to the screen, with every content
   * assertion still green.
   */
  it('renders the labelled Context box carrying the doctrinal corrective', () => {
    mockRouteParams = { passageId: 'marcus-meditations-10-6' };
    const { queryByText } = render(<PassageReaderScreen />);
    // The label is what marks the note as ours rather than the translator's.
    expect(queryByText('Context')).toBeTruthy();
    // The clause doing the doctrinal work, not the whole note — same short
    // anchor the provenance pin uses, so rewording moves both together.
    expect(queryByText(/one of those causes/)).toBeTruthy();
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
