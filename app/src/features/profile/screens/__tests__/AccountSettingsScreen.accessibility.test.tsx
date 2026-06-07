/**
 * AccountSettingsScreen accessibility + trust-defect regression tests (FEAT-210).
 *
 * FEAT-210 removed four dead-end controls (Change Password, Logout, Export,
 * Delete) that only fired "Development Mode … Requires FEAT-xx" alerts, plus an
 * engineering "🚧 Implementation Status" TODO box, replacing them with one
 * honest, non-interactive data-rights row. These tests pin that contract:
 * - none of the removed dead-end affordances render,
 * - the honest data-rights row is present, names export + deletion (the CCPA
 *   commitment), and is informational text — not a tappable button.
 *
 * The screen has no navigation/analytics deps and SubMenuHeader is
 * self-contained, so it renders without mocks.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import AccountSettingsScreen from '../AccountSettingsScreen';

const DATA_RIGHTS_LABEL =
  'Your data rights. Data export and account deletion are coming soon. ' +
  'You have the right to access and delete your personal wellness data.';

describe('AccountSettingsScreen — FEAT-210 honest screen', () => {
  const onReturn = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders the account information that stays functional', () => {
    const { getByText } = render(<AccountSettingsScreen onReturn={onReturn} />);
    expect(getByText('Account Information')).toBeTruthy();
    expect(getByText('Email')).toBeTruthy();
    expect(getByText('Member Since')).toBeTruthy();
  });

  describe('the dead-end controls are gone', () => {
    // These were tappable cards / disabled rows that only errored.
    it.each([
      'Change Password',
      'Logout',
      'Export Your Data',
      'Delete Account',
    ])('does not render the %s control', (label) => {
      const { queryByText } = render(<AccountSettingsScreen onReturn={onReturn} />);
      expect(queryByText(label)).toBeNull();
    });

    it('no longer shows the "Requires FEAT-xx" placeholder copy', () => {
      // The dev-mode alerts fired imperatively (never in the tree); the visible
      // tell was the "(Requires FEAT-16)" etc. card descriptions. The unrelated
      // "Development Mode - Single user only" dev badge is intentionally kept.
      const { queryByText } = render(<AccountSettingsScreen onReturn={onReturn} />);
      expect(queryByText(/Requires FEAT-/i)).toBeNull();
    });

    it('no longer leaks the engineering TODO box to users', () => {
      const { queryByText } = render(<AccountSettingsScreen onReturn={onReturn} />);
      expect(queryByText(/Implementation Status/i)).toBeNull();
      expect(queryByText(/FEAT-6-ARCHITECTURE\.md/i)).toBeNull();
      expect(queryByText(/UI shell/i)).toBeNull();
    });

    it('drops the unfounded "export is encrypted" claim', () => {
      const { queryByText } = render(<AccountSettingsScreen onReturn={onReturn} />);
      expect(queryByText(/encrypted for your privacy/i)).toBeNull();
    });
  });

  describe('the honest data-rights row', () => {
    it('names data export and account deletion as forthcoming (CCPA commitment)', () => {
      const { getByText } = render(<AccountSettingsScreen onReturn={onReturn} />);
      expect(getByText('Your data rights')).toBeTruthy();
      expect(
        getByText(/Data export and account deletion are coming soon\./i)
      ).toBeTruthy();
      // Preserves the regulatory framing in plain English.
      expect(
        getByText(/right to access and delete your personal wellness data/i)
      ).toBeTruthy();
    });

    it('is informational text, not a tappable affordance', () => {
      const { getByLabelText } = render(<AccountSettingsScreen onReturn={onReturn} />);
      const row = getByLabelText(DATA_RIGHTS_LABEL);
      expect(row.props.accessibilityRole).toBe('text');
      expect(row.props.accessibilityRole).not.toBe('button');
      // No press handler — it is a View, not a Pressable/Touchable.
      expect(row.props.onPress).toBeUndefined();
    });
  });
});
