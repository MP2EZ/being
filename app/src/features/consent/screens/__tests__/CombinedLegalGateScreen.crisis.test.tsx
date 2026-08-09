/**
 * CombinedLegalGateScreen — guarded crisis dials (DEBUG-314)
 *
 * This screen sits in front of onboarding, so its 988 / Crisis Text Line
 * buttons are a first-run user's ONLY crisis affordance — and, on the under-age
 * branch, the only one a minor being turned away from the app is ever offered.
 *
 * Both handlers called bare `Linking.openURL` until DEBUG-314. When `openURL`
 * rejected — no telephony, a missing `LSApplicationQueriesSchemes` entry, an OS
 * restriction — the promise rejected into nothing: no dial, no alert, no log.
 * The screen had no test file at all, so nothing noticed.
 *
 * Scope is deliberately narrow: the crisis hand-off only. The age gate and the
 * four-consent flow are separate contracts and are not asserted here.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

jest.mock('@react-native-picker/picker', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Picker = ({ children, ...props }: never) => React.createElement(View, props, children);
  Picker.Item = (props: never) => React.createElement(View, props);
  return { Picker };
});

jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: () => ({ verifyAge: jest.fn() }),
  recordLegalGateConsents: jest.fn(),
}));

import CombinedLegalGateScreen from '../CombinedLegalGateScreen';

const renderScreen = () =>
  render(<CombinedLegalGateScreen onComplete={jest.fn()} onUnderAge={jest.fn()} />);

describe('CombinedLegalGateScreen — crisis dials are guarded', () => {
  beforeEach(() => {
    (Linking.openURL as jest.Mock).mockClear().mockResolvedValue(undefined);
    (Linking.canOpenURL as jest.Mock).mockClear().mockResolvedValue(true);
    (Alert.alert as jest.Mock).mockClear();
  });

  describe('Call 988', () => {
    it('dials tel:988 through the canOpenURL guard', async () => {
      const { getByLabelText } = renderScreen();
      fireEvent.press(getByLabelText('Call 988'));

      await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('tel:988'));
      expect(Linking.canOpenURL).toHaveBeenCalledWith('tel:988');
    });

    it('instructs the user to dial manually instead of failing silently', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);

      const { getByLabelText } = renderScreen();
      fireEvent.press(getByLabelText('Call 988'));

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          'Unable to Call',
          'Please manually dial 988 for support.',
          expect.any(Array)
        )
      );
      expect(Linking.openURL).not.toHaveBeenCalled();
    });
  });

  describe('Text Crisis Line', () => {
    it('opens sms:741741 with the HELLO keyword Crisis Text Line expects', async () => {
      const { getByLabelText } = renderScreen();
      fireEvent.press(getByLabelText('Text Crisis Line'));

      await waitFor(() =>
        expect(Linking.openURL).toHaveBeenCalledWith('sms:741741?body=HELLO')
      );
      expect(Linking.canOpenURL).toHaveBeenCalledWith('sms:741741?body=HELLO');
    });

    it('uses text-appropriate fallback copy, not the generic "manually dial"', async () => {
      // The default `manualLabel` copy reads "Please manually dial 741741 for
      // support", which is wrong for a text line — hence explicit overrides.
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);

      const { getByLabelText } = renderScreen();
      fireEvent.press(getByLabelText('Text Crisis Line'));

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          'Unable to Text',
          'Please text HELLO to 741741 for support.',
          expect.any(Array)
        )
      );
      expect(Linking.openURL).not.toHaveBeenCalled();
    });
  });
});
