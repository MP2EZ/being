/**
 * AccessibleButton (MAINT-750, audit TEST-55). Test-after: no source change.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { colorSystem } from '@/core/theme';
import AccessibleButton from '../AccessibleButton';

const styleOf = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) ?? {};

it.each([
  ['disabled', { disabled: true }, { disabled: true, busy: false }],
  ['loading', { loading: true }, { disabled: true, busy: true }],
])('%s suppresses onPress and reports the state', (_label, props, state) => {
  const onPress = jest.fn();
  const { getByRole } = render(<AccessibleButton label="Save" onPress={onPress} {...props} />);
  const button = getByRole('button', { name: 'Save' });
  fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
  expect(button.props.accessibilityState).toMatchObject(state);
});

it('an enabled button calls onPress once', () => {
  const onPress = jest.fn();
  const { getByRole } = render(<AccessibleButton label="Save" onPress={onPress} />);
  fireEvent.press(getByRole('button', { name: 'Save' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('the icon variant shows the glyph and still names the button by its label', () => {
  const { getByRole, getByText, queryByText } = render(
    <AccessibleButton label="Close settings" icon="✕" variant="icon" onPress={jest.fn()} />,
  );
  expect(getByRole('button', { name: 'Close settings' })).toBeTruthy();
  expect(getByText('✕')).toBeTruthy();
  expect(queryByText('Close settings')).toBeNull();
});

it('applies the theme colour to the primary variant only', () => {
  const { getByRole, rerender } = render(
    <AccessibleButton label="Go" variant="primary" theme="morning" onPress={jest.fn()} />,
  );
  expect(styleOf(getByRole('button', { name: 'Go' })).backgroundColor).toBe(colorSystem.themes.morning.primary);

  rerender(<AccessibleButton label="Go" variant="secondary" theme="morning" onPress={jest.fn()} />);
  expect(styleOf(getByRole('button', { name: 'Go' })).backgroundColor).not.toBe(colorSystem.themes.morning.primary);
});

it('applies the caller style last, so it wins over the theme colour', () => {
  const { getByRole } = render(
    <AccessibleButton
      label="Go"
      variant="primary"
      theme="morning"
      style={{ backgroundColor: colorSystem.base.white }}
      onPress={jest.fn()}
    />,
  );
  expect(styleOf(getByRole('button', { name: 'Go' })).backgroundColor).toBe(colorSystem.base.white);
});
