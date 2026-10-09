/**
 * legal-documents-list-screen.test.tsx — DEBUG-652.
 *
 * crisis-button-reachability proves its profile-card-legal tap LANDED by asserting this
 * root before tapping the FAB. The Profile menu carries its own FAB, so without a
 * destination-unique fact a swallowed card tap still goes green — and the header title
 * cannot serve, because the menu card carries the same label.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

import LegalDocumentsListScreen from '@/features/profile/screens/LegalDocumentsListScreen';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

describe('LegalDocumentsListScreen — DEBUG-652 destination root testID', () => {
  it('renders the screen root testID alongside the document list', () => {
    const { queryByTestId } = render(<LegalDocumentsListScreen />);
    expect(queryByTestId('profile-legal-doc-privacy-policy')).not.toBeNull();
    expect(queryByTestId('legal-documents-screen')).not.toBeNull();
  });
});
