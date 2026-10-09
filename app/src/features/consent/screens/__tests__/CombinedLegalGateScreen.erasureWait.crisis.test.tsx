/**
 * DEBUG-763 — while an interrupted erasure's resume runs, a LegalGate submit waits for it
 * (the grant join in consentStore). The wait is button-level only: no full-screen spinner,
 * no Modal, and the 988 footer stays rendered and tappable. The real consentStore runs;
 * the resume is a promise that never settles.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

jest.mock('@react-native-picker/picker', () => {
  const React_ = require('react');
  const { View } = require('react-native');
  const Picker = ({ children, ...props }: never) => React_.createElement(View, props, children);
  Picker.Item = (props: never) => React_.createElement(View, props);
  return { Picker };
});

import * as SecureStore from 'expo-secure-store';
import CombinedLegalGateScreen from '../CombinedLegalGateScreen';
import { trackErasureInFlight } from '@/core/services/privacy/erasureResumeGate';

it('a submit during a pending resume writes nothing, and the 988 footer still dials', async () => {
  (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
  (Linking.openURL as jest.Mock).mockClear().mockResolvedValue(undefined);
  trackErasureInFlight(new Promise<void>(() => undefined));

  const onComplete = jest.fn();
  const api = render(<CombinedLegalGateScreen onComplete={onComplete} onUnderAge={jest.fn()} />);
  fireEvent(api.getByTestId('legal-dob-picker'), 'valueChange', 1990);
  for (const id of ['legal-consent-tos', 'legal-consent-privacy', 'legal-consent-wellness']) {
    fireEvent.press(api.getByTestId(id).parent!);
  }
  fireEvent.press(api.getByTestId('legal-gate-continue'));

  await waitFor(() => expect(api.getByText('Verifying...')).toBeTruthy());
  expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith('age_verification_v1', expect.anything());
  expect(onComplete).not.toHaveBeenCalled();

  fireEvent.press(api.getByTestId('legal-gate-crisis-988'));
  await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('tel:988'));
});
