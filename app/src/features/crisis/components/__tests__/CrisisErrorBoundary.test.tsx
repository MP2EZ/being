/**
 * CrisisErrorBoundary dial-routing tests (DEBUG-230 / SEC-W5 + SEC-08)
 *
 * The error boundary is a class component, so it cannot use the
 * useAnalytics hook — its emergency dials must route through the shared
 * openCrisisUrl helper (which owns the canOpenURL guard + manual-dial
 * fallback). These tests pin that the "All Emergency Options" Alert wires
 * each channel through the helper, and that the Crisis Text Line SMS
 * carries the encoded HOME keyword (a bare sms:741741 breaks the handoff).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('../../utils/openCrisisUrl', () => ({
  openCrisisUrl: jest.fn(),
}));

import { openCrisisUrl } from '../../utils/openCrisisUrl';
import { CrisisErrorBoundary } from '../CrisisErrorBoundary';

const Boom = (): React.ReactElement => {
  throw new Error('child exploded');
};

type AlertButton = { text: string; onPress?: () => void };

describe('CrisisErrorBoundary emergency dials', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // React logs the caught render error to console.error; silence it.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const openEmergencyAlert = (): AlertButton[] => {
    const { getByLabelText } = render(
      <CrisisErrorBoundary>
        <Boom />
      </CrisisErrorBoundary>
    );
    fireEvent.press(getByLabelText('View all emergency options'));
    const call = (Alert.alert as jest.Mock).mock.calls.at(-1);
    return (call?.[2] ?? []) as AlertButton[];
  };

  test('routes 988 through the guarded helper (not a bare openURL)', () => {
    const buttons = openEmergencyAlert();
    buttons.find((b) => /988/.test(b.text))?.onPress?.();
    expect(openCrisisUrl).toHaveBeenCalledWith('tel:988', expect.anything());
  });

  test('Crisis Text Line SMS carries the encoded HOME keyword', () => {
    const buttons = openEmergencyAlert();
    buttons.find((b) => /741741|Text/.test(b.text))?.onPress?.();
    expect(openCrisisUrl).toHaveBeenCalledWith('sms:741741?body=HOME', expect.anything());
  });

  test('routes 911 through the guarded helper', () => {
    const buttons = openEmergencyAlert();
    buttons.find((b) => /911/.test(b.text))?.onPress?.();
    expect(openCrisisUrl).toHaveBeenCalledWith('tel:911', expect.anything());
  });
});
