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

// FEAT-710 (compliance ruling 2026-10-06): store billing outlives erasure, so the screen says
// so before the confirmation field. The strings are pinned literally, not imported, so a
// rewording has to come back through compliance.
describe('FEAT-710: the store-billing notice', () => {
  const IOS =
    'If you pay for Being through the App Store, deleting your account does not cancel billing. ' +
    'To cancel, open Settings, tap your name, then Subscriptions.';
  const ANDROID =
    'If you pay for Being through Google Play, deleting your account does not cancel billing. ' +
    'To cancel, open Play Store, then Payments & subscriptions, then Subscriptions.';
  const PRESERVED = /minimal record of your consent/;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Platform } = require('react-native');

  function noticeText(os: 'ios' | 'android'): string {
    const original = Platform.OS;
    Platform.OS = os;
    try {
      const { getByTestId } = render(<DeleteAccountScreen />);
      const node = getByTestId('delete-subscription-notice');
      return flatText(node);
    } finally {
      Platform.OS = original;
    }
  }

  /** Every string under a host node, in order. */
  function flatText(node: { children: unknown[] }): string {
    return node.children
      .map((c) => (typeof c === 'string' ? c : flatText(c as { children: unknown[] })))
      .join('');
  }

  /** Depth-first order of testIDs and text strings in the rendered tree. */
  function readingOrder(tree: unknown): string[] {
    const out: string[] = [];
    const walk = (n: unknown) => {
      if (n == null) return;
      if (typeof n === 'string') { out.push(n); return; }
      if (Array.isArray(n)) { n.forEach(walk); return; }
      const el = n as { props?: { testID?: string }; children?: unknown[] };
      if (el.props?.testID) out.push(`#${el.props.testID}`);
      (el.children || []).forEach(walk);
    };
    walk(tree);
    return out;
  }

  it('shows the approved copy for the device platform only', () => {
    expect(noticeText('ios')).toBe(IOS);
    expect(noticeText('android')).toBe(ANDROID);
  });

  it.each([['ios', IOS], ['android', ANDROID]])('%s copy: about 30 words, conditional on paying, no restore or refund', (_os, copy) => {
    expect(copy.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(30);
    expect(copy).toMatch(/^If you pay for Being through /);
    expect(copy).toMatch(/does not cancel billing/);
    expect(copy).not.toMatch(/restor|resubscri|refund|→|>/i);
  });

  it('is read after "What is removed" and the preserved-record note, and before the confirm field', () => {
    const order = readingOrder(render(<DeleteAccountScreen />).toJSON());
    const at = (pred: (s: string) => boolean) => order.findIndex(pred);
    const removed = at((s) => s === 'What is removed');
    const preserved = at((s) => PRESERVED.test(s));
    const notice = at((s) => s === '#delete-subscription-notice');
    const confirm = at((s) => s === '#delete-confirm-input');
    expect([removed, preserved, notice, confirm].every((i) => i >= 0)).toBe(true);
    expect(removed).toBeLessThan(preserved);
    expect(preserved).toBeLessThan(notice);
    expect(notice).toBeLessThan(confirm);
  });

  it('is inert: no role, no live region, no press handler, and no pressable is added', () => {
    const { getByTestId, getAllByRole, toJSON } = render(<DeleteAccountScreen />);
    const notice = getByTestId('delete-subscription-notice');
    expect(notice.props.accessibilityRole).toBeUndefined();
    expect(notice.props.accessibilityLiveRegion).toBeUndefined();
    expect(notice.props.onPress).toBeUndefined();
    expect(notice.props.onStartShouldSetResponder).toBeUndefined();
    // The real falsifier: the adoption pin counts exclusion-hook wiring, not pressables.
    // Every touchable host claims the responder, so counting those catches a Pressable,
    // a Touchable* or a Text with onPress alike.
    const touchables: unknown[] = [];
    const walk = (n: unknown) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      const el = n as { props?: Record<string, unknown>; children?: unknown[] };
      if (typeof el.props?.['onStartShouldSetResponder'] === 'function' || typeof el.props?.['onPress'] === 'function') touchables.push(el);
      (el.children || []).forEach(walk);
    };
    walk(toJSON());
    // Exactly the two that existed before FEAT-710: the delete button, and the iOS keyboard
    // crisis accessory CrisisTextInput mounts (INFRA-531).
    const ids = (touchables as { props: { testID?: string } }[]).map((t) => t.props.testID).sort();
    expect(ids).toEqual(['crisis-keyboard-accessory-button', 'delete-account-button']);
    // The accessory sits outside the accessible tree (it is an input accessory), so the
    // screen's own accessible buttons are just the one.
    expect(getAllByRole('button').map((b) => b.props.testID)).toEqual(['delete-account-button']);
  });

  it('renders for everyone and stays visible while deleting and after a failed delete', async () => {
    let finish: (v: unknown) => void = () => {};
    mockDeleteAccountAndWipe.mockReturnValue(new Promise((r) => { finish = r; }));
    const { getByTestId, queryByTestId } = render(<DeleteAccountScreen />);
    expect(queryByTestId('delete-subscription-notice')).toBeTruthy();

    fireEvent.changeText(getByTestId('delete-confirm-input'), 'DELETE');
    fireEvent.press(getByTestId('delete-account-button'));
    expect(queryByTestId('delete-subscription-notice')).toBeTruthy();

    finish({ ok: false, retryable: true });
    await waitFor(() => expect(getByTestId('delete-error')).toBeTruthy());
    expect(queryByTestId('delete-subscription-notice')).toBeTruthy();
  });

  it('rewords the erased-items bullet per ruling (c)', () => {
    const { getByText, queryByText } = render(<DeleteAccountScreen />);
    expect(getByText('Your anonymous account and subscription records on our servers')).toBeTruthy();
    expect(queryByText(/subscription details/)).toBeNull();
  });

  it('stays text-only: the screen opens no link and no store sheet', () => {
    // readHost strips comments (DEBUG-390), so the header's own mention of a link is not code.
    const code = readHost(path.resolve(__dirname, '../DeleteAccountScreen.tsx')).source;
    // Positive control: the slice under test is the code that renders the notice.
    expect(code).toMatch(/testID="delete-subscription-notice"/);
    expect(code).not.toMatch(/\bLinking\b/);
    expect(code).not.toMatch(/openURL|showManageSubscriptions|manageSubscriptions/);
  });
});
