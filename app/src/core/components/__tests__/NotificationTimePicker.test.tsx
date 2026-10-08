/**
 * NotificationTimePicker per platform (MAINT-750, audit TEST-35). Test-after: no source change.
 *
 * Only the native picker is mocked (it is ESM and not transformed). The iOS Modal is left
 * exactly as it is — its modality carries the DEBUG-406 conditional ruling, pinned by
 * scripts/check-modal-occlusion-guard.js and __tests__/safety/modalOcclusionGuard.test.ts.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { NotificationTimePicker } from '../NotificationTimePicker';

jest.mock('@react-native-community/datetimepicker', () => {
  const React_ = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => React_.createElement(View, { ...props, testID: 'native-time-picker' }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require('react-native');
const realOS = RN.Platform.OS;

const SEVEN = new Date(2026, 9, 6, 7, 0);
const EIGHT_THIRTY = new Date(2026, 9, 6, 8, 30);

function mount(visible = true) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  const props = { value: SEVEN, period: 'daily' as const, onConfirm, onCancel };
  const utils = render(<NotificationTimePicker visible={visible} {...props} />);
  const rerender = (v: boolean) => utils.rerender(<NotificationTimePicker visible={v} {...props} />);
  return { ...utils, rerender, onConfirm, onCancel };
}

afterEach(() => {
  RN.Platform.OS = realOS;
});

describe('iOS', () => {
  beforeEach(() => {
    RN.Platform.OS = 'ios';
  });

  it('a change then Done confirms the NEW time', () => {
    const utils = mount();
    fireEvent(utils.getByTestId('native-time-picker'), 'change', { type: 'set' }, EIGHT_THIRTY);
    fireEvent.press(utils.getByText('Done'));
    expect(utils.onConfirm).toHaveBeenCalledWith(EIGHT_THIRTY);
    expect(utils.onCancel).not.toHaveBeenCalled();
  });

  it('Cancel, the backdrop and the system dismiss each cancel, and never confirm', () => {
    const utils = mount();
    fireEvent.press(utils.getByText('Cancel'));

    // The backdrop is the Pressable wired to onCancel that carries no text.
    const cancelOwners = utils.UNSAFE_root.findAll(
      (n) => typeof n.type !== 'string' && n.props.onPress === utils.onCancel,
    );
    const backdrop = cancelOwners.find((n) => n.findAll((c) => c.props.children === 'Cancel').length === 0);
    expect(backdrop).toBeDefined();
    backdrop!.props.onPress();

    const modal = utils.UNSAFE_root.findAll((n) => n.props.onRequestClose === utils.onCancel)[0];
    expect(modal).toBeDefined();
    modal.props.onRequestClose();

    expect(utils.onCancel).toHaveBeenCalledTimes(3);
    expect(utils.onConfirm).not.toHaveBeenCalled();
  });

  it('reopening discards an unconfirmed change and starts from the value', () => {
    const utils = mount();
    fireEvent(utils.getByTestId('native-time-picker'), 'change', { type: 'set' }, EIGHT_THIRTY);
    fireEvent.press(utils.getByText('Cancel'));
    utils.rerender(false);
    utils.rerender(true);
    expect(utils.getByTestId('native-time-picker').props.value).toEqual(SEVEN);
  });
});

describe('Android', () => {
  beforeEach(() => {
    RN.Platform.OS = 'android';
  });

  it("'set' with a date confirms that date", () => {
    const utils = mount();
    fireEvent(utils.getByTestId('native-time-picker'), 'change', { type: 'set' }, EIGHT_THIRTY);
    expect(utils.onConfirm).toHaveBeenCalledWith(EIGHT_THIRTY);
    expect(utils.onCancel).not.toHaveBeenCalled();
  });

  it("'dismissed' cancels", () => {
    const utils = mount();
    fireEvent(utils.getByTestId('native-time-picker'), 'change', { type: 'dismissed' }, undefined);
    expect(utils.onCancel).toHaveBeenCalledTimes(1);
    expect(utils.onConfirm).not.toHaveBeenCalled();
  });

  it('renders nothing when not visible', () => {
    const utils = mount(false);
    expect(utils.toJSON()).toBeNull();
  });
});
