/**
 * ConsentToggleCard (MAINT-750, audit TEST-38). Test-after: NO source change — this is a
 * protected path (features/consent, crisis + compliance), and only its tests move.
 *
 * The prop is `onValueChange` (the AC said `onToggle`). "disabled blocks it" is asserted as
 * the native contract — the Switch is rendered disabled and says so to assistive tech —
 * because RN's Switch host accepts responder events even when disabled, so a fireEvent in
 * jest reaches the handler regardless. Behavioural blocking would need a JS guard in this
 * protected file, which this item does not carry.
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import ConsentToggleCard from '../ConsentToggleCard';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require('react-native');
const realLayoutAnimation = RN.LayoutAnimation;
const configureNext = jest.fn();

const DETAILS = {
  whatWeCollect: ['Which screens you open'],
  whatWeDontCollect: ['Your answers'],
  whyItHelps: 'It shows what to improve.',
};

function mount(props: Partial<React.ComponentProps<typeof ConsentToggleCard>> = {}) {
  const onValueChange = jest.fn();
  const utils = render(
    <ConsentToggleCard
      title="Analytics"
      description="Anonymous usage."
      details={DETAILS}
      value={false}
      onValueChange={onValueChange}
      {...props}
    />,
  );
  return { ...utils, onValueChange };
}

beforeEach(() => {
  // The global react-native mock has no LayoutAnimation; stub it for this file only.
  RN.LayoutAnimation = { configureNext, Presets: { easeInEaseOut: {} } };
  configureNext.mockClear();
  (AccessibilityInfo.announceForAccessibility as jest.Mock).mockClear?.();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});

afterEach(() => {
  RN.LayoutAnimation = realLayoutAnimation;
  jest.restoreAllMocks();
});

it('toggling reports the new value and announces it', () => {
  const { getByRole, onValueChange } = mount();
  fireEvent(getByRole('switch', { name: 'Analytics consent' }), 'valueChange', true);
  expect(onValueChange).toHaveBeenCalledWith(true);
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Analytics enabled');
});

it('a disabled card renders its switch disabled, and says so', () => {
  const { getByRole } = mount({ disabled: true });
  const toggle = getByRole('switch', { name: 'Analytics consent' });
  expect(toggle.props.disabled).toBe(true);
  expect(toggle.props.accessibilityState).toMatchObject({ disabled: true });
});

it('"Learn more" expands the details with an animation, and collapses them again', async () => {
  const { getByRole, queryByText } = mount();
  expect(queryByText('Why it helps:')).toBeNull();

  await act(async () => {
    fireEvent.press(getByRole('button', { name: 'Learn more' }));
  });
  await waitFor(() => expect(getByRole('button', { name: 'Hide details' })).toBeTruthy());
  expect(queryByText('Why it helps:')).toBeTruthy();
  expect(configureNext).toHaveBeenCalledTimes(1);

  await act(async () => {
    fireEvent.press(getByRole('button', { name: 'Hide details' }));
  });
  await waitFor(() => expect(getByRole('button', { name: 'Learn more' })).toBeTruthy());
  expect(queryByText('Why it helps:')).toBeNull();
});

it('with reduced motion on, expanding does not animate', async () => {
  (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
  const { getByRole, queryByText } = mount();
  await act(async () => {
    fireEvent.press(getByRole('button', { name: 'Learn more' }));
  });
  await waitFor(() => expect(queryByText('Why it helps:')).toBeTruthy());
  expect(configureNext).not.toHaveBeenCalled();
});
