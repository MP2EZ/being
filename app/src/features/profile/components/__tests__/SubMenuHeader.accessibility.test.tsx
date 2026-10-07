/**
 * SubMenuHeader (MAINT-750, audit TEST-71). Test-after: no source change.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SubMenuHeader from '../SubMenuHeader';

it('names its close button after the screen and closes once per press', () => {
  const onClose = jest.fn();
  const { getByRole, getByText } = render(<SubMenuHeader title="Privacy & Data" onClose={onClose} />);
  const close = getByRole('button', { name: 'Close Privacy & Data' });
  expect(getByText('Privacy & Data')).toBeTruthy();
  fireEvent.press(close);
  expect(onClose).toHaveBeenCalledTimes(1);
});
