/**
 * BodyAreaGrid against its real code (MAINT-746, audit TEST-61).
 *
 * Note for the reader: only the BODY_AREAS constant is imported by live screens today;
 * the grid itself has no render consumer. These pin its contract for when one exists.
 *
 * The press suppression in progressive/disabled modes is enforced twice — the Pressable's
 * own `disabled`, and the guard in handleAreaPress. fireEvent.press cannot reach the guard
 * through a disabled Pressable, so the case also invokes the owning composite's onPress
 * directly. (The HOST element has no onPress prop: calling `host.props.onPress?.()` is a
 * silent no-op that makes the guard check vacuous — caught by a mutation run.)
 */

import React from 'react';
import { Vibration } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import BodyAreaGrid, { BODY_AREAS } from '../BodyAreaGrid';

const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});

beforeEach(() => {
  vibrate.mockClear();
});

const button = (utils: ReturnType<typeof render>, area: string) => utils.getByLabelText(`${area} body area`);

it('in selection mode a press selects the area, with a gentle vibration', () => {
  const onAreaSelect = jest.fn();
  const utils = render(<BodyAreaGrid onAreaSelect={onAreaSelect} />);
  fireEvent.press(button(utils, 'Feet'));
  expect(onAreaSelect).toHaveBeenCalledWith('Feet');
  expect(vibrate).toHaveBeenCalledWith(50);
});

it.each([
  ['progressive mode', { mode: 'progressive' as const, currentArea: 'Feet' }],
  ['disabled', { disabled: true }],
])('%s suppresses both the selection and the vibration', (_label, props) => {
  const onAreaSelect = jest.fn();
  const utils = render(<BodyAreaGrid onAreaSelect={onAreaSelect} {...props} />);
  fireEvent.press(button(utils, 'Head & Neck'));
  // Past the Pressable's own `disabled`: the handler's guard must hold on its own.
  // The composite that owns the button's onPress (the global RN mock swaps Pressable, so
  // find it by label + handler rather than by type).
  const [owner] = utils.UNSAFE_root.findAll(
    (node) => node.props.accessibilityLabel === 'Head & Neck body area' && typeof node.props.onPress === 'function',
  );
  expect(owner).toBeDefined();
  owner.props.onPress();
  expect(onAreaSelect).not.toHaveBeenCalled();
  expect(vibrate).not.toHaveBeenCalled();
});

it('selected state follows selectedAreas in selection mode', () => {
  const utils = render(<BodyAreaGrid selectedAreas={['Feet', 'Shoulders & Chest']} />);
  for (const area of BODY_AREAS) {
    const expected = area === 'Feet' || area === 'Shoulders & Chest';
    expect(button(utils, area).props.accessibilityState).toMatchObject({ selected: expected });
  }
});

it('selected state follows currentArea in progressive mode, ignoring selectedAreas', () => {
  const utils = render(
    <BodyAreaGrid mode="progressive" currentArea="Abdomen & Hips" selectedAreas={['Feet']} />,
  );
  for (const area of BODY_AREAS) {
    expect(button(utils, area).props.accessibilityState).toMatchObject({
      selected: area === 'Abdomen & Hips',
      disabled: true,
    });
  }
});

it('shows the summary only in selection mode, and only with selections', () => {
  expect(render(<BodyAreaGrid selectedAreas={[]} />).queryByText('Areas of awareness:')).toBeNull();
  expect(
    render(<BodyAreaGrid mode="progressive" currentArea="Feet" selectedAreas={['Feet']} />)
      .queryByText('Areas of awareness:'),
  ).toBeNull();
  const shown = render(<BodyAreaGrid selectedAreas={['Feet', 'Head & Neck']} />);
  expect(shown.getByText('Areas of awareness:')).toBeTruthy();
  expect(shown.getByText('Feet, Head & Neck')).toBeTruthy();
});
