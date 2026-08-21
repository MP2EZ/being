/**
 * DeleteAccountScreen (FEAT-267) — accessibility + the typed-DELETE gate and
 * the post-erasure routing branches. The destructive button must stay disabled
 * until the user types the exact confirmation word; a failed server delete must
 * surface a retryable, in-tree error (NOT navigate away); a success must reset
 * to the crisis-bearing Onboarding clean state.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ reset: mockReset, navigate: jest.fn(), goBack: jest.fn() }),
}));

const mockDeleteAccountAndWipe = jest.fn();
jest.mock('@/core/services/privacy/AccountDeletionService', () => ({
  deleteAccountAndWipe: (...args: unknown[]) => mockDeleteAccountAndWipe(...args),
}));

import DeleteAccountScreen from '../DeleteAccountScreen';

describe('DeleteAccountScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('labels the destructive control and the confirmation input for screen readers', () => {
    const { getByTestId } = render(<DeleteAccountScreen />);

    const button = getByTestId('delete-account-button');
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toMatch(/delete my account/i);

    const input = getByTestId('delete-confirm-input');
    expect(input.props.accessibilityLabel).toMatch(/DELETE/);
  });

  it('keeps the delete button disabled until DELETE is typed exactly', () => {
    const { getByTestId } = render(<DeleteAccountScreen />);
    const button = getByTestId('delete-account-button');
    const input = getByTestId('delete-confirm-input');

    expect(button.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(input, 'delete'); // wrong case
    expect(button.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(input, 'DELETE');
    expect(button.props.accessibilityState.disabled).toBe(false);
  });

  it('does not call the deletion service while the gate is unsatisfied', () => {
    const { getByTestId } = render(<DeleteAccountScreen />);
    fireEvent.press(getByTestId('delete-account-button'));
    expect(mockDeleteAccountAndWipe).not.toHaveBeenCalled();
  });

  it('resets to Onboarding on a successful erasure', async () => {
    mockDeleteAccountAndWipe.mockResolvedValue({ ok: true });
    const { getByTestId } = render(<DeleteAccountScreen />);

    fireEvent.changeText(getByTestId('delete-confirm-input'), 'DELETE');
    fireEvent.press(getByTestId('delete-account-button'));

    await waitFor(() => expect(mockReset).toHaveBeenCalled());
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Onboarding' }] });
  });

  it('shows a retryable error and does NOT navigate when the server delete fails', async () => {
    mockDeleteAccountAndWipe.mockResolvedValue({ ok: false, retryable: true });
    const { getByTestId } = render(<DeleteAccountScreen />);

    fireEvent.changeText(getByTestId('delete-confirm-input'), 'DELETE');
    fireEvent.press(getByTestId('delete-account-button'));

    await waitFor(() => expect(getByTestId('delete-error')).toBeTruthy());
    expect(getByTestId('delete-error').props.children).toMatch(/intact/i);
    expect(mockReset).not.toHaveBeenCalled();
  });

  // DEBUG-480 companion. This is a data-subject-right ACCESS pin, not polish:
  // the screen's header cites CCPA / TDPSA / VCDPA / CPA / GDPR Art. 17, and a
  // confirm control that is keyboard-occluded or whose first tap is swallowed is
  // a functional obstruction of the right to erasure.
  //
  // The retry path is the one that matters: delete-error renders BETWEEN the
  // confirm input and the button and pushes the button down, while the keyboard
  // is necessarily up because the user has just typed the confirmation word.
  describe('erasure stays reachable with the keyboard up (DEBUG-480)', () => {
    it('does not let the scroll view swallow the first keyboard-up tap', () => {
      const { getByTestId } = render(<DeleteAccountScreen />);
      const scroll = getByTestId('delete-account-scroll');
      expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
      expect(scroll.props.automaticallyAdjustKeyboardInsets).toBe(true);
      expect(scroll.props.keyboardDismissMode).toBe('on-drag');
    });

    it('keeps the confirm button pressable once the error has pushed it down', async () => {
      mockDeleteAccountAndWipe.mockResolvedValue({ ok: false, retryable: true });
      const { getByTestId } = render(<DeleteAccountScreen />);

      fireEvent.changeText(getByTestId('delete-confirm-input'), 'DELETE');
      fireEvent.press(getByTestId('delete-account-button'));
      await waitFor(() => expect(getByTestId('delete-error')).toBeTruthy());

      // The retry must still reach the handler with the error rendered.
      mockDeleteAccountAndWipe.mockResolvedValue({ ok: true });
      fireEvent.press(getByTestId('delete-account-button'));
      await waitFor(() =>
        expect(mockDeleteAccountAndWipe).toHaveBeenCalledTimes(2)
      );
    });
  });
});
