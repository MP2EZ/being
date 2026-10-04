/**
 * legal-document-screen.test.tsx — DEBUG-680.
 *
 * crisis-button-reachability's Legal depth-2 segment proves its document tap LANDED by
 * asserting this root before tapping the FAB. The Legal list underneath carries the same
 * root FAB, so without a destination-unique fact a swallowed document tap still goes green.
 * The root must render in BOTH branches — a document that fails to resolve still lands the
 * user on this route, and the FAB check is about the route, not the content.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

import LegalDocumentScreen from '@/features/profile/screens/LegalDocumentScreen';

let mockDocumentType = 'privacy-policy';
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ params: { documentType: mockDocumentType } }),
}));

// ESM package jest does not transform; the root testID does not depend on the renderer.
jest.mock('react-native-markdown-display', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ children }: { children: string }) => <Text testID="legal-document-markdown">{children}</Text> };
});

describe('LegalDocumentScreen — DEBUG-680 destination root testID', () => {
  it('renders the screen root testID when the document resolves', () => {
    mockDocumentType = 'privacy-policy';
    const { queryByTestId, queryByText } = render(<LegalDocumentScreen />);
    // Control: the found branch really rendered, so the testID is not from the fallback.
    expect(queryByTestId('legal-document-markdown')).not.toBeNull();
    expect(queryByText('Document not found.')).toBeNull();
    expect(queryByTestId('legal-document-screen')).not.toBeNull();
  });

  it('renders the screen root testID in the not-found fallback too', () => {
    mockDocumentType = 'no-such-document';
    const { queryByTestId, queryByText } = render(<LegalDocumentScreen />);
    // Control: this is the fallback branch.
    expect(queryByText('Document not found.')).not.toBeNull();
    expect(queryByTestId('legal-document-markdown')).toBeNull();
    expect(queryByTestId('legal-document-screen')).not.toBeNull();
  });

  it('is distinct from the Legal list root, so the list cannot satisfy it', () => {
    mockDocumentType = 'privacy-policy';
    const { queryByTestId } = render(<LegalDocumentScreen />);
    expect(queryByTestId('legal-documents-screen')).toBeNull();
  });
});
