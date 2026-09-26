/**
 * DeleteAccountScreen (FEAT-267) — accessibility + the typed-DELETE gate and
 * the post-erasure routing branches. The destructive button must stay disabled
 * until the user types the exact confirmation word; a failed server delete must
 * surface a retryable, in-tree error (NOT navigate away); a success must reset
 * to the crisis-bearing Onboarding clean state.
 */

import React from 'react';
import path from 'path';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  expectEntryShape, expectInertMember, expectLiveness, expectMarginClearance,
  expectModelFidelity, expectSweepClear, flat, hostPad, readHost,
} from '../../../../../__tests__/helpers/crisisFabClearance';
import { expectExclusionCheckWired } from '../../../../../__tests__/helpers/crisisExclusionLayoutEvent';

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

// DEBUG-653: since DEBUG-562 the button is the LAST control at max scroll and the input sits 13pt
// into the rect's clearance margin (cleared, founder ruling 2026-09-26); the FAB (zIndex 9999)
// would win an overlapping tap — the DEBUG-547 shape. See crisisFabClearance.ts.
describe('DEBUG-653: the delete button and confirm input clear the crisis FAB exclusion region', () => {
  const HOST = readHost(path.join(__dirname, '../DeleteAccountScreen.tsx'));
  // Measured pre-fix: iPhone SE (3rd generation), 375x667, iOS 18.6, installed gate binary
  // marker 184ab8af, 2026-09-25, max scroll — button [24,529][351,581], input [25,460][350,504].
  // The input is a TextInput, so iOS reports its field inset by the borderWidth (see helper).
  const CONTROLS = [
    { testID: 'delete-account-button', key: 'deleteButton', centred: true, textInput: false,
      measured: { x: 24, y: 529, width: 327, height: 52 } },
    { testID: 'delete-confirm-input', key: 'input', centred: false, textInput: true,
      measured: { x: 25, y: 460, width: 325, height: 44 } },
  ];
  const renderHost = () => {
    const api = render(<DeleteAccountScreen />);
    return { api, styleOf: (id: string) => flat(api.getByTestId(id).props.style), pad: hostPad(api) };
  };
  const borderOf = (c: (typeof CONTROLS)[number]) =>
    c.textInput ? (renderHost().styleOf(c.testID).borderWidth as number) : 0;
  const EACH = CONTROLS.map((c) => [c.testID, c] as const);

  it('(a) both keep the MARGIN clearance in every state — disabled, enabled, deleting', async () => {
    let release: (v: unknown) => void = () => {};
    mockDeleteAccountAndWipe.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const { api, styleOf } = renderHost();
    const expectAll = () => CONTROLS.forEach((c) => expectMarginClearance(styleOf(c.testID), c.centred));

    const disabled = styleOf('delete-account-button');
    expectAll();
    fireEvent.changeText(api.getByTestId('delete-confirm-input'), 'DELETE');
    // The disabled member really is merged in the other state, so its survival is not vacuous.
    expect(styleOf('delete-account-button').backgroundColor).not.toBe(disabled.backgroundColor);
    expectAll();
    fireEvent.press(api.getByTestId('delete-account-button'));
    await waitFor(() =>
      expect(api.getByTestId('delete-account-button').props.accessibilityState.busy).toBe(true)
    );
    expectAll();
    release({ ok: false, retryable: true });
    await waitFor(() => expect(api.getByTestId('delete-error')).toBeTruthy());
  });

  it('(b) each declares it in its own entry, last; nothing later or downstream clobbers it', () => {
    CONTROLS.forEach((c) => expectEntryShape(HOST, c.key, c.centred));
    expect(HOST.source).toMatch(
      /style=\{\[styles\.deleteButton, !canDelete && styles\.deleteButtonDisabled\]\}/
    );
    expect(HOST.source.match(/styles\.deleteButton(?!\w)/g)).toHaveLength(1);
    expectInertMember(HOST, 'deleteButtonDisabled');
    expect(HOST.source).toMatch(/style=\{styles\.input\}/);
    expect(HOST.source.match(/styles\.input(?!\w)/g)).toHaveLength(1);
    // CrisisTextInput forwards the style untouched; (a) reads the rendered node to prove it.
    const cti = readHost(path.join(__dirname, '../../../crisis/components/CrisisTextInput.tsx')).source;
    expect(cti).toMatch(/<TextInput ref=\{ref\} \{\.\.\.props\} \{\.\.\.crisisAccessoryProps\(instanceId\)\} \/>/);
    expect(cti).not.toMatch(/\bstyle\s*[=:]/);
  });

  it.each(EACH)('(c) %s never intersects the exclusion rect at any y or viewport', (id, c) => {
    const { pad, styleOf } = renderHost();
    expectSweepClear(pad, styleOf(id), [c.measured.height, 200]);
  });

  it.each(EACH)('(d) %s: the model reproduces the measured frame; (e) inset 0 goes red', (_id, c) => {
    expectModelFidelity(c.measured, renderHost().pad, borderOf(c));
    expectLiveness(HOST, c.key, c.measured, renderHost().pad, borderOf(c));
  });

  it.each(EACH)('DEBUG-643: the __DEV__ crisis-exclusion check is wired to %s', async (id) => {
    const { api } = renderHost();
    // RNTL's fireEvent drops EVERY event, layout included, on a Pressable whose responder is
    // disabled, so the gate is satisfied first. On device onLayout fires regardless.
    fireEvent.changeText(api.getByTestId('delete-confirm-input'), 'DELETE');
    await expectExclusionCheckWired(api.getByTestId(id), id);
  });
});
